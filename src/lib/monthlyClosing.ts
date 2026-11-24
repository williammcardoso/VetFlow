import type { FinancialTransaction } from "@/mockData/financial";
import type { SaleItem } from "@/lib/saleItemsApi";

export const CLOSING_PARTNERS = {
  clinic: "Clínica",
  agro: "Agropecuária",
} as const;

/**
 * Despesa que entra no 50/50 sem ser cobrada do cliente (aluguel de centro
 * cirúrgico, insulfilm da sala...): um repasse a fornecedor tirado do que
 * entrou. Fica em financial_transactions como despesa desta categoria, com o
 * fornecedor (para quem repassar) em `responsible`; o PIX dele fica salvo no
 * mesmo cadastro dos prestadores (lib/providerNotes).
 */
export const SHARED_EXPENSE_CATEGORY = "Despesa 50/50";

export const isSharedExpense = (t: Pick<FinancialTransaction, "type" | "category">) =>
  t.type === "expense" && t.category === SHARED_EXPENSE_CATEGORY;

// Primeira versão (2026-11-24, poucas horas no ar) gravava quem pagou como
// "clinic"/"agro" — mostra o nome da parte.
const LEGACY_PAYERS: Record<string, string> = { clinic: CLOSING_PARTNERS.clinic, agro: CLOSING_PARTNERS.agro };

/** Para quem repassar a despesa. */
export const expenseProvider = (t: Pick<FinancialTransaction, "responsible">): string => {
  const name = (t.responsible || "").trim();
  return LEGACY_PAYERS[name] ?? (name || "Fornecedor não informado");
};

