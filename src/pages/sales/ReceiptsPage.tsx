import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { ArrowLeft, Banknote, Calendar, ClipboardList, CreditCard, PawPrint, Tag, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/saas/PageHeader";
import { addReceipt } from "@/lib/financialApi";
import { formatCurrencyBRL, formatDateTime } from "@/lib/utils";
import { useRegistryList } from "@/hooks/useRegistryList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PageShell } from "@/components/saas/PageShell";
import { SectionCard } from "@/components/saas/SectionCard";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import CurrencyInput from "@/components/CurrencyInput";
import { getPatientRecordPath } from "@/utils/patientDisplayId";

const ReceiptsPage = () => {
  const { list: pmRegistry } = useRegistryList("paymentMethods");
  const { transactions, refetch } = useFinancialTransactions();
  const [searchParams] = useSearchParams();
  const { data: dbClients } = useClientsList();
  const clients = dbClients || [];
  const [paymentMethod, setPaymentMethod] = useState<string>("all");

  const salesList = useMemo(() => {
    return transactions
      .filter(t =>
        t.type === 'income' &&
        t.category === 'Venda de Produtos' &&
        (t.status || 'pending') !== 'cancelled'
      );
  }, [transactions]);

  const [selectedSaleId, setSelectedSaleId] = useState<string>(
    searchParams.get("saleId") || "none"
  );
  const [receiptAmount, setReceiptAmount] = useState<number>(
    parseFloat(searchParams.get("amount") || "0") || 0
  );
  const [receiptMethodId, setReceiptMethodId] = useState<string | undefined>(undefined);
  const [receiptDate, setReceiptDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [receiptTime, setReceiptTime] = useState<string>(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  const [receiptObservations, setReceiptObservations] = useState<string>("");
  const [savingReceipt, setSavingReceipt] = useState(false);

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
      .filter(t => t.type === 'income' && t.category === 'Recebimento')
      .filter(t => paymentMethod === "all" || t.paymentMethod === paymentMethod)
      .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());
  }, [paymentMethod, transactions]);

  const totals = receipts.reduce((sum, r) => sum + r.amount, 0);

  const selectedSale = useMemo(() => {
    if (!selectedSaleId || selectedSaleId === "none") return null;
    return transactions.find(t => t.id === selectedSaleId) || null;
  }, [selectedSaleId, transactions]);
  const saleInstallments = selectedSale?.paymentInstallments ?? 1;
  const installmentValue = saleInstallments > 1
    ? Math.round((selectedSale?.amount ?? 0) / saleInstallments * 100) / 100
    : 0;

  const handleAddReceipt = async () => {
    if (savingReceipt) return;
    if (!receiptAmount || receiptAmount <= 0) {
      toast.error("Informe um valor válido para recebimento.");
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    if (receiptDate > today) {
      toast.error("Data do recebimento não pode ser futura.");
      return;
    }
    setSavingReceipt(true);
    try {
      const normalizedSaleId = selectedSaleId === "none" ? undefined : selectedSaleId;
      const pmName = receiptMethodId ? (pmRegistry.find(pm => pm.id === receiptMethodId)?.name || undefined) : undefined;
      await addReceipt({
        saleId: normalizedSaleId,
        amount: receiptAmount,
        paymentMethod: pmName,
        description: normalizedSaleId ? "Recebimento de venda" : "Recebimento",
        relatedClientId: normalizedSaleId ? transactions.find(t => t.id === normalizedSaleId)?.relatedClientId : undefined,
        relatedAnimalId: normalizedSaleId ? transactions.find(t => t.id === normalizedSaleId)?.relatedAnimalId : undefined,
        date: receiptDate,
        time: receiptTime,
        observations: receiptObservations.trim() || undefined,
      });
      await refetch();
      toast.success("Recebimento registrado.");
      setSelectedSaleId("none");
      setReceiptAmount(0);
      setReceiptMethodId(undefined);
      setReceiptDate(new Date().toISOString().split("T")[0]);
      setReceiptTime(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      setReceiptObservations("");
    } finally {
      setSavingReceipt(false);
    }
  };

  const getClientName = (clientId?: string) =>
    clientId ? (clients.find(c => c.id === clientId)?.name || null) : null;

  const getAnimalName = (clientId?: string, animalId?: string) => {
    if (!clientId || !animalId) return null;
    return clients.find(c => c.id === clientId)?.animals.find(a => a.id === animalId)?.name || null;
  };

  const getAnimalPatientCode = (clientId?: string, animalId?: string) => {
    if (!clientId || !animalId) return undefined;
    return clients.find(c => c.id === clientId)?.animals.find(a => a.id === animalId)?.patientCode;
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

      {(() => {
        const pendingSales = transactions.filter(
          t => t.type === 'income' &&
               t.category === 'Venda de Produtos' &&
               (t.status || 'pending') !== 'paid' &&
               (t.status || 'pending') !== 'cancelled' &&
               t.amount > (t.paidAmount || 0)
        );
        if (pendingSales.length === 0) return null;
        return (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-2">
            <div className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
              ⚠️ Vendas aguardando pagamento ({pendingSales.length})
            </div>
            <div className="space-y-2">
              {pendingSales.map(sale => {
                const saldo = sale.amount - (sale.paidAmount || 0);
                const clientName = clients.find(c => c.id === sale.relatedClientId)?.name;
                return (
                  <div key={sale.id} className="flex items-center justify-between rounded-lg bg-white border border-amber-100 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate max-w-[300px]">
                        {clientName ? `${clientName} — ` : ""}{sale.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total: {formatCurrencyBRL(sale.amount)}
                        {" · "}Pago: {formatCurrencyBRL(sale.paidAmount || 0)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-amber-700">
                        {formatCurrencyBRL(saldo)} a receber
                      </span>
                      <Button
                        size="sm"
                        className="h-7 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs"
                        onClick={() => {
                          setSelectedSaleId(sale.id);
                          setReceiptAmount(saldo);
                        }}
                      >
                        Selecionar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Formulário de novo recebimento */}
      <SectionCard
        title="Registrar recebimento"
        description="Vincule o pagamento a uma venda ou registre uma entrada avulsa."
        icon={Banknote}
        tone="sales"
      >
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">

            {/* Venda relacionada */}
            <div className="min-w-[220px] flex-1">
              <label className="text-xs font-medium text-muted-foreground">
                Venda relacionada (opcional)
              </label>
              <Select
                onValueChange={(val) => {
                  setSelectedSaleId(val);
                  if (val && val !== "none") {
                    const sale = transactions.find(t => t.id === val);
                    if (sale) {
                      const saldo = Math.max(0, sale.amount - (sale.paidAmount || 0));
                      setReceiptAmount(saldo);
                      // Preencher forma de pagamento automaticamente
                      if (sale.paymentMethod) {
                        const pm = pmRegistry.find(p => p.name === sale.paymentMethod);
                        if (pm) setReceiptMethodId(pm.id);
                      }
                    }
                  }
                }}
                value={selectedSaleId}
              >
                <SelectTrigger className="mt-1 h-10 border border-border bg-card">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma — entrada avulsa</SelectItem>
                  {salesList.map(s => {
                    const saldo = s.amount - (s.paidAmount || 0);
                    return (
                      <SelectItem key={s.id} value={s.id}>
                        {formatCurrencyBRL(s.amount)}
                        {saldo > 0
                          ? ` — saldo ${formatCurrencyBRL(saldo)}`
                          : ' ✓'}
                        {" · "}{s.description.length > 40 ? `${s.description.slice(0, s.description.lastIndexOf(" ", 40) > 0 ? s.description.lastIndexOf(" ", 40) : 40)}…` : s.description}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Valor */}
            <div className="w-40 shrink-0">
              <label className="text-xs font-medium text-muted-foreground">
                Valor recebido (R$)
              </label>
              <CurrencyInput
                value={receiptAmount}
                onValueChange={setReceiptAmount}
                className="mt-1 h-10 border border-border bg-card text-sm w-full"
              />
            </div>

            {/* Data */}
            <div className="w-40 shrink-0">
              <label className="text-xs font-medium text-muted-foreground">
                Data
              </label>
              <Input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="mt-1 h-10 border border-border bg-card text-sm w-full"
              />
            </div>

            {/* Hora */}
            <div className="w-28 shrink-0">
              <label className="text-xs font-medium text-muted-foreground">
                Hora
              </label>
              <Input
                value={receiptTime}
                onChange={(e) => setReceiptTime(e.target.value)}
                className="mt-1 h-10 border border-border bg-card text-sm w-full"
              />
            </div>

            {/* Forma de pagamento */}
            <div className="w-48 shrink-0">
              <label className="text-xs font-medium text-muted-foreground">
                Forma de pagamento
              </label>
              <Select onValueChange={setReceiptMethodId} value={receiptMethodId}>
                <SelectTrigger className="mt-1 h-10 border border-border bg-card">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {pmRegistry.length > 0 ? (
                    pmRegistry.map(pm => (
                      <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      Cadastre em Financeiro › Formas de Pagamento
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Observações */}
            <div className="min-w-[220px] flex-1">
              <label className="text-xs font-medium text-muted-foreground">
                Observações
              </label>
              <Textarea
                value={receiptObservations}
                onChange={(e) => setReceiptObservations(e.target.value)}
                className="mt-1 min-h-10 h-10 border border-border bg-card text-sm w-full"
              />
            </div>

            {/* Botão */}
            <div className="shrink-0 self-end">
              <Button
                onClick={() => void handleAddReceipt()}
                disabled={savingReceipt}
                className="h-10 px-6 bg-emerald-600 text-white font-semibold rounded-xl shadow-md hover:bg-emerald-700 transition-all"
              >
                <Banknote className="h-4 w-4 mr-2" /> {savingReceipt ? "Registrando..." : "Registrar"}
              </Button>
            </div>
          </div>

          {saleInstallments > 1 && selectedSaleId !== "none" && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 mt-3">
              <div className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5" /> Cartão parcelado — {saleInstallments}x de{" "}
                {formatCurrencyBRL(installmentValue)}
              </div>
              <div className="text-xs text-blue-700">
                O valor acima corresponde ao total da venda. O parcelamento
                é gerenciado pela operadora do cartão — registre a baixa
                pelo valor total quando o pagamento for confirmado.
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Filtro + lista */}
      <SectionCard
        title="Histórico de recebimentos"
        description="Entradas registradas no sistema vinculadas a vendas."
        icon={Tag}
        tone="sales"
      >
        {/* Filtro e total */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">
              Filtrar por pagamento:
            </label>
            <Select onValueChange={setPaymentMethod} value={paymentMethod}>
              <SelectTrigger className="h-8 w-44 border border-border bg-card text-sm">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as formas</SelectItem>
                {paymentMethodOptions.map(pm => (
                  <SelectItem key={pm} value={pm}>{pm}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5">
            <span className="text-xs text-emerald-700 font-medium">Total recebido:</span>
            <span className="text-sm font-bold text-emerald-700">
              {formatCurrencyBRL(totals)}
            </span>
          </div>
        </div>

        {/* Lista */}
        {receipts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground text-sm">
            Nenhum recebimento registrado ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {receipts.map(rec => {
              const isReversal = rec.amount < 0;
              return (
              <div key={rec.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center ${isReversal ? "bg-red-50" : "bg-emerald-50"}`}>
                    <Banknote className={`h-4 w-4 ${isReversal ? "text-red-600" : "text-emerald-600"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate max-w-[320px]">
                      {rec.description}
                    </p>
                    {(getClientName(rec.relatedClientId) || getAnimalName(rec.relatedClientId, rec.relatedAnimalId)) && (
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        {getClientName(rec.relatedClientId) && (
                          <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {getClientName(rec.relatedClientId)}</span>
                        )}
                        {getAnimalName(rec.relatedClientId, rec.relatedAnimalId) && (
                          <span className="inline-flex items-center gap-1"><PawPrint className="h-3 w-3" /> {getAnimalName(rec.relatedClientId, rec.relatedAnimalId)}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(rec.date, rec.time)}
                      </span>
                      {rec.paymentMethod && (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium">
                          {rec.paymentMethod}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-base font-bold ${isReversal ? "text-red-600" : "text-emerald-600"}`}>
                    {formatCurrencyBRL(rec.amount)}
                  </span>
                  {rec.relatedClientId && rec.relatedAnimalId && (
                    <Link to={getPatientRecordPath(rec.relatedClientId, rec.relatedAnimalId, getAnimalPatientCode(rec.relatedClientId, rec.relatedAnimalId))}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-lg border-border text-xs font-medium hover:bg-muted"
                      >
                        <ClipboardList className="h-3.5 w-3.5 mr-1" /> Prontuário
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
};

export default ReceiptsPage;