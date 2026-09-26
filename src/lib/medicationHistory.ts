import type { MedicationData } from "@/types/medication";
import { medicationSelectFields, refreshMedicationPosology } from "@/lib/posology";

/**
 * "Favoritos automáticos": em vez de uma lista de favoritos pra manter à mão,
 * o formulário da receita sugere os medicamentos que o veterinário já
 * prescreveu (qualquer paciente), com a posologia que ele usou — os mais
 * usados primeiro. Só leitura das receitas existentes; nada novo é gravado.
 */

export interface MedicationSuggestion {
  key: string;
  med: MedicationData;
  count: number;
  lastDate: string;
  /** "Carprofeno 75mg" */
  title: string;
  /** Instrução como sai hoje (motor atual), ex.: "Administrar 1/2 (meio) comprimido, a cada 12 horas, durante 10 dias." */
  detail: string;
}

const norm = (s: string | undefined) =>
  (s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

function suggestionKey(med: MedicationData): string {
  const f = medicationSelectFields(med);
  const parts = [
    med.medicationName,
    med.concentration,
    med.useType,
    f.form.value,
    f.form.custom,
    med.dosePerAdministration,
    f.frequency.value,
    f.frequency.custom,
    f.period.value,
    f.period.custom,
    f.site.value,
    f.site.custom,
    // Instrução escrita à mão diferente = sugestão diferente.
    med.useCustomInstructions ? med.generatedInstructions : "",
  ];
  return parts.map(norm).join("|");
}

/** Agrupa medicamentos iguais (mesmo nome + posologia) e conta quantas vezes foram usados. */
export function buildMedicationSuggestions(rows: Array<{ med: MedicationData; date: string }>): MedicationSuggestion[] {
  const byKey = new Map<string, MedicationSuggestion>();
  for (const { med, date } of rows) {
    if (!med?.medicationName?.trim()) continue;
    const key = suggestionKey(med);
    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
      if (date > existing.lastDate) existing.lastDate = date;
      continue;
    }
    const refreshed = refreshMedicationPosology(med);
    byKey.set(key, {
      key,
      med,
      count: 1,
      lastDate: date || "",
      title: [med.medicationName.trim(), med.concentration?.trim()].filter(Boolean).join(" "),
      detail: refreshed.generatedInstructions || "",
    });
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate));
}

/**
 * Sugestões cujo nome/concentração contém o que foi digitado (mín. 2 letras).
 * Começo do nome vem antes de começo de palavra, que vem antes do meio da
 * palavra ("me" → Metronidazol antes de Homeopet); dentro de cada grupo
 * mantém a ordem de uso.
 */
export function filterMedicationSuggestions(all: MedicationSuggestion[], query: string, limit = 6): MedicationSuggestion[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const rank = (title: string) => (title.startsWith(q) ? 0 : title.split(" ").some((w) => w.startsWith(q)) ? 1 : 2);
  return all
    .map((s) => ({ s, title: norm(s.title) }))
    .filter(({ title }) => title.includes(q))
    .sort((a, b) => rank(a.title) - rank(b.title))
    .slice(0, limit)
    .map(({ s }) => s);
}
