import { supabase } from "@/integrations/supabase/client";
import { generateUUID, parseBrNumber } from "@/lib/utils";
import type { CustomExamBlock, CustomExamTemplate, ExamEntry } from "@/types/exam";

// Exame montado em blocos: tipo "Outro" (qualquer exame que não tem tela
// própria — ex.: contagem de reticulócitos) e os tipos genéricos (Fezes,
// Urinálise, Raio-X...). O formato de cada exame vira um MODELO (tabela
// registry, key "examTemplates") para vir montado na próxima vez.

export type BlockKind = CustomExamBlock["kind"];

/** Tipos com tela própria — os demais usam o exame montado em blocos. */
export const TYPES_WITH_OWN_FORM = new Set(["Hemograma Completo", "Bioquímico", "Citologia", "Teste Rápido"]);
export const OTHER_EXAM_TYPE = "Outro";

export const usesCustomBlocks = (type?: string) => !!type && !TYPES_WITH_OWN_FORM.has(type);

/** Nome que aparece no prontuário e no laudo ("Contagem de reticulócitos" em vez de "Outro"). */
export const examDisplayName = (exam: Pick<ExamEntry, "type" | "examName">) =>
  (exam.type === OTHER_EXAM_TYPE && exam.examName?.trim()) || exam.examName?.trim() || exam.type || "Exame";

export function newBlock(kind: BlockKind): CustomExamBlock {
  const id = generateUUID();
  switch (kind) {
    case "analito":
      return { id, kind, name: "", result: "", unit: "", refMin: "", refMax: "", refText: "" };
    case "texto":
      return { id, kind, title: "Conclusão", text: "" };
    case "referencia":
      return { id, kind, title: "Valores de referência", text: "" };
    case "secao":
      return { id, kind, title: "" };
  }
}

/** Número só quando o texto é número de verdade ("87.400", "1,9") — "leve" ou "negativo" não. */
export function strictNumber(raw?: string): number | undefined {
  const t = (raw || "").trim();
  if (!/^-?\d[\d.,]*$/.test(t)) return undefined;
  return parseBrNumber(t);
}

export type AnalitoStatus = "normal" | "high" | "low" | "unknown";

/** Resultado dentro/fora da faixa numérica (↑/↓ no laudo). */
export function analitoStatus(block: Extract<CustomExamBlock, { kind: "analito" }>): AnalitoStatus {
  const value = strictNumber(block.result);
  const min = strictNumber(block.refMin);
  const max = strictNumber(block.refMax);
  if (value === undefined || (min === undefined && max === undefined)) return "unknown";
  if (min !== undefined && value < min) return "low";
  if (max !== undefined && value > max) return "high";
  return "normal";
}

/** Texto da referência do analito: faixa e/ou texto livre. */
export function analitoReference(block: Extract<CustomExamBlock, { kind: "analito" }>): string {
  const unit = block.unit?.trim() ? ` ${block.unit.trim()}` : "";
  const min = block.refMin?.trim();
  const max = block.refMax?.trim();
  const range = min && max ? `${min} – ${max}${unit}` : min ? `≥ ${min}${unit}` : max ? `≤ ${max}${unit}` : "";
  return [range, block.refText?.trim()].filter(Boolean).join(" · ");
}

/** O bloco tem algo preenchido? (bloco vazio não vai para o laudo) */
export function blockHasContent(block: CustomExamBlock): boolean {
  switch (block.kind) {
    case "analito":
      return !!block.name.trim() && !!block.result.trim();
    case "texto":
    case "referencia":
      return !!block.text.trim();
    case "secao":
      return !!block.title.trim();
  }
}

/** Blocos que vão para o laudo: sem vazios e sem título de seção sobrando no fim. */
export function reportBlocks(blocks: CustomExamBlock[] = []): CustomExamBlock[] {
  const filled = blocks.filter(blockHasContent);
  while (filled.length && filled[filled.length - 1].kind === "secao") filled.pop();
  return filled;
}

/**
 * Formato do exame para o modelo: analitos sem resultado, texto do
 * resultado (conclusão) em branco; tabelas de referência e seções ficam.
 */
