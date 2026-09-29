import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, FileDown, FileSpreadsheet, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/saas/PageHeader";
import { PageShell } from "@/components/saas/PageShell";
import { KpiStrip } from "@/components/saas/KpiStrip";
import { PeriodFilter, describePeriod, periodRange } from "@/components/saas/PeriodFilter";
import { DailyBarChart } from "@/components/saas/DailyBarChart";
import { ReceivePaymentDialog } from "@/components/sales/ReceivePaymentDialog";
import FinancialOverviewPdfContent from "@/components/FinancialOverviewPdfContent";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { useRegistryList } from "@/hooks/useRegistryList";
import { getSaleItemsBySaleIds, type SaleItem } from "@/lib/saleItemsApi";
import { resolveCostProvider } from "@/lib/costProviders";
import { lineProviderCost } from "@/lib/monthlyClosing";
import { computePeriodFinancials, isSale, isCancelled, sumByDay } from "@/lib/financialSummary";
import { saleBalance, summarizeSaleItems } from "@/lib/salePayment";
import { classifyTransaction } from "@/lib/financialTransactionDisplay";
import { createPdfBlob, openPdf } from "@/lib/pdfExport";
import { exportRowsToXlsx } from "@/lib/xlsxExport";
import { cn, formatCurrencyBRL, formatDateTime, getTodayLocalISO } from "@/lib/utils";
import type { FinancialTransaction } from "@/mockData/financial";

type Drill = "faturado" | "recebido" | "aberto" | "repasses" | "compras";

