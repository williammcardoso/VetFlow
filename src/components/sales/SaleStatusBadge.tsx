import { cn } from "@/lib/utils";
import { saleStatus, type SaleStatusKey } from "@/lib/salePayment";
import type { FinancialTransaction } from "@/mockData/financial";

// Cor só onde tem significado: verde = pago, âmbar = falta receber, cinza = cancelada.
const TONE: Record<SaleStatusKey, { pill: string; dot: string }> = {
  paid: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", dot: "bg-emerald-500" },
  partial: { pill: "bg-amber-50 text-amber-800 ring-amber-600/20", dot: "bg-amber-500" },
  open: { pill: "bg-amber-50 text-amber-800 ring-amber-600/20", dot: "bg-amber-500" },
  cancelled: { pill: "bg-muted text-muted-foreground ring-border", dot: "bg-muted-foreground/50" },
};

export function SaleStatusBadge({
  sale,
  className,
}: {
  sale: Pick<FinancialTransaction, "amount" | "paidAmount" | "status">;
  className?: string;
}) {
  const { key, label } = saleStatus(sale);
  const tone = TONE[key];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        tone.pill,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} aria-hidden />
      {label}
    </span>
  );
}
