import { parseDosePerAdministration } from "@/utils/parseDose";
import type { MedicationData } from "@/types/medication";

/**
 * Motor da posologia da receita simples/controlada: monta a frase de uso e a
 * quantidade sugerida a partir dos campos estruturados de cada medicamento.
 *
 * Antes era uma frase única pra tudo ("Dê {dose} {forma}, a cada…") — gotas
 * no ouvido, spray e pomada saíam com verbo errado, spray/colírio contavam
 * aplicações em vez de frasco ("120 spray", "600 gotas(s)"), "48 horas"
 * contava como 1x/dia e fração arredondava pra baixo (faltava remédio).
 * Agora cada forma farmacêutica tem sua regra: verbo, singular/plural,
 * gênero (fração: "meio comprimido" / "meia cápsula"), local de aplicação e
 * como a quantidade é contada.
 *
 * Decisões do usuário (2026-09-25):
 * - verbo no infinitivo ("Administrar", "Instilar", "Aplicar", "Oferecer");
 * - intervalo sempre "a cada N horas/dias" — "a cada 24 horas", nunca
 *   "1 vez ao dia": o tutor que lê "1x ao dia" dá um dia cedo, outro à noite;
 * - fração por extenso: "1/2 (meio) comprimido", "1/4 (um quarto) do
 *   comprimido", "1 comprimido e meio";
 * - vírgula separando cada parte, inclusive o local de aplicação:
 *   "Instilar 4 gotas, em ambos os ouvidos, a cada 12 horas, durante 15 dias.";
 * - comprimido/cápsula contados em unidades; líquido e gotas só "1 frasco"
 *   (o "(mín. X mL)" foi testado e descartado).
 */

export const USE_TYPES = [
  "Uso Oral",
  "Uso Tópico",
  "Uso Oftalmológico",
  "Uso Auricular",
  "Uso Injetável",
  "Uso Alimentar",
];

export const PHARMACY_TYPES = ["Farmácia Veterinária", "Farmácia Humana"];

export const FREQUENCIES = [
  "6 horas",
  "8 horas",
  "12 horas",
  "24 horas (1x/dia)",
  "48 horas",
  "72 horas",
  "1x por semana",
  "A cada 15 dias",
  "1x por mês",
  "Dose única",
  "Se necessário",
  "Outro",
];

export const PERIODS = [
  "3 dias",
  "5 dias",
  "7 dias",
  "10 dias",
  "14 dias",
  "21 dias",
  "30 dias",
  "60 dias",
  "90 dias",
  "Uso contínuo",
  "Até reavaliação",
  "Outro",
];

const ALL_FORMS = [
  "Comprimido",
  "Cápsula",
  "Líquido (mL)",
  "Gotas",
  "Spray",
  "Pomada",
  "Shampoo",
  "Pipeta",
  "Aplicação",
  "Ração (g)",
  "Sachê",
  "Medida",
  "Outro",
];

const FORMS_BY_USE: Record<string, string[]> = {
  "Uso Oral": ["Comprimido", "Cápsula", "Líquido (mL)", "Gotas", "Spray", "Outro"],
  "Uso Tópico": ["Pomada", "Spray", "Gotas", "Shampoo", "Pipeta", "Líquido (mL)", "Outro"],
  "Uso Oftalmológico": ["Gotas", "Pomada", "Outro"],
  "Uso Auricular": ["Gotas", "Líquido (mL)", "Pomada", "Outro"],
  "Uso Injetável": ["Líquido (mL)", "Aplicação", "Outro"],
  "Uso Alimentar": ["Ração (g)", "Sachê", "Medida", "Outro"],
};

/** Formas oferecidas pro tipo de uso escolhido (todas, se nenhum). */
export function formsForUse(useType: string): string[] {
  return FORMS_BY_USE[useType] ?? ALL_FORMS;
}

const SITES_BY_USE: Record<string, string[]> = {
  "Uso Oral": ["diretamente na boca"],
  "Uso Tópico": ["na lesão", "na região afetada", "em todo o corpo", "nas patas", "em cada narina", "na nuca"],
  "Uso Oftalmológico": ["no olho direito", "no olho esquerdo", "em ambos os olhos"],
  "Uso Auricular": ["no ouvido direito", "no ouvido esquerdo", "em ambos os ouvidos"],
  "Uso Injetável": ["por via subcutânea", "por via intramuscular", "por via intravenosa"],
};

/** Locais de aplicação pro tipo de uso (vazio = campo não aparece). */
export function sitesForUse(useType: string): string[] {
  return SITES_BY_USE[useType] ?? [];
}

