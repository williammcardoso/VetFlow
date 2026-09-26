/**
 * Unidades da receita manipulada — as listas do formulário e como cada uma
 * sai impressa (a prévia do formulário e o PDF usam a mesma função).
 *
 * Histórico: até 24/08/2026 o q.s.p. oferecia formas (cápsula(s),
 * comprimido(s), creme(s)...); a troca por unidades de medida (g/mg/mL/UFC)
 * tirou justamente o que era usado nas receitas ("q.s.p. 60 cápsulas").
 * As duas coisas voltam juntas, e valor antigo gravado continua aparecendo
 * no select (withSavedOption).
 */

/** Componente ativo: quanto vai por unidade da fórmula (por cápsula, por mL, por kg...). */
export const COMPONENT_UNITS = [
  "Miligrama (mg)",
  "Micrograma (mcg)",
  "Grama (g)",
  "Mililitro (mL)",
  "%",
  "UI (Unidade Internacional)",
  "Miligrama por mililitro (mg/mL)",
  "Miligrama por quilo (mg/kg)",
  "Micrograma por quilo (mcg/kg)",
  "UFC",
  "Unidade",
  "Outro",
];

/** Tipo do q.s.p.: "Excipiente q.s.p. 60 cápsulas", "Veículo q.s.p. 30 mL", "Creme base q.s.p. 50 g". */
export const VEHICLE_TYPES = ["Excipiente", "Veículo", "Creme base", "Gel base", "Pomada base", "Outro"];

/** Quantidade do q.s.p.: nº de unidades a manipular ou volume/massa total. */
export const VEHICLE_UNITS = [
  "cápsula(s)",
  "comprimido(s)",
  "biscoito(s)",
  "sachê(s)",
  "dose(s)",
  "mililitro(s) (mL)",
  "grama(s) (g)",
  "%",
  "unidade(s)",
  "outro(s)",
];

export const POSOLOGY_MEASURES = [
  "Comprimido",
  "Cápsula",
  "Biscoito",
  "Sachê",
  "Líquido (mL)",
  "Gotas",
  "Aplicação",
  "Spray",
  "Pomada",
  "Outro",
];

export const FREQUENCY_UNITS = ["Hora(s)", "Dia(s)", "Semana(s)", "Outro"];
export const DURATION_UNITS = ["Dia(s)", "Semana(s)", "Mês(es)", "Outro"];

/** Valor gravado que não está mais na lista entra antes do "Outro" — senão o select abre em branco. */
export function withSavedOption(list: string[], value: string | undefined): string[] {
  const v = (value || "").trim();
  if (!v || list.includes(v)) return list;
  const i = list.findIndex((o) => /^outr[oa]/i.test(o));
  return i < 0 ? [...list, v] : [...list.slice(0, i), v, ...list.slice(i)];
}

/** "Líquido (ml)" gravado antes vira a opção atual "Líquido (mL)". */
export function normalizeMeasure(measure: string): string {
  return measure === "Líquido (ml)" ? "Líquido (mL)" : measure;
}

/** Nome impresso do q.s.p. ("Excipiente", "Veículo" ou o que foi digitado em "Outro"). */
export function vehicleTypeLabel(type: string | undefined, customType?: string): string {
  if (type === "Outro") return (customType || "").trim() || "Excipiente";
  return (type || "").trim() || "Excipiente";
}

// Unidade de medida → como sai impressa. Inclui os rótulos antigos do q.s.p.
// (minúsculos) e os do componente (maiúsculos).
const ABBREVIATION: Record<string, string> = {
  "Grama (g)": "g",
  "Miligrama (mg)": "mg",
  "Mililitro (mL)": "mL",
  "Micrograma (mcg)": "mcg",
  Unidade: "un",
  "Unidade(s)": "un",
  "UI (Unidade Internacional)": "UI",
  "Miligrama por mililitro (mg/mL)": "mg/mL",
  "Miligrama por quilo (mg/kg)": "mg/kg",
  "Micrograma por quilo (mcg/kg)": "mcg/kg",
  UFC: "UFC",
  "UFC/g": "UFC/g",
  "UFC/kg": "UFC/kg",
  "mililitro(s) (mL)": "mL",
  "grama(s) (g)": "g",
  "miligrama(s) (mg)": "mg",
  "micrograma(s) (mcg)": "mcg",
  ufc: "UFC",
  "ufc/g": "UFC/g",
  "ufc/kg": "UFC/kg",
};

// Unidade contável (forma farmacêutica): singular/plural pela quantidade.
const COUNTABLE: Record<string, [string, string]> = {
  "cápsula(s)": ["cápsula", "cápsulas"],
  "comprimido(s)": ["comprimido", "comprimidos"],
  "biscoito(s)": ["biscoito", "biscoitos"],
  "sachê(s)": ["sachê", "sachês"],
  "dose(s)": ["dose", "doses"],
  "unidade(s)": ["unidade", "unidades"],
  "drágea(s)": ["drágea", "drágeas"],
  "bastão(s)": ["bastão", "bastões"],
  "creme(s)": ["creme", "cremes"],
  "gel(es)": ["gel", "géis"],
  "líquido(s)": ["líquido", "líquidos"],
  "pó(s)": ["pó", "pós"],
};

const firstNumber = (s: string) => {
  const m = s.replace(",", ".").match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
};

/**
 * Quantidade + unidade como vai na receita:
 * "60" + "cápsula(s)" → "60 cápsulas"; "1" + "cápsula(s)" → "1 cápsula";
 * "30" + "mililitro(s) (mL)" → "30 mL"; "0,03" + "%" → "0,03%";
 * "10" + "Miligrama (mg)" → "10 mg". Unidade em "Outro" usa o texto digitado.
 */
export function formatQuantityWithUnit(quantity: string, unit: string, customUnit?: string): string {
  const q = (quantity || "").trim();
  const u = /^outro/i.test(unit || "") ? (customUnit || "").trim() : (unit || "").trim();
  if (!u) return q;
  if (!q) return "";
  // Quantidade digitada já com a unidade ("350mL") — não repete.
  if (/\d\s*(ml|mg|mcg|g|kg|l|ui|ufc|%)$/i.test(q)) return q;
  if (u === "%") return `${q}%`;
  const countable = COUNTABLE[u];
  if (countable) {
    const n = firstNumber(q);
    return `${q} ${n >= 2 || n === 0 ? countable[1] : countable[0]}`;
  }
  return `${q} ${ABBREVIATION[u] ?? u}`;
}
