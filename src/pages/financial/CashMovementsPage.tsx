import React, { useMemo, useState } from "react";
import { FaWallet, FaArrowUp, FaArrowDown, FaCalendarAlt, FaTag } from "react-icons/fa";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { mockFinancialTransactions, addMockFinancialTransaction } from "@/mockData/financial";
import { getRegistryList } from "@/mockData/registry";
import { formatDateTime } from "@/lib/utils";

const withinRange = (dateStr: string, from?: string, to?: string) => {
  const dt = new Date(`${dateStr}T00:00`);
  const f = from ? new Date(`${from}T00:00`) : undefined;
  const t = to ? new Date(`${to}T23:59`) : undefined;
  return (!f || dt >= f) && (!t || dt <= t);
};

const CashMovementsPage: React.FC = () => {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Formulário de saída manual/ajuste
  const [outDate, setOutDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [outDescription, setOutDescription] = useState<string>("");
  const [outCategory, setOutCategory] = useState<string>("Ajuste");
  const [outAmount, setOutAmount] = useState<number>(0);
  const [outMethodId, setOutMethodId] = useState<string | undefined>(undefined);
  const paymentMethods = getRegistryList("paymentMethods");

  const receipts = useMemo(() => {
    return mockFinancialTransactions
      .filter(t => t.type === "income" && t.category === "Recebimento")
      .filter(t => withinRange(t.date, dateFrom, dateTo));
  }, [dateFrom, dateTo]);

  const manualExpenses = useMemo(() => {
    return mockFinancialTransactions
      .filter(t => t.type === "expense")
      .filter(t => withinRange(t.date, dateFrom, dateTo));
  }, [dateFrom, dateTo]);

  const totals = useMemo(() => {
    const income = receipts.reduce((s, t) => s + t.amount, 0);
    const expense = manualExpenses.reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [receipts, manualExpenses]);

  const handleAddExpense = () => {
    if (!outDescription.trim() || outAmount <= 0) return;
    const pmName = outMethodId ? (paymentMethods.find(pm => pm.id === outMethodId)?.name || undefined) : undefined;
    addMockFinancialTransaction({
      date: outDate,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      description: outDescription.trim(),
      type: "expense",
      amount: outAmount,
      category: outCategory || "Despesa",
      paymentMethod: pmName,
    });
    setOutDescription("");
    setOutCategory("Ajuste");
    setOutAmount(0);
    setOutMethodId(undefined);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-gradient-to-r from-background via-card to-background p-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground">
            <FaWallet className="h-5 w-5 text-muted-foreground" /> Caixa / Movimentações
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">Painel &gt; Financeiro &gt; Caixa / Movimentações</p>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">De</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 bg-input" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Até</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 bg-input" />
        </div>
        <div className="md:col-span-2 flex items-end">
          <div className="text-sm bg-muted px-3 py-2 rounded-md">
            <div className="flex items-center gap-1"><FaArrowUp className="text-green-600" /> Entradas: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totals.income)}</div>
            <div className="flex items-center gap-1"><FaArrowDown className="text-red-600" /> Saídas: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totals.expense)}</div>
            <div>Saldo: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totals.net)}</div>
          </div>
        </div>
      </div>

      <div className="px-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Nova saída/ajuste</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
            <div>
              <label className="text-xs text-muted-foreground">Data</label>
              <Input type="date" value={outDate} onChange={(e) => setOutDate(e.target.value)} className="h-9 bg-input" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Descrição</label>
              <Input value={outDescription} onChange={(e) => setOutDescription(e.target.value)} className="h-9 bg-input" placeholder="Ex.: Ajuste de caixa" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Categoria</label>
              <Input value={outCategory} onChange={(e) => setOutCategory(e.target.value)} className="h-9 bg-input" placeholder="Ex.: Despesa" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Forma de pagamento</label>
              <Select value={outMethodId} onValueChange={setOutMethodId}>
                <SelectTrigger className="h-9 bg-input">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.length > 0 ? paymentMethods.map(pm => (
                    <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                  )) : (
                    <SelectItem value="none" disabled>Cadastre formas em Vendas &gt; Formas de Recebimento</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-5">
              <label className="text-xs text-muted-foreground">Valor</label>
              <Input type="number" min="0" step="0.01" value={outAmount} onChange={(e) => setOutAmount(parseFloat(e.target.value) || 0)} className="h-9 bg-input" />
            </div>
            <div className="md:col-span-5 flex justify-end">
              <Button onClick={handleAddExpense} className="h-9 px-4">Registrar saída</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Movimentações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...receipts, ...manualExpenses]
              .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime())
              .map(mov => (
                <Card key={mov.id} className="p-4 bg-card border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${mov.type === "income" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {mov.type === "income" ? "Entrada" : "Saída"}
                      </span>
                      <span className="text-sm">{mov.description}</span>
                    </div>
                    <div className={`text-sm font-semibold ${mov.type === "income" ? "text-green-600" : "text-red-600"}`}>
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(mov.amount)}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1"><FaCalendarAlt className="h-3 w-3" /> {formatDateTime(mov.date, mov.time)}</div>
                    <div className="flex items-center gap-1"><FaTag className="h-3 w-3" /> {mov.category}</div>
                    <div className="flex items-center gap-1"><FaTag className="h-3 w-3" /> Pagamento: {mov.paymentMethod || "N/A"}</div>
                  </div>
                </Card>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CashMovementsPage;