// ---------------------------------------------------------------------------

type FormKind =
  | "comprimido"
  | "capsula"
  | "liquido"
  | "gotas"
  | "spray"
  | "pomada"
  | "shampoo"
  | "pipeta"
  | "aplicacao"
  | "racao"
  | "sache"
  | "medida"
  | "outro";

type QuantityMode = "units" | "package" | "weight" | "none";
type Gender = "m" | "f";

interface FormRule {
  unit?: [string, string];
  gender?: Gender;
  /** Fração vira extenso ("1/4 (um quarto) do comprimido") — só pra unidade que se parte. */
  fractionWords?: boolean;
  qty: QuantityMode;
  pkg?: string;
}

const RULES: Record<FormKind, FormRule> = {
  comprimido: { unit: ["comprimido", "comprimidos"], gender: "m", fractionWords: true, qty: "units" },
  capsula: { unit: ["cápsula", "cápsulas"], gender: "f", fractionWords: true, qty: "units" },
  liquido: { unit: ["mL", "mL"], qty: "package", pkg: "frasco" },
  gotas: { unit: ["gota", "gotas"], gender: "f", qty: "package", pkg: "frasco" },
  spray: { unit: ["borrifada", "borrifadas"], gender: "f", qty: "package", pkg: "frasco" },
  pomada: { qty: "package", pkg: "bisnaga" },
  shampoo: { qty: "package", pkg: "frasco" },
  pipeta: { unit: ["pipeta", "pipetas"], gender: "f", qty: "units" },
  aplicacao: { unit: ["aplicação", "aplicações"], gender: "f", qty: "units" },
  racao: { unit: ["g", "g"], qty: "weight" },
  sache: { unit: ["sachê", "sachês"], gender: "m", fractionWords: true, qty: "units" },
  medida: { unit: ["medida", "medidas"], gender: "f", fractionWords: true, qty: "package", pkg: "embalagem" },
  outro: { qty: "none" },
};

// \p{M} = marcas combinantes (acentos) depois do NFD — sem escrever os
// caracteres invisíveis direto no código.
const normalize = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();

function formKind(form: string): FormKind {
  const f = normalize(form);
  if (!f) return "outro";
  if (f.startsWith("comprimido")) return "comprimido";
  if (f.startsWith("capsula")) return "capsula";
  if (f.startsWith("liquido")) return "liquido";
  if (f.startsWith("gota")) return "gotas";
  if (f.startsWith("spray")) return "spray";
  if (f.startsWith("pomada") || f.startsWith("creme") || f.startsWith("gel")) return "pomada";
  if (f.startsWith("shampoo")) return "shampoo";
  if (f.startsWith("pipeta")) return "pipeta";
  if (f.startsWith("aplica")) return "aplicacao";
  if (f.startsWith("racao")) return "racao";
  if (f.startsWith("sache")) return "sache";
  if (f.startsWith("medida")) return "medida";
  return "outro";
}

function verbFor(kind: FormKind, useType: string): string {
  const use = normalize(useType);
  if (use.includes("alimentar")) return "Oferecer";
  switch (kind) {
    case "comprimido":
    case "capsula":
      return "Administrar";
    case "liquido":
      return use.includes("injetavel") ? "Aplicar" : use.includes("oral") || !use ? "Administrar" : "Aplicar";
    case "gotas":
      return use.includes("oral") || !use ? "Administrar" : "Instilar";
    case "aplicacao":
      return "Realizar";
    case "racao":
    case "sache":
    case "medida":
      return "Oferecer";
    case "outro":
      return use.includes("oral") || !use ? "Administrar" : "Aplicar";
    default:
      return "Aplicar";
  }
}

// Dose que não vira número ("meio") fica no singular: "meio comprimido".
const pluralize = (n: number, [one, many]: [string, string]) => (Number.isFinite(n) && n >= 2 ? many : one);

const FRACTION_WORDS: Record<string, string> = {
  "1/3": "um terço",
  "2/3": "dois terços",
  "1/4": "um quarto",
  "3/4": "três quartos",
  "1/8": "um oitavo",
};

/** "1/2 (meio)" → "1/2"; espaços normalizados; resto como digitado. */
function cleanDose(dose: string): string {
  return (dose || "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, "/")
    .trim();
}

/**
 * Dose + unidade na forma que o tutor entende:
 * "1/2 (meio) comprimido", "1/4 (um quarto) do comprimido",
 * "1 comprimido e meio", "1/2 (meia) cápsula", "2 comprimidos", "5 mL".
 */
function dosePhraseFor(dose: string, rule: FormRule): string {
  const raw = cleanDose(dose);
  if (!raw || !rule.unit) return raw;
  const [one] = rule.unit;
  const female = rule.gender === "f";

  if (rule.fractionWords) {
    const pure = raw.match(/^(\d+)\/(\d+)$/);
    if (pure && Number(pure[1]) < Number(pure[2])) {
      const key = `${Number(pure[1])}/${Number(pure[2])}`;
      if (key === "1/2") return `1/2 (${female ? "meia" : "meio"}) ${one}`;
      const words = FRACTION_WORDS[key];
      return `${key}${words ? ` (${words})` : ""} ${female ? "da" : "do"} ${one}`;
    }
    const mixed = raw.match(/^(\d+)\s*(?:\+\s*|e\s+|\s)(\d+)\/(\d+)$/i);
    if (mixed && Number(mixed[2]) < Number(mixed[3])) {
      const whole = Number(mixed[1]);
      const key = `${Number(mixed[2])}/${Number(mixed[3])}`;
      const tail = key === "1/2" ? (female ? "meia" : "meio") : FRACTION_WORDS[key] ?? key;
      return `${whole} ${pluralize(whole, rule.unit)} e ${tail}`;
    }
  }

  return `${raw} ${pluralize(parseDosePerAdministration(raw), rule.unit)}`;
}

interface FrequencyInfo {
  phrase: string;
  perDay: number | null;
  single?: boolean;
  daily?: boolean;
}

function parseCustomFrequency(text: string): FrequencyInfo {
  const raw = text.trim();
  const t = normalize(raw);
  const hoursOnly = t.match(/^(\d+(?:[.,]\d+)?)\s*(h|hs|hora|horas)$/);
  if (hoursOnly) {
    const h = parseFloat(hoursOnly[1].replace(",", "."));
    return { phrase: `a cada ${hoursOnly[1]} horas`, perDay: h > 0 ? 24 / h : null, daily: h === 24 };
  }
  const everyHours = t.match(/(\d+(?:[.,]\d+)?)\s*(h\b|hs\b|hora)/);
  if (everyHours) {
    const h = parseFloat(everyHours[1].replace(",", "."));
    return { phrase: raw, perDay: h > 0 ? 24 / h : null };
  }
  const timesDay = t.match(/(\d+)\s*x\s*(ao|por|\/)\s*dia/);
  if (timesDay) return { phrase: raw, perDay: parseInt(timesDay[1], 10) };
  const everyDays = t.match(/(\d+)\s*dias?/);
  if (everyDays) {
    const d = parseInt(everyDays[1], 10);
    return { phrase: raw, perDay: d > 0 ? 1 / d : null };
  }
  if (t.includes("semana")) return { phrase: raw, perDay: 1 / 7 };
  return { phrase: raw, perDay: null };
}

function frequencyInfo(frequency: string, customFrequency?: string): FrequencyInfo | null {
  const f = (frequency || "").trim();
  if (!f) return null;
  switch (normalize(f)) {
    case "6 horas":
      return { phrase: "a cada 6 horas", perDay: 4 };
    case "8 horas":
      return { phrase: "a cada 8 horas", perDay: 3 };
    case "12 horas":
      return { phrase: "a cada 12 horas", perDay: 2 };
    case "24 horas (1x/dia)":
    case "24 horas":
      return { phrase: "a cada 24 horas", perDay: 1, daily: true };
    case "48 horas":
      return { phrase: "a cada 48 horas", perDay: 1 / 2 };
    case "72 horas":
      return { phrase: "a cada 72 horas", perDay: 1 / 3 };
    case "1x por semana":
      return { phrase: "a cada 7 dias", perDay: 1 / 7 };
    case "a cada 15 dias":
      return { phrase: "a cada 15 dias", perDay: 1 / 15 };
    case "1x por mes":
      return { phrase: "a cada 30 dias", perDay: 1 / 30 };
    case "dose unica":
      return { phrase: "em dose única", perDay: null, single: true };
    case "se necessario":
      return { phrase: "se necessário", perDay: null };
    case "outro":
      return customFrequency?.trim() ? parseCustomFrequency(customFrequency) : null;
    default:
      // Receita antiga gravava o texto livre direto em `frequency`.
      return parseCustomFrequency(f);
  }
}

interface DurationInfo {
  phrase: string;
  days: number | null;
}

function parseCustomDuration(text: string): DurationInfo {
  const raw = text.trim();
  const t = normalize(raw);
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(dia|dias|semana|semanas|mes|meses)\b/);
  const days = m
    ? parseFloat(m[1].replace(",", ".")) * (m[2].startsWith("semana") ? 7 : m[2].startsWith("mes") ? 30 : 1)
    : null;
  // Só põe "durante" quando o texto começa com número ("2 semanas");
  // "até voltar o apetite" entra do jeito que foi digitado (antes saía
  // "durante até voltar o apetite").
  const phrase = /^\d/.test(t) ? `durante ${raw}` : raw;
  return { phrase, days };
}

