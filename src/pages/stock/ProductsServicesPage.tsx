import React, { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CatalogItem, CatalogItemType, getCatalog, addCatalogItem, updateCatalogItem, removeCatalogItem, adjustStock } from "@/mockData/catalog";
import CurrencyInput from "@/components/CurrencyInput";
import { PackageSearch } from "lucide-react";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";

const ProductsServicesPage: React.FC = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [activeTab, setActiveTab] = useState<CatalogItemType>("product");

  // Form para novo item
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<CatalogItemType>("product");
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newSKU, setNewSKU] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newStockQty, setNewStockQty] = useState<string>("0");

  useEffect(() => {
    setItems(getCatalog());
  }, []);

  const filteredItems = useMemo(
    () => items.filter(i => i.type === activeTab),
    [items, activeTab]
  );

  const refresh = () => setItems(getCatalog());

  const handleAddItem = () => {
    if (!newName.trim()) {
      toast.error("Informe o nome do item.");
      return;
    }
    const created = addCatalogItem({
      name: newName.trim(),
      type: newType,
      price: Number(newPrice) || 0,
      sku: newSKU.trim() || undefined,
      unit: newUnit.trim() || undefined,
      stockQty: newType === 'product' ? Number(newStockQty) || 0 : undefined,
      brand: undefined,
      group: undefined,
      active: true,
    });
    toast.success(`${created.type === 'product' ? 'Produto' : 'Serviço'} adicionado.`);
    setNewName("");
    setNewPrice(0);
    setNewSKU("");
    setNewUnit("");
    setNewStockQty("0");
    setNewType("product");
    refresh();
  };

  const handleUpdateItem = (item: CatalogItem, field: keyof CatalogItem, value: string | number | boolean) => {
    const updated: CatalogItem = {
      ...item,
      [field]: field === 'price' ? Number(value) || 0 : value as any,
    };
    const ok = updateCatalogItem(updated);
    if (ok) {
      refresh();
    } else {
      toast.error("Falha ao atualizar item.");
    }
  };

  const handleAdjustStock = (item: CatalogItem, delta: number) => {
    if (item.type !== 'product') return;
    const ok = adjustStock(item.id, delta);
    if (ok) {
      refresh();
      toast.success(`Estoque ${delta > 0 ? 'entrada' : 'saída'} registrada.`);
    } else {
      toast.error("Falha ao ajustar estoque.");
    }
  };

  const handleRemoveItem = (id: string) => {
    const ok = removeCatalogItem(id);
    if (ok) {
      refresh();
      toast.success("Item removido.");
    } else {
      toast.error("Falha ao remover.");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Produtos e Serviços"
        description="Gerencie o catálogo de produtos e serviços com atualização rápida de preços e estoque."
        icon={PackageSearch}
        module="stock"
        breadcrumb={<>Painel &gt; Estoque &gt; Produtos e Serviços</>}
      />

      <SectionCard title="Cadastro rápido" description="Adicione novos itens ao catálogo." icon={PackageSearch} tone="stock">
        <div className="vf-surface-card vf-tone-stock card-hover rounded-2xl border-border/80 p-4">
          <div className="mb-3 text-sm font-semibold text-foreground">Adicionar novo</div>
          <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-7">
          <div className="sm:col-span-2">
            <Label className="text-xs">Nome</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="h-8 text-sm bg-input" placeholder="Ex.: Consulta de Rotina" />
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <select value={newType} onChange={(e) => setNewType(e.target.value as CatalogItemType)} className="h-8 text-sm bg-input rounded-md border-border w-full">
              <option value="product">Produto</option>
              <option value="service">Serviço</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Preço</Label>
            <CurrencyInput value={newPrice} onValueChange={setNewPrice} className="h-8 text-sm w-full" />
          </div>
          <div>
            <Label className="text-xs">SKU</Label>
            <Input value={newSKU} onChange={(e) => setNewSKU(e.target.value)} className="h-8 text-sm bg-input" placeholder="Opcional" />
          </div>
          <div>
            <Label className="text-xs">Unidade</Label>
            <Input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className="h-8 text-sm bg-input" placeholder="Ex.: un, dose" />
          </div>
          <div>
            <Label className="text-xs">Estoque (produto)</Label>
            <Input value={newStockQty} onChange={(e) => setNewStockQty(e.target.value)} className="h-8 text-sm bg-input" placeholder="0" />
          </div>
          <div className="sm:col-span-1">
            <Button onClick={handleAddItem} className="h-8 w-full bg-[hsl(var(--vf-stock))] px-3 text-sm text-white hover:bg-[hsl(var(--vf-stock)/0.9)]">Adicionar</Button>
          </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Catálogo" description="Edite preços, status e estoque dos itens existentes." icon={PackageSearch} tone="stock">
        <div className="vf-surface-card vf-tone-stock card-hover mt-4 rounded-2xl border-border/80 p-4">
          <div className="mb-3 text-sm font-semibold text-foreground">Catálogo</div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CatalogItemType)}>
            <TabsList className="mb-3 grid w-full grid-cols-2 rounded-xl bg-muted/50">
              <TabsTrigger value="product">Produtos</TabsTrigger>
              <TabsTrigger value="service">Serviços</TabsTrigger>
            </TabsList>
            <TabsContent value="product">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.sku || "-"}</TableCell>
                      <TableCell>
                        <CurrencyInput
                          value={item.price}
                          onValueChange={(val) => handleUpdateItem(item, 'price', val)}
                          className="h-8 text-sm w-24"
                        />
                      </TableCell>
                      <TableCell className="flex items-center gap-2">
                        <span>{item.stockQty ?? 0}</span>
                        <Button variant="outline" size="sm" className="h-7" onClick={() => handleAdjustStock(item, 1)}>+1</Button>
                        <Button variant="outline" size="sm" className="h-7" onClick={() => handleAdjustStock(item, -1)}>-1</Button>
                      </TableCell>
                      <TableCell>
                        <select
                          value={item.active ? 'true' : 'false'}
                          onChange={(e) => handleUpdateItem(item, 'active', e.target.value === 'true')}
                          className="h-8 text-sm bg-input rounded-md border-border"
                        >
                          <option value="true">Ativo</option>
                          <option value="false">Inativo</option>
                        </select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="h-8" onClick={() => handleRemoveItem(item.id)}>
                          Remover
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="service">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.unit || "-"}</TableCell>
                      <TableCell>
                        <CurrencyInput
                          value={item.price}
                          onValueChange={(val) => handleUpdateItem(item, 'price', val)}
                          className="h-8 text-sm w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <select
                          value={item.active ? 'true' : 'false'}
                          onChange={(e) => handleUpdateItem(item, 'active', e.target.value === 'true')}
                          className="h-8 text-sm bg-input rounded-md border-border"
                        >
                          <option value="true">Ativo</option>
                          <option value="false">Inativo</option>
                        </select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="h-8" onClick={() => handleRemoveItem(item.id)}>
                          Remover
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </div>
      </SectionCard>
    </PageShell>
  );
};

export default ProductsServicesPage;