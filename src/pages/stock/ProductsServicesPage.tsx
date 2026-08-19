import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getCatalog, addCatalogItem, updateCatalogItem, removeCatalogItem, adjustStock } from "@/lib/catalogApi";
import type { CatalogItem, CatalogItemType } from "@/mockData/catalog";
import { COST_PROVIDER_PRESETS, resolveCostProvider } from "@/lib/costProviders";
import CurrencyInput from "@/components/CurrencyInput";
import { PackageSearch, FileText, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";
import PriceListPdfContent from "@/components/PriceListPdfContent";
import { createPdfBlob, openPdf } from "@/lib/pdfExport";

const SERVICE_CATEGORY_OPTIONS = [
  { value: "servico", label: "Serviço geral" },
  { value: "especialista", label: "Especialista (externo)" },
  { value: "cirurgia", label: "Cirurgia" },
  { value: "exame_interno", label: "Exame Interno" },
  { value: "exame_externo", label: "Exame Externo" },
  { value: "vacina", label: "Vacina" },
] as const;

const KNOWN_PRODUCT_CATEGORIES = new Set(["produto", "medicamento", "racao", "acessorio"]);
const KNOWN_SERVICE_CATEGORIES = new Set(SERVICE_CATEGORY_OPTIONS.map(o => o.value));

const CATEGORY_BADGE: Record<string, { label: string; color: string }> = {
  exame_externo: { label: "Exame Externo", color: "bg-blue-100 text-blue-700" },
  exame_interno: { label: "Exame Interno", color: "bg-cyan-100 text-cyan-700" },
  especialista: { label: "Especialista", color: "bg-violet-100 text-violet-700" },
  vacina: { label: "Vacina", color: "bg-green-100 text-green-700" },
  cirurgia: { label: "Cirurgia", color: "bg-red-100 text-red-700" },
  servico: { label: "Serviço", color: "bg-purple-100 text-purple-700" },
  produto: { label: "Produto", color: "bg-orange-100 text-orange-700" },
};

function defaultProviderForCategory(category: string): string {
  if (category === "exame_externo") return "Laboratório externo";
  if (category === "especialista") return "Especialista";
  return "";
}

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
  const [newCategory, setNewCategory] = useState<string>("");
  const [newCategoryCustom, setNewCategoryCustom] = useState<string>("");
  const [newCost, setNewCost] = useState<number>(0);
  const [newCostProvider, setNewCostProvider] = useState<string>("");
  const [newCostProviderCustom, setNewCostProviderCustom] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [exportCategory, setExportCategory] = useState<string>("all");

  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editCategory, setEditCategory] = useState("");
  const [editCategoryCustom, setEditCategoryCustom] = useState("");
  const [editCost, setEditCost] = useState<number>(0);
  const [editCostProvider, setEditCostProvider] = useState<string>("");
  const [editCostProviderCustom, setEditCostProviderCustom] = useState<string>("");
  const [editStockQty, setEditStockQty] = useState<string>("0");
  const [editUnit, setEditUnit] = useState("");
  const [editActive, setEditActive] = useState(true);

  const resolveProviderInput = (preset: string, custom: string) => {
    if (preset === "outro") return custom.trim() || undefined;
    return preset.trim() || undefined;
  };

  const availableCategories = React.useMemo(() => {
    const cats = new Set(items.map(i => i.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [items]);

  // Categorias digitadas via "Outro..." (produto ou serviço) que já foram
  // usadas em algum item existente — viram opção fixa no combo dali em
  // diante, ao invés de sempre cair de volta em "Outro..." e precisar
  // redigitar. Mesmo padrão usado pro analito "Outro" em exames.
  const customProductCategories = React.useMemo(
    () =>
      Array.from(
        new Set(
          items
            .filter(i => i.type === "product" && i.category && !KNOWN_PRODUCT_CATEGORIES.has(i.category))
            .map(i => i.category as string)
        )
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [items]
  );
  const customServiceCategories = React.useMemo(
    () =>
      Array.from(
        new Set(
          items
            .filter(i => i.type === "service" && i.category && !KNOWN_SERVICE_CATEGORIES.has(i.category))
            .map(i => i.category as string)
        )
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [items]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getCatalog();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredItems = useMemo(
    () => items.filter(i => i.type === activeTab),
    [items, activeTab]
  );

  const handleAddItem = async () => {
    if (!newName.trim()) {
      toast.error("Informe o nome do item.");
      return;
    }
    const costProvider = newCost > 0
      ? resolveProviderInput(newCostProvider, newCostProviderCustom)
      : undefined;
    if (newCost > 0 && !costProvider) {
      toast.error("Informe o prestador do repasse (ex.: Cardiologista, Laboratório externo).");
      return;
    }
    const created = await addCatalogItem({
      name: newName.trim(),
      type: newType,
      price: Number(newPrice) || 0,
      sku: newSKU.trim() || undefined,
      unit: newUnit.trim() || undefined,
      stockQty: newType === 'product' ? Number(newStockQty) || 0 : undefined,
      brand: undefined,
      group: undefined,
      active: true,
      category: newCategory === 'outro'
        ? (newCategoryCustom.trim() || undefined)
        : (newCategory || undefined),
      cost: newCost > 0 ? newCost : undefined,
      costProvider,
    });
    if (!created) {
      toast.error("Falha ao adicionar item.");
      return;
    }
    toast.success(`${created.type === 'product' ? 'Produto' : 'Serviço'} adicionado.`);
    setNewName("");
    setNewPrice(0);
    setNewSKU("");
    setNewUnit("");
    setNewStockQty("0");
    setNewType("product");
    setNewCategory("");
    setNewCategoryCustom("");
    setNewCost(0);
    setNewCostProvider("");
    setNewCostProviderCustom("");
    await refresh();
  };

  const handleUpdateItem = async (item: CatalogItem, field: keyof CatalogItem, value: string | number | boolean) => {
    const updated: CatalogItem = {
      ...item,
      [field]: field === 'price' ? Number(value) || 0 : value as any,
    };
    const ok = await updateCatalogItem(updated);
    if (ok) {
      await refresh();
    } else {
      toast.error("Falha ao atualizar item.");
    }
  };

  const handleAdjustStock = async (item: CatalogItem, delta: number) => {
    if (item.type !== 'product') return;
    const ok = await adjustStock(item.id, delta);
    if (ok) {
      await refresh();
      toast.success(`Estoque ${delta > 0 ? 'entrada' : 'saída'} registrada.`);
    } else {
      toast.error("Falha ao ajustar estoque.");
    }
  };

  const handleRemoveItem = async (id: string) => {
    const ok = await removeCatalogItem(id);
    if (ok) {
      await refresh();
      toast.success("Item removido.");
    } else {
      toast.error("Falha ao remover.");
    }
  };

  const openEditModal = (item: CatalogItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditPrice(item.price);
    setEditCategory(item.category || "");
    setEditCategoryCustom("");
    setEditCost(item.cost ?? 0);
    const provider = item.costProvider || "";
    const isPreset = COST_PROVIDER_PRESETS.includes(provider as (typeof COST_PROVIDER_PRESETS)[number]);
    setEditCostProvider(provider ? (isPreset ? provider : "outro") : "");
    setEditCostProviderCustom(provider && !isPreset ? provider : "");
    setEditStockQty(String(item.stockQty ?? 0));
    setEditUnit(item.unit || "");
    setEditActive(item.active);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    if (!editName.trim()) { toast.error("Informe o nome."); return; }
    const costProvider = editCost > 0
      ? resolveProviderInput(editCostProvider, editCostProviderCustom)
      : undefined;
    if (editCost > 0 && !costProvider) {
      toast.error("Informe o prestador do repasse (ex.: Cardiologista, Laboratório externo).");
      return;
    }
    const updated: CatalogItem = {
      ...editingItem,
      name: editName.trim(),
      price: editPrice,
      category: editCategory === 'outro'
        ? (editCategoryCustom.trim() || undefined)
        : (editCategory || undefined),
      cost: editCost > 0 ? editCost : undefined,
      costProvider,
      stockQty: editingItem.type === 'product' ? Number(editStockQty) || 0 : undefined,
      unit: editUnit.trim() || undefined,
      active: editActive,
    };
    const ok = await updateCatalogItem(updated);
    if (!ok) {
      toast.error("Falha ao atualizar.");
      return;
    }
    toast.success("Item atualizado.");
    setEditingItem(null);
    await refresh();
  };

  const handlePrintPriceList = async (showCosts: boolean) => {
    try {
      const filtered = exportCategory === "all"
        ? items
        : items.filter(i => i.category === exportCategory);
      const blob = await createPdfBlob(
        <PriceListPdfContent items={filtered} showCosts={showCosts} />
      );
      await openPdf({
        blob,
        fileName: showCosts ? "tabela-precos-interno.pdf" : "tabela-precos.pdf",
      });
    } catch {
      toast.error("Erro ao gerar PDF.");
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
        actions={
          <div className="flex items-center gap-2">
            <select
              value={exportCategory}
              onChange={(e) => setExportCategory(e.target.value)}
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none"
            >
              <option value="all">Todos os itens</option>
              <option value="cirurgia">Cirurgias</option>
              <option value="exame_externo">Exames Externos</option>
              <option value="exame_interno">Exames Internos</option>
              <option value="especialista">Especialistas</option>
              <option value="vacina">Vacinas</option>
              <option value="servico">Serviços Gerais</option>
              <option value="produto">Produtos</option>
              {availableCategories
                .filter(c => !['cirurgia','exame_externo','exame_interno','especialista','vacina','servico','produto'].includes(c))
                .map(c => (
                  <option key={c} value={c}>{c}</option>
                ))
              }
            </select>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              onClick={() => handlePrintPriceList(false)}
            >
              <FileText className="h-4 w-4" /> Tabela Pública
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => handlePrintPriceList(true)}
            >
              <FileText className="h-4 w-4" /> Tabela Interna
            </Button>
          </div>
        }
      />

      <SectionCard title="Cadastro rápido" description="Adicione novos itens ao catálogo." icon={PackageSearch} tone="stock">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          {/* Seletor compacto de tipo */}
          <div className="mb-5 flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tipo:
            </span>
            <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => { setNewType('product'); setNewCategory(''); }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  newType === 'product'
                    ? 'bg-white shadow-sm text-[hsl(var(--vf-stock))] border border-[hsl(var(--vf-stock)/0.3)]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                📦 Produto
              </button>
              <button
                type="button"
                onClick={() => { setNewType('service'); setNewCategory(''); }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  newType === 'service'
                    ? 'bg-white shadow-sm text-[hsl(var(--vf-stock))] border border-[hsl(var(--vf-stock)/0.3)]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🩺 Serviço
              </button>
            </div>
          </div>

          {/* Campos dinâmicos — linha única com flex wrap */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px] flex-1">
              <Label className="text-xs font-medium text-muted-foreground">Nome *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1 h-10 border border-border bg-card text-sm"
                placeholder={newType === 'product' ? 'Ex.: Ração Premium 1kg' : 'Ex.: Consulta de Rotina'}
              />
            </div>

            <div className="w-36 shrink-0">
              <Label className="text-xs font-medium text-muted-foreground">Preço (R$) *</Label>
              <CurrencyInput
                value={newPrice}
                onValueChange={setNewPrice}
                className="mt-1 h-10 border border-border bg-card text-sm w-full"
              />
            </div>

            <div className="w-44 shrink-0">
              <Label className="text-xs font-medium text-muted-foreground">Categoria</Label>
              <select
                value={newCategory}
                onChange={(e) => {
                  const cat = e.target.value;
                  setNewCategory(cat);
                  const suggested = defaultProviderForCategory(cat);
                  if (suggested && !newCostProvider) {
                    setNewCostProvider(suggested);
                  }
                }}
                className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--vf-stock)/0.3)]"
              >
                <option value="">Categoria...</option>
                {newType === 'service' ? (
                  <>
                    {SERVICE_CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                    {customServiceCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="outro">Outro...</option>
                  </>
                ) : (
                  <>
                    <option value="produto">Produto geral</option>
                    <option value="medicamento">Medicamento</option>
                    <option value="racao">Ração</option>
                    <option value="acessorio">Acessório</option>
                    {customProductCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="outro">Outro...</option>
                  </>
                )}
              </select>
              {newCategory === 'outro' && (
                <Input
                  value={newCategoryCustom}
                  onChange={(e) => setNewCategoryCustom(e.target.value)}
                  className="mt-1 h-9 border border-border bg-card text-sm"
                  placeholder="Digite a categoria..."
                  autoFocus
                />
              )}
            </div>

            {(newType === 'service' || newCategory === 'medicamento' || newCost > 0) && (
              <>
                <div className="w-36 shrink-0">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Custo / Repasse (R$)
                  </Label>
                  <CurrencyInput
                    value={newCost}
                    onValueChange={setNewCost}
                    className="mt-1 h-10 border border-border bg-card text-sm w-full"
                  />
                  {newCost > 0 && newPrice > 0 && (
                    <p className="mt-0.5 text-xs text-emerald-600 font-medium">
                      {Math.round(((newPrice - newCost) / newPrice) * 100)}% margem
                    </p>
                  )}
                </div>
                {newCost > 0 && (
                  <div className="w-48 shrink-0">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Prestador do repasse *
                    </Label>
                    <select
                      value={newCostProvider}
                      onChange={(e) => setNewCostProvider(e.target.value)}
                      className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--vf-stock)/0.3)]"
                    >
                      <option value="">Quem recebe...</option>
                      {COST_PROVIDER_PRESETS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                      <option value="outro">Outro...</option>
                    </select>
                    {newCostProvider === "outro" && (
                      <Input
                        value={newCostProviderCustom}
                        onChange={(e) => setNewCostProviderCustom(e.target.value)}
                        className="mt-1 h-9 border border-border bg-card text-sm"
                        placeholder="Nome do prestador..."
                        autoFocus
                      />
                    )}
                  </div>
                )}
              </>
            )}

            {newType === 'product' && (
              <>
                <div className="w-24 shrink-0">
                  <Label className="text-xs font-medium text-muted-foreground">Estoque</Label>
                  <Input
                    value={newStockQty}
                    onChange={(e) => setNewStockQty(e.target.value)}
                    className="mt-1 h-10 border border-border bg-card text-sm"
                    placeholder="0"
                    type="number"
                    min="0"
                  />
                </div>
                <div className="w-28 shrink-0">
                  <Label className="text-xs font-medium text-muted-foreground">Unidade</Label>
                  <Input
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="mt-1 h-10 border border-border bg-card text-sm"
                    placeholder="un, cx, frasco..."
                  />
                </div>
              </>
            )}

            <div className="shrink-0 self-end">
              <Button
                onClick={handleAddItem}
                className="h-10 px-5 bg-[hsl(var(--vf-stock))] text-white font-semibold rounded-xl shadow-md hover:bg-[hsl(var(--vf-stock)/0.9)] transition-all whitespace-nowrap"
              >
                <PackageSearch className="h-4 w-4 mr-1.5" />
                Adicionar
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Catálogo" description="Edite preços, status e estoque dos itens existentes." icon={PackageSearch} tone="stock">
        <div className="vf-surface-card vf-tone-stock card-hover mt-4 rounded-2xl border-border/80 p-4">
          <div className="mb-3 text-sm font-semibold text-foreground">Catálogo</div>
          <div className="mb-5 flex items-center gap-2">
            <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('product')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  activeTab === 'product'
                    ? 'bg-white shadow-sm text-[hsl(var(--vf-stock))] border border-[hsl(var(--vf-stock)/0.3)]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                📦 Produtos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('service')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  activeTab === 'service'
                    ? 'bg-white shadow-sm text-[hsl(var(--vf-stock))] border border-[hsl(var(--vf-stock)/0.3)]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🩺 Serviços
              </button>
            </div>
          </div>

          {activeTab === 'product' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Lucro</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="font-semibold text-sm">
                      {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(item.price)}
                    </TableCell>
                    <TableCell>
                      {item.cost != null
                        ? new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(item.cost)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const lucro = item.price - (item.cost ?? 0);
                        const pct = item.price > 0 ? Math.round((lucro / item.price) * 100) : 100;
                        const isHigh = pct >= 70;
                        return (
                          <div className="flex flex-col">
                            <span className={`font-bold text-sm ${isHigh ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(lucro)}
                            </span>
                            <span className={`text-xs ${isHigh ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {pct}% margem
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {item.category ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-orange-100 text-orange-700">
                          {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                        </span>
                      ) : <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAdjustStock(item, -1)}
                          className="h-6 w-6 rounded-md border border-border bg-muted/60 text-sm font-bold text-muted-foreground hover:border-red-300 hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center"
                        >−</button>
                        <span className={`w-8 text-center text-sm font-semibold tabular-nums ${(item.stockQty ?? 0) < 0 ? "text-red-600" : ""}`}>
                          {item.stockQty ?? 0}
                        </span>
                        <button
                          onClick={() => handleAdjustStock(item, 1)}
                          className="h-6 w-6 rounded-md border border-border bg-muted/60 text-sm font-bold text-muted-foreground hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 transition-colors flex items-center justify-center"
                        >+</button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <select
                        value={item.active ? 'true' : 'false'}
                        onChange={(e) => handleUpdateItem(item, 'active', e.target.value === 'true')}
                        className={`h-7 rounded-full border px-2.5 text-xs font-semibold transition-colors ${
                          item.active
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 bg-gray-50 text-gray-500'
                        }`}
                      >
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                      </select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-500 hover:bg-blue-50"
                          onClick={() => openEditModal(item)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                          onClick={() => handleRemoveItem(item.id)}
                          title="Remover"
                        >
                          ✕
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {activeTab === 'service' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Custo / Repasse</TableHead>
                  <TableHead>Prestador</TableHead>
                  <TableHead>Lucro</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="font-semibold text-sm">
                      {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(item.price)}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const cat = item.category ? CATEGORY_BADGE[item.category] : null;
                        if (cat) return (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cat.color}`}>
                            {cat.label}
                          </span>
                        );
                        if (item.category) return (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-600">
                            {item.category}
                          </span>
                        );
                        return <span className="text-muted-foreground text-xs">-</span>;
                      })()}
                    </TableCell>
                    <TableCell>
                      {item.cost != null
                        ? new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(item.cost)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const provider = resolveCostProvider(item.costProvider, item.category, item.cost);
                        return provider
                          ? <span className="text-xs font-medium text-amber-700">{provider}</span>
                          : <span className="text-muted-foreground text-xs">-</span>;
                      })()}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const lucro = item.price - (item.cost ?? 0);
                        const pct = item.price > 0 ? Math.round((lucro / item.price) * 100) : 100;
                        const isHigh = pct >= 70;
                        return (
                          <div className="flex flex-col">
                            <span className={`font-bold text-sm ${isHigh ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(lucro)}
                            </span>
                            <span className={`text-xs ${isHigh ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {pct}% margem
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <select
                        value={item.active ? 'true' : 'false'}
                        onChange={(e) => handleUpdateItem(item, 'active', e.target.value === 'true')}
                        className={`h-7 rounded-full border px-2.5 text-xs font-semibold transition-colors ${
                          item.active
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 bg-gray-50 text-gray-500'
                        }`}
                      >
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                      </select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-500 hover:bg-blue-50"
                          onClick={() => openEditModal(item)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                          onClick={() => handleRemoveItem(item.id)}
                          title="Remover"
                        >
                          ✕
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SectionCard>

      {/* Modal de edição */}
      <Dialog open={!!editingItem} onOpenChange={(open) => { if (!open) setEditingItem(null); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Editar {editingItem?.type === 'product' ? 'Produto' : 'Serviço'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Nome *</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 h-10 border border-border"
                placeholder="Nome do item"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Preço (R$) *</Label>
                <CurrencyInput
                  value={editPrice}
                  onValueChange={setEditPrice}
                  className="mt-1 h-10 border border-border w-full"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Categoria</Label>
                <select
                  value={editCategory}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setEditCategory(cat);
                    const suggested = defaultProviderForCategory(cat);
                    if (suggested && !editCostProvider) {
                      setEditCostProvider(suggested);
                    }
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm focus:outline-none"
                >
                  <option value="">Sem categoria</option>
                  {editingItem?.type === 'service' ? (
                    <>
                      {SERVICE_CATEGORY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                      {customServiceCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="outro">Outro...</option>
                    </>
                  ) : (
                    <>
                      <option value="produto">Produto geral</option>
                      <option value="medicamento">Medicamento</option>
                      <option value="racao">Ração</option>
                      <option value="acessorio">Acessório</option>
                      {customProductCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="outro">Outro...</option>
                    </>
                  )}
                </select>
                {editCategory === 'outro' && (
                  <Input
                    value={editCategoryCustom}
                    onChange={(e) => setEditCategoryCustom(e.target.value)}
                    className="mt-1 h-9 border border-border bg-card text-sm"
                    placeholder="Digite a categoria..."
                    autoFocus
                  />
                )}
              </div>
            </div>

            {(editingItem?.type === 'service' || editCategory === 'medicamento' || editCost > 0) && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    {editingItem?.type === "service"
                      ? "Repasse a prestador (R$)"
                      : "Custo / Repasse (R$)"}
                  </Label>
                  <CurrencyInput
                    value={editCost}
                    onValueChange={setEditCost}
                    className="mt-1 h-10 border border-border w-full"
                  />
                  {editingItem?.type === "service" && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Valor pago a laboratório/especialista externo (se houver). O custo de insumos consumidos
                      entra no Fechamento 50/50 pela Lista de Compras do Almoxarifado, não aqui.
                    </p>
                  )}
                </div>
                {editCost > 0 && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">
                      Prestador do repasse *
                    </Label>
                    <select
                      value={editCostProvider}
                      onChange={(e) => setEditCostProvider(e.target.value)}
                      className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm focus:outline-none"
                    >
                      <option value="">Quem recebe...</option>
                      {COST_PROVIDER_PRESETS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                      <option value="outro">Outro...</option>
                    </select>
                    {editCostProvider === "outro" && (
                      <Input
                        value={editCostProviderCustom}
                        onChange={(e) => setEditCostProviderCustom(e.target.value)}
                        className="mt-1 h-9 border border-border text-sm"
                        placeholder="Nome do prestador..."
                        autoFocus
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {editingItem?.type === 'product' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Estoque</Label>
                  <Input
                    value={editStockQty}
                    onChange={(e) => setEditStockQty(e.target.value)}
                    className="mt-1 h-10 border border-border"
                    type="number"
                    min="0"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Unidade</Label>
                  <Input
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="mt-1 h-10 border border-border"
                    placeholder="un, cx, frasco..."
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <Label className="text-xs font-medium text-muted-foreground">Status</Label>
              <button
                type="button"
                onClick={() => setEditActive(!editActive)}
                className={`h-7 rounded-full border px-3 text-xs font-semibold transition-colors ${
                  editActive
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 bg-gray-50 text-gray-500'
                }`}
              >
                {editActive ? 'Ativo' : 'Inativo'}
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-[hsl(var(--vf-stock))] text-white hover:bg-[hsl(var(--vf-stock)/0.9)]"
            >
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default ProductsServicesPage;
