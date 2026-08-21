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
import { formatCurrencyBRL, formatDateTime } from "@/lib/utils";
import { getPeriodLabel, openPrintReport } from "@/lib/printReport";
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { BarChart3, Printer, ShoppingCart, Tag } from "lucide-react";
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

const CHART_COLORS = ["#059669", "#0d9488", "#0891b2", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f59e0b"];

const sumReceiptsForSaleLocal = (list: FinancialTransaction[], saleId: string) =>
  list
    .filter(
      (t) =>
        t.type === "income" &&
        t.category === "Recebimento" &&
        (t.saleId === saleId || (t.description || "").includes(saleId))
    )
    .reduce((s, r) => s + r.amount, 0);

const SalesReportsPage: React.FC = () => {
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

  const { totalVendas, totalRecebido, emAberto, chartByDay, porFormaPagamento, porCategoria, salesInPeriod, receiptsInPeriod } = useMemo(() => {
    const salesInPeriod = mockFinancialTransactions.filter(
      (t) => t.type === "income" && t.category === "Venda de Produtos" && withinRange(t.date, dateFrom, dateTo)
    );
    const receiptsInPeriod = mockFinancialTransactions.filter(
      (t) => t.type === "income" && t.category === "Recebimento" && withinRange(t.date, dateFrom, dateTo)
    );
    const totalVendas = salesInPeriod.reduce((s, t) => s + t.amount, 0);
    const totalRecebido = receiptsInPeriod.reduce((s, t) => s + t.amount, 0);
    const salesAll = mockFinancialTransactions.filter(
      (t) => t.type === "income" && t.category === "Venda de Produtos" && (t.status || "pending") !== "cancelled"
    );
    const emAberto = salesAll.reduce((s, sale) => {
      const paid = sumReceiptsForSaleLocal(mockFinancialTransactions, sale.id);
      return s + Math.max(0, sale.amount - paid);
    }, 0);

    const byDay: Record<string, number> = {};
    salesInPeriod.forEach((t) => {
      byDay[t.date] = (byDay[t.date] || 0) + t.amount;
    });
    const chartByDay = Object.entries(byDay)
      .map(([date, value]) => ({
        date: new Date(date + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        dateFull: date,
        vendas: Math.round(value * 100) / 100,
      }))
      .sort((a, b) => a.dateFull.localeCompare(b.dateFull));

    const byPm: Record<string, number> = {};
    receiptsInPeriod.forEach((t) => {
      const pm = t.paymentMethod || "Não informado";
      byPm[pm] = (byPm[pm] || 0) + t.amount;
    });
    // Filtra total <= 0 — um gráfico de pizza não desenha fatia negativa
    // (pode acontecer se o período tiver mais estorno que venda numa categoria).
    const porFormaPagamento = Object.entries(byPm)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));

    const byCat: Record<string, number> = {};
    salesInPeriod.forEach((t) => {
      const cat = t.category || "Outros";
      byCat[cat] = (byCat[cat] || 0) + t.amount;
    });
    const porCategoria = Object.entries(byCat)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));

    return { totalVendas, totalRecebido, emAberto, chartByDay, porFormaPagamento, porCategoria, salesInPeriod, receiptsInPeriod };
  }, [mockFinancialTransactions, dateFrom, dateTo]);

  const periodLabel = getPeriodLabel(periodPreset, dateFrom, dateTo);

  const barChartConfig = { vendas: { label: "Vendas", color: "#059669" } };

  const handlePrintDetailedReport = () => {
    const currency = (v: number) => formatCurrencyBRL(v);
    const salesRows = salesInPeriod
      .map((s) => `<tr><td>${formatDateTime(s.date, s.time)}</td><td>${s.description}</td><td>${s.paymentMethod || "-"}</td><td style="text-align:right">${currency(s.amount)}</td></tr>`)
      .join("");
    const receiptsRows = receiptsInPeriod
      .map((r) => `<tr><td>${formatDateTime(r.date, r.time)}</td><td>${r.description}</td><td>${r.paymentMethod || "-"}</td><td style="text-align:right">${currency(r.amount)}</td></tr>`)
      .join("");
    openPrintReport("Relatório de Vendas", `
      <h1>Relatório de Vendas</h1><p>Período: ${periodLabel}</p>
      <div class="kpi"><strong>Faturado:</strong> ${currency(totalVendas)}</div>
      <div class="kpi"><strong>Recebido:</strong> ${currency(totalRecebido)}</div>
      <div class="kpi"><strong>A receber:</strong> ${currency(emAberto)}</div>
      <h2>Vendas do período</h2>
      <table><thead><tr><th>Data</th><th>Descrição</th><th>Pagamento</th><th style="text-align:right">Valor</th></tr></thead><tbody>${salesRows || "<tr><td colspan='4'>Sem dados</td></tr>"}</tbody></table>
      <h2>Recebimentos do período</h2>
      <table><thead><tr><th>Data</th><th>Descrição</th><th>Pagamento</th><th style="text-align:right">Valor</th></tr></thead><tbody>${receiptsRows || "<tr><td colspan='4'>Sem dados</td></tr>"}</tbody></table>
    `);
  };

  return (
    <PageShell>
      <PageHeader
        title="Relatório de Vendas"
        description={`Gráficos e totais por período. Período ativo: ${periodLabel}.`}
        icon={BarChart3}
        module="sales"
        breadcrumb={<>Painel &gt; Comercial &gt; Relatórios</>}
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
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-32 border border-border bg-card" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-32 border border-border bg-card" />
              </>
            )}
            <Button variant="outline" onClick={handlePrintDetailedReport} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir PDF
            </Button>
            <Link to="/sales/my-sales">
              <Button variant="ghost" className="gap-2 text-muted-foreground">
                <ShoppingCart className="h-4 w-4" /> Vendas
              </Button>
            </Link>
          </div>
        }
      />

      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="vf-surface-card vf-tone-sales card-hover rounded-xl border-border/80">
            <CardContent className="p-4">
              <div className="text-xs text-emerald-700 font-medium">Faturado no período</div>
              <div className="text-xl font-bold text-emerald-800">
                {formatCurrencyBRL(totalVendas)}
              </div>
            </CardContent>
          </Card>
          <Card className="vf-surface-card vf-tone-sales card-hover rounded-xl border-border/80">
            <CardContent className="p-4">
              <div className="text-xs text-teal-700 font-medium">Recebido no período</div>
              <div className="text-xl font-bold text-teal-800">
                {formatCurrencyBRL(totalRecebido)}
              </div>
            </CardContent>
          </Card>
          <Card className="vf-surface-card vf-tone-sales card-hover rounded-xl border-border/80">
            <CardContent className="p-4">
              <div className="text-xs text-amber-700 font-medium">A receber (geral)</div>
              <div className="text-xl font-bold text-amber-800">
                {formatCurrencyBRL(emAberto)}
              </div>
            </CardContent>
          </Card>
          <Card className="vf-surface-card vf-tone-sales card-hover rounded-xl border-border/80">
            <CardContent className="p-4">
              <div className="text-xs text-slate-600 font-medium">Ticket médio</div>
              <div className="text-xl font-bold text-slate-800">
                {chartByDay.length > 0
                  ? formatCurrencyBRL(totalVendas / chartByDay.length)
                  : "R$ 0,00"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="vf-surface-card vf-tone-sales card-hover rounded-xl border-border/80 print:break-inside-avoid">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Vendas por dia
            </CardTitle>
            <p className="text-sm text-muted-foreground font-normal">Faturamento diário no período.</p>
          </CardHeader>
          <CardContent>
            {chartByDay.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Nenhuma venda no período.</div>
            ) : (
              <ChartContainer config={barChartConfig} className="h-[260px] w-full">
                <BarChart data={chartByDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => [formatCurrencyBRL(Number(v)), undefined]} />} />
                  <Bar dataKey="vendas" fill="#059669" radius={[4, 4, 0, 0]} name="Vendas" />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="vf-surface-card vf-tone-sales card-hover rounded-xl border-border/80 print:break-inside-avoid">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" /> Recebimentos por forma de pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {porFormaPagamento.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Nenhum recebimento no período.</div>
              ) : (
                <ChartContainer config={{}} className="h-[220px] w-full">
                  <PieChart>
                    <Pie
                      data={porFormaPagamento}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {porFormaPagamento.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip formatter={(v: number) => formatCurrencyBRL(v)} />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
          <Card className="vf-surface-card vf-tone-sales card-hover rounded-xl border-border/80 print:break-inside-avoid">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" /> Vendas por categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {porCategoria.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Nenhuma venda no período.</div>
              ) : (
                <ChartContainer config={{}} className="h-[220px] w-full">
                  <PieChart>
                    <Pie
                      data={porCategoria}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {porCategoria.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip formatter={(v: number) => formatCurrencyBRL(v)} />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground print:block hidden">
          Relatório de vendas — {formatDateTime(new Date().toISOString().split("T")[0], new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }))} — Período: {periodLabel}
        </p>
      </div>
    </PageShell>
  );
};

export default SalesReportsPage;
