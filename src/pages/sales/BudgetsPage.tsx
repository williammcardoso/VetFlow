import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CurrencyInput from "@/components/CurrencyInput";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getCatalog as getCatalogApi } from "@/lib/catalogApi";
import type { CatalogItem } from "@/mockData/catalog";
import { addFinancialTransaction } from "@/lib/financialApi";
import { addSaleItems } from "@/lib/saleItemsApi";
import { fulfillSaleLines } from "@/lib/saleFulfillment";
import { resolveCartLineCosts } from "@/lib/saleCosting";
import { getBudgets, addBudget, updateBudget, updateBudgetStatus, removeBudget, setBudgetPaymentMethod } from "@/lib/budgetsApi";
import type { Budget } from "@/mockData/budgets";
import { useRegistryList } from "@/hooks/useRegistryList";
import AutocompleteSelect from "@/components/AutocompleteSelect";
import ClientCombobox from "@/components/ClientCombobox";
import { getPatientRecordPath } from "@/utils/patientDisplayId";
import { formatAgeLong, formatCurrencyBRL, formatDateTime, formatItemQty } from "@/lib/utils";
import BudgetReportPdfContent from "@/components/BudgetReportPdfContent";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { Link } from "react-router-dom";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";
import { DataTableFrame } from "@/components/saas/DataTableFrame";
import { ArrowLeft, FileText, Filter, Sparkles, CheckCircle2, Ban, Trash2, Printer, Plus, Pencil } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { createPdfBlob, openPdf } from "@/lib/pdfExport";
import { sendPdfViaWhatsApp } from "@/lib/whatsappShare";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";

const fmtBRL = (v: number) =>
  formatCurrencyBRL(v);

// Rótulos em PT-BR para os status persistidos em inglês no banco.
const BUDGET_STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-slate-100 text-slate-700 border border-slate-200" },
  approved: { label: "Aprovado", className: "bg-blue-100 text-blue-700 border border-blue-200" },
  converted: { label: "Convertido", className: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  cancelled: { label: "Cancelado", className: "bg-red-100 text-red-700 border border-red-200" },
};

const BudgetsPage: React.FC = () => {
  const { data: dbClients, isError: isClientsError } = useClientsList();
  const clients = dbClients || [];
  const [clientId, setClientId] = React.useState<string | undefined>(undefined);
  const [animalId, setAnimalId] = React.useState<string | undefined>(undefined);
  const [productId, setProductId] = React.useState<string>("");
  const [qty, setQty] = React.useState<number>(1);
  const [unitPrice, setUnitPrice] = React.useState<number>(0);
  const [items, setItems] = React.useState<{ itemId: string; name: string; qty: number; price: number }[]>([]);
  const [customItemEnabled, setCustomItemEnabled] = React.useState<boolean>(false);
  const [customItemName, setCustomItemName] = React.useState<string>("");
  const [customItemPrice, setCustomItemPrice] = React.useState<number>(0);
  const [discount, setDiscount] = React.useState<number>(0);
  const [surcharge, setSurcharge] = React.useState<number>(0);
  const [discountPct, setDiscountPct] = React.useState<string>("");
  const [surchargePct, setSurchargePct] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");
  const [editingBudgetId, setEditingBudgetId] = React.useState<string | null>(null);

  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  const { profile: currentUserProfile } = useCurrentUserProfile();
  const [catalogItems, setCatalogItems] = React.useState<CatalogItem[]>([]);
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { getCatalogApi().then(setCatalogItems); }, []);

  // Catálogo e formas de pagamento vêm do banco (antes eram cópias locais).
  const options = React.useMemo(
    () => catalogItems.filter(p => p.active).map(p => ({ value: p.id, label: p.name })),
    [catalogItems]
  );
  const { list: paymentMethods } = useRegistryList("paymentMethods");
  const findCatalogItem = React.useCallback(
    (id: string) => catalogItems.find(it => it.id === id),
    [catalogItems]
  );

  const refreshBudgets = React.useCallback(async () => {
    setBudgets(await getBudgets());
  }, []);
  React.useEffect(() => { void refreshBudgets(); }, [refreshBudgets]);

  const animals = React.useMemo(() => {
    if (!clientId) return [];
    const client = clients.find(c => c.id === clientId);
    return client?.animals || [];
  }, [clientId, clients]);

  React.useEffect(() => {
    if (!productId) {
      setUnitPrice(0);
      return;
    }
    const item = findCatalogItem(productId);
    setUnitPrice(item?.price || 0);
  }, [productId]);

  const subtotal = items.reduce((sum, it) => sum + it.qty * it.price, 0);
  const totalFinal = Math.max(0, subtotal - discount + surcharge);

  // % e valor andam juntos: digitar em um recalcula o outro (mesmo
  // comportamento do PDV).
  const applyDiscountPct = (v: string) => {
    setDiscountPct(v);
    const pct = parseFloat(v.replace(",", ".")) || 0;
    setDiscount(pct > 0 ? Math.round(subtotal * pct) / 100 : 0);
  };
  const applyDiscountVal = (v: number) => {
    setDiscount(v);
    setDiscountPct(v > 0 && subtotal > 0 ? ((v / subtotal) * 100).toFixed(2) : "");
  };
  const applySurchargePct = (v: string) => {
    setSurchargePct(v);
    const pct = parseFloat(v.replace(",", ".")) || 0;
    setSurcharge(pct > 0 ? Math.round(subtotal * pct) / 100 : 0);
  };
  const applySurchargeVal = (v: number) => {
    setSurcharge(v);
    setSurchargePct(v > 0 && subtotal > 0 ? ((v / subtotal) * 100).toFixed(2) : "");
  };

  const addItemToBudget = () => {
    if (customItemEnabled) {
      if (!customItemName.trim() || customItemPrice <= 0 || qty <= 0) {
        toast.error("Preencha nome, preço e quantidade válidos para o item personalizado.");
        return;
      }
      setItems(prev => [...prev, { itemId: `custom-${Date.now()}`, name: customItemName.trim(), qty, price: customItemPrice }]);
      setCustomItemName(""); setCustomItemPrice(0); setQty(1);
      return;
    }

    if (!productId) {
      toast.error("Selecione um item do catálogo.");
      return;
    }
    const item = findCatalogItem(productId);
    if (!item) {
      toast.error("Item não encontrado no catálogo.");
      return;
    }
    if (qty <= 0) {
      toast.error("Quantidade deve ser maior que zero.");
      return;
    }
    setItems(prev => [...prev, { itemId: item.id, name: item.name, qty, price: unitPrice }]);
    setProductId(""); setQty(1); setUnitPrice(0);
  };

  const resetBudgetForm = () => {
    setItems([]);
    setClientId(undefined);
    setAnimalId(undefined);
    setDiscount(0);
    setSurcharge(0);
    setDiscountPct("");
    setSurchargePct("");
    setNotes("");
    setEditingBudgetId(null);
  };

  const startEditBudget = (b: Budget) => {
    setEditingBudgetId(b.id);
    setClientId(b.clientId);
    setAnimalId(b.animalId);
    setItems(b.items.map((it) => ({ ...it })));
    setNotes(b.notes || "");
    const itemsSubtotal = b.items.reduce((sum, it) => sum + it.qty * it.price, 0);
    setDiscount(b.discountAmount || 0);
    setSurcharge(b.surchargeAmount || 0);
    setDiscountPct(b.discountAmount && itemsSubtotal > 0 ? ((b.discountAmount / itemsSubtotal) * 100).toFixed(2) : "");
    setSurchargePct(b.surchargeAmount && itemsSubtotal > 0 ? ((b.surchargeAmount / itemsSubtotal) * 100).toFixed(2) : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveBudget = async () => {
    if (items.length === 0) {
      toast.error("Adicione itens ao orçamento.");
      return;
    }
    const selectedClient = clientId ? clients.find((c) => c.id === clientId) : undefined;
    const selectedAnimal = animalId ? selectedClient?.animals.find((a) => a.id === animalId) : undefined;
    setSaving(true);
    try {
      if (editingBudgetId) {
        const existing = budgets.find((b) => b.id === editingBudgetId);
        if (!existing) {
          toast.error("Orçamento não encontrado.");
          return;
        }
        const ok = await updateBudget({
          ...existing,
          clientId,
          animalId,
          clientName: selectedClient?.name ?? existing.clientName,
          animalName: selectedAnimal?.name ?? existing.animalName,
          clientPhone: selectedClient?.mainPhoneContact ?? existing.clientPhone,
          items,
          notes: notes.trim() || undefined,
          discountAmount: discount > 0 ? discount : undefined,
          surchargeAmount: surcharge > 0 ? surcharge : undefined,
        });
        if (!ok) {
          toast.error("Falha ao atualizar o orçamento.");
          return;
        }
        toast.success("Orçamento atualizado.");
      } else {
        const created = await addBudget({
          clientId,
          animalId,
          clientName: selectedClient?.name,
          animalName: selectedAnimal?.name,
          clientPhone: selectedClient?.mainPhoneContact,
          items,
          notes: notes.trim() || undefined,
          discountAmount: discount > 0 ? discount : undefined,
          surchargeAmount: surcharge > 0 ? surcharge : undefined,
        });
        if (!created) {
          toast.error("Falha ao salvar o orçamento.");
          return;
        }
        toast.success("Orçamento salvo.");
      }
      resetBudgetForm();
      await refreshBudgets();
    } finally {
      setSaving(false);
    }
  };

  const [pmByBudget, setPmByBudget] = React.useState<Record<string, string | undefined>>({});

  const convertBudget = async (budgetId: string) => {
    const budget = budgets.find(b => b.id === budgetId);
    if (!budget) return;
    if (budget.status === "converted") {
      toast.error("Este orçamento já foi convertido.");
      return;
    }
    const pmName = pmByBudget[budgetId] ?? budget.paymentMethod;
    if (!pmName) {
      toast.error("Selecione a forma de pagamento antes de converter.");
      return;
    }
    // O valor da venda é o NEGOCIADO (com desconto/acréscimo), não o bruto.
    const itemsSubtotal = budget.items.reduce((sum, it) => sum + it.qty * it.price, 0);
    const budgetDiscount = budget.discountAmount ?? 0;
    const budgetSurcharge = budget.surchargeAmount ?? 0;
    const total = Math.max(0, itemsSubtotal - budgetDiscount + budgetSurcharge);
    const catalogLines = budget.items.filter((it) => findCatalogItem(it.itemId));
    const customLines = budget.items.filter((it) => !findCatalogItem(it.itemId));
    const catalogById = new Map(catalogItems.map((c) => [c.id, c]));
    const resolved = await resolveCartLineCosts(
      catalogLines.map((it) => ({ catalogItemId: it.itemId, quantity: it.qty })),
      catalogById
    );
    const totalCost =
      catalogLines.reduce((sum, it) => {
        const r = resolved.get(it.itemId);
        return sum + (r?.unitCost ?? 0) * it.qty;
      }, 0);
    const now = new Date();
    const clientLabel = budget.clientName ? ` para ${budget.clientName}` : "";

    setSaving(true);
    try {
      const transaction = await addFinancialTransaction({
        date: now.toISOString().split("T")[0],
        time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        description: `Venda${clientLabel}: ${budget.items.map(i => formatItemQty(i.name, i.qty)).join(", ")}`,
        type: "income",
        amount: total,
        category: "Venda de Produtos",
        relatedClientId: budget.clientId,
        relatedAnimalId: budget.animalId,
        paymentMethod: pmName,
        status: "pending",
        supplierCost: totalCost,
        discountAmount: budgetDiscount > 0 ? budgetDiscount : undefined,
        surchargeAmount: budgetSurcharge > 0 ? budgetSurcharge : undefined,
        observations: budget.notes || undefined,
      });
      if (!transaction) {
        toast.error("Falha ao gerar a venda. O orçamento não foi convertido.");
        return;
      }

      if (catalogLines.length > 0) {
        await fulfillSaleLines({
          saleId: transaction.id,
          catalog: catalogItems,
          lines: catalogLines.map((it) => {
            const catItem = findCatalogItem(it.itemId)!;
            return {
              catalogItemId: it.itemId,
              name: it.name,
              type: catItem.type,
              category: catItem.category,
              quantity: it.qty,
              unitPrice: it.price,
            };
          }),
        });
      }

      // Itens personalizados (fora do catálogo): sem estoque/BOM
      if (customLines.length > 0) {
        await addSaleItems(
          transaction.id,
          customLines.map((it) => ({
            catalogItemId: it.itemId,
            name: it.name,
            type: "service" as const,
            quantity: it.qty,
            unitPrice: it.price,
            cost: 0,
            productCost: 0,
            providerCost: 0,
            subtotal: it.price * it.qty,
          }))
        );
      }

      // Guarda a forma usada, senão o campo volta vazio depois da conversão.
      await setBudgetPaymentMethod(budgetId, pmName);
      await updateBudgetStatus(budgetId, "converted");
      await refreshBudgets();
      toast.success("Orçamento convertido em venda. Veja em Vendas.");
    } finally {
      setSaving(false);
    }
  };

  const cancelBudget = async (budgetId: string) => {
    await updateBudgetStatus(budgetId, "cancelled");
    await refreshBudgets();
    toast.success("Orçamento cancelado.");
  };

  const removeBudgetAction = async (budgetId: string) => {
    await removeBudget(budgetId);
    await refreshBudgets();
    toast.success("Orçamento removido.");
  };

  // Dados ricos (espécie, raça, idade, peso, endereço, telefone) vêm do
  // cadastro atual; o snapshot gravado no orçamento é o fallback se o cliente
  // foi removido — compartilhado entre imprimir e enviar por WhatsApp.
  const buildBudgetPdfBlob = async (b: Budget) => {
    const pdfClient = b.clientId ? clients.find(c => c.id === b.clientId) : undefined;
    const pdfAnimal = b.animalId ? pdfClient?.animals.find(a => a.id === b.animalId) : undefined;
    const addr = pdfClient?.address;
    const addressLine = addr && typeof addr !== "string"
      ? [
          addr.street && addr.number ? `${addr.street}, ${addr.number}` : addr.street,
          addr.neighborhood,
        ].filter(Boolean).join(" - ")
      : (typeof addr === "string" ? addr : undefined);

    const blob = await createPdfBlob(
      <BudgetReportPdfContent
        budget={b}
        userProfile={currentUserProfile}
        tutorAddress={addressLine}
        tutorPhone={pdfClient?.mainPhoneContact || b.clientPhone}
        petSpecies={pdfAnimal?.species}
        petBreed={pdfAnimal?.breed}
        petAge={formatAgeLong(pdfAnimal?.birthday)}
        petWeight={pdfAnimal?.weight != null ? `${pdfAnimal.weight} kg` : undefined}
      />
    );
    return { blob, phone: pdfClient?.mainPhoneContact || b.clientPhone };
  };

  const handleOpenBudgetPdf = async (b: Budget) => {
    const { blob } = await buildBudgetPdfBlob(b);
    await openPdf({
      blob,
      fileName: `orcamento_${b.id}.pdf`,
      persistOptions: { folder: "budgets" },
    });
  };

  const handleSendBudgetWhatsApp = async (b: Budget) => {
    try {
      const { blob, phone } = await buildBudgetPdfBlob(b);
      await sendPdfViaWhatsApp({
        phone,
        blob,
        fileName: `orcamento_${b.id}.pdf`,
        folder: "budgets",
        title: "Orçamento",
        intro: `Olá! Segue o orçamento de *${b.animalName || "seu pet"}*.`,
        dateLabel: formatDateTime(b.date),
      });
    } catch (err) {
      console.error("[Enviar orçamento por WhatsApp] falhou ao gerar o PDF", err);
      toast.error("Não consegui gerar o PDF deste orçamento para enviar por WhatsApp.");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Orçamentos"
        description="Monte propostas comerciais com itens de catálogo e converta em venda com rastreio de pagamento."
        icon={FileText}
        module="sales"
        breadcrumb={<>Painel &gt; Comercial &gt; Orçamentos</>}
        actions={
          <Button asChild variant="outline" className="rounded-xl border-border/70">
            <Link to="/sales/my-sales">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para vendas
            </Link>
          </Button>
        }
      />

      <SectionCard
        title={editingBudgetId ? "Editando orçamento" : "Composição do orçamento"}
        description={
          editingBudgetId
            ? "Adicione ou remova itens e salve para atualizar a proposta existente."
            : "Selecione cliente, itens e quantidades para montar a proposta."
        }
        icon={Filter}
        tone="sales"
      >
        <div className="space-y-3">
          {editingBudgetId && (
            <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <span>Editando orçamento existente — os itens abaixo substituirão os atuais ao salvar.</span>
              <Button variant="outline" size="sm" className="h-7 shrink-0 rounded-lg border-amber-300 text-xs hover:bg-amber-100" onClick={resetBudgetForm}>
                Cancelar edição
              </Button>
            </div>
          )}
          {/* Cliente/animal ocupam a largura útil; antes ficavam espremidos
              em 2 de 6 colunas, sobrando um vazio enorme à direita. */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">Cliente</Label>
              <ClientCombobox
                clients={clients}
                value={clientId}
                onChange={(id) => { setClientId(id); setAnimalId(undefined); }}
                placeholder="Selecione"
                className="mt-1 h-9 bg-input"
              />
            </div>
            <div>
              <Label className="text-xs">Animal</Label>
              <Select value={animalId} onValueChange={setAnimalId}>
                <SelectTrigger className="mt-1 h-9 text-sm bg-input"><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {(clients.find(c => c.id === clientId)?.animals || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex w-fit items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={customItemEnabled} onChange={(e) => setCustomItemEnabled(e.target.checked)} />
            Item personalizado (fora do catálogo)
          </label>

          {/* Item + qtd + preço + ação na mesma linha, com o item crescendo */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <Label className="text-xs">{customItemEnabled ? "Nome do item" : "Item"}</Label>
              {!customItemEnabled ? (
                <AutocompleteSelect
                  value={productId}
                  onChange={setProductId}
                  options={options}
                  placeholder="Selecione um item"
                  className="bg-input"
                />
              ) : (
                <Input
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  className="mt-1 h-9 text-sm bg-input"
                  placeholder="Ex.: Cirurgia ortopédica"
                />
              )}
            </div>
            <div className="w-20 shrink-0">
              <Label className="text-xs">Qtd</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 0))}
                className="mt-1 h-9 text-sm bg-input w-full"
              />
            </div>
            <div className="w-36 shrink-0">
              <Label className="text-xs">Preço unitário</Label>
              <CurrencyInput
                value={customItemEnabled ? customItemPrice : unitPrice}
                onValueChange={customItemEnabled ? setCustomItemPrice : setUnitPrice}
                className="mt-1 h-9 text-sm w-full"
              />
            </div>
            <Button
              onClick={addItemToBudget}
              className="h-9 shrink-0 px-4 text-sm bg-[hsl(var(--vf-sales))] text-white hover:bg-[hsl(var(--vf-sales)/0.9)]"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Adicionar item
            </Button>
          </div>
        </div>
      </SectionCard>

      {items.length > 0 && (
        <SectionCard
          title="Itens do orçamento"
          description="Confira o subtotal por item e o total consolidado antes de salvar."
          icon={Sparkles}
          tone="sales"
        >
          <DataTableFrame>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => (
                  <TableRow key={`${it.itemId}-${idx}`}>
                    <TableCell className="font-medium">{it.name}</TableCell>
                    <TableCell>{it.qty}</TableCell>
                    <TableCell>{formatCurrencyBRL(it.price)}</TableCell>
                    <TableCell className="text-right">{formatCurrencyBRL(it.qty * it.price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableFrame>
          {/* Negociação: cirurgia/procedimento caro costuma sair com desconto
              combinado na hora — precisa constar no orçamento impresso. */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Desconto</Label>
                  <div className="mt-1 flex gap-2">
                    <div className="relative w-20 shrink-0">
                      <Input
                        value={discountPct}
                        onChange={(e) => applyDiscountPct(e.target.value)}
                        placeholder="0"
                        inputMode="decimal"
                        className="h-9 pr-6 text-sm bg-card"
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                    <CurrencyInput
                      value={discount}
                      onValueChange={applyDiscountVal}
                      className="h-9 w-full border border-border bg-card text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Acréscimo</Label>
                  <div className="mt-1 flex gap-2">
                    <div className="relative w-20 shrink-0">
                      <Input
                        value={surchargePct}
                        onChange={(e) => applySurchargePct(e.target.value)}
                        placeholder="0"
                        inputMode="decimal"
                        className="h-9 pr-6 text-sm bg-card"
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                    <CurrencyInput
                      value={surcharge}
                      onValueChange={applySurchargeVal}
                      className="h-9 w-full border border-border bg-card text-sm"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Observações (saem no orçamento impresso)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex.: inclui retorno em 10 dias; anestesia cobrada à parte..."
                  rows={3}
                  className="mt-1 text-sm"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between py-1 text-sm">
                <span className="text-muted-foreground">Subtotal dos itens</span>
                <span className="tabular-nums">{fmtBRL(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between py-1 text-sm text-amber-700">
                  <span>Desconto</span>
                  <span className="tabular-nums">− {fmtBRL(discount)}</span>
                </div>
              )}
              {surcharge > 0 && (
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted-foreground">Acréscimo</span>
                  <span className="tabular-nums">+ {fmtBRL(surcharge)}</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-lg font-bold tabular-nums text-[hsl(var(--vf-sales))]">
                  {fmtBRL(totalFinal)}
                </span>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => void saveBudget()}
                  disabled={saving}
                  className="h-9 px-5 bg-[hsl(var(--vf-sales))] text-white hover:bg-[hsl(var(--vf-sales)/0.9)]"
                >
                  {saving ? "Salvando..." : editingBudgetId ? "Salvar alterações" : "Salvar orçamento"}
                </Button>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Orçamentos salvos"
        description="Acompanhe status, selecione pagamento e converta propostas em venda."
        icon={FileText}
        tone="sales"
      >
        <DataTableFrame empty={budgets.length === 0}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Animal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.map(b => {
                const itemsTotal = b.items.reduce((sum, it) => sum + it.qty * it.price, 0);
                const total = Math.max(0, itemsTotal - (b.discountAmount ?? 0) + (b.surchargeAmount ?? 0));
                const client = b.clientId ? clients.find(c => c.id === b.clientId) : undefined;
                const animal = b.animalId ? client?.animals.find(a => a.id === b.animalId) : undefined;
                const tutorLabel = client?.name || b.clientName || "-";
                const petLabel = animal?.name || b.animalName || "-";
                return (
                  <TableRow key={b.id}>
                    <TableCell>{formatDateTime(b.date)}</TableCell>
                    <TableCell>
                      {b.clientId && client ? (
                        <Link
                          to={`/clients/${b.clientId}`}
                          className="font-medium text-[hsl(var(--vf-sales))] hover:underline"
                        >
                          {tutorLabel}
                        </Link>
                      ) : (
                        tutorLabel
                      )}
                    </TableCell>
                    <TableCell>
                      {b.clientId && b.animalId && animal ? (
                        <Link
                          to={getPatientRecordPath(b.clientId, b.animalId, animal.patientCode)}
                          className="font-medium text-[hsl(var(--vf-sales))] hover:underline"
                        >
                          {petLabel}
                        </Link>
                      ) : (
                        petLabel
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${BUDGET_STATUS[b.status]?.className ?? ""}`}>
                        {BUDGET_STATUS[b.status]?.label ?? b.status}
                      </span>
                    </TableCell>
                    <TableCell>{formatCurrencyBRL(total)}</TableCell>
                    <TableCell>
                      {b.status === "converted" || b.status === "cancelled" ? (
                        // Já fechado: mostra o que foi usado, sem permitir troca
                        // (mudar aqui não alteraria a venda já gerada).
                        <span className="text-sm text-muted-foreground">
                          {b.paymentMethod || "—"}
                        </span>
                      ) : (
                        <Select value={pmByBudget[b.id]} onValueChange={(v) => setPmByBudget(prev => ({ ...prev, [b.id]: v }))}>
                          <SelectTrigger className="h-8 text-sm bg-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {paymentMethods.length > 0 ? paymentMethods.map(pm => (
                              <SelectItem key={pm.id} value={pm.name}>{pm.name}</SelectItem>
                            )) : (
                              <SelectItem value="none" disabled>Cadastre formas em Financeiro &gt; Formas de Pagamento</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {/* Converter é a ação principal do fluxo (tutor voltou
                            e aprovou), então ganha peso visual de CTA. */}
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                          onClick={() => void convertBudget(b.id)}
                          disabled={saving || b.status === "converted" || b.status === "cancelled"}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Converter
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 rounded-lg border-border text-xs hover:bg-muted"
                          onClick={() => startEditBudget(b)}
                          disabled={saving || b.status === "converted" || b.status === "cancelled"}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 rounded-lg border-amber-300 text-xs text-amber-700 hover:bg-amber-50"
                          onClick={() => void cancelBudget(b.id)}
                          disabled={saving || b.status === "converted" || b.status === "cancelled"}
                        >
                          <Ban className="h-3.5 w-3.5" /> Cancelar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 rounded-lg border-red-300 text-xs text-red-700 hover:bg-red-50"
                          onClick={() => void removeBudgetAction(b.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remover
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 rounded-lg border-border text-xs hover:bg-muted"
                          onClick={() => handleOpenBudgetPdf(b)}
                        >
                          <Printer className="h-3.5 w-3.5" /> Relatório
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg border-border hover:bg-muted"
                          title="Enviar orçamento por WhatsApp (com link do PDF, sem precisar anexar)"
                          onClick={() => void handleSendBudgetWhatsApp(b)}
                        >
                          <SiWhatsapp className="h-3.5 w-3.5 text-[#25D366]" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableFrame>
        {budgets.length === 0 && isClientsError ? (
          <p className="mt-2 text-muted-foreground">Falha ao carregar clientes do banco.</p>
        ) : null}
      </SectionCard>
    </PageShell>
  );
};

export default BudgetsPage;