import React, { useMemo, useState } from "react";
import { FaMoneyBillWave, FaCalendarAlt, FaArrowUp, FaArrowDown, FaShoppingCart } from "react-icons/fa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn, formatDateTime } from "@/lib/utils";
import { mockFinancialTransactions, FinancialTransaction } from "@/mockData/financial";

const withinRange = (dateStr: string, from?: string, to?: string) => {
  const dt = new Date(`${dateStr}T00:00`);
  const f = from ? new Date(`${from}T00:00`) : undefined;
  const t = to ? new Date(`${to}T23:59`) : undefined;
  return (!f || dt >= f) && (!t || dt <= t);
};

const sumReceiptsForSale = (saleId: string) => {
  const receipts = mockFinancialTransactions.filter(
    t => t.type === "income" && t.category === "Recebimento" && (t.saleId === saleId || (t.description || "").includes(saleId))
  );
  return receipts.reduce((s, r) => s + r.amount, 0);
};

const FinancialPage: React.FC = () => {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { totalReceived, openAmount, pendingSalesCount } = useMemo(() => {
    // Recebimentos no período
    const receiptsInRange = mockFinancialTransactions.filter(
      t => t.type === "income" && t.category === "Recebimento" && withinRange(t.date, dateFrom, dateTo)
    );
    const totalReceived = receiptsInRange.reduce((s, r) => s + r.amount, 0);

    // Vendas no período (considera saldo atual pago em tempo real)
    const salesInRange = mockFinancialTransactions.filter(
      t => t.type === "income" && t.category === "Venda de Produtos" && withinRange(t.date, dateFrom, dateTo)
    );

    let openAmount = 0;
    let pendingSalesCount = 0;

    salesInRange.forEach(sale => {
      const paid = sumReceiptsForSale(sale.id);
      const remaining = Math.max(0, sale.amount - paid);
      openAmount += remaining;
      if ((sale.status || "pending") !== "cancelled" && remaining > 0) pendingSalesCount += 1;
    });

    return { totalReceived, openAmount, pendingSalesCount };
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
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 bg-input" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Até</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 bg-input" />
        </div>
        <div className="flex items-end">
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><FaCalendarAlt className="h-3 w-3" /> {dateFrom ? formatDateTime(dateFrom) : "Período"} → {dateTo ? formatDateTime(dateTo) : "Atual"}</div>
          </div>
        </div>
      </div>

      <div className="px-6 grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recebido no período</CardTitle>
            <FaArrowUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalReceived)}
            </div>
            <p className="text-xs text-muted-foreground">Somatório de recebimentos (baixas).</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Em aberto (vendas no período)</CardTitle>
            <FaArrowDown className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(openAmount)}
            </div>
            <p className="text-xs text-muted-foreground">Soma dos saldos pendentes das vendas do período.</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vendas pendentes</CardTitle>
            <FaShoppingCart className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingSalesCount}
            </div>
            <p className="text-xs text-muted-foreground">Quantidade de vendas ainda não pagas no período.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialPage;