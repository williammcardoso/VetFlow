import type { FinancialTransaction } from "@/mockData/financial";

/**
 * Classifica o lançamento pra exibição (rótulo, cor, sinal). Um estorno é
 * `type: "income"` com valor NEGATIVO — sem tratar isso à parte, ele aparecia
 * verde como se fosse uma entrada normal (e o sinal "+" grudava no "-" que o
 * Intl.NumberFormat já coloca sozinho pra número negativo).
 *
 * Compartilhado entre FinancialPage.tsx e FinancialReportsPage.tsx — o mesmo
 * bug já tinha sido corrigido só num dos dois lugares antes.
 */
export const classifyTransaction = (t: FinancialTransaction) => {
  const isRefund = t.amount < 0;
  if (isRefund) {
    return {
      label: "Estorno",
      badgeClass: "bg-red-100 text-red-700",
      amountClass: "text-red-600",
      signal: "− ",
    };
  }
  if (t.type === "expense") {
    return {
      label: t.category === "Estoque" ? "Compra" : "Saída",
      badgeClass: "bg-orange-100 text-orange-700",
      amountClass: "text-orange-700",
      signal: "− ",
    };
  }
  if (t.category === "Recebimento") {
    return {
      label: "Recebimento",
      badgeClass: "bg-emerald-100 text-emerald-700",
      amountClass: "text-emerald-700",
      signal: "+ ",
    };
  }
  return {
    label: "Venda",
    badgeClass: "bg-blue-100 text-blue-700",
    amountClass: "text-blue-700",
    signal: "",
  };
};
