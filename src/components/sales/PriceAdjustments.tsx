import * as React from "react";
import { BadgePercent } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toCents } from "@/lib/salePayment";
import { cn, formatCurrencyBRL } from "@/lib/utils";

// Desconto e acréscimo da venda — o mesmo do PDV no prontuário. % e R$ andam
// juntos: digitar num recalcula o outro sobre o subtotal.

const num = (v: string) => parseFloat(v.replace(",", ".")) || 0;

export function usePriceAdjustments(subtotal: number) {
  const [discountPct, setDiscountPct] = React.useState("");
  const [discountVal, setDiscountVal] = React.useState("");
  const [surchargePct, setSurchargePct] = React.useState("");
  const [surchargeVal, setSurchargeVal] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const discountAmount = toCents(discountVal ? num(discountVal) : discountPct ? (subtotal * num(discountPct)) / 100 : 0);
  const surchargeAmount = toCents(surchargeVal ? num(surchargeVal) : surchargePct ? (subtotal * num(surchargePct)) / 100 : 0);

  return {
    discountPct,
    discountVal,
    surchargePct,
    surchargeVal,
    discountAmount,
    surchargeAmount,
    open: open || !!(discountPct || discountVal || surchargePct || surchargeVal),
    setOpen,
    onDiscountPct: (v: string) => {
      setDiscountPct(v);
      const pct = num(v);
      setDiscountVal(pct > 0 ? ((subtotal * pct) / 100).toFixed(2) : "");
    },
    onDiscountVal: (v: string) => {
      setDiscountVal(v);
      const val = num(v);
      setDiscountPct(val > 0 && subtotal > 0 ? ((val / subtotal) * 100).toFixed(2) : "");
    },
    onSurchargePct: (v: string) => {
      setSurchargePct(v);
      const pct = num(v);
      setSurchargeVal(pct > 0 ? ((subtotal * pct) / 100).toFixed(2) : "");
    },
    onSurchargeVal: (v: string) => {
      setSurchargeVal(v);
      const val = num(v);
      setSurchargePct(val > 0 && subtotal > 0 ? ((val / subtotal) * 100).toFixed(2) : "");
    },
    reset: () => {
      setDiscountPct("");
      setDiscountVal("");
      setSurchargePct("");
      setSurchargeVal("");
      setOpen(false);
    },
  };
}

export type PriceAdjustmentsState = ReturnType<typeof usePriceAdjustments>;

function PairInput({
  id,
  label,
  pct,
  val,
  onPct,
  onVal,
}: {
  id: string;
  label: string;
  pct: string;
  val: string;
  onPct: (v: string) => void;
  onVal: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`${id}-val`} className="text-sm font-medium">
        {label}
      </Label>
      <div className="flex gap-1.5">
        <div className="relative w-[4.5rem] shrink-0">
          <Input
            id={`${id}-pct`}
            value={pct}
            onChange={(e) => onPct(e.target.value)}
            className="h-9 rounded-lg bg-input pr-6 text-sm"
            placeholder="0"
            type="number"
            min="0"
            aria-label={`${label} em %`}
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
          <Input
            id={`${id}-val`}
            value={val}
            onChange={(e) => onVal(e.target.value)}
            className="h-9 min-w-0 rounded-lg bg-input pl-8 text-sm"
            placeholder="0,00"
            type="number"
            min="0"
            aria-label={`${label} em reais`}
          />
        </div>
      </div>
    </div>
  );
}

/** Campos de desconto/acréscimo — fechados atrás de um link até serem usados. */
export function PriceAdjustmentFields({
  adj,
  idPrefix = "adj",
  className,
}: {
  adj: PriceAdjustmentsState;
  idPrefix?: string;
  className?: string;
}) {
  if (!adj.open) {
    return (
      <button
        type="button"
        className={cn("inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline", className)}
        onClick={() => adj.setOpen(true)}
      >
        <BadgePercent className="h-4 w-4" aria-hidden /> Desconto ou acréscimo
      </button>
    );
  }
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>
      <PairInput
        id={`${idPrefix}-discount`}
        label="Desconto"
        pct={adj.discountPct}
        val={adj.discountVal}
        onPct={adj.onDiscountPct}
        onVal={adj.onDiscountVal}
      />
      <PairInput
        id={`${idPrefix}-surcharge`}
        label="Acréscimo"
        pct={adj.surchargePct}
        val={adj.surchargeVal}
        onPct={adj.onSurchargePct}
        onVal={adj.onSurchargeVal}
      />
    </div>
  );
}

/** Linhas de subtotal/desconto/acréscimo (só aparecem se houver ajuste). */
export function AdjustmentLines({
  subtotal,
  discount,
  surcharge,
  discountPct,
}: {
  subtotal: number;
  discount: number;
  surcharge: number;
  discountPct?: string;
}) {
  if (!(discount > 0) && !(surcharge > 0)) return null;
  return (
    <>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Subtotal</span>
        <span className="tabular-nums">{formatCurrencyBRL(subtotal)}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-sm text-emerald-700">
          <span>Desconto{discountPct ? ` (${discountPct}%)` : ""}</span>
          <span className="tabular-nums">− {formatCurrencyBRL(discount)}</span>
        </div>
      )}
      {surcharge > 0 && (
        <div className="flex justify-between text-sm text-amber-700">
          <span>Acréscimo</span>
          <span className="tabular-nums">+ {formatCurrencyBRL(surcharge)}</span>
        </div>
      )}
    </>
  );
}
