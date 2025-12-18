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
} from "lucide-react";

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

  // Estilo base Modern SaaS (paleta branca/cinza suave e detalhes em verde/azul-petróleo)
  const cardClass =
    "bg-white border border-border rounded-[12px] shadow-sm hover:shadow-md transition-all";

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
        <rect x={0} y={0} width={width} height={height} fill="#F8F9FA" rx={12} />
        {/* Linha de tendência */}
        <path d={linePath} stroke="#0ea5a3" strokeWidth={2} fill="none" />
        {/* Pontos */}
        {points.map((p, i) => {
          const x = padding + i * step;
          const y = height - padding - (p.value / max) * (height - padding * 2);
          return <circle key={i} cx={x} cy={y} r={3} fill="#10b981" />;
        })}
      </svg>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-white" style={{ fontFamily: "Inter, ui-sans-serif, system-ui" }}>
      {/* Header compacto com filtros + ações */}
      <div className="bg-[#F8F9FA] p-6 pb-4 border-b border-border relative">
        {/* sutil contexto pet */}
        <PawPrint className="absolute right-6 top-6 h-12 w-12 text-muted-foreground/10" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Visão Geral Financeira</h1>
            <p className="text-xs text-muted-foreground mt-1">{data.periodLabel}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-md border-border">
              Exportar PDF
            </Button>
            <Button variant="outline" className="rounded-md border-border">
              Exportar Excel
            </Button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">De</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 bg-white border border-border rounded-md"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Até</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 bg-white border border-border rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Card principal: Resumo Financeiro do Período */}
      <div className="p-6">
        <Card className={cn(cardClass, "mb-4")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Resumo Financeiro do Período</CardTitle>
            <span
              className={cn(
                "text-xs px-3 py-1 rounded-full font-medium",
                data.situacao === "Estável" && "bg-green-100 text-green-700",
                data.situacao === "Atenção" && "bg-yellow-100 text-yellow-700",
                data.situacao === "Pendências" && "bg-red-100 text-red-700"
              )}
            >
              {data.situacao}
            </span>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-0">
            <div className="p-3 rounded-[12px] bg-[#F8F9FA] border border-border">
              <div className="text-xs text-muted-foreground">Total faturado</div>
              <div className="text-2xl font-bold text-foreground">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.totalFaturado)}
              </div>
            </div>
            <div className="p-3 rounded-[12px] bg-[#F8F9FA] border border-border">
              <div className="text-xs text-muted-foreground">% recebido</div>
              <div
                className={cn(
                  "text-2xl font-bold",
                  data.percentRecebido >= 80
                    ? "text-green-700"
                    : data.percentRecebido >= 50
                    ? "text-teal-700"
                    : "text-red-700"
                )}
              >
                {data.percentRecebido}%
              </div>
            </div>
            <div className="p-3 rounded-[12px] bg-[#F8F9FA] border border-border">
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
              <DollarSign className="h-5 w-5 text-teal-700" />
            </CardContent>
          </Card>
          <Card className={cardClass}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Total Recebido</div>
                <div className="text-xl font-bold text-green-700">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.totalRecebido)}
                </div>
              </div>
              <CheckCircle className="h-5 w-5 text-green-700" />
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
              <Tag className="h-5 w-5 text-teal-700" />
            </CardContent>
          </Card>
        </div>

        {/* Main Content: Gráfico (esquerda) + Últimas transações (direita) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className={cardClass + " lg:col-span-2"}>
            <CardHeader className="pb-2 flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-teal-700" /> Receita no período
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {data.series.length > 0 ? (
                <Chart points={data.series} />
              ) : (
                <div className="h-[140px] flex items-center justify-center bg-[#F8F9FA] rounded-[12px] border border-border relative">
                  <PawPrint className="absolute h-20 w-20 text-muted-foreground/10" />
                  <p className="text-xs text-muted-foreground">Sem dados de vendas no período.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-teal-700" /> Últimas transações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.lastTransactions.length > 0 ? (
                data.lastTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 bg-[#F8F9FA] rounded-[12px] border border-border flex items-center justify-between"
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
                <div className="p-3 bg-[#F8F9FA] rounded-[12px] border border-border text-xs text-muted-foreground">
                  Nenhuma transação neste período.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status e Alertas (discreto) */}
        <div className="mt-4">
          <Card className="rounded-[12px] bg-[#F8F9FA] border border-border">
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
              className={cn(
                "w-full h-10 border border-border rounded-[12px] text-sm font-medium bg-white hover:bg-[#F0F2F5] transition-colors",
                data.totalEmAberto > 0 && "border-red-300"
              )}
            >
              Contas a Receber {data.totalEmAberto > 0 && <span className="ml-2 text-red-700">(pendências)</span>}
            </button>
          </Link>
          <Link to="/financial/receipts">
            <button className="w-full h-10 border border-border rounded-[12px] text-sm font-medium bg-white hover:bg-[#F0F2F5] transition-colors">
              Recebimentos do período
            </button>
          </Link>
          <Link to="/financial/cash-movements">
            <button className="w-full h-10 border border-border rounded-[12px] text-sm font-medium bg-white hover:bg-[#F0F2F5] transition-colors">
              Caixa / Movimentações
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FinancialPage;