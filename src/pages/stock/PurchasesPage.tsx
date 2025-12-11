import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getCatalogByType, findCatalogItem, adjustStock } from "@/mockData/catalog";
import { addMockFinancialTransaction } from "@/mockData/financial";
import CurrencyInput from "@/components/CurrencyInput";

interface PurchaseItem {
  itemId: string;
  name: string;
  quantity: number;
  unitCost: number;
}

const PurchasesPage: React.FC = () => {
  const products = useMemo(() => getCatalogByType('product'), []);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [unitCost, setUnitCost] = useState<number>(0);
  const [supplier, setSupplier] = useState<string>("");
  const [items, setItems] = useState<PurchaseItem[]>([]);

  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0);

  const handleAddItem = () => {
    if (!selectedItemId) {
      toast.error("Selecione um produto.");
      return;
    }
    const q = Number(quantity) || 0;
    const c = Number(unitCost) || 0;
    if (q <= 0 || c < 0) {
      toast.error("Quantidade deve ser > 0 e custo >= 0.");
      return;
    }
    const found = findCatalogItem(selectedItemId);
    if (!found) {
      toast.error("Produto não encontrado.");
      return;
    }
    setItems(prev => [...prev, { itemId: found.id, name: found.name, quantity: q, unitCost: c }]);
    setSelectedItemId(""); setQuantity("1"); setUnitCost(0);
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(prev => prev.filter(i => i.itemId !== itemId));
  };

  const handleSavePurchase = () => {
    if (items.length === 0) {
      toast.error("Adicione ao menos um item à compra.");
      return;
    }
    // Ajustar estoque
    items.forEach(it => adjustStock(it.itemId, it.quantity));
    // Lançamento financeiro
    const now = new Date();
    addMockFinancialTransaction({
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      description: `Compra de estoque${supplier ? ` - Fornecedor: ${supplier}` : ""}: ${items.map(i => `${i.name} x${i.quantity}`).join(', ')}`,
      type: 'expense',
      amount: subtotal,
      category: 'Estoque',
    });
    toast.success("Compra registrada e estoque atualizado.");
    setSupplier(""); setItems([]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background p-4 sm:p-6">
      <div className="mb-3">
        <h1 className="text-xl sm:text-2xl font-semibold">Compras de Estoque</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Registre a entrada de produtos, atualizando o estoque e lançando a despesa.</p>
      </div>

      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Adicionar Item</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
          <div className="sm:col-span-2">
            <Label className="text-xs">Produto</Label>
            <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className="h-8 text-sm bg-input rounded-md border-border w-full">
              <option value="">Selecione...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Quantidade</Label>
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-8 text-sm bg-input" />
          </div>
          <div>
            <Label className="text-xs">Custo Unitário (R$)</Label>
            <CurrencyInput value={unitCost} onValueChange={setUnitCost} className="h-8 text-sm" />
          </div>
          <div className="sm:col-span-1">
            <Button onClick={handleAddItem} className="h-8 px-3 text-sm w-full">Adicionar</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Itens da Compra</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">Fornecedor (opcional)</Label>
              <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="h-8 text-sm bg-input" placeholder="Nome do fornecedor" />
            </div>
            <div className="flex items-end justify-end">
              <span className="text-sm font-semibold">Subtotal: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(subtotal)}</span>
            </div>
          </div>
          {items.length === 0 ? (
            <p className="text-muted-foreground">Nenhum item adicionado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Custo Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(it => (
                  <TableRow key={it.itemId}>
                    <TableCell>{it.name}</TableCell>
                    <TableCell>{it.quantity}</TableCell>
                    <TableCell>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(it.unitCost)}</TableCell>
                    <TableCell className="text-right">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(it.quantity * it.unitCost)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="h-8" onClick={() => handleRemoveItem(it.itemId)}>Remover</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex justify-end mt-3">
            <Button onClick={handleSavePurchase} disabled={items.length === 0} className="h-9 px-4">Salvar Compra</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchasesPage;