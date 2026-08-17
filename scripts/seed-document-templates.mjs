// Etapa 2 do módulo de Documentos: lê docs/documentos/vetflow-modelos-documentos.md,
// extrai cada um dos modelos (código, título, base legal, corpo com {{ }}) e gera uma
// migration SQL que popula document_templates + document_template_versions (v1).
//
// Não conecta no Supabase (este projeto não tem acesso de escrita direto daqui —
// ver supabase/README.md): só gera o .sql, que segue o mesmo fluxo manual das
// demais migrations (colar no SQL Editor).
//
// Rodar de novo (ex.: depois de editar a biblioteca) é seguro: o SQL gerado usa
// ON CONFLICT DO NOTHING, então nunca duplica nem sobrescreve uma versão já
// publicada — para corrigir o texto de um modelo publicado, edite a biblioteca,
// rode este script de novo e aplique só o INSERT da nova versão manualmente
// (versao = 2), não o v1 já existente.
//
// Uso: node scripts/seed-document-templates.mjs
//   --versao=N       gera INSERT com essa versão em vez de 1 (ex.: corrigir
//                     o texto de um modelo já publicado — nunca sobrescreve,
//                     só soma versão nova)
//   --only=A4,C2,D2   restringe a esses códigos (senão, todos os 30)
//   --out=caminho.sql  onde escrever (senão, um nome com timestamp/versão)

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOURCE_MD = path.join(ROOT, "docs/documentos/vetflow-modelos-documentos.md");

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? true];
  })
);
const VERSAO = args.versao ? Number(args.versao) : 1;
const ONLY = args.only ? new Set(args.only.split(",").map((c) => c.trim())) : null;
const OUTPUT_SQL = args.out
  ? path.resolve(process.cwd(), args.out)
  : path.join(ROOT, "supabase/migrations/20260815130000_document_templates_seed.sql");

// Códigos que aparecem como "## <codigo>." na biblioteca mas NÃO são um modelo
// de documento renderizável (não têm {{ }} de mesclagem nem viram um PDF
// entregue ao tutor) — excluídos de propósito, não por bug do parser:
//   D9 — é um checklist de campos obrigatórios do PRONTUÁRIO (funcionalidade
//        que já existe no VetFlow), não um documento novo a emitir.
// B2-C não precisa de exclusão explícita: é "###" (h3) na biblioteca, não
// "##" (h2), e não tem bloco de código próprio — o parser abaixo já não o
// encontra. Fica para uma etapa futura, quando o motor de template puder
// COMPOR o B2-C a partir de trechos literais do B2 e do B3 (é isso que a
// biblioteca pede — nunca reescrever o texto jurídico à mão).
const SKIP_CODES = new Set(["D9"]);

// Matriz de emissão (seção 5 da biblioteca) — fonte de verdade para vias e
// exigência de assinatura do responsável, porque não dá para inferir isso
// de forma confiável a partir do corpo do texto.
const MATRIX = {
  A1: { vias: 2, assinaturaResponsavel: false },
  A2: { vias: 2, assinaturaResponsavel: false },
  A3: { vias: 1, assinaturaResponsavel: false },
  A4: { vias: 1, assinaturaResponsavel: false },
  A5: { vias: 2, assinaturaResponsavel: false },
  A6: { vias: 2, assinaturaResponsavel: false },
  A7: { vias: 2, assinaturaResponsavel: false },
  B1: { vias: 2, assinaturaResponsavel: true },
  B2: { vias: 2, assinaturaResponsavel: true },
  B3: { vias: 2, assinaturaResponsavel: true },
  B4: { vias: 2, assinaturaResponsavel: true },
  B5: { vias: 2, assinaturaResponsavel: true },
  B6: { vias: 2, assinaturaResponsavel: true },
  B7: { vias: 2, assinaturaResponsavel: true },
  B8: { vias: 2, assinaturaResponsavel: true },
  B9: { vias: 2, assinaturaResponsavel: true },
  B10: { vias: 2, assinaturaResponsavel: true },
  C1: { vias: 2, assinaturaResponsavel: true },
  C2: { vias: 2, assinaturaResponsavel: true },
  C3: { vias: 2, assinaturaResponsavel: true },
  C4: { vias: 2, assinaturaResponsavel: true },
  C5: { vias: 2, assinaturaResponsavel: false },
  D1: { vias: 2, assinaturaResponsavel: true },
  D2: { vias: 2, assinaturaResponsavel: true },
  D3: { vias: 2, assinaturaResponsavel: true },
  D4: { vias: 2, assinaturaResponsavel: true },
  D5: { vias: 2, assinaturaResponsavel: true },
  D6: { vias: 2, assinaturaResponsavel: false },
  D7: { vias: 2, assinaturaResponsavel: true },
  D8: { vias: 2, assinaturaResponsavel: false },
};

