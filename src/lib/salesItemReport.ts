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

/** Mesmo serviço com nomes diferentes nos dois sistemas ("Aplicação de medicação" × "APLICACAO DE MEDICACAO"). */
export function similarNames(a: string, b: string): boolean {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return false;
  // A Agrocentro corta a descrição em ~25 letras.
  if (x.startsWith(y) || y.startsWith(x)) return true;
  return x.split(" ")[0] === y.split(" ")[0];
}

export interface DayComparison {
  date: string;
  vetflow: number;
  agro: number;
  /** VetFlow − Agrocentro. */
  diff: number;
  /** Só nos dias que não batem: o que sobrou sem par de cada lado. */
  onlyVetflow: ItemReportLine[];
  onlyAgro: AgroLine[];
}

/**
 * Compara dia a dia. Dentro do dia, casa as linhas pelo valor (código igual
 * primeiro, depois nome parecido, depois só o valor); o que sobra sem par só
 * é apontado nos dias em que o total não bate — num dia que fecha, a sobra é
 * só lançamento quebrado diferente (2× 15,00 de um lado, 1× 30,00 do outro).
 */
export function compareWithAgrocentro(vetflow: ItemReportLine[], agro: AgroLine[]): {
  days: DayComparison[];
  vetflowTotal: number;
  agroTotal: number;
  diff: number;
} {
  const dates = Array.from(new Set([...vetflow.map((l) => l.date), ...agro.map((l) => l.date)])).sort();
  const days: DayComparison[] = dates.map((date) => {
    const v = vetflow.filter((l) => l.date === date);
    const a = agro.filter((l) => l.date === date);
    const vCents = v.reduce((s, l) => s + cents(l.total), 0);
    const aCents = a.reduce((s, l) => s + cents(l.total), 0);
    const diffCents = vCents - aCents;
    if (diffCents === 0) return { date, vetflow: fromCents(vCents), agro: fromCents(aCents), diff: 0, onlyVetflow: [], onlyAgro: [] };

    const restV = [...v];
    const restA = [...a];
    const pass = (same: (x: ItemReportLine, y: AgroLine) => boolean) => {
      for (let i = 0; i < restV.length; ) {
        const j = restA.findIndex((y) => cents(y.total) === cents(restV[i].total) && same(restV[i], y));
        if (j >= 0) {
          restV.splice(i, 1);
          restA.splice(j, 1);
        } else i++;
      }
    };
    pass((x, y) => !!x.code && x.code === y.code);
    pass((x, y) => similarNames(x.description, y.description));
    pass(() => true);
    return { date, vetflow: fromCents(vCents), agro: fromCents(aCents), diff: fromCents(diffCents), onlyVetflow: restV, onlyAgro: restA };
  });
  const vetflowTotal = fromCents(vetflow.reduce((s, l) => s + cents(l.total), 0));
  const agroTotal = fromCents(agro.reduce((s, l) => s + cents(l.total), 0));
  return { days, vetflowTotal, agroTotal, diff: fromCents(cents(vetflowTotal) - cents(agroTotal)) };
}
