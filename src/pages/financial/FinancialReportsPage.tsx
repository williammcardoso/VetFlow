import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatCurrencyBRL, formatDateTime, formatItemQty } from "@/lib/utils";
import { getPeriodLabel } from "@/lib/printReport";
import { toast } from "sonner";
import FinancialReportPdfContent from "@/components/FinancialReportPdfContent";
import { createPdfBlob, openPdf } from "@/lib/pdfExport";
import type { FinancialTransaction } from "@/mockData/financial";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { getSaleItemsBySaleIds, type SaleItem } from "@/lib/saleItemsApi";
import { groupRepassesByProvider, resolveCostProvider } from "@/lib/costProviders";
import { classifyTransaction } from "@/lib/financialTransactionDisplay";
import { useClientsList } from "@/hooks/useSupabaseClients";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { FileText, Printer, Wallet, TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";

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

const withinRange = (dateStr: string, from?: string, to?: string) => {
  const dt = new Date(`${dateStr}T00:00`);
  const f = from ? new Date(`${from}T00:00`) : undefined;
  const t = to ? new Date(`${to}T23:59`) : undefined;
  return (!f || dt >= f) && (!t || dt <= t);
};

const getDefaultPeriod = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${new Date(y, now.getMonth() + 1, 0).getDate()}`,
  };
};

const PERIOD_OPTIONS = [
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
  { value: "last_3", label: "Últimos 3 meses" },
  { value: "custom", label: "Escolher datas" },
];

const CHART_COLORS = {
  entradas: "hsl(142, 76%, 36%)",
  saidas: "hsl(0, 84%, 60%)",
  saldo: "hsl(215, 20%, 45%)",
  pie: ["#059669", "#0d9488", "#0891b2", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899"],
};

const sumReceiptsForSaleLocal = (list: FinancialTransaction[], saleId: string) =>
  list
    .filter(
      (t) =>
        t.type === "income" &&
        t.category === "Recebimento" &&
        (t.saleId === saleId || (t.description || "").includes(saleId))
    )
    .reduce((s, r) => s + r.amount, 0);

const FinancialReportsPage: React.FC = () => {
  const { transactions: mockFinancialTransactions } = useFinancialTransactions();
  const { data: clients = [] } = useClientsList();
  const defaultPeriod = useMemo(getDefaultPeriod, []);
  const [periodPreset, setPeriodPreset] = useState<string>("this_month");
  const [dateFrom, setDateFrom] = useState<string>(defaultPeriod.from);
  const [dateTo, setDateTo] = useState<string>(defaultPeriod.to);
  const [periodSaleItems, setPeriodSaleItems] = useState<SaleItem[]>([]);
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    if (periodPreset === "this_month") {
      setDateFrom(`${y}-${String(m + 1).padStart(2, "0")}-01`);
      setDateTo(`${y}-${String(m + 1).padStart(2, "0")}-${new Date(y, m + 1, 0).getDate()}`);
    } else if (periodPreset === "last_month") {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      setDateFrom(`${ly}-${String(lm + 1).padStart(2, "0")}-01`);
      setDateTo(`${ly}-${String(lm + 1).padStart(2, "0")}-${new Date(ly, lm + 1, 0).getDate()}`);
    } else if (periodPreset === "last_3") {
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      setDateFrom(threeMonthsAgo.toISOString().split("T")[0]);
      setDateTo(now.toISOString().split("T")[0]);
    }
  }, [periodPreset]);

  // Itens das vendas do período — base do relatório de repasses por prestador
  useEffect(() => {
    const saleIds = mockFinancialTransactions
      .filter(
        (t) =>
          withinRange(t.date, dateFrom, dateTo) &&
          t.type === "income" &&
          t.category === "Venda de Produtos" &&
          (t.status || "pending") !== "cancelled"
      )
      .map((t) => t.id);
    let cancelled = false;
    getSaleItemsBySaleIds(saleIds).then((items) => {
      if (!cancelled) setPeriodSaleItems(items);
    });
    setProviderFilter("all");
    return () => {
      cancelled = true;
    };
  }, [mockFinancialTransactions, dateFrom, dateTo]);

  const clientById = useMemo(() => {
    const map = new Map<string, { name: string; animals: Map<string, { name: string; patientCode?: number }> }>();
    for (const c of clients) {
      const animals = new Map<string, { name: string; patientCode?: number }>();
      for (const a of c.animals || []) {
        animals.set(a.id, { name: a.name, patientCode: a.patientCode });
      }
      map.set(c.id, { name: c.name, animals });
    }
    return map;
  }, [clients]);

  const repassesDetalhados = useMemo((): RepasseDetalhe[] => {
    const saleById = new Map(
      mockFinancialTransactions
        .filter(
          (t) =>
            withinRange(t.date, dateFrom, dateTo) &&
            t.type === "income" &&
            t.category === "Venda de Produtos" &&
            (t.status || "pending") !== "cancelled"
        )
        .map((t) => [t.id, t] as const)
    );

    const rows: RepasseDetalhe[] = [];
    for (const item of periodSaleItems) {
      const line = (item.cost || 0) * (item.quantity || 0);
      if (line <= 0) continue;
      const sale = saleById.get(item.saleId);
      if (!sale) continue;
      const provider =
        resolveCostProvider(item.costProvider, item.category, item.cost) || "Prestador externo";
      const client = sale.relatedClientId ? clientById.get(sale.relatedClientId) : undefined;
      const animal =
        sale.relatedAnimalId && client
          ? client.animals.get(sale.relatedAnimalId)
          : undefined;
      rows.push({
        id: item.id,
        date: sale.date,
        time: sale.time,
        saleId: sale.id,
        serviceName: item.name,
        provider,
        amount: line,
        quantity: item.quantity,
        clientId: sale.relatedClientId,
        clientName: client?.name || "Cliente não informado",
        animalId: sale.relatedAnimalId,
        animalName: animal?.name || (sale.relatedAnimalId ? "Paciente" : "Sem paciente"),
        patientCode: animal?.patientCode,
      });
    }

    return rows.sort((a, b) => {
      const A = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
      const B = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
      return B - A;
    });
  }, [periodSaleItems, mockFinancialTransactions, dateFrom, dateTo, clientById]);

  const filteredRepassesDetalhados = useMemo(() => {
    if (providerFilter === "all") return repassesDetalhados;
    return repassesDetalhados.filter((r) => r.provider === providerFilter);
  }, [repassesDetalhados, providerFilter]);

  const { faturamento, recebido, saidas, movimentos, totalEmAberto, chartByDay, receitasPorCategoria, despesasPorCategoria, totalRepasses, lucroReal, margemReal, totalTaxas, liquidoReal, margemLiquida, repassesPorPrestador } =
    useMemo(() => {
      const allInPeriod = mockFinancialTransactions.filter((t) =>
        withinRange(t.date, dateFrom, dateTo)
      );

      // Vendas emitidas no período (faturamento)
      const faturamento = allInPeriod
        .filter(t => t.type === 'income' &&
                     t.category === 'Venda de Produtos' &&
                     (t.status || 'pending') !== 'cancelled')
        .reduce((s, t) => s + t.amount, 0);

      // Pagamentos recebidos no período (caixa)
      const recebido = allInPeriod
        .filter(t => t.type === 'income' && t.category === 'Recebimento')
        .reduce((s, t) => s + t.amount, 0);

      // Saídas operacionais
      const saidas = allInPeriod
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);

      const movimentos = [...allInPeriod].sort((a, b) => {
        const A = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
        const B = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
        return B - A;
      });

      const byDay: Record<string, { entradas: number; saidas: number }> = {};
      allInPeriod.forEach((t) => {
        if (!byDay[t.date]) byDay[t.date] = { entradas: 0, saidas: 0 };
        if (t.type === "income") byDay[t.date].entradas += t.amount;
        else byDay[t.date].saidas += t.amount;
      });
      const chartByDay = Object.entries(byDay)
        .map(([date, v]) => ({
          date: new Date(date + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          dateFull: date,
          entradas: Math.round(v.entradas * 100) / 100,
          saidas: Math.round(v.saidas * 100) / 100,
          saldo: Math.round((v.entradas - v.saidas) * 100) / 100,
        }))
        .sort((a, b) => a.dateFull.localeCompare(b.dateFull));

      const recCat: Record<string, number> = {};
      const desCat: Record<string, number> = {};
      allInPeriod.forEach((t) => {
        const cat = t.category || "Outros";
        if (t.type === "income") {
          recCat[cat] = (recCat[cat] || 0) + t.amount;
        } else {
          desCat[cat] = (desCat[cat] || 0) + t.amount;
        }
      });
      // Filtra categoria com total <= 0 (ex.: mais estorno que venda nova no
      // período) — um gráfico de pizza não tem como desenhar fatia negativa.
      const receitasPorCategoria = Object.entries(recCat)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
      const despesasPorCategoria = Object.entries(desCat)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));

      // A receber geral (todas as vendas não quitadas, todos os períodos)
      const salesAll = mockFinancialTransactions.filter(
        t => t.type === 'income' &&
             t.category === 'Venda de Produtos' &&
             (t.status || 'pending') !== 'cancelled'
      );
      const totalEmAberto = salesAll.reduce((s, sale) => {
        const paid = sumReceiptsForSaleLocal(mockFinancialTransactions, sale.id);
        return s + Math.max(0, sale.amount - paid);
      }, 0);

      const vendasDoPeriodo = allInPeriod.filter(
        t => t.type === 'income' && t.category === 'Venda de Produtos' && (t.status || 'pending') !== 'cancelled'
      );

      // Taxas de operadora repassadas ao cliente
      const totalTaxas = vendasDoPeriodo.reduce((s, t) => s + (t.financialFee ?? 0), 0);

      const repassesPorPrestador = groupRepassesByProvider(periodSaleItems);
      const totalRepassesPorItem = repassesPorPrestador.reduce((s, r) => s + r.amount, 0);
      // Soma vendas com sale_items (custo por item, atual) só com vendas SEM
      // nenhum sale_item (legado puro) — antes escolhia um total OU outro
      // pra todo o período, e se houvesse os dois tipos misturados, o
      // repasse das vendas legadas sumia silenciosamente da soma.
      const saleIdsWithItems = new Set(periodSaleItems.map((i) => i.saleId));
      const totalRepassesLegado = vendasDoPeriodo
        .filter((t) => !saleIdsWithItems.has(t.id))
        .reduce((s, t) => s + (t.supplierCost ?? 0), 0);
      const totalRepasses = totalRepassesPorItem + totalRepassesLegado;
      const lucroReal = faturamento - totalRepasses;
      const liquidoReal = faturamento - totalRepasses - totalTaxas;
      const margemReal = faturamento > 0 ? Math.round((lucroReal / faturamento) * 100) : 0;
      const margemLiquida = faturamento > 0 ? Math.round((liquidoReal / faturamento) * 100) : 0;

      return {
        faturamento,
        recebido,
        saidas,
        movimentos,
        totalEmAberto,
        chartByDay,
        receitasPorCategoria,
        despesasPorCategoria,
        totalRepasses,
        lucroReal,
        margemReal,
        totalTaxas,
        liquidoReal,
        margemLiquida,
        repassesPorPrestador,
      };
    }, [mockFinancialTransactions, dateFrom, dateTo, periodSaleItems]);

  const periodLabel = getPeriodLabel(periodPreset, dateFrom, dateTo);

  const handlePrintDetailedReport = async () => {
    setExportingPdf(true);
    try {
      const blob = await createPdfBlob(
        <FinancialReportPdfContent
          periodLabel={periodLabel}
          faturamento={faturamento}
          recebido={recebido}
          totalRepasses={totalRepasses}
          totalTaxas={totalTaxas}
          lucroReal={lucroReal}
          margemReal={margemReal}
          liquidoReal={liquidoReal}
          margemLiquida={margemLiquida}
          saidas={saidas}
          totalEmAberto={totalEmAberto}
          providerFilterLabel={providerFilter !== "all" ? providerFilter : undefined}
          repassesPorPrestador={repassesPorPrestador}
          repassesDetalhados={filteredRepassesDetalhados}
          movimentos={movimentos}
        />
      );
      await openPdf({ blob, fileName: `relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.pdf` });
    } catch {
      toast.error("Erro ao gerar PDF do relatório.");
    } finally {
      setExportingPdf(false);
    }
  };

  const barChartConfig = {
    entradas: { label: "Entradas", color: CHART_COLORS.entradas },
    saidas: { label: "Saídas", color: CHART_COLORS.saidas },
  };

  const lineChartConfig = {
    entradas: { label: "Entradas", color: CHART_COLORS.entradas },
    saidas: { label: "Saídas", color: CHART_COLORS.saidas },
    saldo: { label: "Saldo do dia", color: CHART_COLORS.saldo },
  };

  return (
    <PageShell>
      <PageHeader
        title="Relatório Financeiro"
        description={`Indicadores e gráficos de entradas/saídas. Período ativo: ${periodLabel}.`}
        icon={FileText}
        module="finance"
        breadcrumb={<>Painel &gt; Financeiro &gt; Relatórios</>}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Select value={periodPreset} onValueChange={setPeriodPreset}>
              <SelectTrigger className="h-9 w-[180px] border border-border bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {periodPreset === "custom" && (
              <>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 w-32 border border-border bg-card"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 w-32 border border-border bg-card"
                />
              </>
            )}
            <Button variant="outline" onClick={() => void handlePrintDetailedReport()} disabled={exportingPdf} className="gap-2">
              <Printer className="h-4 w-4" /> {exportingPdf ? "Gerando PDF..." : "Imprimir PDF"}
            </Button>
            <Link to="/financial">
              <Button variant="ghost" className="gap-2 text-muted-foreground">
                <Wallet className="h-4 w-4" /> Ir para Financeiro
              </Button>
            </Link>
          </div>
        }
      />

      <div className="space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Faturamento bruto */}
          <Card className="vf-surface-card vf-tone-finance card-hover rounded-xl border-border/80">
            <CardContent className="p-4">
              <div className="text-xs text-emerald-700 font-medium uppercase tracking-wide">
                Faturamento Bruto
              </div>
              <div className="text-2xl font-bold text-emerald-800 mt-1">
                {formatCurrencyBRL(faturamento)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Total vendido no período</div>
            </CardContent>
          </Card>

          {/* Recebido no caixa */}
          <Card className="vf-surface-card vf-tone-finance card-hover rounded-xl border-border/80">
            <CardContent className="p-4">
              <div className="text-xs text-teal-700 font-medium uppercase tracking-wide">
                Recebido no Caixa
              </div>
              <div className="text-2xl font-bold text-teal-700 mt-1">
                {formatCurrencyBRL(recebido)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Pagamentos confirmados
              </div>
            </CardContent>
          </Card>

          {/* Repasses */}
          <Card className="vf-surface-card vf-tone-finance card-hover rounded-xl border-border/80">
            <CardContent className="p-4">
              <div className="text-xs text-amber-700 font-medium uppercase tracking-wide">
                Repasses a Prestadores
              </div>
              <div className="text-2xl font-bold text-amber-700 mt-1">
                − {formatCurrencyBRL(totalRepasses)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Labs, especialistas e fornecedores
              </div>
            </CardContent>
          </Card>

          {/* Taxas de operadora */}
          <Card className="vf-surface-card vf-tone-finance card-hover rounded-xl border-border/80">
            <CardContent className="p-4">
              <div className="text-xs text-orange-700 font-medium uppercase tracking-wide">
                Taxas de Operadora
              </div>
              <div className="text-2xl font-bold text-orange-700 mt-1">
                − {formatCurrencyBRL(totalTaxas)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Taxas repassadas ao cliente
              </div>
            </CardContent>
          </Card>

          {/* Lucro líquido real */}
          <Card className="vf-surface-card vf-tone-finance card-hover rounded-xl border-border/80">
            <CardContent className="p-4">
              <div className={`text-xs font-medium uppercase tracking-wide ${liquidoReal >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                Lucro Líquido Real
              </div>
              <div className={`text-2xl font-bold mt-1 ${liquidoReal >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {formatCurrencyBRL(liquidoReal)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Margem líquida: {margemLiquida}%
              </div>
            </CardContent>
          </Card>

          {/* Lucro real */}
          <Card className="vf-surface-card vf-tone-finance card-hover rounded-xl border-border/80">
            <CardContent className="p-4">
              <div className={`text-xs font-medium uppercase tracking-wide ${lucroReal >= 0 ? "text-teal-700" : "text-red-700"}`}>
                Lucro Real Estimado
              </div>
              <div className={`text-2xl font-bold mt-1 ${lucroReal >= 0 ? "text-teal-700" : "text-red-700"}`}>
                {formatCurrencyBRL(lucroReal)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Margem: {margemReal}% sobre faturamento
              </div>
            </CardContent>
          </Card>

          {/* Saídas */}
          <Card className="vf-surface-card vf-tone-finance card-hover rounded-xl border-border/80">
            <CardContent className="p-4">
              <div className="text-xs text-red-700 font-medium uppercase tracking-wide">Saídas Operacionais</div>
              <div className="text-2xl font-bold text-red-800 mt-1">
                {formatCurrencyBRL(saidas)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Despesas do período</div>
            </CardContent>
          </Card>

          {/* A receber */}
          <Card className="vf-surface-card vf-tone-finance card-hover rounded-xl border-border/80">
            <CardContent className="p-4">
              <div className="text-xs text-amber-700 font-medium uppercase tracking-wide">A Receber</div>
              <div className="text-2xl font-bold text-amber-800 mt-1">
                {formatCurrencyBRL(totalEmAberto)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Vendas em aberto</div>
            </CardContent>
          </Card>
        </div>

        {/* Repasses por prestador */}
        <Card className="vf-surface-card vf-tone-finance card-hover rounded-xl border-border/80 print:break-inside-avoid">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-amber-700" /> Repasses por prestador
            </CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Quanto deve ser repassado a cada lab, especialista ou fornecedor no período.
            </p>
          </CardHeader>
          <CardContent>
            {repassesPorPrestador.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nenhum repasse no período. Cadastre o custo e o prestador nos itens do catálogo.
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="py-2 h-auto">Prestador</TableHead>
                        <TableHead className="py-2 h-auto text-right">Valor</TableHead>
                        <TableHead className="py-2 h-auto text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repassesPorPrestador.map((row) => (
                        <TableRow key={row.provider}>
                          <TableCell className="py-2 font-medium text-amber-800">{row.provider}</TableCell>
                          <TableCell className="py-2 text-right font-semibold text-amber-700">
                            {formatCurrencyBRL(row.amount)}
                          </TableCell>
                          <TableCell className="py-2 text-right text-muted-foreground">
                            {totalRepasses > 0 ? Math.round((row.amount / totalRepasses) * 100) : 0}%
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t border-b-0 bg-muted/30 hover:bg-muted/30">
                        <TableCell className="py-2 font-semibold">Total</TableCell>
                        <TableCell className="py-2 text-right font-bold text-amber-700">
                          {formatCurrencyBRL(totalRepasses)}
                        </TableCell>
                        <TableCell className="py-2 text-right text-muted-foreground">100%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <ChartContainer
                  config={repassesPorPrestador.reduce(
                    (acc, _, i) => ({ ...acc, [i]: { color: CHART_COLORS.pie[i % CHART_COLORS.pie.length] } }),
                    {}
                  )}
                  className="h-[240px] w-full"
                >
                  <PieChart>
                    <Pie
                      data={repassesPorPrestador.map((r) => ({ name: r.provider, value: r.amount }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {repassesPorPrestador.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS.pie[i % CHART_COLORS.pie.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip formatter={(v: number) => formatCurrencyBRL(v)} />
                  </PieChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detalhamento: paciente x prestador */}
        <Card className="vf-surface-card vf-tone-finance card-hover rounded-xl border-border/80 print:break-inside-avoid">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-700" /> Pacientes com serviços externos
                </CardTitle>
                <p className="text-sm text-muted-foreground font-normal mt-1">
                  Quem utilizou cada prestador (lab, especialista, etc.) no período.
                </p>
              </div>
              {repassesPorPrestador.length > 0 && (
                <Select value={providerFilter} onValueChange={setProviderFilter}>
                  <SelectTrigger className="h-9 w-[220px] border border-border bg-card print:hidden">
                    <SelectValue placeholder="Filtrar prestador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os prestadores</SelectItem>
                    {repassesPorPrestador.map((r) => (
                      <SelectItem key={r.provider} value={r.provider}>
                        {r.provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredRepassesDetalhados.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nenhum paciente com repasse no período
                {providerFilter !== "all" ? " para este prestador" : ""}.
              </p>
            ) : (
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="py-2 h-auto">Data</TableHead>
                      <TableHead className="py-2 h-auto">Paciente</TableHead>
                      <TableHead className="py-2 h-auto">Tutor</TableHead>
                      <TableHead className="py-2 h-auto">Serviço</TableHead>
                      <TableHead className="py-2 h-auto">Prestador</TableHead>
                      <TableHead className="py-2 h-auto text-right">Repasse</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRepassesDetalhados.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="py-2 whitespace-nowrap text-muted-foreground">
                          {formatDateTime(row.date, row.time)}
                        </TableCell>
                        <TableCell className="py-2">
                          {row.clientId && row.animalId ? (
                            <Link
                              to={`/clients/${row.clientId}/animals/${row.animalId}/record`}
                              className="font-medium text-foreground hover:text-[hsl(var(--vf-finance))] hover:underline"
                            >
                              {row.animalName}
                              {row.patientCode != null && (
                                <span className="ml-1 text-xs text-muted-foreground">#{row.patientCode}</span>
                              )}
                            </Link>
                          ) : (
                            <span className="font-medium">{row.animalName}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-muted-foreground">{row.clientName}</TableCell>
                        <TableCell className="py-2">
                          {row.serviceName}
                          {row.quantity > 1 && (
                            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-bold leading-none text-amber-800">
                              {row.quantity}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            {row.provider}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 text-right font-semibold text-amber-700 whitespace-nowrap">
                          {formatCurrencyBRL(row.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={5} className="py-2 font-semibold">
                        Total{providerFilter !== "all" ? ` · ${providerFilter}` : ""}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          ({filteredRepassesDetalhados.length} {filteredRepassesDetalhados.length === 1 ? "item" : "itens"})
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-right font-bold text-amber-700">
                        {formatCurrencyBRL(
                          filteredRepassesDetalhados.reduce((s, r) => s + r.amount, 0)
                        )}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de barras: Entradas x Saídas por dia */}
        <Card className="vf-surface-card vf-tone-finance card-hover rounded-xl border-border/80 print:break-inside-avoid">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Entradas e saídas por dia
            </CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Valores diários no período selecionado.
            </p>
          </CardHeader>
          <CardContent>
            {chartByDay.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                Nenhum dado no período.
              </div>
            ) : (
              <ChartContainer config={barChartConfig} className="h-[280px] w-full">
                <BarChart data={chartByDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => [formatCurrencyBRL(Number(v)), undefined]} />} />
                  <Legend />
                  <Bar dataKey="entradas" fill={CHART_COLORS.entradas} radius={[4, 4, 0, 0]} name="Entradas" />
                  <Bar dataKey="saidas" fill={CHART_COLORS.saidas} radius={[4, 4, 0, 0]} name="Saídas" />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Linha: evolução do saldo dia a dia (opcional) + Pizzas lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Gráfico de linha: evolução diária */}
          <Card className="vf-surface-card vf-tone-finance card-hover rounded-xl border-border/80 print:break-inside-avoid">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Evolução diária
              </CardTitle>
              <p className="text-sm text-muted-foreground font-normal">
                Entradas, saídas e saldo por dia.
              </p>
            </CardHeader>
            <CardContent>
              {chartByDay.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                  Nenhum dado no período.
                </div>
              ) : (
                <ChartContainer config={lineChartConfig} className="h-[240px] w-full">
                  <LineChart data={chartByDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => [formatCurrencyBRL(Number(v)), undefined]} />} />
                    <Legend />
                    <Line type="monotone" dataKey="entradas" stroke={CHART_COLORS.entradas} strokeWidth={2} dot={{ r: 3 }} name="Entradas" />
                    <Line type="monotone" dataKey="saidas" stroke={CHART_COLORS.saidas} strokeWidth={2} dot={{ r: 3 }} name="Saídas" />
                    <Line type="monotone" dataKey="saldo" stroke={CHART_COLORS.saldo} strokeWidth={2} dot={{ r: 3 }} name="Saldo do dia" />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de pizza: Receitas por categoria */}
          <Card className="vf-surface-card vf-tone-finance card-hover rounded-xl border-border/80 print:break-inside-avoid">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-primary" /> Receitas por categoria
              </CardTitle>
              <p className="text-sm text-muted-foreground font-normal">
                Composição das entradas no período.
              </p>
            </CardHeader>
            <CardContent>
              {receitasPorCategoria.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                  Nenhuma receita no período.
                </div>
              ) : (
                <ChartContainer
                  config={receitasPorCategoria.reduce((acc, _, i) => ({ ...acc, [i]: { color: CHART_COLORS.pie[i % CHART_COLORS.pie.length] } }), {})}
                  className="h-[240px] w-full"
                >
                  <PieChart>
                    <Pie
                      data={receitasPorCategoria}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {receitasPorCategoria.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS.pie[i % CHART_COLORS.pie.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip formatter={(v: number) => formatCurrencyBRL(v)} />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de pizza: Despesas por categoria */}
        <Card className="vf-surface-card vf-tone-finance card-hover rounded-xl border-border/80 print:break-inside-avoid">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" /> Despesas por categoria
            </CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Composição das saídas no período.
            </p>
          </CardHeader>
          <CardContent>
            {despesasPorCategoria.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                Nenhuma despesa no período.
              </div>
            ) : (
              <ChartContainer
                config={despesasPorCategoria.reduce((acc, _, i) => ({ ...acc, [i]: { color: CHART_COLORS.pie[i % CHART_COLORS.pie.length] } }), {})}
                className="h-[240px] w-full"
              >
                <PieChart>
                  <Pie
                    data={despesasPorCategoria}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {despesasPorCategoria.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS.pie[i % CHART_COLORS.pie.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip formatter={(v: number) => formatCurrencyBRL(v)} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Detalhamento: tabela de movimentos */}
        <Card className="vf-surface-card vf-tone-finance card-hover rounded-xl border-border/80 print:break-before-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Detalhamento dos movimentos</CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Lista de entradas e saídas do período.
            </p>
          </CardHeader>
          <CardContent>
            {movimentos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhum movimento no período.</p>
            ) : (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead className="py-2 h-auto">Data</TableHead>
                      <TableHead className="py-2 h-auto">Descrição</TableHead>
                      <TableHead className="py-2 h-auto">Categoria</TableHead>
                      <TableHead className="py-2 h-auto text-right">Valor</TableHead>
                      <TableHead className="py-2 h-auto">Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentos.map((t) => {
                      const kind = classifyTransaction(t);
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="py-2">{formatDateTime(t.date, t.time)}</TableCell>
                          <TableCell className="py-2">{t.description}</TableCell>
                          <TableCell className="py-2 text-muted-foreground">{t.category}</TableCell>
                          <TableCell className="text-right py-2 font-medium">
                            <span className={cn("tabular-nums", kind.amountClass)}>
                              {kind.signal}
                              {formatCurrencyBRL(Math.abs(t.amount))}
                            </span>
                          </TableCell>
                          <TableCell className="py-2">{kind.label}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground print:block hidden">
          Relatório gerado em{" "}
          {formatDateTime(
            new Date().toISOString().split("T")[0],
            new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          )}{" "}
          — Período: {periodLabel}
        </p>
      </div>
    </PageShell>
  );
};

export default FinancialReportsPage;
