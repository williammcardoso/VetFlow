import type { FinancialTransaction } from "@/mockData/financial";
import type { CatalogItem } from "@/mockData/catalog";
import type { SaleItem } from "@/lib/saleItemsApi";
import { computeMonthlyClosing, type MonthlyClosingBreakdown } from "@/lib/monthlyClosing";
import { saleBalance } from "@/lib/salePayment";

// Números do período num lugar só — Visão geral, Relatório financeiro e
// Relatório de vendas liam as mesmas transações com regras diferentes (ex.:
// o relatório somava venda + recebimento como "entrada", contando o mesmo
// dinheiro duas vezes, e o ticket médio dividia pelo número de dias).

export const isSale = (t: FinancialTransaction) => t.type === "income" && t.category === "Venda de Produtos";
export const isReceipt = (t: FinancialTransaction) => t.type === "income" && t.category === "Recebimento";
export const isCancelled = (t: FinancialTransaction) => (t.status || "pending") === "cancelled";

const inRange = (date: string, from?: string, to?: string) => (!from || date >= from) && (!to || date <= to);

export interface PeriodFinancials {
  /** Vendas do período, sem as canceladas. */
  sales: FinancialTransaction[];
  cancelledSales: FinancialTransaction[];
  /** Recebimentos do período (estornos entram negativos). */
  receipts: FinancialTransaction[];
  /** Compras do almoxarifado (despesa "Estoque") — entram no lucro. */
  purchases: FinancialTransaction[];
  /** Demais despesas — mostradas à parte, fora do 50/50. */
  otherExpenses: FinancialTransaction[];
  faturado: number;
  recebido: number;
  ticketMedio: number;
  /** Mesma conta do Fechamento 50/50 (bruto − produtos − compras − repasses − taxas). */
  closing: MonthlyClosingBreakdown;
  /** Em aberto em TODAS as datas — conta a receber não some atrás do filtro de período. */
  openSales: FinancialTransaction[];
  openTotal: number;
}

export function computePeriodFinancials(
  transactions: FinancialTransaction[],
  saleItems: SaleItem[],
  from?: string,
  to?: string
): PeriodFinancials {
  const inPeriod = transactions.filter((t) => inRange(t.date, from, to));
  const periodSales = inPeriod.filter(isSale);
  const sales = periodSales.filter((t) => !isCancelled(t));
  const cancelledSales = periodSales.filter(isCancelled);
  const receipts = inPeriod.filter(isReceipt);
  const purchases = inPeriod.filter((t) => t.type === "expense" && t.category === "Estoque");
  const otherExpenses = inPeriod.filter((t) => t.type === "expense" && t.category !== "Estoque");
  const faturado = sales.reduce((s, t) => s + t.amount, 0);
  const recebido = receipts.reduce((s, t) => s + t.amount, 0);

  const ref = from ? new Date(`${from}T00:00:00`) : new Date();
  const closing = computeMonthlyClosing({
    year: ref.getFullYear(),
    month: ref.getMonth() + 1,
    sales,
    saleItems,
    purchases,
  });

  const openSales = transactions.filter((t) => isSale(t) && saleBalance(t) > 0);
  return {
    sales,
    cancelledSales,
    receipts,
    purchases,
    otherExpenses,
    faturado,
    recebido,
    ticketMedio: sales.length > 0 ? faturado / sales.length : 0,
    closing,
    openSales,
    openTotal: openSales.reduce((s, t) => s + saleBalance(t), 0),
  };
}

/** Categoria do item vendido; vendas antigas sem categoria gravada usam a do catálogo. */
export function saleItemCategory(item: SaleItem, catalogById: Map<string, CatalogItem>): string | undefined {
  return item.category || (item.catalogItemId ? catalogById.get(item.catalogItemId)?.category : undefined) || undefined;
}

export interface CategoryTotal {
  category: string | undefined;
  value: number;
  quantity: number;
}

/** Faturamento por categoria do catálogo (a partir dos itens vendidos). */
export function revenueByCategory(saleItems: SaleItem[], catalogById: Map<string, CatalogItem>): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  for (const item of saleItems) {
    const category = saleItemCategory(item, catalogById);
    const key = category ?? "";
    const row = map.get(key) ?? { category, value: 0, quantity: 0 };
    row.value += item.subtotal;
    row.quantity += item.quantity;
    map.set(key, row);
  }
  return Array.from(map.values()).sort((a, b) => b.value - a.value);
}

export interface ItemTotal {
  key: string;
  name: string;
  value: number;
  quantity: number;
}

/** Itens mais vendidos (por valor), juntando pelo item do catálogo ou pelo nome. */
export function topSoldItems(saleItems: SaleItem[], limit = 10): ItemTotal[] {
  const map = new Map<string, ItemTotal>();
  for (const item of saleItems) {
    const key = item.catalogItemId || `name:${item.name.toLowerCase()}`;
    const row = map.get(key) ?? { key, name: item.name, value: 0, quantity: 0 };
    row.value += item.subtotal;
    row.quantity += item.quantity;
    map.set(key, row);
  }
  return Array.from(map.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/** Soma por dia ("AAAA-MM-DD" → valor) para o gráfico diário. */
export function sumByDay(list: FinancialTransaction[], key: string, into: Record<string, Record<string, number>> = {}) {
  for (const t of list) {
    const row = into[t.date] || (into[t.date] = {});
    row[key] = (row[key] ?? 0) + t.amount;
  }
  return into;
}