function durationInfo(period: string, customPeriod?: string): DurationInfo | null {
  const p = (period || "").trim();
  if (!p) return null;
  const n = normalize(p);
  const fixed = n.match(/^(\d+)\s*dias?$/);
  if (fixed) return { phrase: `durante ${fixed[1]} dias`, days: parseInt(fixed[1], 10) };
  if (n === "uso continuo") return { phrase: "em uso contínuo", days: null };
  if (n === "ate reavaliacao") return { phrase: "até a reavaliação", days: null };
  if (n === "outro") return customPeriod?.trim() ? parseCustomDuration(customPeriod) : null;
  return parseCustomDuration(p);
}

const formatNumberBR = (n: number) => String(n).replace(".", ",");

function formatWeight(grams: number): string {
  if (grams >= 1000) {
    const kg = Math.round((grams / 1000) * 10) / 10;
    return `${formatNumberBR(kg)} kg`;
  }
  return `${Math.ceil(grams - 1e-9)} g`;
}

export interface PosologyInput {
  useType: string;
  form: string;
  customForm?: string;
  dose: string;
  frequency: string;
  customFrequency?: string;
  period: string;
  customPeriod?: string;
  site?: string;
  customSite?: string;
}

export interface PosologyResult {
  /** Frase de uso, ex.: "Administrar 1 comprimido, a cada 12 horas, durante 7 dias." */
  text: string;
  /** Quantidade sugerida pra receita, ex.: "14 comprimidos", "1 frasco". */
  quantityDisplay: string;
  /** Parte numérica quando a quantidade é contada em unidades (senão null). */
  quantityNumber: number | null;
}

export function buildPosology(input: PosologyInput): PosologyResult {
  const isOtherForm = normalize(input.form) === "outro";
  const formLabel = isOtherForm ? (input.customForm || "").trim() : (input.form || "").trim();
  const kind = isOtherForm ? "outro" : formKind(input.form);
  const rule = RULES[kind];
  const dose = (input.dose || "").trim();
  // parseDose entende "1 + 1/2" e "1 1/2", mas não "1 e 1/2" (virava 1).
  const doseNum = parseDosePerAdministration(dose.replace(/(\d)\s+e\s+(\d)/i, "$1 + $2"));
  const isFood = normalize(input.useType).includes("alimentar");

  // Dose + unidade ("1/2 (meio) comprimido", "4 gotas", "5 mL",
  // "uma fina camada"). Sem forma escolhida ainda não há frase
  // ("Administrar 1/2." não diz nada).
  let dosePhrase = "";
  if (!formLabel) {
    dosePhrase = "";
  } else if (kind === "pomada") {
    dosePhrase = dose ? cleanDose(dose) : "uma fina camada";
  } else if (kind === "shampoo") {
    dosePhrase = dose ? cleanDose(dose) : "o shampoo";
  } else if (kind === "outro") {
    dosePhrase = [cleanDose(dose), formLabel.toLowerCase()].filter(Boolean).join(" ");
  } else if (dose) {
    dosePhrase = dosePhraseFor(dose, rule);
  }

  const site = (normalize(input.site || "") === "outro" ? input.customSite : input.site)?.trim() || "";
  const freq = frequencyInfo(input.frequency, input.customFrequency);
  const duration = durationInfo(input.period, input.customPeriod);

  // ---- Frase: cada parte separada por vírgula, como o veterinário escreve ----
  let text = "";
  if (dosePhrase) {
    // Ração: "Oferecer 70 g por dia" (quantidade diária), não "a cada 24 horas".
    const foodDaily = isFood && Boolean(freq?.daily);
    const parts = [`${verbFor(kind, input.useType)} ${dosePhrase}${foodDaily ? " por dia" : ""}`];
    if (site) parts.push(site);
    if (freq && !foodDaily) parts.push(freq.phrase);
    if (duration && !freq?.single) parts.push(duration.phrase);
    text = `${parts.join(", ")}.`;
  }

  // ---- Quantidade ----
  const administrations =
    freq?.single ? 1 : freq?.perDay != null && duration?.days != null ? freq.perDay * duration.days : null;
  const total = administrations != null && Number.isFinite(doseNum) ? doseNum * administrations : null;

  let quantityDisplay = "";
  let quantityNumber: number | null = null;
  switch (rule.qty) {
    case "units": {
      if (total != null && total > 0 && rule.unit) {
        // Arredonda pra CIMA: 1/4 de comprimido por 5 dias = 1,25 → 2 comprimidos.
        const n = Math.ceil(total - 1e-9);
        quantityNumber = n;
        quantityDisplay = `${n} ${pluralize(n, rule.unit)}`;
      }
      break;
    }
    case "package": {
      quantityDisplay = `1 ${rule.pkg ?? "unidade"}`;
      break;
    }
    case "weight": {
      if (total != null && total > 0) quantityDisplay = formatWeight(total);
      break;
    }
    default:
      break;
  }

  return { text, quantityDisplay, quantityNumber };
}

