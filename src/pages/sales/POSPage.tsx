import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { addFinancialTransaction } from "@/lib/financialApi";
import { getCatalog } from "@/lib/catalogApi";
import type { CatalogItem } from "@/mockData/catalog";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { useRegistryList } from "@/hooks/useRegistryList";
import { ShoppingCart, Plus, Trash2, Loader2, Receipt, Wallet, Coins, TrendingUp } from "lucide-react";
import ClientCombobox from "@/components/ClientCombobox";
import SmartComboInput, { type SmartComboInputHandle } from "@/components/SmartComboInput";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { PaymentChoice } from "@/components/sales/PaymentChoice";
import { AdjustmentLines, PriceAdjustmentFields, usePriceAdjustments } from "@/components/sales/PriceAdjustments";
import { IconChip, Panel } from "@/components/finance/FinanceUI";
import { CONCEPTS, TONES, categoryVisual } from "@/components/finance/financeTheme";
import { groupRepassesByProvider, resolveCostProvider } from "@/lib/costProviders";
import { catalogCategoryLabel } from "@/lib/catalogCategories";
import { cn, formatCurrencyBRL, formatItemQty, getTodayLocalISO } from "@/lib/utils";
import { resolveCartLineCosts } from "@/lib/saleCosting";
import { fulfillSaleLines } from "@/lib/saleFulfillment";
import { nowTimeHHMM, receiveSalePayment, toCents, type PayMode } from "@/lib/salePayment";

interface CartItem {
  catalogItemId: string;
  name: string;
  price: number;
  cost: number;
  productCost: number;
  providerCost: number;
  costProvider?: string;
  quantity: number;
  type: "product" | "service";
  category?: string;
}