export interface MonthlyClosingBreakdown {
  year: number;
  month: number; // 1-12
  label: string;
  salesCount: number;
  /** Faturamento bruto das vendas (não canceladas) — só informativo. */
  bruto: number;
  /**
   * Dinheiro que entrou no mês (recebimentos, com estornos descontando) — é
   * a base do lucro: não se divide o que ainda não foi recebido. Inclui o que
   * entrou de vendas de meses anteriores.
   */
  recebido: number;
  /** Quanto das vendas do mês ainda falta receber (informativo). */
  aReceberDoMes: number;
  /** Custo de produto embutido em venda antiga (composição/BOM, descontinuado em 2026-08-07) */
  custoProdutos: number;
  /** Lista de Compras do mês — insumos retirados do almoxarifado (Agropecuária) */
  custoCompras: number;
  /** Repasses a labs/especialistas */
  custoRepasses: number;
  /** Taxas de operadora (cartão) */
  taxasCartao: number;
  /** Despesas do mês (Financeiro → Despesas): repasses a fornecedor sem cobrar do cliente. */
  custoDespesas: number;
  /** recebido - produtos - compras - repasses - despesas - taxas */
  lucroLiquido: number;
  metadeClinica: number;
  metadeAgro: number;
  margemPct: number;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} / ${year}`;
}

export function getMonthBounds(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

/** Custo de produto embutido no item (vendas antigas, antes do almoxarifado). */
export function lineProductCost(item: SaleItem): number {
  if (item.productCost != null) return item.productCost * item.quantity;
  // Legacy: sem split — se tem prestador, não conta como produto
  if (item.costProvider) return 0;
  return (item.cost || 0) * item.quantity;
}

/** Repasse a prestador (lab, especialista...) do item. */
export function lineProviderCost(item: SaleItem): number {
  if (item.providerCost != null) return item.providerCost * item.quantity;
  if (item.costProvider) return (item.cost || 0) * item.quantity;
  return 0;
}

/**
 * Fechamento 50/50:
 * Lucro líquido = RECEBIDO no mês − custo produtos (legado) − compras do almoxarifado − repasses − despesas − taxas
 * (saídas operacionais de outras categorias NÃO entram)
 *
 * Despesas (desde 2026-11-24): gasto que não foi cobrado do cliente (aluguel
 * de centro cirúrgico, material da sala), repassado ao fornecedor como um
 * repasse de lab. Sai do lucro antes da divisão — cada parte arca com metade.
 *
 * Desde 2026-10-13 a base é o que entrou no caixa, não o faturado: venda
 * paga aos poucos só é dividida conforme o dinheiro entra (cada parcela
 * recebida soma no mês em que entrou). Os custos (repasses do lab, compras)
 * continuam no mês da venda/compra — a conta do lab chega de qualquer jeito.
 * O faturado segue aparecendo, só como informação. Sem `receipts`, usa o
 * faturado como recebido (comportamento antigo).
 *
 * Modelo mudou em 2026-08-07: a Agropecuária passou a funcionar como
 * almoxarifado — o clínico não desconta mais insumo por venda (composição/
 * BOM removida). O custo de insumos agora entra agregado do mês via "Lista
 * de Compras" (Estoque → Compras, categoria financeira "Estoque").
 * `custoProdutos` fica só para não perder o histórico de meses anteriores à
 * mudança, onde a venda ainda carregava custo de insumo embutido.
 */
export function computeMonthlyClosing(params: {
  year: number;
  month: number;
  sales: FinancialTransaction[];
  saleItems: SaleItem[];
  purchases: FinancialTransaction[];
  /** Recebimentos do mês (categoria "Recebimento"; estornos negativos). */
  receipts?: FinancialTransaction[];
  /** Despesas do mês que entram no 50/50 (categoria SHARED_EXPENSE_CATEGORY). */
  expenses?: FinancialTransaction[];
}): MonthlyClosingBreakdown {
  const { year, month, sales, saleItems, purchases, receipts, expenses = [] } = params;
  const activeSales = sales.filter((s) => (s.status || "pending") !== "cancelled");
  const saleIds = new Set(activeSales.map((s) => s.id));
  const items = saleItems.filter((i) => saleIds.has(i.saleId));

  const bruto = activeSales.reduce((s, t) => s + t.amount, 0);
  const custoProdutosItens = items.reduce((s, i) => s + lineProductCost(i), 0);
  const custoRepasses = items.reduce((s, i) => s + lineProviderCost(i), 0);
  const taxasCartao = activeSales.reduce((s, t) => s + (t.financialFee ?? 0), 0);
  const custoCompras = purchases.reduce((s, t) => s + t.amount, 0);
  const custoDespesas = Math.round(expenses.reduce((s, t) => s + t.amount, 0) * 100) / 100;

  // Fallback: vendas antigas sem itens — usa supplierCost agregado
  const legacySupplier = activeSales.reduce((s, t) => s + (t.supplierCost ?? 0), 0);
  const useLegacy = items.length === 0 && legacySupplier > 0;
  const finalProdutos = useLegacy ? 0 : custoProdutosItens;
  const finalRepasses = useLegacy ? legacySupplier : custoRepasses;

  const recebido = receipts ? receipts.reduce((s, t) => s + t.amount, 0) : bruto;
  const aReceberDoMes = activeSales.reduce((s, t) => s + Math.max(0, t.amount - (t.paidAmount ?? (receipts ? 0 : t.amount))), 0);

  const lucroLiquido = recebido - finalProdutos - custoCompras - finalRepasses - custoDespesas - taxasCartao;
  const metade = lucroLiquido / 2;

  return {
    year,
    month,
    label: monthLabel(year, month),
    salesCount: activeSales.length,
    bruto,
    recebido,
    aReceberDoMes: Math.round(aReceberDoMes * 100) / 100,
    custoProdutos: finalProdutos,
    custoCompras,
    custoRepasses: finalRepasses,
    taxasCartao,
    custoDespesas,
    lucroLiquido,
    metadeClinica: metade,
    metadeAgro: metade,
    margemPct: recebido > 0 ? Math.round((lucroLiquido / recebido) * 100) : 0,
  };
}

/**
 * Conferência com o Orion (sistema da Agrocentro, onde o cliente paga): o
 * "Total Venda" do relatório completo deles tem que dar as vendas do mês no
 * VetFlow mais os acréscimos lançados à parte (ex.: aplicações a domicílio,
 * que no Orion entram como venda). `diff` = VetFlow − Orion (null sem o
 * total do Orion).
 */
export function reconcileWithOrion(vendas: number, acrescimos: number, orionTotal: number | null): { vetflow: number; diff: number | null } {
  const vetflow = Math.round((vendas + acrescimos) * 100) / 100;
  return { vetflow, diff: orionTotal == null ? null : Math.round((vetflow - orionTotal) * 100) / 100 };
}
