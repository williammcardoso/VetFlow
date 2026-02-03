import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaMoneyCheckAlt, FaCalendarAlt, FaTag, FaPaw } from "react-icons/fa";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockFinancialTransactions, addMockReceipt } from "@/mockData/financial";
import { formatDateTime } from "@/lib/utils";
import { getRegistryList } from "@/mockData/registry";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ReceiptsPage = () => {
  const [paymentMethod, setPaymentMethod] = useState<string | undefined>(undefined);

  const salesList = useMemo(() => {
    return mockFinancialTransactions
      .filter(t => t.type === 'income' && t.category === 'Venda de Produtos');
  }, []);

  const pmRegistry = getRegistryList("paymentMethods");

  const [selectedSaleId, setSelectedSaleId] = useState<string | undefined>(undefined);
  const [receiptAmount, setReceiptAmount] = useState<number>(0);
  const [receiptMethodId, setReceiptMethodId] = useState<string | undefined>(undefined);

  const receipts = useMemo(() => {
    return mockFinancialTransactions
      .filter(t => t.type === 'income')
      .filter(t => !paymentMethod || (t.paymentMethod === paymentMethod))
      .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());
  }, [paymentMethod]);

  const pmList = Array.from(new Set(mockFinancialTransactions.filter(t => t.type === 'income' && t.paymentMethod).map(t => t.paymentMethod as string)));

  const totals = receipts.reduce((sum, r) => sum + (typeof r.paidAmount === 'number' && r.category === 'Venda de Produtos' ? r.paidAmount : r.amount), 0);

  const handleAddReceipt = () => {
    if (!receiptAmount || receiptAmount <= 0) {
      toast.error("Informe um valor válido para recebimento.");
      return;
    }
    const pmName = receiptMethodId ? (pmRegistry.find(pm => pm.id === receiptMethodId)?.name || undefined) : undefined;
    addMockReceipt({
      saleId: selectedSaleId,
      amount: receiptAmount,
      paymentMethod: pmName,
      description: selectedSaleId ? "Recebimento de venda" : "Recebimento",
      relatedClientId: selectedSaleId ? mockFinancialTransactions.find(t => t.id === selectedSaleId)?.relatedClientId : undefined,
      relatedAnimalId: selectedSaleId ? mockFinancialTransactions.find(t => t.id === selectedSaleId)?.relatedAnimalId : undefined,
    });
    toast.success("Recebimento registrado.");
    setSelectedSaleId(undefined);
    setReceiptAmount(0);
    setReceiptMethodId(undefined);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-gradient-to-r from-background via-card to-background p-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground group">
            <FaMoneyCheckAlt className="h-5 w-5 text-muted-foreground" /> Recebimentos
          </h1>
          <Link to="/sales/my-sales">
            <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground">
              <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Vendas
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">Painel &gt; Vendas &gt; Recebimentos</p>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Forma de Pagamento</label>
          <Select onValueChange={setPaymentMethod} value={paymentMethod}>
            <SelectTrigger className="h-9 bg-input">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={undefined as any}>Todas</SelectItem>
              {pmList.map(pm => <SelectItem key={pm} value={pm}>{pm}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="lg:col-span-3">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Novo Recebimento</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Venda relacionada (opcional)</label>
                <Select onValueChange={setSelectedSaleId} value={selectedSaleId}>
                  <SelectTrigger className="h-9 bg-input">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={undefined as any}>Nenhuma</SelectItem>
                    {salesList.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.description} • R$ {s.amount.toFixed(2).replace('.', ',')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Valor</label>
                <Input type="number" min="0" step="0.01" value={receiptAmount} onChange={(e) => setReceiptAmount(parseFloat(e.target.value) || 0)} className="h-9 bg-input" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Forma de Pagamento</label>
                <Select onValueChange={setReceiptMethodId} value={receiptMethodId}>
                  <SelectTrigger className="h-9 bg-input">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {pmRegistry.length > 0 ? pmRegistry.map(pm => (
                      <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                    )) : (
                      <SelectItem value="none" disabled>Cadastre formas em Vendas &gt; Formas de Recebimento</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Button onClick={handleAddReceipt} className="h-9 px-4">Registrar</Button>
              </div>
              <div className="md:col-span-5 text-sm bg-muted px-3 py-2 rounded-md">
                Total Recebido (lista): {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totals)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="p-6">
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Lista de Recebimentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {receipts.map(rec => (
              <Card key={rec.id} className="p-4 bg-card border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">Receita</span>
                    <span className="text-sm">{rec.description}</span>
                  </div>
                  <div className="text-sm font-semibold text-green-600">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                      rec.category === 'Venda de Produtos' && typeof rec.paidAmount === 'number' ? rec.paidAmount : rec.amount
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1"><FaCalendarAlt className="h-3 w-3" /> {formatDateTime(rec.date, rec.time)}</div>
                  <div className="flex items-center gap-1"><FaTag className="h-3 w-3" /> Pagamento: {rec.paymentMethod || "N/A"}</div>
                  <div className="flex items-center gap-1"><FaTag className="h-3 w-3" /> Categoria: {rec.category}</div>
                </div>
                {rec.relatedClientId && rec.relatedAnimalId && (
                  <div className="mt-2">
                    <Link to={`/clients/${rec.relatedClientId}/animals/${rec.relatedAnimalId}/record`}>
                      <Button variant="outline" size="sm">Abrir Prontuário</Button>
                    </Link>
                  </div>
                )}
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReceiptsPage;