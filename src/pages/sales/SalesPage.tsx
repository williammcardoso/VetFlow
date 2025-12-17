import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaShoppingCart, FaPlus, FaDollarSign, FaCalendarAlt, FaTag, FaPaw, FaEye } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { mockFinancialTransactions } from "@/mockData/financial";
import { mockClients } from "@/mockData/clients"; // Importar o mock de clientes centralizado
import { Client, Animal } from "@/types/client"; // Importar as interfaces Client e Animal
import { toast } from "@/components/ui/toast";

const SalesPage = () => {
  // Filtros
  const [clientId, setClientId] = React.useState<string | undefined>(undefined);
  const [animalId, setAnimalId] = React.useState<string | undefined>(undefined);
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");
  const [paymentMethod, setPaymentMethod] = React.useState<string | undefined>(undefined);
  const [status, setStatus] = React.useState<'paid' | 'partial' | 'pending' | 'cancelled' | 'all'>('all');

  const paymentMethods = React.useMemo(() => {
    const pmList = Array.from(new Set(mockFinancialTransactions
      .filter(t => t.type === 'income' && t.category === 'Venda de Produtos' && t.paymentMethod)
      .map(t => t.paymentMethod as string)));
    return pmList;
  }, []);

  const animals = React.useMemo(() => {
    if (!clientId) return [];
    const client = mockClients.find(c => c.id === clientId);
    return client?.animals || [];
  }, [clientId]);

  // Filtrar transações de venda
  const salesTransactions = React.useMemo(() => {
    return mockFinancialTransactions
      .filter((t) => t.type === 'income' && t.category === 'Venda de Produtos')
      .filter(t => !clientId || t.relatedClientId === clientId)
      .filter(t => !animalId || t.relatedAnimalId === animalId)
      .filter(t => !paymentMethod || t.paymentMethod === paymentMethod)
      .filter(t => status === 'all' ? true : (t.status || 'pending') === status)
      .filter(t => {
        if (!dateFrom && !dateTo) return true;
        const dt = new Date(`${t.date}T${t.time}`);
        const from = dateFrom ? new Date(`${dateFrom}T00:00`) : undefined;
        const to = dateTo ? new Date(`${dateTo}T23:59`) : undefined;
        return (!from || dt >= from) && (!to || dt <= to);
      })
      .sort((a, b) => {
        const dateTimeA = new Date(`${a.date}T${a.time}`);
        const dateTimeB = new Date(`${b.date}T${b.time}`);
        return dateTimeB.getTime() - dateTimeA.getTime();
      });
  }, [clientId, animalId, paymentMethod, status, dateFrom, dateTo]);

  const formatDateTime = (dateString: string, timeString: string) => {
    if (!dateString) return "N/A";
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year} ${timeString}`;
  };

  const getAnimalName = (clientId?: string, animalId?: string) => {
    if (!clientId || !animalId) return 'N/A';
    const client = mockClients.find(c => c.id === clientId);
    const animal = client?.animals.find(a => a.id === animalId);
    return animal?.name || 'N/A';
  };

  const cancelSale = (id: string) => {
    const ok = updateMockFinancialTransaction(id, { status: 'cancelled' });
    if (ok) {
      toast.success("Venda cancelada.");
    } else {
      toast.error("Falha ao cancelar venda.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header da Página com Gradiente e Breadcrumb */}
      <div className="bg-gradient-to-r from-background via-card to-background p-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground group">
                <FaShoppingCart className="h-5 w-5 text-muted-foreground" /> Minhas Vendas
              </h1>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Visualize e gerencie todas as transações de vendas.
              </p>
            </div>
          </div>
          <Link to="/">
            <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground transition-colors duration-200">
              <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Painel
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Painel &gt; Vendas &gt; Minhas Vendas
        </p>
      </div>

      <div className="flex-1 p-6">
        {/* Filtros */}
        <Card className="shadow-sm border border-border rounded-md mb-4">
          <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-2 pt-4">
            <div>
              <label className="text-xs text-muted-foreground">Cliente</label>
              <Select onValueChange={setClientId} value={clientId}>
                <SelectTrigger className="h-8 bg-input"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={undefined as any}>Todos</SelectItem>
                  {mockClients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Animal</label>
              <Select onValueChange={setAnimalId} value={animalId}>
                <SelectTrigger className="h-8 bg-input"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={undefined as any}>Todos</SelectItem>
                  {animals.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Pagamento</label>
              <Select onValueChange={setPaymentMethod} value={paymentMethod}>
                <SelectTrigger className="h-8 bg-input"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={undefined as any}>Todos</SelectItem>
                  {paymentMethods.map(pm => <SelectItem key={pm} value={pm}>{pm}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select onValueChange={(v) => setStatus(v as any)} value={status}>
                <SelectTrigger className="h-8 bg-input"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="partial">Parcial</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">De</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 bg-input" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Até</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 bg-input" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all duration-300 border-border rounded-md">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <FaDollarSign className="h-5 w-5 text-primary" /> Transações de Venda
            </CardTitle>
            <Link to="/sales/pos">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
                <FaPlus className="h-4 w-4 mr-2" /> Nova Venda
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {salesTransactions.length > 0 ? (
              <div className="space-y-4">
                {salesTransactions.map((transaction) => {
                  const valorPago = transaction.paidAmount || 0;
                  const saldo = Math.max(0, transaction.amount - valorPago);
                  return (
                    <Card key={transaction.id} className="p-4 bg-card shadow-sm border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Venda
                          </span>
                          <p className="text-lg font-semibold text-foreground">
                            {transaction.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Total</div>
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">
                              R$ {transaction.amount.toFixed(2).replace('.', ',')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Pago</div>
                            <div className="text-lg font-bold">
                              R$ {valorPago.toFixed(2).replace('.', ',')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Saldo</div>
                            <div className="text-lg font-bold">
                              R$ {saldo.toFixed(2).replace('.', ',')}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FaCalendarAlt className="h-3 w-3" /> {formatDateTime(transaction.date, transaction.time)}
                        </div>
                        <div className="flex items-center gap-1">
                          <FaTag className="h-3 w-3" /> Status: {(transaction.status || 'pending')}
                        </div>
                        <div className="flex items-center gap-1">
                          <FaTag className="h-3 w-3" /> Pagamento: {transaction.paymentMethod || "N/A"}
                        </div>
                      </div>
                      {transaction.relatedAnimalId && (
                        <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                          <FaPaw className="h-3 w-3" /> Animal: {getAnimalName(transaction.relatedClientId, transaction.relatedAnimalId)}
                        </div>
                      )}
                      <div className="flex justify-end mt-2 gap-2">
                        <Button variant="ghost" size="sm" className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200" onClick={() => window.print()}>
                          <FaEye className="h-4 w-4 mr-2" /> Imprimir
                        </Button>
                        <Button variant="outline" size="sm" disabled={(transaction.status || 'pending') === 'cancelled'} onClick={() => cancelSale(transaction.id)}>
                          Cancelar venda
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground py-4">Nenhuma venda registrada.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesPage;