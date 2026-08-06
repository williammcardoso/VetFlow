import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { FinancialTransaction } from "@/mockData/financial";
import { getSaleItems, SaleItem } from "@/lib/saleItemsApi";
import { getReceiptsForSale, cancelSaleWithReversal } from "@/lib/saleCancellation";
import SaleCancellationPdfContent from "@/components/SaleCancellationPdfContent";
import { createPdfBlob, openPdf } from "@/lib/pdfExport";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface CancelSaleDialogProps {
  sale: FinancialTransaction | null;
  open: boolean;
  onClose: () => void;
  onCancelled: () => void;
  clientName?: string;
  clientPhone?: string;
  animalName?: string;
}

const CancelSaleDialog: React.FC<CancelSaleDialogProps> = ({
  sale, open, onClose, onCancelled, clientName, clientPhone, animalName,
}) => {
  const [reason, setReason] = useState("");
  const [receipts, setReceipts] = useState<FinancialTransaction[]>([]);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!open || !sale) return;
    setReason("");
    setLoadingInfo(true);
    Promise.all([getReceiptsForSale(sale.id), getSaleItems(sale.id)]).then(
      ([receiptsData, itemsData]) => {
        setReceipts(receiptsData.filter((r) => r.amount > 0));
        setItems(itemsData);
        setLoadingInfo(false);
      }
    );
  }, [open, sale]);

  if (!sale) return null;

  const receiptsTotal = receipts.reduce((s, r) => s + r.amount, 0);
  const productItems = items.filter((i) => i.type === "product");

  const handleConfirm = async () => {
    if (!reason.trim()) {
      toast.error("Informe o motivo do cancelamento.");
      return;
    }
    setProcessing(true);
    try {
      const result = await cancelSaleWithReversal({ saleId: sale.id, reason: reason.trim() });
      if (!result) {
        toast.error("Não foi possível cancelar a venda.");
        return;
      }
      toast.success(
        result.reversedReceiptsCount > 0
          ? `Venda cancelada. ${fmt(result.reversedReceiptsTotal)} estornado(s) em ${result.reversedReceiptsCount} recebimento(s).`
          : "Venda cancelada."
      );

      try {
        const blob = await createPdfBlob(
          <SaleCancellationPdfContent
            transaction={{
              ...sale,
              status: "cancelled",
              cancelReason: reason.trim(),
              cancelledAt: new Date().toISOString(),
            }}
            items={items}
            reversedAmount={result.reversedReceiptsTotal}
            clientName={clientName}
            clientPhone={clientPhone}
            animalName={animalName}
          />
        );
        await openPdf({
          blob,
          fileName: `estorno-${sale.id.slice(-8)}.pdf`,
        });
      } catch {
        toast.error("Venda cancelada, mas houve falha ao gerar o comprovante de estorno.");
      }

      onCancelled();
      onClose();
    } catch {
      toast.error("Falha ao cancelar venda.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !processing) onClose(); }}>
      <DialogContent className="max-w-lg min-w-0">
        <DialogHeader className="min-w-0">
          <DialogTitle className="flex items-center gap-2 text-base text-red-700">
            <AlertTriangle className="h-4 w-4" />
            Cancelar venda
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 min-w-0">
          <div className="rounded-lg bg-muted/40 p-3 text-sm">
            <div className="font-medium text-foreground truncate">{sale.description}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Total: <span className="font-semibold text-foreground">{fmt(sale.amount)}</span>
            </div>
          </div>

          {loadingInfo ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Verificando recebimentos e itens...
            </div>
          ) : (
            <>
              {receipts.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  ⚠️ Esta venda tem <strong>{receipts.length}</strong> recebimento(s) registrado(s),
                  totalizando <strong>{fmt(receiptsTotal)}</strong>. Ao confirmar, será gerado um
                  estorno (lançamento negativo) automático para cada um.
                </div>
              )}
              {productItems.length > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                  📦 {productItems.length} produto(s) desta venda terão o estoque revertido
                  automaticamente.
                </div>
              )}
            </>
          )}

          <div>
            <Label className="text-xs text-muted-foreground">Motivo do cancelamento *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo do cancelamento/estorno..."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="min-w-0 flex-wrap">
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Voltar
          </Button>
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={handleConfirm}
            disabled={processing || loadingInfo}
          >
            {processing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cancelando...</>
            ) : (
              "Confirmar cancelamento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelSaleDialog;
