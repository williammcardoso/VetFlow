import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getCatalogByType, updateCatalogItem, CatalogItem } from "@/mockData/catalog";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";

const RecommendedProductsPage: React.FC = () => {
  const [items, setItems] = React.useState<CatalogItem[]>([]);
  const refresh = () => setItems(getCatalogByType("product"));

  React.useEffect(() => {
    refresh();
  }, []);

  const toggleRecommended = (item: CatalogItem) => {
    const ok = updateCatalogItem({ ...item, recommended: !item.recommended });
    if (!ok) {
      toast.error("Falha ao atualizar recomendação.");
      return;
    }
    toast.success("Atualizado.");
    refresh();
  };

  return (
    <PageShell>
      <PageHeader
        title="Produtos Recomendados"
        description="Marque itens estratégicos para destaque em recomendações e vendas."
        icon={Star}
        module="stock"
        breadcrumb={<>Painel &gt; Estoque &gt; Produtos Recomendados</>}
      />

      <SectionCard title="Recomendação de itens" description="Controle os produtos priorizados pela equipe." icon={Star} tone="stock">
      <Card className="vf-surface-card vf-tone-stock card-hover rounded-2xl border border-border/80">
        <CardHeader className="pb-2"><CardTitle className="text-base">Produtos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Recomendado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell>{i.stockQty ?? 0}</TableCell>
                  <TableCell>{i.recommended ? "Sim" : "Não"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="h-8" onClick={() => toggleRecommended(i)}>
                      {i.recommended ? "Desmarcar" : "Marcar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </SectionCard>
    </PageShell>
  );
};

export default RecommendedProductsPage;