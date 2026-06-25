import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CurrencyInput from "@/components/CurrencyInput";
import { toast } from "sonner";
import { getCatalog, findCatalogItem, adjustStock } from "@/mockData/catalog";
import { getCatalog as getCatalogApi } from "@/lib/catalogApi";
import type { CatalogItem } from "@/mockData/catalog";
import { addMockFinancialTransaction } from "@/mockData/financial";
import { getBudgets, addBudget, updateBudgetStatus, removeBudget, Budget } from "@/mockData/budgets";
import { getRegistryList } from "@/mockData/registry";
import AutocompleteSelect from "@/components/AutocompleteSelect";
import BudgetReportPdfContent from "@/components/BudgetReportPdfContent";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { Link } from "react-router-dom";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";
import { ToolbarRow } from "@/components/saas/ToolbarRow";
import { DataTableFrame } from "@/components/saas/DataTableFrame";
import { ArrowLeft, FileText, Filter, Sparkles } from "lucide-react";
import { createPdfBlob, openPdf } from "@/lib/pdfExport";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";

const BudgetsPage: React.FC = () => {
  const { data: dbClients, isError: isClientsError } = useClientsList();
  const clients = dbClients || [];
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
  const { profile: currentUserProfile } = useCurrentUserProfile();
  const [catalogItems, setCatalogItems] = React.useState<CatalogItem[]>([]);
  React.useEffect(() => { getCatalogApi().then(setCatalogItems); }, []);

  const productsAndServices = React.useMemo(() => getCatalog(), []);
  const options = React.useMemo(
    () => productsAndServices.map(p => ({ value: p.id, label: p.name })),
    [productsAndServices]
  );
  const paymentMethods = getRegistryList("paymentMethods");

  const refreshBudgets = () => setBudgets(getBudgets());

  const animals = React.useMemo(() => {
    if (!clientId) return [];
    const client = clients.find(c => c.id === clientId);
    return client?.animals || [];
  }, [clientId, clients]);

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
    const selectedClient = clientId ? clients.find((c) => c.id === clientId) : undefined;
    const selectedAnimal = animalId ? selectedClient?.animals.find((a) => a.id === animalId) : undefined;
    const b = addBudget({
      clientId,
      animalId,
      clientName: selectedClient?.name,
      animalName: selectedAnimal?.name,
      clientPhone: selectedClient?.mainPhoneContact,
      items,
      notes: undefined,
    });
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
    const blob = await createPdfBlob(<BudgetReportPdfContent budget={b} userProfile={currentUserProfile} catalogItems={catalogItems} />);
    await openPdf({
      blob,
      fileName: `orcamento_${b.id}.pdf`,
      persistOptions: { folder: "budgets" },
    });
  };

  return (
    <PageShell>
      <PageHeader
        title="Orçamentos"
        description="Monte propostas comerciais com itens de catálogo e converta em venda com rastreio de pagamento."
        icon={FileText}
        module="sales"
        breadcrumb={<>Painel &gt; Comercial &gt; Orçamentos</>}
        actions={
          <Button asChild variant="outline" className="rounded-xl border-border/70">
            <Link to="/sales/my-sales">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para vendas
            </Link>
          </Button>
        }
      />

      <SectionCard
        title="Composição do orçamento"
        description="Selecione cliente, itens e quantidades para montar a proposta."
        icon={Filter}
        tone="sales"
      >
        <ToolbarRow className="grid grid-cols-1 gap-2 sm:grid-cols-6 sm:items-end">
          <div>
            <Label className="text-xs">Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="vf-toolbar-control text-sm bg-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Animal</Label>
            <Select value={animalId} onValueChange={setAnimalId}>
              <SelectTrigger className="vf-toolbar-control text-sm bg-input"><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                {(clients.find(c => c.id === clientId)?.animals || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
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
                <Input value={customItemName} onChange={(e) => setCustomItemName(e.target.value)} className="vf-toolbar-control text-sm bg-input" placeholder="Ex.: Cirurgia ortopédica" />
              </div>
              <div>
                <Label className="text-xs">Preço Unitário</Label>
                <CurrencyInput value={customItemPrice} onValueChange={setCustomItemPrice} className="vf-toolbar-control text-sm w-full" />
              </div>
            </>
          )}
          <div>
            <Label className="text-xs">Qtd</Label>
            <Input value={qty} onChange={(e) => setQty(Number(e.target.value) || 0)} className="vf-toolbar-control text-sm bg-input w-full" />
          </div>
          <div>
            <Label className="text-xs">Preço Unitário</Label>
            <CurrencyInput value={unitPrice} onValueChange={setUnitPrice} className="vf-toolbar-control text-sm w-full" />
          </div>
          <div className="sm:col-span-6 flex justify-end">
            <Button onClick={addItemToBudget} className="h-9 px-4 text-sm bg-[hsl(var(--vf-sales))] text-white hover:bg-[hsl(var(--vf-sales)/0.9)]">
              Adicionar item
            </Button>
          </div>
        </ToolbarRow>
      </SectionCard>

      {items.length > 0 && (
        <SectionCard
          title="Itens do orçamento"
          description="Confira o subtotal por item e o total consolidado antes de salvar."
          icon={Sparkles}
          tone="sales"
        >
          <DataTableFrame>
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
          </DataTableFrame>
          <div className="mt-3 flex items-center justify-end">
            <div className="text-sm font-semibold">Total: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(subtotal)}</div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={saveBudget} className="h-9 px-4">Salvar orçamento</Button>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Orçamentos salvos"
        description="Acompanhe status, selecione pagamento e converta propostas em venda."
        icon={FileText}
        tone="sales"
      >
        <DataTableFrame empty={budgets.length === 0}>
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
                const client = b.clientId ? clients.find(c => c.id === b.clientId) : undefined;
                const animal = b.animalId ? client?.animals.find(a => a.id === b.animalId) : undefined;
                return (
                  <TableRow key={b.id}>
                    <TableCell>{b.date}</TableCell>
                    <TableCell>{client?.name || b.clientName || "-"}</TableCell>
                    <TableCell>{animal?.name || b.animalName || "-"}</TableCell>
                    <TableCell className="capitalize">{b.status}</TableCell>
                    <TableCell>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total)}</TableCell>
                    <TableCell>
                      <Select value={pmByBudget[b.id]} onValueChange={(v) => setPmByBudget(prev => ({ ...prev, [b.id]: v }))}>
                        <SelectTrigger className="h-8 text-sm bg-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {paymentMethods.length > 0 ? paymentMethods.map(pm => (
                            <SelectItem key={pm.id} value={pm.name}>{pm.name}</SelectItem>
                          )) : (
                            <SelectItem value="none" disabled>Cadastre formas em Financeiro &gt; Formas de Pagamento</SelectItem>
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
        </DataTableFrame>
        {budgets.length === 0 && isClientsError ? (
          <p className="mt-2 text-muted-foreground">Falha ao carregar clientes do banco.</p>
        ) : null}
      </SectionCard>
    </PageShell>
  );
};

export default BudgetsPage;