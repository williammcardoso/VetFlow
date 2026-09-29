import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn, formatDateTime, toLocalISODate } from "@/lib/utils";

export type PeriodPreset = "this-month" | "last-month" | "last-30" | "all";

const PRESET_LABEL: Record<PeriodPreset, string> = {
  "this-month": "Este mês",
  "last-month": "Mês passado",
  "last-30": "30 dias",
  all: "Tudo",
};

/** Intervalo (datas locais "AAAA-MM-DD") de um atalho de período. */
export function periodRange(preset: PeriodPreset, today = new Date()): { from: string; to: string } {
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (preset) {
    case "this-month":
      return { from: toLocalISODate(new Date(y, m, 1)), to: toLocalISODate(new Date(y, m + 1, 0)) };
    case "last-month":
      return { from: toLocalISODate(new Date(y, m - 1, 1)), to: toLocalISODate(new Date(y, m, 0)) };
    case "last-30": {
      const start = new Date(y, m, today.getDate() - 29);
      return { from: toLocalISODate(start), to: toLocalISODate(today) };
    }
    default:
      return { from: "", to: "" };
  }
}

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Texto do período: "setembro de 2026", "01/09/2026 a 15/09/2026", "Todo o período". */
export function describePeriod(from: string, to: string): string {
  if (!from && !to) return "Todo o período";
  if (from && to) {
    const [fy, fm, fd] = from.split("-").map(Number);
    const [ty, tm, td] = to.split("-").map(Number);
    const lastDay = new Date(ty, tm, 0).getDate();
    if (fy === ty && fm === tm && fd === 1 && td === lastDay) return `${MONTHS[fm - 1]} de ${fy}`;
    return `${formatDateTime(from)} a ${formatDateTime(to)}`;
  }
  return from ? `Desde ${formatDateTime(from)}` : `Até ${formatDateTime(to)}`;
}

/** A data "AAAA-MM-DD" está dentro do intervalo (limites vazios = aberto)? */
export function isWithinPeriod(date: string, from?: string, to?: string): boolean {
  return (!from || date >= from) && (!to || date <= to);
}

/**
 * Período: atalhos (controle segmentado) + as duas datas. Mexer nas datas
 * vira período personalizado (nenhum atalho marcado).
 */
export function PeriodFilter({
  from,
  to,
  onChange,
  presets = ["this-month", "last-month", "last-30", "all"],
  className,
}: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  presets?: PeriodPreset[];
  className?: string;
}) {
  const active = presets.find((p) => {
    const r = periodRange(p);
    return r.from === from && r.to === to;
  });

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", className)}>
      <div role="radiogroup" aria-label="Período" className="inline-flex w-full rounded-xl bg-muted p-1 sm:w-auto">
        {presets.map((p) => {
          const on = active === p;
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(periodRange(p))}
              className={cn(
                "flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                on ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {PRESET_LABEL[p]}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <Input
          type="date"
          aria-label="De"
          value={from}
          max={to || undefined}
          onChange={(e) => onChange({ from: e.target.value, to })}
          className="h-9 rounded-lg bg-input sm:w-[9.5rem]"
        />
        <Input
          type="date"
          aria-label="Até"
          value={to}
          min={from || undefined}
          onChange={(e) => onChange({ from, to: e.target.value })}
          className="h-9 rounded-lg bg-input sm:w-[9.5rem]"
        />
      </div>
    </div>
  );
}
