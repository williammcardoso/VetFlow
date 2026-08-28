import type { ExamEntry, HemogramReference } from "@/types/exam";
import type { AppointmentEntry } from "@/types/appointment";
import { parseBrNumber, formatDateTime } from "@/lib/utils";

interface AnimalInfo {
  name?: string;
  species?: string; // "Canino" | "Felino" | outro
}

function statusFlag(value: number | undefined, min?: number, max?: number): string {
  if (value === undefined || min === undefined || max === undefined) return "";
  if (value < min) return " [BAIXO]";
  if (value > max) return " [ALTO]";
  return " [normal]";
}

// Campos do hemograma cujo min/max cadastrado (constants/examReferences.ts)
// é a faixa do PRÓPRIO valor lançado (eritrograma, plaquetas, e o total de
// leucócitos — únicos onde min/max = faixa absoluta).
const HEMOGRAM_SIMPLE_NUMERIC_FIELDS: Array<{ key: keyof ExamEntry; label: string; refKey: string }> = [
  { key: "eritrocitos", label: "Eritrócitos", refKey: "eritrocitos" },
  { key: "hemoglobina", label: "Hemoglobina", refKey: "hemoglobina" },
  { key: "hematocrito", label: "Hematócrito", refKey: "hematocrito" },
  { key: "vcm", label: "VCM", refKey: "vcm" },
  { key: "hcm", label: "HCM", refKey: "hcm" },
  { key: "chcm", label: "CHCM", refKey: "chcm" },
  { key: "proteinaTotal", label: "Proteína total", refKey: "proteinaTotal" },
  { key: "leucocitosTotais", label: "Leucócitos totais", refKey: "leucocitosTotais" },
  { key: "contagemPlaquetaria", label: "Contagem plaquetária", refKey: "contagemPlaquetaria" },
];

// Série branca diferencial (bastonetes/segmentados/eosinófilos/basófilos/
// linfócitos/monócitos): no cadastro de referências, o min/max guardado é
// da faixa RELATIVA (%), não da absoluta — confirmado direto em
// examReferences.ts (ex.: segmentados guarda min:60,max:77, que bate com
// "relative: 60-77%", não com "absolute: 3.000-11.500/µL"). Comparar o
// valor ABSOLUTO contra esse min/max daria um [ALTO]/[BAIXO] errado — só o
// relativo entra na comparação numérica; o absoluto aparece como
// informação extra, sem marcação calculada em cima dele.
const HEMOGRAM_DIFFERENTIAL_FIELDS: Array<{ relKey: keyof ExamEntry; absKey: keyof ExamEntry; label: string; refKey: string }> = [
  { relKey: "bastonetesRelativo", absKey: "bastonetesAbsoluto", label: "Bastonetes", refKey: "bastonetes" },
  { relKey: "segmentadosRelativo", absKey: "segmentadosAbsoluto", label: "Segmentados", refKey: "segmentados" },
  { relKey: "eosinofilosRelativo", absKey: "eosinofilosAbsoluto", label: "Eosinófilos", refKey: "eosinofilos" },
  { relKey: "basofilosRelativo", absKey: "basofilosAbsoluto", label: "Basófilos", refKey: "basofilos" },
  { relKey: "linfocitosRelativo", absKey: "linfocitosAbsoluto", label: "Linfócitos", refKey: "linfocitos" },
  { relKey: "monocitosRelativo", absKey: "monocitosAbsoluto", label: "Monócitos", refKey: "monocitos" },
];

const HEMOGRAM_TEXT_FIELDS: Array<{ key: keyof ExamEntry; label: string }> = [
  { key: "hemaciasNucleadas", label: "Hemácias nucleadas" },
  { key: "observacoesSerieVermelha", label: "Observações (série vermelha)" },
  { key: "avaliacaoPlaquetaria", label: "Avaliação plaquetária" },
  { key: "observacoesSerieBranca", label: "Observações (série branca)" },
];

function speciesKey(species?: string): "dog" | "cat" | undefined {
  if (species === "Canino") return "dog";
  if (species === "Felino") return "cat";
  return undefined;
}

function formatHemogram(exam: ExamEntry, references: Record<string, HemogramReference>, species?: string): string[] {
  const sp = speciesKey(species);
  const lines: string[] = [];

  for (const field of HEMOGRAM_SIMPLE_NUMERIC_FIELDS) {
    const raw = exam[field.key] as string | undefined;
    if (!raw?.trim()) continue;
    const value = parseBrNumber(raw);
    const ref = sp ? references[field.refKey]?.[sp] : undefined;
    const flag = statusFlag(value, ref?.min, ref?.max);
    const refLabel = ref?.full || ref?.absolute;
    lines.push(`- ${field.label}: ${raw}${refLabel ? ` (referência: ${refLabel})` : ""}${flag}`);
  }

  for (const field of HEMOGRAM_DIFFERENTIAL_FIELDS) {
    const relRaw = exam[field.relKey] as string | undefined;
    const absRaw = exam[field.absKey] as string | undefined;
    if (!relRaw?.trim() && !absRaw?.trim()) continue;
    const relValue = relRaw?.trim() ? parseBrNumber(relRaw) : undefined;
    const ref = sp ? references[field.refKey]?.[sp] : undefined;
    const flag = statusFlag(relValue, ref?.min, ref?.max);
    const bits: string[] = [];
    if (relRaw?.trim()) bits.push(`relativo ${relRaw}%${ref?.relative ? ` (referência: ${ref.relative})` : ""}`);
    if (absRaw?.trim()) bits.push(`absoluto ${absRaw}${ref?.absolute ? ` (referência: ${ref.absolute})` : ""}`);
    lines.push(`- ${field.label}: ${bits.join(", ")}${flag}`);
  }

  for (const field of HEMOGRAM_TEXT_FIELDS) {
    const raw = exam[field.key] as string | undefined;
    if (raw?.trim()) lines.push(`- ${field.label}: ${raw}`);
  }

  return lines;
}

