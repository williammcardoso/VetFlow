import type { FinancialTransaction } from "@/mockData/financial";
import type { SaleItem } from "@/lib/saleItemsApi";

export const CLOSING_PARTNERS = {
  clinic: "Clínica",
  agro: "Agropecuária",
} as const;

export interface MonthlyClosingBreakdown {
  year: number;
  month: number; // 1-12
  label: string;
  salesCount: number;
  /** Faturamento bruto das vendas (não canceladas) */
  bruto: number;
  /** Custo de produtos vendidos + insumos (BOM) */
  custoProdutos: number;
  /** Repasses a labs/especialistas */
  custoRepasses: number;
  /** Taxas de operadora (cartão) */
  taxasCartao: number;
  /** bruto - produtos - repasses - taxas */
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

function lineProductCost(item: SaleItem): number {
  if (item.productCost != null) return item.productCost * item.quantity;
  // Legacy: sem split — se tem prestador, não conta como produto
  if (item.costProvider) return 0;
  return (item.cost || 0) * item.quantity;
}

function lineProviderCost(item: SaleItem): number {
  if (item.providerCost != null) return item.providerCost * item.quantity;
  if (item.costProvider) return (item.cost || 0) * item.quantity;
  return 0;
}

/**
 * Fechamento 50/50:
 * Lucro líquido = bruto − custo produtos/insumos − repasses − taxas
 * (saídas operacionais NÃO entram)
 */
export function computeMonthlyClosing(params: {
  year: number;
  month: number;
  sales: FinancialTransaction[];
  saleItems: SaleItem[];
}): MonthlyClosingBreakdown {
  const { year, month, sales, saleItems } = params;
  const activeSales = sales.filter((s) => (s.status || "pending") !== "cancelled");
  const saleIds = new Set(activeSales.map((s) => s.id));
  const items = saleItems.filter((i) => saleIds.has(i.saleId));

  const bruto = activeSales.reduce((s, t) => s + t.amount, 0);
  const custoProdutos = items.reduce((s, i) => s + lineProductCost(i), 0);
  const custoRepasses = items.reduce((s, i) => s + lineProviderCost(i), 0);
  const taxasCartao = activeSales.reduce((s, t) => s + (t.financialFee ?? 0), 0);

  // Fallback: vendas antigas sem itens — usa supplierCost agregado
  const itemsCostTotal = custoProdutos + custoRepasses;
  const legacySupplier = activeSales.reduce((s, t) => s + (t.supplierCost ?? 0), 0);
  const useLegacy = items.length === 0 && legacySupplier > 0;
  const finalProdutos = useLegacy ? 0 : custoProdutos;
  const finalRepasses = useLegacy ? legacySupplier : custoRepasses;

  const lucroLiquido = bruto - finalProdutos - finalRepasses - taxasCartao;
  const metade = lucroLiquido / 2;

  return {
    year,
    month,
    label: monthLabel(year, month),
    salesCount: activeSales.length,
    bruto,
    custoProdutos: finalProdutos,
    custoRepasses: finalRepasses,
    taxasCartao,
    lucroLiquido,
    metadeClinica: metade,
    metadeAgro: metade,
    margemPct: bruto > 0 ? Math.round((lucroLiquido / bruto) * 100) : 0,
  };
}
