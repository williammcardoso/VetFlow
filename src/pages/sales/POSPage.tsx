import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { addFinancialTransaction } from "@/lib/financialApi";
import { getCatalog } from "@/lib/catalogApi";
import type { CatalogItem } from "@/mockData/catalog";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { useRegistryList } from "@/hooks/useRegistryList";
import { ShoppingCart, Plus, Trash2, CheckCircle, ArrowLeft, Package } from "lucide-react";
import ClientCombobox from "@/components/ClientCombobox";
import SmartComboInput, { type SmartComboInputHandle } from "@/components/SmartComboInput";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { groupRepassesByProvider, resolveCostProvider } from "@/lib/costProviders";
import { formatCurrencyBRL, formatItemQty } from "@/lib/utils";
import { resolveCartLineCosts } from "@/lib/saleCosting";
import { fulfillSaleLines } from "@/lib/saleFulfillment";

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
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [installments, setInstallments] = useState<number>(1);
  const [passTaxes, setPassTaxes] = useState(false);
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
    toast.success(`${catalogItem.name} adicionado.`);
  };

  const handleRemove = (id: string) => setCart(prev => prev.filter(i => i.catalogItemId !== id));

  const handleProcessSale = async () => {
    if (cart.length === 0) { toast.error("Carrinho vazio."); return; }
    if (!selectedClientId) { toast.error("Selecione o cliente."); return; }
    if (!paymentMethod) { toast.error("Selecione a forma de pagamento."); return; }
    setProcessing(true);
    try {
      const clientName = clients.find(c => c.id === selectedClientId)?.name || "";
      const animalName = selectedAnimalId
        ? clients.find(c => c.id === selectedClientId)?.animals.find(a => a.id === selectedAnimalId)?.name
        : undefined;
      const now = new Date();
      const description = `Venda para ${clientName}${animalName ? ` (${animalName})` : ""}: ${cart.map(i => formatItemQty(i.name, i.quantity)).join(", ")}`;
      const transaction = await addFinancialTransaction({
        date: now.toISOString().split("T")[0],
        time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        description,
        type: "income",
        amount: totalFinal,
        category: "Venda de Produtos",
        relatedClientId: selectedClientId,
        relatedAnimalId: selectedAnimalId || undefined,
        paymentMethod,
        status: "pending",
        supplierCost: totalCost,
        financialFee: financialFee > 0 ? financialFee : undefined,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        surchargeAmount: surchargeManual > 0 ? surchargeManual : undefined,
        paymentInstallments: allowsInstallments && installments > 1
          ? installments
          : undefined,
      });

      if (transaction) {
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
      }
      toast.success("Venda registrada com sucesso!");
      setCart([]);
      setSelectedClientId("");
      setSelectedAnimalId("");
      setPaymentMethod("");
      setInstallments(1);
      setPassTaxes(false);
      setDiscountPct(""); setDiscountVal("");
      setSurchargePct(""); setSurchargeVal("");
      navigate("/sales/my-sales");
    } catch {
      toast.error("Erro ao registrar venda.");
    } finally {
      setProcessing(false);
    }
  };

  const selectedPaymentMethod = paymentMethods.find(pm => pm.name === paymentMethod);
  const allowsInstallments = selectedPaymentMethod?.installments === true;
  const paymentFee = Number(selectedPaymentMethod?.fee ?? 0);

  // Taxa por parcela (usa installmentRates se disponível)
  const installmentRates = selectedPaymentMethod?.installmentRates as Record<string, number> | undefined;
  const effectiveFeeRate = installmentRates
    ? (installmentRates[String(allowsInstallments ? installments : 1)] ?? paymentFee)
    : paymentFee;

  // Taxa financeira em valor
  const taxAmount = subtotal * (effectiveFeeRate / 100);
  const financialFee = passTaxes ? taxAmount : 0;

  // Desconto
  const discountAmount = discountVal
    ? parseFloat(discountVal) || 0
    : discountPct
    ? subtotal * ((parseFloat(discountPct) || 0) / 100)
    : 0;

  // Acréscimo (manual + taxa repassada)
  const surchargeManual = surchargeVal
    ? parseFloat(surchargeVal) || 0
    : surchargePct
    ? subtotal * ((parseFloat(surchargePct) || 0) / 100)
    : 0;
  const surchargeTotal = surchargeManual + financialFee;

  // Total final
  const totalFinal = subtotal + surchargeTotal - discountAmount;

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

  return (
    <PageShell>
      <PageHeader
        title="Ponto de Venda"
        description="Registre vendas de produtos e serviços."
        icon={ShoppingCart}
        module="sales"
        breadcrumb={<>Painel &gt; Vendas &gt; PDV</>}
        actions={
          <Button asChild variant="outline">
            <Link to="/sales/my-sales">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Coluna esquerda — seleção de itens */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="vf-surface-card vf-tone-sales rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Package className="h-4 w-4 text-[hsl(var(--vf-sales))]" /> Adicionar item
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground">Produto / Serviço</Label>
                  <SmartComboInput
                    ref={itemComboRef}
                    options={catalog.map(item => ({
                      value: item.id,
                      label: `${item.name} — ${formatCurrencyBRL(item.price)}${item.cost ? ` (custo: ${formatCurrencyBRL(item.cost)})` : ""}`,
                    }))}
                    onSelect={(id) => setSelectedItemId(id)}
                    placeholder="Digite o nome do produto/serviço..."
                    emptyLabel="Nenhum item encontrado."
                    className="mt-1"
                  />
                </div>
                <div className="w-24 shrink-0">
                  <Label className="text-xs text-muted-foreground">Quantidade</Label>
                  <Input
                    inputMode="decimal"
                    value={quantityInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^[0-9]*[.,]?[0-9]*$/.test(v)) setQuantityInput(v);
                    }}
                    className="mt-1 h-10 border border-border bg-card text-sm"
                  />
                </div>
                <Button
                  onClick={handleAddToCart}
                  className="h-10 px-5 bg-[hsl(var(--vf-sales))] text-white font-semibold rounded-xl hover:bg-[hsl(var(--vf-sales)/0.9)] transition-all shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabela do carrinho */}
          {cart.length > 0 && (
            <Card className="vf-surface-card vf-tone-sales rounded-xl">
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center w-16">Qtd</TableHead>
                      <TableHead className="text-right w-28">Preço</TableHead>
                      <TableHead className="text-right w-28">Custo</TableHead>
                      <TableHead className="text-right w-28">Subtotal</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map(item => (
                      <TableRow key={item.catalogItemId}>
                        <TableCell className="font-medium">
                          <div>{item.name}</div>
                          {item.cost > 0 && resolveCostProvider(item.costProvider, item.category, item.cost) && (
                            <div className="text-[11px] text-amber-700">
                              → {resolveCostProvider(item.costProvider, item.category, item.cost)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrencyBRL(item.price)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {item.cost > 0
                            ? formatCurrencyBRL(item.cost)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrencyBRL(item.price * item.quantity)}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleRemove(item.catalogItemId)}
                            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Resumo de lucro */}
                <div className="mt-4 rounded-lg bg-muted/40 p-3 flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Faturamento bruto</span>
                    <div className="font-bold text-base">
                      {formatCurrencyBRL(subtotal)}
                    </div>
                  </div>
                  {totalCost > 0 && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Repasses</span>
                        <div className="font-bold text-base text-amber-600">
                          − {formatCurrencyBRL(totalCost)}
                        </div>
                        <div className="mt-0.5 space-y-0.5">
                          {groupRepassesByProvider(cart).map((row) => (
                            <div key={row.provider} className="text-[11px] text-amber-700/80">
                              {row.provider}: {formatCurrencyBRL(row.amount)}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Lucro estimado</span>
                        <div className={`font-bold text-base ${lucroEstimado >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {formatCurrencyBRL(lucroEstimado)}
                          <span className="text-xs ml-1">
                            ({subtotal > 0 ? Math.round((lucroEstimado/subtotal)*100) : 0}% margem)
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coluna direita — checkout */}
        <div>
          <Card className="vf-surface-card vf-tone-sales rounded-xl sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <CheckCircle className="h-4 w-4 text-emerald-600" /> Finalizar venda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Cliente *</Label>
                <ClientCombobox
                  clients={clients}
                  value={selectedClientId || undefined}
                  onChange={(id) => {
                    setSelectedClientId(id || "");
                    setSelectedAnimalId("");
                  }}
                  className="mt-1 h-10"
                />
              </div>

              {selectedClientId && filteredAnimals.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Animal (opcional)</Label>
                  <Select value={selectedAnimalId || "__none__"} onValueChange={(v) => setSelectedAnimalId(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="mt-1 h-10 w-full border border-border bg-card text-sm">
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

              <div>
                <Label className="text-xs text-muted-foreground">
                  Forma de pagamento *
                </Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => {
                    setPaymentMethod(v);
                    if (!v.toLowerCase().includes("parcel")) {
                      setInstallments(1);
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 h-10 w-full border border-border bg-card text-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(pm => (
                      <SelectItem key={pm.id} value={pm.name}>
                        {pm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {allowsInstallments && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Número de parcelas
                  </Label>
                  <Select value={String(installments)} onValueChange={(v) => setInstallments(Number(v))}>
                    <SelectTrigger className="mt-1 h-10 w-full border border-border bg-card text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => {
                        const rate = installmentRates ? (installmentRates[String(n)] ?? paymentFee) : paymentFee;
                        const parcelVal = totalFinal / n;
                        return (
                          <SelectItem key={n} value={String(n)}>
                            {n === 1
                              ? `À vista — taxa ${rate}%`
                              : `${n}x de ${formatCurrencyBRL(parcelVal)} — taxa ${rate}%`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Desconto e Acréscimo */}
              {cart.length > 0 && (
                <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Desconto / Acréscimo
                  </div>

                  {/* Desconto */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Desconto</Label>
                    <div className="flex gap-2 mt-1">
                      <div className="relative w-20">
                        <Input
                          value={discountPct}
                          onChange={(e) => handleDiscountPct(e.target.value)}
                          className="h-9 text-sm pr-6 border border-border"
                          placeholder="0"
                          type="number"
                          min="0"
                          max="100"
                        />
                        <span className="absolute right-2 top-2 text-xs text-muted-foreground">%</span>
                      </div>
                      <div className="relative flex-1">
                        <Input
                          value={discountVal}
                          onChange={(e) => handleDiscountVal(e.target.value)}
                          className="h-9 text-sm pl-6 border border-border"
                          placeholder="0,00"
                          type="number"
                          min="0"
                        />
                        <span className="absolute left-2 top-2 text-xs text-muted-foreground">R$</span>
                      </div>
                    </div>
                  </div>

                  {/* Acréscimo */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Acréscimo manual</Label>
                    <div className="flex gap-2 mt-1">
                      <div className="relative w-20">
                        <Input
                          value={surchargePct}
                          onChange={(e) => handleSurchargePct(e.target.value)}
                          className="h-9 text-sm pr-6 border border-border"
                          placeholder="0"
                          type="number"
                          min="0"
                        />
                        <span className="absolute right-2 top-2 text-xs text-muted-foreground">%</span>
                      </div>
                      <div className="relative flex-1">
                        <Input
                          value={surchargeVal}
                          onChange={(e) => handleSurchargeVal(e.target.value)}
                          className="h-9 text-sm pl-6 border border-border"
                          placeholder="0,00"
                          type="number"
                          min="0"
                        />
                        <span className="absolute left-2 top-2 text-xs text-muted-foreground">R$</span>
                      </div>
                    </div>
                  </div>

                  {/* Switch repassar taxas */}
                  {effectiveFeeRate > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-border">
                      <div>
                        <div className="text-xs font-medium text-foreground">Repassar taxa ao cliente</div>
                        <div className="text-xs text-muted-foreground">
                          Taxa {effectiveFeeRate}% = {formatCurrencyBRL(taxAmount)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPassTaxes(!passTaxes)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          passTaxes ? 'bg-[hsl(var(--vf-sales))]' : 'bg-muted-foreground/30'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          passTaxes ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatCurrencyBRL(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Desconto ({discountPct}%)</span>
                      <span>- {formatCurrencyBRL(discountAmount)}</span>
                    </div>
                  )}
                  {surchargeManual > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>Acréscimo</span>
                      <span>+ {formatCurrencyBRL(surchargeManual)}</span>
                    </div>
                  )}
                  {financialFee > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>Taxa operadora ({effectiveFeeRate}%)</span>
                      <span>+ {formatCurrencyBRL(financialFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1.5 border-t border-border">
                    <span>Total</span>
                    <span className="text-[hsl(var(--vf-sales))]">
                      {formatCurrencyBRL(totalFinal)}
                    </span>
                  </div>
                  {allowsInstallments && installments > 1 && (
                    <div className="text-xs text-center text-muted-foreground">
                      {installments}x de {formatCurrencyBRL(totalFinal / installments)}
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={handleProcessSale}
                disabled={cart.length === 0 || !selectedClientId || !paymentMethod || processing}
                className="w-full h-11 bg-[hsl(var(--vf-sales))] text-white font-bold rounded-xl shadow-md hover:bg-[hsl(var(--vf-sales)/0.9)] transition-all"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {processing ? "Processando..." : "Confirmar Venda"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
};

export default POSPage;
