// Campos de preenchimento dos modelos oficiais (termos/atestados): as opções
// "( )" e as linhas pontilhadas "......" que o corpo de cada modelo traz para
// marcar/completar. Antes o único jeito era editar o texto inteiro do
// documento procurando cada "( )" e trocando por "(X)" à mão.
//
// Lê o corpo da versão do modelo (não uma lista fixa por código), então
// funciona com os 30 modelos e com qualquer versão editada depois. Função
// pura, com testes — mesmo critério do motor de template.
//
// Os campos são numerados na ordem em que aparecem no corpo; a mesma
// varredura monta o formulário (parseFillFields) e devolve o texto
// preenchido (applyFillAnswers), então o número de um campo é estável
// enquanto a versão do modelo for a mesma.

export type BlankFormat = "text" | "date" | "time" | "daymonth";

export type FillSegment =
  | { kind: "text"; text: string }
  | { kind: "check"; id: number }
  | {
      kind: "blank";
      id: number;
      format: BlankFormat;
      size: "sm" | "md" | "lg";
      /** Opção "( )" à qual o campo pertence (ex.: "( ) Outros: ....") — preencher marca a opção. */
      attachTo?: number;
    };

export interface FillLine {
  key: string;
  segments: FillSegment[];
  /** Texto antes do primeiro campo (ex.: "Classificação ASA"); vazio em linha que começa com "( )". */
  label: string;
  /** Linha anterior do documento, quando esta continua a frase dela (ex.: "Em caso de parada cardiorrespiratória:"). */
  context?: string;
  tableRow: boolean;
}

export interface FillSection {
  title: string;
  lines: FillLine[];
}

/** Resposta de cada campo: true/false nas opções, texto nos campos (data em AAAA-MM-DD, hora em HH:MM). */
export type FillAnswers = Record<number, boolean | string>;

// Ordem importa: data e hora antes da linha pontilhada comum, senão
// "....../....../......" virava três campos separados.
const TOKEN_SOURCE =
  /(\.{2,}\/\.{2,}\/\.{2,})|(\.{2,}h\.{2,})|(\.{2,}\/\.{2,})|(\(\s{1,2}\))|(\.{4,}|…{2,}|_{3,})/.source;
const tokenRegex = () => new RegExp(TOKEN_SOURCE, "g");

// Linha longa de sublinhado é linha de assinatura, não campo; o mesmo vale
// para "Ass.: ......" das testemunhas — assinatura é sempre à caneta.
const SIGNATURE_UNDERSCORES = /^_{10,}$/;
const SIGNATURE_LABEL = /(?:\bass\.|assinatura[^:]*):\s*$/i;

interface RawToken {
  id: number;
  index: number;
  text: string;
  kind: "check" | "blank";
  format: BlankFormat;
  skip: boolean;
}

function scanLine(line: string, firstId: number): RawToken[] {
  const tokens: RawToken[] = [];
  let id = firstId;
  for (const m of line.matchAll(tokenRegex())) {
    const [text, date, time, daymonth, check] = m;
    const index = m.index ?? 0;
    const before = line.slice(0, index);
    const isCheck = check !== undefined;
    const skip = !isCheck && (SIGNATURE_UNDERSCORES.test(text) || SIGNATURE_LABEL.test(before));
    tokens.push({
      id: id++,
      index,
      text,
      kind: isCheck ? "check" : "blank",
      format: date ? "date" : time ? "time" : daymonth ? "daymonth" : "text",
      skip,
    });
  }
  return tokens;
}

function isHeading(line: string): boolean {
  const t = line.trim();
  if (!t || /\{\{|\[/.test(t)) return false;
  const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, "");
  return letters.length >= 4 && t.length <= 90 && t === t.toUpperCase();
}

const KEEP_UPPER = new Set(["ASA", "CRMV", "CFMV", "LGPD", "CEUA", "UTI", "CNPJ", "CPF", "ECC", "PDF", "DICOM", "TCLE", "II", "III", "IV"]);

/** "5. AVALIAÇÃO DE RISCO PARA SEDAÇÃO" → "5. Avaliação de risco para sedação" (siglas mantidas). */
export function prettySectionTitle(title: string): string {
  let first = true;
  return title
    .replace(/^[─\-—\s]+|[─\-—\s]+$/g, "")
    .split(/(\s+)/)
    .map((word) => {
      if (/^\s+$/.test(word)) return word;
      const bare = word.replace(/[^A-Za-zÀ-ÿ]/g, "");
      if (KEEP_UPPER.has(bare)) {
        if (bare) first = false;
        return word;
      }
      const lower = word.toLocaleLowerCase("pt-BR");
      if (first && bare) {
        first = false;
        const i = lower.search(/[a-zà-ÿ]/);
        return i < 0 ? lower : lower.slice(0, i) + lower.charAt(i).toLocaleUpperCase("pt-BR") + lower.slice(i + 1);
      }
      return lower;
    })
    .join("");
}

function blankSize(text: string): "sm" | "md" | "lg" {
  const n = text.length;
  if (n <= 10) return "sm";
  if (n <= 20) return "md";
  return "lg";
}

function lineLabel(line: string, firstTokenIndex: number): string {
  return line
    .slice(0, firstTokenIndex)
    .replace(/^\s*[-•|]\s*/, "")
    .replace(/[\s:—–|-]+$/, "")
    .trim();
}

/** Monta o formulário: só as linhas que têm algo a marcar/preencher, agrupadas pela seção do modelo. */
export function parseFillFields(corpo: string): FillSection[] {
  const sections: FillSection[] = [];
  let current: FillSection | null = null;
  let nextId = 0;
  let previous: string | null = null;

  const lines = corpo.split("\n");
  lines.forEach((line, lineIndex) => {
    const tokens = scanLine(line, nextId);
    nextId += tokens.length;
    const trimmed = line.trim();

    if (tokens.length === 0) {
      if (isHeading(trimmed)) {
        current = { title: trimmed, lines: [] };
        sections.push(current);
        previous = null;
      } else if (trimmed) {
        previous = trimmed;
      }
      return;
    }

    const usable = tokens.filter((t) => !t.skip);
    if (usable.length === 0) {
      previous = null;
      return;
    }

    const segments: FillSegment[] = [];
    let cursor = 0;
    let lastCheck: { id: number; end: number } | null = null;
    for (const token of tokens) {
      // Assinatura/linha longa: não vira campo — o cursor fica onde está e
      // os pontos entram no texto em volta.
      if (token.skip) continue;
      const textBefore = line.slice(cursor, token.index);
      if (textBefore) segments.push({ kind: "text", text: textBefore });
      if (token.kind === "check") {
        segments.push({ kind: "check", id: token.id });
        lastCheck = { id: token.id, end: token.index + token.text.length };
      } else {
        // "( ) Outros: ......" — o campo pertence à opção quando o texto entre
        // os dois termina em ":" e não abre um rótulo novo ("— Consistência:").
        const between = lastCheck ? line.slice(lastCheck.end, token.index).trim() : "";
        const attachTo =
          lastCheck && between.endsWith(":") && !/—\s+[A-ZÀ-Ú]/.test(between) ? lastCheck.id : undefined;
        segments.push({
          kind: "blank",
          id: token.id,
          format: token.format,
          size: blankSize(token.text),
          ...(attachTo !== undefined ? { attachTo } : {}),
        });
      }
      cursor = token.index + token.text.length;
    }
    const rest = line.slice(cursor);
    if (rest.trim()) segments.push({ kind: "text", text: rest });

    // Linha que continua a frase de cima (começa em minúscula ou em "R$") ou
    // vem logo depois de uma introdução terminada em ":" leva essa linha como contexto.
    const context =
      previous && (/^([a-zà-ÿ]|R\$)/.test(trimmed) || previous.endsWith(":")) ? previous : undefined;

    if (!current) {
      current = { title: "", lines: [] };
      sections.push(current);
    }
    current.lines.push({
      key: `l${lineIndex}`,
      segments,
      label: lineLabel(line, usable[0].index),
      ...(context ? { context } : {}),
      tableRow: /^\s*\|.*\|\s*$/.test(line),
    });
    previous = null;
  });

  return sections.filter((s) => s.lines.length > 0);
}

export function countFillFields(sections: FillSection[]): number {
  let n = 0;
  for (const s of sections) for (const l of s.lines) for (const seg of l.segments) if (seg.kind !== "text") n++;
  return n;
}

export function countAnswered(answers: FillAnswers): number {
  return Object.values(answers).filter((v) => v === true || (typeof v === "string" && v.trim() !== "")).length;
}

function formatDate(value: string): string {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}

function formatTime(value: string): string {
  const m = value.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}h${m[2]}` : value;
}

/**
 * Devolve o corpo com as respostas: opção marcada vira "(X)"; campo
 * preenchido troca os pontos pelo texto (data em dd/mm/aaaa, hora em 14h30).
 * O que ficar sem resposta continua como estava — "( )" e pontilhado para
 * completar à caneta no papel.
 */
export function applyFillAnswers(corpo: string, answers: FillAnswers): string {
  let id = 0;
  return corpo.replace(tokenRegex(), (match: string, date?: string, time?: string, _dm?: string, check?: string) => {
    const answer = answers[id++];
    if (check !== undefined) return answer === true ? "(X)" : match;
    if (typeof answer !== "string") return match;
    const value = answer.replace(/\s*\n\s*/g, " ").trim();
    if (!value) return match;
    if (date) return formatDate(value);
    if (time) return formatTime(value);
    return value;
  });
}
