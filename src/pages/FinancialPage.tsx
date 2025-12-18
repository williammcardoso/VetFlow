import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaMoneyBillWave, FaCalendarAlt, FaArrowUp, FaArrowDown, FaShoppingCart } from "react-icons/fa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn, formatDateTime } from "@/lib/utils";
import { mockFinancialTransactions, FinancialTransaction } from "@/mockData/financial";

// Helper: verifica se data está no intervalo
const withinRange = (dateStr: string, from?: string, to?: string) => {
  const dt = new Date(`${dateStr}T00:00`);
  const f = from ? new Date(`${from}T00:00`) : undefined;
  const t = to ? new Date(`${to}T23:59`) : undefined;
  return (!f || dt >= f) && (!t || dt <= t);
};

// Helper: soma recebimentos de uma venda
const sumReceiptsForSale = (saleId: string) => {
  const receipts = mockFinancialTransactions.filter(
    t => t.type === "income" && t.category === "Recebimento" && (t.saleId === saleId || (t.description || "").includes(saleId))
  );
  return receipts.reduce((s, r) => s + r.amount, 0);
};

const FinancialPage: React.FC = () => {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // KPIs e situação do período (controle e interpretação)
  const kpis = useMemo(() => {
    const salesInRange = mockFinancialTransactions.filter(
      t => t.type === "income" && t.category === "Venda de Produtos" && withinRange(t.date, dateFrom, dateTo)
    );
    const receiptsInRange = mockFinancialTransactions.filter(
      t => t.type === "income" && t.category === "Recebimento" && withinRange(t.date, dateFrom, dateTo)
    );
    const totalFaturado = salesInRange.reduce((s, t) => s + t.amount, 0);
    const totalRecebido = receiptsInRange.reduce((s, t) => s + t.amount, 0);

    let totalEmAberto = 0;
    let vendasPendentes = 0;
    salesInRange.forEach(sale => {
      const paid = sumReceiptsForSale(sale.id);
      const remaining = Math.max(0, sale.amount - paid);
      totalEmAberto += remaining;
      if ((sale.status || "pending") !== "cancelled" && remaining > 0) vendasPendentes += 1;
    });

    const ticketMedio = salesInRange.length > 0 ? totalFaturado / salesInRange.length : 0;
    const percentRecebido = totalFaturado > 0 ? Math.min(100, Math.round((totalRecebido / totalFaturado) * 100)) : 100;

    // Situação do período: Estável, Atenção, Pendências
    let situacao: "Estável" | "Atenção" | "Pendências" = "Estável";
    if (totalEmAberto > 0 || vendasPendentes > 0) {
      situacao = percentRecebido < 70 ? "Pendências" : "Atenção";
    }

    // Status dos KPIs (normal, atenção, ok) — zeros como positivos
    const status = {
      faturado: totalFaturado === 0 ? "ok" : "normal",
      recebido: totalFaturado === 0 ? "ok" : (percentRecebido >= 80 ? "ok" : percentRecebido >= 50 ? "normal" : "atenção"),
      emAberto: totalEmAberto === 0 ? "ok" : "atenção",
      pendentes: vendasPendentes === 0 ? "ok" : "atenção",
      ticketMedio: ticketMedio === 0 ? "ok" : "normal",
    };

    const periodLabel = dateFrom && dateTo
      ? `Período: ${formatDateTime(dateFrom)} a ${formatDateTime(dateTo)}`
      : "Período: todos os registros";

    return {
      totals: { totalFaturado, totalRecebido, totalEmAberto, vendasPendentes, ticketMedio, percentRecebido },
      situacao,
      status,
      periodLabel,
      alerts: {
        hasPendencias: totalEmAberto > 0 || vendasPendentes > 0,
        allPaid: totalEmAberto === 0 && vendasPendentes === 0 && totalFaturado > 0,
      },
    };
  }, [dateFrom, dateTo]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-gradient-to-r from-background via-card to-background p-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground">
            <FaMoneyBillWave className="h-5 w-5 text-muted-foreground" /> Visão Geral Financeira
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">Painel &gt; Financeiro &gt; Visão geral</p>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">De</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 bg-input border border-border rounded-md" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Até</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 bg-input border border-border rounded-md" />
        </div>
        <div className="flex items-end">
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><FaCalendarAlt className="h-3 w-3" /> {dateFrom ? formatDateTime(dateFrom) : "Período"} → {dateTo ? formatDateTime(dateTo) : "Atual"}</div>
          </div>
        </div>
      </div>

      {/* Indicador do período analisado */}
      <div className="px-6 -mt-2 mb-4 text-xs text-muted-foreground">
        <div>{kpis.periodLabel}</div>
      </div>

      {/* Card principal: Resumo Financeiro do Período */}
      <div className="px-6 mb-4">
        <Card className="border border-border rounded-md shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Resumo Financeiro do Período</CardTitle>
            <span className={
              cn(
                "text-xs px-3 py-1 rounded-full font-medium",
                kpis.situacao === "Estável" && "bg-green-100 text-green-800",
                kpis.situacao === "Atenção" && "bg-yellow-100 text-yellow-800",
                kpis.situacao === "Pendências" && "bg-red-100 text-red-800"
              )
            }>
              {kpis.situacao}
            </span>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-0">
            <div className="p-3 rounded-md bg-muted/40 border border-border">
              <div className="text-xs text-muted-foreground">Total faturado</div>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(kpis.totals.totalFaturado)}
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted/40 border border-border">
              <div className="text-xs text-muted-foreground">% efetivamente recebido</div>
              <div className={cn("text-2xl font-bold", kpis.totals.percentRecebido >= 80 ? "text-green-700" : kpis.totals.percentRecebido >= 50 ? "text-yellow-700" : "text-red-700")}>
                {kpis.totals.percentRecebido}%
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted/40 border border-border">
              <div className="text-xs text-muted-foreground">Pendências financeiras</div>
              <div className={cn("text-2xl font-bold", kpis.alerts.hasPendencias ? "text-red-700" : "text-green-700")}>
                {kpis.alerts.hasPendencias ? "Ativas" : "Nenhuma"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs complementares com status (explicam o card principal) */}
      <div className="px-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Total faturado */}
        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total faturado</CardTitle>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              kpis.status.faturado === "ok" && "bg-green-100 text-green-800",
              kpis.status.faturado === "normal" && "bg-gray-100 text-gray-700",
              kpis.status.faturado === "atenção" && "bg-yellow-100 text-yellow-800"
            )}>
              {kpis.status.faturado === "ok" ? "ok" : kpis.status.faturado === "atenção" ? "atenção" : "normal"}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(kpis.totals.totalFaturado)}
            </div>
            <p className="text-xs text-muted-foreground">Vendas no período.</p>
          </CardContent>
        </Card>

        {/* Total recebido */}
        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total recebido</CardTitle>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              kpis.status.recebido === "ok" && "bg-green-100 text-green-800",
              kpis.status.recebido === "normal" && "bg-gray-100 text-gray-700",
              kpis.status.recebido === "atenção" && "bg-yellow-100 text-yellow-800"
            )}>
              {kpis.status.recebido}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(kpis.totals.totalRecebido)}
            </div>
            <p className="text-xs text-muted-foreground">Baixas/recebimentos do período.</p>
          </CardContent>
        </Card>

        {/* Em aberto */}
        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Em aberto</CardTitle>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              kpis.status.emAberto === "ok" && "bg-green-100 text-green-800",
              kpis.status.emAberto === "atenção" && "bg-yellow-100 text-yellow-800"
            )}>
              {kpis.status.emAberto}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(kpis.totals.totalEmAberto)}
            </div>
            <p className="text-xs text-muted-foreground">Saldo a receber das vendas do período.</p>
          </CardContent>
        </Card>

        {/* Vendas pendentes */}
        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vendas pendentes</CardTitle>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              kpis.status.pendentes === "ok" && "bg-green-100 text-green-800",
              kpis.status.pendentes === "atenção" && "bg-yellow-100 text-yellow-800"
            )}>
              {kpis.status.pendentes}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totals.vendasPendentes}</div>
            <p className="text-xs text-muted-foreground">Quantidade com saldo.</p>
          </CardContent>
        </Card>

        {/* Ticket médio */}
        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ticket médio</CardTitle>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              kpis.status.ticketMedio === "ok" && "bg-green-100 text-green-800",
              kpis.status.ticketMedio === "normal" && "bg-gray-100 text-gray-700"
            )}>
              {kpis.status.ticketMedio}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(kpis.totals.ticketMedio)}
            </div>
            <p className="text-xs text-muted-foreground">Média por venda.</p>
          </CardContent>
        </Card>
      </div>

      {/* Status e Alertas (discreto, leitura rápida) */}
      <div className="px-6 mt-4">
        <Card className="border border-border rounded-md bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status e Alertas</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            {kpis.alerts.hasPendencias ? (
              <>
                <div>• Existem pendências financeiras ativas no período.</div>
                <div>• Vendas pendentes: {kpis.totals.vendasPendentes} | Em aberto: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(kpis.totals.totalEmAberto)}</div>
              </>
            ) : (
              <div>• Todas as vendas do período estão quitadas.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Próximos passos naturais (atalhos inteligentes) */}
      <div className="px-6 mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Link to="/financial/accounts-receivable">
          <button
            className={cn(
              "w-full h-10 border border-border rounded-md text-sm font-medium bg-card hover:bg-muted transition-colors",
              kpis.alerts.hasPendencias && "border-red-300"
            )}
          >
            Contas a Receber {kpis.alerts.hasPendencias && <span className="ml-2 text-red-600">(pendências)</span>}
          </button>
        </Link>
        <Link to="/financial/receipts">
          <button className="w-full h-10 border border-border rounded-md text-sm font-medium bg-card hover:bg-muted transition-colors">
            Recebimentos do período
          </button>
        </Link>
        <Link to="/financial/cash-movements">
          <button className="w-full h-10 border border-border rounded-md text-sm font-medium bg-card hover:bg-muted transition-colors">
            Caixa / Movimentações
          </button>
        </Link>
      </div>
    </div>
  );
};

export default FinancialPage;