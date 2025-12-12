import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CurrencyInput from "@/components/CurrencyInput";
import { toast } from "sonner";
import { getCatalog, findCatalogItem, adjustStock, CatalogItem } from "@/mockData/catalog";
import { mockClients } from "@/mockData/clients";
import { addMockFinancialTransaction } from "@/mockData/financial";
import { getBudgets, addBudget, updateBudgetStatus, removeBudget, Budget } from "@/mockData/budgets";
import { getRegistryList } from "@/mockData/registry";
import AutocompleteSelect from "@/components/AutocompleteSelect";
import BudgetReportPdfContent from "@/components/BudgetReportPdfContent";
import { pdf } from "@react-pdf/renderer";

const BudgetsPage: React.FC = () => {
  const [clientId, setClientId] = React.useState<string | undefined>(undefined);
  const [animalId, setAnimalId] = React.useState<string | undefined>(undefined);
  const [productId, setProductId] = React.useState<string>("");
  const [qty, setQty] = React.useState<number>(1);
  const [unitPrice, setUnitPrice] = React.useState<number>(0);
  const [items, setItems] = React.useState<{ itemId: string; name: string; qty: number; price: number }[]>([]);
  const [customItemEnabled, setCustomItemEnabled] = React.useState<boolean>(false);
  const [customItemName, setCustomItemName] = React.useState<string>("");
  const [customItemPrice, setCustomItemPrice] = React.useState<number>(0);

  const [budgets, setBudgets] = React.useState<Budget[]>(getBudgets());

  const productsAndServices = React.useMemo(() => getCatalog(), []);
  const options = React.useMemo(
    () => productsAndServices.map(p => ({ value: p.id, label: p.name })),
    [productsAndServices]
  );
  const paymentMethods = getRegistryList("paymentMethods");

  const refreshBudgets = () => setBudgets(getBudgets());

  const animals = React.useMemo(() => {
    if (!clientId) return [];
    const client = mockClients.find(c => c.id === clientId);
    return client?.animals || [];
  }, [clientId]);

  React.useEffect(() => {
    if (!productId) {
      setUnitPrice(0);
      return;
    }
    const item = findCatalogItem(productId);
    setUnitPrice(item?.price || 0);
  }, [productId]);

  const subtotal = items.reduce((sum, it) => sum + it.qty * it.price, 0);

  const addItemToBudget = () => {
    if (customItemEnabled) {
      if (!customItemName.trim() || customItemPrice <= 0 || qty <= 0) {
        toast.error("Preencha nome, preço e quantidade válidos para o item personalizado.");
        return;
      }
      setItems(prev => [...prev, { itemId: `custom-${Date.now()}`, name: customItemName.trim(), qty, price: customItemPrice }]);
      setCustomItemName(""); setCustomItemPrice(0); setQty(1);
      return;
    }

    if (!productId) {
      toast.error("Selecione um item do catálogo.");
      return;
    }
    const item = findCatalogItem(productId);
    if (!item) {
      toast.error("Item não encontrado no catálogo.");
      return;
    }
    if (qty <= 0) {
      toast.error("Quantidade deve ser maior que zero.");
      return;
    }
    setItems(prev => [...prev, { itemId: item.id, name: item.name, qty, price: unitPrice }]);
    setProductId(""); setQty(1); setUnitPrice(0);
  };

  const saveBudget = () => {
    if (items.length === 0) {
      toast.error("Adicione itens ao orçamento.");
      return;
    }
    const b = addBudget({ clientId, animalId, items, notes: undefined });
    toast.success("Orçamento salvo.");
    setItems([]);
    setClientId(undefined);
    setAnimalId(undefined);
    refreshBudgets();
  };

  const [pmByBudget, setPmByBudget] = React.useState<Record<string, string | undefined>>({});

  const convertBudget = (budgetId: string) => {
    const budget = budgets.find(b => b.id === budgetId);
    if (!budget) return;
    if (budget.status === "converted") {
      toast.error("Este orçamento já foi convertido.");
      return;
    }
    const pmName = pmByBudget[budgetId];
    const total = budget.items.reduce((sum, it) => sum + it.qty * it.price, 0);
    const now = new Date();
    addMockFinancialTransaction({
      date: now.toISOString().split("T")[0],
      time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      description: `Orçamento convertido: ${budget.items.map(i => `${i.name} x${i.qty}`).join(", ")}`,
      type: "income",
      amount: total,
      category: "Venda de Produtos",
      relatedClientId: budget.clientId,
      relatedAnimalId: budget.animalId,
      paymentMethod: pmName,
    });
    // Atualizar estoque apenas para produtos
    budget.items.forEach(it => {
      const catItem = findCatalogItem(it.itemId);
      if (catItem && catItem.type === "product") adjustStock(it.itemId, -it.qty);
    });
    updateBudgetStatus(budgetId, "converted");
    refreshBudgets();
    toast.success("Orçamento convertido em venda.");
  };

  const cancelBudget = (budgetId: string) => {
    updateBudgetStatus(budgetId, "cancelled");
    refreshBudgets();
    toast.success("Orçamento cancelado.");
  };

  const removeBudgetAction = (budgetId: string) => {
    removeBudget(budgetId);
    refreshBudgets();
    toast.success("Orçamento removido.");
  };

  const handleOpenBudgetPdf = async (b: Budget) => {
    const blob = await pdf(<BudgetReportPdfContent budget={b} />).toBlob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background p-4 sm:p-6">
      <div className="mb-3">
        <h1 className="text-xl sm:text-2xl font-semibold">Orçamentos</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Monte orçamentos vinculados a clientes e animais, e converta em venda.</p>
      </div>

      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Novo Orçamento</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
          <div>
            <Label className="text-xs">Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="h-8 text-sm bg-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {mockClients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Animal</Label>
            <Select value={animalId} onValueChange={setAnimalId}>
              <SelectTrigger className="h-8 text-sm bg-input"><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                {(mockClients.find(c => c.id === clientId)?.animals || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-6 flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Item personalizado</label>
            <input type="checkbox" checked={customItemEnabled} onChange={(e) => setCustomItemEnabled(e.target.checked)} />
          </div>

          {!customItemEnabled ? (
            <div className="sm:col-span-2">
              <Label className="text-xs">Item</Label>
              <AutocompleteSelect
                value={productId}
                onChange={setProductId}
                options={options}
                placeholder="Selecione um item"
                className="bg-input"
              />
            </div>
          ) : (
            <>
              <div className="sm:col-span-2">
                <Label className="text-xs">Nome do item</Label>
                <Input value={customItemName} onChange={(e) => setCustomItemName(e.target.value)} className="h-8 text-sm bg-input" placeholder="Ex.: Cirurgia ortopédica" />
              </div>
              <div>
                <Label className="text-xs">Preço Unitário</Label>
                <CurrencyInput value={customItemPrice} onValueChange={setCustomItemPrice} className="h-8 text-sm w-full" />
              </div>
            </>
          )}
          <div>
            <Label className="text-xs">Qtd</Label>
            <Input value={qty} onChange={(e) => setQty(Number(e.target.value) || 0)} className="h-8 text-sm bg-input w-full" />
          </div>
          <div>
            <Label className="text-xs">Preço Unitário</Label>
            <CurrencyInput value={unitPrice} onValueChange={setUnitPrice} className="h-8 text-sm w-full" />
          </div>
          <div className="sm:col-span-6 flex justify-end">
            <Button onClick={addItemToBudget} className="h-8 px-3 text-sm">Adicionar Item</Button>
          </div>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card className="border border-border mt-3">
          <CardHeader className="pb-2"><CardTitle className="text-base">Itens do Orçamento</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => (
                  <TableRow key={`${it.itemId}-${idx}`}>
                    <TableCell className="font-medium">{it.name}</TableCell>
                    <TableCell>{it.qty}</TableCell>
                    <TableCell>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(it.price)}</TableCell>
                    <TableCell className="text-right">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(it.qty * it.price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-end mt-3">
              <div className="text-sm font-semibold">Total: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(subtotal)}</div>
            </div>
            <div className="flex justify-end mt-3">
              <Button onClick={saveBudget} className="h-9 px-4">Salvar Orçamento</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border border-border mt-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Orçamentos Salvos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Animal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.map(b => {
                const total = b.items.reduce((sum, it) => sum + it.qty * it.price, 0);
                const client = b.clientId ? mockClients.find(c => c.id === b.clientId) : undefined;
                const animal = b.animalId ? client?.animals.find(a => a.id === b.animalId) : undefined;
                return (
                  <TableRow key={b.id}>
                    <TableCell>{b.date}</TableCell>
                    <TableCell>{client?.name || "-"}</TableCell>
                    <TableCell>{animal?.name || "-"}</TableCell>
                    <TableCell className="capitalize">{b.status}</TableCell>
                    <TableCell>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total)}</TableCell>
                    <TableCell>
                      <Select value={pmByBudget[b.id]} onValueChange={(v) => setPmByBudget(prev => ({ ...prev, [b.id]: v }))}>
                        <SelectTrigger className="h-8 text-sm bg-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {paymentMethods.length > 0 ? paymentMethods.map(pm => (
                            <SelectItem key={pm.id} value={pm.name}>{pm.name}</SelectItem>
                          )) : (
                            <SelectItem value="none" disabled>Cadastre formas em Vendas &gt; Formas de Recebimento</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" className="h-8" onClick={() => convertBudget(b.id)} disabled={b.status === "converted" || b.status === "cancelled"}>
                        Converter
                      </Button>
                      <Button variant="outline" size="sm" className="h-8" onClick={() => cancelBudget(b.id)} disabled={b.status === "converted" || b.status === "cancelled"}>
                        Cancelar
                      </Button>
                      <Button variant="outline" size="sm" className="h-8" onClick={() => removeBudgetAction(b.id)}>
                        Remover
                      </Button>
                      <Button variant="outline" size="sm" className="h-8" onClick={() => handleOpenBudgetPdf(b)}>
                        Relatório
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {budgets.length === 0 && <p className="text-muted-foreground mt-2">Nenhum orçamento cadastrado.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetsPage;