import { supabase } from "@/integrations/supabase/client";
import {
  BACKUP_TABLES,
  dataUrlToBlob,
  parseStorageUrl,
  tableKey,
  type BackupFile,
  type BackupRow,
  type BackupTable,
} from "@/lib/backupApi";

// Restauração a partir do .json do backup (tela Backup dos dados).
// Regras de segurança:
// - nunca apaga nada: o que foi cadastrado depois do backup continua;
// - "missing" só recoloca o que sumiu; "overwrite" também volta os
//   registros alterados para como estavam no backup;
// - a tela baixa uma cópia de agora antes de gravar (dá para voltar atrás).

export class BackupFileError extends Error {}

/** Lê e confere o arquivo. Mensagens de erro já em linguagem de usuário. */
export function parseBackupFile(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupFileError("O arquivo não abriu. Escolha o arquivo .json baixado em \"Backup completo\".");
  }
  const b = (data ?? {}) as Partial<BackupFile>;
  if (b.app !== "VetFlow" || !b.tabelas || typeof b.tabelas !== "object") {
    throw new BackupFileError("Este arquivo não é um backup do VetFlow.");
  }
  if (b.formato !== 1) {
    throw new BackupFileError("Este backup é de outra versão do sistema — atualize o sistema e tente de novo.");
  }
  const tabelas: Record<string, BackupRow[]> = {};
  for (const [name, rows] of Object.entries(b.tabelas)) if (Array.isArray(rows)) tabelas[name] = rows as BackupRow[];
  return {
    app: "VetFlow",
    formato: 1,
    criadoEm: String(b.criadoEm ?? ""),
    tabelas,
    contagem: b.contagem ?? {},
    falhas: b.falhas ?? {},
    arquivos: b.arquivos ?? {},
  };
}

