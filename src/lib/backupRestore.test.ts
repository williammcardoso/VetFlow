import { describe, expect, it } from "vitest";
import { collectFileUrls, parseStorageUrl, type BackupFile, type BackupRow } from "./backupApi";
import {
  BackupFileError,
  buildRestorePlan,
  diffTable,
  friendlyRestoreError,
  parseBackupFile,
  rewriteStorageOrigin,
  rowLabel,
  rowsDiffer,
  rowsToWrite,
  stableStringify,
  writeRows,
} from "./backupRestore";

const OLD = "https://antigo.supabase.co";
const NEW = "https://novo.supabase.co";

const file = (tabelas: Record<string, BackupRow[]>, arquivos: Record<string, string> = {}): BackupFile => ({
  app: "VetFlow",
  formato: 1,
  criadoEm: "2026-09-29T19:30:00.000Z",
  tabelas,
  contagem: {},
  falhas: {},
  arquivos,
});

describe("arquivo de backup", () => {
  it("aceita o .json do VetFlow e recusa outros", () => {
    const ok = parseBackupFile(JSON.stringify(file({ clients: [{ id: "c1" }] })));
    expect(ok.tabelas.clients).toHaveLength(1);
    expect(() => parseBackupFile("não é json")).toThrow(BackupFileError);
    expect(() => parseBackupFile(JSON.stringify({ app: "Outro", tabelas: {} }))).toThrow("não é um backup do VetFlow");
    expect(() => parseBackupFile(JSON.stringify({ ...file({}), formato: 2 }))).toThrow("outra versão");
  });
});

describe("comparação", () => {
  it("ordem das chaves não importa", () => {
    expect(stableStringify({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: null } })).toBe(stableStringify({ a: { c: null, d: [1, { x: 1, y: 2 }] }, b: 1 }));
  });
  it("coluna que só existe de um lado não conta como alteração", () => {
    expect(rowsDiffer({ id: 1, name: "Rex", velha: "x" }, { id: 1, name: "Rex", nova: 5 })).toBe(false);
    expect(rowsDiffer({ id: 1, name: "Rex" }, { id: 1, name: "Rex Jr" })).toBe(true);
  });
  it("separa apagados, alterados, iguais e novos", () => {
    const d = diffTable(
      [{ id: "1", n: "a" }, { id: "2", n: "b" }, { id: "3", n: "c" }],
      [{ id: "2", n: "b" }, { id: "3", n: "C" }, { id: "4", n: "d" }],
      "id"
    );
    expect(d.missing.map((r) => r.id)).toEqual(["1"]);
    expect(d.changed.map((r) => r.id)).toEqual(["3"]);
    expect(d.same).toBe(1);
    expect(d.onlyNow).toBe(1);
  });
  it("usa a chave própria da tabela (ex.: settings.key)", () => {
    const d = diffTable([{ key: "company", value: {} }], [{ key: "user", value: {} }], "key");
    expect(d.missing).toHaveLength(1);
    expect(d.onlyNow).toBe(1);
  });
});

describe("plano de restauração", () => {
  it("tabela que não existe no banco fica indisponível; desconhecida é ignorada", () => {
    const backup = file({ clients: [{ id: "c1", name: "Ana" }], reminder_log: [{ id: "r1" }], tabela_futura: [{ id: 1 }] });
    const current = file({ clients: [] });
    const plan = buildRestorePlan(backup, current, NEW);
    const clients = plan.tables.find((t) => t.table.table === "clients")!;
    expect(rowsToWrite(clients, "missing")).toHaveLength(1);
    expect(plan.tables.find((t) => t.table.table === "reminder_log")!.unavailable).toMatch(/migration/);
    expect(plan.ignoredTables).toEqual(["tabela_futura"]);
  });
  it("modo 'missing' não mexe nos alterados; 'overwrite' leva os dois", () => {
    const plan = buildRestorePlan(
      file({ clients: [{ id: "1", name: "A" }, { id: "2", name: "B" }] }),
      file({ clients: [{ id: "2", name: "B2" }] }),
      NEW
    );
    const t = plan.tables[0];
    expect(rowsToWrite(t, "missing").map((r) => r.id)).toEqual(["1"]);
    expect(rowsToWrite(t, "overwrite").map((r) => r.id)).toEqual(["1", "2"]);
  });
});

