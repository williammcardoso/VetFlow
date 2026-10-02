import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight, Combine, FileDown, FileText, FlaskConical, Layers, Printer, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { KpiStrip } from "@/components/saas/KpiStrip";
import { PeriodFilter, describePeriod, periodRange } from "@/components/saas/PeriodFilter";
import { DailyBarChart } from "@/components/saas/DailyBarChart";
import { BarList } from "@/components/saas/BarList";
import { IconChip, Panel, PaymentMethodBadge } from "@/components/finance/FinanceUI";
import { ResultBreakdown } from "@/components/finance/ResultBreakdown";
import { ProviderPayoutDialog } from "@/components/finance/ProviderPayoutDialog";
import { ProviderChangePopover } from "@/components/finance/ProviderChangePopover";
import { CONCEPTS, TONES, categoryVisual, movementVisual } from "@/components/finance/financeTheme";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { useCatalog } from "@/hooks/useCatalog";
import { getSaleItemsBySaleIds, updateSaleItemProvider, type SaleItem } from "@/lib/saleItemsApi";
import { updateCatalogItem } from "@/lib/catalogApi";
import { resolveCostProvider } from "@/lib/costProviders";
import { lineProviderCost } from "@/lib/monthlyClosing";
import { catalogCategoryLabel } from "@/lib/catalogCategories";
import { computePeriodFinancials, isCancelled, isSale, revenueByCategory, sumByDay } from "@/lib/financialSummary";
import { summarizeSaleItems } from "@/lib/salePayment";
import { renderPdf, openPdf } from "@/lib/pdfExport";
import { cn, formatCurrencyBRL, formatDateTime, getTodayLocalISO } from "@/lib/utils";
import { getPatientRecordPath } from "@/utils/patientDisplayId";

type RepasseDetalhe = {
  id: string;
  date: string;
  time?: string;
  saleId: string;
  serviceName: string;
  catalogItemId?: string;
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
  { key: "entradas", label: "Entradas", color: "hsl(160 84% 39%)" },
  { key: "saidas", label: "Saídas", color: "hsl(350 89% 60%)" },
];

