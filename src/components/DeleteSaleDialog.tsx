import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { FinancialTransaction } from "@/mockData/financial";
import { getReceiptsForSale } from "@/lib/saleCancellation";
import { deleteSaleIfEligible } from "@/lib/saleDeletion";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface DeleteSaleDialogProps {
  sale: FinancialTransaction | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

const DeleteSaleDialog: React.FC<DeleteSaleDialogProps> = ({ sale, open, onClose, onDeleted }) => {
  const [checking, setChecking] = useState(false);
  const [hasReceipts, setHasReceipts] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!open || !sale) return;
    setChecking(true);
    getReceiptsForSale(sale.id).then((receipts) => {
      setHasReceipts(receipts.length > 0);
      setChecking(false);
    });
  }, [open, sale]);

  if (!sale) return null;

  const eligible = !checking && !hasReceipts;

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      const result = await deleteSaleIfEligible(sale.id);
      if (!result.success) {
        toast.error(
          result.reason === "has_receipts"
            ? "Esta venda tem recebimentos registrados e não pode ser excluída."
            : "Não foi possível excluir a venda."
        );
        return;
      }
      toast.success("Venda excluída permanentemente.");
      onDeleted();
      onClose();
    } catch {
      toast.error("Falha ao excluir venda.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !processing) onClose(); }}>
      <DialogContent className="max-w-md min-w-0">
        <DialogHeader className="min-w-0">
          <DialogTitle className="flex items-center gap-2 text-base text-red-700">
            <Trash2 className="h-4 w-4" />
            Excluir venda
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 min-w-0">
          <div className="rounded-lg bg-muted/40 p-3 text-sm">
            <div className="font-medium text-foreground truncate">{sale.description}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Total: <span className="font-semibold text-foreground">{fmt(sale.amount)}</span>
            </div>
          </div>

          {checking ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Verificando recebimentos...
            </div>
          ) : hasReceipts ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              ⚠️ Esta venda tem recebimento(s) registrado(s). Vendas com recebimentos não podem
              ser excluídas — cancele a venda em vez disso (isso gera o estorno correto).
            </div>
          ) : (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              ⚠️ Esta ação é permanente e não pode ser desfeita. A venda e seus itens serão
              excluídos definitivamente, e o estoque dos produtos vendidos será revertido.
            </div>
          )}
        </div>

        <DialogFooter className="min-w-0 flex-wrap">
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Voltar
          </Button>
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={handleConfirm}
            disabled={processing || checking || !eligible}
          >
            {processing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Excluindo...</>
            ) : (
              "Excluir permanentemente"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteSaleDialog;
