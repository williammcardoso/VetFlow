import { supabase } from "@/integrations/supabase/client";
import type { MonthlyClosingBreakdown } from "@/lib/monthlyClosing";

const TABLE = "monthly_closings";

export interface MonthlyClosingRecord extends MonthlyClosingBreakdown {
  closedBy?: string;
  closedAt: string;
}

function rowToRecord(r: Record<string, unknown>): MonthlyClosingRecord {
  const year = Number(r.year);
  const month = Number(r.month);
  return {
    year,
    month,
    label: "",
    salesCount: Number(r.sales_count) || 0,
    bruto: Number(r.bruto) || 0,
    custoProdutos: Number(r.custo_produtos) || 0,
    custoRepasses: Number(r.custo_repasses) || 0,
    taxasCartao: Number(r.taxas_cartao) || 0,
    lucroLiquido: Number(r.lucro_liquido) || 0,
    metadeClinica: Number(r.metade_clinica) || 0,
    metadeAgro: Number(r.metade_agro) || 0,
    margemPct: Number(r.bruto) > 0 ? Math.round((Number(r.lucro_liquido) / Number(r.bruto)) * 100) : 0,
    closedBy: (r.closed_by as string) || undefined,
    closedAt: r.closed_at as string,
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
  const { error } = await supabase.from(TABLE).insert({
    year: breakdown.year,
    month: breakdown.month,
    sales_count: breakdown.salesCount,
    bruto: breakdown.bruto,
    custo_produtos: breakdown.custoProdutos,
    custo_repasses: breakdown.custoRepasses,
    taxas_cartao: breakdown.taxasCartao,
    lucro_liquido: breakdown.lucroLiquido,
    metade_clinica: breakdown.metadeClinica,
    metade_agro: breakdown.metadeAgro,
    closed_by: closedBy || null,
  });
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
