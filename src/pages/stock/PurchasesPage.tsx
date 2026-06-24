import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getCatalogByType, findCatalogItem, adjustStock } from "@/lib/catalogApi";
import type { CatalogItem } from "@/mockData/catalog";
import { addMockFinancialTransaction } from "@/mockData/financial";
import CurrencyInput from "@/components/CurrencyInput";
import { ShoppingBag } from "lucide-react";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";

interface PurchaseItem {
  itemId: string;
  name: string;
  quantity: number;
  unitCost: number;
}

const PurchasesPage: React.FC = () => {
  const [products, setProducts] = useState<CatalogItem[]>([]);

  useEffect(() => {
    getCatalogByType('product').then(setProducts);
  }, []);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [unitCost, setUnitCost] = useState<number>(0);
  const [supplier, setSupplier] = useState<string>("");
  const [items, setItems] = useState<PurchaseItem[]>([]);

  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0);

  const handleAddItem = async () => {
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
    const found = await findCatalogItem(selectedItemId);
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

  const handleSavePurchase = async () => {
    if (items.length === 0) {
      toast.error("Adicione ao menos um item à compra.");
      return;
    }
    // Ajustar estoque
    for (const it of items) {
      await adjustStock(it.itemId, it.quantity);
    }
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
    <PageShell>
      <PageHeader
        title="Compras de Estoque"
        description="Registre entradas de produtos e lance o impacto financeiro da operação."
        icon={ShoppingBag}
        module="stock"
        breadcrumb={<>Painel &gt; Estoque &gt; Compras</>}
      />

      <SectionCard title="Nova compra" description="Adicione produtos e custos unitários da compra." icon={ShoppingBag} tone="stock">
        <div className="vf-surface-card vf-tone-stock card-hover rounded-2xl border-border/80 p-4">
          <div className="mb-3 text-sm font-semibold text-foreground">Adicionar Item</div>
          <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-5">
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
            <Button onClick={handleAddItem} className="h-8 w-full bg-[hsl(var(--vf-stock))] px-3 text-sm text-white hover:bg-[hsl(var(--vf-stock)/0.9)]">Adicionar</Button>
          </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Itens da compra" description="Revise subtotal e finalize o lançamento da compra." icon={ShoppingBag} tone="stock">
        <div className="vf-surface-card vf-tone-stock card-hover mt-4 rounded-2xl border-border/80 p-4">
          <div className="mb-3 text-sm font-semibold text-foreground">Itens da Compra</div>
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
            <Button
              onClick={handleSavePurchase}
              disabled={items.length === 0}
              className="h-9 bg-[hsl(var(--vf-stock))] px-4 text-white hover:bg-[hsl(var(--vf-stock)/0.9)]"
            >
              Salvar Compra
            </Button>
          </div>
        </div>
      </SectionCard>
    </PageShell>
  );
};

export default PurchasesPage;