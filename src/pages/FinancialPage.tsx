import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import { mockFinancialTransactions } from "@/mockData/financial";
import {
  DollarSign,
  CheckCircle,
  AlertCircle,
  Tag,
  TrendingUp,
  Clock,
  PawPrint,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/saas/PageHeader";
import { PageShell } from "@/components/saas/PageShell";
import { SectionCard } from "@/components/saas/SectionCard";

const withinRange = (dateStr: string, from?: string, to?: string) => {
  const dt = new Date(`${dateStr}T00:00`);
  const f = from ? new Date(`${from}T00:00`) : undefined;
  const t = to ? new Date(`${to}T23:59`) : undefined;
  return (!f || dt >= f) && (!t || dt <= t);
};

const sumReceiptsForSale = (saleId: string) => {
  const receipts = mockFinancialTransactions.filter(
    (t) =>
      t.type === "income" &&
      t.category === "Recebimento" &&
      (t.saleId === saleId || (t.description || "").includes(saleId))
  );
  return receipts.reduce((s, r) => s + r.amount, 0);
};

const FinancialPage: React.FC = () => {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const data = useMemo(() => {
    // Filtro por período
    const sales = mockFinancialTransactions.filter(
      (t) => t.type === "income" && t.category === "Venda de Produtos" && withinRange(t.date, dateFrom, dateTo)
    );
    const receipts = mockFinancialTransactions.filter(
      (t) => t.type === "income" && t.category === "Recebimento" && withinRange(t.date, dateFrom, dateTo)
    );

    const totalFaturado = sales.reduce((s, t) => s + t.amount, 0);
    const totalRecebido = receipts.reduce((s, t) => s + t.amount, 0);

    let totalEmAberto = 0;
    let vendasPendentes = 0;
    sales.forEach((sale) => {
      const paid = sumReceiptsForSale(sale.id);
      const remaining = Math.max(0, sale.amount - paid);
      totalEmAberto += remaining;
      if ((sale.status || "pending") !== "cancelled" && remaining > 0) vendasPendentes += 1;
    });

    const ticketMedio = sales.length > 0 ? totalFaturado / sales.length : 0;
    const percentRecebido = totalFaturado > 0 ? Math.min(100, Math.round((totalRecebido / totalFaturado) * 100)) : 100;

    // Situação interpretativa: Estável, Atenção, Pendências
    let situacao: "Estável" | "Atenção" | "Pendências" = "Estável";
    if (totalEmAberto > 0 || vendasPendentes > 0) {
      situacao = percentRecebido < 70 ? "Pendências" : "Atenção";
    }

    // Série por dia para gráfico simples (linhas/barras)
    const byDayMap: Record<string, number> = {};
    sales.forEach((s) => {
      byDayMap[s.date] = (byDayMap[s.date] || 0) + s.amount;
    });
    const dayKeys = Object.keys(byDayMap).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const series = dayKeys.map((d) => ({ date: d, value: byDayMap[d] }));

    // Últimas transações (todas no período, ordenadas)
    const lastTransactions = mockFinancialTransactions
      .filter((t) => withinRange(t.date, dateFrom, dateTo))
      .sort((a, b) => {
        const A = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
        const B = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
        return B - A;
      })
      .slice(0, 6);

    const periodLabel =
      dateFrom && dateTo
        ? `Período: ${formatDateTime(dateFrom)} a ${formatDateTime(dateTo)}`
        : "Período: todos os registros";

    return {
      totalFaturado,
      totalRecebido,
      totalEmAberto,
      vendasPendentes,
      ticketMedio,
      percentRecebido,
      situacao,
      series,
      lastTransactions,
      periodLabel,
    };
  }, [dateFrom, dateTo]);

  const cardClass =
    "vf-surface-card vf-tone-finance rounded-xl border border-border bg-card shadow-sm transition-all hover:border-[hsl(var(--vf-finance)/0.35)] hover:shadow-md";

  // Gráfico simples com SVG barras/linha (leve e sem libs)
  const Chart = ({ points }: { points: { date: string; value: number }[] }) => {
    const width = 480;
    const height = 140;
    const padding = 24;
    const max = Math.max(1, ...points.map((p) => p.value));
    const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

    const linePath = points
      .map((p, i) => {
        const x = padding + i * step;
        const y = height - padding - (p.value / max) * (height - padding * 2);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

    return (
      <svg width={width} height={height} className="w-full h-[140px]">
        <rect x={0} y={0} width={width} height={height} className="fill-muted/45" rx={12} />
        {/* Linha de tendência */}
        <path d={linePath} stroke="hsl(var(--vf-finance))" strokeWidth={2} fill="none" />
        {/* Pontos */}
        {points.map((p, i) => {
          const x = padding + i * step;
          const y = height - padding - (p.value / max) * (height - padding * 2);
          return <circle key={i} cx={x} cy={y} r={3} fill="hsl(var(--vf-finance))" />;
        })}
      </svg>
    );
  };

  const handleExportPdf = () => {
    const popup = window.open("", "_blank", "width=1024,height=768");
    if (!popup) return;
    const currency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
    const rows = data.lastTransactions
      .map(
        (t) =>
          `<tr><td>${formatDateTime(t.date, t.time)}</td><td>${t.description}</td><td>${t.category}</td><td style="text-align:right">${currency(t.amount)}</td><td>${t.type === "income" ? "Entrada" : "Saída"}</td></tr>`
      )
      .join("");
    popup.document.write(`
      <html><head><title>Visão Geral Financeira</title><style>
      body{font-family:Arial,sans-serif;padding:24px;color:#0f172a} h1{margin:0 0 8px} h2{margin:22px 0 8px}
      table{width:100%;border-collapse:collapse;margin-top:8px} th,td{border:1px solid #e2e8f0;padding:8px;font-size:12px} th{background:#f8fafc;text-align:left}
      .kpi{display:inline-block;margin-right:16px;margin-bottom:8px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}
      </style></head><body>
      <h1>Visão Geral Financeira</h1><p>${data.periodLabel}</p>
      <div class="kpi"><strong>Total faturado:</strong> ${currency(data.totalFaturado)}</div>
      <div class="kpi"><strong>Total recebido:</strong> ${currency(data.totalRecebido)}</div>
      <div class="kpi"><strong>Em aberto:</strong> ${currency(data.totalEmAberto)}</div>
      <div class="kpi"><strong>Ticket médio:</strong> ${currency(data.ticketMedio)}</div>
      <h2>Últimas transações</h2>
      <table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th style="text-align:right">Valor</th><th>Tipo</th></tr></thead><tbody>${rows || "<tr><td colspan='5'>Sem dados</td></tr>"}</tbody></table>
      </body></html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const handleExportExcel = () => {
    const header = ["Data", "Descrição", "Categoria", "Valor", "Tipo"];
    const lines = data.lastTransactions.map((t) => [
      formatDateTime(t.date, t.time),
      t.description,
      t.category || "",
      String(t.amount).replace(".", ","),
      t.type === "income" ? "Entrada" : "Saída",
    ]);
    const csv = [header, ...lines]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visao-geral-financeira-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <PageShell>
      <PageHeader
        title="Visão Geral Financeira"
        description={data.periodLabel}
        icon={Wallet}
        module="finance"
        breadcrumb={<>Painel &gt; Financeiro</>}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl border-primary/20 shadow-sm" onClick={handleExportPdf}>
              Exportar PDF
            </Button>
            <Button variant="outline" className="rounded-xl border-primary/20 shadow-sm" onClick={handleExportExcel}>
              Exportar Excel
            </Button>
          </div>
        }
      />

      <SectionCard
        title="Período de análise"
        description="Filtre os indicadores por intervalo para leitura financeira mais precisa."
        icon={Wallet}
        tone="finance"
      >
        <div className="relative overflow-hidden rounded-xl border border-border bg-muted/30 p-4 dark:bg-muted/20">
          <PawPrint className="pointer-events-none absolute -right-2 -top-2 h-24 w-24 text-primary/10" aria-hidden />
          <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">De</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1 h-9 rounded-lg border-border bg-input"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Até</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1 h-9 rounded-lg border-border bg-input"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Painel financeiro"
        description="Resumo executivo, tendência e alertas operacionais do caixa."
        icon={TrendingUp}
        tone="finance"
      >
        <Card className={cn(cardClass, "mb-4")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Resumo Financeiro do Período</CardTitle>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                data.situacao === "Estável" &&
                  "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
                data.situacao === "Atenção" &&
                  "bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
                data.situacao === "Pendências" &&
                  "bg-red-500/15 text-red-800 dark:bg-red-500/20 dark:text-red-300"
              )}
            >
              {data.situacao}
            </span>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-0">
            <div className="rounded-xl border border-border bg-muted/40 p-3 dark:bg-muted/25">
              <div className="text-xs text-muted-foreground">Total faturado</div>
              <div className="text-2xl font-bold text-foreground">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.totalFaturado)}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3 dark:bg-muted/25">
              <div className="text-xs text-muted-foreground">% recebido</div>
              <div
                className={cn(
                  "text-2xl font-bold",
                  data.percentRecebido >= 80
                    ? "text-emerald-600 dark:text-emerald-400"
                    : data.percentRecebido >= 50
                      ? "text-vf-finance"
                      : "text-red-600 dark:text-red-400"
                )}
              >
                {data.percentRecebido}%
              </div>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3 dark:bg-muted/25">
              <div className="text-xs text-muted-foreground">Pendências</div>
              <div className={cn("text-2xl font-bold", data.totalEmAberto > 0 ? "text-red-700" : "text-green-700")}>
                {data.totalEmAberto > 0 ? "Ativas" : "Nenhuma"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Bar: KPIs menores com ícones lineares */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Card className={cardClass}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Total Faturado</div>
                <div className="text-xl font-bold text-foreground">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.totalFaturado)}
                </div>
              </div>
              <DollarSign className="h-5 w-5 text-vf-finance" />
            </CardContent>
          </Card>
          <Card className={cardClass}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Total Recebido</div>
                <div className="text-xl font-bold text-vf-finance">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.totalRecebido)}
                </div>
              </div>
              <CheckCircle className="h-5 w-5 text-vf-finance" />
            </CardContent>
          </Card>
          <Card className={cardClass}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Em Aberto</div>
                <div className={cn("text-xl font-bold", data.totalEmAberto > 0 ? "text-red-700" : "text-green-700")}>
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.totalEmAberto)}
                </div>
              </div>
              <AlertCircle className={cn("h-5 w-5", data.totalEmAberto > 0 ? "text-red-700" : "text-green-700")} />
            </CardContent>
          </Card>
          <Card className={cardClass}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Ticket Médio</div>
                <div className="text-xl font-bold text-foreground">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.ticketMedio)}
                </div>
              </div>
              <Tag className="h-5 w-5 text-vf-finance" />
            </CardContent>
          </Card>
        </div>

        {/* Main Content: Gráfico (esquerda) + Últimas transações (direita) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className={cardClass + " lg:col-span-2"}>
            <CardHeader className="pb-2 flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-vf-finance" /> Receita no período
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {data.series.length > 0 ? (
                <Chart points={data.series} />
              ) : (
                <div className="relative flex h-[140px] items-center justify-center rounded-[12px] border border-border bg-muted/35">
                  <PawPrint className="absolute h-20 w-20 text-muted-foreground/10" />
                  <p className="text-xs text-muted-foreground">Sem dados de vendas no período.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-vf-finance" /> Últimas transações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.lastTransactions.length > 0 ? (
                data.lastTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-[12px] border border-border bg-muted/30 p-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">{formatDateTime(t.date, t.time)}</span>
                      <span className="text-sm font-medium text-foreground">{t.description}</span>
                    </div>
                    <div
                      className={cn(
                        "text-sm font-bold",
                        t.type === "income" ? "text-green-700" : "text-red-700"
                      )}
                    >
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(t.amount)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[12px] border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Nenhuma transação neste período.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status e Alertas (discreto) */}
        <div className="mt-4">
          <Card className="rounded-[12px] border border-border bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Status e Alertas</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              {data.totalEmAberto > 0 || data.vendasPendentes > 0 ? (
                <>
                  <div>• Existem pendências financeiras no período.</div>
                  <div>
                    • Vendas pendentes: {data.vendasPendentes} | Em aberto:{" "}
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.totalEmAberto)}
                  </div>
                </>
              ) : (
                <div>• Tudo em dia. Nenhuma pendência financeira ativa.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Próximos passos naturais (atalhos inteligentes conectados ao contexto) */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Link to="/financial/accounts-receivable">
            <button
              type="button"
              className={cn(
                "h-10 w-full rounded-xl border border-border bg-card text-sm font-medium shadow-sm transition-colors hover:border-primary/30 hover:bg-accent",
                data.totalEmAberto > 0 && "border-red-400/60 dark:border-red-500/50"
              )}
            >
              Contas a Receber{" "}
              {data.totalEmAberto > 0 && (
                <span className="ml-2 text-red-600 dark:text-red-400">(pendências)</span>
              )}
            </button>
          </Link>
          <Link to="/financial/receipts">
            <button
              type="button"
              className="h-10 w-full rounded-xl border border-border bg-card text-sm font-medium shadow-sm transition-colors hover:border-primary/30 hover:bg-accent"
            >
              Recebimentos do período
            </button>
          </Link>
          <Link to="/financial/cash-movements">
            <button
              type="button"
              className="h-10 w-full rounded-xl border border-border bg-card text-sm font-medium shadow-sm transition-colors hover:border-primary/30 hover:bg-accent"
            >
              Caixa / Movimentações
            </button>
          </Link>
        </div>
      </SectionCard>
    </PageShell>
  );
};

export default FinancialPage;