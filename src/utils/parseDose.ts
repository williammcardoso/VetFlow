/**
 * Interpreta o texto do campo "Dose por Administração" e retorna um número para cálculo.
 * Aceita: frações (1/2, 3/4), decimais (1.5, 1,5), mistos (1 + 1/2, 1 1/2), texto (meio, quarto).
 * Retorna NaN se não conseguir interpretar.
 */
export function parseDosePerAdministration(value: string): number {
  const raw = (value || "").trim();
  if (!raw) return NaN;

  let s = raw
    .replace(/,/g, ".")
    .replace(/\s+/g, " ")
    .trim();

  const textToNumber: Record<string, number> = {
    meio: 0.5,
    metade: 0.5,
    quarto: 0.25,
    "um quarto": 0.25,
    "três quartos": 0.75,
    "3/4": 0.75,
  };

  const matchParens = s.match(/\(([^)]+)\)/);
  if (matchParens) {
    const inside = matchParens[1].trim().toLowerCase();
    if (textToNumber[inside] !== undefined) {
      const before = s.replace(/\s*\([^)]+\)\s*/g, "").trim();
      if (!before || before === matchParens[0]) return textToNumber[inside];
      const numBefore = parseSimpleDose(before);
      if (!isNaN(numBefore)) return numBefore;
      return textToNumber[inside];
    }
    s = s.replace(/\s*\([^)]+\)\s*/g, " ").trim();
  }

  return parseSimpleDose(s);
}

function parseSimpleDose(s: string): number {
  if (!s) return NaN;
  s = s.replace(/,/g, ".").replace(/\s+/g, " ").trim();

  const mixedMatch = s.match(/^(\d+(?:\.\d+)?)\s*\+\s*(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1]);
    const num = parseInt(mixedMatch[2], 10);
    const den = parseInt(mixedMatch[3], 10);
    if (!isNaN(whole) && den !== 0) return whole + num / den;
  }

  const mixedMatch2 = s.match(/^(\d+(?:\.\d+)?)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch2) {
    const whole = parseFloat(mixedMatch2[1]);
    const num = parseInt(mixedMatch2[2], 10);
    const den = parseInt(mixedMatch2[3], 10);
    if (!isNaN(whole) && den !== 0) return whole + num / den;
  }

  const fracMatch = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1], 10);
    const den = parseInt(fracMatch[2], 10);
    if (den !== 0) return num / den;
  }

  const decimal = parseFloat(s);
  if (!isNaN(decimal)) return decimal;

  return NaN;
}
