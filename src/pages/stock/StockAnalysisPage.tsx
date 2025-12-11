import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { getCatalogByType } from "@/mockData/catalog";

const StockAnalysisPage: React.FC = () => {
  const [threshold, setThreshold] = React.useState<number>(5);

  const products = React.useMemo(() => getCatalogByType("product"), []);
  const totalItems = products.length;
  const totalQty = products.reduce((sum, p) => sum + (p.stockQty || 0), 0);
  const totalValue = products.reduce((sum, p) => sum + (p.stockQty || 0) * (p.price || 0), 0);
  const lowStock = products.filter(p => (p.stockQty || 0) <= threshold);

  return (
    <div className="flex flex-col min-h-screen bg-background p-4 sm:p-6">
      <div className="mb-3">
        <h1 className="text-xl sm:text-2xl font-semibold">Análise de Estoque</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Métricas rápidas e itens com baixo estoque.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Produtos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalItems}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Quantidade total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalQty}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Valor do estoque</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValue)}</div></CardContent>
        </Card>
      </div>

      <Card className="border border-border">
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStock.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.stockQty ?? 0}</TableCell>
                  <TableCell>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.price)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {lowStock.length === 0 && <p className="text-muted-foreground mt-2">Nenhum item no limite atual.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockAnalysisPage;