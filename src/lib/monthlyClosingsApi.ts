import { supabase } from "@/integrations/supabase/client";
import type { MonthlyClosingBreakdown } from "@/lib/monthlyClosing";

const TABLE = "monthly_closings";

export interface MonthlyClosingRecord extends MonthlyClosingBreakdown {
  closedBy?: string;
  closedAt: string;
  /**
   * false = fechado sem as colunas de despesa (antes da migration
   * 20261124120000): a tela completa despesas/reembolsos com os lançamentos
   * do mês, que ficam travados enquanto o mês está fechado.
   */
  hasExpenseColumns: boolean;
}

// Coluna que ainda não existe no banco (migration não aplicada).
const isMissingColumn = (error: { code?: string; message?: string } | null) =>
  !!error && (error.code === "PGRST204" || error.code === "42703" || /column/i.test(error.message || ""));

function rowToRecord(r: Record<string, unknown>): MonthlyClosingRecord {
  const year = Number(r.year);
  const month = Number(r.month);
  const custoProdutos = Number(r.custo_produtos) || 0;
  const custoCompras = Number(r.custo_compras) || 0;
  const custoRepasses = Number(r.custo_repasses) || 0;
  const taxasCartao = Number(r.taxas_cartao) || 0;
  const hasExpenseColumns = r.custo_despesas !== undefined;
  const custoDespesas = Number(r.custo_despesas) || 0;
  const lucroLiquido = Number(r.lucro_liquido) || 0;
  // Recebido não tem coluna própria: lucro + deduções dá a base que foi usada
  // (em meses fechados antes da mudança, é o próprio faturado).
  const recebido = Math.round((lucroLiquido + custoProdutos + custoCompras + custoRepasses + custoDespesas + taxasCartao) * 100) / 100;
  return {
    year,
    month,
    label: "",
    salesCount: Number(r.sales_count) || 0,
    bruto: Number(r.bruto) || 0,
    recebido,
    aReceberDoMes: 0,
    custoProdutos,
    custoCompras,
    custoRepasses,
    taxasCartao,
    custoDespesas,
    reembolsoClinica: Number(r.reembolso_clinica) || 0,
    reembolsoAgro: Number(r.reembolso_agro) || 0,
    lucroLiquido,
    metadeClinica: Number(r.metade_clinica) || 0,
    metadeAgro: Number(r.metade_agro) || 0,
    margemPct: recebido > 0 ? Math.round((lucroLiquido / recebido) * 100) : 0,
    closedBy: (r.closed_by as string) || undefined,
    closedAt: r.closed_at as string,
    hasExpenseColumns,
  };
}

export async function getMonthlyClosing(year: number, month: number): Promise<MonthlyClosingRecord | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();
  if (error) {
    console.error("[getMonthlyClosing] error", error);
    return null;
  }
  return data ? rowToRecord(data) : null;
}

export async function closeMonth(breakdown: MonthlyClosingBreakdown, closedBy?: string): Promise<boolean> {
  const base = {
    year: breakdown.year,
    month: breakdown.month,
    sales_count: breakdown.salesCount,
    bruto: breakdown.bruto,
    custo_produtos: breakdown.custoProdutos,
    custo_compras: breakdown.custoCompras,
    custo_repasses: breakdown.custoRepasses,
    taxas_cartao: breakdown.taxasCartao,
    lucro_liquido: breakdown.lucroLiquido,
    metade_clinica: breakdown.metadeClinica,
    metade_agro: breakdown.metadeAgro,
    closed_by: closedBy || null,
  };
  let { error } = await supabase.from(TABLE).insert({
    ...base,
    custo_despesas: breakdown.custoDespesas,
    reembolso_clinica: breakdown.reembolsoClinica,
    reembolso_agro: breakdown.reembolsoAgro,
  });
  // Sem a migration das despesas: grava o resto (o lucro já vem com elas descontadas).
  if (isMissingColumn(error)) ({ error } = await supabase.from(TABLE).insert(base));
  if (error) {
    console.error("[closeMonth] error", error);
    return false;
  }
  return true;
}

export async function reopenMonth(year: number, month: number): Promise<boolean> {
  const { error } = await supabase.from(TABLE).delete().eq("year", year).eq("month", month);
  if (error) {
    console.error("[reopenMonth] error", error);
    return false;
  }
  return true;
}
