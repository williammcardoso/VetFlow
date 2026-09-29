import { cn } from "@/lib/utils";
import { saleStatus } from "@/lib/salePayment";
import { SALE_STATUS_VISUAL, TONES } from "@/components/finance/financeTheme";
import type { FinancialTransaction } from "@/mockData/financial";

// Pago = verde, Parcial = azul, A receber = âmbar, Cancelada = vermelho —
// mesmas cores que o sistema já usava antes nas vendas.
export function SaleStatusBadge({
  sale,
  className,
}: {
  sale: Pick<FinancialTransaction, "amount" | "paidAmount" | "status">;
  className?: string;
}) {
  const { key, label } = saleStatus(sale);
  const { icon: Icon, tone } = SALE_STATUS_VISUAL[key];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
        TONES[tone].badge,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}
