import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftRight, ArrowRight, BarChart3, CheckCircle2, FileDown, FileSpreadsheet, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/saas/PageHeader";
import { PageShell } from "@/components/saas/PageShell";
import { KpiStrip } from "@/components/saas/KpiStrip";
import { PeriodFilter, describePeriod, periodRange } from "@/components/saas/PeriodFilter";
import { DailyBarChart } from "@/components/saas/DailyBarChart";
import { ReceivePaymentDialog } from "@/components/sales/ReceivePaymentDialog";
import { IconChip, Panel, PaymentMethodBadge } from "@/components/finance/FinanceUI";
import { ResultBreakdown } from "@/components/finance/ResultBreakdown";
import { CONCEPTS, TONES, movementVisual, type Concept } from "@/components/finance/financeTheme";
import { ClientAvatar } from "@/components/clients/clientVisuals";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { useRegistryList } from "@/hooks/useRegistryList";
import { getSaleItemsBySaleIds, type SaleItem } from "@/lib/saleItemsApi";
import { resolveCostProvider } from "@/lib/costProviders";
import { lineProviderCost } from "@/lib/monthlyClosing";
import { computePeriodFinancials, isSale, isCancelled, sumByDay } from "@/lib/financialSummary";
import { saleBalance, summarizeSaleItems } from "@/lib/salePayment";
import { classifyTransaction } from "@/lib/financialTransactionDisplay";
import { renderPdf, openPdf } from "@/lib/pdfExport";
import { exportRowsToXlsx } from "@/lib/xlsxExport";
import { cn, formatCurrencyBRL, formatDateTime, getTodayLocalISO } from "@/lib/utils";
import type { FinancialTransaction } from "@/mockData/financial";

type Drill = "faturado" | "recebido" | "aberto" | "repasses" | "compras";

const fmt = formatCurrencyBRL;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const SALES_SERIES = [{ key: "vendas", label: "Faturado", color: "hsl(199 89% 48%)" }];

