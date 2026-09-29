import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconChip } from "@/components/finance/FinanceUI";
import { TONES, type Concept, type Tone } from "@/components/finance/financeTheme";

export interface KpiItem {
  label: string;
  value: string;
  hint?: React.ReactNode;
  /** Conceito do financeiro (ícone + cor). Ou passe icon/tone soltos. */
  concept?: Concept;
  icon?: LucideIcon;
  tone?: Tone;
  /** Pinta o número na cor do conceito (ex.: a receber > 0, lucro). */
  colorValue?: boolean;
  /** Cartão tingido — o número principal da tela (ex.: lucro líquido). */
  highlight?: boolean;
  onClick?: () => void;
}

// Colunas sempre "fechadas" (2×2 ou 1×4 etc.).
const COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
};

/**
 * Indicadores da tela: cartões com ícone colorido do conceito (mesma
 * linguagem do Painel), rótulo curto em caixa alta, número em negrito.
 */
export function KpiStrip({ items, loading, className }: { items: KpiItem[]; loading?: boolean; className?: string }) {
  return (
    <div className={cn("grid gap-3", COLS[items.length] ?? "grid-cols-2 xl:grid-cols-4", className)}>
      {items.map((item) => {
        const icon = item.icon ?? item.concept?.icon;
        const tone = item.tone ?? item.concept?.tone ?? "slate";
        const t = TONES[tone];
        const body = (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={cn("text-[11px] font-semibold uppercase tracking-wide", item.highlight ? t.label : "text-muted-foreground")}>
                {item.label}
              </p>
              {loading ? (
                // Sem "R$ 0,00" piscando antes dos dados chegarem.
                <>
                  <span className="mt-2 block h-7 w-28 animate-pulse rounded-md bg-muted" aria-hidden />
                  <span className="mt-2 block h-3 w-20 animate-pulse rounded bg-muted" aria-hidden />
                </>
              ) : (
                <>
                  <p
                    className={cn(
                      "mt-1.5 text-2xl font-bold tabular-nums tracking-tight",
                      item.colorValue || item.highlight ? t.text : "text-foreground"
                    )}
                  >
                    {item.value}
                  </p>
                  {item.hint ? <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p> : null}
                </>
              )}
            </div>
            {icon ? <IconChip icon={icon} tone={tone} size="lg" /> : null}
          </div>
        );
        const base = cn(
          "group relative min-w-0 rounded-2xl border p-4 text-left shadow-sm transition-all",
          item.highlight ? t.card : "border-border/80 bg-card"
        );
        return item.onClick ? (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className={cn(
              base,
              "hover:-translate-y-px hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            )}
          >
            {body}
            <ChevronRight
              className="absolute bottom-3 right-3 h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground"
              aria-hidden
            />
          </button>
        ) : (
          <div key={item.label} className={base}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
