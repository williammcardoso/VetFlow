import type { SaleItem } from "@/lib/saleItemsApi";

// Vendas item a item (Financeiro › Vendas item a item): a lista corrida do
// período no mesmo modelo do relatório da Agrocentro — código, descrição,
// data, quantidade, unitário e total, em ordem de data — para conferir uma
// com a outra no fim do mês. Puro: a página busca vendas, itens e cadastro.

/** Categoria das linhas de desconto/acréscimo/taxa da venda (não é item). */
export const ADJUSTMENT_CATEGORY = "ajuste";

export interface ItemReportSale {
  id: string;
  date: string;
  time?: string;
  /** Valor final da venda (já com desconto, acréscimo e taxa repassada). */
  amount: number;
  description?: string;
  discountAmount?: number;
  surchargeAmount?: number;
  financialFee?: number;
}

export interface ItemReportLine {
  key: string;
  saleId: string;
  date: string;
  time?: string;
  /** Código do cadastro (o mesmo da Agrocentro, quando preenchido). */
  code?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  /** Categoria do cadastro (servico, vacina, produto...) ou "ajuste". */
  category: string;
  clientName?: string;
  animalName?: string;
}

const cents = (v: number) => Math.round(v * 100);
const fromCents = (c: number) => c / 100;

/**
 * Uma linha por item vendido (vendas canceladas já devem vir fora). Desconto,
 * acréscimo e taxa repassada viram linhas próprias, na data da venda: o total
 * do relatório fecha com o faturado. Venda antiga sem itens entra com a
 * descrição dela.
 */
export function buildItemReportLines(params: {
  sales: ItemReportSale[];
  items: SaleItem[];
  codeOf?: (item: SaleItem) => string | undefined;
  categoryOf?: (item: SaleItem) => string | undefined;
  peopleOf?: (saleId: string) => { clientName?: string; animalName?: string };
}): ItemReportLine[] {
  const { sales, items, codeOf, categoryOf, peopleOf } = params;
  const itemsBySale = new Map<string, SaleItem[]>();
  for (const item of items) {
    const list = itemsBySale.get(item.saleId) ?? [];
    list.push(item);
    itemsBySale.set(item.saleId, list);
  }
  const lines: ItemReportLine[] = [];
  const ordered = [...sales].sort((a, b) => `${a.date}T${a.time || "00:00"}`.localeCompare(`${b.date}T${b.time || "00:00"}`));
  for (const sale of ordered) {
    const people = peopleOf?.(sale.id) ?? {};
    const base = { saleId: sale.id, date: sale.date, time: sale.time, ...people };
    const saleItems = itemsBySale.get(sale.id) ?? [];
    if (saleItems.length === 0) {
      lines.push({
        ...base,
        key: `sale:${sale.id}`,
        description: sale.description?.trim() || "Venda sem itens discriminados",
        quantity: 1,
        unitPrice: sale.amount,
        total: sale.amount,
        category: "sem_itens",
      });
      continue;
    }
    let itemsCents = 0;
    for (const item of saleItems) {
      itemsCents += cents(item.subtotal);
      lines.push({
        ...base,
        key: item.id,
        code: codeOf?.(item)?.trim() || undefined,
        description: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.subtotal,
        category: categoryOf?.(item) || item.category || (item.type === "product" ? "produto" : "servico"),
      });
    }
    // Ajustes: os que a venda registra e, se ainda sobrar diferença (venda
    // antiga, valor editado), um "ajuste" com o resto.
    const adjust = (key: string, description: string, value: number) =>
      lines.push({ ...base, key: `${key}:${sale.id}`, description, quantity: 1, unitPrice: value, total: value, category: ADJUSTMENT_CATEGORY });
    let explained = itemsCents;
    if ((sale.discountAmount ?? 0) > 0) {
      adjust("desconto", "Desconto na venda", -sale.discountAmount!);
      explained -= cents(sale.discountAmount!);
    }
    if ((sale.surchargeAmount ?? 0) > 0) {
      adjust("acrescimo", "Acréscimo na venda", sale.surchargeAmount!);
      explained += cents(sale.surchargeAmount!);
    }
    if ((sale.financialFee ?? 0) > 0) {
      adjust("taxa", "Taxa do cartão repassada", sale.financialFee!);
      explained += cents(sale.financialFee!);
    }
    const rest = cents(sale.amount) - explained;
    if (rest !== 0) adjust("ajuste", rest < 0 ? "Diferença na venda (desconto)" : "Diferença na venda (acréscimo)", fromCents(rest));
  }
  return lines;
}

export function sumLines<T extends { quantity: number; total: number; category?: string }>(lines: T[]): { quantity: number; total: number } {
  let q = 0;
  let t = 0;
  for (const l of lines) {
    // Linha de ajuste não é item: não soma na quantidade.
    if (l.category !== ADJUSTMENT_CATEGORY) q += l.quantity;
    t += cents(l.total);
  }
  return { quantity: Math.round(q * 1000) / 1000, total: fromCents(t) };
}

/** Total por dia, em ordem de data. */
export function totalsByDay<T extends { date: string; quantity: number; total: number; category?: string }>(lines: T[]): Array<{ date: string; quantity: number; total: number }> {
  const map = new Map<string, T[]>();
  for (const l of lines) map.set(l.date, [...(map.get(l.date) ?? []), l]);
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({ date, ...sumLines(list) }));
}

// ------------------------------------------------------------- Agrocentro

export interface AgroLine {
  code: string;
  description: string;
  /** yyyy-mm-dd */
  date: string;
  quantity: number;
  /** Coluna do meio do relatório (custo cadastrado lá). */
  cost: number;
  total: number;
}

export interface AgroReport {
  lines: AgroLine[];
  /** Linhas "Total" impressas no relatório (categoria e geral). */
  printedTotals: Array<{ quantity: number; cost: number; total: number }>;
}

const num = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));

/**
 * Lê o texto do relatório da Agrocentro (copiado do PDF/visualizador):
 * "8931  CONSULTA  05/10/2026  1  VENDAS  1  S  120,00  120,00".
 * Devolução sai com valor negativo. Linhas que não são de item são ignoradas.
 */
export function parseAgrocentroReport(text: string): AgroReport {
  const lines: AgroLine[] = [];
  const printedTotals: AgroReport["printedTotals"] = [];
  const money = "-?[\\d.]+,\\d{2}";
  const lineRe = new RegExp(`^(\\d+)\\s+(.+?)\\s*(\\d{2})\\/(\\d{2})\\/(\\d{4})\\s+\\d+\\s+(\\S+)\\s+(-?[\\d.,]+)\\s+\\S+\\s+(${money})\\s+(${money})$`);
  const totalRe = new RegExp(`^Total\\s+([\\d.,]+)\\s+(${money})\\s+(${money})$`, "i");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\u00a0/g, " ").trim();
    const m = lineRe.exec(line);
    if (m) {
      const sign = /dev/i.test(m[6]) ? -1 : 1;
      lines.push({
        code: m[1],
        description: m[2].trim(),
        date: `${m[5]}-${m[4]}-${m[3]}`,
        quantity: sign * num(m[7]),
        cost: sign * num(m[8]),
        total: sign * num(m[9]),
      });
      continue;
    }
    const t = totalRe.exec(line);
    if (t) printedTotals.push({ quantity: num(t[1]), cost: num(t[2]), total: num(t[3]) });
  }
  return { lines, printedTotals };
}

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const STOPWORDS = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "com", "ate", "para", "sem"]);
// Palavra pelas 5 primeiras letras: a Agrocentro corta a descrição em ~25
// letras ("COM ANTIB") e escreve diferente ("DOMICILIAR" × "domicílio").
const tokens = (s: string) => new Set(normalize(s).split(" ").filter((t) => t && !STOPWORDS.has(t)).map((t) => t.slice(0, 5)));

/** 0–1: quanto dois nomes do mesmo serviço nos dois sistemas se parecem. */
export function nameScore(a: string, b: string): number {
  const x = tokens(a);
  const y = tokens(b);
  if (x.size === 0 || y.size === 0) return 0;
  let shared = 0;
  for (const t of x) if (y.has(t)) shared++;
  return shared / (x.size + y.size - shared);
}

/** Lançamento que está num dia no VetFlow e em outro na Agrocentro (não muda o total do mês). */
export interface ShiftedEntry {
  description: string;
  total: number;
  vetflowDate: string;
  agroDate: string;
  vetflowKeys: string[];
}

