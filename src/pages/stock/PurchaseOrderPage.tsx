import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getCatalogByType, findCatalogItem, adjustStock } from "@/mockData/catalog";
import { PurchaseOrder, addPurchaseOrder, getPurchaseOrders, updatePurchaseOrderStatus, removePurchaseOrder } from "@/mockData/registry";

const PurchaseOrderPage: React.FC = () => {
  const products = React.useMemo(() => getCatalogByType("product"), []);
  const [supplier, setSupplier] = React.useState<string>("");
  const [selectedItemId, setSelectedItemId] = React.useState<string>("");
  const [qty, setQty] = React.useState<number>(1);
  const [items, setItems] = React.useState<{ itemId: string; name: string; qty: number }[]>([]);
  const [orders, setOrders] = React.useState<PurchaseOrder[]>(getPurchaseOrders());

  const refreshOrders = () => setOrders(getPurchaseOrders());

  const addItem = () => {
    if (!selectedItemId) { toast.error("Selecione um produto."); return; }
    if (qty <= 0) { toast.error("Quantidade deve ser maior que zero."); return; }
    const item = findCatalogItem(selectedItemId);
    if (!item) { toast.error("Produto não encontrado."); return; }
    setItems(prev => [...prev, { itemId: item.id, name: item.name, qty }]);
    setSelectedItemId(""); setQty(1);
  };

  const savePO = () => {
    if (items.length === 0) { toast.error("Adicione itens ao pedido."); return; }
    addPurchaseOrder({ supplier, items, notes: undefined });
    setSupplier(""); setItems([]);
    refreshOrders();
    toast.success("Pedido criado.");
  };

  const receivePO = (id: string) => {
    const po = orders.find(o => o.id === id);
    if (!po) return;
    if (po.status === "received") { toast.error("Pedido já recebido."); return; }
    po.items.forEach(it => adjustStock(it.itemId, it.qty));
    updatePurchaseOrderStatus(id, "received");
    refreshOrders();
    toast.success("Pedido recebido e estoque atualizado.");
  };

  const cancelPO = (id: string) => {
    updatePurchaseOrderStatus(id, "cancelled");
    refreshOrders();
    toast.success("Pedido cancelado.");
  };

  const removePO = (id: string) => {
    removePurchaseOrder(id);
    refreshOrders();
    toast.success("Pedido removido.");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background p-4 sm:p-6">
      <div className="mb-3">
        <h1 className="text-xl sm:text-2xl font-semibold">Pedido de Compra</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Crie pedidos e dê entrada no estoque ao receber.</p>
      </div>

      <Card className="border border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base sm:text-lg">Novo Pedido</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
          <div className="sm:col-span-2">
            <Label className="text-xs">Fornecedor</Label>
            <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="h-8 text-sm bg-input" placeholder="Nome do fornecedor" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Produto</Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger className="h-8 text-sm bg-input">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Qtd</Label>
            <Input value={qty} onChange={(e) => setQty(Number(e.target.value) || 0)} className="h-8 text-sm bg-input" />
          </div>
          <div className="sm:col-span-5 flex justify-end">
            <Button onClick={addItem} className="h-8 px-3 text-sm">Adicionar item</Button>
          </div>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card className="border border-border mt-3">
          <CardHeader className="pb-2"><CardTitle className="text-base">Itens do Pedido</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qtd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(it => (
                  <TableRow key={it.itemId}>
                    <TableCell>{it.name}</TableCell>
                    <TableCell>{it.qty}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end mt-3">
              <Button onClick={savePO} className="h-9 px-4">Salvar Pedido</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border border-border mt-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Pedidos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(o => (
                <TableRow key={o.id}>
                  <TableCell>{o.supplier || "-"}</TableCell>
                  <TableCell>{o.date}</TableCell>
                  <TableCell className="capitalize">{o.status}</TableCell>
                  <TableCell>{o.items.map(i => `${i.name} x${i.qty}`).join(", ")}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" className="h-8" onClick={() => receivePO(o.id)}>Receber</Button>
                    <Button variant="outline" size="sm" className="h-8" onClick={() => cancelPO(o.id)}>Cancelar</Button>
                    <Button variant="outline" size="sm" className="h-8" onClick={() => removePO(o.id)}>Remover</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {orders.length === 0 && <p className="text-muted-foreground mt-2">Nenhum pedido registrado.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseOrderPage;