import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Banknote, Calendar, Tag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/saas/PageHeader";
import { VfCard } from "@/components/saas/VfCard";
import { addReceipt } from "@/lib/financialApi";
import { formatDateTime } from "@/lib/utils";
import { useRegistryList } from "@/hooks/useRegistryList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PageShell } from "@/components/saas/PageShell";
import { SectionCard } from "@/components/saas/SectionCard";
import { ToolbarRow } from "@/components/saas/ToolbarRow";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";

const ReceiptsPage = () => {
  const { list: pmRegistry } = useRegistryList("paymentMethods");
  const { transactions, refetch } = useFinancialTransactions();
  const [paymentMethod, setPaymentMethod] = useState<string>("all");

  const salesList = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income' && t.category === 'Venda de Produtos');
  }, [transactions]);

  const [selectedSaleId, setSelectedSaleId] = useState<string>("none");
  const [receiptAmount, setReceiptAmount] = useState<number>(0);
  const [receiptMethodId, setReceiptMethodId] = useState<string | undefined>(undefined);

  const paymentMethodOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...pmRegistry.map((pm) => pm.name).filter(Boolean),
          ...transactions
            .filter((t) => t.type === "income" && t.paymentMethod)
            .map((t) => t.paymentMethod as string),
        ])
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [pmRegistry, transactions]
  );

  const receipts = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income')
      .filter(t => paymentMethod === "all" || t.paymentMethod === paymentMethod)
      .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());
  }, [paymentMethod, transactions]);

  const totals = receipts.reduce((sum, r) => sum + (typeof r.paidAmount === 'number' && r.category === 'Venda de Produtos' ? r.paidAmount : r.amount), 0);

  const handleAddReceipt = async () => {
    if (!receiptAmount || receiptAmount <= 0) {
      toast.error("Informe um valor válido para recebimento.");
      return;
    }
    const normalizedSaleId = selectedSaleId === "none" ? undefined : selectedSaleId;
    const pmName = receiptMethodId ? (pmRegistry.find(pm => pm.id === receiptMethodId)?.name || undefined) : undefined;
    await addReceipt({
      saleId: normalizedSaleId,
      amount: receiptAmount,
      paymentMethod: pmName,
      description: normalizedSaleId ? "Recebimento de venda" : "Recebimento",
      relatedClientId: normalizedSaleId ? transactions.find(t => t.id === normalizedSaleId)?.relatedClientId : undefined,
      relatedAnimalId: normalizedSaleId ? transactions.find(t => t.id === normalizedSaleId)?.relatedAnimalId : undefined,
    });
    await refetch();
    toast.success("Recebimento registrado.");
    setSelectedSaleId("none");
    setReceiptAmount(0);
    setReceiptMethodId(undefined);
  };

  return (
    <PageShell>
      <PageHeader
        title="Recebimentos"
        description="Registre e acompanhe entradas vinculadas a vendas."
        icon={Banknote}
        module="sales"
        breadcrumb={<>Painel &gt; Vendas &gt; Recebimentos</>}
        actions={
          <Link to="/sales/my-sales">
            <Button variant="outline" className="rounded-xl border-primary/20 shadow-sm transition-colors hover:border-primary/40">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Vendas
            </Button>
          </Link>
        }
      />

      <SectionCard
        title="Filtro e novo recebimento"
        description="Selecione forma de pagamento e registre entradas com vínculo opcional à venda."
        icon={Banknote}
        tone="sales"
      >
        <ToolbarRow className="grid grid-cols-1 gap-2 lg:grid-cols-4">
          <div>
            <label className="text-xs text-muted-foreground">Forma de Pagamento</label>
            <Select onValueChange={setPaymentMethod} value={paymentMethod}>
              <SelectTrigger className="vf-toolbar-control bg-input">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {paymentMethodOptions.map(pm => <SelectItem key={pm} value={pm}>{pm}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-3">
            <VfCard tone="sales" className="card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Novo Recebimento</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Venda relacionada (opcional)</label>
                <Select onValueChange={setSelectedSaleId} value={selectedSaleId}>
                  <SelectTrigger className="vf-toolbar-control bg-input">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {salesList.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.description} • R$ {s.amount.toFixed(2).replace('.', ',')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Valor</label>
                <Input type="number" min="0" step="0.01" value={receiptAmount} onChange={(e) => setReceiptAmount(parseFloat(e.target.value) || 0)} className="vf-toolbar-control bg-input" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Forma de Pagamento</label>
                <Select onValueChange={setReceiptMethodId} value={receiptMethodId}>
                  <SelectTrigger className="vf-toolbar-control bg-input">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {pmRegistry.length > 0 ? pmRegistry.map(pm => (
                      <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                    )) : (
                      <SelectItem value="none" disabled>Cadastre formas em Financeiro &gt; Formas de Pagamento</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Button onClick={() => void handleAddReceipt()} className="h-9 px-4 bg-[hsl(var(--vf-sales))] text-white hover:bg-[hsl(var(--vf-sales)/0.9)]">Registrar</Button>
              </div>
              <div className="md:col-span-5 text-sm bg-muted px-3 py-2 rounded-md">
                Total Recebido (lista): {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totals)}
              </div>
              </CardContent>
            </VfCard>
          </div>
        </ToolbarRow>
      </SectionCard>

      <SectionCard
        title="Lista de recebimentos"
        description="Acompanhe data, forma de pagamento e categoria de cada entrada."
        icon={Tag}
        tone="sales"
      >
      <VfCard tone="sales" className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-foreground">Lista de Recebimentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
            {receipts.map(rec => (
              <Card key={rec.id} className="vf-surface-card vf-tone-sales card-hover border-border/80 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                      Receita
                    </span>
                    <span className="text-sm">{rec.description}</span>
                  </div>
                  <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                      rec.category === 'Venda de Produtos' && typeof rec.paidAmount === 'number' ? rec.paidAmount : rec.amount
                    )}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-vf-sales" /> {formatDateTime(rec.date, rec.time)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5 text-vf-finance" /> Pagamento: {rec.paymentMethod || "N/A"}
                  </div>
                  <div className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5 text-primary" /> Categoria: {rec.category}
                  </div>
                </div>
                {rec.relatedClientId && rec.relatedAnimalId && (
                  <div className="mt-2">
                    <Link to={`/clients/${rec.relatedClientId}/animals/${rec.relatedAnimalId}/record`}>
                      <Button variant="outline" size="sm">Abrir Prontuário</Button>
                    </Link>
                  </div>
                )}
              </Card>
            ))}
          </CardContent>
        </VfCard>
      </SectionCard>
    </PageShell>
  );
};

export default ReceiptsPage;