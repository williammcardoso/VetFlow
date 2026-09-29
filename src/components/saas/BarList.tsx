import * as React from "react";
import { cn, formatCurrencyBRL } from "@/lib/utils";

export interface BarListItem {
  key: string;
  label: React.ReactNode;
  value: number;
  /** Texto pequeno ao lado do rótulo (ex.: "12 itens", "34%"). */
  hint?: React.ReactNode;
}

/**
 * Ranking em barras horizontais (rótulo à esquerda, valor à direita, barra
 * de fundo proporcional ao maior valor). Lê melhor que pizza quando há mais
 * de 3–4 fatias e mostra o valor exato sem precisar passar o mouse.
 */
export function BarList({
  items,
  format = formatCurrencyBRL,
  onSelect,
  selectedKey,
  className,
}: {
  items: BarListItem[];
  format?: (value: number) => string;
  onSelect?: (key: string) => void;
  selectedKey?: string;
  className?: string;
}) {
  const max = Math.max(0, ...items.map((i) => i.value));
  return (
    <ul className={cn("space-y-1", className)}>
      {items.map((item) => {
        const pct = max > 0 && item.value > 0 ? Math.max(1.5, (item.value / max) * 100) : 0;
        const body = (
          <>
            <span aria-hidden className="absolute inset-y-0 left-0 rounded-md bg-primary/10" style={{ width: `${pct}%` }} />
            <span className="relative min-w-0 truncate">
              {item.label}
              {item.hint != null && <span className="ml-1.5 text-xs text-muted-foreground">{item.hint}</span>}
            </span>
            <span className="relative shrink-0 font-medium tabular-nums text-foreground">{format(item.value)}</span>
          </>
        );
        const base = "relative flex h-9 w-full items-center justify-between gap-3 overflow-hidden rounded-md px-2.5 text-sm text-foreground";
        return (
          <li key={item.key}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(item.key)}
                aria-pressed={selectedKey === item.key}
                className={cn(
                  base,
                  "text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  selectedKey === item.key && "ring-1 ring-primary/50"
                )}
              >
                {body}
              </button>
            ) : (
              <div className={base}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
