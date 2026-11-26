import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AlertTriangle, BarChart3, Calculator, CalendarDays, Clock, Lock, Scale, Sparkles, Stethoscope, Target, Wheat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { KpiStrip } from "@/components/saas/KpiStrip";
import { compactBRL } from "@/components/saas/DailyBarChart";
import { IconChip, Panel } from "@/components/finance/FinanceUI";
import { CONCEPTS, TONES, type Tone } from "@/components/finance/financeTheme";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { getSaleItemsBySaleIds, type SaleItem } from "@/lib/saleItemsApi";
import { listMonthlyClosings, type MonthlyClosingRecord } from "@/lib/monthlyClosingsApi";
import { listAllClosingExtras, type ClosingExtra } from "@/lib/closingExtrasApi";
import { computePeriodFinancials, isReceipt, isSale } from "@/lib/financialSummary";
import { getMonthBounds } from "@/lib/monthlyClosing";
import { computeProfitForecast, type ForecastMonth, type ForecastMonthInput } from "@/lib/profitForecast";
import { cn, formatCurrencyBRL, getTodayLocalISO } from "@/lib/utils";

const fmt = formatCurrencyBRL;
const monthName = (m: Pick<ForecastMonth, "label">) => m.label.split(" / ")[0];
/** "Nov", "Jan/27" (ano só quando não é o atual). */
const shortLabel = (m: ForecastMonth, thisYear: number) => `${monthName(m).slice(0, 3)}${m.year !== thisYear ? `/${String(m.year).slice(2)}` : ""}`;
const pct = (lucro: number, recebido: number) => (recebido > 0 ? `${Math.round((lucro / recebido) * 100)}%` : "—");

const CHART_CONFIG = {
  realizado: { label: "Já sobrou", color: "hsl(160 84% 39%)" },
  previsto: { label: "Previsão", color: "hsl(158 64% 78%)" },
} satisfies ChartConfig;

/** Selo da situação do mês. */
function MonthStatus({ m }: { m: ForecastMonth }) {
  const visual: { label: string; icon: typeof Lock; tone: Tone } =
    m.kind === "previsto"
      ? { label: "Previsão", icon: Sparkles, tone: "violet" }
      : m.kind === "atual"
        ? { label: `Dia ${m.days} de ${m.daysInMonth}`, icon: CalendarDays, tone: "sky" }
        : m.closed
          ? { label: "Fechado", icon: Lock, tone: "slate" }
          : { label: "Não fechado", icon: Clock, tone: "amber" };
  const Icon = visual.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", TONES[visual.tone].badge)}>
      <Icon className="h-3 w-3" aria-hidden /> {visual.label}
    </span>
  );
}

/** Dica do gráfico: realizado, previsão e faixa do mês. */
function ForecastTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: { month?: ForecastMonth } }> }) {
  const m = payload?.[0]?.payload?.month;
  if (!active || !m) return null;
  return (
    <div className="min-w-[12rem] rounded-lg border border-border/60 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-foreground">{m.label}</p>
      {m.kind !== "previsto" && (
        <p className="mt-1 flex justify-between gap-4 text-muted-foreground">
          {m.kind === "atual" ? "Até hoje" : "Lucro"} <span className="font-semibold tabular-nums text-emerald-700">{fmt(m.lucroAteAgora)}</span>
        </p>
      )}
      {m.kind !== "realizado" && (
        <>
          <p className="mt-1 flex justify-between gap-4 text-muted-foreground">
            Deve fechar em <span className="font-semibold tabular-nums text-foreground">{fmt(m.lucro)}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            entre <span className="tabular-nums">{fmt(m.low)}</span> e <span className="tabular-nums">{fmt(m.high)}</span>
          </p>
        </>
      )}
    </div>
  );
}

// Colunas da lista no computador: mês | entrou | custos | lucro | margem | clínica | agropecuária.
const LIST_COLS = "xl:grid-cols-[11rem_repeat(6,minmax(0,1fr))]";

/**
 * Previsão de lucro a partir do que já entrou: ritmo dos últimos meses
 * (lucro ÷ dias) aplicado aos dias que faltam no mês e aos próximos meses.
 * Mesma conta de lucro do Fechamento 50/50 — mês fechado usa o valor gravado.
 */
