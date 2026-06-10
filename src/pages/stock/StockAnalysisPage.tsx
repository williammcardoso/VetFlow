import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { getCatalogByType } from "@/mockData/catalog";
import { AlertTriangle, BarChart3, Boxes, PackageSearch, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";

const StockAnalysisPage: React.FC = () => {
  const [threshold, setThreshold] = React.useState<number>(5);

  const products = React.useMemo(() => getCatalogByType("product"), []);
  const totalItems = products.length;
  const totalQty = products.reduce((sum, p) => sum + (p.stockQty || 0), 0);
  const totalValue = products.reduce((sum, p) => sum + (p.stockQty || 0) * (p.price || 0), 0);
  const lowStock = products.filter(p => (p.stockQty || 0) <= threshold);

  return (
    <PageShell>
      <PageHeader
        title="Análise de Estoque"
        description="Acompanhe indicadores de volume, valor e riscos de ruptura."
        icon={BarChart3}
        module="stock"
        breadcrumb={<>Painel &gt; Estoque &gt; Análise</>}
      />

      <SectionCard title="Indicadores gerais" description="Visão rápida da saúde do estoque." icon={BarChart3} tone="stock">
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="vf-surface-card vf-tone-stock card-hover rounded-xl border-border/80">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Boxes className="h-4 w-4 text-vf-stock" /> Produtos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-vf-stock">{totalItems}</div></CardContent>
        </Card>
        <Card className="vf-surface-card vf-tone-stock card-hover rounded-xl border-border/80">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><PackageSearch className="h-4 w-4 text-vf-stock" /> Quantidade total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-vf-stock">{totalQty}</div></CardContent>
        </Card>
        <Card className="vf-surface-card vf-tone-stock card-hover rounded-xl border-border/80">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4 text-vf-stock" /> Valor do estoque</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-vf-stock">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValue)}</div></CardContent>
        </Card>
      </div>
      </SectionCard>

      <SectionCard title="Itens críticos" description="Produtos abaixo do limite de estoque configurado." icon={BarChart3} tone="stock">
      <Card className="vf-surface-card vf-tone-stock card-hover rounded-2xl border border-border/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Baixo estoque</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">Limite:</span>
            <Input value={threshold} onChange={(e) => setThreshold(Number(e.target.value) || 0)} className="h-8 text-sm bg-input w-20" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStock.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.stockQty ?? 0}</TableCell>
                  <TableCell>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.price)}</TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-amber-100 text-amber-800">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Crítico
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {lowStock.length === 0 && <p className="text-muted-foreground mt-2">Nenhum item no limite atual.</p>}
        </CardContent>
      </Card>
      </SectionCard>
    </PageShell>
  );
};

export default StockAnalysisPage;