// ------------------------------------------------------------ comparação
/** JSON com as chaves em ordem — dois objetos iguais dão o mesmo texto. */
export function stableStringify(value: unknown): string {
  if (value === null || value === undefined || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

/**
 * O registro mudou desde o backup? Compara só as colunas que existem nos
 * dois lados (coluna nova no banco ou removida depois não conta).
 */
export function rowsDiffer(backupRow: BackupRow, currentRow: BackupRow): boolean {
  for (const k of Object.keys(backupRow)) {
    if (!(k in currentRow)) continue;
    if (stableStringify(backupRow[k]) !== stableStringify(currentRow[k])) return true;
  }
  return false;
}

export interface TableDiff {
  /** No backup e não no banco (apagado depois do backup). */
  missing: BackupRow[];
  /** Nos dois, mas diferente. */
  changed: BackupRow[];
  same: number;
  /** Só no banco (cadastrado depois do backup) — sempre fica. */
  onlyNow: number;
}

export function diffTable(backupRows: BackupRow[], currentRows: BackupRow[], key: string): TableDiff {
  const current = new Map<string, BackupRow>();
  for (const row of currentRows) if (row[key] != null) current.set(String(row[key]), row);
  const inBackup = new Set<string>();
  const missing: BackupRow[] = [];
  const changed: BackupRow[] = [];
  let same = 0;
  for (const row of backupRows) {
    if (row[key] == null) continue;
    const id = String(row[key]);
    inBackup.add(id);
    const now = current.get(id);
    if (!now) missing.push(row);
    else if (rowsDiffer(row, now)) changed.push(row);
    else same++;
  }
  let onlyNow = 0;
  for (const id of current.keys()) if (!inBackup.has(id)) onlyNow++;
  return { missing, changed, same, onlyNow };
}

// ------------------------------------------------------------ origem dos arquivos
const ORIGIN_RE = /https?:\/\/[^/"\s\\]+(?=\/storage\/v1\/object\/public\/)/g;

/** Endereço do Storage deste sistema (ex.: https://xyz.supabase.co). */
export function currentStorageOrigin(): string | null {
  const url = supabase.storage.from("documents").getPublicUrl("x").data?.publicUrl ?? "";
  return parseStorageUrl(url)?.origin ?? null;
}

/**
 * Backup vindo de OUTRO banco (ex.: projeto novo do Supabase): troca o
 * endereço dos arquivos pelo deste, já que eles vão ser reenviados para cá.
 * Só troca quando nenhum link do backup aponta para o banco atual.
 */
export function rewriteStorageOrigin(backup: BackupFile, currentOrigin: string | null): { backup: BackupFile; from: string | null } {
  if (!currentOrigin) return { backup, from: null };
  const text = JSON.stringify({ tabelas: backup.tabelas, arquivos: backup.arquivos });
  const origins = new Set(text.match(ORIGIN_RE) ?? []);
  if (origins.size === 0 || origins.has(currentOrigin)) return { backup, from: null };
  let rewritten = text;
  for (const origin of origins) rewritten = rewritten.split(`${origin}/storage/v1/`).join(`${currentOrigin}/storage/v1/`);
  const parsed = JSON.parse(rewritten) as Pick<BackupFile, "tabelas" | "arquivos">;
  return { backup: { ...backup, tabelas: parsed.tabelas, arquivos: parsed.arquivos }, from: Array.from(origins).join(", ") };
}

// ------------------------------------------------------------ plano
export interface TablePlan extends TableDiff {
  table: BackupTable;
  key: string;
  backupCount: number;
  /** Por que não dá para restaurar esta tabela agora. */
  unavailable?: string;
}

export interface RestorePlan {
  backup: BackupFile;
  current: BackupFile;
  tables: TablePlan[];
  /** Endereço antigo trocado pelo atual (backup de outro banco). */
  originRewrittenFrom: string | null;
  /** Tabelas do arquivo que este sistema não conhece (ficam de fora). */
  ignoredTables: string[];
}

export function buildRestorePlan(backupIn: BackupFile, current: BackupFile, currentOrigin: string | null): RestorePlan {
  const { backup, from } = rewriteStorageOrigin(backupIn, currentOrigin);
  const known = new Set(BACKUP_TABLES.map((t) => t.table));
  const tables: TablePlan[] = [];
  for (const t of BACKUP_TABLES) {
    const rows = backup.tabelas[t.table];
    if (!rows) continue;
    const key = tableKey(t);
    const base = { table: t, key, backupCount: rows.length };
    if (!(t.table in current.tabelas)) {
      tables.push({ ...base, missing: [], changed: [], same: 0, onlyNow: 0, unavailable: "Esta tabela ainda não existe no banco (falta aplicar a migration)." });
    } else if (current.falhas[t.table]) {
      tables.push({ ...base, missing: [], changed: [], same: 0, onlyNow: 0, unavailable: `Não deu para ler os dados de agora: ${current.falhas[t.table]}` });
    } else {
      tables.push({ ...base, ...diffTable(rows, current.tabelas[t.table], key) });
    }
  }
  return {
    backup,
    current,
    tables,
    originRewrittenFrom: from,
    ignoredTables: Object.keys(backup.tabelas).filter((name) => !known.has(name)),
  };
}

export type RestoreMode = "missing" | "overwrite";

export function rowsToWrite(plan: TablePlan, mode: RestoreMode): BackupRow[] {
  if (plan.unavailable) return [];
  return mode === "overwrite" ? [...plan.missing, ...plan.changed] : plan.missing;
}

// ------------------------------------------------------------ nomes para a tela
const isoToBR = (value: unknown) => {
  const m = typeof value === "string" ? value.match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : undefined;
};
const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const NAME_FIELDS = ["name", "titulo", "title", "description", "medication_name", "product_name", "observation", "client_name", "type"];

/** Nome curto do registro, para o usuário reconhecer o que vai voltar. */
export function rowLabel(table: string, row: BackupRow, animalNames?: Map<string, string>): string {
  if (table === "settings") return row.key === "company" ? "Dados da clínica" : `Preferências (${String(row.key)})`;
  if (table === "documents") return `Documento nº ${String(row.numero ?? "?")}`;
  if (table === "agenda_weekly_hours") return WEEKDAYS[Number(row.weekday)] ?? `Dia ${String(row.weekday)}`;
  if (table === "monthly_closings") return `Fechamento ${String(row.month).padStart(2, "0")}/${String(row.year)}`;
  if (table === "document_share_links") return `Link ${String(row.code)}`;
  const name =
    table === "reminder_log"
      ? row.kind === "vacina"
        ? "Lembrete de vacina"
        : "Lembrete de acompanhamento"
      : (NAME_FIELDS.map((f) => row[f]).find((v) => typeof v === "string" && v.trim()) as string | undefined);
  const animal = table !== "animals" && row.animal_id ? animalNames?.get(String(row.animal_id)) : undefined;
  const date = isoToBR(row.date) ?? isoToBR(row.recorded_date) ?? isoToBR(row.due_date);
  const parts = [animal, name?.trim().slice(0, 60), date].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : `Registro ${String(row.id ?? "").slice(0, 8)}`;
}

/** Nome dos animais (backup + banco), para rotular atendimentos, exames... */
export function animalNameMap(plan: RestorePlan): Map<string, string> {
  const map = new Map<string, string>();
  for (const rows of [plan.current.tabelas.animals ?? [], plan.backup.tabelas.animals ?? []]) {
    for (const row of rows) if (row.id != null && typeof row.name === "string") map.set(String(row.id), row.name);
  }
  return map;
}

/** Tradução dos erros do banco. */
export function friendlyRestoreError(message: string): string {
  if (/foreign key/i.test(message)) return "Depende de um registro que não está no banco — restaure junto a tabela de origem (ex.: o cliente antes do animal).";
  if (/duplicate key|unique constraint/i.test(message)) return "Já existe outro registro com o mesmo número ou código.";
  if (/row-level security|permission denied/i.test(message)) return "O banco não permitiu gravar nesta tabela.";
  const col = message.match(/null value in column "([^"]+)"/i)?.[1];
  if (col) return `Falta um campo obrigatório (${col}).`;
  return message;
}

// ------------------------------------------------------------ gravação
export type WriteFn = (rows: BackupRow[]) => Promise<{ error: { message: string } | null }>;

export interface WriteOutcome {
  written: number;
  failed: number;
  /** Mensagens (sem repetir) dos registros que não gravaram. */
  errors: string[];
  /** Colunas do backup que não existem mais no banco (ficaram de fora). */
  droppedColumns: string[];
}

/**
 * Grava em lotes de 500. Lote com erro é refeito registro a registro (um
 * registro ruim não derruba os outros) e o que falhou ganha uma segunda
 * chance no fim — ex.: documento substituto que depende de outro da mesma
 * tabela. Coluna que não existe mais no banco é tirada e tenta de novo.
 */
export async function writeRows(rows: BackupRow[], write: WriteFn, chunkSize = 500): Promise<WriteOutcome> {
  const dropped = new Set<string>();
  const strip = (row: BackupRow) => {
    if (dropped.size === 0) return row;
    const copy = { ...row };
    for (const col of dropped) delete copy[col];
    return copy;
  };
  const attempt = async (chunk: BackupRow[]): Promise<string | null> => {
    for (let guard = 0; guard < 20; guard++) {
      const { error } = await write(chunk.map(strip));
      if (!error) return null;
      const col = error.message.match(/could not find the '([^']+)' column/i)?.[1];
      if (col && !dropped.has(col)) {
        dropped.add(col);
        continue;
      }
      return error.message;
    }
    return "Não foi possível gravar.";
  };

  let written = 0;
  let pending: Array<{ row: BackupRow; message: string }> = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const error = await attempt(chunk);
    if (!error) {
      written += chunk.length;
      continue;
    }
    if (chunk.length === 1) {
      pending.push({ row: chunk[0], message: error });
      continue;
    }
    for (const row of chunk) {
      const rowError = await attempt([row]);
      if (rowError) pending.push({ row, message: rowError });
      else written++;
    }
  }
  if (pending.length > 0 && written > 0) {
    const retry = pending;
    pending = [];
    for (const p of retry) {
      const rowError = await attempt([p.row]);
      if (rowError) pending.push({ row: p.row, message: rowError });
      else written++;
    }
  }
  return {
    written,
    failed: pending.length,
    errors: Array.from(new Set(pending.map((p) => p.message))),
    droppedColumns: Array.from(dropped),
  };
}

