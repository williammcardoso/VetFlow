import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getCatalogByType, adjustStock } from "@/mockData/catalog";
import { toast } from "sonner";

const InventoryPage: React.FC = () => {
  const products = React.useMemo(() => getCatalogByType("product"), []);
  const [counts, setCounts] = React.useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    products.forEach(p => { initial[p.id] = p.stockQty || 0; });
    return initial;
  });

  const handleChange = (id: string, val: number) => {
    setCounts(prev => ({ ...prev, [id]: val }));
  };

  const handleApply = () => {
    products.forEach(p => {
      const current = p.stockQty || 0;
      const newCount = counts[p.id] ?? current;
      const delta = newCount - current;
      if (delta !== 0) {
        adjustStock(p.id, delta);
      }
    });
    toast.success("Inventário aplicado com sucesso.");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background p-4 sm:p-6">
      <div className="mb-3">
        <h1 className="text-xl sm:text-2xl font-semibold">Inventário</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Conte e ajuste os produtos de forma rápida.</p>
      </div>

      <Card className="border border-border">
        <CardHeader className="pb-2"><CardTitle className="text-base">Contagem</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Atual</TableHead>
                <TableHead>Contado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.stockQty ?? 0}</TableCell>
                  <TableCell>
                    <Input
                      value={counts[p.id] ?? (p.stockQty || 0)}
                      onChange={(e) => handleChange(p.id, Number(e.target.value) || 0)}
                      className="h-8 text-sm bg-input w-24"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end mt-3">
            <Button onClick={handleApply} className="h-9 px-4">Aplicar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryPage;