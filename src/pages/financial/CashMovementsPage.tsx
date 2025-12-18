import React, { useMemo, useState } from "react";
import { FaWallet, FaArrowUp, FaArrowDown, FaCalendarAlt, FaTag } from "react-icons/fa";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { mockFinancialTransactions, addMockFinancialTransaction } from "@/mockData/financial";
import { getRegistryList } from "@/mockData/registry";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import CurrencyInput from "@/components/CurrencyInput";
import { Wallet, ArrowUpRight, ArrowDownRight, TrendingUp, Pill, Home, Package, Syringe, Stethoscope } from "lucide-react";

const withinRange = (dateStr: string, from?: string, to?: string) => {
  const dt = new Date(`${dateStr}T00:00`);
  const f = from ? new Date(`${from}T00:00`) : undefined;
  const t = to ? new Date(`${to}T23:59`) : undefined;
  return (!f || dt >= f) && (!t || dt <= t);
};

const Sparkline = ({ points = [], color = "#0ea5a3" }: { points: number[]; color?: string }) => {
  const width = 120;
  const height = 36;
  const padding = 6;
  const max = Math.max(1, ...points);
  const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const path = points
    .map((v, i) => {
      const x = padding + i * step;
      const y = height - padding - (v / max) * (height - padding * 2);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="w-[120px] h-[36px]">
      <path d={path} stroke={color} strokeWidth={2} fill="none" />
    </svg>
  );
};

const seriesByDay = (items: { date: string; amount: number }[]) => {
  const map: Record<string, number> = {};
  items.forEach((i) => {
    map[i.date] = (map[i.date] || 0) + i.amount;
  });
  const keys = Object.keys(map).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  return keys.map((k) => map[k]);
};

const categoryIcon = (category?: string) => {
  const c = (category || "").toLowerCase();
  if (c.includes("medic")) return Pill;
  if (c.includes("aluguel") || c.includes("fixa")) return Home;
  if (c.includes("estoque")) return Package;
  if (c.includes("vacina")) return Syringe;
  if (c.includes("atendimento")) return Stethoscope;
  return Wallet;
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

  // Validações obrigatórias
  const expenseErrors = {
    outAmount: outAmount <= 0 ? "Informe um valor maior que zero." : "",
    outDate: !outDate ? "Informe a data." : "",
    outDescription: !outDescription.trim() ? "Informe a descrição." : "",
    outCategory: !outCategory.trim() ? "Informe a categoria." : "",
    outMethodId: !outMethodId ? "Selecione a forma de pagamento." : "",
  };
  const isExpenseValid = Object.values(expenseErrors).every((e) => e === "");

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

  // ADD: séries para sparklines
  const incomeSeries = useMemo(() => seriesByDay(receipts.map(r => ({ date: r.date, amount: r.amount }))), [receipts]);
  const expenseSeries = useMemo(() => seriesByDay(manualExpenses.map(e => ({ date: e.date, amount: e.amount }))), [manualExpenses]);

  const totals = useMemo(() => {
    const income = receipts.reduce((s, t) => s + t.amount, 0);
    const expense = manualExpenses.reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [receipts, manualExpenses]);

  const handleAddExpense = () => {
    if (!isExpenseValid) {
      toast.error("Preencha corretamente os campos obrigatórios para registrar a movimentação.");
      return;
    }
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
    toast.success("Saída registrada com sucesso.");
    setOutDescription("");
    setOutCategory("Ajuste");
    setOutAmount(0);
    setOutMethodId(undefined);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FC]">
      {/* Header Modern */}
      <div className="p-6 pb-4 border-b border-border bg-[#F8F9FC]">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-3 text-foreground">
            <Wallet className="h-5 w-5 text-muted-foreground" /> Caixa / Movimentações
          </h1>
          {/* Ações rápidas visuais (opcional) */}
        </div>
        <p className="text-sm text-muted-foreground">Painel &gt; Financeiro &gt; Caixa / Movimentações</p>
      </div>

      {/* Filtros compactos */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">De</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 bg-white border border-border rounded-md" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Até</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 bg-white border border-border rounded-md" />
        </div>
      </div>

      {/* KPI Cards com glassmorphism leve e sparklines */}
      <div className="px-6 grid gap-4 grid-cols-1 md:grid-cols-3 mb-4">
        <Card className="bg-white/90 backdrop-blur-sm rounded-[12px] shadow-sm hover:shadow-md transition-all border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Entradas</CardTitle>
            <ArrowUpRight className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-emerald-700">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totals.income)}
              </div>
              <Sparkline points={incomeSeries} color="#059669" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Recebimentos no período</p>
          </CardContent>
        </Card>

        <Card className="bg-white/90 backdrop-blur-sm rounded-[12px] shadow-sm hover:shadow-md transition-all border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saídas</CardTitle>
            <ArrowDownRight className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-red-700">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totals.expense)}
              </div>
              <Sparkline points={expenseSeries} color="#dc2626" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ajustes/saídas registradas</p>
          </CardContent>
        </Card>

        <Card className={cn("rounded-[12px] shadow-sm hover:shadow-md transition-all border-0", totals.net >= 0 ? "bg-emerald-50" : "bg-red-50")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <TrendingUp className={cn("h-5 w-5", totals.net >= 0 ? "text-emerald-600" : "text-red-600")} />
          </CardHeader>
          <CardContent className="pt-0">
            <div className={cn("text-2xl font-bold", totals.net >= 0 ? "text-emerald-700" : "text-red-700")}>
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totals.net)}
            </div>
            <div className={cn("mt-2 h-2 rounded-l-[6px]", totals.net >= 0 ? "bg-emerald-200" : "bg-red-200")}></div>
            <p className="text-xs text-muted-foreground mt-1">Entradas - Saídas</p>
          </CardContent>
        </Card>
      </div>

      {/* Main: Formulário e Feed de Movimentações */}
      <div className="px-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Formulário compacto com botão primário arredondado */}
        <Card className="bg-white rounded-[12px] shadow-sm border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Nova saída / ajuste administrativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Data</label>
                <Input
                  type="date"
                  value={outDate}
                  onChange={(e) => setOutDate(e.target.value)}
                  className="h-9 bg-white border border-border rounded-md"
                />
                <div className="min-h-4">
                  {expenseErrors.outDate && <p className="text-xs text-destructive mt-1">{expenseErrors.outDate}</p>}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Categoria</label>
                <Input
                  value={outCategory}
                  onChange={(e) => setOutCategory(e.target.value)}
                  className="h-9 bg-white border border-border rounded-md"
                  placeholder="Ex.: Despesa"
                />
                <div className="min-h-4">
                  {expenseErrors.outCategory && <p className="text-xs text-destructive mt-1">{expenseErrors.outCategory}</p>}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Descrição</label>
              <Input
                value={outDescription}
                onChange={(e) => setOutDescription(e.target.value)}
                className="h-10 bg-white border border-border rounded-md"
                placeholder="Ex.: Ajuste de caixa"
              />
              <div className="min-h-4">
                {expenseErrors.outDescription && <p className="text-xs text-destructive mt-1">{expenseErrors.outDescription}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
              <div>
                <label className="text-xs text-muted-foreground">Valor</label>
                <CurrencyInput
                  value={outAmount}
                  onValueChange={setOutAmount}
                  className="h-11 w-full border border-border rounded-md text-lg font-semibold"
                />
                <div className="min-h-4">
                  {expenseErrors.outAmount && <p className="text-xs text-destructive mt-1">{expenseErrors.outAmount}</p>}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Forma de pagamento</label>
                <Select value={outMethodId} onValueChange={setOutMethodId}>
                  <SelectTrigger className="h-11 bg-white border border-border rounded-md">
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
                <div className="min-h-4">
                  {expenseErrors.outMethodId && <p className="text-xs text-destructive mt-1">{expenseErrors.outMethodId}</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleAddExpense} className="h-10 px-5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors" disabled={!isExpenseValid}>
                Registrar saída
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Movimentações automáticas (recebimentos de vendas) não podem ser editadas nem excluídas.
            </div>
          </CardContent>
        </Card>

        {/* Feed de atividades limpo com ícones circulares por categoria */}
        <Card className="bg-white rounded-[12px] shadow-sm border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Movimentações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...receipts, ...manualExpenses]
              .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime())
              .map(mov => {
                const Icon = categoryIcon(mov.category);
                const isIncome = mov.type === "income";
                return (
                  <div key={mov.id} className="p-3 bg-[#F8F9FA] rounded-[12px] border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", isIncome ? "bg-emerald-100" : "bg-red-100")}>
                        <Icon className={cn("h-4 w-4", isIncome ? "text-emerald-700" : "text-red-700")} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">{mov.description}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(mov.date, mov.time)} • {mov.category} • {mov.paymentMethod || "N/A"}
                        </span>
                      </div>
                    </div>
                    <div className={cn("text-sm font-bold", isIncome ? "text-emerald-700" : "text-red-700")}>
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(mov.amount)}
                    </div>
                  </div>
                );
              })}
            {([...receipts, ...manualExpenses].length === 0) && (
              <div className="p-3 bg-[#F8F9FA] rounded-[12px] border border-border text-xs text-muted-foreground">
                Nenhuma movimentação no período selecionado.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CashMovementsPage;