const FinancialReportsPage: React.FC = () => {
  const { transactions, loading } = useFinancialTransactions();
  const { data: clients = [] } = useClientsList();
  const { items: catalog, refetch: refetchCatalog } = useCatalog();
  const [period, setPeriod] = useState(() => periodRange("this-month"));
  const [periodSaleItems, setPeriodSaleItems] = useState<SaleItem[]>([]);
  // Prestadores selecionados (vazio = todos). Ctrl+clique, ou "Juntar vários"
  // no tablet, soma prestadores — ex.: Unopato + Laboratório externo, que são
  // o mesmo fornecedor e vão num repasse só.
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [multiSelect, setMultiSelect] = useState(false);
  const providerFilter = selectedProviders.length ? [...selectedProviders].sort((x, y) => x.localeCompare(y, "pt-BR")).join(" + ") : "all";
  const [payoutOpen, setPayoutOpen] = useState(false);
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
    setSelectedProviders([]);
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
        catalogItemId: item.catalogItemId,
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

  // Prestadores para trocar o destino de um serviço: os do período e os do
  // cadastro (ex.: dois laboratórios diferentes).
  const providerOptions = useMemo(() => {
    const set = new Set<string>(["Laboratório externo"]);
    for (const r of repassesDetalhados) set.add(r.provider);
    for (const item of catalog) if (item.costProvider?.trim()) set.add(item.costProvider.trim());
    return Array.from(set);
  }, [repassesDetalhados, catalog]);

  const changeRowProvider = async (row: RepasseDetalhe, provider: string, applyToCatalog: boolean): Promise<boolean> => {
    if (provider !== row.provider) {
      const ok = await updateSaleItemProvider(row.id, provider);
      if (!ok) {
        toast.error("Não consegui trocar o prestador.");
        return false;
      }
      setPeriodSaleItems((prev) => prev.map((i) => (i.id === row.id ? { ...i, costProvider: provider } : i)));
    }
    const catalogItem = applyToCatalog && row.catalogItemId ? catalogById.get(row.catalogItemId) : undefined;
    if (catalogItem && catalogItem.costProvider !== provider) {
      const ok = await updateCatalogItem({ ...catalogItem, costProvider: provider });
      if (ok) void refetchCatalog();
      else toast.warning("A venda foi corrigida, mas o cadastro do serviço não mudou.");
    }
    toast.success(`${row.serviceName} (${row.animalName}) → ${provider}`);
    return true;
  };

  const filteredRepasses = useMemo(
    () => (selectedProviders.length === 0 ? repassesDetalhados : repassesDetalhados.filter((r) => selectedProviders.includes(r.provider))),
    [repassesDetalhados, selectedProviders]
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

  // PDF de repasse: o prestador selecionado, ou todos (cada um com subtotal).
  const payoutGroups = useMemo(() => {
    const byDate = (a: RepasseDetalhe, b: RepasseDetalhe) => `${a.date}T${a.time || "00:00"}`.localeCompare(`${b.date}T${b.time || "00:00"}`);
    // Vários selecionados = um repasse só (uma observação, um subtotal), com
    // o prestador anotado em cada serviço.
    if (selectedProviders.length > 1) {
      // Ordem alfabética: o nome da junção (e a observação salva dela) não muda quando o ranking do mês muda.
      const ordered = [...selectedProviders].sort((x, y) => x.localeCompare(y, "pt-BR"));
      return [
        {
          provider: ordered.join(" + "),
          lines: [...filteredRepasses]
            .sort(byDate)
            .map((r) => ({ date: r.date, patient: r.animalName, tutor: r.clientName, service: r.serviceName, quantity: r.quantity, amount: r.amount, provider: r.provider })),
        },
      ];
    }
    const providers = selectedProviders.length === 0 ? repassesPorPrestador.map((r) => r.provider) : selectedProviders;
    return providers
      .map((provider) => ({
        provider,
        lines: [...filteredRepasses]
          .filter((r) => r.provider === provider)
          .sort((a, b) => `${a.date}T${a.time || "00:00"}`.localeCompare(`${b.date}T${b.time || "00:00"}`))
          .map((r) => ({ date: r.date, patient: r.animalName, tutor: r.clientName, service: r.serviceName, quantity: r.quantity, amount: r.amount })),
      }))
      .filter((g) => g.lines.length > 0);
  }, [selectedProviders, repassesPorPrestador, filteredRepasses]);

  const goToProviderDetail = (provider: string, additive = false) => {
    setSelectedProviders((prev) => {
      if (additive || multiSelect) return prev.includes(provider) ? prev.filter((p) => p !== provider) : [...prev, provider];
      return prev.length === 1 && prev[0] === provider ? [] : [provider];
    });
    detalhamentoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handlePrintDetailedReport = async () => {
    setExportingPdf(true);
    try {
      const blob = await renderPdf((K) =>
        <K.FinancialReportPdfContent
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
                <Wallet className="mr-2 h-4 w-4 text-[hsl(var(--vf-finance))]" /> Visão geral
              </Link>
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => void handlePrintDetailedReport()} disabled={exportingPdf}>
              <FileDown className="mr-2 h-4 w-4 text-rose-600" /> {exportingPdf ? "Gerando..." : "PDF"}
            </Button>
          </>
        }
      />

      <PeriodFilter from={period.from} to={period.to} onChange={setPeriod} className="print:hidden" />

      <KpiStrip
        loading={loading}
        items={[
          { label: "Faturamento bruto", concept: CONCEPTS.faturado, value: fmt(fin.faturado), hint: plural(fin.sales.length, "venda", "vendas") },
          { label: "Recebido no caixa", concept: CONCEPTS.recebido, value: fmt(fin.recebido), hint: plural(fin.receipts.length, "lançamento", "lançamentos") },
          {
            label: "A receber",
            concept: CONCEPTS.aReceber,
            value: fmt(fin.openTotal),
            hint: fin.openSales.length > 0 ? `${plural(fin.openSales.length, "venda", "vendas")} · todas as datas` : "Nada em aberto",
            colorValue: fin.openTotal > 0,
          },
          {
            label: "Lucro líquido",
            concept: c.lucroLiquido < 0 ? { ...CONCEPTS.lucro, tone: "rose" } : CONCEPTS.lucro,
            value: fmt(c.lucroLiquido),
            hint: `margem ${c.margemPct}% · ${fmt(c.metadeClinica)} cada parte`,
            highlight: true,
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <ResultBreakdown
          closing={c}
          periodLabel={periodLabel}
          className="print:break-inside-avoid"
          footer={
            <span className="inline-flex items-center gap-1.5">
              <CONCEPTS.saidas.icon className="h-3.5 w-3.5 text-rose-600" aria-hidden />
              Saídas operacionais: <span className="font-semibold text-rose-700">{fmt(saidasOperacionais)}</span> (fora do 50/50)
            </span>
          }
        />

        <Panel
          title="Entradas e saídas por dia"
          icon={ArrowLeftRight}
          tone="slate"
          description="Entradas = recebimentos · saídas = despesas"
          className="print:break-inside-avoid"
          actions={
            <span className="flex items-center gap-3 text-xs text-muted-foreground">
              {CASH_SERIES.map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1.5 font-medium">
                  <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: s.color }} aria-hidden />
                  {s.label}
                </span>
              ))}
            </span>
          }
        >
          <div className="p-3 sm:p-4">
            {Object.keys(cashByDay).length === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">Nenhuma movimentação no período.</div>
            ) : (
              <DailyBarChart values={cashByDay} series={CASH_SERIES} from={period.from} to={period.to} className="h-[260px] w-full" />
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Faturamento por categoria"
          icon={Layers}
          tone="sky"
          description="Itens vendidos, pela categoria do catálogo"
          className="print:break-inside-avoid"
        >
          <div className="p-3 sm:p-4">
            {porCategoria.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum item vendido no período.</p>
            ) : (
              <BarList
                items={porCategoria.map((row) => {
                  const v = categoryVisual(row.category);
                  return {
                    key: row.category ?? "",
                    label: catalogCategoryLabel(row.category),
                    value: row.value,
                    hint: pct(row.value, totalItens),
                    icon: v.icon,
                    tone: v.tone,
                  };
                })}
              />
            )}
          </div>
        </Panel>

        <Panel
          title="Despesas por categoria"
          icon={CONCEPTS.saidas.icon}
          tone="rose"
          description="Compras do almoxarifado e saídas"
          className="print:break-inside-avoid"
          actions={<span className="text-sm font-bold tabular-nums text-rose-700">{fmt(totalDespesas)}</span>}
        >
          <div className="p-3 sm:p-4">
            {despesasPorCategoria.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma despesa no período.</p>
            ) : (
              <BarList
                tone="rose"
                items={despesasPorCategoria.map((row) => ({
                  key: row.name,
                  label: row.name,
                  value: row.value,
                  hint: pct(row.value, totalDespesas),
                  icon: row.name === "Compras do almoxarifado" ? CONCEPTS.compras.icon : CONCEPTS.saidas.icon,
                  tone: row.name === "Compras do almoxarifado" ? "amber" : "rose",
                }))}
              />
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)]">
        <Panel
          title="Repasses por prestador"
          icon={CONCEPTS.repasses.icon}
          tone="orange"
          description="Quanto repassar a cada lab, especialista ou fornecedor"
          className="print:break-inside-avoid"
          actions={<span className="text-sm font-bold tabular-nums text-orange-700">{fmt(totalRepassesItens)}</span>}
        >
          <div className="p-3 sm:p-4">
            {repassesPorPrestador.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum repasse no período. O custo e o prestador ficam no cadastro do item (catálogo).
              </p>
            ) : (
              <>
                <BarList
                  tone="orange"
                  items={repassesPorPrestador.map((r) => ({
                    key: r.provider,
                    label: r.provider,
                    value: r.amount,
                    hint: pct(r.amount, totalRepassesItens),
                    icon: CONCEPTS.repasses.icon,
                  }))}
                  onSelect={goToProviderDetail}
                  selectedKeys={selectedProviders}
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 print:hidden">
                  <p className="text-xs text-muted-foreground">
                    {multiSelect ? "Toque nos prestadores para juntar ou tirar." : "Clique num prestador para ver os serviços. Ctrl+clique junta prestadores."}
                  </p>
                  <Button
                    type="button"
                    variant={multiSelect ? "default" : "outline"}
                    size="sm"
                    className={cn("h-7 gap-1 text-xs", multiSelect && "bg-orange-600 text-white hover:bg-orange-700")}
                    onClick={() => setMultiSelect((v) => !v)}
                    aria-pressed={multiSelect}
                  >
                    <Combine className="h-3.5 w-3.5" aria-hidden />
                    Juntar vários
                  </Button>
                </div>
              </>
            )}
          </div>
        </Panel>

        <Panel
          sectionRef={detalhamentoRef}
          title={
            <>
              Serviços externos
              {providerFilter !== "all" && <span className="font-medium text-orange-700"> · {providerFilter}</span>}
            </>
          }
          ariaLabel="Serviços externos por paciente"
          icon={FlaskConical}
          tone="orange"
          description="Paciente, serviço e prestador de cada repasse"
          className="scroll-mt-4 print:break-inside-avoid"
          actions={
            providerFilter !== "all" ? (
              <Button variant="ghost" size="sm" className="h-8 print:hidden" onClick={() => setSelectedProviders([])}>
                Ver todos
              </Button>
            ) : undefined
          }
        >
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
                            className="font-semibold hover:text-primary hover:underline"
                          >
                            {row.animalName}
                          </Link>
                        ) : (
                          <span className="font-semibold">{row.animalName}</span>
                        )}
                        <span className="text-muted-foreground"> · {row.clientName}</span>
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="text-foreground/80">
                          {row.serviceName}
                          {row.quantity > 1 && ` × ${row.quantity}`}
                        </span>
                        <ProviderChangePopover
                          provider={row.provider}
                          options={providerOptions}
                          serviceName={`${row.serviceName} · ${row.animalName}`}
                          canApplyToCatalog={!!row.catalogItemId && catalogById.has(row.catalogItemId)}
                          onChange={(provider, applyToCatalog) => changeRowProvider(row, provider, applyToCatalog)}
                        />
                        <span className="tabular-nums">{formatDateTime(row.date)}</span>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-orange-700">{fmt(row.amount)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-3 border-t border-border/70 bg-orange-50/40 px-4 py-2 text-sm">
                <span className="text-muted-foreground">{plural(filteredRepasses.length, "item", "itens")}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold tabular-nums text-orange-700">{fmt(filteredRepasses.reduce((s, r) => s + r.amount, 0))}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 border-orange-200 text-orange-800 hover:bg-orange-50 print:hidden"
                    onClick={() => setPayoutOpen(true)}
                    title={providerFilter === "all" ? "PDF de repasse de todos os prestadores" : `PDF de repasse — ${providerFilter}`}
                  >
                    <Printer className="h-4 w-4" aria-hidden />
                    <span className="hidden sm:inline">{providerFilter === "all" ? "PDF de todos" : selectedProviders.length > 1 ? "PDF unificado" : "PDF do repasse"}</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </Panel>
      </div>

      <Panel
        title="Movimentações"
        icon={ArrowLeftRight}
        tone="slate"
        description="Todos os lançamentos do período"
        actions={<span className="text-xs text-muted-foreground">{plural(movimentos.length, "lançamento", "lançamentos")}</span>}
      >
        {movimentos.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhum movimento no período.</p>
        ) : (
          <ul className="max-h-[480px] divide-y divide-border/70 overflow-y-auto">
            {movimentos.map((t) => {
              const mv = movementVisual(t);
              const cancelledSale = isSale(t) && isCancelled(t);
              return (
                <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <IconChip icon={mv.icon} tone={cancelledSale ? "slate" : mv.tone} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm font-semibold text-foreground", cancelledSale && "text-muted-foreground line-through")}>
                      {isSale(t) ? summarizeSaleItems(t.description, 3) : t.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span className={cn("font-medium", TONES[cancelledSale ? "rose" : mv.tone].text)}>{cancelledSale ? "Venda cancelada" : mv.label}</span>
                      {t.paymentMethod && t.category === "Recebimento" && t.amount > 0 && <PaymentMethodBadge method={t.paymentMethod} />}
                      <span className="tabular-nums">{formatDateTime(t.date, t.time)}</span>
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
      <ProviderPayoutDialog open={payoutOpen} onOpenChange={setPayoutOpen} groups={payoutGroups} periodLabel={periodLabel} />
    </PageShell>
  );
};

export default FinancialReportsPage;
