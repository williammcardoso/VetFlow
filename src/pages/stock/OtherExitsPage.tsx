import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getCatalogByType, findCatalogItem, adjustStock } from "@/mockData/catalog";
import { addMockFinancialTransaction } from "@/mockData/financial";
import { PackageMinus } from "lucide-react";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";

const OtherExitsPage: React.FC = () => {
  const products = useMemo(() => getCatalogByType('product'), []);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [reason, setReason] = useState<string>("");
  const [recordExpense, setRecordExpense] = useState<boolean>(false);

  const handleSaveExit = () => {
    if (!selectedItemId) {
      toast.error("Selecione um produto.");
      return;
    }
    const q = Number(quantity) || 0;
    if (q <= 0) {
      toast.error("Quantidade deve ser > 0.");
      return;
    }
    const item = findCatalogItem(selectedItemId);
    if (!item) {
      toast.error("Produto não encontrado.");
      return;
    }
    const ok = adjustStock(item.id, -q);
    if (!ok) {
      toast.error("Falha ao ajustar estoque.");
      return;
    }
    if (recordExpense) {
      const now = new Date();
      addMockFinancialTransaction({
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        description: `Saída de estoque: ${item.name} x${q}${reason ? ` (${reason})` : ""}`,
        type: 'expense',
        amount: 0, // Sem valor financeiro obrigatório aqui
        category: 'Estoque - Perdas',
      });
    }
    toast.success("Saída de estoque registrada.");
    setSelectedItemId(""); setQuantity("1"); setReason(""); setRecordExpense(false);
  };

  return (
    <PageShell>
      <PageHeader
        title="Outras Saídas de Estoque"
        description="Registre perdas, vencimentos e ajustes manuais de estoque."
        icon={PackageMinus}
        module="stock"
        breadcrumb={<>Painel &gt; Estoque &gt; Outras Saídas</>}
      />

      <SectionCard title="Registrar saída" description="Defina item, quantidade e motivo da baixa." icon={PackageMinus} tone="stock">
      <Card className="vf-surface-card vf-tone-stock card-hover rounded-2xl border border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Nova Saída</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
          <div className="sm:col-span-2">
            <Label className="text-xs">Produto</Label>
            <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className="h-8 text-sm bg-input rounded-md border-border w-full">
              <option value="">Selecione...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Quantidade</Label>
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-8 text-sm bg-input" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={recordExpense} onChange={(e) => setRecordExpense(e.target.checked)} />
            <Label className="text-xs">Lançar despesa</Label>
          </div>
          <div className="sm:col-span-4">
            <Label className="text-xs">Motivo (opcional)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} className="h-8 text-sm bg-input" placeholder="Ex.: Vencimento, avaria..." />
          </div>
          <div className="sm:col-span-4 flex justify-end">
            <Button onClick={handleSaveExit} className="h-9 bg-[hsl(var(--vf-stock))] px-4 text-white hover:bg-[hsl(var(--vf-stock)/0.9)]">Salvar Saída</Button>
          </div>
        </CardContent>
      </Card>
      </SectionCard>
    </PageShell>
  );
};

export default OtherExitsPage;