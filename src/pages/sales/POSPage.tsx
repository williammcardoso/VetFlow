import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { addFinancialTransaction } from "@/lib/financialApi";
import { addSaleItems } from "@/lib/saleItemsApi";
import { getCatalog } from "@/lib/catalogApi";
import type { CatalogItem } from "@/mockData/catalog";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { ShoppingCart, Plus, Trash2, CheckCircle, ArrowLeft, Package, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";

interface CartItem {
  catalogItemId: string;
  name: string;
  price: number;
  cost: number;
  quantity: number;
  type: "product" | "service";
  category?: string;
}

const POSPage = () => {
  const { data: dbClients, isError: isClientsError } = useClientsList();
  const clients = dbClients || [];
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [installments, setInstallments] = useState<number>(1);
  const [processing, setProcessing] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);

  useEffect(() => {
    getCatalog().then(items => setCatalog(items.filter(i => i.active)));
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
        cost: catalogItem.cost ?? 0,
        quantity,
        type: catalogItem.type,
        category: catalogItem.category,
      }];
    });
    setSelectedItemId("");
    setQuantity(1);
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
      const description = `Venda para ${clientName}${animalName ? ` (${animalName})` : ""}: ${cart.map(i => `${i.name} x${i.quantity}`).join(", ")}`;
      const transaction = await addFinancialTransaction({
        date: now.toISOString().split("T")[0],
        time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        description,
        type: "income",
        amount: subtotal,
        category: "Venda de Produtos",
        relatedClientId: selectedClientId,
        relatedAnimalId: selectedAnimalId || undefined,
        paymentMethod,
        status: "pending",
        supplierCost: totalCost,
        paymentInstallments: paymentMethod.includes("Parcelado") && installments > 1
          ? installments
          : undefined,
      });

      if (transaction) {
        await addSaleItems(
          transaction.id,
          cart.map((item) => ({
            catalogItemId: item.catalogItemId,
            name: item.name,
            type: item.type as "product" | "service",
            category: item.category,
            quantity: item.quantity,
            unitPrice: item.price,
            cost: item.cost,
            subtotal: item.price * item.quantity,
          }))
        );
      }
      toast.success("Venda registrada com sucesso!");
      setCart([]);
      setSelectedClientId("");
      setSelectedAnimalId("");
      setPaymentMethod("");
      setInstallments(1);
      navigate("/sales/my-sales");
    } catch {
      toast.error("Erro ao registrar venda.");
    } finally {
      setProcessing(false);
    }
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
          <Card className="rounded-xl border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Package className="h-4 w-4 text-[hsl(var(--vf-sales))]" /> Adicionar item
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground">Produto / Serviço</Label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--vf-sales)/0.3)]"
                  >
                    <option value="">Selecione...</option>
                    {catalog.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} — {new Intl.NumberFormat("pt-BR", {style:"currency",currency:"BRL"}).format(item.price)}
                        {item.cost ? ` (custo: ${new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(item.cost)})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24 shrink-0">
                  <Label className="text-xs text-muted-foreground">Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
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
            <Card className="rounded-xl border border-border shadow-sm">
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
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right text-sm">
                          {new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(item.price)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {item.cost > 0
                            ? new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(item.cost)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(item.price * item.quantity)}
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
                      {new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(subtotal)}
                    </div>
                  </div>
                  {totalCost > 0 && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Repasses (fornecedores)</span>
                        <div className="font-bold text-base text-amber-600">
                          − {new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(totalCost)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Lucro estimado</span>
                        <div className={`font-bold text-base ${lucroEstimado >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(lucroEstimado)}
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
          <Card className="rounded-xl border border-border shadow-sm sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <CheckCircle className="h-4 w-4 text-emerald-600" /> Finalizar venda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Cliente *</Label>
                <Popover open={clientOpen} onOpenChange={setClientOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientOpen}
                      className="mt-1 w-full h-10 justify-between border border-border bg-card font-normal text-sm"
                    >
                      {selectedClientId
                        ? clients.find(c => c.id === selectedClientId)?.name
                        : "Selecione o cliente..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar cliente..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        <CommandGroup>
                          {clients.map(c => (
                            <CommandItem
                              key={c.id}
                              value={c.name}
                              onSelect={() => {
                                setSelectedClientId(c.id);
                                setSelectedAnimalId("");
                                setClientOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selectedClientId === c.id ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {c.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {selectedClientId && filteredAnimals.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Animal (opcional)</Label>
                  <select
                    value={selectedAnimalId}
                    onChange={(e) => setSelectedAnimalId(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm focus:outline-none"
                  >
                    <option value="">Nenhum</option>
                    {filteredAnimals.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground">Forma de pagamento *</Label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    if (!e.target.value.includes("Parcelado")) setInstallments(1);
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm focus:outline-none"
                >
                  <option value="">Selecione...</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Cartão de Crédito à Vista">Cartão de Crédito à Vista</option>
                  <option value="Cartão de Crédito Parcelado">Cartão de Crédito Parcelado</option>
                  <option value="Pix">Pix</option>
                  <option value="Transferência">Transferência</option>
                  <option value="A prazo">A prazo</option>
                </select>
              </div>

              {paymentMethod === "Cartão de Crédito Parcelado" && (
                <div>
                  <Label className="text-xs text-muted-foreground">Número de parcelas</Label>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm focus:outline-none"
                  >
                    {[2,3,4,5,6,7,8,9,10,11,12].map(n => (
                      <option key={n} value={n}>
                        {n}x de {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(subtotal / n)}
                        {n > 3 ? " (com juros)" : " (sem juros)"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <div className="text-xs text-muted-foreground">Total da venda</div>
                <div className="text-2xl font-bold text-[hsl(var(--vf-sales))]">
                  {new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(subtotal)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {cart.length} {cart.length === 1 ? "item" : "itens"}
                </div>
                {paymentMethod === "Cartão de Crédito Parcelado" && installments > 1 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {installments}x de {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(subtotal / installments)}
                  </div>
                )}
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
