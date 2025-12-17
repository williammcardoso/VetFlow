import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaMoneyBillWave, FaArrowUp, FaArrowDown, FaCalendarAlt, FaTag } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CurrencyInput from "@/components/CurrencyInput";
import { mockFinancialTransactions, addMockFinancialTransaction } from "@/mockData/financial";
import { mockClients } from "@/mockData/clients";
import { getRegistryList } from "@/mockData/registry";
import { formatDateTime } from "@/lib/utils";

const CashMovementsPage = () => {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [type, setType] = useState<"income"|"expense"|"all">("all");

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState("");
  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const [animalId, setAnimalId] = useState<string | undefined>(undefined);
  const [paymentMethodId, setPaymentMethodId] = useState<string | undefined>(undefined);

  const paymentMethods = getRegistryList("paymentMethods");

  const animals = useMemo(() => {
    if (!clientId) return [];
    const client = mockClients.find(c => c.id === clientId);
    return client?.animals || [];
  }, [clientId]);

  const filtered = useMemo(() => {
    return mockFinancialTransactions
      .filter(t => type === "all" ? true : t.type === type)
      .filter(t => {
        if (!dateFrom && !dateTo) return true;
        const dt = new Date(`${t.date}T${t.time}`);
        const from = dateFrom ? new Date(`${dateFrom}T00:00`) : undefined;
        const to = dateTo ? new Date(`${dateTo}T23:59`) : undefined;
        return (!from || dt >= from) && (!to || dt <= to);
      })
      .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());
  }, [dateFrom, dateTo, type]);

  const totals = useMemo(() => {
    const income = filtered.filter(f => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);
    const expense = filtered.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
    return { income, expense, net: income - expense };
  }, [filtered]);

  const handleAddMovement = () => {
    if (!description.trim() || amount <= 0) return;
    const now = new Date();
    const pmName = paymentMethodId ? (paymentMethods.find(pm => pm.id === paymentMethodId)?.name || undefined) : undefined;
    addMockFinancialTransaction({
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      description: description.trim(),
      type: (type === "all" ? "income" : type),
      amount,
      category: category || (type === "expense" ? "Despesa" : "Receita"),
      relatedClientId: clientId,
      relatedAnimalId: animalId,
      paymentMethod: pmName,
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-gradient-to-r from-background via-card to-background p-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground group">
            <FaMoneyBillWave className="h-5 w-5 text-muted-foreground" /> Movimentos de Caixa
          </h1>
          <Link to="/sales/my-sales">
            <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground">
              <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Vendas
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">Painel &gt; Vendas &gt; Movimentos de Caixa</p>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">De</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 bg-input" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Até</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 bg-input" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Tipo</label>
          <Select onValueChange={(v) => setType(v as any)} value={type}>
            <SelectTrigger className="h-9 bg-input">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end justify-end">
          <div className="text-sm bg-muted px-3 py-2 rounded-md">
            <div className="flex items-center gap-1"><FaArrowUp className="text-green-600" /> Receita: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totals.income)}</div>
            <div className="flex items-center gap-1"><FaArrowDown className="text-red-600" /> Despesa: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totals.expense)}</div>
            <div>Saldo: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totals.net)}</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Novo Movimento</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-6 gap-2 items-end">
            <div className="lg:col-span-2">
              <label className="text-xs text-muted-foreground">Descrição</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-9 bg-input" placeholder="Ex.: Venda balcão" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tipo</label>
              <Select onValueChange={(v) => setType(v as any)} value={type}>
                <SelectTrigger className="h-9 bg-input"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="all" disabled>Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Categoria</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 bg-input" placeholder="Ex.: Venda de Produtos" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cliente</label>
              <Select onValueChange={setClientId} value={clientId}>
                <SelectTrigger className="h-9 bg-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {mockClients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Animal</label>
              <Select onValueChange={setAnimalId} value={animalId}>
                <SelectTrigger className="h-9 bg-input"><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {(mockClients.find(c => c.id === clientId)?.animals || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Forma de Pagamento</label>
              <Select onValueChange={setPaymentMethodId} value={paymentMethodId}>
                <SelectTrigger className="h-9 bg-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {paymentMethods.length > 0 ? paymentMethods.map(pm => (
                    <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                  )) : (
                    <SelectItem value="none" disabled>Cadastre formas em Vendas &gt; Formas de Recebimento</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-6">
              <label className="text-xs text-muted-foreground">Valor</label>
              <CurrencyInput value={amount} onValueChange={setAmount} className="h-9" />
            </div>
            <div className="lg:col-span-6 flex justify-end">
              <Button onClick={handleAddMovement} className="h-9 px-4">Lançar Movimento</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-6">
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Movimentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filtered.map(mov => (
              <Card key={mov.id} className="p-4 bg-card border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${mov.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {mov.type === 'income' ? 'Receita' : 'Despesa'}
                    </span>
                    <span className="text-sm">{mov.description}</span>
                  </div>
                  <div className={`text-sm font-semibold ${mov.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(mov.amount)}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1"><FaCalendarAlt className="h-3 w-3" /> {formatDateTime(mov.date, mov.time)}</div>
                  <div className="flex items-center gap-1"><FaTag className="h-3 w-3" /> {mov.category}</div>
                  <div className="flex items-center gap-1"><FaTag className="h-3 w-3" /> Pagamento: {mov.paymentMethod || "N/A"}</div>
                </div>
                {mov.relatedClientId && mov.relatedAnimalId && (
                  <div className="mt-2">
                    <Link to={`/clients/${mov.relatedClientId}/animals/${mov.relatedAnimalId}/record`}>
                      <Button variant="outline" size="sm">Abrir Prontuário</Button>
                    </Link>
                  </div>
                )}
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CashMovementsPage;