/** Diferença de verdade num dia: um item que falta ou com valor diferente. */
export interface DayIssue {
  date: string;
  description: string;
  vetflow: number;
  agro: number;
  vetflowQty: number;
  agroQty: number;
  /** VetFlow − Agrocentro. */
  diff: number;
  vetflowLines: ItemReportLine[];
  agroLines: AgroLine[];
}

export interface DayComparison {
  date: string;
  vetflow: number;
  agro: number;
  /** VetFlow − Agrocentro. */
  diff: number;
  /** ok = fecha; shifted = só lançamento em outro dia; wrong = tem diferença de verdade. */
  status: "ok" | "shifted" | "wrong";
  shifts: ShiftedEntry[];
  issues: DayIssue[];
}

export interface AgroComparison {
  days: DayComparison[];
  shifts: ShiftedEntry[];
  issues: DayIssue[];
  vetflowTotal: number;
  agroTotal: number;
  diff: number;
}

/** Até quantos dias de distância um lançamento ainda conta como "lançado em outro dia". */
const SHIFT_WINDOW_DAYS = 10;
const dayDistance = (a: string, b: string) => Math.abs(Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86_400_000;

type Side<T> = { line: T; key: string; date: string; c: number };

/**
 * Compara com o relatório da Agrocentro. Cada item do VetFlow é ligado a um
 * código deles (o do cadastro ou o do nome mais parecido) e o casamento é,
 * nesta ordem: mesmo dia e mesmo valor; mesmo dia e mesma soma do item
 * (2× 15,00 de um lado, 1× 30,00 do outro); outro dia, até 10 dias, com o
 * mesmo item e valor (lançado em outro dia); mesmo dia e mesmo valor com
 * nomes diferentes. O que sobra é a diferença de verdade, agrupada por item.
 */
export function compareWithAgrocentro(vetflow: ItemReportLine[], agro: AgroLine[]): AgroComparison {
  // Nome de cada código deles (o primeiro que aparece).
  const agroNames = new Map<string, string>();
  for (const l of agro) if (!agroNames.has(l.code)) agroNames.set(l.code, l.description);
  const keyOfVetflow = (l: ItemReportLine): string => {
    if (l.code) return l.code;
    let best = "";
    let bestScore = 0.5 - 1e-9;
    for (const [code, name] of agroNames) {
      const score = nameScore(l.description, name);
      if (score > bestScore) {
        best = code;
        bestScore = score;
      }
    }
    return best || `vf:${normalize(l.description)}`;
  };

  let restV: Side<ItemReportLine>[] = vetflow.map((line) => ({ line, key: keyOfVetflow(line), date: line.date, c: cents(line.total) }));
  let restA: Side<AgroLine>[] = agro.map((line) => ({ line, key: line.code, date: line.date, c: cents(line.total) }));
  const shifts: ShiftedEntry[] = [];

  const pairLines = (ok: (v: Side<ItemReportLine>, a: Side<AgroLine>) => boolean, pick: (v: Side<ItemReportLine>, options: Side<AgroLine>[]) => Side<AgroLine> | undefined, onPair?: (v: Side<ItemReportLine>, a: Side<AgroLine>) => void) => {
    const usedA = new Set<Side<AgroLine>>();
    const keepV: Side<ItemReportLine>[] = [];
    for (const v of restV) {
      const match = pick(v, restA.filter((a) => !usedA.has(a) && a.c === v.c && ok(v, a)));
      if (match) {
        usedA.add(match);
        onPair?.(v, match);
      } else keepV.push(v);
    }
    restV = keepV;
    restA = restA.filter((a) => !usedA.has(a));
  };
  const first = <T,>(_v: unknown, options: T[]) => options[0];

  // 1. mesmo dia, mesmo item, mesmo valor
  pairLines((v, a) => v.date === a.date && v.key === a.key, first);

  // 2. mesmo dia, mesmo item, soma igual (quebrado diferente)
  const inGroup = <T,>(list: Side<T>[], date: string, key: string) => list.filter((x) => x.date === date && x.key === key);
  const pairGroups = (sameDay: boolean) => {
    const groupsV = new Map<string, Side<ItemReportLine>[]>();
    for (const v of restV) groupsV.set(`${v.date}|${v.key}`, [...(groupsV.get(`${v.date}|${v.key}`) ?? []), v]);
    for (const list of groupsV.values()) {
      const { date, key } = list[0];
      const sum = list.reduce((s, x) => s + x.c, 0);
      const candidates = sameDay
        ? [date]
        : Array.from(new Set(restA.filter((a) => a.key === key && a.date !== date && dayDistance(a.date, date) <= SHIFT_WINDOW_DAYS).map((a) => a.date))).sort(
            (x, y) => dayDistance(x, date) - dayDistance(y, date) || x.localeCompare(y)
          );
      for (const d of candidates) {
        const groupA = inGroup(restA, d, key);
        if (groupA.length === 0 || groupA.reduce((s, x) => s + x.c, 0) !== sum) continue;
        if (!sameDay) {
          shifts.push({ description: list[0].line.description, total: fromCents(sum), vetflowDate: date, agroDate: d, vetflowKeys: list.map((x) => x.line.key) });
        }
        restV = restV.filter((x) => !list.includes(x));
        restA = restA.filter((x) => !groupA.includes(x));
        break;
      }
    }
  };
  pairGroups(true);

  // 3. outro dia (o mais perto), mesmo item e valor
  pairLines(
    (v, a) => v.key === a.key && v.date !== a.date && dayDistance(v.date, a.date) <= SHIFT_WINDOW_DAYS,
    (v, options) => [...options].sort((x, y) => dayDistance(x.date, v.date) - dayDistance(y.date, v.date))[0],
    (v, a) => shifts.push({ description: v.line.description, total: v.line.total, vetflowDate: v.date, agroDate: a.date, vetflowKeys: [v.line.key] })
  );
  pairGroups(false);

  // 4. mesmo dia e valor, nomes diferentes nos dois sistemas
  pairLines((v, a) => v.date === a.date, first);

  // Por dia: o que não se explica por lançamento em outro dia.
  const dates = Array.from(new Set([...vetflow.map((l) => l.date), ...agro.map((l) => l.date)])).sort();
  const issues: DayIssue[] = [];
  const days: DayComparison[] = dates.map((date) => {
    const vCents = vetflow.filter((l) => l.date === date).reduce((s, l) => s + cents(l.total), 0);
    const aCents = agro.filter((l) => l.date === date).reduce((s, l) => s + cents(l.total), 0);
    const dayShifts = shifts.filter((x) => x.vetflowDate === date || x.agroDate === date);
    const leftV = restV.filter((x) => x.date === date);
    const leftA = restA.filter((x) => x.date === date);
    const residual = leftV.reduce((s, x) => s + x.c, 0) - leftA.reduce((s, x) => s + x.c, 0);
    const dayIssues: DayIssue[] = [];
    // Sobra que se anula no dia = lançamento quebrado/nomeado diferente, não diferença.
    if (residual !== 0) {
      const keys = Array.from(new Set([...leftV.map((x) => x.key), ...leftA.map((x) => x.key)]));
      for (const key of keys) {
        const v = leftV.filter((x) => x.key === key);
        const a = leftA.filter((x) => x.key === key);
        const vc = v.reduce((s, x) => s + x.c, 0);
        const ac = a.reduce((s, x) => s + x.c, 0);
        if (vc === ac) continue;
        dayIssues.push({
          date,
          description: v[0]?.line.description ?? a[0].line.description,
          vetflow: fromCents(vc),
          agro: fromCents(ac),
          vetflowQty: v.reduce((s, x) => s + x.line.quantity, 0),
          agroQty: a.reduce((s, x) => s + x.line.quantity, 0),
          diff: fromCents(vc - ac),
          vetflowLines: v.map((x) => x.line),
          agroLines: a.map((x) => x.line),
        });
      }
    }
    issues.push(...dayIssues);
    const diff = vCents - aCents;
    return {
      date,
      vetflow: fromCents(vCents),
      agro: fromCents(aCents),
      diff: fromCents(diff),
      status: dayIssues.length > 0 ? "wrong" : diff !== 0 ? "shifted" : "ok",
      shifts: dayShifts,
      issues: dayIssues,
    };
  });
  const vetflowTotal = fromCents(vetflow.reduce((s, l) => s + cents(l.total), 0));
  const agroTotal = fromCents(agro.reduce((s, l) => s + cents(l.total), 0));
  return { days, shifts, issues, vetflowTotal, agroTotal, diff: fromCents(cents(vetflowTotal) - cents(agroTotal)) };
}
