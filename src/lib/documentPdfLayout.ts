// Analisa o texto já resolvido pelo motor de template (Etapa 3) e separa em
// segmentos com significado visual (título, seção numerada, bloco de
// identificação, assinatura, parágrafo comum...) para o PDF (Etapa 4)
// desenhar cada um com o estilo certo — negrito em título/seção/rótulos,
// parágrafos de prosa justificados, blocos de identificação e assinatura
// como cartões/colunas em vez de texto com espaços manuais (que só alinha
// em fonte monoespaçada — quebra em qualquer fonte proporcional, incluindo
// a usada no PDF).
//
// Função pura, com testes — mesmo critério da Etapa 3: essa peça não pode
// falhar silenciosamente (documento saindo com formatação quebrada e
// ninguém percebendo até imprimir).

export interface IdCardField {
  rotulo: string;
  valor: string;
}

export interface IdCard {
  titulo: string;
  campos: IdCardField[];
}

export interface SignatureEntry {
  nome: string;
  documento: string;
  papel: string;
}

export type DocumentPdfSegment =
  | { kind: "titulo"; texto: string }
  | { kind: "secao"; texto: string }
  | { kind: "subtitulo"; texto: string }
  | { kind: "identificacao"; paciente?: IdCard; responsavel?: IdCard }
  | { kind: "assinaturas"; entradas: SignatureEntry[] }
  | { kind: "paragrafo"; texto: string }
  | { kind: "linha"; texto: string }
  | { kind: "tabela"; cabecalhos: string[]; linhas: string[][] };

const ID_HEADERS = ["IDENTIFICAÇÃO DO PACIENTE", "IDENTIFICAÇÃO DO RESPONSÁVEL PELO ANIMAL"];

function isSectionHeading(line: string): boolean {
  return /^\d+\.\s+\S/.test(line) && line === line.toUpperCase();
}

function isAllCapsShort(line: string): boolean {
  const semDecoracao = line.replace(/^[─\-—\s]+|[─\-—\s]+$/g, "");
  if (semDecoracao.length === 0 || semDecoracao.length > 70) return false;
  return /^[A-ZÀ-Ú0-9]/.test(semDecoracao) && semDecoracao === semDecoracao.toUpperCase();
}

function isSignatureLine(line: string): boolean {
  return /^_{10,}$/.test(line);
}

function isFillInBlankField(line: string): boolean {
  return /^\S.{0,50}:\s*(\.{3,}|_{3,}|$)/.test(line);
}

function isCheckboxLine(line: string): boolean {
  return /^\(.?\)/.test(line);
}

// 3 modelos (A4/vacinação, C2/recusa de exames, D2/orçamento) têm tabela
// markdown de verdade no corpo — sem tratamento especial, cada linha "| a |
// b |" caía no parágrafo comum e virava uma sopa de texto quebrado (bug
// reportado pelo usuário: "| V10 | Ronvac | ... |" tudo emendado, sem
// alinhar coluna nenhuma — mesma raiz do bug de assinatura em duas colunas
// da Etapa 4: alinhamento por caractere não sobrevive à fonte proporcional).
function isTableRow(line: string): boolean {
  return /^\|.*\|$/.test(line);
}

function isTableSeparatorRow(line: string): boolean {
  return /^\|[\s:-]+\|([\s:-]+\|)*$/.test(line) && line.includes("-");
}

function parseTableRow(line: string): string[] {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((celula) => celula.trim().replace(/\*\*/g, ""));
}

// "Classificação ASA: ( ) I ( ) II..." ou "Fármacos previstos: TIVA + INALATÓRIA"
// — rótulo curto seguido de conteúdo de verdade (não pontos/traço de
// preenchimento, isso já é isFillInBlankField). Sem isso, essas linhas caíam
// no parágrafo e grudavam com a frase seguinte (ex.: "Fármacos previstos: X
// Estou ciente de que o protocolo..." tudo numa sentença só).
function isLabelValueLine(line: string): boolean {
  return /^[A-ZÀ-Ú][^:]{0,50}:\s+\S/.test(line);
}

// Item de lista com marcador ("- texto" ou "• texto") — sem isso, uma lista
// de itens em linhas separadas (ex.: item 3 do modelo C2, cada consequência
// da recusa numa linha própria terminando em ";") caía no parágrafo comum
// e virava uma sopa de texto justificado sem quebra nenhuma entre os itens
// (bug reportado pelo usuário: "falta enter depois de cada ;"). Um "-"
// isolado (travessão decorativo, ex.: "── TÍTULO ──") não bate aqui porque
// exige texto de verdade depois do marcador.
function isBulletLine(line: string): boolean {
  return /^[-•]\s+\S/.test(line);
}

function isSpecialLine(line: string): boolean {
  return (
    isSectionHeading(line) ||
    ID_HEADERS.includes(line) ||
    isSignatureLine(line) ||
    isFillInBlankField(line) ||
    isCheckboxLine(line) ||
    isLabelValueLine(line) ||
    isAllCapsShort(line) ||
    isBulletLine(line) ||
    /^-{2,}$/.test(line)
  );
}

function parseIdCard(titulo: string, linhas: string[], start: number): { card: IdCard; next: number } {
  const linhasCampo: string[] = [];
  let i = start;
  while (i < linhas.length && linhas[i].trim() !== "" && !ID_HEADERS.includes(linhas[i].trim()) && !isSectionHeading(linhas[i].trim())) {
    linhasCampo.push(linhas[i].trim());
    i++;
  }
  const campos = mergeContinuationLines(linhasCampo).flatMap(parseFieldLine);
  return { card: { titulo, campos }, next: i };
}

// Alguns blocos de identificação escritos à mão na biblioteca (ex.: A1)
// quebram a linha visualmente terminando com "—" antes de continuar na
// linha seguinte — sem juntar de volta, o último campo da linha sobra com
// um travessão solto no final.
function mergeContinuationLines(linhas: string[]): string[] {
  const mescladas: string[] = [];
  for (const linha of linhas) {
    const anterior = mescladas[mescladas.length - 1];
    if (anterior !== undefined && /—\s*$/.test(anterior)) {
      mescladas[mescladas.length - 1] = `${anterior} ${linha}`;
    } else {
      mescladas.push(linha);
    }
  }
  return mescladas;
}

// A maioria dos modelos usa o bloco reutilizável (um campo por linha), mas
// alguns têm o bloco de identificação escrito à mão na biblioteca, com
// vários campos numa linha só separados por "—" (ex.: A1). Tenta separar
// por "—" primeiro; se não houver, trata a linha inteira como um campo só.
function parseFieldLine(linha: string): IdCardField[] {
  const partes = linha
    .split(/\s+—\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return partes.map((parte) => {
    const m = parte.match(/^([^:]{1,40}):\s*(.*)$/);
    return m ? { rotulo: m[1], valor: m[2] } : { rotulo: "", valor: parte };
  });
}

function parseSignatureEntry(linhas: string[], start: number): { entry: SignatureEntry; next: number } {
  let i = start;
  const partes: string[] = [];
  while (i < linhas.length && linhas[i].trim() !== "" && partes.length < 3) {
    partes.push(linhas[i].trim());
    i++;
  }
  return {
    entry: { nome: partes[0] || "", documento: partes[1] || "", papel: partes[2] || "" },
    next: i,
  };
}

export function parseCorpoIntoSegments(texto: string): DocumentPdfSegment[] {
  const linhas = texto.split("\n");
  const segments: DocumentPdfSegment[] = [];
  let i = 0;

  while (i < linhas.length && linhas[i].trim() === "") i++;

  const tituloLinhas: string[] = [];
  while (i < linhas.length && linhas[i].trim() !== "" && isAllCapsShort(linhas[i].trim())) {
    tituloLinhas.push(linhas[i].trim());
    i++;
  }
  if (tituloLinhas.length > 0) {
    segments.push({ kind: "titulo", texto: tituloLinhas.join(" ") });
  }

  let paragraphBuffer: string[] = [];
  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      segments.push({ kind: "paragrafo", texto: paragraphBuffer.join(" ") });
      paragraphBuffer = [];
    }
  };

  while (i < linhas.length) {
    const rawLine = linhas[i];
    const line = rawLine.trim();

    if (line === "") {
      flushParagraph();
      i++;
      continue;
    }

    if (isTableRow(line) && i + 1 < linhas.length && isTableSeparatorRow(linhas[i + 1].trim())) {
      flushParagraph();
      const cabecalhos = parseTableRow(line);
      i += 2; // pula cabeçalho + linha separadora (|---|---|)
      const linhasTabela: string[][] = [];
      while (i < linhas.length && isTableRow(linhas[i].trim())) {
        linhasTabela.push(parseTableRow(linhas[i].trim()));
        i++;
      }
      segments.push({ kind: "tabela", cabecalhos, linhas: linhasTabela });
      continue;
    }

    if (ID_HEADERS.includes(line)) {
      flushParagraph();
      const isPaciente = line === ID_HEADERS[0];
      const primeira = parseIdCard(line, linhas, i + 1);
      let paciente: IdCard | undefined;
      let responsavel: IdCard | undefined;
      if (isPaciente) paciente = primeira.card;
      else responsavel = primeira.card;

      let j = primeira.next;
      while (j < linhas.length && linhas[j].trim() === "") j++;
      const proximaHeader = j < linhas.length ? linhas[j].trim() : "";
      if (isPaciente && proximaHeader === ID_HEADERS[1]) {
        const segunda = parseIdCard(proximaHeader, linhas, j + 1);
        responsavel = segunda.card;
        i = segunda.next;
      } else {
        i = primeira.next;
      }
      segments.push({ kind: "identificacao", paciente, responsavel });
      continue;
    }

    if (isSectionHeading(line)) {
      flushParagraph();
      segments.push({ kind: "secao", texto: line });
      i++;
      continue;
    }

    if (isSignatureLine(line)) {
      flushParagraph();
      const primeira = parseSignatureEntry(linhas, i + 1);
      let j = primeira.next;
      while (j < linhas.length && linhas[j].trim() === "") j++;
      if (j < linhas.length && isSignatureLine(linhas[j].trim())) {
        const segunda = parseSignatureEntry(linhas, j + 1);
        segments.push({ kind: "assinaturas", entradas: [primeira.entry, segunda.entry] });
        i = segunda.next;
      } else {
        segments.push({ kind: "assinaturas", entradas: [primeira.entry] });
        i = primeira.next;
      }
      continue;
    }

    if (isAllCapsShort(line) && !isFillInBlankField(line)) {
      flushParagraph();
      segments.push({ kind: "subtitulo", texto: line });
      i++;
      continue;
    }

    if (isSpecialLine(line)) {
      flushParagraph();
      segments.push({ kind: "linha", texto: line });
      i++;
      continue;
    }

    paragraphBuffer.push(line);
    i++;
  }
  flushParagraph();

  return segments;
}
