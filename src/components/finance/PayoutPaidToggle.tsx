import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const dayMonth = (iso: string) => {
  const [, m, d] = iso.slice(0, 10).split("-");
  return d && m ? `${d}/${m}` : iso;
};

/**
 * Situação do repasse ao prestador/fornecedor: "A pagar" (âmbar, em aberto)
 * ou "Pago dd/mm" (verde). Clique alterna — pago antes do fechamento sai do
 * "a pagar" do PDF de repasse; o Fechamento 50/50 não muda.
 */
export function PayoutPaidToggle({
  paidAt,
  onToggle,
  busy,
  disabled,
  className,
}: {
  paidAt?: string;
  onToggle: () => void;
  busy?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const paid = !!paidAt;
  const Icon = busy ? Loader2 : paid ? CheckCircle2 : Clock;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy || disabled}
      aria-pressed={paid}
      title={paid ? "Pago antes do fechamento — clique para voltar a \"a pagar\"" : "Clique para marcar como já pago"}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset transition-colors disabled:cursor-default disabled:opacity-70",
        paid
          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 hover:bg-emerald-100"
          : "bg-amber-50 text-amber-800 ring-amber-600/20 hover:bg-amber-100",
        className
      )}
    >
      <Icon className={cn("h-3 w-3", busy && "animate-spin")} aria-hidden />
      {paid ? `Pago ${dayMonth(paidAt!)}` : "A pagar"}
    </button>
  );
}
