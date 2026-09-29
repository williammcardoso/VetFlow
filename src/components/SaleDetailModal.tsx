import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSaleItems, SaleItem } from "@/lib/saleItemsApi";
import { listReceiptsForSale } from "@/lib/financialApi";
import type { FinancialTransaction } from "@/mockData/financial";
import { Package, Stethoscope, Loader2, Printer, MoreHorizontal, ClipboardList, Undo2 } from "lucide-react";
import SaleReceiptPdfContent from "@/components/SaleReceiptPdfContent";
import SaleCancellationPdfContent from "@/components/SaleCancellationPdfContent";
import { SaleStatusBadge } from "@/components/sales/SaleStatusBadge";
import { paymentMethodIcon } from "@/components/sales/PaymentChoice";
import { createPdfBlob, openPdf } from "@/lib/pdfExport";
import { getReversedAmountForSale } from "@/lib/saleCancellation";
import { groupRepassesByProvider, resolveCostProvider } from "@/lib/costProviders";
import { catalogCategoryLabel } from "@/lib/catalogCategories";
import { saleBalance } from "@/lib/salePayment";
import { cn, formatCurrencyBRL, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { getPatientRecordPath } from "@/utils/patientDisplayId";

interface SaleDetailModalProps {
  transaction: FinancialTransaction | null;
  open: boolean;
  onClose: () => void;
  onRequestCancel?: (sale: FinancialTransaction) => void;
  onRequestDelete?: (sale: FinancialTransaction) => void;
  /**
   * "Receber" — a tela que abriu o detalhe fecha este modal e abre o
   * ReceivePaymentDialog (nunca dois Dialogs abertos um dentro do outro).
   */
  onRequestReceive?: (sale: FinancialTransaction) => void;
  clientName?: string;
  clientPhone?: string;
  clientAddress?: string;
  animalName?: string;
  animalSpecies?: string;
  animalBreed?: string;
  animalAge?: string;
  animalPatientCode?: number;
}

const fmt = formatCurrencyBRL;

const SaleDetailModal: React.FC<SaleDetailModalProps> = (props) => {
  const {
    transaction, open, onClose, onRequestCancel, onRequestDelete, onRequestReceive,
    clientName, clientPhone, clientAddress,
    animalName, animalSpecies, animalBreed, animalAge, animalPatientCode,
  } = props;
  const [items, setItems] = useState<SaleItem[]>([]);
  const [receipts, setReceipts] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printingCancellation, setPrintingCancellation] = useState(false);

  useEffect(() => {
    if (!open || !transaction) return;
    let stale = false;
    setLoading(true);
    Promise.all([getSaleItems(transaction.id), listReceiptsForSale(transaction.id)]).then(([saleItems, saleReceipts]) => {
      if (stale) return;
      setItems(saleItems);
      setReceipts(saleReceipts);
      setLoading(false);
    });
    return () => {
      stale = true;
    };
  }, [open, transaction]);

  const handlePrintCancellation = async () => {
    if (!transaction) return;
    setPrintingCancellation(true);
    try {
      const reversedAmount = await getReversedAmountForSale(transaction.id);
      const blob = await createPdfBlob(
        <SaleCancellationPdfContent
          transaction={transaction}
          items={items}
          reversedAmount={reversedAmount}
          clientName={clientName}
          clientPhone={clientPhone}
          animalName={animalName}
        />
      );
      await openPdf({ blob, fileName: `estorno-${transaction.id.slice(-8)}.pdf` });
    } catch {
      toast.error("Erro ao gerar comprovante de estorno.");
    } finally {
      setPrintingCancellation(false);
    }
  };

  const handlePrint = async (mode: "client" | "internal") => {
    if (!transaction) return;
    setPrinting(true);
    try {
      const blob = await createPdfBlob(
        <SaleReceiptPdfContent
          transaction={transaction}
          items={items}
          mode={mode}
          clientName={clientName}
          clientPhone={clientPhone}
          clientAddress={clientAddress}
          animalName={animalName}
          animalSpecies={animalSpecies}
          animalBreed={animalBreed}
          animalAge={animalAge}
        />
      );
      await openPdf({
        blob,
        fileName: mode === "client"
          ? `comprovante-${transaction.id.slice(-8)}.pdf`
          : `relatorio-venda-${transaction.id.slice(-8)}.pdf`,
      });
    } catch {
      toast.error("Erro ao gerar o PDF.");
    } finally {
      setPrinting(false);
    }
  };

  if (!transaction) return null;

  const cancelled = (transaction.status || "pending") === "cancelled";
  const balance = saleBalance(transaction);
  const totalCost = items.reduce((s, i) => s + i.cost * i.quantity, 0);
  const lucro = transaction.amount - totalCost;
  const margem = transaction.amount > 0 ? Math.round((lucro / transaction.amount) * 100) : 0;
  const repassesByProvider = groupRepassesByProvider(items);
  const methods = transaction.paymentMethod
    ? [transaction.paymentMethod]
    : Array.from(new Set(receipts.filter((r) => r.amount > 0 && r.paymentMethod).map((r) => r.paymentMethod as string)));
  const canDelete = (transaction.paidAmount || 0) === 0 && !cancelled;
  const who = [clientName, animalName && `(${animalName})`].filter(Boolean).join(" ");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* min-w-0: DialogContent é grid; sem isso conteúdo sem quebra estoura a largura. */}
      <DialogContent className="max-h-[90vh] w-[95vw] min-w-0 max-w-2xl overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Venda</DialogTitle>
          <DialogDescription>{who || "Venda sem cliente"}</DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-5">
          {/* Resumo */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className={cn("text-3xl font-semibold tabular-nums tracking-tight text-foreground", cancelled && "text-muted-foreground line-through")}>
                {fmt(transaction.amount)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDateTime(transaction.date, transaction.time)}
                {methods.length > 0 && ` · ${methods.join(" + ")}`}
                {transaction.paymentInstallments && transaction.paymentInstallments > 1
                  ? ` · ${transaction.paymentInstallments}x de ${fmt(transaction.amount / transaction.paymentInstallments)}`
                  : ""}
                {transaction.responsible && ` · ${transaction.responsible}`}
              </p>
            </div>
            <SaleStatusBadge sale={transaction} className="text-sm" />
          </div>

          {cancelled && (
            <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Venda cancelada
              {transaction.cancelledAt && ` em ${formatDateTime(transaction.cancelledAt.slice(0, 10))}`}
              {transaction.cancelReason && <> — motivo: <span className="text-foreground">{transaction.cancelReason}</span></>}
            </div>
          )}

          {!cancelled && (transaction.paidAmount || 0) > 0 && balance > 0 && (
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border text-sm">
              <div className="bg-card px-3 py-2">
                <p className="text-xs text-muted-foreground">Recebido</p>
                <p className="font-semibold tabular-nums">{fmt(transaction.paidAmount || 0)}</p>
              </div>
              <div className="bg-card px-3 py-2">
                <p className="text-xs text-muted-foreground">Falta receber</p>
                <p className="font-semibold tabular-nums text-amber-800">{fmt(balance)}</p>
              </div>
            </div>
          )}

          {/* Itens */}
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Itens</h3>
            {loading ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando itens...
              </div>
            ) : items.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-border">
                <ul className="divide-y divide-border/70">
                  {items.map((item) => {
                    const provider = item.cost > 0 ? resolveCostProvider(item.costProvider, item.category, item.cost) : undefined;
                    const Icon = item.type === "product" ? Package : Stethoscope;
                    return (
                      <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} × {fmt(item.unitPrice)}
                            {item.category && ` · ${catalogCategoryLabel(item.category)}`}
                            {provider && ` · repasse ${fmt(item.cost * item.quantity)} → ${provider}`}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold tabular-nums">{fmt(item.subtotal)}</p>
                      </li>
                    );
                  })}
                </ul>
                {/* Interno (não sai no comprovante do cliente): quanto sobra depois dos repasses. */}
                {totalCost > 0 && (
                  <div className="space-y-1 border-t border-border bg-muted/30 px-3 py-2 text-xs">
                    {repassesByProvider.map((row) => (
                      <div key={row.provider} className="flex justify-between text-muted-foreground">
                        <span>Repasse → {row.provider}</span>
                        <span className="tabular-nums">− {fmt(row.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-medium text-foreground">
                      <span>Lucro estimado ({margem}%)</span>
                      <span className="tabular-nums">{fmt(lucro)}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">
                Itens detalhados não disponíveis (venda anterior ao registro de itens).
              </p>
            )}
          </section>

          {/* Pagamentos desta venda */}
          {!loading && receipts.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Pagamentos</h3>
              <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border">
                {receipts.map((r) => {
                  const reversal = r.amount < 0;
                  const Icon = reversal ? Undo2 : paymentMethodIcon({ name: r.paymentMethod || "" });
                  return (
                    <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="font-medium text-foreground">{reversal ? "Estorno" : r.paymentMethod || "Pagamento"}</span>
                        <span className="text-muted-foreground"> · {formatDateTime(r.date, r.time)}</span>
                      </span>
                      <span className={cn("shrink-0 font-semibold tabular-nums", reversal && "text-red-700")}>
                        {reversal ? `− ${fmt(Math.abs(r.amount))}` : fmt(r.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Ações — flex-wrap: em telas menores quebram em vez de vazar pela direita. */}
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <div>
              {transaction.relatedClientId && transaction.relatedAnimalId && (
                <Button asChild variant="ghost" size="sm" className="h-9">
                  <Link
                    to={getPatientRecordPath(transaction.relatedClientId, transaction.relatedAnimalId, animalPatientCode)}
                    onClick={onClose}
                  >
                    <ClipboardList className="mr-1.5 h-4 w-4" /> Prontuário
                  </Link>
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="h-9" onClick={() => void handlePrint("client")} disabled={printing || loading}>
                <Printer className="mr-1.5 h-4 w-4" />
                {printing ? "Gerando..." : "Comprovante"}
              </Button>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Mais ações da venda">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled={printing || loading} onClick={() => void handlePrint("internal")}>
                    Relatório interno (com repasses)
                  </DropdownMenuItem>
                  {cancelled ? (
                    <DropdownMenuItem disabled={printingCancellation} onClick={() => void handlePrintCancellation()}>
                      {printingCancellation ? "Gerando..." : "Comprovante de estorno"}
                    </DropdownMenuItem>
                  ) : (
                    onRequestCancel && (
                      <DropdownMenuItem className="text-red-700 focus:text-red-700" onClick={() => onRequestCancel(transaction)}>
                        Cancelar venda
                      </DropdownMenuItem>
                    )
                  )}
                  {canDelete && onRequestDelete && (
                    <DropdownMenuItem className="text-red-700 focus:text-red-700" onClick={() => onRequestDelete(transaction)}>
                      Excluir venda
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              {balance > 0 && (
                onRequestReceive ? (
                  <Button size="sm" className="h-9 font-semibold" onClick={() => onRequestReceive(transaction)}>
                    Receber {fmt(balance)}
                  </Button>
                ) : (
                  <Button asChild size="sm" className="h-9 font-semibold">
                    <Link to={`/sales/receipts?saleId=${transaction.id}`} onClick={onClose}>
                      Receber {fmt(balance)}
                    </Link>
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaleDetailModal;