export interface TableResult extends WriteOutcome {
  table: BackupTable;
}

export interface RestoreResult {
  tables: TableResult[];
  files: { restored: number; existing: number; failed: number };
  /** Banco estava vazio: a numeração automática (prontuário, documentos) precisa ser ajustada. */
  needsSequenceFix: boolean;
}

/** Reenvia assinaturas/anexos que não estão mais no Storage. */
async function restoreFiles(arquivos: Record<string, string>, currentOrigin: string | null) {
  const out = { restored: 0, existing: 0, failed: 0 };
  const entries = Object.entries(arquivos);
  for (let i = 0; i < entries.length; i += 4) {
    await Promise.all(
      entries.slice(i, i + 4).map(async ([url, dataUrl]) => {
        const parsed = parseStorageUrl(url);
        if (!parsed || !dataUrl.startsWith("data:")) {
          out.failed++;
          return;
        }
        const target = `${currentOrigin ?? parsed.origin}/storage/v1/object/public/${parsed.bucket}/${parsed.path}`;
        const exists = await fetch(target, { method: "HEAD", cache: "no-store" })
          .then((r) => r.ok)
          .catch(() => false);
        if (exists) {
          out.existing++;
          return;
        }
        const blob = dataUrlToBlob(dataUrl);
        const { error } = await supabase.storage
          .from(parsed.bucket)
          .upload(decodeURIComponent(parsed.path), blob, { contentType: blob.type, upsert: false });
        if (!error) out.restored++;
        else if (/exists|duplicate/i.test(error.message)) out.existing++;
        else out.failed++;
      })
    );
  }
  return out;
}