const POSPage = () => {
  const { data: dbClients, isError: isClientsError } = useClientsList();
  const clients = dbClients || [];
  const { list: paymentMethods } = useRegistryList("paymentMethods");
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const itemComboRef = useRef<SmartComboInputHandle>(null);
  const [quantityInput, setQuantityInput] = useState<string>("1");
  const quantity = Number(quantityInput.replace(",", ".")) || 0;
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>("");
  // Venda de balcão é paga na hora quase sempre: "Recebido agora" é o padrão
  // e a venda já nasce quitada (antes ficava "pendente" e a baixa, em
  // Recebimentos, perguntava a forma de pagamento de novo).
  const [payMode, setPayMode] = useState<PayMode>("now");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [installments, setInstallments] = useState<number>(1);
  const [passTaxes, setPassTaxes] = useState(false);
  const [processing, setProcessing] = useState(false);
  /** Custo unitário resolvido (BOM + prestador) por item do catálogo */
  const [resolvedCosts, setResolvedCosts] = useState<
    Map<string, { unitCost: number; unitProductCost: number; unitProviderCost: number; costProvider?: string }>
  >(new Map());

  useEffect(() => {
    getCatalog().then(async (items) => {
      const active = items.filter((i) => i.active);
      setCatalog(active);
      const catalogById = new Map(active.map((i) => [i.id, i]));
      const resolved = await resolveCartLineCosts(
        active.map((i) => ({ catalogItemId: i.id, quantity: 1 })),
        catalogById
      );
      const map = new Map<
        string,
        { unitCost: number; unitProductCost: number; unitProviderCost: number; costProvider?: string }
      >();
      resolved.forEach((v, k) => {
        map.set(k, {
          unitCost: v.unitCost,
          unitProductCost: v.unitProductCost,
          unitProviderCost: v.unitProviderCost,
          costProvider: v.costProvider,
        });
      });
      setResolvedCosts(map);
    });
  }, []);

  const filteredAnimals = selectedClientId
    ? clients.find(c => c.id === selectedClientId)?.animals || []
    : [];

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCost = cart.reduce((sum, item) => sum + item.cost * item.quantity, 0);
  const lucroEstimado = subtotal - totalCost;
  const adj = usePriceAdjustments(subtotal);

  const handleAddToCart = () => {
    if (!selectedItemId) { toast.error("Selecione um item."); return; }
    if (quantity <= 0) { toast.error("Quantidade inválida."); return; }
    const catalogItem = catalog.find(i => i.id === selectedItemId);
    if (!catalogItem) return;
    const resolved = resolvedCosts.get(catalogItem.id);
    const unitCost = resolved?.unitCost ?? catalogItem.cost ?? 0;
    const productCost = resolved?.unitProductCost ?? (catalogItem.type === "product" ? (catalogItem.cost ?? 0) : 0);
    const providerCost = resolved?.unitProviderCost ?? (catalogItem.type === "service" ? (catalogItem.cost ?? 0) : 0);
    const costProvider = resolved?.costProvider ?? catalogItem.costProvider;
    setCart(prev => {
      const existing = prev.findIndex(i => i.catalogItemId === selectedItemId);
      if (existing > -1) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + quantity };
        return updated;
      }
      return [...prev, {
        catalogItemId: catalogItem.id,
        name: catalogItem.name,
        price: catalogItem.price,
        cost: unitCost,
        productCost,
        providerCost,
        costProvider,
        quantity,
        type: catalogItem.type,
        category: catalogItem.category,
      }];
    });
    setSelectedItemId("");
    setQuantityInput("1");
    itemComboRef.current?.reset();
    itemComboRef.current?.focus();
  };

  const handleRemove = (id: string) => setCart(prev => prev.filter(i => i.catalogItemId !== id));

  const selectedPaymentMethod = paymentMethods.find(pm => pm.name === paymentMethod);
  const allowsInstallments = selectedPaymentMethod?.installments === true;
  const paymentFee = Number(selectedPaymentMethod?.fee ?? 0);

  // Taxa por parcela (usa installmentRates se disponível)
  const installmentRates = selectedPaymentMethod?.installmentRates as Record<string, number> | undefined;
  const effectiveFeeRate = installmentRates
    ? (installmentRates[String(allowsInstallments ? installments : 1)] ?? paymentFee)
    : paymentFee;

  // Taxa financeira em valor (em centavos: 3,15% de 250 = 7,875 gravava meio centavo)
  const taxAmount = toCents(subtotal * (effectiveFeeRate / 100));
  const financialFee = passTaxes ? taxAmount : 0;
  const discountAmount = adj.discountAmount;
  const surchargeManual = adj.surchargeAmount;

  // Total final (desconto maior que o subtotal não deixa o total negativo)
  const totalFinal = Math.max(0, toCents(subtotal + surchargeManual + financialFee - discountAmount));

  const handleProcessSale = async () => {
    if (processing) return;
    if (cart.length === 0) { toast.error("Carrinho vazio."); return; }
    if (!selectedClientId) { toast.error("Selecione o cliente."); return; }
    if (payMode === "now" && !paymentMethod) { toast.error("Escolha a forma de pagamento."); return; }
    setProcessing(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      const clientName = client?.name || "";
      const animalName = selectedAnimalId ? client?.animals.find(a => a.id === selectedAnimalId)?.name : undefined;
      const description = `Venda para ${clientName}${animalName ? ` (${animalName})` : ""}: ${cart.map(i => formatItemQty(i.name, i.quantity)).join(", ")}`;
      const transaction = await addFinancialTransaction({
        // Data/hora LOCAIS (toISOString é UTC: depois das 21h a venda caía no dia seguinte).
        date: getTodayLocalISO(),
        time: nowTimeHHMM(),
        description,
        type: "income",
        amount: totalFinal,
        category: "Venda de Produtos",
        relatedClientId: selectedClientId,
        relatedAnimalId: selectedAnimalId || undefined,
        paymentMethod: paymentMethod || undefined,
        status: totalFinal > 0 ? "pending" : "paid",
        supplierCost: totalCost,
        financialFee: financialFee > 0 ? financialFee : undefined,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        surchargeAmount: surchargeManual > 0 ? surchargeManual : undefined,
        paymentInstallments: allowsInstallments && installments > 1
          ? installments
          : undefined,
      });
      if (!transaction) {
        toast.error("Erro ao registrar a venda. Nada foi gravado — tente de novo.");
        return;
      }

      await fulfillSaleLines({
        saleId: transaction.id,
        catalog,
        lines: cart.map((item) => ({
          catalogItemId: item.catalogItemId,
          name: item.name,
          type: item.type,
          category: item.category,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
      });

      if (payMode === "now" && totalFinal > 0) {
        const received = await receiveSalePayment({
          sale: transaction,
          paymentMethod,
          clientName,
          animalName,
        });
        if (received) toast.success(`Venda concluída — ${formatCurrencyBRL(totalFinal)} recebido (${paymentMethod}).`);
        else toast.warning("Venda registrada, mas o recebimento não foi gravado. Use “Receber” na lista de vendas.");
      } else {
        toast.success(totalFinal > 0 ? `Venda registrada — fica a receber ${formatCurrencyBRL(totalFinal)}.` : "Venda registrada.");
      }
      setCart([]);
      setSelectedClientId("");
      setSelectedAnimalId("");
      setPayMode("now");
      setPaymentMethod("");
      setInstallments(1);
      setPassTaxes(false);
      adj.reset();
      navigate("/sales/my-sales");
    } catch {
      toast.error("Erro ao registrar venda.");
    } finally {
      setProcessing(false);
    }
  };

  const canSubmit = cart.length > 0 && !!selectedClientId && (payMode === "later" || !!paymentMethod) && !processing;
  const repasses = groupRepassesByProvider(cart);

  return (
    <PageShell className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Ponto de venda"
        description="Venda de balcão de produtos e serviços."
        icon={ShoppingCart}
        module="sales"
        breadcrumb={<>Painel &gt; Vendas &gt; PDV</>}
        className="mb-0 sm:mb-0"
        actions={
          <Button asChild variant="outline">
            <Link to="/sales/my-sales">
              <Receipt className="mr-2 h-4 w-4" /> Ver vendas
            </Link>
          </Button>
        }
      />

      {/* xl, não lg: o breakpoint ignora o menu lateral — com ele aberto, em
          telas de ~1024px as duas colunas espremiam o carrinho. */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <Panel
          title="Itens da venda"
          description={cart.length > 0 ? `${cart.length} ${cart.length === 1 ? "item" : "itens"}` : "Produtos e serviços do catálogo"}
          icon={ShoppingCart}
          tone="violet"
        >
          <div className="flex flex-wrap items-end gap-2 border-b border-border/70 p-3 sm:gap-3 sm:p-4">
            <div className="min-w-[12rem] flex-1">
              <Label htmlFor="posItem" className="text-sm font-medium">Produto ou serviço</Label>
              <SmartComboInput
                id="posItem"
                ref={itemComboRef}
                options={catalog.map(item => ({
                  value: item.id,
                  label: `${item.name} — ${formatCurrencyBRL(item.price)}`,
                }))}
                onSelect={(id) => setSelectedItemId(id)}
                placeholder="Digite o nome do produto ou serviço"
                emptyLabel="Nenhum item encontrado."
                className="mt-1.5"
              />
            </div>
            <div className="w-20 shrink-0">
              <Label htmlFor="posQty" className="text-sm font-medium">Qtd.</Label>
              <Input
                id="posQty"
                inputMode="decimal"
                value={quantityInput}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^[0-9]*[.,]?[0-9]*$/.test(v)) setQuantityInput(v);
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddToCart(); }}
                className="mt-1.5 h-10 rounded-lg bg-input"
              />
            </div>
            <Button onClick={handleAddToCart} className="h-10 shrink-0 px-4 font-semibold">
              <Plus className="mr-1.5 h-4 w-4" /> Adicionar
            </Button>
          </div>

          {cart.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-500 ring-1 ring-violet-100">
                <ShoppingCart className="h-6 w-6" aria-hidden />
              </span>
              <p className="mt-3 text-sm font-semibold text-foreground">Nenhum item na venda</p>
              <p className="mt-1 text-sm text-muted-foreground">Busque um produto ou serviço acima para começar.</p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-border/70">
                {cart.map(item => {
                  const provider = item.cost > 0 ? resolveCostProvider(item.costProvider, item.category, item.cost) : undefined;
                  const cat = categoryVisual(item.category ?? (item.type === "product" ? "produto" : "servico"));
                  return (
                    <li key={item.catalogItemId} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                      <IconChip icon={cat.icon} tone={cat.tone} />
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold leading-snug text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {formatCurrencyBRL(item.price)}
                          {item.category && <> · {catalogCategoryLabel(item.category)}</>}
                        </p>
                        {item.cost > 0 && (
                          <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-orange-700">
                            <Coins className="h-3 w-3" aria-hidden />
                            repasse {formatCurrencyBRL(item.cost * item.quantity)}{provider ? ` → ${provider}` : ""}
                          </p>
                        )}
                      </div>
                      <p className="shrink-0 font-bold tabular-nums text-foreground">{formatCurrencyBRL(item.price * item.quantity)}</p>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.catalogItemId)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remover ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Resumo interno (não vai pro cliente): quanto sobra depois dos repasses. */}
              <div className="grid grid-cols-1 gap-2 border-t border-border/70 bg-muted/20 p-3 sm:grid-cols-3 sm:p-4">
                <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card px-3 py-2.5">
                  <IconChip icon={CONCEPTS.faturado.icon} tone={CONCEPTS.faturado.tone} size="sm" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Bruto</p>
                    <p className="font-bold tabular-nums text-foreground">{formatCurrencyBRL(subtotal)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-orange-200 bg-orange-50/50 px-3 py-2.5">
                  <IconChip icon={CONCEPTS.repasses.icon} tone="orange" size="sm" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">Repasses</p>
                    <p className="font-bold tabular-nums text-orange-700">{totalCost > 0 ? `− ${formatCurrencyBRL(totalCost)}` : "—"}</p>
                    {repasses.length > 0 && (
                      <p className="truncate text-[11px] text-orange-700/80" title={repasses.map((r) => `${r.provider}: ${formatCurrencyBRL(r.amount)}`).join(" · ")}>
                        {repasses.map((r) => r.provider).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className={cn("flex items-center gap-2.5 rounded-xl border px-3 py-2.5", lucroEstimado >= 0 ? TONES.emerald.card : TONES.rose.card)}>
                  <IconChip icon={TrendingUp} tone={lucroEstimado >= 0 ? "emerald" : "rose"} size="sm" />
                  <div className="min-w-0">
                    <p className={cn("text-[11px] font-semibold uppercase tracking-wide", lucroEstimado >= 0 ? "text-emerald-700" : "text-rose-700")}>
                      Lucro estimado
                    </p>
                    <p className={cn("font-bold tabular-nums", lucroEstimado >= 0 ? "text-emerald-700" : "text-rose-700")}>
                      {formatCurrencyBRL(lucroEstimado)}
                      <span className="ml-1 text-xs font-medium">({subtotal > 0 ? Math.round((lucroEstimado / subtotal) * 100) : 0}%)</span>
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </Panel>

        {/* Pagamento */}
        <aside className="min-w-0">
          <Panel title="Pagamento" icon={Wallet} tone="teal" className="xl:sticky xl:top-4">
            <div className="space-y-4 p-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Cliente<span className="text-destructive" aria-hidden> *</span>
                </Label>
                <ClientCombobox
                  clients={clients}
                  value={selectedClientId || undefined}
                  onChange={(id) => {
                    setSelectedClientId(id || "");
                    setSelectedAnimalId("");
                  }}
                  className="h-10"
                />
                {isClientsError && <p className="text-xs text-destructive">Falha ao carregar clientes.</p>}
              </div>

              {selectedClientId && filteredAnimals.length > 0 && (
                <div className="relative space-y-1.5">
                  <Label className="text-sm font-medium">
                    Animal <span className="font-normal text-muted-foreground">(opcional)</span>
                  </Label>
                  <Select value={selectedAnimalId || "__none__"} onValueChange={(v) => setSelectedAnimalId(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="h-10 rounded-lg bg-input">
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {filteredAnimals.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <PaymentChoice
                idPrefix="pos"
                mode={payMode}
                onModeChange={setPayMode}
                method={paymentMethod || undefined}
                onMethodChange={(v) => {
                  setPaymentMethod(v ?? "");
                  setInstallments(1);
                }}
                methods={paymentMethods}
              />

              {allowsInstallments && (
                <div className="relative space-y-1.5">
                  <Label className="text-sm font-medium">Parcelas</Label>
                  <Select value={String(installments)} onValueChange={(v) => setInstallments(Number(v))}>
                    <SelectTrigger className="h-10 rounded-lg bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => {
                        const rate = installmentRates ? (installmentRates[String(n)] ?? paymentFee) : paymentFee;
                        return (
                          <SelectItem key={n} value={String(n)}>
                            {n === 1
                              ? `À vista — taxa ${rate}%`
                              : `${n}x de ${formatCurrencyBRL(totalFinal / n)} — taxa ${rate}%`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {effectiveFeeRate > 0 && subtotal > 0 && (
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/40 px-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">Repassar taxa ao cliente</span>
                    <span className="block text-xs text-rose-700">
                      Taxa da operadora {effectiveFeeRate}% = {formatCurrencyBRL(taxAmount)}
                    </span>
                  </span>
                  <Switch checked={passTaxes} onCheckedChange={setPassTaxes} />
                </label>
              )}

              {cart.length > 0 && <PriceAdjustmentFields adj={adj} idPrefix="pos" />}

              <div className="space-y-1 rounded-xl bg-muted/40 px-3 py-3">
                <AdjustmentLines subtotal={subtotal} discount={discountAmount} surcharge={surchargeManual} discountPct={adj.discountPct} />
                {financialFee > 0 && (
                  <>
                    {!(discountAmount > 0) && !(surchargeManual > 0) && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Subtotal</span>
                        <span className="tabular-nums">{formatCurrencyBRL(subtotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-rose-700">
                      <span>Taxa da operadora ({effectiveFeeRate}%)</span>
                      <span className="tabular-nums">+ {formatCurrencyBRL(financialFee)}</span>
                    </div>
                  </>
                )}
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Total</span>
                  <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">{formatCurrencyBRL(totalFinal)}</span>
                </div>
                {allowsInstallments && installments > 1 && (
                  <p className="text-right text-xs font-medium text-violet-700">
                    {installments}x de {formatCurrencyBRL(totalFinal / installments)}
                  </p>
                )}
              </div>

              <Button onClick={() => void handleProcessSale()} disabled={!canSubmit} className="h-11 w-full text-base font-semibold">
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {processing
                  ? "Registrando..."
                  : payMode === "now" && totalFinal > 0
                    ? `Receber ${formatCurrencyBRL(totalFinal)}`
                    : "Registrar venda"}
              </Button>
            </div>
          </Panel>
        </aside>
      </div>
    </PageShell>
  );
};

export default POSPage;
