import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaShoppingCart, FaPlus, FaTrashAlt, FaDollarSign, FaCheckCircle, FaTimesCircle, FaUser, FaPaw } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { addMockFinancialTransaction } from "@/mockData/financial";
import { mockClients } from "@/mockData/clients"; // Importar o mock de clientes centralizado
import { Client, Animal } from "@/types/client"; // Importar as interfaces Client e Animal
import { getCatalog, findCatalogItem, adjustStock } from "@/mockData/catalog";
import { getRegistryList } from "@/mockData/registry";

// Mock data para produtos/serviços
interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

const POSPage = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPriceOverride, setUnitPriceOverride] = useState<number | undefined>(undefined);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | undefined>(undefined);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | undefined>(undefined); // NEW
  const [saleWithoutClient, setSaleWithoutClient] = useState<boolean>(false); // NEW: venda avulsa
  const [discount, setDiscount] = useState<number>(0); // NEW: desconto global
  const [surcharge, setSurcharge] = useState<number>(0); // NEW: acréscimos
  const [receivedNow, setReceivedNow] = useState<number>(0); // NEW: recebimento imediato/parcial
  const [installments, setInstallments] = useState<number>(1); // NEW: parcelado
  const [observations, setObservations] = useState<string>(""); // NEW
  const [responsible, setResponsible] = useState<string>(""); // NEW

  const filteredAnimals = selectedClientId
    ? mockClients.find(c => c.id === selectedClientId)?.animals || []
    : [];

  const paymentMethods = getRegistryList("paymentMethods"); // NEW

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const finalTotal = Math.max(0, subtotal - (discount || 0) + (surcharge || 0)); // total final

  const handleAddProductToCart = () => {
    if (!selectedProduct) {
      toast.error("Por favor, selecione um item.");
      return;
    }
    if (quantity <= 0) {
      toast.error("A quantidade deve ser maior que zero.");
      return;
    }

    const item = findCatalogItem(selectedProduct);
    if (item) {
      const existingItemIndex = cart.findIndex(ci => ci.productId === item.id);
      const price = typeof unitPriceOverride === 'number' && unitPriceOverride >= 0 ? unitPriceOverride : item.price;
      if (existingItemIndex > -1) {
        const updatedCart = [...cart];
        updatedCart[existingItemIndex].quantity += quantity;
        updatedCart[existingItemIndex].price = price;
        updatedCart[existingItemIndex].total = updatedCart[existingItemIndex].quantity * price;
        setCart(updatedCart);
      } else {
        setCart([...cart, {
          productId: item.id,
          name: item.name,
          price: price,
          quantity: quantity,
          total: quantity * price,
        }]);
      }
      setSelectedProduct(undefined);
      setQuantity(1);
      setUnitPriceOverride(undefined);
      toast.success(`${item.name} adicionado ao carrinho!`);
    }
  };

  const handleRemoveItemFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
    toast.info("Item removido do carrinho.");
  };

  const handleProcessSale = () => {
    if (cart.length === 0) {
      toast.error("O carrinho está vazio. Adicione produtos para processar a venda.");
      return;
    }
    if (!selectedClientId && !saleWithoutClient) {
      toast.error("Selecione o cliente ou marque venda avulsa.");
      return;
    }
    if (!selectedPaymentMethodId) {
      toast.error("Selecione a forma de pagamento.");
      return;
    }
    if (receivedNow < 0) {
      toast.error("Valor recebido não pode ser negativo.");
      return;
    }
    if (installments <= 0) {
      toast.error("Número de parcelas deve ser maior que zero.");
      return;
    }

    const clientName = selectedClientId ? mockClients.find(c => c.id === selectedClientId)?.name : "Avulsa";
    const animalName = selectedAnimalId ? mockClients.find(c => c.id === selectedClientId)?.animals.find(a => a.id === selectedAnimalId)?.name : undefined;
    const pm = paymentMethods.find(pm => pm.id === selectedPaymentMethodId);
    const paymentMethodName = pm?.name || "Não informado";

    const description = `Venda para ${clientName}${animalName ? ` (Animal: ${animalName})` : ''}: ${cart.map(item => `${item.name} x${item.quantity}`).join(', ')}`;
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const status = receivedNow >= finalTotal ? 'paid' : (receivedNow > 0 ? 'partial' : 'pending');

    // Registrar a venda
    addMockFinancialTransaction({
      date: currentDate,
      time: currentTime,
      description: description,
      type: "income",
      amount: finalTotal,
      category: "Venda de Produtos",
      relatedClientId: saleWithoutClient ? undefined : selectedClientId,
      relatedAnimalId: selectedAnimalId,
      paymentMethod: paymentMethodName,
      paidAmount: receivedNow || 0,
      status,
      responsible: responsible || undefined,
      observations: observations || undefined,
      paymentInstallments: installments
    });

    // Ajustar estoque para produtos
    cart.forEach(ci => {
      const item = findCatalogItem(ci.productId);
      if (item && item.type === 'product') {
        adjustStock(item.id, -ci.quantity);
      }
    });

    toast.success("Venda processada com sucesso!");
    // Reset
    setCart([]);
    setSelectedClientId(undefined);
    setSelectedAnimalId(undefined);
    setSelectedPaymentMethodId(undefined);
    setSaleWithoutClient(false);
    setDiscount(0);
    setSurcharge(0);
    setReceivedNow(0);
    setInstallments(1);
    setObservations("");
    setResponsible("");
    navigate('/sales/my-sales'); // Redirecionar para a página de vendas
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header da Página com Gradiente e Breadcrumb */}
      <div className="bg-gradient-to-r from-background via-card to-background p-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground group">
                <FaShoppingCart className="h-5 w-5 text-muted-foreground" /> Ponto de Venda (PDV)
              </h1>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Registre vendas de produtos e serviços de forma rápida.
              </p>
            </div>
          </div>
          <Link to="/sales/my-sales">
            <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground transition-colors duration-200">
              <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Vendas
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Painel &gt; Vendas &gt; Ponto de Venda
        </p>
      </div>

      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna de Seleção de Produtos */}
        <Card className="lg:col-span-2 shadow-sm border border-border rounded-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <FaPlus className="h-5 w-5 text-primary" /> Adicionar Item
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="product-select">Produto/Serviço</Label>
              <Select onValueChange={setSelectedProduct} value={selectedProduct}>
                <SelectTrigger id="product-select" className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200">
                  <SelectValue placeholder="Selecione um produto ou serviço" />
                </SelectTrigger>
                <SelectContent>
                  {getCatalog().map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} (R$ {item.price.toFixed(2).replace('.', ',')}) {item.type === 'product' ? '• Produto' : '• Serviço'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity-input">Quantidade</Label>
              <Input
                id="quantity-input"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit-price-input">Preço unitário</Label>
              <Input
                id="unit-price-input"
                type="number"
                min="0"
                step="0.01"
                value={typeof unitPriceOverride === 'number' ? unitPriceOverride : (selectedProduct ? (findCatalogItem(selectedProduct)?.price ?? 0) : 0)}
                onChange={(e) => setUnitPriceOverride(parseFloat(e.target.value) || 0)}
                className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
              />
            </div>
            <Button onClick={handleAddProductToCart} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
              <FaPlus className="mr-2 h-4 w-4" /> Adicionar ao Carrinho
            </Button>
          </CardContent>
        </Card>

        {/* Coluna do Carrinho e Checkout */}
        <Card className="lg:col-span-1 shadow-sm border border-border rounded-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <FaShoppingCart className="h-5 w-5 text-primary" /> Carrinho
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {cart.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Carrinho vazio.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell className="text-right">R$ {item.total.toFixed(2).replace('.', ',')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItemFromCart(item.productId)}>
                          <FaTrashAlt className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="flex justify-between items-center font-bold text-lg border-t border-border pt-4 mt-4">
              <span>Subtotal:</span>
              <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="discount-input">Desconto</Label>
                <Input
                  id="discount-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="bg-input rounded-md border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surcharge-input">Acréscimos</Label>
                <Input
                  id="surcharge-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={surcharge}
                  onChange={(e) => setSurcharge(parseFloat(e.target.value) || 0)}
                  className="bg-input rounded-md border-border"
                />
              </div>
            </div>

            <div className="flex justify-between items-center font-bold text-lg border-t border-border pt-4 mt-2">
              <span>Total Final:</span>
              <span>R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="received-now-input">Valor recebido agora</Label>
                <Input
                  id="received-now-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={receivedNow}
                  onChange={(e) => setReceivedNow(parseFloat(e.target.value) || 0)}
                  className="bg-input rounded-md border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="installments-input">Parcelas</Label>
                <Input
                  id="installments-input"
                  type="number"
                  min="1"
                  value={installments}
                  onChange={(e) => setInstallments(parseInt(e.target.value) || 1)}
                  className="bg-input rounded-md border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations-textarea">Observações</Label>
              <Input
                id="responsible-input"
                placeholder="Responsável"
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                className="bg-input rounded-md border-border"
              />
              <Input
                id="observations-textarea"
                placeholder="Observações da venda"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="bg-input rounded-md border-border"
              />
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input
                id="sale-without-client"
                type="checkbox"
                checked={saleWithoutClient}
                onChange={(e) => setSaleWithoutClient(e.target.checked)}
              />
              <Label htmlFor="sale-without-client">Venda Avulsa</Label>
            </div>

            {!saleWithoutClient && (
              <div className="space-y-2 mt-2">
                <Label htmlFor="client-select">Cliente Responsável</Label>
                <Select onValueChange={setSelectedClientId} value={selectedClientId}>
                  <SelectTrigger id="client-select" className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedClientId && filteredAnimals.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="animal-select">Animal (Opcional)</Label>
                <Select onValueChange={setSelectedAnimalId} value={selectedAnimalId}>
                  <SelectTrigger id="animal-select" className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200">
                    <SelectValue placeholder="Selecione o animal (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAnimals.map((animal) => (
                      <SelectItem key={animal.id} value={animal.id}>
                        {animal.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2 mt-2">
              <Label htmlFor="payment-method-select">Forma de Pagamento</Label>
              <Select onValueChange={setSelectedPaymentMethodId} value={selectedPaymentMethodId}>
                <SelectTrigger id="payment-method-select" className="bg-white rounded-lg border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-400 transition-all duration-200">
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.length > 0 ? (
                    paymentMethods.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id}>
                        {pm.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      Cadastre formas em Vendas &gt; Formas de Recebimento
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleProcessSale} disabled={cart.length === 0 || !selectedClientId} className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold transition-all duration-200 shadow-md hover:shadow-lg mt-4">
              <FaCheckCircle className="mr-2 h-4 w-4" /> Processar Venda
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default POSPage;