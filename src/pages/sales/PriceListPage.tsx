import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { getCatalog } from "@/lib/catalogApi";
import type { CatalogItem, CatalogItemType } from "@/mockData/catalog";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";
import PriceListPdfContent from "@/components/PriceListPdfContent";
import { createPdfBlob, openPdf } from "@/lib/pdfExport";
import { Tag, Search, FileText, ArrowLeft, Package, Stethoscope } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  cirurgia: "Cirurgia",
  exame_externo: "Exame Externo",
  exame_interno: "Exame Interno",
  vacina: "Vacina",
  servico: "Serviço Geral",
  produto: "Produto Geral",
  medicamento: "Medicamento",
  racao: "Ração",
  acessorio: "Acessório",
};

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const PriceListPage: React.FC = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<CatalogItemType | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    getCatalog().then((data) => {
      setItems(data.filter((i) => i.active));
      setLoading(false);
    });
  }, []);

  const availableCategories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category).filter(Boolean) as string[]);
    return Array.from(cats).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [items]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items
      .filter((i) => typeFilter === "all" || i.type === typeFilter)
      .filter((i) => categoryFilter === "all" || i.category === categoryFilter)
      .filter((i) => !term || i.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b, "pt-BR"));
  }, [items, typeFilter, categoryFilter, search]);

  const handlePrint = async (showCosts: boolean) => {
    if (filteredItems.length === 0) {
      toast.error("Nenhum item para exportar com os filtros atuais.");
      return;
    }
    try {
      const blob = await createPdfBlob(
        <PriceListPdfContent items={filteredItems} showCosts={showCosts} />
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
        title="Lista de Preços"
        description="Consulte, filtre e exporte a tabela de preços de produtos e serviços."
        icon={Tag}
        module="sales"
        breadcrumb={<>Painel &gt; Vendas &gt; Lista de Preços</>}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/sales/my-sales">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => handlePrint(false)}>
              <FileText className="h-4 w-4" /> Tabela Pública
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => handlePrint(true)}
            >
              <FileText className="h-4 w-4" /> Tabela Interna
            </Button>
          </div>
        }
      />

      <SectionCard title="Filtros" description="Busque por nome, tipo ou categoria." icon={Search} tone="sales">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="text-xs font-medium text-muted-foreground">Buscar por nome</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ex.: Consulta, Ração..."
              className="mt-1 h-10 border border-border bg-card text-sm"
            />
          </div>
          <div className="w-44 shrink-0">
            <label className="text-xs font-medium text-muted-foreground">Tipo</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as CatalogItemType | "all")}
              className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--vf-sales)/0.3)]"
            >
              <option value="all">Todos os tipos</option>
              <option value="product">Produtos</option>
              <option value="service">Serviços</option>
            </select>
          </div>
          <div className="w-52 shrink-0">
            <label className="text-xs font-medium text-muted-foreground">Categoria</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--vf-sales)/0.3)]"
            >
              <option value="all">Todas as categorias</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
              ))}
            </select>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Itens"
        description={`${filteredItems.length} item(ns) encontrado(s).`}
        icon={Tag}
        tone="sales"
      >
        <div className="vf-surface-card vf-tone-sales rounded-2xl border-border/80 p-4">
          {loading ? (
            <p className="text-muted-foreground py-4">Carregando...</p>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              Nenhum item encontrado com os filtros atuais.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        {item.type === "product" ? (
                          <Package className="h-3.5 w-3.5" />
                        ) : (
                          <Stethoscope className="h-3.5 w-3.5" />
                        )}
                        {item.type === "product" ? "Produto" : "Serviço"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.category ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[hsl(var(--vf-sales)/0.1)] text-[hsl(var(--vf-sales))]">
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-[hsl(var(--vf-sales))]">
                      {fmt(item.price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SectionCard>
    </PageShell>
  );
};

export default PriceListPage;
