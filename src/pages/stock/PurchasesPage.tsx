import React, { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getCatalogByType, findCatalogItem, adjustStock, updateCatalogItem } from "@/lib/catalogApi";
import type { CatalogItem } from "@/mockData/catalog";
import { addFinancialTransaction } from "@/lib/financialApi";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { addPurchaseItems, getPurchaseItemsByTransactionIds, type PurchaseItem as StoredPurchaseItem } from "@/lib/purchaseItemsApi";
import { createPdfBlob, openPdf } from "@/lib/pdfExport";
import PurchaseReceiptPdfContent, { type PurchaseReceiptPurchase } from "@/components/PurchaseReceiptPdfContent";
import { formatItemQty, parseItemQty, formatDateTime } from "@/lib/utils";
import CurrencyInput from "@/components/CurrencyInput";
import { ShoppingBag, Plus, Trash2, Printer, PackageCheck, ChevronDown, ChevronRight } from "lucide-react";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";

interface CartItem {
  itemId: string;
  name: string;
  quantity: number;
  unitCost: number;
}

interface HistoryLineItem {
  name: string;
  quantity?: number;
  unitCost?: number;
  subtotal?: number;
}

interface HistoryRow {
  id: string;
  date: string;
  time?: string;
  supplier?: string;
  amount: number;
  items: HistoryLineItem[];
  itemized: boolean;
}

const currency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const iso = (d: Date) => d.toISOString().split("T")[0];

// Compras salvas antes do detalhamento por item só têm a descrição em texto
// corrido (ex.: "Compra de estoque - Fornecedor: Agrocentro: Seringa ×20,
// Agulha ×50"). Este parser recupera fornecedor + itens (nome/qtd, sem
// custo por item, que nunca foi salvo) só pra exibição do histórico antigo.
function parseLegacyDescription(description: string): { supplier?: string; items: HistoryLineItem[] } {
  const m = description.match(/^Compra de estoque(?: - Fornecedor: (.*?))?: (.*)$/s);
  if (!m) return { items: [{ name: description }] };
  const [, supplier, itemsPart] = m;
  const items = itemsPart
    .split(", ")
    .map((frag) => frag.trim())
    .filter(Boolean)
    .map((frag) => {
      const parsed = parseItemQty(frag);
      return { name: parsed.name, quantity: parsed.qty };
    });
  return { supplier: supplier || undefined, items: items.length > 0 ? items : [{ name: itemsPart }] };
}

const PERIOD_SHORTCUTS: { label: string; range: () => { from: string; to: string } }[] = [
  {
    label: "Este mês",
    range: () => {
      const n = new Date();
      return { from: iso(new Date(n.getFullYear(), n.getMonth(), 1)), to: iso(new Date(n.getFullYear(), n.getMonth() + 1, 0)) };
    },
  },
  {
    label: "Mês passado",
    range: () => {
      const n = new Date();
      return { from: iso(new Date(n.getFullYear(), n.getMonth() - 1, 1)), to: iso(new Date(n.getFullYear(), n.getMonth(), 0)) };
    },
  },
  {
    label: "Últimos 90 dias",
    range: () => {
      const n = new Date();
      const start = new Date(n);
      start.setDate(start.getDate() - 90);
      return { from: iso(start), to: iso(n) };
    },
  },
];

