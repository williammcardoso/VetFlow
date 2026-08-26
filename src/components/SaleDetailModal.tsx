import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getSaleItems, SaleItem } from "@/lib/saleItemsApi";
import type { FinancialTransaction } from "@/mockData/financial";
import { Banknote, Package, Stethoscope, Loader2, Printer, Ban, Trash2 } from "lucide-react";
import SaleReceiptPdfContent from "@/components/SaleReceiptPdfContent";
import SaleCancellationPdfContent from "@/components/SaleCancellationPdfContent";
import { createPdfBlob, openPdf } from "@/lib/pdfExport";
import { getReversedAmountForSale } from "@/lib/saleCancellation";
import { groupRepassesByProvider, resolveCostProvider } from "@/lib/costProviders";
import { toast } from "sonner";
import { getPatientRecordPath } from "@/utils/patientDisplayId";

interface SaleDetailModalProps {
  transaction: FinancialTransaction | null;
  open: boolean;
  onClose: () => void;
  onRequestCancel?: (sale: FinancialTransaction) => void;
  onRequestDelete?: (sale: FinancialTransaction) => void;
  clientName?: string;
  clientPhone?: string;
  clientAddress?: string;
  animalName?: string;
  animalSpecies?: string;
  animalBreed?: string;
  animalAge?: string;
  animalPatientCode?: number;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const CATEGORY_LABELS: Record<string, string> = {
  cirurgia: "Cirurgia",
  exame_externo: "Exame Externo",
  exame_interno: "Exame Interno",
  especialista: "Especialista",
  vacina: "Vacina",
  servico: "Serviço",
  produto: "Produto",
  medicamento: "Medicamento",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  paid:      { label: "Pago",      className: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  partial:   { label: "Parcial",   className: "bg-blue-100 text-blue-700 border border-blue-200" },
  pending:   { label: "Pendente",  className: "bg-amber-100 text-amber-700 border border-amber-200" },
  cancelled: { label: "Cancelado", className: "bg-red-100 text-red-700 border border-red-200" },
};

const SaleDetailModal: React.FC<SaleDetailModalProps> = (props) => {
  const {
    transaction, open, onClose, onRequestCancel, onRequestDelete,
    clientName, clientPhone, clientAddress,
    animalName, animalSpecies, animalBreed, animalAge, animalPatientCode,
  } = props;
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printingCancellation, setPrintingCancellation] = useState(false);

  useEffect(() => {
    if (!open || !transaction) return;
    setLoading(true);
    getSaleItems(transaction.id).then((data) => {
      setItems(data);
      setLoading(false);
    });
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
      console.error("Erro ao gerar PDF");
    } finally {
      setPrinting(false);
    }
  };

  if (!transaction) return null;

  const st = statusConfig[transaction.status || "pending"] || statusConfig.pending;
  const saldo = Math.max(0, transaction.amount - (transaction.paidAmount || 0));
  const totalCost = items.reduce((s, i) => s + i.cost * i.quantity, 0);
  const lucro = transaction.amount - totalCost;
  const margem = transaction.amount > 0
    ? Math.round((lucro / transaction.amount) * 100)
    : 0;
  const hasItems = items.length > 0;
  const repassesByProvider = groupRepassesByProvider(items);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* min-w-0: DialogContent é grid; sem isso o conteúdo sem quebra
          (botões, valores) estoura a largura e some atrás da borda direita.
          O overflow-x-hidden apenas escondia o sintoma. */}
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] min-w-0 overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-4 w-4 text-[hsl(var(--vf-sales))]" />
            Detalhes da Venda
          </DialogTitle>
        </DialogHeader>

        {/* Status + Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.className}`}>
              {st.label}
            </span>
            {clientName && (
              <span className="text-xs text-muted-foreground">👤 {clientName}</span>
            )}
            {animalName && (
              <span className="text-xs text-muted-foreground">🐾 {animalName}</span>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            📅 {new Date(`${transaction.date}T${transaction.time || "00:00"}`).toLocaleString("pt-BR")}
            {transaction.paymentMethod && (
              ` · 💳 ${transaction.paymentMethod}${
                transaction.paymentInstallments && transaction.paymentInstallments > 1
                  ? ` · ${transaction.paymentInstallments}x de ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(transaction.amount / transaction.paymentInstallments)}`
                  : ""
              }`
            )}
          </div>

          {/* Valores */}
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted/40 p-3">
            <div className="min-w-0 text-center">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="truncate text-base font-bold text-[hsl(var(--vf-sales))]">
                {fmt(transaction.amount)}
              </div>
            </div>
            <div className="min-w-0 text-center">
              <div className="text-xs text-muted-foreground">Pago</div>
              <div className="truncate text-base font-bold text-emerald-600">
                {fmt(transaction.paidAmount || 0)}
              </div>
            </div>
            <div className="min-w-0 text-center">
              <div className="text-xs text-muted-foreground">Saldo</div>
              <div className={`truncate text-base font-bold ${saldo > 0 ? "text-amber-600" : "text-gray-400"}`}>
                {fmt(saldo)}
              </div>
            </div>
          </div>

          {/* Itens */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Itens da venda
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando itens...
              </div>
            ) : hasItems ? (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60 text-xs text-muted-foreground">
                      <th className="text-left px-3 py-2">Item</th>
                      <th className="text-center px-3 py-2 w-12">Qtd</th>
                      <th className="text-right px-3 py-2 w-24">Unit.</th>
                      <th className="text-right px-3 py-2 w-24">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={idx % 2 === 1 ? "bg-muted/20" : ""}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {item.type === "product" ? (
                              <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            ) : (
                              <Stethoscope className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.category
                                  ? (CATEGORY_LABELS[item.category] || item.category)
                                  : null}
                                {item.cost > 0 && (() => {
                                  const provider = resolveCostProvider(
                                    item.costProvider,
                                    item.category,
                                    item.cost
                                  );
                                  return provider
                                    ? `${item.category ? " · " : ""}Repasse: ${provider}`
                                    : null;
                                })()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {fmt(item.unitPrice)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">
                          {fmt(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/40">
                      <td colSpan={3} className="px-3 py-2 text-xs text-right font-semibold text-muted-foreground">
                        Total
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-[hsl(var(--vf-sales))]">
                        {fmt(transaction.amount)}
                      </td>
                    </tr>
                    {totalCost > 0 && (
                      <>
                        {repassesByProvider.map((row) => (
                          <tr key={row.provider} className="border-t border-border/50">
                            <td colSpan={3} className="px-3 py-1.5 text-xs text-right text-amber-600">
                              Repasse → {row.provider}
                            </td>
                            <td className="px-3 py-1.5 text-right text-xs font-semibold text-amber-600">
                              − {fmt(row.amount)}
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={3} className="px-3 py-1.5 text-xs text-right text-emerald-600">
                            Lucro estimado ({margem}% margem)
                          </td>
                          <td className="px-3 py-1.5 text-right text-xs font-bold text-emerald-600">
                            {fmt(lucro)}
                          </td>
                        </tr>
                      </>
                    )}
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                Itens detalhados não disponíveis para esta venda.
                <div className="mt-1 opacity-70">
                  (Vendas anteriores ao sistema de itens não possuem detalhamento)
                </div>
              </div>
            )}
          </div>

          {/* Ações */}
          {/* flex-wrap: são até 6 ações; em telas menores precisam quebrar
              em vez de vazar pela direita do modal. */}
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
            <div>
              {transaction.relatedClientId && transaction.relatedAnimalId && (
                <Link
                  to={getPatientRecordPath(transaction.relatedClientId, transaction.relatedAnimalId, animalPatientCode)}
                  onClick={onClose}
                >
                  <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg">
                    📋 Abrir Prontuário
                  </Button>
                </Link>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {saldo > 0 &&
                (transaction.status || "pending") !== "cancelled" && (
                <Link
                  to={`/sales/receipts?saleId=${transaction.id}&amount=${saldo}`}
                  onClick={onClose}
                >
                  <Button
                    size="sm"
                    className="h-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold"
                  >
                    💰 Dar baixa
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs rounded-lg gap-1.5"
                onClick={() => handlePrint("client")}
                disabled={printing}
              >
                <Printer className="h-3.5 w-3.5" />
                {printing ? "Gerando..." : "Comprovante"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs rounded-lg gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => handlePrint("internal")}
                disabled={printing}
              >
                <Printer className="h-3.5 w-3.5" />
                {printing ? "Gerando..." : "Relatório"}
              </Button>
              {(transaction.status || "pending") === "cancelled" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs rounded-lg gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
                  onClick={handlePrintCancellation}
                  disabled={printingCancellation}
                >
                  <Printer className="h-3.5 w-3.5" />
                  {printingCancellation ? "Gerando..." : "Comprovante de estorno"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs rounded-lg gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => onRequestCancel?.(transaction)}
                >
                  <Ban className="h-3.5 w-3.5" />
                  Cancelar
                </Button>
              )}
              {(transaction.paidAmount || 0) === 0 &&
               (transaction.status || "pending") !== "cancelled" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs rounded-lg gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => onRequestDelete?.(transaction)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs rounded-lg"
                onClick={onClose}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaleDetailModal;