export function templateBlocks(blocks: CustomExamBlock[]): CustomExamBlock[] {
  return blocks
    .filter((b) => (b.kind === "analito" ? !!b.name.trim() : b.kind === "secao" ? !!b.title.trim() : true))
    .map((b) => (b.kind === "analito" ? { ...b, result: "" } : b.kind === "texto" ? { ...b, text: "" } : b));
}

/** Blocos novos (ids novos) a partir do modelo. */
export const blocksFromTemplate = (template: Pick<CustomExamTemplate, "blocks">): CustomExamBlock[] =>
  template.blocks.map((b) => ({ ...b, id: generateUUID() }));

/** Compara o formato de dois exames (para saber se o modelo precisa ser atualizado). */
export function templateSignature(t: { metodo?: string; material?: string; blocks: CustomExamBlock[] }): string {
  const norm = (s?: string) => (s || "").trim();
  return JSON.stringify({
    metodo: norm(t.metodo),
    material: norm(t.material),
    blocks: templateBlocks(t.blocks).map((b) => {
      const { id: _id, ...rest } = b;
      return Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]));
    }),
  });
}

/** Exame antigo só com "Resultado" em texto vira um bloco de texto ao editar. */
export const legacyResultBlocks = (result?: string): CustomExamBlock[] =>
  result?.trim() ? [{ id: generateUUID(), kind: "texto", title: "Resultado", text: result.trim() }] : [];

/** Linha curta para o prontuário: a conclusão primeiro, depois os primeiros resultados. */
export function customExamSummary(exam: Pick<ExamEntry, "customBlocks" | "result" | "nota">): string {
  const blocks = reportBlocks(exam.customBlocks);
  if (blocks.length === 0) return exam.result || exam.nota || "";
  const parts: string[] = [];
  const firstText = blocks.find((b) => b.kind === "texto");
  if (firstText && firstText.kind === "texto") {
    parts.push(`${firstText.title ? `${firstText.title}: ` : ""}${firstText.text.replace(/\s+/g, " ")}`);
  }
  for (const b of blocks) {
    if (parts.length >= 3) break;
    if (b.kind !== "analito") continue;
    const s = analitoStatus(b);
    parts.push(`${b.name}: ${b.result}${b.unit ? ` ${b.unit}` : ""}${s === "high" ? " ↑" : s === "low" ? " ↓" : ""}`);
  }
  return parts.join(" · ");
}

// ------------------------------------------------------------ modelos
const REGISTRY_KEY = "examTemplates";

const slug = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const templateIdFor = (name: string) => `examTemplate-${slug(name)}`;

export async function listExamTemplates(): Promise<CustomExamTemplate[]> {
  const { data, error } = await supabase.from("registry").select("id, name, extra").eq("key", REGISTRY_KEY).order("name");
  if (error) {
    console.error("[examTemplates] list", error);
    return [];
  }
  return (data || []).map((row: { id: string; name: string; extra?: Record<string, unknown> }) => ({
    id: row.id,
    name: row.name,
    metodo: (row.extra?.metodo as string) || undefined,
    material: (row.extra?.material as string) || undefined,
    blocks: Array.isArray(row.extra?.blocks) ? (row.extra!.blocks as CustomExamBlock[]) : [],
  }));
}

/** Cria ou atualiza o modelo do exame (pelo nome). */
export async function saveExamTemplate(t: { name: string; metodo?: string; material?: string; blocks: CustomExamBlock[] }): Promise<boolean> {
  const name = t.name.trim();
  if (!name) return false;
  const { error } = await supabase.from("registry").upsert(
    {
      id: templateIdFor(name),
      key: REGISTRY_KEY,
      name,
      extra: { metodo: t.metodo?.trim() || null, material: t.material?.trim() || null, blocks: templateBlocks(t.blocks) },
    },
    { onConflict: "id" }
  );
  if (error) console.error("[examTemplates] save", error);
  return !error;
}

export async function deleteExamTemplate(id: string): Promise<boolean> {
  const { error } = await supabase.from("registry").delete().eq("id", id).eq("key", REGISTRY_KEY);
  if (error) console.error("[examTemplates] delete", error);
  return !error;
}