const PurchasesPage: React.FC = () => {
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const { transactions, refetch: refetchTransactions } = useFinancialTransactions();

  useEffect(() => {
    getCatalogByType('product').then(setProducts);
  }, []);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [unitCost, setUnitCost] = useState<number>(0);
  const [supplier, setSupplier] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);

  const [historyFrom, setHistoryFrom] = useState<string>("");
  const [historyTo, setHistoryTo] = useState<string>("");
  const [itemsByTransaction, setItemsByTransaction] = useState<Map<string, StoredPurchaseItem[]>>(new Map());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0);

  // Ao escolher o produto, traz o custo atual do catálogo como ponto de
  // partida — assim fica visível se a compra veio mais cara ou mais barata.
  useEffect(() => {
    if (!selectedItemId) return;
    const found = products.find((p) => p.id === selectedItemId);
    if (found?.cost != null) setUnitCost(found.cost);
  }, [selectedItemId, products]);

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
    setItems(prev => {
      const existing = prev.find((i) => i.itemId === found.id);
      if (existing) {
        return prev.map((i) => (i.itemId === found.id ? { ...i, quantity: i.quantity + q, unitCost: c } : i));
      }
      return [...prev, { itemId: found.id, name: found.name, quantity: q, unitCost: c }];
    });
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
    setSaving(true);
    try {
      // Estoque + custo de referência do item (útil pra comparar preço entre
      // compras/relatórios). O que alimenta o Fechamento 50/50 é o
      // lançamento de despesa abaixo (categoria "Estoque"), somado por mês —
      // não mais o custo por venda individual.
      for (const it of items) {
        await adjustStock(it.itemId, it.quantity);
        const catItem = await findCatalogItem(it.itemId);
        if (catItem && it.unitCost > 0 && catItem.cost !== it.unitCost) {
          await updateCatalogItem({ ...catItem, cost: it.unitCost });
        }
      }
      // Lançamento financeiro — é este valor (categoria "Estoque") que o
      // Fechamento Mensal 50/50 soma como custo de insumos do mês.
      const now = new Date();
      const created = await addFinancialTransaction({
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        description: `Compra de estoque${supplier ? ` - Fornecedor: ${supplier}` : ""}: ${items.map(i => formatItemQty(i.name, i.quantity)).join(', ')}`,
        type: 'expense',
        amount: subtotal,
        category: 'Estoque',
      });
      if (!created) {
        toast.error("Estoque atualizado, mas falhou ao registrar a despesa.");
        return;
      }
      // Itens estruturados (produto/qtd/custo/subtotal) — permitem detalhar e
      // imprimir a compra item a item no histórico, em vez de só o texto
      // corrido da description acima.
      await addPurchaseItems(
        created.id,
        items.map((it) => ({
          productId: it.itemId,
          productName: it.name,
          quantity: it.quantity,
          unitCost: it.unitCost,
          subtotal: it.quantity * it.unitCost,
        }))
      );
      toast.success("Compra registrada. Estoque, custo e histórico atualizados.");
      setProducts(await getCatalogByType("product"));
      setSupplier(""); setItems([]);
      await refetchTransactions();
    } finally {
      setSaving(false);
    }
  };

  const history = useMemo(() => {
    return transactions
      .filter((t) => t.type === "expense" && t.category === "Estoque")
      .filter((t) => (!historyFrom || t.date >= historyFrom) && (!historyTo || t.date <= historyTo))
      .sort((a, b) => {
        const A = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
        const B = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
        return B - A;
      });
  }, [transactions, historyFrom, historyTo]);

  // Busca os itens estruturados de todas as compras visíveis no histórico
  // de uma vez só (compras antigas simplesmente não terão nenhum item aqui,
  // e caem no fallback de parseLegacyDescription).
  useEffect(() => {
    const ids = history.map((t) => t.id);
    if (ids.length === 0) {
      setItemsByTransaction(new Map());
      return;
    }
    let cancelled = false;
    getPurchaseItemsByTransactionIds(ids).then((map) => {
      if (!cancelled) setItemsByTransaction(map);
    });
    return () => { cancelled = true; };
  }, [history]);

  const historyRows: HistoryRow[] = useMemo(() => {
    return history.map((t) => {
      const legacy = parseLegacyDescription(t.description);
      const structured = itemsByTransaction.get(t.id);
      if (structured && structured.length > 0) {
        return {
          id: t.id,
          date: t.date,
          time: t.time,
          supplier: legacy.supplier,
          amount: t.amount,
          itemized: true,
          items: structured.map((i) => ({
            name: i.productName,
            quantity: i.quantity,
            unitCost: i.unitCost,
            subtotal: i.subtotal,
          })),
        };
      }
      return {
        id: t.id,
        date: t.date,
        time: t.time,
        supplier: legacy.supplier,
        amount: t.amount,
        itemized: false,
        items: legacy.items,
      };
    });
  }, [history, itemsByTransaction]);

  const historyTotal = historyRows.reduce((s, r) => s + r.amount, 0);
  const selectedCount = historyRows.filter((r) => selectedIds.has(r.id)).length;
  const allSelected = historyRows.length > 0 && historyRows.every((r) => selectedIds.has(r.id));

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(historyRows.map((r) => r.id)));
  };

  const handleExportPdf = async () => {
    const rows = selectedCount > 0 ? historyRows.filter((r) => selectedIds.has(r.id)) : historyRows;
    if (rows.length === 0) {
      toast.error("Nenhuma compra para exportar.");
      return;
    }
    setExporting(true);
    try {
      const purchases: PurchaseReceiptPurchase[] = rows.map((r) => ({
        id: r.id,
        date: r.date,
        time: r.time,
        supplier: r.supplier,
        items: r.items,
        total: r.amount,
        itemized: r.itemized,
      }));
      const blob = await createPdfBlob(<PurchaseReceiptPdfContent purchases={purchases} />);
      await openPdf({
        blob,
        fileName: `compras_almoxarifado_${iso(new Date())}.pdf`,
        persistOptions: { folder: "purchase_receipts" },
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Compras de Estoque"
        description="Lista de compras do Almoxarifado (Agropecuária) — o custo daqui entra no Fechamento 50/50 do mês."
        icon={ShoppingBag}
        module="stock"
        breadcrumb={<>Painel &gt; Estoque &gt; Compras</>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-[hsl(var(--vf-stock))]" />
              Adicionar item
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Produto</Label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger className="h-10 bg-card">
                  <SelectValue placeholder="Selecione um produto..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Quantidade</Label>
                <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-10 bg-card" type="number" min="0" step="any" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Custo Unitário (R$)</Label>
                <CurrencyInput value={unitCost} onValueChange={setUnitCost} className="h-10" />
              </div>
            </div>
            <Button onClick={handleAddItem} className="h-10 w-full gap-2 bg-[hsl(var(--vf-stock))] text-white hover:bg-[hsl(var(--vf-stock)/0.9)]">
              <Plus className="h-4 w-4" /> Adicionar à compra
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PackageCheck className="h-4 w-4 text-[hsl(var(--vf-stock))]" />
              Itens desta compra
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Fornecedor (opcional)</Label>
              <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="h-10 bg-card" placeholder="Nome do fornecedor / almoxarifado" />
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 py-8 text-sm text-muted-foreground">
                Nenhum item adicionado ainda.
              </div>
            ) : (
              <div className="space-y-1.5">
                {items.map((it) => (
                  <div key={it.itemId} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{it.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {it.quantity} × {currency(it.unitCost)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold">
                        {currency(it.quantity * it.unitCost)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.itemId)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
              <span className="text-lg font-bold">
                {currency(subtotal)}
              </span>
            </div>
            <Button
              onClick={() => void handleSavePurchase()}
              disabled={items.length === 0 || saving}
              className="h-10 w-full bg-[hsl(var(--vf-stock))] text-white hover:bg-[hsl(var(--vf-stock)/0.9)]"
            >
              {saving ? "Salvando..." : "Salvar Compra"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <SectionCard title="Histórico de compras" description="Compras já registradas — a base do custo de insumos no Fechamento 50/50." icon={ShoppingBag} tone="stock">
        <div className="vf-surface-card vf-tone-stock card-hover mt-4 rounded-2xl border-border/80 p-4">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">De</Label>
                <Input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} className="mt-1 h-9 w-40 bg-card" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Até</Label>
                <Input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} className="mt-1 h-9 w-40 bg-card" />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {PERIOD_SHORTCUTS.map((p) => (
                  <Button
                    key={p.label}
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-lg text-xs"
                    onClick={() => { const r = p.range(); setHistoryFrom(r.from); setHistoryTo(r.to); }}
                  >
                    {p.label}
                  </Button>
                ))}
                {(historyFrom || historyTo) && (
                  <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={() => { setHistoryFrom(""); setHistoryTo(""); }}>
                    Limpar
                  </Button>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => void handleExportPdf()} disabled={exporting || historyRows.length === 0}>
              <Printer className="h-4 w-4" />
              {exporting ? "Gerando..." : selectedCount > 0 ? `Exportar selecionadas (${selectedCount})` : "Exportar PDF"}
            </Button>
          </div>

          {historyRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma compra registrada no período.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-9">
                      <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Selecionar todas" />
                    </TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRows.map((row) => {
                    const expanded = expandedIds.has(row.id);
                    return (
                      <React.Fragment key={row.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/30"
                          onClick={() => toggleExpanded(row.id)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()} className="w-9">
                            <Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => toggleSelected(row.id)} aria-label="Selecionar compra" />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDateTime(row.date, row.time)}</TableCell>
                          <TableCell className="text-sm font-medium">{row.supplier || "—"}</TableCell>
                          <TableCell className="text-sm">
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              {row.items.length} {row.items.length === 1 ? "item" : "itens"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-amber-700">
                            {currency(row.amount)}
                          </TableCell>
                        </TableRow>
                        {expanded && (
                          <TableRow>
                            <TableCell colSpan={5} className="bg-muted/20 p-0">
                              <div className="space-y-1.5 p-3">
                                {row.items.map((it, i) => (
                                  <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 text-sm">
                                    <span className="min-w-0 truncate">{it.name}</span>
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                      {it.quantity != null ? `${it.quantity}×${it.unitCost != null ? ` ${currency(it.unitCost)}` : ""}` : ""}
                                    </span>
                                    <span className="shrink-0 font-semibold">
                                      {row.itemized && it.subtotal != null ? currency(it.subtotal) : "—"}
                                    </span>
                                  </div>
                                ))}
                                {!row.itemized && (
                                  <p className="pt-1 text-xs text-muted-foreground">
                                    Compra antiga sem detalhamento de custo por item — apenas o total geral foi salvo.
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-medium text-muted-foreground">{historyRows.length} compra(s)</span>
                <span className="text-base font-bold text-amber-700">
                  Total: {currency(historyTotal)}
                </span>
              </div>
            </>
          )}
        </div>
      </SectionCard>
    </PageShell>
  );
};

export default PurchasesPage;
