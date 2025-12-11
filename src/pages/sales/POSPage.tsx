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
interface Product {
  id: string;
  name: string;
  price: number;
}

const POSPage = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | undefined>(undefined);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | undefined>(undefined); // NEW

  const filteredAnimals = selectedClientId
    ? mockClients.find(c => c.id === selectedClientId)?.animals || []
    : [];

  const paymentMethods = getRegistryList("paymentMethods"); // NEW

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);

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
      const price = item.price;
      if (existingItemIndex > -1) {
        const updatedCart = [...cart];
        updatedCart[existingItemIndex].quantity += quantity;
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
    if (!selectedClientId) {
      toast.error("Por favor, selecione o cliente responsável pela venda.");
      return;
    }
    if (!selectedPaymentMethodId) {
      toast.error("Selecione a forma de pagamento.");
      return;
    }

    const clientName = mockClients.find(c => c.id === selectedClientId)?.name;
    const animalName = selectedAnimalId ? mockClients.find(c => c.id === selectedClientId)?.animals.find(a => a.id === selectedAnimalId)?.name : undefined;
    const pm = paymentMethods.find(pm => pm.id === selectedPaymentMethodId);
    const paymentMethodName = pm?.name || "Não informado";

    const description = `Venda para ${clientName}${animalName ? ` (Animal: ${animalName})` : ''}: ${cart.map(item => `${item.name} x${item.quantity}`).join(', ')}`;
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    addMockFinancialTransaction({
      date: currentDate,
      time: currentTime,
      description: description,
      type: 'income',
      amount: subtotal,
      category: 'Venda de Produtos',
      relatedClientId: selectedClientId,
      relatedAnimalId: selectedAnimalId,
      paymentMethod: paymentMethodName, // NEW
    });

    cart.forEach(ci => {
      const item = findCatalogItem(ci.productId);
      if (item && item.type === 'product') {
        adjustStock(item.id, -ci.quantity);
      }
    });

    toast.success("Venda processada com sucesso!");
    setCart([]);
    setSelectedClientId(undefined);
    setSelectedAnimalId(undefined);
    setSelectedPaymentMethodId(undefined);
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