export async function executeRestore(
  plan: RestorePlan,
  opts: {
    mode: RestoreMode;
    tables: Set<string>;
    currentOrigin: string | null;
    onProgress?: (done: number, total: number, label: string) => void;
  }
): Promise<RestoreResult> {
  const selected = plan.tables.filter((p) => opts.tables.has(p.table.table) && rowsToWrite(p, opts.mode).length > 0);
  const total = selected.length + 1;
  const results: TableResult[] = [];
  for (let i = 0; i < selected.length; i++) {
    const p = selected[i];
    opts.onProgress?.(i, total, p.table.label);
    const outcome = await writeRows(rowsToWrite(p, opts.mode), async (chunk) => {
      const { error } = await supabase
        .from(p.table.table)
        .upsert(chunk, { onConflict: p.key, ignoreDuplicates: opts.mode === "missing" });
      return { error: error ? { message: error.message } : null };
    });
    results.push({ table: p.table, ...outcome });
  }
  opts.onProgress?.(selected.length, total, "Assinaturas e anexos");
  const files = await restoreFiles(plan.backup.arquivos, opts.currentOrigin);
  opts.onProgress?.(total, total, "Pronto");

  const wroteInto = (table: string) => results.some((r) => r.table.table === table && r.written > 0);
  const wasEmpty = (table: string) => (plan.current.tabelas[table]?.length ?? 0) === 0;
  return {
    tables: results,
    files,
    needsSequenceFix: ["animals", "documents"].some((t) => wroteInto(t) && wasEmpty(t)),
  };
}

/** SQL para acertar a numeração automática depois de restaurar num banco vazio. */
export const SEQUENCE_FIX_SQL = `select setval('public.animals_patient_code_seq', coalesce((select max(patient_code) from public.animals), 0) + 1, false);
select setval('public.documents_numero_seq', coalesce((select max(numero) from public.documents), 0) + 1, false);`;