// ---------------------------------------------------------------------------
// Receita gravada → campos do motor

/**
 * Valor de select gravado → { valor do select, texto do "Outro" }. Receita
 * antiga gravava o texto livre direto no campo (ex.: frequency = "a cada 48
 * horas") — vira "Outro" + o texto, em vez de o select aparecer vazio e o
 * texto sumir.
 */
export function splitOption(value: string | undefined, custom: string | undefined, options: string[]) {
  const v = (value || "").trim();
  if (!v) return { value: "", custom: custom || "" };
  if (options.includes(v)) return { value: v, custom: v === "Outro" ? custom || "" : "" };
  return { value: "Outro", custom: custom || v };
}

type MedicationPosologyFields = Pick<
  MedicationData,
  | "useType"
  | "pharmaceuticalForm"
  | "customPharmaceuticalForm"
  | "dosePerAdministration"
  | "frequency"
  | "customFrequency"
  | "period"
  | "customPeriod"
  | "applicationSite"
  | "customApplicationSite"
>;

/** Campos de select de um medicamento gravado, já normalizados (formas/rótulos antigos). */
export function medicationSelectFields(med: MedicationPosologyFields) {
  const legacyForm = med.pharmaceuticalForm === "Líquido (ml)" ? "Líquido (mL)" : med.pharmaceuticalForm;
  return {
    form: splitOption(legacyForm, med.customPharmaceuticalForm, [...ALL_FORMS]),
    frequency: splitOption(med.frequency, med.customFrequency, FREQUENCIES),
    period: splitOption(med.period, med.customPeriod, PERIODS),
    site: splitOption(med.applicationSite, med.customApplicationSite, [...sitesForUse(med.useType), "Outro"]),
  };
}

export function posologyInputFromMedication(med: MedicationPosologyFields): PosologyInput {
  const f = medicationSelectFields(med);
  return {
    useType: med.useType,
    form: f.form.value,
    customForm: f.form.custom,
    dose: med.dosePerAdministration,
    frequency: f.frequency.value,
    customFrequency: f.frequency.custom,
    period: f.period.value,
    customPeriod: f.period.custom,
    site: f.site.value,
    customSite: f.site.custom,
  };
}

/**
 * Regera texto e quantidade de um medicamento gravado com o motor atual —
 * usado ao abrir uma receita pra editar ou repetir, pra prévia/PDF baterem
 * com o que o formulário mostra. Texto ou quantidade editados à mão (ou que
 * o motor não consegue gerar a partir dos campos antigos) ficam como estão.
 */
export function refreshMedicationPosology<T extends MedicationData>(med: T): T {
  const p = buildPosology(posologyInputFromMedication(med));
  const textEdited = Boolean(med.useCustomInstructions) || (!p.text && Boolean(med.generatedInstructions?.trim()));
  const qtyEdited = Boolean(med.quantityEdited) || (!p.quantityDisplay && Boolean(med.totalQuantityDisplay?.trim()));
  return {
    ...med,
    useCustomInstructions: textEdited,
    generatedInstructions: textEdited ? med.generatedInstructions : p.text,
    quantityEdited: qtyEdited,
    totalQuantityDisplay: qtyEdited ? med.totalQuantityDisplay : p.quantityDisplay,
    totalQuantity: qtyEdited ? med.totalQuantity : p.quantityNumber != null ? String(p.quantityNumber) : "",
  };
}