// Visão geral: quanto entrou, quanto falta receber e quanto sobra de verdade
// (a mesma conta do Fechamento 50/50). Antes eram 11 cartões — "Total
// faturado" aparecia duas vezes — e as pendências só em texto.
const FinancialPage: React.FC = () => {
  const navigate = useNavigate();
  const { transactions, loading, refetch } = useFinancialTransactions();
  const { data: dbClients } = useClientsList();
  const { list: paymentMethods } = useRegistryList("paymentMethods");
  const [period, setPeriod] = useState(() => periodRange("this-month"));
  const [periodSaleItems, setPeriodSaleItems] = useState<SaleItem[]>([]);
  const [drill, setDrill] = useState<Drill | null>(null);
  const [saleToReceive, setSaleToReceive] = useState<FinancialTransaction | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const clientById = useMemo(() => new Map((dbClients || []).map((c) => [c.id, c])), [dbClients]);
  const whoOf = (t?: FinancialTransaction | null) => {
    if (!t?.relatedClientId) return "";
    const client = clientById.get(t.relatedClientId);
    const animal = t.relatedAnimalId ? client?.animals.find((a) => a.id === t.relatedAnimalId) : undefined;
    return [client?.name, animal?.name && `(${animal.name})`].filter(Boolean).join(" ");
  };

  // Itens das vendas do período — repasses a prestador saem daqui (sale_items).
  const periodSaleIds = useMemo(
    () =>
      transactions
        .filter((t) => isSale(t) && !isCancelled(t) && (!period.from || t.date >= period.from) && (!period.to || t.date <= period.to))
        .map((t) => t.id)
        .join(","),
    [transactions, period]
  );
  useEffect(() => {
    let stale = false;
    getSaleItemsBySaleIds(periodSaleIds ? periodSaleIds.split(",") : []).then((items) => {
      if (!stale) setPeriodSaleItems(items);
    });
    return () => {
      stale = true;
    };
  }, [periodSaleIds]);

  const fin = useMemo(
    () => computePeriodFinancials(transactions, periodSaleItems, period.from, period.to),
    [transactions, periodSaleItems, period]
  );
  const c = fin.closing;
  const percentRecebido = fin.faturado > 0 ? Math.round((fin.recebido / fin.faturado) * 100) : null;
  const periodLabel = describePeriod(period.from, period.to);

  const repassesPorPrestador = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of periodSaleItems) {
      const line = lineProviderCost(item);
      if (line <= 0) continue;
      const provider = resolveCostProvider(item.costProvider, item.category, item.cost) || "Prestador externo";
      map.set(provider, (map.get(provider) || 0) + line);
    }
    return Array.from(map.entries())
      .map(([provider, amount]) => ({ provider, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [periodSaleItems]);

  const chartValues = useMemo(() => sumByDay(fin.sales, "vendas"), [fin.sales]);

  const openSalesOldestFirst = useMemo(
    () => [...fin.openSales].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)),
    [fin.openSales]
  );

  const lastMovements = useMemo(
    () =>
      transactions
        .filter((t) => (!period.from || t.date >= period.from) && (!period.to || t.date <= period.to))
        .sort((a, b) => `${b.date}T${b.time || "00:00"}`.localeCompare(`${a.date}T${a.time || "00:00"}`))
        .slice(0, 8),
    [transactions, period]
  );

  const situacao = fin.openTotal <= 0 ? "Estável" : (percentRecebido ?? 100) < 70 ? "Pendências" : "Atenção";

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const blob = await renderPdf((K) =>
        <K.FinancialOverviewPdfContent
          periodLabel={`Período: ${periodLabel}`}
          totalFaturado={fin.faturado}
          totalRecebido={fin.recebido}
          totalEmAberto={fin.openTotal}
          ticketMedio={fin.ticketMedio}
          percentRecebido={percentRecebido ?? 100}
          totalRepasses={c.custoRepasses + c.custoProdutos}
          totalCompras={c.custoCompras}
          lucroReal={c.lucroLiquido}
          margemReal={c.margemPct}
          situacao={situacao}
          lastTransactions={lastMovements}
        />
      );
      await openPdf({ blob, fileName: `visao-geral-financeira-${getTodayLocalISO()}.pdf` });
    } catch {
      toast.error("Erro ao gerar PDF da Visão geral.");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportExcel = () => {
    void exportRowsToXlsx(`visao-geral-financeira-${getTodayLocalISO()}`, [
      {
        name: "Resultado",
        headers: ["Item", "Valor"],
        rows: [
          ["Faturamento bruto", c.bruto],
          ["Repasses a prestadores", -c.custoRepasses],
          ...(c.custoProdutos > 0 ? [["Custo de produtos (vendas antigas)", -c.custoProdutos] as [string, number]] : []),
          ["Compras do almoxarifado", -c.custoCompras],
          ["Taxas de cartão", -c.taxasCartao],
          ["Lucro líquido", c.lucroLiquido],
          ["Cada parte (50/50)", c.metadeClinica],
          ["Recebido no período", fin.recebido],
          ["A receber (todas as datas)", fin.openTotal],
        ],
        currencyColumns: [1],
      },
      {
        name: "Movimentações",
        headers: ["Data", "Descrição", "Categoria", "Valor", "Tipo"],
        rows: transactions
          .filter((t) => (!period.from || t.date >= period.from) && (!period.to || t.date <= period.to))
          .map((t) => [formatDateTime(t.date, t.time), t.description, t.category || "", t.amount, classifyTransaction(t).label]),
        currencyColumns: [3],
      },
    ]);
  };

  // ------------------------------------------------------------- detalhamento
  type DrillRow = { id: string; label: string; sub: string; value: number; sale?: FinancialTransaction; method?: string };
  const drillContent: Record<Drill, { title: string; empty: string; concept: Concept; rows: DrillRow[] }> = {
    faturado: {
      title: "Vendas do período",
      empty: "Nenhuma venda no período.",
      concept: CONCEPTS.faturado,
      rows: fin.sales.map((s) => ({
        id: s.id,
        label: whoOf(s) || "Venda sem cliente",
        sub: `${summarizeSaleItems(s.description, 3)} · ${formatDateTime(s.date, s.time)}`,
        value: s.amount,
      })),
    },
    recebido: {
      title: "Recebimentos do período",
      empty: "Nenhum recebimento no período.",
      concept: CONCEPTS.recebido,
      rows: fin.receipts.map((r) => ({
        id: r.id,
        label: whoOf(r) || r.description,
        sub: `${r.amount < 0 ? "Estorno" : r.paymentMethod || "Forma não informada"} · ${formatDateTime(r.date, r.time)}`,
        value: r.amount,
        method: r.amount < 0 ? undefined : r.paymentMethod,
      })),
    },
    aberto: {
      title: "A receber (todas as datas)",
      empty: "Nenhuma venda em aberto.",
      concept: CONCEPTS.aReceber,
      rows: openSalesOldestFirst.map((s) => ({
        id: s.id,
        label: whoOf(s) || "Venda sem cliente",
        sub: `${summarizeSaleItems(s.description, 2)} · ${formatDateTime(s.date, s.time)}`,
        value: saleBalance(s),
        sale: s,
      })),
    },
    repasses: {
      title: "Repasses a prestadores",
      empty: "Nenhum repasse no período.",
      concept: CONCEPTS.repasses,
      rows:
        repassesPorPrestador.length > 0
          ? repassesPorPrestador.map((r) => ({ id: r.provider, label: r.provider, sub: "Repasse no período", value: r.amount }))
          : fin.sales
              .filter((s) => (s.supplierCost ?? 0) > 0)
              .map((s) => ({ id: s.id, label: summarizeSaleItems(s.description, 2), sub: formatDateTime(s.date, s.time), value: s.supplierCost ?? 0 })),
    },
    compras: {
      title: "Compras do almoxarifado",
      empty: "Nenhuma compra no período.",
      concept: CONCEPTS.compras,
      rows: fin.purchases.map((p) => ({ id: p.id, label: p.description, sub: formatDateTime(p.date, p.time), value: p.amount })),
    },
  };

  const signed = (v: number) => (v < 0 ? `− ${fmt(Math.abs(v))}` : fmt(v));

  return (
    <PageShell className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Visão geral"
        description={loading ? "Carregando lançamentos..." : `Financeiro · ${periodLabel}`}
        icon={Wallet}
        module="finance"
        breadcrumb={<>Painel &gt; Financeiro</>}
        className="mb-0 sm:mb-0"
        actions={
          <>
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => void handleExportPdf()} disabled={exportingPdf}>
              <FileDown className="mr-2 h-4 w-4 text-rose-600" /> {exportingPdf ? "Gerando..." : "PDF"}
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleExportExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" /> Excel
            </Button>
          </>
        }
      />

      <PeriodFilter from={period.from} to={period.to} onChange={setPeriod} />

      <KpiStrip
        loading={loading}
        items={[
          {
            label: "Faturado",
            concept: CONCEPTS.faturado,
            value: fmt(fin.faturado),
            hint: fin.sales.length > 0 ? `${plural(fin.sales.length, "venda", "vendas")} · ticket ${fmt(fin.ticketMedio)}` : "Nenhuma venda",
            onClick: () => setDrill("faturado"),
          },
          {
            label: "Recebido",
            concept: CONCEPTS.recebido,
            value: fmt(fin.recebido),
            hint: percentRecebido != null ? `${percentRecebido}% do faturado` : "—",
            onClick: () => setDrill("recebido"),
          },
          {
            label: "A receber",
            concept: CONCEPTS.aReceber,
            value: fmt(fin.openTotal),
            hint: fin.openSales.length > 0 ? `${plural(fin.openSales.length, "venda", "vendas")} · todas as datas` : "Nada em aberto",
            colorValue: fin.openTotal > 0,
            onClick: () => setDrill("aberto"),
          },
          {
            label: "Lucro líquido",
            concept: c.lucroLiquido < 0 ? { ...CONCEPTS.lucro, tone: "rose" } : CONCEPTS.lucro,
            value: fmt(c.lucroLiquido),
            hint: `margem ${c.margemPct}% · ${fmt(c.metadeClinica)} cada parte`,
            highlight: true,
            onClick: () => navigate("/financial/monthly-closing"),
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <ResultBreakdown
          closing={c}
          periodLabel={periodLabel}
          onRowClick={(key) => setDrill(key === "bruto" ? "faturado" : key === "repasses" ? "repasses" : "compras")}
        />

        <Panel title="Faturamento por dia" icon={BarChart3} tone="sky" description={periodLabel} actions={<span className="text-sm font-bold tabular-nums text-sky-700">{fmt(fin.faturado)}</span>}>
          <div className="p-3 sm:p-4">
            {fin.sales.length === 0 ? (
              <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Nenhuma venda no período.</div>
            ) : (
              <DailyBarChart values={chartValues} series={SALES_SERIES} from={period.from} to={period.to} className="h-[260px] w-full" />
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="A receber"
          icon={CONCEPTS.aReceber.icon}
          tone="amber"
          description="Da mais antiga para a mais nova"
          actions={
            <Link to="/sales/receipts" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              Recebimentos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {openSalesOldestFirst.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <CheckCircle2 className="h-5 w-5" aria-hidden />
              </span>
              <p className="mt-2 text-sm font-semibold text-foreground">Tudo recebido</p>
              <p className="text-xs text-muted-foreground">Nenhuma venda em aberto.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/70">
              {openSalesOldestFirst.slice(0, 5).map((s) => {
                const client = s.relatedClientId ? clientById.get(s.relatedClientId) : undefined;
                return (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                    <ClientAvatar name={client?.name || "?"} className="h-9 w-9 text-xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{whoOf(s) || "Venda sem cliente"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {summarizeSaleItems(s.description, 2)} · {formatDateTime(s.date)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-amber-700">{fmt(saleBalance(s))}</span>
                    <Button size="sm" className="h-8 shrink-0 font-semibold" onClick={() => setSaleToReceive(s)}>
                      Receber
                    </Button>
                  </li>
                );
              })}
              {openSalesOldestFirst.length > 5 && (
                <li className="px-4 py-2 text-xs text-muted-foreground">
                  + {plural(openSalesOldestFirst.length - 5, "venda", "vendas")} em Recebimentos
                </li>
              )}
            </ul>
          )}
        </Panel>

        <Panel
          title="Últimas movimentações"
          icon={ArrowLeftRight}
          tone="slate"
          description="Vendas, recebimentos, compras e saídas"
          actions={
            <Link to="/financial/reports" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              Relatório completo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {lastMovements.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma movimentação no período.</p>
          ) : (
            <ul className="divide-y divide-border/70">
              {lastMovements.map((t) => {
                const mv = movementVisual(t);
                const title =
                  isSale(t)
                    ? summarizeSaleItems(t.description, 2)
                    : t.category === "Recebimento"
                      ? whoOf(t) || t.description
                      : t.description;
                const cancelledSale = isSale(t) && isCancelled(t);
                return (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                    <IconChip icon={mv.icon} tone={cancelledSale ? "slate" : mv.tone} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-semibold text-foreground", cancelledSale && "text-muted-foreground line-through")}>
                        {title}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span className={cn("font-medium", TONES[mv.tone].text)}>{cancelledSale ? "Venda cancelada" : mv.label}</span>
                        <span className="tabular-nums">{formatDateTime(t.date, t.time)}</span>
                        {t.category === "Recebimento" && t.amount > 0 && t.paymentMethod && <PaymentMethodBadge method={t.paymentMethod} />}
                        {isSale(t) && whoOf(t) && <span className="truncate">{whoOf(t)}</span>}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-bold tabular-nums",
                        cancelledSale ? "text-muted-foreground line-through" : mv.sign === "+" ? "text-emerald-700" : mv.sign === "−" ? TONES[mv.tone].text : "text-foreground"
                      )}
                    >
                      {mv.sign ? `${mv.sign} ` : ""}
                      {fmt(Math.abs(t.amount))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <Dialog open={drill !== null} onOpenChange={(open) => !open && setDrill(null)}>
        <DialogContent className="flex max-h-[85vh] min-w-0 max-w-lg flex-col overflow-hidden">
          {drill && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5">
                  <IconChip icon={drillContent[drill].concept.icon} tone={drillContent[drill].concept.tone} size="sm" />
                  {drillContent[drill].title}
                </DialogTitle>
                <DialogDescription>{drill === "aberto" ? "Vendas com saldo, da mais antiga para a mais nova." : periodLabel}</DialogDescription>
              </DialogHeader>
              <div className="-mx-1 flex-1 overflow-y-auto px-1">
                {drillContent[drill].rows.length > 0 ? (
                  <ul className="divide-y divide-border/70 rounded-xl border border-border">
                    {drillContent[drill].rows.map((row) => (
                      <li key={row.id} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold text-foreground">{row.label}</p>
                          <p className="text-xs text-muted-foreground">{row.sub}</p>
                        </div>
                        <span className={cn("shrink-0 text-sm font-bold tabular-nums", row.value < 0 ? "text-rose-700" : TONES[drillContent[drill].concept.tone].text)}>
                          {signed(row.value)}
                        </span>
                        {row.sale && (
                          <Button
                            size="sm"
                            className="h-8 shrink-0 font-semibold"
                            onClick={() => {
                              setDrill(null);
                              setSaleToReceive(row.sale!);
                            }}
                          >
                            Receber
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                    {drillContent[drill].empty}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
                <span>Total</span>
                <span className={cn("text-base font-bold tabular-nums", TONES[drillContent[drill].concept.tone].text)}>
                  {signed(drillContent[drill].rows.reduce((s, r) => s + r.value, 0))}
                </span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ReceivePaymentDialog
        open={!!saleToReceive}
        onOpenChange={(open) => { if (!open) setSaleToReceive(null); }}
        sale={saleToReceive}
        clientName={saleToReceive?.relatedClientId ? clientById.get(saleToReceive.relatedClientId)?.name : undefined}
        animalName={
          saleToReceive?.relatedClientId && saleToReceive.relatedAnimalId
            ? clientById.get(saleToReceive.relatedClientId)?.animals.find((a) => a.id === saleToReceive.relatedAnimalId)?.name
            : undefined
        }
        methods={paymentMethods}
        onDone={refetch}
      />
    </PageShell>
  );
};

export default FinancialPage;
