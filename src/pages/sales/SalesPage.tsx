import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaPlus, FaDollarSign, FaCalendarAlt, FaTag, FaPaw, FaEye } from "@/components/icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { updateFinancialTransaction } from "@/lib/financialApi";
import { toast } from "sonner";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";
import { ToolbarRow } from "@/components/saas/ToolbarRow";
import { ShoppingCart, Sparkles, Filter, ArrowLeft } from "lucide-react";
import SaleDetailModal from "@/components/SaleDetailModal";
import type { FinancialTransaction } from "@/mockData/financial";

const SalesPage = () => {
  const { data: dbClients, isError: isClientsError } = useClientsList();
  const { transactions: mockFinancialTransactions, loading, refetch } = useFinancialTransactions();
  const clients = dbClients || [];
  // Filtros
  const [clientId, setClientId] = React.useState<string | undefined>(undefined);
  const [animalId, setAnimalId] = React.useState<string | undefined>(undefined);
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");
  const [paymentMethod, setPaymentMethod] = React.useState<string | undefined>(undefined);
  const [status, setStatus] = React.useState<'paid' | 'partial' | 'pending' | 'cancelled' | 'all'>('all');
  const [selectedSale, setSelectedSale] = React.useState<FinancialTransaction | null>(null);

  const paymentMethods = React.useMemo(() => {
    const pmList = Array.from(new Set(mockFinancialTransactions
      .filter(t => t.type === 'income' && t.category === 'Venda de Produtos' && t.paymentMethod)
      .map(t => t.paymentMethod as string)));
    return pmList;
  }, [mockFinancialTransactions]);

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
  }, [mockFinancialTransactions, clientId, animalId, paymentMethod, status, dateFrom, dateTo]);

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

  const statusConfig: Record<string, { label: string; className: string }> = {
    paid:      { label: 'Pago',      className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
    partial:   { label: 'Parcial',   className: 'bg-blue-100 text-blue-700 border border-blue-200' },
    pending:   { label: 'Pendente',  className: 'bg-amber-100 text-amber-700 border border-amber-200' },
    cancelled: { label: 'Cancelado', className: 'bg-gray-100 text-gray-500 border border-gray-200' },
  };

  const getClientName = (clientId?: string) =>
    clientId ? (clients.find(c => c.id === clientId)?.name || undefined) : undefined;

  const cancelSale = async (id: string) => {
    const ok = await updateFinancialTransaction(id, { status: 'cancelled' });
    if (ok) {
      toast.success("Venda cancelada.");
      await refetch();
    } else {
      toast.error("Falha ao cancelar venda.");
    }
  };

  const getSaleItemsSummary = (description: string): string => {
    const colonIdx = description.indexOf(": ");
    if (colonIdx === -1) return description;
    const items = description.slice(colonIdx + 2)
      .split(", ")
      .map(item => item.replace(/\s+x\d+$/, "").trim());
    if (items.length <= 2) return items.join(" · ");
    return `${items.slice(0, 2).join(" · ")} +${items.length - 2} item${items.length - 2 > 1 ? "s" : ""}`;
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
            {loading ? (
              <p className="text-muted-foreground py-4">Carregando vendas...</p>
            ) : salesTransactions.length > 0 ? (
              <div className="space-y-4">
                {salesTransactions.map((transaction) => {
                  const saldo = Math.max(0, transaction.amount - (transaction.paidAmount || 0));
                  return (
                    <Card key={transaction.id} className="vf-surface-card vf-tone-sales card-hover rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                      {/* Linha 1: badge status + descrição resumida + valores */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              statusConfig[transaction.status || 'pending']?.className || statusConfig.pending.className
                            }`}>
                              {statusConfig[transaction.status || 'pending']?.label || 'Pendente'}
                            </span>
                            {getClientName(transaction.relatedClientId) && (
                              <span className="text-xs font-medium text-muted-foreground">
                                👤 {getClientName(transaction.relatedClientId)}
                              </span>
                            )}
                            {transaction.relatedAnimalId && getAnimalName(transaction.relatedClientId, transaction.relatedAnimalId) !== 'N/A' && (
                              <span className="text-xs text-muted-foreground">
                                🐾 {getAnimalName(transaction.relatedClientId, transaction.relatedAnimalId)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <span className="inline-flex items-center rounded-md bg-[hsl(var(--vf-sales)/0.1)] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--vf-sales))]">
                              PDV
                            </span>
                            <p className="text-sm font-semibold text-foreground truncate max-w-[380px]">
                              {getSaleItemsSummary(transaction.description)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span>📅 {formatDateTime(transaction.date, transaction.time)}</span>
                            {transaction.paymentMethod && (
                              <span>
                                💳 {transaction.paymentMethod}
                                {transaction.paymentInstallments && transaction.paymentInstallments > 1
                                  ? ` · ${transaction.paymentInstallments}x de ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(transaction.amount / transaction.paymentInstallments)}`
                                  : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Valores */}
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Total</div>
                            <div className="text-base font-bold text-[hsl(var(--vf-sales))]">
                              {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(transaction.amount)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Pago</div>
                            <div className="text-base font-bold text-emerald-600">
                              {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(transaction.paidAmount || 0)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Saldo</div>
                            <div className={`text-base font-bold ${saldo > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                              {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(saldo)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Linha 2: ações */}
                      <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-md hover:bg-muted hover:text-foreground transition-colors"
                          onClick={() => setSelectedSale(transaction)}
                        >
                          <FaEye className="h-4 w-4 mr-2" /> Ver detalhes
                        </Button>
                        {(transaction.status || 'pending') !== 'cancelled' &&
                         (transaction.status || 'pending') !== 'paid' && (
                          <Link to={`/sales/receipts?saleId=${transaction.id}&amount=${Math.max(0, transaction.amount - (transaction.paidAmount || 0))}`}>
                            <Button size="sm" className="h-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold">
                              💰 Dar baixa
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg"
                          disabled={(transaction.status || 'pending') === 'cancelled'}
                          onClick={() => cancelSale(transaction.id)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground py-4">
                {isClientsError ? "Falha ao carregar clientes." : "Nenhuma venda registrada."}
              </p>
            )}
          </CardContent>
        </Card>
      </SectionCard>

      <SaleDetailModal
        open={!!selectedSale}
        transaction={selectedSale}
        onClose={() => setSelectedSale(null)}
        clientName={getClientName(selectedSale?.relatedClientId)}
        clientPhone={
          selectedSale?.relatedClientId
            ? clients.find(c => c.id === selectedSale.relatedClientId)?.phone || undefined
            : undefined
        }
        clientAddress={
          selectedSale?.relatedClientId
            ? (() => {
                const client = clients.find(c => c.id === selectedSale.relatedClientId);
                if (!client?.address) return undefined;
                const a = client.address;
                if (typeof a === "string") return a;
                const parts = [
                  a.street && a.number ? `${a.street}, ${a.number}` : a.street,
                  a.complement,
                  a.neighborhood,
                  a.city,
                  a.cep ? `CEP ${a.cep}` : undefined,
                ].filter(Boolean);
                return parts.length > 0 ? parts.join(" · ") : undefined;
              })()
            : undefined
        }
        animalName={
          selectedSale?.relatedClientId && selectedSale?.relatedAnimalId
            ? clients
                .find(c => c.id === selectedSale.relatedClientId)
                ?.animals.find(a => a.id === selectedSale.relatedAnimalId)
                ?.name
            : undefined
        }
        animalSpecies={
          selectedSale?.relatedClientId && selectedSale?.relatedAnimalId
            ? clients
                .find(c => c.id === selectedSale.relatedClientId)
                ?.animals.find(a => a.id === selectedSale.relatedAnimalId)
                ?.species
            : undefined
        }
        animalBreed={
          selectedSale?.relatedClientId && selectedSale?.relatedAnimalId
            ? clients
                .find(c => c.id === selectedSale.relatedClientId)
                ?.animals.find(a => a.id === selectedSale.relatedAnimalId)
                ?.breed
            : undefined
        }
        animalAge={
          selectedSale?.relatedClientId && selectedSale?.relatedAnimalId
            ? (() => {
                const animal = clients
                  .find(c => c.id === selectedSale.relatedClientId)
                  ?.animals.find(a => a.id === selectedSale.relatedAnimalId);
                if (!animal?.birthday) return undefined;
                if (animal.birthday) {
                  const birth = new Date(animal.birthday);
                  const now = new Date();
                  const years = now.getFullYear() - birth.getFullYear();
                  const months = now.getMonth() - birth.getMonth();
                  const totalMonths = years * 12 + months;
                  if (totalMonths < 12) {
                    return totalMonths === 1 ? "1 mes" : `${totalMonths} meses`;
                  }
                  const y = Math.floor(totalMonths / 12);
                  const m = totalMonths % 12;
                  const anoStr = y === 1 ? "1 ano" : `${y} anos`;
                  const mesStr = m === 1 ? "1 mes" : m > 1 ? `${m} meses` : "";
                  return mesStr ? `${anoStr} e ${mesStr}` : anoStr;
                }
                return undefined;
              })()
            : undefined
        }
      />
    </PageShell>
  );
};

export default SalesPage;