import React from "react";
import { Link } from "react-router-dom";
import { FaPlus, FaDollarSign, FaCalendarAlt, FaTag, FaPaw, FaEye } from "@/components/icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { mockFinancialTransactions, updateMockFinancialTransaction } from "@/mockData/financial";
import { toast } from "sonner";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";
import { ToolbarRow } from "@/components/saas/ToolbarRow";
import { ShoppingCart, Sparkles, Filter, ArrowLeft } from "lucide-react";

const SalesPage = () => {
  const { data: dbClients, isError: isClientsError } = useClientsList();
  const clients = dbClients || [];
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
    const client = clients.find(c => c.id === clientId);
    return client?.animals || [];
  }, [clientId, clients]);

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
    const client = clients.find(c => c.id === clientId);
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
    <PageShell>
      <PageHeader
        title="Minhas Vendas"
        description="Visualize e gerencie todas as transações de vendas."
        icon={ShoppingCart}
        module="sales"
        breadcrumb={<>Painel &gt; Vendas &gt; Minhas Vendas</>}
        actions={
          <Button asChild variant="outline" className="rounded-xl border-border/70">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao painel
            </Link>
          </Button>
        }
      />

      <SectionCard
        title="Filtros de vendas"
        description="Filtre por cliente, pagamento, status e período."
        icon={Filter}
        tone="sales"
      >
        <ToolbarRow>
          <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-6">
            <div>
              <label className="text-xs text-muted-foreground">Cliente</label>
              <Select onValueChange={(v) => setClientId(v === "all" ? undefined : v)} value={clientId ?? "all"}>
                <SelectTrigger className="h-8 bg-input"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Animal</label>
              <Select onValueChange={(v) => setAnimalId(v === "all" ? undefined : v)} value={animalId ?? "all"}>
                <SelectTrigger className="h-8 bg-input"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {animals.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Pagamento</label>
              <Select onValueChange={(v) => setPaymentMethod(v === "all" ? undefined : v)} value={paymentMethod ?? "all"}>
                <SelectTrigger className="h-8 bg-input"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
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
          </div>
        </ToolbarRow>
      </SectionCard>

      <SectionCard
        title="Transações de venda"
        description="Recebimentos, saldo e status comercial por lançamento."
        icon={Sparkles}
        tone="sales"
      >
        <Card className="vf-surface-card vf-tone-sales rounded-2xl border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <FaDollarSign className="h-5 w-5 text-vf-sales" /> Transações de Venda
            </CardTitle>
            <Link to="/sales/pos">
              <Button size="sm" className="rounded-xl bg-[hsl(var(--vf-sales))] text-white hover:bg-[hsl(var(--vf-sales)/0.9)]">
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
                    <Card key={transaction.id} className="vf-surface-card vf-tone-sales card-hover rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-[hsl(var(--vf-sales)/0.14)] px-2 py-0.5 text-xs font-medium text-vf-sales">
                            Venda
                          </span>
                          <p className="text-lg font-semibold text-foreground">
                            {transaction.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Total</div>
                            <div className="text-lg font-bold text-vf-sales">
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
              <p className="text-muted-foreground py-4">
                {isClientsError ? "Falha ao carregar clientes do banco." : "Nenhuma venda registrada."}
              </p>
            )}
          </CardContent>
        </Card>
      </SectionCard>
    </PageShell>
  );
};

export default SalesPage;