const GRUPO_POR_LETRA = {
  A: "atestados",
  B: "consentimento",
  C: "recusa",
  D: "administrativo",
};

function parseLibrary(markdown) {
  const groupHeadingRe = /^# GRUPO ([A-D]) — (.+)$/gm;
  const groups = [];
  for (const m of markdown.matchAll(groupHeadingRe)) {
    groups.push({ index: m.index, letra: m[1], label: m[2].trim() });
  }

  const templateHeadingRe = /^##\s+([A-Z]\d+)\.\s+(.+)$/gm;
  const headings = [...markdown.matchAll(templateHeadingRe)].map((m) => ({
    index: m.index,
    end: m.index + m[0].length,
    codigo: m[1],
    titulo: m[2].trim(),
  }));

  const templates = [];
  const skipped = [];

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    if (SKIP_CODES.has(h.codigo)) {
      skipped.push({ codigo: h.codigo, motivo: "excluído de propósito (ver SKIP_CODES)" });
      continue;
    }

    const sectionEnd = i + 1 < headings.length ? headings[i + 1].index : markdown.length;
    const section = markdown.slice(h.end, sectionEnd);

    const codeBlockMatch = section.match(/```\n([\s\S]*?)```/);
    if (!codeBlockMatch) {
      skipped.push({ codigo: h.codigo, motivo: "sem bloco de código (não é modelo renderizável)" });
      continue;
    }
    const corpo = codeBlockMatch[1].replace(/\s+$/, "");

    let baseLegal = null;
    const quoteLines = [];
    for (const line of section.slice(0, codeBlockMatch.index).split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith(">")) {
        quoteLines.push(trimmed.replace(/^>\s?/, ""));
      } else if (quoteLines.length > 0 && trimmed === "") {
        break;
      }
    }
    if (quoteLines.length > 0) {
      baseLegal = quoteLines
        .join(" ")
        .trim()
        .replace(/^\*\*Base legal:\*\*\s*/i, "")
        .replace(/\*\*(.*?)\*\*/g, "$1");
    }

    const group = [...groups].reverse().find((g) => g.index < h.index);
    if (!group) {
      throw new Error(`Modelo ${h.codigo} não está sob nenhum "# GRUPO" — verifique a biblioteca.`);
    }

    const matrixEntry = MATRIX[h.codigo];
    if (!matrixEntry) {
      throw new Error(
        `Modelo ${h.codigo} encontrado na biblioteca mas não está na MATRIX deste script — adicione vias/assinatura antes de gerar o seed.`
      );
    }

    const variaveis = [...new Set([...corpo.matchAll(/\{\{([a-zA-Z0-9_.]+)\}\}/g)].map((m) => m[1]))].sort();
    const exigeTestemunhas = /TESTEMUNHA/i.test(corpo);

    templates.push({
      codigo: h.codigo,
      titulo: h.titulo,
      grupo: GRUPO_POR_LETRA[group.letra],
      categoria: group.label,
      baseLegal,
      corpo,
      variaveis,
      exigeAssinaturaResponsavel: matrixEntry.assinaturaResponsavel,
      exigeTestemunhas,
      numeroVias: matrixEntry.vias,
    });
  }

  return { templates, skipped };
}

function sqlDollarQuote(text) {
  if (text === null || text === undefined) return "null";
  const tag = "$dq$";
  if (text.includes(tag)) {
    throw new Error("Conteúdo contém a tag de dollar-quote $dq$ — ajuste a tag no script.");
  }
  return `${tag}${text}${tag}`;
}

function sqlLiteral(text) {
  return `'${text.replace(/'/g, "''")}'`;
}

function buildSql(templates, versao) {
  const lines = [];
  lines.push(`-- Módulo de Documentos — seed gerado por scripts/seed-document-templates.mjs`);
  lines.push(`-- (docs/documentos/vetflow-modelos-documentos.md), versão ${versao}. Não editar`);
  lines.push("-- à mão; para corrigir texto, edite a biblioteca e rode o script de novo.");
  lines.push("--");
  lines.push("-- Idempotente: ON CONFLICT DO NOTHING em ambas as tabelas, então rodar de");
  lines.push("-- novo não duplica nem sobrescreve uma versão já publicada.");
  lines.push("");

  for (const t of templates) {
    lines.push(`-- ${t.codigo} — ${t.titulo}`);
    if (versao === 1) {
      lines.push("insert into public.document_templates");
      lines.push("  (codigo, titulo, grupo, categoria, base_legal, ativo)");
      lines.push("values");
      lines.push(
        `  (${sqlLiteral(t.codigo)}, ${sqlDollarQuote(t.titulo)}, ${sqlLiteral(t.grupo)}, ${sqlDollarQuote(
          t.categoria
        )}, ${t.baseLegal ? sqlDollarQuote(t.baseLegal) : "null"}, true)`
      );
      lines.push("on conflict (codigo) do nothing;");
      lines.push("");
    }

    lines.push("insert into public.document_template_versions");
    lines.push(
      "  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)"
    );
    lines.push("select");
    lines.push(`  id, ${versao}, ${sqlDollarQuote(t.corpo)},`);
    lines.push(`  ${sqlLiteral(JSON.stringify(t.variaveis))}::jsonb,`);
    lines.push("  '[]'::jsonb,");
    lines.push(`  ${t.exigeAssinaturaResponsavel}, ${t.exigeTestemunhas}, ${t.numeroVias}, now()`);
    lines.push("from public.document_templates");
    lines.push(`where codigo = ${sqlLiteral(t.codigo)}`);
    lines.push(
      "on conflict (template_id, versao) do nothing;"
    );
    lines.push("");
  }

  return lines.join("\n");
}

function main() {
  const markdown = readFileSync(SOURCE_MD, "utf8");
  const { templates: todosOsTemplates, skipped } = parseLibrary(markdown);
  const templates = ONLY ? todosOsTemplates.filter((t) => ONLY.has(t.codigo)) : todosOsTemplates;

  console.log(`Modelos extraídos: ${templates.length}${ONLY ? ` (filtrado de ${todosOsTemplates.length})` : ""}`);
  for (const s of skipped) {
    console.log(`  ignorado ${s.codigo} — ${s.motivo}`);
  }
  if (ONLY) {
    for (const codigo of ONLY) {
      if (!templates.some((t) => t.codigo === codigo)) {
        console.log(`  aviso: código "${codigo}" pedido em --only não foi encontrado na biblioteca`);
      }
    }
  }

  const noVars = templates.filter((t) => t.variaveis.length === 0);
  if (noVars.length > 0) {
    console.log(
      `Aviso: ${noVars.length} modelo(s) sem nenhuma variável {{ }} detectada: ${noVars
        .map((t) => t.codigo)
        .join(", ")}`
    );
  }

  const sql = buildSql(templates, VERSAO);
  writeFileSync(OUTPUT_SQL, sql, "utf8");
  console.log(`Migration gerada em ${path.relative(ROOT, OUTPUT_SQL)}`);
}

main();
