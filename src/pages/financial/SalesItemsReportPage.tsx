import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardPaste, ListOrdered, Scale, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { KpiStrip, type KpiItem } from "@/components/saas/KpiStrip";
import { PeriodFilter, describePeriod, periodRange } from "@/components/saas/PeriodFilter";
import { Panel } from "@/components/finance/FinanceUI";
import { CONCEPTS } from "@/components/finance/financeTheme";
import { ReportPdfButton } from "@/components/finance/reports/ReportPdfButton";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { useCatalog } from "@/hooks/useCatalog";
import { getSaleItemsBySaleIds, type SaleItem } from "@/lib/saleItemsApi";
import { isCancelled, isSale } from "@/lib/financialSummary";
import { parseSaleObservations } from "@/lib/salePayment";
import { catalogCategoryLabel } from "@/lib/catalogCategories";
import {
  ADJUSTMENT_CATEGORY,
  buildItemReportLines,
  compareWithAgrocentro,
  parseAgrocentroReport,
  sumLines,
  totalsByDay,
} from "@/lib/salesItemReport";
import { cn, formatCurrencyBRL } from "@/lib/utils";

// Financeiro › Vendas item a item: a lista corrida do período no modelo do
// relatório da Agrocentro (código, descrição, data, quantidade, unitário,
// total) e, ao lado, o total de cada dia — com o relatório deles colado, a
// conferência dia a dia aponta onde a diferença está.

const fmt = formatCurrencyBRL;
const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const weekday = (iso: string) => WEEKDAYS[new Date(`${iso}T12:00:00`).getDay()];
const qty = (q: number) => (Number.isInteger(q) ? String(q) : q.toLocaleString("pt-BR"));
const cents = (v: number) => Math.round(v * 100);
const inRange = (date: string, p: { from: string; to: string }) => (!p.from || date >= p.from) && (!p.to || date <= p.to);

const categoryLabel = (c: string) =>
  c === ADJUSTMENT_CATEGORY ? "Descontos e acréscimos" : c === "sem_itens" ? "Vendas sem itens" : catalogCategoryLabel(c);

// O relatório colado fica no aparelho, por período — voltar à tela no dia
// seguinte não obriga a colar de novo.
const pasteKey = (from: string, to: string) => `vf:agrocentro-report:${from}_${to}`;
const readPaste = (from: string, to: string) => {
  try {
    return localStorage.getItem(pasteKey(from, to)) ?? "";
  } catch {
    return "";
  }
};