const ProfitForecastPage: React.FC = () => {
  const { transactions, loading } = useFinancialTransactions();
  const today = getTodayLocalISO();

  const sales = useMemo(() => transactions.filter(isSale), [transactions]);
  const saleIdsKey = useMemo(() => sales.map((s) => s.id).sort().join(","), [sales]);
  const [saleItems, setSaleItems] = useState<SaleItem[] | null>(null);
  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    getSaleItemsBySaleIds(saleIdsKey ? saleIdsKey.split(",") : []).then((items) => !cancelled && setSaleItems(items));
    return () => {
      cancelled = true;
    };
  }, [saleIdsKey, loading]);

  const [closings, setClosings] = useState<MonthlyClosingRecord[] | null>(null);
  const [extras, setExtras] = useState<ClosingExtra[]>([]);
  useEffect(() => {
    let cancelled = false;
    Promise.all([listMonthlyClosings(), listAllClosingExtras()]).then(([c, e]) => {
      if (cancelled) return;
      setClosings(c);
      setExtras(e);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = !loading && saleItems !== null && closings !== null;

  // Primeiro dia com venda ou recebimento (compras parceladas no futuro não contam).
  const firstDate = useMemo(() => {
    const dates = transactions.filter((t) => (isSale(t) || isReceipt(t)) && t.date <= today).map((t) => t.date);
    return dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null;
  }, [transactions, today]);

  const forecast = useMemo(() => {
    if (!ready || !firstDate) return null;
    const closedBy = new Map(closings!.map((c) => [`${c.year}-${c.month}`, c]));
    const months: ForecastMonthInput[] = [];
    let y = Number(firstDate.slice(0, 4));
    let mo = Number(firstDate.slice(5, 7));
    const endKey = Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7));
    while (y * 12 + mo <= endKey) {
      const { from, to } = getMonthBounds(y, mo);
      const live = computePeriodFinancials(transactions, saleItems!, from, to).closing;
      const closed = closedBy.get(`${y}-${mo}`);
      const monthExtras = extras.filter((e) => e.year === y && e.month === mo);
      months.push({
        year: y,
        month: mo,
        lucro: closed ? closed.lucroLiquido : live.lucroLiquido,
        // Fechado antes da coluna de despesas: o recebido reconstruído fica sem elas.
        recebido: closed ? closed.recebido + (closed.hasExpenseColumns ? 0 : live.custoDespesas) : live.recebido,
        extrasClinic: monthExtras.filter((e) => e.beneficiary === "clinic").reduce((s, e) => s + e.amount, 0),
        extrasAgro: monthExtras.filter((e) => e.beneficiary === "agro").reduce((s, e) => s + e.amount, 0),
        closed: !!closed,
      });
      mo += 1;
      if (mo > 12) {
        mo = 1;
        y += 1;
      }
    }
    return computeProfitForecast({ months, today, firstDate });
  }, [ready, firstDate, closings, extras, transactions, saleItems, today]);

  const current = forecast?.current ?? null;
  const base = forecast?.base;
  const remaining = current ? current.daysInMonth - current.days : 0;
  const thisYear = Number(today.slice(0, 4));

  const chartRows = useMemo(
    () =>
      (forecast?.months ?? []).map((m) => ({
        name: shortLabel(m, thisYear),
        realizado: m.kind === "previsto" ? 0 : Math.round(m.lucroAteAgora),
        previsto: m.kind === "realizado" ? 0 : Math.max(0, Math.round(m.lucro - m.lucroAteAgora)),
        month: m,
      })),
    [forecast, thisYear]
  );

  return (
    <PageShell className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Previsão de lucro"
        description="Quanto deve sobrar nos próximos meses, no ritmo do que já entrou."
        icon={CONCEPTS.lucro.icon}
        module="finance"
        breadcrumb={<>Painel &gt; Financeiro &gt; Previsão de lucro</>}
        className="mb-0 sm:mb-0"
        actions={
          <Button asChild variant="outline" className="gap-2">
            <Link to="/financial/monthly-closing">
              <Scale className="h-4 w-4 text-emerald-600" /> Fechamento 50/50
            </Link>
          </Button>
        }
      />

      {ready && !firstDate ? (
        <Panel title="Ainda sem histórico" icon={BarChart3} tone="slate">
          <p className="px-4 py-6 text-sm text-muted-foreground">Assim que entrarem as primeiras vendas, a previsão aparece aqui.</p>
        </Panel>
      ) : (
        <>
          {forecast && !forecast.enoughData && (
            <div className={cn("flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm", TONES.amber.card)}>
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              <p className="text-amber-900">
                Pouco histórico ainda: a previsão usa só {base?.months.length === 1 ? "1 mês" : "os primeiros dias"}. Com mais meses ela fica mais precisa.
              </p>
            </div>
          )}

          <KpiStrip
            loading={!forecast}
            items={[
              {
                label: current ? `${monthName(current)} deve fechar em` : "Mês atual",
                value: fmt(current?.lucro ?? 0),
                concept: CONCEPTS.lucro,
                highlight: true,
                hint: current ? (
                  <>
                    até hoje <span className="font-semibold tabular-nums text-foreground">{fmt(current.lucroAteAgora)}</span> · entre{" "}
                    <span className="tabular-nums">{compactBRL(current.low)}</span> e <span className="tabular-nums">{compactBRL(current.high)}</span>
                  </>
                ) : undefined,
              },
              {
                label: current ? `Parte da clínica em ${monthName(current).toLowerCase()}` : "Parte da clínica",
                value: fmt(current?.parteClinica ?? 0),
                icon: Stethoscope,
                tone: "teal",
                colorValue: true,
                hint: current ? (
                  <>
                    metade {fmt(current.lucro / 2)}
                    {current.extrasClinic > 0 ? ` + acréscimos ${fmt(current.extrasClinic)}${current.extrasEstimated ? " (média)" : ""}` : ""}
                  </>
                ) : undefined,
              },
              {
                label: "Lucro médio por mês",
                value: fmt(base?.lucroMensal ?? 0),
                icon: CalendarDays,
                tone: "sky",
                hint: base ? (
                  <>
                    {fmt(base.daily)} por dia · margem {base.marginPct}%
                  </>
                ) : undefined,
              },
              {
                label: "Próximos 12 meses",
                value: fmt(forecast?.next12.lucro ?? 0),
                icon: Target,
                tone: "violet",
                hint: forecast ? (
                  <>
                    clínica <span className="font-semibold tabular-nums text-teal-700">{fmt(forecast.next12.parteClinica)}</span>
                  </>
                ) : undefined,
              },
            ]}
          />

          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start">
            <div className="min-w-0 flex-1 space-y-4">
              <Panel
                title="Lucro mês a mês"
                icon={BarChart3}
                tone="emerald"
                description="O que já sobrou e a previsão até os próximos 3 meses."
                actions={
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: CHART_CONFIG.realizado.color }} aria-hidden /> Já sobrou
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: CHART_CONFIG.previsto.color }} aria-hidden /> Previsão
                    </span>
                  </div>
                }
              >
                <div className="px-2 pb-2 pt-4 sm:px-4">
                  {forecast ? (
                    <ChartContainer config={CHART_CONFIG} className="h-[240px] w-full">
                      <BarChart data={chartRows} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="28%">
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} interval={0} fontSize={11} />
                        <YAxis tickLine={false} axisLine={false} width={76} tickFormatter={compactBRL} />
                        <ChartTooltip cursor={{ fillOpacity: 0.4 }} content={<ForecastTooltip />} />
                        <Bar dataKey="realizado" stackId="lucro" fill="var(--color-realizado)" radius={[3, 3, 0, 0]} maxBarSize={64} />
                        <Bar dataKey="previsto" stackId="lucro" fill="var(--color-previsto)" radius={[3, 3, 0, 0]} maxBarSize={64} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[240px] animate-pulse rounded-xl bg-muted/60" aria-hidden />
                  )}
                </div>

                <div className={cn("hidden gap-3 border-y border-border/70 bg-muted/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground xl:grid", LIST_COLS)}>
                  <span>Mês</span>
                  <span className="text-right">Entrou</span>
                  <span className="text-right">Custos</span>
                  <span className="text-right">Lucro</span>
                  <span className="text-right">Margem</span>
                  <span className="text-right">Clínica</span>
                  <span className="text-right">Agropecuária</span>
                </div>
                <ul className="divide-y divide-border/70 border-t border-border/70 xl:border-t-0">
                  {(forecast?.months ?? []).map((m) => {
                    const estimate = m.kind !== "realizado";
                    const approx = estimate ? "≈ " : "";
                    const range = estimate && m.high - m.low >= 1 ? (
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        {compactBRL(m.low)} a {compactBRL(m.high)}
                      </span>
                    ) : null;
                    const lucroColor = m.lucro < 0 ? "text-rose-700" : estimate ? "text-emerald-700/80" : "text-emerald-700";
                    return (
                      <li key={`${m.year}-${m.month}`} className={cn("px-4 py-3", m.kind === "atual" && "bg-sky-50/40", m.kind === "previsto" && "bg-violet-50/20")}>
                        {/* Celular/tablet */}
                        <div className="xl:hidden">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">{m.label}</p>
                              <div className="mt-1">
                                <MonthStatus m={m} />
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className={cn("text-base font-bold tabular-nums", lucroColor)}>
                                {approx}
                                {fmt(m.lucro)}
                              </p>
                              {range}
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            entrou <span className="font-semibold tabular-nums text-foreground">{approx}{fmt(m.recebido)}</span> · custos{" "}
                            <span className="tabular-nums">{fmt(m.recebido - m.lucro)}</span> · margem {pct(m.lucro, m.recebido)}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            clínica <span className="font-semibold tabular-nums text-teal-700">{fmt(m.parteClinica)}</span> · agropecuária{" "}
                            <span className="font-semibold tabular-nums text-amber-700">{fmt(m.parteAgro)}</span>
                          </p>
                        </div>
                        {/* Computador */}
                        <div className={cn("hidden items-center gap-3 text-sm xl:grid", LIST_COLS)}>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{m.label}</p>
                            <div className="mt-0.5">
                              <MonthStatus m={m} />
                            </div>
                          </div>
                          <span className={cn("text-right tabular-nums", estimate ? "text-muted-foreground" : "text-foreground")}>
                            {approx}
                            {fmt(m.recebido)}
                          </span>
                          <span className="text-right tabular-nums text-muted-foreground">{fmt(m.recebido - m.lucro)}</span>
                          <span className={cn("text-right font-bold tabular-nums", lucroColor)}>
                            {approx}
                            {fmt(m.lucro)}
                            {range}
                          </span>
                          <span className="text-right tabular-nums text-muted-foreground">{pct(m.lucro, m.recebido)}</span>
                          <span className="text-right font-semibold tabular-nums text-teal-700">
                            {fmt(m.parteClinica)}
                            {m.extrasClinic > 0 && (
                              <span className="block text-[11px] font-normal text-muted-foreground">
                                + {compactBRL(m.extrasClinic)} acrésc.{m.extrasEstimated ? " (média)" : ""}
                              </span>
                            )}
                          </span>
                          <span className="text-right font-semibold tabular-nums text-amber-700">{fmt(m.parteAgro)}</span>
                        </div>
                      </li>
                    );
                  })}
                  {!forecast &&
                    Array.from({ length: 4 }, (_, i) => (
                      <li key={i} className="px-4 py-3">
                        <span className="block h-5 w-full animate-pulse rounded bg-muted" aria-hidden />
                      </li>
                    ))}
                </ul>
              </Panel>
            </div>

            <aside className="min-w-0 space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 2xl:sticky 2xl:top-4 2xl:block 2xl:w-[24rem] 2xl:shrink-0 2xl:space-y-4">
              {/* Ano */}
              <section className={cn("rounded-2xl border p-4 shadow-sm", TONES.emerald.card)} aria-label="Previsão do ano">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={cn("text-[11px] font-semibold uppercase tracking-wide", TONES.emerald.label)}>
                      {forecast ? `${forecast.yearEnd.year} deve fechar em` : "Ano"}
                    </p>
                    {forecast ? (
                      <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-emerald-700">{fmt(forecast.yearEnd.lucro)}</p>
                    ) : (
                      <span className="mt-2 block h-7 w-32 animate-pulse rounded-md bg-muted" aria-hidden />
                    )}
                  </div>
                  <IconChip icon={Target} tone="emerald" size="lg" />
                </div>
                {forecast && (
                  <>
                    <p className="mt-1 text-xs text-muted-foreground">
                      já sobrou <span className="font-semibold tabular-nums text-foreground">{fmt(forecast.yearEnd.realizado)}</span> + previsão{" "}
                      <span className="font-semibold tabular-nums text-foreground">{fmt(forecast.yearEnd.lucro - forecast.yearEnd.realizado)}</span>
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {[
                        { label: "Clínica", value: forecast.yearEnd.parteClinica, icon: Stethoscope, tone: "teal" as const },
                        { label: "Agropecuária", value: forecast.yearEnd.parteAgro, icon: Wheat, tone: "amber" as const },
                      ].map((p) => (
                        <div key={p.label} className="rounded-xl border border-border/70 bg-card px-3 py-2">
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <p.icon className={cn("h-3.5 w-3.5", TONES[p.tone].text)} aria-hidden /> {p.label}
                          </p>
                          <p className={cn("mt-0.5 text-base font-bold tabular-nums", TONES[p.tone].text)}>{fmt(p.value)}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>

              {/* Como a conta é feita */}
              <Panel title="Como a conta é feita" icon={Calculator} tone="sky" description="Dá para conferir de cabeça.">
                {forecast && base ? (
                  <ol className="space-y-3 p-4 text-sm text-muted-foreground">
                    <li className="flex gap-2.5">
                      <Step n={1} />
                      <div className="min-w-0">
                        <p>
                          Nos últimos {base.months.length === 1 ? "dias" : `${base.months.length} meses`} entraram{" "}
                          <b className="tabular-nums text-foreground">{fmt(base.recebido)}</b> e sobraram{" "}
                          <b className="tabular-nums text-emerald-700">{fmt(base.lucro)}</b> em {base.days} dias:{" "}
                          <b className="tabular-nums text-foreground">{fmt(base.daily)} por dia</b>.
                        </p>
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {base.months.map((b) => (
                            <li key={b.label} className="rounded-lg border border-border/70 bg-muted/30 px-2 py-1 text-[11px]">
                              <span className="font-semibold text-foreground">{b.label.split(" / ")[0].slice(0, 3)}</span> · {b.days} dias ·{" "}
                              <span className="tabular-nums">{fmt(b.daily)}/dia</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </li>
                    <li className="flex gap-2.5">
                      <Step n={2} />
                      <p>
                        Mês previsto = ritmo × dias do mês. Um mês de 30 dias dá{" "}
                        <b className="tabular-nums text-foreground">{fmt(base.lucroMensal)}</b>.
                      </p>
                    </li>
                    {current && (
                      <li className="flex gap-2.5">
                        <Step n={3} />
                        <p>
                          {monthName(current)}: <b className="tabular-nums text-foreground">{fmt(current.lucroAteAgora)}</b> até hoje
                          {remaining > 0 ? (
                            <>
                              {" "}
                              + {remaining} {remaining === 1 ? "dia" : "dias"} × {fmt(base.daily)} ={" "}
                              <b className="tabular-nums text-emerald-700">{fmt(current.lucro)}</b>
                            </>
                          ) : null}
                          .
                        </p>
                      </li>
                    )}
                    {base.weakest && base.strongest && (
                      <li className="flex gap-2.5">
                        <Step n={current ? 4 : 3} />
                        <p>
                          A faixa vai do ritmo de {base.weakest.split(" / ")[0].toLowerCase()} ({fmt(base.dailyLow)}/dia) ao de{" "}
                          {base.strongest.split(" / ")[0].toLowerCase()} ({fmt(base.dailyHigh)}/dia).
                        </p>
                      </li>
                    )}
                    {base.extrasClinicAvg > 0 && (
                      <li className="flex gap-2.5">
                        <Step n={(current ? 4 : 3) + (base.weakest ? 1 : 0)} />
                        <p>
                          Parte de cada um = metade do lucro + acréscimos fora da divisão. Para a clínica entra a média de{" "}
                          <b className="tabular-nums text-teal-700">{fmt(base.extrasClinicAvg)}</b> por mês (aplicações a domicílio etc.).
                        </p>
                      </li>
                    )}
                    <li className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-xs">
                      É estimativa: muda a cada venda, recebimento, compra e despesa. Mês fechado usa o valor do Fechamento 50/50.
                    </li>
                  </ol>
                ) : (
                  <div className="space-y-2 p-4" aria-hidden>
                    {Array.from({ length: 4 }, (_, i) => (
                      <span key={i} className="block h-4 w-full animate-pulse rounded bg-muted" />
                    ))}
                  </div>
                )}
              </Panel>
            </aside>
          </div>
        </>
      )}
    </PageShell>
  );
};

function Step({ n }: { n: number }) {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[11px] font-bold text-sky-700" aria-hidden>
      {n}
    </span>
  );
}

export default ProfitForecastPage;
