import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn, formatCurrencyBRL } from "@/lib/utils";
import { TONES, type Tone } from "@/components/finance/financeTheme";

export interface BarListItem {
  key: string;
  label: React.ReactNode;
  value: number;
  /** Texto pequeno ao lado do rótulo (ex.: "12 itens", "34%"). */
  hint?: React.ReactNode;
  /** Ícone colorido antes do rótulo (categoria, forma de pagamento...). */
  icon?: LucideIcon;
  /** Cor do ícone/barra deste item (senão, a da lista). */
  tone?: Tone;
}

/**
 * Ranking em barras horizontais (rótulo à esquerda, valor à direita, barra
 * de fundo proporcional ao maior valor) na cor do conceito. Lê melhor que
 * pizza quando há mais de 3–4 fatias e mostra o valor exato.
 */
export function BarList({
  items,
  tone = "sky",
  format = formatCurrencyBRL,
  onSelect,
  selectedKey,
  ranked,
  className,
}: {
  items: BarListItem[];
  tone?: Tone;
  format?: (value: number) => string;
  onSelect?: (key: string) => void;
  selectedKey?: string;
  /** Numera as linhas (1º, 2º...) — rankings como "mais vendidos". */
  ranked?: boolean;
  className?: string;
}) {
  const max = Math.max(0, ...items.map((i) => i.value));
  return (
    <ul className={cn("space-y-1", className)}>
      {items.map((item, index) => {
        const itemTone = item.tone ?? tone;
        const pct = max > 0 && item.value > 0 ? Math.max(1.5, (item.value / max) * 100) : 0;
        const Icon = item.icon;
        const body = (
          <>
            <span aria-hidden className={cn("absolute inset-y-0 left-0 rounded-md", TONES[itemTone].bar)} style={{ width: `${pct}%` }} />
            <span className="relative flex min-w-0 items-center gap-2">
              {ranked && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-card text-[11px] font-bold tabular-nums text-muted-foreground ring-1 ring-border">
                  {index + 1}
                </span>
              )}
              {Icon && <Icon className={cn("h-4 w-4 shrink-0", TONES[itemTone].text)} aria-hidden />}
              <span className="min-w-0 truncate font-medium">{item.label}</span>
              {item.hint != null && <span className="shrink-0 text-xs text-muted-foreground">{item.hint}</span>}
            </span>
            <span className="relative shrink-0 font-semibold tabular-nums text-foreground">{format(item.value)}</span>
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
                  selectedKey === item.key && "ring-2 ring-orange-300"
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
