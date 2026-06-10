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
import { useClientsList } from "@/hooks/useSupabaseClients";

// Mock data para produtos/serviços
interface Product {
  id: string;
  name: string;
  price: number;
}

const mockProducts: Product[] = [
  { id: "prod1", name: "Ração Premium 1kg", price: 50.00 },
  { id: "prod2", name: "Brinquedo para Cachorro", price: 25.00 },
  { id: "prod3", name: "Consulta de Rotina", price: 120.00 },
  { id: "prod4", name: "Vacina V8", price: 90.00 },
  { id: "prod5", name: "Exame de Sangue", price: 150.00 },
];

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

const POSPage = () => {
  const { data: dbClients, isError: isClientsError } = useClientsList();
  const clients = dbClients || [];
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | undefined>(undefined);

  const filteredAnimals = selectedClientId
    ? clients.find(c => c.id === selectedClientId)?.animals || []
    : [];

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);

  const handleAddProductToCart = () => {
    if (!selectedProduct) {
      toast.error("Por favor, selecione um produto.");
      return;
    }
    if (quantity <= 0) {
      toast.error("A quantidade deve ser maior que zero.");
      return;
    }

    const product = mockProducts.find(p => p.id === selectedProduct);
    if (product) {
      const existingItemIndex = cart.findIndex(item => item.productId === product.id);

      if (existingItemIndex > -1) {
        const updatedCart = [...cart];
        updatedCart[existingItemIndex].quantity += quantity;
        updatedCart[existingItemIndex].total = updatedCart[existingItemIndex].quantity * product.price;
        setCart(updatedCart);
      } else {
        setCart([...cart, {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: quantity,
          total: quantity * product.price,
        }]);
      }
      setSelectedProduct(undefined);
      setQuantity(1);
      toast.success(`${product.name} adicionado ao carrinho!`);
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

    const clientName = clients.find(c => c.id === selectedClientId)?.name;
    const animalName = selectedAnimalId ? clients.find(c => c.id === selectedClientId)?.animals.find(a => a.id === selectedAnimalId)?.name : undefined;

    const description = `Venda para ${clientName}${animalName ? ` (Animal: ${animalName})` : ''}: ${cart.map(item => `${item.name} x${item.quantity}`).join(', ')}`;

    addMockFinancialTransaction({
      date: new Date().toISOString().split('T')[0],
      description: description,
      type: 'income',
      amount: subtotal,
      category: 'Venda de Produtos',
      relatedClientId: selectedClientId,
      relatedAnimalId: selectedAnimalId,
    });

    toast.success("Venda processada com sucesso!");
    setCart([]);
    setSelectedClientId(undefined);
    setSelectedAnimalId(undefined);
    navigate('/sales/my-sales'); // Redirecionar para a página de vendas
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header da Página com Gradiente e Breadcrumb */}
      <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 p-6 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-3 text-[#1E293B] dark:text-gray-100 group">
                <FaShoppingCart className="h-5 w-5 text-gray-500 dark:text-gray-400" /> Ponto de Venda (PDV)
              </h1>
              <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-1 mb-4">
                Registre vendas de produtos e serviços de forma rápida.
              </p>
            </div>
          </div>
          <Link to="/sales/my-sales">
            <Button variant="outline" className="rounded-md border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors duration-200">
              <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Vendas
            </Button>
          </Link>
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Painel &gt; Vendas &gt; Ponto de Venda
        </p>
      </div>

      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna de Seleção de Produtos */}
        <Card className="lg:col-span-2 bg-white/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-t-4 border-blue-400 dark:bg-gray-800/90">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[#374151] dark:text-gray-100">
              <FaPlus className="h-5 w-5 text-blue-500" /> Adicionar Item
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="product-select">Produto/Serviço</Label>
              <Select onValueChange={setSelectedProduct} value={selectedProduct}>
                <SelectTrigger id="product-select" className="bg-white rounded-lg border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-400 placeholder-[#9CA3AF] dark:placeholder-gray-500 transition-all duration-200">
                  <SelectValue placeholder="Selecione um produto ou serviço" />
                </SelectTrigger>
                <SelectContent>
                  {mockProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (R$ {product.price.toFixed(2).replace('.', ',')})
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
                className="bg-white rounded-lg border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-400 placeholder-[#9CA3AF] dark:placeholder-gray-500 transition-all duration-200"
              />
            </div>
            <Button onClick={handleAddProductToCart} className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
              <FaPlus className="mr-2 h-4 w-4" /> Adicionar ao Carrinho
            </Button>
          </CardContent>
        </Card>

        {/* Coluna do Carrinho e Checkout */}
        <Card className="lg:col-span-1 bg-white/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-t-4 border-purple-400 dark:bg-gray-800/90">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[#374151] dark:text-gray-100">
              <FaShoppingCart className="h-5 w-5 text-purple-500" /> Carrinho
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
                          <FaTrashAlt className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="flex justify-between items-center font-bold text-lg border-t pt-4 mt-4">
              <span>Subtotal:</span>
              <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="client-select">Cliente Responsável</Label>
              <Select onValueChange={setSelectedClientId} value={selectedClientId}>
                <SelectTrigger id="client-select" className="bg-white rounded-lg border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-400 placeholder-[#9CA3AF] dark:placeholder-gray-500 transition-all duration-200">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
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
                  <SelectTrigger id="animal-select" className="bg-white rounded-lg border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-400 placeholder-[#9CA3AF] dark:placeholder-gray-500 transition-all duration-200">
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

            <Button
              onClick={handleProcessSale}
              disabled={cart.length === 0 || !selectedClientId || isClientsError}
              className="bg-gradient-to-r from-green-500 to-teal-500 text-white hover:from-green-600 hover:to-teal-600 font-semibold transition-all duration-200 shadow-md hover:shadow-lg mt-4"
            >
              <FaCheckCircle className="mr-2 h-4 w-4" /> Processar Venda
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default POSPage;