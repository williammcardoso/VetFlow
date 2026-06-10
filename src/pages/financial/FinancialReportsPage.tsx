import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatDateTime } from "@/lib/utils";
import type { FinancialTransaction } from "@/mockData/financial";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
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
  const defaultPeriod = useMemo(getDefaultPeriod, []);
  const [periodPreset, setPeriodPreset] = useState<string>("this_month");
  const [dateFrom, setDateFrom] = useState<string>(defaultPeriod.from);
  const [dateTo, setDateTo] = useState<string>(defaultPeriod.to);

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

  const { entradas, saidas, saldo, movimentos, totalEmAberto, chartByDay, receitasPorCategoria, despesasPorCategoria } =
    useMemo(() => {
      const allInPeriod = mockFinancialTransactions.filter((t) =>
        withinRange(t.date, dateFrom, dateTo)
      );
      const entradas = allInPeriod
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0);
      const saidas = allInPeriod
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);
      const saldo = entradas - saidas;
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
      const receitasPorCategoria = Object.entries(recCat).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
      const despesasPorCategoria = Object.entries(desCat).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));

      const sales = mockFinancialTransactions.filter(
        (t) =>
          t.type === "income" &&
          t.category === "Venda de Produtos" &&
          (t.status || "pending") !== "cancelled"
      );
      const totalEmAberto = sales.reduce((s, sale) => {
        const paid = sumReceiptsForSaleLocal(mockFinancialTransactions, sale.id);
        return s + Math.max(0, sale.amount - paid);
      }, 0);

      return {
        entradas,
        saidas,
        saldo,
        movimentos,
        totalEmAberto,
        chartByDay,
        receitasPorCategoria,
        despesasPorCategoria,
      };
    }, [mockFinancialTransactions, dateFrom, dateTo]);

  const periodLabel =
    periodPreset === "this_month"
      ? "Este mês"
      : periodPreset === "last_month"
        ? "Mês passado"
        : periodPreset === "last_3"
          ? "Últimos 3 meses"
          : `${formatDateTime(dateFrom)} a ${formatDateTime(dateTo)}`;

  const handlePrintDetailedReport = () => {
    const popup = window.open("", "_blank", "width=1024,height=768");
    if (!popup) return;
    const currency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
    const movementsRows = movimentos
      .map((m) => `<tr><td>${formatDateTime(m.date, m.time)}</td><td>${m.description}</td><td>${m.category}</td><td>${m.paymentMethod || "-"}</td><td style="text-align:right">${m.type === "income" ? "+" : "-"}${currency(m.amount)}</td></tr>`)
      .join("");
    popup.document.write(`
      <html><head><title>Relatório Financeiro</title><style>
      body{font-family:Arial,sans-serif;padding:24px;color:#0f172a} h1{margin:0 0 8px} h2{margin:22px 0 8px}
      table{width:100%;border-collapse:collapse;margin-top:8px} th,td{border:1px solid #e2e8f0;padding:8px;font-size:12px} th{background:#f8fafc;text-align:left}
      .kpi{display:inline-block;margin-right:16px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}
      </style></head><body>
      <h1>Relatório Financeiro</h1><p>Período: ${periodLabel}</p>
      <div class="kpi"><strong>Entradas:</strong> ${currency(entradas)}</div>
      <div class="kpi"><strong>Saídas:</strong> ${currency(saidas)}</div>
      <div class="kpi"><strong>Saldo:</strong> ${currency(saldo)}</div>
      <div class="kpi"><strong>A receber:</strong> ${currency(totalEmAberto)}</div>
      <h2>Movimentos do período</h2>
      <table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Pagamento</th><th style="text-align:right">Valor</th></tr></thead><tbody>${movementsRows || "<tr><td colspan='5'>Sem dados</td></tr>"}</tbody></table>
      </body></html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
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
            <Button variant="outline" onClick={handlePrintDetailedReport} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir PDF
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="vf-surface-card vf-tone-finance card-hover rounded-xl border-border/80">
            <CardContent className="p-4">
              <div className="text-xs text-emerald-700 font-medium">Entradas</div>
              <div className="text-xl font-bold text-emerald-800">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(entradas)}
              </div>
            </CardContent>
          </Card>
          <Card className="vf-surface-card vf-tone-finance card-hover rounded-xl border-border/80">
            <CardContent className="p-4">
              <div className="text-xs text-red-700 font-medium">Saídas</div>
              <div className="text-xl font-bold text-red-800">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(saidas)}
              </div>
            </CardContent>
          </Card>
          <Card className="vf-surface-card vf-tone-finance card-hover rounded-xl border-border/80">
            <CardContent className="p-4">
              <div className="text-xs text-slate-600 font-medium">Saldo do período</div>
              <div className={cn("text-xl font-bold", saldo >= 0 ? "text-slate-800" : "text-red-700")}>
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(saldo)}
              </div>
            </CardContent>
          </Card>
          <Card className="vf-surface-card vf-tone-finance card-hover rounded-xl border-border/80">
            <CardContent className="p-4">
              <div className="text-xs text-amber-700 font-medium">A receber (geral)</div>
              <div className="text-xl font-bold text-amber-800">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalEmAberto)}
              </div>
            </CardContent>
          </Card>
        </div>

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
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => [new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v)), undefined]} />} />
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
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => [new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v)), undefined]} />} />
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
                    <ChartTooltip formatter={(v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)} />
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
                  <ChartTooltip formatter={(v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)} />
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
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">Data</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">Descrição</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">Categoria</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Valor</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimentos.map((t) => (
                      <tr key={t.id} className="border-b border-border/50">
                        <td className="py-2">{formatDateTime(t.date, t.time)}</td>
                        <td className="py-2">{t.description}</td>
                        <td className="py-2 text-muted-foreground">{t.category}</td>
                        <td className="text-right py-2 font-medium">
                          <span className={t.type === "income" ? "text-emerald-700" : "text-red-700"}>
                            {t.type === "income" ? "+" : "-"}
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(t.amount)}
                          </span>
                        </td>
                        <td className="py-2">{t.type === "income" ? "Entrada" : "Saída"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
