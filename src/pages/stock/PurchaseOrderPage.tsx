import React from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { getCatalogByType, findCatalogItem, adjustStock } from "@/mockData/catalog";
import type { PurchaseOrder } from "@/mockData/registry";
import { addPurchaseOrder, getPurchaseOrders, updatePurchaseOrderStatus, removePurchaseOrder } from "@/mockData/registry";
import { PageHeader } from "@/components/saas/PageHeader";
import { VfCard } from "@/components/saas/VfCard";
import { PageShell } from "@/components/saas/PageShell";
import { SectionCard } from "@/components/saas/SectionCard";
import { Badge } from "@/components/ui/badge";

const PurchaseOrderPage: React.FC = () => {
  const products = React.useMemo(() => getCatalogByType("product"), []);
  const [supplier, setSupplier] = React.useState<string>("");
  const [selectedItemId, setSelectedItemId] = React.useState<string>("");
  const [qty, setQty] = React.useState<number>(1);
  const [items, setItems] = React.useState<{ itemId: string; name: string; qty: number }[]>([]);
  const [orders, setOrders] = React.useState<PurchaseOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = React.useState(true);

  const refreshOrders = React.useCallback(async () => {
    setLoadingOrders(true);
    try {
      const list = await getPurchaseOrders();
      setOrders(list);
    } catch {
      toast.error("Falha ao carregar pedidos de compra.");
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshOrders();
  }, [refreshOrders]);

  const addItem = () => {
    if (!selectedItemId) { toast.error("Selecione um produto."); return; }
    if (qty <= 0) { toast.error("Quantidade deve ser maior que zero."); return; }
    const item = findCatalogItem(selectedItemId);
    if (!item) { toast.error("Produto não encontrado."); return; }
    setItems(prev => [...prev, { itemId: item.id, name: item.name, qty }]);
    setSelectedItemId(""); setQty(1);
  };

  const savePO = async () => {
    if (items.length === 0) { toast.error("Adicione itens ao pedido."); return; }
    const created = await addPurchaseOrder({ supplier, items, notes: undefined });
    if (!created) {
      toast.error("Falha ao criar pedido no Supabase.");
      return;
    }
    setSupplier(""); setItems([]);
    await refreshOrders();
    toast.success("Pedido criado.");
  };

  const receivePO = async (id: string) => {
    const po = orders.find(o => o.id === id);
    if (!po) return;
    if (po.status === "received") { toast.error("Pedido já recebido."); return; }
    po.items.forEach(it => adjustStock(it.itemId, it.qty));
    const ok = await updatePurchaseOrderStatus(id, "received");
    if (!ok) { toast.error("Falha ao atualizar status do pedido."); return; }
    await refreshOrders();
    toast.success("Pedido recebido e estoque atualizado.");
  };

  const cancelPO = async (id: string) => {
    const ok = await updatePurchaseOrderStatus(id, "cancelled");
    if (!ok) { toast.error("Falha ao cancelar pedido."); return; }
    await refreshOrders();
    toast.success("Pedido cancelado.");
  };

  const reopenPO = async (id: string) => {
    const ok = await updatePurchaseOrderStatus(id, "open");
    if (!ok) {
      toast.error("Falha ao reabrir pedido.");
      return;
    }
    await refreshOrders();
    toast.success("Pedido reaberto.");
  };

  const statusLabel = (status: PurchaseOrder["status"]) => {
    if (status === "received") return "Recebido";
    if (status === "cancelled") return "Cancelado";
    if (status === "approved") return "Aprovado";
    return "Em aberto";
  };

  const removePO = async (id: string) => {
    const ok = await removePurchaseOrder(id);
    if (!ok) { toast.error("Falha ao remover pedido."); return; }
    await refreshOrders();
    toast.success("Pedido removido.");
  };

  return (
    <PageShell>
      <PageHeader
        title="Pedido de Compra"
        description="Crie pedidos e dê entrada no estoque ao receber."
        icon={ClipboardList}
        module="stock"
        breadcrumb={<>Painel &gt; Estoque &gt; Pedido de compra</>}
      />

      <SectionCard title="Novo pedido" description="Monte itens para envio ao fornecedor." icon={ClipboardList} tone="stock">
      <VfCard tone="stock" className="card-hover rounded-2xl border-border/80">
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
            <Button onClick={addItem} className="h-8 bg-[hsl(var(--vf-stock))] px-3 text-sm text-white hover:bg-[hsl(var(--vf-stock)/0.9)]">Adicionar item</Button>
          </div>
        </CardContent>
      </VfCard>
      </SectionCard>

      {items.length > 0 && (
        <SectionCard title="Itens do pedido" description="Revise quantidades antes de salvar." icon={ClipboardList} tone="stock">
        <VfCard tone="stock" className="card-hover rounded-2xl border-border/80">
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
              <Button onClick={() => void savePO()} className="h-9 bg-[hsl(var(--vf-stock))] px-4 text-white hover:bg-[hsl(var(--vf-stock)/0.9)]">Salvar Pedido</Button>
            </div>
          </CardContent>
        </VfCard>
        </SectionCard>
      )}

      <SectionCard title="Pedidos registrados" description="Acompanhe e altere status de recebimento." icon={ClipboardList} tone="stock">
      <VfCard tone="stock" className="card-hover rounded-2xl border-border/80">
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
              {loadingOrders ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">Carregando pedidos...</TableCell>
                </TableRow>
              ) : (
                orders.map(o => (
                  <TableRow key={o.id}>
                    <TableCell>{o.supplier || "-"}</TableCell>
                    <TableCell>{new Date(`${o.date}T12:00:00`).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          o.status === "received"
                            ? "bg-emerald-100 text-emerald-800"
                            : o.status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                        }
                      >
                        {statusLabel(o.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{o.items.map(i => `${i.name} x${i.qty}`).join(", ")}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => (o.status === "received" ? void reopenPO(o.id) : void receivePO(o.id))}
                      >
                        {o.status === "received" ? "Reabrir" : "Receber"}
                      </Button>
                      <Button variant="outline" size="sm" className="h-8" onClick={() => void cancelPO(o.id)} disabled={o.status === "received" || o.status === "cancelled"}>
                        Cancelar
                      </Button>
                      <Button variant="outline" size="sm" className="h-8" onClick={() => void removePO(o.id)}>Remover</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {!loadingOrders && orders.length === 0 && <p className="text-muted-foreground mt-2">Nenhum pedido registrado.</p>}
        </CardContent>
      </VfCard>
      </SectionCard>
    </PageShell>
  );
};

export default PurchaseOrderPage;