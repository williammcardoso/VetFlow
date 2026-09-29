import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileDown, FileText, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { KpiStrip } from "@/components/saas/KpiStrip";
import { PeriodFilter, describePeriod, periodRange } from "@/components/saas/PeriodFilter";
import { DailyBarChart } from "@/components/saas/DailyBarChart";
import { BarList } from "@/components/saas/BarList";
import FinancialReportPdfContent from "@/components/FinancialReportPdfContent";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { useCatalog } from "@/hooks/useCatalog";
import { getSaleItemsBySaleIds, type SaleItem } from "@/lib/saleItemsApi";
import { resolveCostProvider } from "@/lib/costProviders";
import { lineProviderCost } from "@/lib/monthlyClosing";
import { catalogCategoryLabel } from "@/lib/catalogCategories";
import { computePeriodFinancials, isCancelled, isSale, revenueByCategory, sumByDay } from "@/lib/financialSummary";
import { summarizeSaleItems } from "@/lib/salePayment";
import { classifyTransaction } from "@/lib/financialTransactionDisplay";
import { createPdfBlob, openPdf } from "@/lib/pdfExport";
import { cn, formatCurrencyBRL, formatDateTime, getTodayLocalISO } from "@/lib/utils";
import { getPatientRecordPath } from "@/utils/patientDisplayId";

type RepasseDetalhe = {
  id: string;
  date: string;
  time?: string;
  saleId: string;
  serviceName: string;
  provider: string;
  amount: number;
  quantity: number;
  clientId?: string;
  clientName: string;
  animalId?: string;
  animalName: string;
  patientCode?: number;
};

const fmt = formatCurrencyBRL;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const pct = (part: number, total: number) => (total > 0 ? `${Math.round((part / total) * 100)}%` : "");

// Entradas = dinheiro que entrou (recebimentos); saídas = despesas. Antes a
// venda e o recebimento dela entravam os dois como "entrada" — o mesmo
// dinheiro contado duas vezes.
const CASH_SERIES = [
  { key: "entradas", label: "Entradas", color: "hsl(var(--primary))" },
  { key: "saidas", label: "Saídas", color: "hsl(32 95% 52%)" },
];

