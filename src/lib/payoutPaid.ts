import { supabase } from "@/integrations/supabase/client";

// Repasse PAGO antes do fechamento (ex.: anestesista e raio-x que recebem na
// hora, um exame de lab pago à parte). Só controle de pagamento: o Fechamento
// 50/50 não muda — o repasse continua sendo custo do mês. Muda o "a pagar" do
// PDF de repasse que vai para o escritório.
// Coluna `repasse_pago_em` (data) em sale_items e financial_transactions —
// migration 20261126120000.

export const PAYOUT_PAID_MIGRATION = "20261126120000_repasse_pago.sql";

export type PayoutPaidResult = "ok" | "missing-column" | "error";

const isMissingColumn = (error: { code?: string; message?: string } | null) =>
  !!error && (error.code === "PGRST204" || error.code === "42703" || /repasse_pago_em/i.test(error.message || ""));

async function setPaid(table: "sale_items" | "financial_transactions", id: string, paidAt: string | null): Promise<PayoutPaidResult> {
  const { error } = await supabase.from(table).update({ repasse_pago_em: paidAt }).eq("id", id);
  if (!error) return "ok";
  console.error(`[payoutPaid] ${table}`, error);
  return isMissingColumn(error) ? "missing-column" : "error";
}

/** Repasse de um serviço vendido (lab, especialista). `null` = volta para "a pagar". */
export const setSaleItemPayoutPaid = (saleItemId: string, paidAt: string | null) => setPaid("sale_items", saleItemId, paidAt);

/** Despesa (Financeiro → Despesas). `null` = volta para "a pagar". */
export const setExpensePayoutPaid = (transactionId: string, paidAt: string | null) =>
  setPaid("financial_transactions", transactionId, paidAt);

/** Total, já pago e a pagar de uma lista de repasses. */
export function summarizePayout(lines: Array<{ amount: number; paidAt?: string | null }>): { total: number; paid: number; toPay: number } {
  const cents = (v: number) => Math.round(v * 100);
  let total = 0;
  let paid = 0;
  for (const l of lines) {
    total += cents(l.amount);
    if (l.paidAt) paid += cents(l.amount);
  }
  return { total: total / 100, paid: paid / 100, toPay: (total - paid) / 100 };
}
