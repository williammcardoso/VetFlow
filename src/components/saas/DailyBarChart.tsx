import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatCurrencyBRL, formatDateTime, parseLocalDate, toLocalISODate } from "@/lib/utils";

export interface DailySeries {
  key: string;
  label: string;
  color: string;
}

/** "R$ 1,2 mil" — eixo curto, sem truncar valores pequenos em "R$ 0k". Espaços não quebráveis: o eixo não parte o rótulo em duas linhas. */
export function compactBRL(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `R$ ${Math.round(value).toLocaleString("pt-BR")}`;
}

// Até ~3 meses, todos os dias do período aparecem (dia sem movimento = barra
// vazia), então a distância entre as barras é o tempo de verdade.
const MAX_FILLED_DAYS = 92;

function buildRows(values: Record<string, Record<string, number>>, series: DailySeries[], from?: string, to?: string) {
  let days = Object.keys(values).sort();
  if (from && to) {
    const start = parseLocalDate(from);
    const end = parseLocalDate(to);
    const span = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    if (span >= 0 && span < MAX_FILLED_DAYS) {
      days = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(toLocalISODate(d));
    }
  }
  return days.map((day) => {
    const row: Record<string, string | number> = { day };
    for (const s of series) row[s.key] = Math.round((values[day]?.[s.key] ?? 0) * 100) / 100;
    return row;
  });
}

/** Barras por dia (uma ou mais séries), com dias vazios preenchidos. */
export function DailyBarChart({
  values,
  series,
  from,
  to,
  className = "h-[220px] w-full",
}: {
  /** data "AAAA-MM-DD" → { série: valor } */
  values: Record<string, Record<string, number>>;
  series: DailySeries[];
  from?: string;
  to?: string;
  className?: string;
}) {
  const rows = React.useMemo(() => buildRows(values, series, from, to), [values, series, from, to]);
  const config = React.useMemo(
    () => Object.fromEntries(series.map((s) => [s.key, { label: s.label, color: s.color }])) as ChartConfig,
    [series]
  );
  return (
    <ChartContainer config={config} className={className}>
      <BarChart data={rows} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="20%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`}
        />
        <YAxis tickLine={false} axisLine={false} width={76} tickFormatter={compactBRL} />
        <ChartTooltip
          cursor={{ fillOpacity: 0.5 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const day = payload?.[0]?.payload?.day as string | undefined;
                return day ? formatDateTime(day) : "";
              }}
              formatter={(value, name, item) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: item?.color }} aria-hidden />
                    {config[String(name)]?.label ?? name}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">{formatCurrencyBRL(Number(value))}</span>
                </div>
              )}
            />
          }
        />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} fill={`var(--color-${s.key})`} radius={[3, 3, 0, 0]} maxBarSize={28} />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