describe("arquivos (assinaturas e anexos)", () => {
  it("leva assinaturas e anexos, deixa de fora PDF gerado", () => {
    const urls = collectFileUrls({
      document_signatures: [{ assinatura_imagem_path: `${OLD}/storage/v1/object/public/documents/signatures/d1/vet_1.png` }],
      patient_documents: [
        { file_url: `${OLD}/storage/v1/object/public/documents/patient_documents/a1/123_laudo.pdf`, content: "" },
        { content: `<img src=\\"${OLD}/storage/v1/object/public/documents/signatures/d2/resp_2.png\\">` },
      ],
      documents: [{ pdf_path: `${OLD}/storage/v1/object/public/documents/generated_pdfs/1_x/doc.pdf` }],
      document_share_links: [{ target_url: `${OLD}/storage/v1/object/public/documents/prescriptions/9/receita.pdf` }],
    });
    expect(urls.sort()).toEqual(
      [
        `${OLD}/storage/v1/object/public/documents/patient_documents/a1/123_laudo.pdf`,
        `${OLD}/storage/v1/object/public/documents/signatures/d1/vet_1.png`,
        `${OLD}/storage/v1/object/public/documents/signatures/d2/resp_2.png`,
      ].sort()
    );
    expect(parseStorageUrl(urls[0])?.bucket).toBe("documents");
  });
  it("backup de outro banco: troca o endereço dos links; do mesmo banco não mexe", () => {
    const url = `${OLD}/storage/v1/object/public/documents/signatures/d1/v.png`;
    const b = file({ document_signatures: [{ id: "s1", assinatura_imagem_path: url }] }, { [url]: "data:image/png;base64,AA==" });
    const moved = rewriteStorageOrigin(b, NEW);
    expect(moved.from).toBe(OLD);
    expect(moved.backup.tabelas.document_signatures[0].assinatura_imagem_path).toBe(url.replace(OLD, NEW));
    expect(Object.keys(moved.backup.arquivos)[0].startsWith(NEW)).toBe(true);
    expect(rewriteStorageOrigin(b, OLD).from).toBeNull();
  });
});

describe("gravação em lotes", () => {
  it("lote com erro é refeito um a um: o registro ruim não derruba os outros", async () => {
    const saved: unknown[] = [];
    const out = await writeRows(
      [{ id: 1 }, { id: 2, bad: true }, { id: 3 }],
      async (rows) => {
        if (rows.some((r) => r.bad)) return { error: { message: "violates foreign key constraint" } };
        saved.push(...rows.map((r) => r.id));
        return { error: null };
      },
      500
    );
    expect(out).toMatchObject({ written: 2, failed: 1 });
    expect(saved).toEqual([1, 3]);
    expect(friendlyRestoreError(out.errors[0])).toMatch(/Depende de um registro/);
  });
  it("coluna que não existe mais no banco é tirada e grava", async () => {
    const out = await writeRows([{ id: 1, velha: "x" }], async (rows) =>
      "velha" in rows[0] ? { error: { message: "Could not find the 'velha' column of 'clients' in the schema cache" } } : { error: null }
    );
    expect(out).toMatchObject({ written: 1, failed: 0, droppedColumns: ["velha"] });
  });
  it("segunda chance: registro que depende de outro da mesma tabela", async () => {
    const inDb = new Set<number>();
    const out = await writeRows(
      [{ id: 2, parent: 1 }, { id: 1, parent: null }],
      async (rows) => {
        if (rows.some((r) => r.parent != null && !inDb.has(r.parent as number) && !rows.some((o) => o.id === r.parent))) {
          return { error: { message: "violates foreign key constraint" } };
        }
        rows.forEach((r) => inDb.add(r.id as number));
        return { error: null };
      },
      1
    );
    expect(out).toMatchObject({ written: 2, failed: 0 });
  });
});

describe("nomes na tela", () => {
  it("mostra pet, descrição e data em formato BR", () => {
    const animals = new Map([["a1", "Rex"]]);
    expect(rowLabel("appointments", { id: "x", animal_id: "a1", type: "Consulta", date: "2026-09-23" }, animals)).toBe("Rex · Consulta · 23/09/2026");
    expect(rowLabel("clients", { id: "c", name: "Maria Souza" })).toBe("Maria Souza");
    expect(rowLabel("settings", { key: "company" })).toBe("Dados da clínica");
    expect(rowLabel("documents", { numero: 12 })).toBe("Documento nº 12");
  });
});
