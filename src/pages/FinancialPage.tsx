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

// Helper: calcula período anterior com mesmo tamanho
const getPrevPeriod = (from?: string, to?: string) => {
  if (!from || !to) return { prevFrom: undefined, prevTo: undefined };
  const fromDate = new Date(`${from}T00:00`);
  const toDate = new Date(`${to}T23:59`);
  const days = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const prevToDate = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000);
  const prevFromDate = new Date(prevToDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const prevFrom = prevFromDate.toISOString().split("T")[0];
  const prevTo = prevToDate.toISOString().split("T")[0];
  return { prevFrom, prevTo };
};

const FinancialPage: React.FC = () => {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // KPIs atuais e comparação com período anterior
  const kpis = useMemo(() => {
    // Período atual
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

    // Período anterior (mesmo tamanho)
    const { prevFrom, prevTo } = getPrevPeriod(dateFrom, dateTo);
    let prev = {
      totalFaturado: 0,
      totalRecebido: 0,
      totalEmAberto: 0,
      vendasPendentes: 0,
      ticketMedio: 0,
    };

    if (prevFrom && prevTo) {
      const prevSales = mockFinancialTransactions.filter(
        t => t.type === "income" && t.category === "Venda de Produtos" && withinRange(t.date, prevFrom, prevTo)
      );
      const prevReceipts = mockFinancialTransactions.filter(
        t => t.type === "income" && t.category === "Recebimento" && withinRange(t.date, prevFrom, prevTo)
      );
      prev.totalFaturado = prevSales.reduce((s, t) => s + t.amount, 0);
      prev.totalRecebido = prevReceipts.reduce((s, t) => s + t.amount, 0);
      prev.ticketMedio = prevSales.length > 0 ? prev.totalFaturado / prevSales.length : 0;

      // Em aberto e pendentes no período anterior
      prevSales.forEach(sale => {
        const paid = sumReceiptsForSale(sale.id);
        const remaining = Math.max(0, sale.amount - paid);
        prev.totalEmAberto += remaining;
        if ((sale.status || "pending") !== "cancelled" && remaining > 0) prev.vendasPendentes += 1;
      });
    }

    // Direção comparativa
    const dir = (curr: number, p: number | undefined) => {
      if (p === undefined) return "none";
      if (curr > p) return "up";
      if (curr < p) return "down";
      return "equal";
    };

    return {
      current: { totalFaturado, totalRecebido, totalEmAberto, vendasPendentes, ticketMedio },
      prev,
      compare: {
        totalFaturado: dir(totalFaturado, prevFrom && prevTo ? prev.totalFaturado : undefined),
        totalRecebido: dir(totalRecebido, prevFrom && prevTo ? prev.totalRecebido : undefined),
        totalEmAberto: dir(totalEmAberto, prevFrom && prevTo ? prev.totalEmAberto : undefined),
        vendasPendentes: dir(vendasPendentes, prevFrom && prevTo ? prev.vendasPendentes : undefined),
        ticketMedio: dir(ticketMedio, prevFrom && prevTo ? prev.ticketMedio : undefined),
      },
      period: {
        label: dateFrom && dateTo ? `Período: ${formatDateTime(dateFrom)} a ${formatDateTime(dateTo)}` : "Período: todos os registros",
        prevLabel: prevFrom && prevTo ? `Anterior: ${formatDateTime(prevFrom)} a ${formatDateTime(prevTo)}` : undefined,
      }
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

      {/* Indicador do período analisado e anterior */}
      <div className="px-6 -mt-2 mb-4 text-xs text-muted-foreground">
        <div>{kpis.period.label}</div>
        {kpis.period.prevLabel && <div>{kpis.period.prevLabel}</div>}
      </div>

      {/* KPIs principais (5 cards) com comparação simples */}
      <div className="px-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Total faturado */}
        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total faturado</CardTitle>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              kpis.compare.totalFaturado === "up" && "bg-green-100 text-green-800",
              kpis.compare.totalFaturado === "down" && "bg-red-100 text-red-800",
              kpis.compare.totalFaturado === "equal" && "bg-gray-100 text-gray-700"
            )}>
              {kpis.compare.totalFaturado === "up" ? "↑ acima" :
               kpis.compare.totalFaturado === "down" ? "↓ abaixo" :
               kpis.compare.totalFaturado === "equal" ? "＝ igual" : "—"}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(kpis.current.totalFaturado)}
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
              kpis.compare.totalRecebido === "up" && "bg-green-100 text-green-800",
              kpis.compare.totalRecebido === "down" && "bg-red-100 text-red-800",
              kpis.compare.totalRecebido === "equal" && "bg-gray-100 text-gray-700"
            )}>
              {kpis.compare.totalRecebido === "up" ? "↑ acima" :
               kpis.compare.totalRecebido === "down" ? "↓ abaixo" :
               kpis.compare.totalRecebido === "equal" ? "＝ igual" : "—"}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(kpis.current.totalRecebido)}
            </div>
            <p className="text-xs text-muted-foreground">Baixas/recebimentos do período.</p>
          </CardContent>
        </Card>

        {/* Total em aberto */}
        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Em aberto</CardTitle>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              kpis.compare.totalEmAberto === "up" && "bg-red-100 text-red-800",
              kpis.compare.totalEmAberto === "down" && "bg-green-100 text-green-800",
              kpis.compare.totalEmAberto === "equal" && "bg-gray-100 text-gray-700"
            )}>
              {kpis.compare.totalEmAberto === "up" ? "↑ maior" :
               kpis.compare.totalEmAberto === "down" ? "↓ menor" :
               kpis.compare.totalEmAberto === "equal" ? "＝ igual" : "—"}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(kpis.current.totalEmAberto)}
            </div>
            <p className="text-xs text-muted-foreground">Soma dos saldos das vendas do período.</p>
          </CardContent>
        </Card>

        {/* Vendas pendentes */}
        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vendas pendentes</CardTitle>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              kpis.compare.vendasPendentes === "up" && "bg-red-100 text-red-800",
              kpis.compare.vendasPendentes === "down" && "bg-green-100 text-green-800",
              kpis.compare.vendasPendentes === "equal" && "bg-gray-100 text-gray-700"
            )}>
              {kpis.compare.vendasPendentes === "up" ? "↑ mais" :
               kpis.compare.vendasPendentes === "down" ? "↓ menos" :
               kpis.compare.vendasPendentes === "equal" ? "＝ igual" : "—"}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.current.vendasPendentes}</div>
            <p className="text-xs text-muted-foreground">Quantidade de vendas com saldo.</p>
          </CardContent>
        </Card>

        {/* Ticket médio */}
        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ticket médio</CardTitle>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              kpis.compare.ticketMedio === "up" && "bg-green-100 text-green-800",
              kpis.compare.ticketMedio === "down" && "bg-red-100 text-red-800",
              kpis.compare.ticketMedio === "equal" && "bg-gray-100 text-gray-700"
            )}>
              {kpis.compare.ticketMedio === "up" ? "↑ acima" :
               kpis.compare.ticketMedio === "down" ? "↓ abaixo" :
               kpis.compare.ticketMedio === "equal" ? "＝ igual" : "—"}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(kpis.current.ticketMedio)}
            </div>
            <p className="text-xs text-muted-foreground">Média por venda no período.</p>
          </CardContent>
        </Card>
      </div>

      {/* Atalhos inteligentes (ações rápidas) */}
      <div className="px-6 mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Link to="/financial/accounts-receivable">
          <button
            className={cn(
              "w-full h-10 border border-border rounded-md text-sm font-medium bg-card hover:bg-muted transition-colors",
              kpis.current.totalEmAberto > 0 && "border-red-300"
            )}
          >
            Contas a Receber {kpis.current.totalEmAberto > 0 && <span className="ml-2 text-red-600">(pendências)</span>}
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