const SalesItemsReportPage: React.FC = () => {
  const { transactions, loading } = useFinancialTransactions();
  const { data: clients = [] } = useClientsList();
  const { items: catalog } = useCatalog();
  const [searchParams] = useSearchParams();
  const [period, setPeriod] = useState(() => {
    const de = searchParams.get("de") ?? "";
    const ate = searchParams.get("ate") ?? "";
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    return iso.test(de) && iso.test(ate) && de <= ate ? { from: de, to: ate } : periodRange("this-month");
  });
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [day, setDay] = useState<string | null>(null);
  const [agroText, setAgroText] = useState(() => readPaste(period.from, period.to));
  const [pasting, setPasting] = useState(false);

  useEffect(() => {
    setAgroText(readPaste(period.from, period.to));
    setDay(null);
  }, [period.from, period.to]);
  const saveAgroText = (text: string) => {
    setAgroText(text);
    try {
      if (text.trim()) localStorage.setItem(pasteKey(period.from, period.to), text);
      else localStorage.removeItem(pasteKey(period.from, period.to));
    } catch {
      /* modo privado: vale só nesta visita */
    }
  };

  const sales = useMemo(
    () => transactions.filter((t) => isSale(t) && !isCancelled(t) && inRange(t.date, period)),
    [transactions, period]
  );
  const saleIdsKey = sales.map((t) => t.id).join(",");
  useEffect(() => {
    let stale = false;
    getSaleItemsBySaleIds(saleIdsKey ? saleIdsKey.split(",") : []).then((items) => {
      if (!stale) setSaleItems(items);
    });
    return () => {
      stale = true;
    };
  }, [saleIdsKey]);

  const catalogById = useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog]);
  const lines = useMemo(() => {
    const clientById = new Map(clients.map((c) => [c.id, c]));
    const saleById = new Map(sales.map((t) => [t.id, t]));
    return buildItemReportLines({
      sales: sales.map((t) => ({
        id: t.id,
        date: t.date,
        time: t.time,
        amount: t.amount,
        description: t.description,
        discountAmount: t.discountAmount,
        surchargeAmount: t.surchargeAmount,
        financialFee: t.financialFee,
      })),
      items: saleItems,
      codeOf: (i) => (i.catalogItemId ? catalogById.get(i.catalogItemId)?.sku : undefined),
      categoryOf: (i) => (i.catalogItemId ? catalogById.get(i.catalogItemId)?.category : undefined) ?? i.category,
      peopleOf: (saleId) => {
        const t = saleById.get(saleId);
        const client = t?.relatedClientId ? clientById.get(t.relatedClientId) : undefined;
        const animal = t?.relatedAnimalId ? client?.animals?.find((a) => a.id === t.relatedAnimalId) : undefined;
        return { clientName: client?.name || parseSaleObservations(t?.observations).text?.trim() || undefined, animalName: animal?.name };
      },
    });
  }, [sales, saleItems, catalogById, clients]);

  const categories = useMemo(() => {
    const map = new Map<string, { key: string; count: number; total: number }>();
    for (const l of lines) {
      const c = map.get(l.category) ?? { key: l.category, count: 0, total: 0 };
      c.count += l.category === ADJUSTMENT_CATEGORY ? 1 : l.quantity;
      c.total += l.total;
      map.set(l.category, c);
    }
    return Array.from(map.values()).sort((a, b) => (a.key === ADJUSTMENT_CATEGORY ? 1 : b.key === ADJUSTMENT_CATEGORY ? -1 : b.total - a.total));
  }, [lines]);
  const visible = useMemo(() => lines.filter((l) => !hidden.includes(l.category)), [lines, hidden]);
  const shown = day ? visible.filter((l) => l.date === day) : visible;
  const totals = sumLines(visible);
  const days = useMemo(() => totalsByDay(visible), [visible]);

  const agro = useMemo(() => parseAgrocentroReport(agroText), [agroText]);
  const agroInPeriod = useMemo(() => agro.lines.filter((l) => inRange(l.date, period)), [agro.lines, period]);
  const agroSum = sumLines(agroInPeriod);
  const comparison = useMemo(() => (agroInPeriod.length ? compareWithAgrocentro(visible, agroInPeriod) : null), [visible, agroInPeriod]);
  const daysByDate = new Map((comparison?.days ?? []).map((d) => [d.date, d]));
  const unmatchedKeys = new Set((comparison?.days ?? []).flatMap((d) => d.onlyVetflow.map((l) => l.key)));
  const badDays = (comparison?.days ?? []).filter((d) => d.diff !== 0);
  // O relatório deles também pode não fechar: total impresso ≠ soma das linhas.
  const agroAllSum = sumLines(agro.lines);
  const printedMismatch = agro.printedTotals.filter((t) => cents(t.total) !== cents(agroAllSum.total));
  const dayRows = comparison
    ? comparison.days
    : days.map((d) => ({ date: d.date, vetflow: d.total, agro: 0, diff: 0, onlyVetflow: [], onlyAgro: [] }));
  const quantityByDay = new Map(days.map((d) => [d.date, d.quantity]));
  const detail = day ? daysByDate.get(day) : undefined;

  const periodLabel = describePeriod(period.from, period.to);
  const adjustments = visible.filter((l) => l.category === ADJUSTMENT_CATEGORY).reduce((s, l) => s + l.total, 0);

  const kpis: KpiItem[] = comparison
    ? [
        { label: "Itens vendidos", value: qty(totals.quantity), hint: `${visible.length} lançamentos · ${days.length} dias`, concept: CONCEPTS.ticket },
        { label: "Total no VetFlow", value: fmt(totals.total), concept: CONCEPTS.faturado, colorValue: true },
        { label: "Relatório da Agrocentro", value: fmt(comparison.agroTotal), hint: `${agroInPeriod.length} linhas · ${qty(agroSum.quantity)} itens`, icon: ClipboardPaste, tone: "amber" },
        comparison.diff === 0
          ? { label: "Diferença", value: "Bateu", hint: "todos os dias fecham", icon: CheckCircle2, tone: "emerald", colorValue: true, highlight: true }
          : {
              label: "Diferença (VetFlow − Agrocentro)",
              value: fmt(comparison.diff),
              hint: `${badDays.length} ${badDays.length === 1 ? "dia não bate" : "dias não batem"}`,
              icon: AlertTriangle,
              tone: "rose",
              colorValue: true,
              highlight: true,
            },
      ]
    : [
        { label: "Itens vendidos", value: qty(totals.quantity), hint: `${visible.length} lançamentos`, concept: CONCEPTS.ticket },
        {
          label: "Total no período",
          value: fmt(totals.total),
          hint: adjustments ? `itens ${fmt(totals.total - adjustments)} · ajustes ${fmt(adjustments)}` : undefined,
          concept: CONCEPTS.faturado,
          colorValue: true,
        },
        { label: "Dias com venda", value: String(days.length), hint: days.length ? `média ${fmt(totals.total / days.length)} por dia` : undefined, concept: CONCEPTS.recebido },
      ];

  const toggleCategory = (key: string) => setHidden((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const shownCategories = categories.filter((c) => !hidden.includes(c.key)).map((c) => categoryLabel(c.key));

  return (
    <PageShell>
      <PageHeader
        title="Vendas item a item"
        description="Lista corrida do período no modelo do relatório da Agrocentro — para conferir um com o outro no fechamento."
        icon={ListOrdered}
        module="finance"
        breadcrumb={<>Painel &gt; Financeiro &gt; Vendas item a item</>}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/financial/monthly-closing">
                <Scale className="h-4 w-4 text-[hsl(var(--vf-finance))]" /> Fechamento 50/50
              </Link>
            </Button>
            <Button asChild variant="ghost" className="gap-2 text-muted-foreground">
              <Link to="/financial/reports">
                <ArrowLeft className="h-4 w-4" /> Relatórios
              </Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-5">
        <PeriodFilter from={period.from} to={period.to} onChange={setPeriod} presets={["this-month", "last-month", "last-30"]} />

        <KpiStrip items={kpis} loading={loading} />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start 2xl:grid-cols-[minmax(0,1fr)_28rem]">
          <Panel
            title="Lista item a item"
            icon={ListOrdered}
            tone="sky"
            description={day ? `Só o dia ${dmy(day)} — clique no dia de novo (ao lado) para ver o período todo.` : "Mesmas colunas do relatório da Agrocentro, em ordem de data."}
            actions={
              <div className="flex items-center gap-2">
                {day && (
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setDay(null)}>
                    Dia {dm(day)} <X className="h-3.5 w-3.5" aria-label="Ver o período todo" />
                  </Button>
                )}
                <ReportPdfButton
                  fileName={`vendas-item-a-item-${period.from}-${period.to}`}
                  disabled={visible.length === 0}
                  build={() => ({
                    title: "Vendas item a item",
                    periodLabel,
                    summary: `${shownCategories.join(", ")} · ${qty(totals.quantity)} itens`,
                    columns: [
                      { label: "Código", width: "9%" },
                      { label: "Descrição", width: "40%" },
                      { label: "Data", width: "13%" },
                      { label: "Qtde", width: "8%", align: "right" },
                      { label: "Unitário", width: "14%", align: "right" },
                      { label: "Total", width: "16%", align: "right" },
                    ],
                    mainColumn: 1,
                    sections: [
                      {
                        rows: visible.map((l) => ({
                          cells: [
                            l.code ?? "",
                            l.description,
                            dmy(l.date),
                            l.category === ADJUSTMENT_CATEGORY ? "" : qty(l.quantity),
                            l.category === ADJUSTMENT_CATEGORY ? "" : fmt(l.unitPrice),
                            fmt(l.total),
                          ],
                          sub: [l.clientName, l.animalName].filter(Boolean).join(" · ") || undefined,
                          tone: l.total < 0 ? ("negative" as const) : ("normal" as const),
                        })),
                      },
                    ],
                    total: { label: `Total · ${qty(totals.quantity)} itens`, value: fmt(totals.total) },
                  })}
                />
              </div>
            }
          >
            {categories.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 border-b border-border/70 px-4 py-2.5" role="group" aria-label="Categorias">
                <span className="mr-1 text-xs font-medium text-muted-foreground">Categorias:</span>
                {categories.map((c) => {
                  const on = !hidden.includes(c.key);
                  return (
                    <button
                      key={c.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleCategory(c.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        on ? "border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100" : "border-border bg-card text-muted-foreground line-through hover:bg-muted"
                      )}
                    >
                      {categoryLabel(c.key)}
                      <span className="tabular-nums opacity-70">{c.key === ADJUSTMENT_CATEGORY ? fmt(c.total) : `${qty(c.count)}× · ${fmt(c.total)}`}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Cabeçalho no modelo da Agrocentro (no celular cada item vira 2 linhas). */}
            <div className="hidden border-b border-border/70 bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[4.5rem_minmax(0,1fr)_6.5rem_3.5rem_6.5rem_7rem] md:gap-x-3">
              <span>Código</span>
              <span>Descrição</span>
              <span>Data</span>
              <span className="text-right">Qtde</span>
              <span className="text-right">Unitário</span>
              <span className="text-right">Total</span>
            </div>
            {loading ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Carregando vendas…</p>
            ) : shown.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Nenhuma venda no período.</p>
            ) : (
              <ul>
                {shown.map((l, i) => {
                  const adjustment = l.category === ADJUSTMENT_CATEGORY;
                  const people = [l.clientName, l.animalName].filter(Boolean).join(" · ");
                  // Faixa alternada por dia: ajuda a acompanhar com o papel da Agrocentro do lado.
                  const dayIndex = days.findIndex((d) => d.date === l.date);
                  const newDay = i === 0 || shown[i - 1].date !== l.date;
                  const unmatched = unmatchedKeys.has(l.key);
                  return (
                    <li
                      key={l.key}
                      className={cn(
                        "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-4 py-2 text-sm md:grid-cols-[4.5rem_minmax(0,1fr)_6.5rem_3.5rem_6.5rem_7rem] md:items-baseline",
                        newDay && i > 0 && "border-t border-border/70",
                        dayIndex % 2 === 1 && "bg-muted/30",
                        unmatched && "bg-rose-50 dark:bg-rose-950/30"
                      )}
                    >
                      <span className="hidden tabular-nums text-muted-foreground md:block">{l.code ?? ""}</span>
                      <span className="min-w-0">
                        <span className={cn("font-medium", adjustment ? "italic text-muted-foreground" : "text-foreground")}>{l.description}</span>
                        {unmatched && <span className="ml-1.5 text-[11px] font-semibold text-rose-700">sem par na Agrocentro</span>}
                        <span className="block truncate text-xs text-muted-foreground">
                          <span className="md:hidden">
                            {dm(l.date)}
                            {l.code ? ` · ${l.code}` : ""}
                            {!adjustment ? ` · ${qty(l.quantity)}× ${fmt(l.unitPrice)}` : ""}
                            {people ? " · " : ""}
                          </span>
                          {people}
                        </span>
                      </span>
                      <span className="hidden tabular-nums text-muted-foreground md:block">{dmy(l.date)}</span>
                      <span className="hidden text-right tabular-nums md:block">{adjustment ? "" : qty(l.quantity)}</span>
                      <span className="hidden text-right tabular-nums text-muted-foreground md:block">{adjustment ? "" : fmt(l.unitPrice)}</span>
                      <span className={cn("text-right font-semibold tabular-nums", l.total < 0 ? "text-rose-700" : "text-foreground")}>{fmt(l.total)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {shown.length > 0 && (
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-t-2 border-border bg-muted/40 px-4 py-3 text-sm md:grid-cols-[4.5rem_minmax(0,1fr)_6.5rem_3.5rem_6.5rem_7rem]">
                <span className="font-semibold md:col-span-3">Total{day ? ` do dia ${dm(day)}` : ""}</span>
                <span className="hidden text-right font-semibold tabular-nums md:block">{qty(sumLines(shown).quantity)}</span>
                <span className="hidden md:block" />
                <span className="text-right text-base font-bold tabular-nums text-foreground">{fmt(sumLines(shown).total)}</span>
              </div>
            )}
          </Panel>

          <Panel
            title="Conferir com a Agrocentro"
            icon={Scale}
            tone="amber"
            description="Total de cada dia; com o relatório deles colado, aponta o dia e o lançamento que não batem."
            className="xl:sticky xl:top-4"
          >
            <div className="space-y-3 border-b border-border/70 px-4 py-3">
              {agro.lines.length > 0 && !pasting ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    Relatório colado: <span className="font-semibold text-foreground tabular-nums">{agroInPeriod.length} linhas · {fmt(agroSum.total)}</span>
                    {agro.lines.length > agroInPeriod.length && <span className="block text-xs">{agro.lines.length - agroInPeriod.length} linhas fora do período ignoradas</span>}
                  </span>
                  <span className="flex gap-1.5">
                    <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPasting(true)}>
                      Trocar
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => saveAgroText("")}>
                      Limpar
                    </Button>
                  </span>
                </div>
              ) : (
                <>
                  <label htmlFor="agro-paste" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <ClipboardPaste className="h-3.5 w-3.5" aria-hidden /> Cole aqui o relatório da Agrocentro (selecione tudo no PDF e copie)
                  </label>
                  <Textarea
                    id="agro-paste"
                    value={agroText}
                    onChange={(e) => saveAgroText(e.target.value)}
                    onBlur={() => agro.lines.length > 0 && setPasting(false)}
                    rows={4}
                    placeholder={"8931  CONSULTA  05/10/2026  1  VENDAS  1  S  120,00  120,00\n16225 APLICACAO DE MEDICACAO  05/10/2026 …"}
                    className="font-mono text-xs"
                  />
                  {agroText.trim() && agro.lines.length === 0 && (
                    <p className="text-xs text-amber-700">Não reconheci nenhuma linha. Copie do relatório "Serviços veterinários" com código, data, VENDAS e os valores.</p>
                  )}
                </>
              )}
              {printedMismatch.map((t, i) => (
                <p key={i} className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    O próprio relatório não fecha: as linhas somam <strong className="tabular-nums">{fmt(agroAllSum.total)}</strong>, mas o total impresso é{" "}
                    <strong className="tabular-nums">{fmt(t.total)}</strong> ({fmt(agroAllSum.total - t.total)} de diferença, com {qty(t.quantity)} itens).
                  </span>
                </p>
              ))}
            </div>

            {dayRows.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Nenhuma venda no período.</p>
            ) : (
              // Rolagem própria só no computador (o cartão fica fixo ao lado da lista).
              <div className="xl:max-h-[70vh] xl:overflow-y-auto">
                <div
                  className={cn(
                    "z-10 grid xl:sticky xl:top-0 gap-x-2 border-b border-border/70 bg-card px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
                    comparison ? "grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]" : "grid-cols-[4.5rem_3rem_minmax(0,1fr)]"
                  )}
                >
                  <span>Dia</span>
                  {comparison ? (
                    <>
                      <span className="text-right">VetFlow</span>
                      <span className="text-right">Agrocentro</span>
                      <span className="text-right">Diferença</span>
                    </>
                  ) : (
                    <>
                      <span className="text-right">Itens</span>
                      <span className="text-right">Total</span>
                    </>
                  )}
                </div>
                <ul>
                  {dayRows.map((d) => {
                    const on = day === d.date;
                    const wrong = d.diff !== 0;
                    return (
                      <li key={d.date} className="border-b border-border/50 last:border-0">
                        <button
                          type="button"
                          onClick={() => setDay(on ? null : d.date)}
                          aria-pressed={on}
                          className={cn(
                            "grid w-full gap-x-2 px-4 py-2 text-left text-sm transition-colors hover:bg-muted/60",
                            comparison ? "grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]" : "grid-cols-[4.5rem_3rem_minmax(0,1fr)]",
                            wrong && "bg-rose-50/70 dark:bg-rose-950/30",
                            on && "ring-2 ring-inset ring-sky-400"
                          )}
                        >
                          <span className="tabular-nums">
                            <span className="font-semibold">{dm(d.date)}</span> <span className="text-xs text-muted-foreground">{weekday(d.date)}</span>
                          </span>
                          {comparison ? (
                            <>
                              <span className="text-right tabular-nums">{fmt(d.vetflow)}</span>
                              <span className="text-right tabular-nums">{fmt(d.agro)}</span>
                              <span className={cn("flex items-center justify-end gap-1 text-right font-semibold tabular-nums", wrong ? "text-rose-700" : "text-emerald-700")}>
                                {wrong ? fmt(d.diff) : <CheckCircle2 className="h-4 w-4" aria-label="Bateu" />}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-right tabular-nums text-muted-foreground">{qty(quantityByDay.get(d.date) ?? 0)}</span>
                              <span className="text-right font-semibold tabular-nums">{fmt(d.vetflow)}</span>
                            </>
                          )}
                        </button>
                        {on && detail && wrong && (
                          <div className="space-y-2 bg-rose-50/40 px-4 pb-3 pt-1 text-xs dark:bg-rose-950/20">
                            {detail.onlyAgro.length > 0 && (
                              <div>
                                <p className="font-semibold text-amber-800 dark:text-amber-300">Só na Agrocentro (falta no VetFlow?)</p>
                                <ul className="mt-0.5 space-y-0.5">
                                  {detail.onlyAgro.map((l, i) => (
                                    <li key={i} className="flex justify-between gap-2">
                                      <span className="min-w-0 truncate">
                                        {l.code} {l.description} {l.quantity !== 1 ? `(${qty(l.quantity)}×)` : ""}
                                      </span>
                                      <span className="shrink-0 font-semibold tabular-nums">{fmt(l.total)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {detail.onlyVetflow.length > 0 && (
                              <div>
                                <p className="font-semibold text-rose-800 dark:text-rose-300">Só no VetFlow (falta na Agrocentro?)</p>
                                <ul className="mt-0.5 space-y-0.5">
                                  {detail.onlyVetflow.map((l) => (
                                    <li key={l.key} className="flex justify-between gap-2">
                                      <span className="min-w-0 truncate">
                                        {l.description}
                                        {l.clientName ? ` · ${l.clientName}` : ""}
                                      </span>
                                      <span className="shrink-0 font-semibold tabular-nums">{fmt(l.total)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </PageShell>
  );
};

export default SalesItemsReportPage;