function formatBiochemical(exam: ExamEntry): string[] {
  return (exam.biochemicalEntries || []).map((entry) => {
    const value = parseBrNumber(entry.result);
    const min = parseBrNumber(entry.minReference || "");
    const max = parseBrNumber(entry.maxReference || "");
    const flag = statusFlag(value, min, max);
    const refLabel = entry.minReference && entry.maxReference
      ? `${entry.minReference} - ${entry.maxReference}${entry.referenceUnit ? ` ${entry.referenceUnit}` : ""}`
      : undefined;
    return `- ${entry.enzyme}: ${entry.result}${refLabel ? ` (referência: ${refLabel})` : ""}${flag}`;
  });
}

function formatCytology(exam: ExamEntry): string[] {
  const lines: string[] = [];
  (exam.cytologyEntries || []).forEach((lesion, i) => {
    lines.push(`- Lesão ${i + 1} (${lesion.localLesao || "local não informado"}):`);
    if (lesion.achadosMicroscopicos) lines.push(`  Achados microscópicos: ${lesion.achadosMicroscopicos}`);
    if (lesion.achadoCitologico) lines.push(`  Achado citológico: ${lesion.achadoCitologico}`);
    if (lesion.comentarios) lines.push(`  Comentários: ${lesion.comentarios}`);
  });
  return lines;
}

function formatGeneric(exam: ExamEntry): string[] {
  const lines: string[] = [];
  if (exam.result) lines.push(`- Resultado: ${exam.result}`);
  if (exam.nota) lines.push(`- Nota: ${exam.nota}`);
  if (exam.observacoesGeraisExame) lines.push(`- Observações gerais: ${exam.observacoesGeraisExame}`);
  return lines;
}

/**
 * Monta o texto de contexto pra pedir uma interpretação de IA sobre um ou
 * mais exames já lançados no sistema — usado pela tela "Pedir interpretação
 * de IA" na aba Exames do prontuário. Diferente de buildContextFromAppointment
 * (aiAssistant.ts), que trabalha com anamnese/exame físico da consulta.
 */
export function buildContextFromExams(
  exams: ExamEntry[],
  appointment: AppointmentEntry | undefined,
  observation: string,
  animalInfo: AnimalInfo,
  hemogramReferences: Record<string, HemogramReference>
): string {
  const parts: string[] = [];

  if (animalInfo.name || animalInfo.species) {
    parts.push("## Paciente");
    if (animalInfo.name) parts.push(`- Nome: ${animalInfo.name}`);
    if (animalInfo.species) parts.push(`- Espécie: ${animalInfo.species}`);
    parts.push("");
  }

  if (appointment) {
    parts.push("## Atendimento relacionado");
    parts.push(`- Data: ${formatDateTime(appointment.date, appointment.time)}`);
    parts.push(`- Tipo: ${appointment.type || "Não informado"}`);
    const details = appointment.details as Record<string, unknown> | undefined;
    const queixa = details?.queixaPrincipal as string | undefined;
    if (queixa?.trim()) parts.push(`- Queixa principal: ${queixa}`);
    parts.push("");
  }

  for (const exam of exams) {
    parts.push(`## Exame: ${exam.type || "Exame"} — ${formatDateTime(exam.date, exam.time)}`);
    let lines: string[] = [];
    if (exam.type === "Hemograma Completo") {
      lines = formatHemogram(exam, hemogramReferences, animalInfo.species);
    } else if (exam.type === "Bioquímico") {
      lines = formatBiochemical(exam);
    } else if (exam.type === "Citologia") {
      lines = formatCytology(exam);
    } else {
      lines = formatGeneric(exam);
    }
    if (lines.length === 0) lines.push("(Sem dados estruturados preenchidos nesse exame.)");
    parts.push(...lines);
    parts.push("");
  }

  if (observation.trim()) {
    parts.push("## Observação do veterinário");
    parts.push(observation.trim());
    parts.push("");
  }

  return parts.join("\n").trim();
}

export interface FetchInterpretationResult {
  ok: true;
  text: string;
}
export interface FetchInterpretationError {
  ok: false;
  error: string;
}

/**
 * Pede a interpretação de IA pro contexto de exames montado acima, via
 * proxy serverless (api/exam-interpretation.ts) — mesmo motivo do
 * assistente do atendimento: chamar a OpenAI direto do navegador expõe a
 * chave e esbarra em CORS.
 */
export async function fetchExamInterpretation(
  context: string
): Promise<FetchInterpretationResult | FetchInterpretationError> {
  try {
    const res = await fetch("/api/exam-interpretation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context }),
    });

    const data = (await res.json().catch(() => null)) as
      | { ok: true; text: string }
      | { ok: false; error: string }
      | null;

    if (!data) {
      return { ok: false, error: `Erro na API: ${res.status}` };
    }
    return data;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Falha na requisição: ${message}` };
  }
}