const fmt = formatCurrencyBRL;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const SALES_SERIES = [{ key: "vendas", label: "Faturado", color: "hsl(var(--primary))" }];

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
      const blob = await createPdfBlob(
        <FinancialOverviewPdfContent
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
    exportRowsToXlsx(`visao-geral-financeira-${getTodayLocalISO()}`, [
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
  type DrillRow = { id: string; label: string; sub: string; value: number; sale?: FinancialTransaction };
  const drillContent: Record<Drill, { title: string; empty: string; rows: DrillRow[] }> = {
    faturado: {
      title: "Vendas do período",
      empty: "Nenhuma venda no período.",
      rows: fin.sales.map((s) => ({
        id: s.id,
        label: summarizeSaleItems(s.description, 3),
        sub: [whoOf(s), formatDateTime(s.date, s.time)].filter(Boolean).join(" · "),
        value: s.amount,
      })),
    },
    recebido: {
      title: "Recebimentos do período",
      empty: "Nenhum recebimento no período.",
      rows: fin.receipts.map((r) => ({
        id: r.id,
        label: `${r.amount < 0 ? "Estorno" : r.paymentMethod || "Recebimento"}${whoOf(r) ? ` · ${whoOf(r)}` : ""}`,
        sub: formatDateTime(r.date, r.time),
        value: r.amount,
      })),
    },
    aberto: {
      title: "A receber (todas as datas)",
      empty: "Nenhuma venda em aberto.",
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
      rows: fin.purchases.map((p) => ({ id: p.id, label: p.description, sub: formatDateTime(p.date, p.time), value: p.amount })),
    },
  };

  const resultRows: Array<{ key: string; label: string; value: number; drill?: Drill; hint?: string }> = [
    { key: "bruto", label: "Faturamento bruto", value: c.bruto, drill: "faturado", hint: plural(c.salesCount, "venda", "vendas") },
    { key: "repasses", label: "Repasses a prestadores", value: -c.custoRepasses, drill: "repasses", hint: "labs, especialistas" },
    ...(c.custoProdutos > 0 ? [{ key: "produtos", label: "Custo de produtos", value: -c.custoProdutos, hint: "vendas antigas" }] : []),
    { key: "compras", label: "Compras do almoxarifado", value: -c.custoCompras, drill: "compras" as Drill, hint: "insumos" },
    ...(c.taxasCartao > 0 ? [{ key: "taxas", label: "Taxas de cartão", value: -c.taxasCartao }] : []),
  ];

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
              <FileDown className="mr-2 h-4 w-4" /> {exportingPdf ? "Gerando..." : "PDF"}
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleExportExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
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
            value: fmt(fin.faturado),
            hint: fin.sales.length > 0 ? `${plural(fin.sales.length, "venda", "vendas")} · ticket ${fmt(fin.ticketMedio)}` : "Nenhuma venda",
            onClick: () => setDrill("faturado"),
          },
          {
            label: "Recebido",
            value: fmt(fin.recebido),
            hint: percentRecebido != null ? `${percentRecebido}% do faturado` : "—",
            onClick: () => setDrill("recebido"),
          },
          {
            label: "A receber",
            value: fmt(fin.openTotal),
            hint: fin.openSales.length > 0 ? `${plural(fin.openSales.length, "venda", "vendas")} · todas as datas` : "Nada em aberto",
            tone: fin.openTotal > 0 ? "warning" : "default",
            onClick: () => setDrill("aberto"),
          },
          {
            label: "Lucro líquido",
            value: fmt(c.lucroLiquido),
            hint: `margem ${c.margemPct}% · ${fmt(c.metadeClinica)} cada parte`,
            tone: c.lucroLiquido < 0 ? "negative" : "positive",
            onClick: () => navigate("/financial/monthly-closing"),
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* Resultado (demonstrativo) — mesma conta do Fechamento 50/50 */}
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm" aria-label="Resultado do período">
          <div className="flex items-baseline justify-between gap-2 border-b border-border/70 px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">Resultado</h2>
            <span className="text-xs text-muted-foreground">{periodLabel}</span>
          </div>
          <ul className="divide-y divide-border/70 text-sm">
            {resultRows.map((row) => {
              const content = (
                <>
                  <span className="min-w-0">
                    <span className="text-foreground">{row.key !== "bruto" ? "− " : ""}{row.label}</span>
                    {row.hint && <span className="ml-1.5 text-xs text-muted-foreground">{row.hint}</span>}
                  </span>
                  <span className="shrink-0 tabular-nums text-foreground">{fmt(Math.abs(row.value))}</span>
                </>
              );
              return (
                <li key={row.key}>
                  {row.drill ? (
                    <button
                      type="button"
                      onClick={() => setDrill(row.drill!)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5">{content}</div>
                  )}
                </li>
              );
            })}
            <li className="flex items-center justify-between gap-3 bg-muted/30 px-4 py-3">
              <span className="font-semibold text-foreground">
                = Lucro líquido <span className="ml-1 text-xs font-normal text-muted-foreground">margem {c.margemPct}%</span>
              </span>
              <span className={cn("shrink-0 text-base font-semibold tabular-nums", c.lucroLiquido < 0 ? "text-red-700" : "text-emerald-700")}>
                {signed(c.lucroLiquido)}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-foreground">
                Cada parte <span className="text-xs text-muted-foreground">(clínica / agropecuária)</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-foreground">{signed(c.metadeClinica)}</span>
            </li>
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-4 py-2.5 text-xs text-muted-foreground">
            <span>Despesas fora do almoxarifado não entram no 50/50.</span>
            <Link to="/financial/monthly-closing" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              Fechamento 50/50 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* Faturamento por dia */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm" aria-label="Faturamento por dia">
          <div className="flex items-baseline justify-between gap-2 border-b border-border/70 px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">Faturamento por dia</h2>
            <span className="text-xs text-muted-foreground">{fmt(fin.faturado)}</span>
          </div>
          <div className="p-3 sm:p-4">
            {fin.sales.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">Nenhuma venda no período.</div>
            ) : (
              <DailyBarChart values={chartValues} series={SALES_SERIES} from={period.from} to={period.to} />
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* A receber */}
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm" aria-label="A receber">
          <div className="flex items-baseline justify-between gap-2 border-b border-border/70 px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">A receber</h2>
            <Link to="/sales/receipts" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Recebimentos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {openSalesOldestFirst.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Tudo recebido. Nenhuma venda em aberto.</p>
          ) : (
            <ul className="divide-y divide-border/70">
              {openSalesOldestFirst.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{whoOf(s) || "Venda sem cliente"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {summarizeSaleItems(s.description, 2)} · {formatDateTime(s.date)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{fmt(saleBalance(s))}</span>
                  <Button size="sm" className="h-8 shrink-0 font-semibold" onClick={() => setSaleToReceive(s)}>
                    Receber
                  </Button>
                </li>
              ))}
              {openSalesOldestFirst.length > 5 && (
                <li className="px-4 py-2 text-xs text-muted-foreground">
                  + {plural(openSalesOldestFirst.length - 5, "venda", "vendas")} em Recebimentos
                </li>
              )}
            </ul>
          )}
        </section>

        {/* Últimas movimentações */}
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm" aria-label="Últimas movimentações">
          <div className="flex items-baseline justify-between gap-2 border-b border-border/70 px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">Últimas movimentações</h2>
            <Link to="/financial/reports" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Relatório completo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {lastMovements.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma movimentação no período.</p>
          ) : (
            <ul className="divide-y divide-border/70">
              {lastMovements.map((t) => {
                const kind = classifyTransaction(t);
                const title =
                  isSale(t)
                    ? summarizeSaleItems(t.description, 2)
                    : t.category === "Recebimento"
                      ? [t.amount < 0 ? "Estorno" : t.paymentMethod || "Recebimento", whoOf(t)].filter(Boolean).join(" · ")
                      : t.description;
                return (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm text-foreground", isSale(t) && isCancelled(t) && "text-muted-foreground line-through")}>
                        {title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {kind.label} · {formatDateTime(t.date, t.time)}
                        {isSale(t) && whoOf(t) ? ` · ${whoOf(t)}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                      {t.amount < 0 || t.type === "expense" ? `− ${fmt(Math.abs(t.amount))}` : fmt(t.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <Dialog open={drill !== null} onOpenChange={(open) => !open && setDrill(null)}>
        <DialogContent className="flex max-h-[85vh] min-w-0 max-w-lg flex-col overflow-hidden">
          {drill && (
            <>
              <DialogHeader>
                <DialogTitle>{drillContent[drill].title}</DialogTitle>
                <DialogDescription>{drill === "aberto" ? "Vendas com saldo, da mais antiga para a mais nova." : periodLabel}</DialogDescription>
              </DialogHeader>
              <div className="-mx-1 flex-1 overflow-y-auto px-1">
                {drillContent[drill].rows.length > 0 ? (
                  <ul className="divide-y divide-border/70 rounded-xl border border-border">
                    {drillContent[drill].rows.map((row) => (
                      <li key={row.id} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-medium text-foreground">{row.label}</p>
                          <p className="text-xs text-muted-foreground">{row.sub}</p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">{signed(row.value)}</span>
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
                <span className="tabular-nums">{signed(drillContent[drill].rows.reduce((s, r) => s + r.value, 0))}</span>
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
