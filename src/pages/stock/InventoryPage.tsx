import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getCatalogByType, adjustStock } from "@/mockData/catalog";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";

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
    <PageShell>
      <PageHeader
        title="Inventário"
        description="Execute contagens e aplique correções de estoque com rastreabilidade."
        icon={ClipboardCheck}
        module="stock"
        breadcrumb={<>Painel &gt; Estoque &gt; Inventário</>}
      />

      <SectionCard title="Contagem" description="Atualize o estoque contado e aplique os ajustes necessários." icon={ClipboardCheck} tone="stock">
      <Card className="vf-surface-card vf-tone-stock card-hover rounded-2xl border border-border/80">
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
            <Button onClick={handleApply} className="h-9 bg-[hsl(var(--vf-stock))] px-4 text-white hover:bg-[hsl(var(--vf-stock)/0.9)]">Aplicar</Button>
          </div>
        </CardContent>
      </Card>
      </SectionCard>
    </PageShell>
  );
};

export default InventoryPage;