import * as React from "react";
import { FileText, Loader2 } from "lucide-react";
import { IconChip } from "@/components/finance/FinanceUI";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentChoice, type PaymentMethodOption } from "@/components/sales/PaymentChoice";
import { budgetTotal, convertBudgetToSale } from "@/lib/budgetConversion";
import type { PayMode } from "@/lib/salePayment";
import { formatCurrencyBRL } from "@/lib/utils";
import type { Budget } from "@/mockData/budgets";
import type { CatalogItem } from "@/mockData/catalog";

const NO_APPOINTMENT = "__none__";

/**
 * Converter orçamento em venda — mesma janela na tela de Orçamentos e no
 * prontuário. Pergunta o pagamento uma vez só: recebido agora (a venda já
 * nasce paga) ou fica a receber.
 */
export function ConvertBudgetDialog({
  open,
  onOpenChange,
  budget: budgetProp,
  catalogItems,
  methods,
  appointments,
  defaultAppointmentId,
  responsibleFor,
  clientName,
  animalName,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget | null;
  catalogItems: CatalogItem[];
  methods: PaymentMethodOption[];
  /** Atendimentos do paciente (só no prontuário) para vincular a venda. */
  appointments?: { id: string; label: string }[];
  defaultAppointmentId?: string;
  /** Responsável pela venda a partir do atendimento escolhido. */
  responsibleFor?: (appointmentId: string | undefined) => string | undefined;
  clientName?: string;
  animalName?: string;
  onDone?: (saleId: string) => void | Promise<void>;
}) {
  const [payMode, setPayMode] = React.useState<PayMode>("now");
  const [method, setMethod] = React.useState<string | undefined>(undefined);
  const [appointmentId, setAppointmentId] = React.useState<string>(NO_APPOINTMENT);
  const [saving, setSaving] = React.useState(false);
  // Mantém o orçamento durante a animação de saída (a tela limpa ao fechar).
  const lastBudget = React.useRef(budgetProp);
  if (budgetProp) lastBudget.current = budgetProp;
  const budget = budgetProp ?? lastBudget.current;

  React.useEffect(() => {
    if (!open) return;
    setPayMode("now");
    setMethod(budget?.paymentMethod && methods.some((m) => m.name === budget.paymentMethod) ? budget.paymentMethod : undefined);
    setAppointmentId(defaultAppointmentId || NO_APPOINTMENT);
  }, [open, budget, methods, defaultAppointmentId]);

  if (!budget) return null;

  const subtotal = budget.items.reduce((s, it) => s + it.qty * it.price, 0);
  const discount = budget.discountAmount ?? 0;
  const surcharge = budget.surchargeAmount ?? 0;
  const total = budgetTotal(budget);

  const submit = async () => {
    if (saving) return;
    if (payMode === "now" && !method) return void toast.error("Escolha a forma de pagamento.");
    setSaving(true);
    try {
      const linked = appointmentId === NO_APPOINTMENT ? undefined : appointmentId;
      const result = await convertBudgetToSale({
        budget,
        catalogItems,
        payMode,
        paymentMethod: method,
        appointmentId: linked,
        responsible: responsibleFor?.(linked),
        clientName,
        animalName,
      });
      if (!result.ok || !result.saleId) {
        toast.error(result.error || "Falha ao converter o orçamento.");
        return;
      }
      if (payMode === "now" && total > 0) {
        if (result.received) toast.success(`Venda criada e recebida (${method}).`);
        else toast.warning("Venda criada, mas o recebimento não foi gravado. Use “Receber” na venda.");
      } else {
        toast.success(total > 0 ? `Venda criada — fica a receber ${formatCurrencyBRL(total)}.` : "Venda criada.");
      }
      await onDone?.(result.saleId);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="max-h-[90vh] min-w-0 overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <IconChip icon={FileText} tone="violet" size="sm" />
            Converter em venda
          </DialogTitle>
          <DialogDescription>
            {[clientName ?? budget.clientName, (animalName ?? budget.animalName) && `(${animalName ?? budget.animalName})`]
              .filter(Boolean)
              .join(" ") || "Orçamento sem cliente"}
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="min-w-0 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void submit();
          }}
        >
          <div className="rounded-xl border border-border text-sm">
            <ul className="divide-y divide-border/70">
              {budget.items.map((it, i) => (
                <li key={`${it.itemId}-${i}`} className="flex items-baseline justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 break-words">
                    {it.name}
                    {it.qty !== 1 && <span className="text-muted-foreground"> × {it.qty}</span>}
                  </span>
                  <span className="shrink-0 tabular-nums">{formatCurrencyBRL(it.qty * it.price)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t border-border bg-muted/30 px-3 py-2">
              {(discount > 0 || surcharge > 0) && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrencyBRL(subtotal)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between font-medium text-emerald-700">
                  <span>Desconto</span>
                  <span className="tabular-nums">− {formatCurrencyBRL(discount)}</span>
                </div>
              )}
              {surcharge > 0 && (
                <div className="flex justify-between font-medium text-amber-700">
                  <span>Acréscimo</span>
                  <span className="tabular-nums">+ {formatCurrencyBRL(surcharge)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-foreground">
                <span className="uppercase tracking-wide">Total</span>
                <span className="text-lg font-bold tabular-nums">{formatCurrencyBRL(total)}</span>
              </div>
            </div>
          </div>

          {appointments && (
            <div className="relative space-y-1.5">
              <p id="convertAppointmentLabel" className="text-sm font-medium text-foreground">
                Atendimento <span className="font-normal text-muted-foreground">(opcional)</span>
              </p>
              <Select value={appointmentId} onValueChange={setAppointmentId}>
                <SelectTrigger aria-labelledby="convertAppointmentLabel" className="h-10 rounded-lg bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_APPOINTMENT}>Sem vínculo</SelectItem>
                  {appointments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <PaymentChoice
            idPrefix="convertBudget"
            mode={payMode}
            onModeChange={setPayMode}
            method={method}
            onMethodChange={setMethod}
            methods={methods}
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="font-semibold">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {payMode === "now" && total > 0 ? `Converter e receber ${formatCurrencyBRL(total)}` : "Converter em venda"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
