import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getCatalogByType, updateCatalogItem, CatalogItem } from "@/mockData/catalog";
import { toast } from "sonner";

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
    <div className="flex flex-col min-h-screen bg-background p-4 sm:p-6">
      <div className="mb-3">
        <h1 className="text-xl sm:text-2xl font-semibold">Produtos Recomendados</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Marque itens para destacar em sugestões.</p>
      </div>

      <Card className="border border-border">
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
    </div>
  );
};

export default RecommendedProductsPage;