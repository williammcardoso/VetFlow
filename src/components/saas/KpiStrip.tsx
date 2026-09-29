import * as React from "react";
import { cn } from "@/lib/utils";

export interface KpiItem {
  label: string;
  value: string;
  hint?: React.ReactNode;
  /** Cor do número — só quando carrega significado (ex.: algo a receber). */
  tone?: "default" | "positive" | "warning" | "negative";
  onClick?: () => void;
}

const VALUE_TONE: Record<NonNullable<KpiItem["tone"]>, string> = {
  default: "text-foreground",
  positive: "text-emerald-700",
  warning: "text-amber-700",
  negative: "text-red-700",
};

// Colunas sempre "fechadas" (2×2 ou 1×4 etc.): sem célula vazia no fim.
const COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 xl:grid-cols-4",
};

/**
 * Faixa de indicadores (padrão Stripe): um cartão só, números alinhados e
 * separados por linhas finas — em vez de uma grade de cartões coloridos.
 */
export function KpiStrip({ items, loading, className }: { items: KpiItem[]; loading?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-2xl border border-border/80 bg-border/70 shadow-sm",
        COLS[items.length] ?? "grid-cols-2 xl:grid-cols-4",
        className
      )}
    >
      {items.map((item) => {
        const body = (
          <>
            <p className="text-sm text-muted-foreground">{item.label}</p>
            {loading ? (
              // Sem "R$ 0,00" piscando antes dos dados chegarem.
              <>
                <span className="mt-2 block h-6 w-28 animate-pulse rounded-md bg-muted sm:h-7" aria-hidden />
                <span className="mt-1.5 block h-3 w-20 animate-pulse rounded bg-muted" aria-hidden />
              </>
            ) : (
              <>
                <p className={cn("mt-1 text-xl font-semibold tabular-nums tracking-tight sm:text-2xl", VALUE_TONE[item.tone ?? "default"])}>
                  {item.value}
                </p>
                {item.hint ? <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p> : null}
              </>
            )}
          </>
        );
        return item.onClick ? (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className="min-w-0 bg-card p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
          >
            {body}
          </button>
        ) : (
          <div key={item.label} className="min-w-0 bg-card p-4">
            {body}
          </div>
        );
      })}
    </div>
  );
}
