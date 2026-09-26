/**
 * Número por extenso em português (0 a 999.999), com gênero — pra quantidade
 * da receita de controle especial: "28 (vinte e oito) comprimidos",
 * "2 (duas) cápsulas", "1 (um) frasco".
 */

const UNITS_M = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const UNITS_F = ["zero", "uma", "duas", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const TEENS = ["dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const TENS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const HUNDREDS_M = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
const HUNDREDS_F = ["", "cento", "duzentas", "trezentas", "quatrocentas", "quinhentas", "seiscentas", "setecentas", "oitocentas", "novecentas"];

function below100(n: number, feminine: boolean): string {
  if (n < 10) return (feminine ? UNITS_F : UNITS_M)[n];
  if (n < 20) return TEENS[n - 10];
  const tens = TENS[Math.floor(n / 10)];
  const unit = n % 10;
  return unit ? `${tens} e ${(feminine ? UNITS_F : UNITS_M)[unit]}` : tens;
}

function below1000(n: number, feminine: boolean): string {
  if (n < 100) return below100(n, feminine);
  if (n === 100) return "cem";
  const hundreds = (feminine ? HUNDREDS_F : HUNDREDS_M)[Math.floor(n / 100)];
  const rest = n % 100;
  return rest ? `${hundreds} e ${below100(rest, feminine)}` : hundreds;
}

export function numberToWordsPt(value: number, feminine = false): string {
  const n = Math.trunc(value);
  if (!Number.isFinite(n) || n < 0 || n > 999_999) return String(value);
  if (n < 1000) return below1000(n, feminine);
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  // "mil" nunca leva "um" na frente ("mil e duzentos", não "um mil").
  const head = thousands === 1 ? "mil" : `${below1000(thousands, false)} mil`;
  if (!rest) return head;
  // "e" depois do mil só quando o resto é < 100 ou centena redonda:
  // "mil e cinco", "mil e duzentos", mas "mil duzentos e cinquenta".
  const joiner = rest < 100 || rest % 100 === 0 ? " e " : " ";
  return `${head}${joiner}${below1000(rest, feminine)}`;
}

// Substantivos femininos que aparecem na quantidade da receita.
const FEMININE_NOUNS = /^(c[aá]psulas?|pipetas?|bisnagas?|ampolas?|unidades?|gotas?|embalagens?|caixas?|aplica[cç](ão|ões|ao|oes)|medidas?|dr[aá]geas?|seringas?|cartelas?|latas?)\b/i;

/**
 * "28 comprimidos" → "28 (vinte e oito) comprimidos"; "1 frasco" →
 * "1 (um) frasco"; "2 cápsulas" → "2 (duas) cápsulas". Só mexe quando começa
 * com número inteiro seguido de texto — "6,3 kg" ou texto livre ficam como
 * estão.
 */
export function withQuantityInWords(display: string): string {
  const text = (display || "").trim();
  const m = text.match(/^(\d{1,6})\s+(.+)$/);
  if (!m || /^[.,]\d/.test(m[2])) return text;
  const n = parseInt(m[1], 10);
  if (/^\(/.test(m[2])) return text; // já veio com extenso
  const feminine = FEMININE_NOUNS.test(m[2]);
  return `${n} (${numberToWordsPt(n, feminine)}) ${m[2]}`;
}