const FinancialReportsPage: React.FC = () => {
  const { transactions, loading } = useFinancialTransactions();
  const { data: clients = [] } = useClientsList();
  const { items: catalog } = useCatalog();
  const [period, setPeriod] = useState(() => periodRange("this-month"));
  const [periodSaleItems, setPeriodSaleItems] = useState<SaleItem[]>([]);
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [exportingPdf, setExportingPdf] = useState(false);
  const detalhamentoRef = useRef<HTMLElement>(null);

  const periodLabel = describePeriod(period.from, period.to);
  const inPeriod = (date: string) => (!period.from || date >= period.from) && (!period.to || date <= period.to);

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
    setProviderFilter("all");
    return () => {
      stale = true;
    };
  }, [periodSaleIds]);

  const fin = useMemo(
    () => computePeriodFinancials(transactions, periodSaleItems, period.from, period.to),
    [transactions, periodSaleItems, period]
  );
  const c = fin.closing;
  const saidasOperacionais = fin.otherExpenses.reduce((s, t) => s + t.amount, 0);

  const clientById = useMemo(() => {
    const map = new Map<string, { name: string; animals: Map<string, { name: string; patientCode?: number }> }>();
    for (const cl of clients) {
      const animals = new Map<string, { name: string; patientCode?: number }>();
      for (const a of cl.animals || []) animals.set(a.id, { name: a.name, patientCode: a.patientCode });
      map.set(cl.id, { name: cl.name, animals });
    }
    return map;
  }, [clients]);
  const catalogById = useMemo(() => new Map(catalog.map((item) => [item.id, item])), [catalog]);

  const repassesDetalhados = useMemo((): RepasseDetalhe[] => {
    const saleById = new Map(fin.sales.map((t) => [t.id, t] as const));
    const rows: RepasseDetalhe[] = [];
    for (const item of periodSaleItems) {
      const line = lineProviderCost(item);
      if (line <= 0) continue;
      const sale = saleById.get(item.saleId);
      if (!sale) continue;
      const client = sale.relatedClientId ? clientById.get(sale.relatedClientId) : undefined;
      const animal = sale.relatedAnimalId && client ? client.animals.get(sale.relatedAnimalId) : undefined;
      rows.push({
        id: item.id,
        date: sale.date,
        time: sale.time,
        saleId: sale.id,
        serviceName: item.name,
        provider: resolveCostProvider(item.costProvider, item.category, item.cost) || "Prestador externo",
        amount: line,
        quantity: item.quantity,
        clientId: sale.relatedClientId,
        clientName: client?.name || "Cliente não informado",
        animalId: sale.relatedAnimalId,
        animalName: animal?.name || (sale.relatedAnimalId ? "Paciente" : "Sem paciente"),
        patientCode: animal?.patientCode,
      });
    }
    return rows.sort((a, b) => `${b.date}T${b.time || "00:00"}`.localeCompare(`${a.date}T${a.time || "00:00"}`));
  }, [periodSaleItems, fin.sales, clientById]);

  const repassesPorPrestador = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of repassesDetalhados) map.set(r.provider, (map.get(r.provider) || 0) + r.amount);
    return Array.from(map.entries())
      .map(([provider, amount]) => ({ provider, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [repassesDetalhados]);
  const totalRepassesItens = repassesPorPrestador.reduce((s, r) => s + r.amount, 0);

  const filteredRepasses = useMemo(
    () => (providerFilter === "all" ? repassesDetalhados : repassesDetalhados.filter((r) => r.provider === providerFilter)),
    [repassesDetalhados, providerFilter]
  );

  const porCategoria = useMemo(() => revenueByCategory(periodSaleItems, catalogById), [periodSaleItems, catalogById]);
  const totalItens = porCategoria.reduce((s, r) => s + r.value, 0);

  const despesasPorCategoria = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of [...fin.purchases, ...fin.otherExpenses]) {
      const key = t.category === "Estoque" ? "Compras do almoxarifado" : t.category || "Outras";
      map.set(key, (map.get(key) || 0) + t.amount);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [fin.purchases, fin.otherExpenses]);
  const totalDespesas = despesasPorCategoria.reduce((s, r) => s + r.value, 0);

  const cashByDay = useMemo(() => {
    const values = sumByDay(fin.receipts, "entradas");
    return sumByDay([...fin.purchases, ...fin.otherExpenses], "saidas", values);
  }, [fin.receipts, fin.purchases, fin.otherExpenses]);

  const movimentos = useMemo(
    () =>
      transactions
        .filter((t) => inPeriod(t.date))
        .sort((a, b) => `${b.date}T${b.time || "00:00"}`.localeCompare(`${a.date}T${a.time || "00:00"}`)),
    // inPeriod depende só de period
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, period]
  );

  const goToProviderDetail = (provider: string) => {
    setProviderFilter((prev) => (prev === provider ? "all" : provider));
    detalhamentoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handlePrintDetailedReport = async () => {
    setExportingPdf(true);
    try {
      const blob = await createPdfBlob(
        <FinancialReportPdfContent
          periodLabel={periodLabel}
          faturamento={fin.faturado}
          recebido={fin.recebido}
          totalRepasses={c.custoRepasses + c.custoProdutos}
          totalTaxas={c.taxasCartao}
          lucroReal={c.lucroLiquido + c.taxasCartao}
          margemReal={c.bruto > 0 ? Math.round(((c.lucroLiquido + c.taxasCartao) / c.bruto) * 100) : 0}
          liquidoReal={c.lucroLiquido}
          margemLiquida={c.margemPct}
          comprasAlmoxarifado={c.custoCompras}
          saidas={saidasOperacionais}
          totalEmAberto={fin.openTotal}
          providerFilterLabel={providerFilter !== "all" ? providerFilter : undefined}
          repassesPorPrestador={repassesPorPrestador}
          repassesDetalhados={filteredRepasses}
          movimentos={movimentos}
        />
      );
      await openPdf({ blob, fileName: `relatorio-financeiro-${getTodayLocalISO()}.pdf` });
    } catch {
      toast.error("Erro ao gerar PDF do relatório.");
    } finally {
      setExportingPdf(false);
    }
  };

  const resultRows: Array<{ key: string; label: string; value: number; hint?: string }> = [
    { key: "bruto", label: "Faturamento bruto", value: c.bruto, hint: plural(c.salesCount, "venda", "vendas") },
    { key: "repasses", label: "Repasses a prestadores", value: -c.custoRepasses },
    ...(c.custoProdutos > 0 ? [{ key: "produtos", label: "Custo de produtos", value: -c.custoProdutos, hint: "vendas antigas" }] : []),
    { key: "compras", label: "Compras do almoxarifado", value: -c.custoCompras },
    { key: "taxas", label: "Taxas de cartão", value: -c.taxasCartao, hint: "repassadas ao cliente" },
  ];

  return (
    <PageShell className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Relatório financeiro"
        description={`Resultado, repasses e movimentações · ${periodLabel}`}
        icon={FileText}
        module="finance"
        breadcrumb={<>Painel &gt; Financeiro &gt; Relatórios</>}
        className="mb-0 sm:mb-0"
        actions={
          <>
            <Button asChild variant="outline" className="flex-1 sm:flex-none">
              <Link to="/financial">
                <Wallet className="mr-2 h-4 w-4" /> Visão geral
              </Link>
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => void handlePrintDetailedReport()} disabled={exportingPdf}>
              <FileDown className="mr-2 h-4 w-4" /> {exportingPdf ? "Gerando..." : "PDF"}
            </Button>
          </>
        }
      />

      <PeriodFilter from={period.from} to={period.to} onChange={setPeriod} className="print:hidden" />

      <KpiStrip
        loading={loading}
        items={[
          { label: "Faturamento bruto", value: fmt(fin.faturado), hint: plural(fin.sales.length, "venda", "vendas") },
          { label: "Recebido no caixa", value: fmt(fin.recebido), hint: plural(fin.receipts.length, "lançamento", "lançamentos") },
          {
            label: "Lucro líquido",
            value: fmt(c.lucroLiquido),
            hint: `margem ${c.margemPct}% · ${fmt(c.metadeClinica)} cada parte`,
            tone: c.lucroLiquido < 0 ? "negative" : "positive",
          },
          {
            label: "A receber",
            value: fmt(fin.openTotal),
            hint: fin.openSales.length > 0 ? `${plural(fin.openSales.length, "venda", "vendas")} · todas as datas` : "Nada em aberto",
            tone: fin.openTotal > 0 ? "warning" : "default",
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm print:break-inside-avoid" aria-label="Resultado">
          <div className="flex items-baseline justify-between gap-2 border-b border-border/70 px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">Resultado</h2>
            <Link to="/financial/monthly-closing" className="text-xs font-medium text-primary hover:underline print:hidden">
              Fechamento 50/50
            </Link>
          </div>
          <ul className="divide-y divide-border/70 text-sm">
            {resultRows.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0">
                  {row.key !== "bruto" ? "− " : ""}
                  {row.label}
                  {row.hint && <span className="ml-1.5 text-xs text-muted-foreground">{row.hint}</span>}
                </span>
                <span className="shrink-0 tabular-nums">{fmt(Math.abs(row.value))}</span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 bg-muted/30 px-4 py-3">
              <span className="font-semibold">
                = Lucro líquido <span className="ml-1 text-xs font-normal text-muted-foreground">margem {c.margemPct}%</span>
              </span>
              <span className={cn("shrink-0 text-base font-semibold tabular-nums", c.lucroLiquido < 0 ? "text-red-700" : "text-emerald-700")}>
                {c.lucroLiquido < 0 ? `− ${fmt(Math.abs(c.lucroLiquido))}` : fmt(c.lucroLiquido)}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3 px-4 py-2.5 text-muted-foreground">
              <span>Saídas operacionais <span className="text-xs">(fora do 50/50)</span></span>
              <span className="shrink-0 tabular-nums">{fmt(saidasOperacionais)}</span>
            </li>
          </ul>
        </section>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm print:break-inside-avoid" aria-label="Entradas e saídas por dia">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/70 px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">Entradas e saídas por dia</h2>
            <span className="flex items-center gap-3 text-xs text-muted-foreground">
              {CASH_SERIES.map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: s.color }} aria-hidden />
                  {s.label}
                </span>
              ))}
            </span>
          </div>
          <div className="p-3 sm:p-4">
            {Object.keys(cashByDay).length === 0 ? (
              <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Nenhuma movimentação no período.</div>
            ) : (
              <DailyBarChart values={cashByDay} series={CASH_SERIES} from={period.from} to={period.to} className="h-[240px] w-full" />
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm print:break-inside-avoid" aria-label="Faturamento por categoria">
          <div className="flex items-baseline justify-between gap-2 border-b border-border/70 px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">Faturamento por categoria</h2>
            <span className="text-xs text-muted-foreground">itens vendidos</span>
          </div>
          <div className="p-3 sm:p-4">
            {porCategoria.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum item vendido no período.</p>
            ) : (
              <BarList
                items={porCategoria.map((row) => ({
                  key: row.category ?? "",
                  label: catalogCategoryLabel(row.category),
                  value: row.value,
                  hint: pct(row.value, totalItens),
                }))}
              />
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm print:break-inside-avoid" aria-label="Despesas por categoria">
          <div className="flex items-baseline justify-between gap-2 border-b border-border/70 px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">Despesas por categoria</h2>
            <span className="text-xs tabular-nums text-muted-foreground">{fmt(totalDespesas)}</span>
          </div>
          <div className="p-3 sm:p-4">
            {despesasPorCategoria.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma despesa no período.</p>
            ) : (
              <BarList
                items={despesasPorCategoria.map((row) => ({
                  key: row.name,
                  label: row.name,
                  value: row.value,
                  hint: pct(row.value, totalDespesas),
                }))}
              />
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm print:break-inside-avoid" aria-label="Repasses por prestador">
          <div className="flex items-baseline justify-between gap-2 border-b border-border/70 px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">Repasses por prestador</h2>
            <span className="text-xs tabular-nums text-muted-foreground">{fmt(totalRepassesItens)}</span>
          </div>
          <div className="p-3 sm:p-4">
            {repassesPorPrestador.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum repasse no período. O custo e o prestador ficam no cadastro do item (catálogo).
              </p>
            ) : (
              <>
                <BarList
                  items={repassesPorPrestador.map((r) => ({
                    key: r.provider,
                    label: r.provider,
                    value: r.amount,
                    hint: pct(r.amount, totalRepassesItens),
                  }))}
                  onSelect={goToProviderDetail}
                  selectedKey={providerFilter === "all" ? undefined : providerFilter}
                />
                <p className="mt-2 text-xs text-muted-foreground print:hidden">Clique num prestador para ver os pacientes e serviços.</p>
              </>
            )}
          </div>
        </section>

        <section
          ref={detalhamentoRef}
          className="min-w-0 scroll-mt-4 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm print:break-inside-avoid"
          aria-label="Pacientes com serviços externos"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">
              Serviços externos{providerFilter !== "all" && <span className="font-normal text-muted-foreground"> · {providerFilter}</span>}
            </h2>
            {providerFilter !== "all" && (
              <Button variant="ghost" size="sm" className="h-8 print:hidden" onClick={() => setProviderFilter("all")}>
                Ver todos
              </Button>
            )}
          </div>
          {filteredRepasses.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhum paciente com repasse no período.</p>
          ) : (
            <>
              <ul className="max-h-[420px] divide-y divide-border/70 overflow-y-auto">
                {filteredRepasses.map((row) => (
                  <li key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">
                        {row.clientId && row.animalId ? (
                          <Link
                            to={getPatientRecordPath(row.clientId, row.animalId, row.patientCode)}
                            className="font-medium hover:text-primary hover:underline"
                          >
                            {row.animalName}
                          </Link>
                        ) : (
                          <span className="font-medium">{row.animalName}</span>
                        )}
                        <span className="text-muted-foreground"> · {row.clientName}</span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.serviceName}
                        {row.quantity > 1 && ` × ${row.quantity}`} · {row.provider} · {formatDateTime(row.date)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{fmt(row.amount)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-border/70 bg-muted/30 px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">{plural(filteredRepasses.length, "item", "itens")}</span>
                <span className="font-semibold tabular-nums">{fmt(filteredRepasses.reduce((s, r) => s + r.amount, 0))}</span>
              </div>
            </>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm" aria-label="Movimentações">
        <div className="flex items-baseline justify-between gap-2 border-b border-border/70 px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">Movimentações</h2>
          <span className="text-xs text-muted-foreground">{plural(movimentos.length, "lançamento", "lançamentos")}</span>
        </div>
        {movimentos.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhum movimento no período.</p>
        ) : (
          <ul className="max-h-[480px] divide-y divide-border/70 overflow-y-auto">
            {movimentos.map((t) => {
              const kind = classifyTransaction(t);
              const out = t.amount < 0 || t.type === "expense";
              return (
                <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm text-foreground", isSale(t) && isCancelled(t) && "text-muted-foreground line-through")}>
                      {isSale(t) ? summarizeSaleItems(t.description, 3) : t.description}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {kind.label}
                      {t.paymentMethod ? ` · ${t.paymentMethod}` : ""} · {formatDateTime(t.date, t.time)}
                      {isSale(t) && isCancelled(t) ? " · cancelada" : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                    {out ? `− ${fmt(Math.abs(t.amount))}` : fmt(t.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </PageShell>
  );
};

export default FinancialReportsPage;
