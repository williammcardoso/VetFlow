import type { ExamEntry, HemogramReference } from "@/types/exam";
import { parseBrNumber, formatDateTime } from "@/lib/utils";

// Séries de evolução dos exames (hemograma + bioquímico) — usadas pelo
// gráfico do prontuário (ExamTrendCard) e pelo PDF de evolução que vai
// para o tutor (ExamEvolutionPdfContent). Mesma fonte = mesmos números.

export interface TrendPoint {
  dateLabel: string;
  /** AAAA-MM-DD do exame */
  date: string;
  value: number;
}

export type TrendCategory = "hemogram" | "biochemical";

export interface AnalyteTrend {
  name: string;
  category: TrendCategory;
  unit: string;
  min?: number;
  max?: number;
  points: TrendPoint[];
}

// Campos fixos de hemograma que existem direto no ExamEntry (não numa lista
// como o bioquímico) — mesmas chaves usadas em defaultHemogramReferences.
const HEMOGRAM_FIELDS: Array<{ key: keyof ExamEntry; label: string; unit: string }> = [
  { key: "eritrocitos", label: "Eritrócitos", unit: "M/µL" },
  { key: "hemoglobina", label: "Hemoglobina", unit: "g/dL" },
  { key: "hematocrito", label: "Hematócrito", unit: "%" },
  { key: "leucocitosTotais", label: "Leucócitos totais", unit: "/µL" },
  { key: "contagemPlaquetaria", label: "Plaquetas", unit: "/µL" },
];

// Bioquímico é a única modalidade com série de analitos nomeados repetível
// (biochemicalEntries); a referência (min/max/unidade) vem do próprio
// lançamento, já que cada entrada guarda o que valia na hora.
function buildBiochemicalTrends(exams: ExamEntry[]): AnalyteTrend[] {
  const byAnalyte = new Map<string, AnalyteTrend>();

  const bioExams = exams
    .filter((e) => e.type === "Bioquímico" && (e.biochemicalEntries?.length ?? 0) > 0)
    .slice()
    .sort((a, b) => `${a.date}T${a.time || "00:00"}`.localeCompare(`${b.date}T${b.time || "00:00"}`));

  for (const exam of bioExams) {
    for (const entry of exam.biochemicalEntries || []) {
      const name = entry.enzyme?.trim();
      const value = parseBrNumber(entry.result);
      if (!name || value === undefined) continue;

      const existing =
        byAnalyte.get(name) || { name, category: "biochemical" as const, unit: "", min: undefined, max: undefined, points: [] };
      if (entry.referenceUnit) existing.unit = entry.referenceUnit;
      const min = parseBrNumber(entry.minReference || "");
      const max = parseBrNumber(entry.maxReference || "");
      if (min !== undefined) existing.min = min;
      if (max !== undefined) existing.max = max;
      existing.points.push({ dateLabel: formatDateTime(exam.date), date: exam.date, value });
      byAnalyte.set(name, existing);
    }
  }

  return Array.from(byAnalyte.values()).filter((t) => t.points.length >= 2);
}

// Hemograma não guarda referência por lançamento (só o valor cru) — a faixa
// vem de Cadastros > Referências de Exame (com fallback embutido no
// código), a mesma fonte usada no laudo, filtrada pela espécie do paciente.
function buildHemogramTrends(
  exams: ExamEntry[],
  hemogramReferences: Record<string, HemogramReference>,
  species: "dog" | "cat" | undefined
): AnalyteTrend[] {
  const hemoExams = exams
    .filter((e) => e.type === "Hemograma Completo")
    .slice()
    .sort((a, b) => `${a.date}T${a.time || "00:00"}`.localeCompare(`${b.date}T${b.time || "00:00"}`));

  const trends: AnalyteTrend[] = [];
  for (const field of HEMOGRAM_FIELDS) {
    const points: TrendPoint[] = [];
    for (const exam of hemoExams) {
      const raw = exam[field.key] as string | undefined;
      const value = parseBrNumber(raw || "");
      if (value === undefined) continue;
      points.push({ dateLabel: formatDateTime(exam.date), date: exam.date, value });
    }
    if (points.length < 2) continue;
    const ref = species ? hemogramReferences[field.key]?.[species] : undefined;
    trends.push({ name: field.label, category: "hemogram", unit: field.unit, min: ref?.min, max: ref?.max, points });
  }
  return trends;
}

export function buildTrends(
  exams: ExamEntry[],
  hemogramReferences: Record<string, HemogramReference> = {},
  species?: "dog" | "cat"
): AnalyteTrend[] {
  return [
    ...buildHemogramTrends(exams, hemogramReferences, species),
    ...buildBiochemicalTrends(exams),
  ].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export type TrendStatus = "normal" | "high" | "low" | "unknown";

export function trendStatus(value: number, trend: Pick<AnalyteTrend, "min" | "max">): TrendStatus {
  if (trend.min === undefined || trend.max === undefined) return "unknown";
  if (value < trend.min) return "low";
  if (value > trend.max) return "high";
  return "normal";
}

/** Número no padrão brasileiro (1.250 · 6,5), sem casas sobrando. */
export const formatTrendNumber = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/** Frase de resumo do analito para o tutor (último resultado e variação). */
export function trendSummary(trend: AnalyteTrend): string {
  const first = trend.points[0];
  const last = trend.points[trend.points.length - 1];
  const unit = trend.unit ? ` ${trend.unit}` : "";
  const status = trendStatus(last.value, trend);
  const statusText =
    status === "normal" ? "dentro da referência" : status === "high" ? "acima da referência" : status === "low" ? "abaixo da referência" : "sem referência cadastrada";
  let change = "";
  if (first.value !== 0) {
    const pct = Math.round(((last.value - first.value) / Math.abs(first.value)) * 100);
    // Variação absurda (ex.: um lançamento de 250 no lugar de 250.000) não vira "subiu 83900%".
    change =
      pct === 0
        ? " Sem variação desde o primeiro exame."
        : Math.abs(pct) > 300
          ? ` Mudou muito desde ${first.dateLabel} — confira os valores abaixo.`
          : ` ${pct > 0 ? "Subiu" : "Caiu"} ${Math.abs(pct)}% desde ${first.dateLabel}.`;
  }
  return `Último resultado (${last.dateLabel}): ${formatTrendNumber(last.value)}${unit} — ${statusText}.${change}`;
}

/** Ordem do PDF: hemograma primeiro, depois bioquímico (igual ao seletor). */
export function orderTrendsForReport(trends: AnalyteTrend[]): AnalyteTrend[] {
  const rank = (t: AnalyteTrend) => (t.category === "hemogram" ? 0 : 1);
  return [...trends].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "pt-BR"));
}

/**
 * Eixo com números redondos (1, 2, 2,5, 5 × 10^n) cobrindo [lo, hi] —
 * evita marcas como 9.116,67 no gráfico do PDF.
 */
export function niceScale(lo: number, hi: number, count = 4): { min: number; max: number; ticks: number[] } {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { min: 0, max: 1, ticks: [0, 1] };
  if (hi === lo) {
    const d = Math.abs(hi) * 0.1 || 1;
    lo -= d;
    hi += d;
  }
  const rough = (hi - lo) / Math.max(1, count - 1);
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow;
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v / step) * step);
  return { min, max, ticks: ticks.map((t) => Number(t.toPrecision(12))) };
}
