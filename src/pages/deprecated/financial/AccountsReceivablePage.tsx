import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaMoneyBillAlt, FaCalendarAlt, FaTag, FaPaw } from "react-icons/fa";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { mockFinancialTransactions, updateMockFinancialTransaction, FinancialTransaction, addMockFinancialTransaction } from "@/mockData/financial";
import { getRegistryList } from "@/mockData/registry";
import { formatDateTime } from "@/lib/utils";
import CurrencyInput from "@/components/CurrencyInput";
import { useClientsList } from "@/hooks/useSupabaseClients";

const sumReceiptsForSale = (saleId: string) => {
  const receipts = mockFinancialTransactions.filter(
    t => t.type === "income" && t.category === "Recebimento" && (t.saleId === saleId || (t.description || "").includes(saleId))
  );
  return receipts.reduce((s, r) => s + r.amount, 0);
};

const AccountsReceivablePage: React.FC = () => {
  const { data: dbClients } = useClientsList();
  const clients = dbClients || [];
  const pmRegistry = getRegistryList("paymentMethods");

  const sales = useMemo(() => {
    return mockFinancialTransactions
      .filter(t => t.type === "income" && t.category === "Venda de Produtos")
      .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());
  }, []);

  const pendingSales = useMemo(() => {
    return sales
      .map(s => {
        const paid = sumReceiptsForSale(s.id);
        const remaining = Math.max(0, s.amount - paid);
        return { sale: s, paid, remaining };
      })
      .filter(x => (x.sale.status || "pending") !== "cancelled" && x.remaining > 0);
  }, [sales]);

  // Estados por venda
  const [payDateMap, setPayDateMap] = useState<Record<string, string>>({});
  const [payAmountMap, setPayAmountMap] = useState<Record<string, number>>({});
  const [payMethodMap, setPayMethodMap] = useState<Record<string, string | undefined>>({});

  const getClientAnimal = (t: FinancialTransaction) => {
    const client = clients.find(c => c.id === t.relatedClientId);
    const animal = client?.animals.find(a => a.id === t.relatedAnimalId);
    return { clientName: client?.name || "N/A", animalName: animal?.name || "N/A" };
  };

  const handleRegisterPayment = (sale: FinancialTransaction, remaining: number) => {
    const payDate = payDateMap[sale.id] || new Date().toISOString().split("T")[0];
    const payAmount = payAmountMap[sale.id] || remaining;
    const pmId = payMethodMap[sale.id];
    const pmName = pmId ? (pmRegistry.find(pm => pm.id === pmId)?.name || undefined) : undefined;

    if (payAmount <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    // Registrar recebimento manualmente para permitir data selecionada
    addMockFinancialTransaction({
      date: payDate,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      description: `Recebimento da venda ${sale.id}`,
      type: "income",
      amount: payAmount,
      category: "Recebimento",
      saleId: sale.id,
      relatedClientId: sale.relatedClientId,
      relatedAnimalId: sale.relatedAnimalId,
      paymentMethod: pmName,
    });

    // Atualizar status/valor pago da venda
    const newPaid = sumReceiptsForSale(sale.id);
    const newStatus: FinancialTransaction["status"] = newPaid >= sale.amount ? "paid" : (newPaid > 0 ? "partial" : "pending");
    updateMockFinancialTransaction(sale.id, { paidAmount: newPaid, status: newStatus });

    toast.success("Pagamento registrado.");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-gradient-to-r from-background via-card to-background p-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground">
            <FaMoneyBillAlt className="h-5 w-5 text-muted-foreground" /> Contas a Receber
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">Painel &gt; Financeiro &gt; Contas a receber</p>
      </div>

      <div className="p-6">
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Vendas com saldo pendente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingSales.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma venda pendente.</p>
            ) : pendingSales.map(({ sale, paid, remaining }) => {
              const { clientName, animalName } = getClientAnimal(sale);
              return (
                <Card key={sale.id} className="p-4 bg-card border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <FaCalendarAlt className="h-3 w-3" /> {formatDateTime(sale.date, sale.time)}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <FaPaw className="h-3 w-3" /> {clientName} • {animalName}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <FaTag className="h-3 w-3" /> {sale.description}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Total</div>
                      <div className="font-bold text-green-600">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(sale.amount)}</div>
                      <div className="text-xs text-muted-foreground">Pago</div>
                      <div className="font-semibold">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(paid)}</div>
                      <div className="text-xs text-muted-foreground">Saldo</div>
                      <div className="font-semibold">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(remaining)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end mt-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Data do pagamento</label>
                      <Input
                        type="date"
                        value={payDateMap[sale.id] || new Date().toISOString().split("T")[0]}
                        onChange={(e) => setPayDateMap(prev => ({ ...prev, [sale.id]: e.target.value }))}
                        className="h-9 bg-input border border-border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Valor</label>
                      <CurrencyInput
                        value={typeof payAmountMap[sale.id] === "number" ? payAmountMap[sale.id] : remaining}
                        onValueChange={(v) => setPayAmountMap(prev => ({ ...prev, [sale.id]: v }))}
                        className="h-9 w-full border border-border rounded-md"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-muted-foreground">Forma de pagamento</label>
                      <Select
                        onValueChange={(v) => setPayMethodMap(prev => ({ ...prev, [sale.id]: v }))}
                        value={payMethodMap[sale.id]}
                      >
                        <SelectTrigger className="h-9 bg-input border border-border rounded-md">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {pmRegistry.map(pm => (
                            <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={() => handleRegisterPayment(sale, remaining)} className="h-9 px-4">Registrar</Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountsReceivablePage;