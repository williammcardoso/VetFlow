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
import { ShoppingCart, Plus, Trash2, Loader2, Receipt, Package, Stethoscope } from "lucide-react";
import ClientCombobox from "@/components/ClientCombobox";
import SmartComboInput, { type SmartComboInputHandle } from "@/components/SmartComboInput";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { PaymentChoice } from "@/components/sales/PaymentChoice";
import { groupRepassesByProvider, resolveCostProvider } from "@/lib/costProviders";
import { formatCurrencyBRL, formatItemQty, getTodayLocalISO } from "@/lib/utils";
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
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [discountPct, setDiscountPct] = useState<string>("");
  const [discountVal, setDiscountVal] = useState<string>("");
  const [surchargePct, setSurchargePct] = useState<string>("");
  const [surchargeVal, setSurchargeVal] = useState<string>("");
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

  // Desconto
  const discountAmount = toCents(
    discountVal
      ? parseFloat(discountVal) || 0
      : discountPct
      ? subtotal * ((parseFloat(discountPct) || 0) / 100)
      : 0
  );

  // Acréscimo (manual + taxa repassada)
  const surchargeManual = toCents(
    surchargeVal
      ? parseFloat(surchargeVal) || 0
      : surchargePct
      ? subtotal * ((parseFloat(surchargePct) || 0) / 100)
      : 0
  );
  const surchargeTotal = surchargeManual + financialFee;

  // Total final (desconto maior que o subtotal não deixa o total negativo)
  const totalFinal = Math.max(0, toCents(subtotal + surchargeTotal - discountAmount));

  const handleDiscountPct = (v: string) => {
    setDiscountPct(v);
    const pct = parseFloat(v) || 0;
    setDiscountVal(pct > 0 ? (subtotal * pct / 100).toFixed(2) : "");
  };
  const handleDiscountVal = (v: string) => {
    setDiscountVal(v);
    const val = parseFloat(v) || 0;
    setDiscountPct(val > 0 && subtotal > 0 ? ((val / subtotal) * 100).toFixed(2) : "");
  };
  const handleSurchargePct = (v: string) => {
    setSurchargePct(v);
    const pct = parseFloat(v) || 0;
    setSurchargeVal(pct > 0 ? (subtotal * pct / 100).toFixed(2) : "");
  };
  const handleSurchargeVal = (v: string) => {
    setSurchargeVal(v);
    const val = parseFloat(v) || 0;
    setSurchargePct(val > 0 && subtotal > 0 ? ((val / subtotal) * 100).toFixed(2) : "");
  };

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
      setShowAdjustments(false);
      setDiscountPct(""); setDiscountVal("");
      setSurchargePct(""); setSurchargeVal("");
      navigate("/sales/my-sales");
    } catch {
      toast.error("Erro ao registrar venda.");
    } finally {
      setProcessing(false);
    }
  };

  const canSubmit = cart.length > 0 && !!selectedClientId && (payMode === "later" || !!paymentMethod) && !processing;
  const adjustmentsOpen = showAdjustments || !!discountVal || !!discountPct || !!surchargeVal || !!surchargePct;
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
        {/* Itens */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm" aria-label="Itens da venda">
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
              <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground/40" aria-hidden />
              <p className="mt-2 text-sm font-medium text-foreground">Nenhum item na venda</p>
              <p className="mt-1 text-sm text-muted-foreground">Busque um produto ou serviço acima para começar.</p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-border/70">
                {cart.map(item => {
                  const provider = item.cost > 0 ? resolveCostProvider(item.costProvider, item.category, item.cost) : undefined;
                  const Icon = item.type === "product" ? Package : Stethoscope;
                  return (
                    <li key={item.catalogItemId} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-medium leading-snug text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {formatCurrencyBRL(item.price)}
                          {item.cost > 0 && (
                            <> · custo {formatCurrencyBRL(item.cost)}{provider ? ` → ${provider}` : ""}</>
                          )}
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold tabular-nums text-foreground">{formatCurrencyBRL(item.price * item.quantity)}</p>
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
              <div className="grid grid-cols-2 gap-px border-t border-border/70 bg-border/70 sm:grid-cols-3">
                <div className="bg-muted/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground">Faturamento bruto</p>
                  <p className="font-semibold tabular-nums text-foreground">{formatCurrencyBRL(subtotal)}</p>
                </div>
                <div className="bg-muted/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground">Repasses</p>
                  <p className="font-semibold tabular-nums text-foreground">{totalCost > 0 ? `− ${formatCurrencyBRL(totalCost)}` : "—"}</p>
                  {repasses.length > 0 && (
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {repasses.map((row) => `${row.provider}: ${formatCurrencyBRL(row.amount)}`).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="col-span-2 bg-muted/30 px-4 py-3 sm:col-span-1">
                  <p className="text-xs text-muted-foreground">Lucro estimado</p>
                  <p className={`font-semibold tabular-nums ${lucroEstimado >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {formatCurrencyBRL(lucroEstimado)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({subtotal > 0 ? Math.round((lucroEstimado / subtotal) * 100) : 0}%)
                    </span>
                  </p>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Pagamento */}
        <aside className="min-w-0">
          <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm xl:sticky xl:top-4" aria-label="Pagamento">
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
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">Repassar taxa ao cliente</span>
                  <span className="block text-xs text-muted-foreground">
                    Taxa {effectiveFeeRate}% = {formatCurrencyBRL(taxAmount)}
                  </span>
                </span>
                <Switch checked={passTaxes} onCheckedChange={setPassTaxes} />
              </label>
            )}

            {cart.length > 0 && (
              adjustmentsOpen ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Desconto</Label>
                    <div className="flex gap-1.5">
                      <div className="relative w-16 shrink-0">
                        <Input value={discountPct} onChange={(e) => handleDiscountPct(e.target.value)} className="h-9 rounded-lg bg-input pr-5 text-sm" placeholder="0" type="number" min="0" max="100" aria-label="Desconto em %" />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      </div>
                      <Input value={discountVal} onChange={(e) => handleDiscountVal(e.target.value)} className="h-9 min-w-0 rounded-lg bg-input text-sm" placeholder="R$ 0,00" type="number" min="0" aria-label="Desconto em reais" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Acréscimo</Label>
                    <div className="flex gap-1.5">
                      <div className="relative w-16 shrink-0">
                        <Input value={surchargePct} onChange={(e) => handleSurchargePct(e.target.value)} className="h-9 rounded-lg bg-input pr-5 text-sm" placeholder="0" type="number" min="0" aria-label="Acréscimo em %" />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      </div>
                      <Input value={surchargeVal} onChange={(e) => handleSurchargeVal(e.target.value)} className="h-9 min-w-0 rounded-lg bg-input text-sm" placeholder="R$ 0,00" type="number" min="0" aria-label="Acréscimo em reais" />
                    </div>
                  </div>
                </div>
              ) : (
                <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => setShowAdjustments(true)}>
                  + Desconto ou acréscimo
                </button>
              )
            )}

            <div className="space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrencyBRL(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Desconto{discountPct ? ` (${discountPct}%)` : ""}</span>
                  <span className="tabular-nums">− {formatCurrencyBRL(discountAmount)}</span>
                </div>
              )}
              {surchargeManual > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Acréscimo</span>
                  <span className="tabular-nums">+ {formatCurrencyBRL(surchargeManual)}</span>
                </div>
              )}
              {financialFee > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxa da operadora ({effectiveFeeRate}%)</span>
                  <span className="tabular-nums">+ {formatCurrencyBRL(financialFee)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between pt-1">
                <span className="font-medium text-foreground">Total</span>
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{formatCurrencyBRL(totalFinal)}</span>
              </div>
              {allowsInstallments && installments > 1 && (
                <p className="text-right text-xs text-muted-foreground">
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
          </section>
        </aside>
      </div>
    </PageShell>
  );
};

export default POSPage;
