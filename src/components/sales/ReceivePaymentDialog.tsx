import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CurrencyInput from "@/components/CurrencyInput";
import { ChoiceGroup } from "@/components/forms/FormLayout";
import { paymentMethodIcon, type PaymentMethodOption } from "@/components/sales/PaymentChoice";
import { addReceipt } from "@/lib/financialApi";
import { nowTimeHHMM, receiveSalePayment, saleBalance, summarizeSaleItems, toCents } from "@/lib/salePayment";
import { formatCurrencyBRL, formatDateTime, getTodayLocalISO } from "@/lib/utils";
import type { FinancialTransaction } from "@/mockData/financial";

/**
 * "Receber" — baixa de uma venda (ou entrada avulsa, com `sale` nulo) numa
 * janela só, já preenchida: saldo em aberto, a forma de pagamento escolhida na
 * venda, hoje/agora. É a mesma janela no prontuário, em Vendas, no detalhe da
 * venda, em Recebimentos e na Visão geral.
 */
export function ReceivePaymentDialog({
  open,
  onOpenChange,
  sale: saleProp,
  clientName: clientNameProp,
  animalName: animalNameProp,
  methods,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: FinancialTransaction | null;
  clientName?: string;
  animalName?: string;
  methods: PaymentMethodOption[];
  onDone?: () => void | Promise<void>;
}) {
  // Ao fechar, a tela limpa a venda junto; manter a última evita o conteúdo
  // trocar para "Entrada avulsa" durante a animação de saída.
  const last = React.useRef({ sale: saleProp, clientName: clientNameProp, animalName: animalNameProp });
  if (open) last.current = { sale: saleProp, clientName: clientNameProp, animalName: animalNameProp };
  const { sale, clientName, animalName } = open ? { sale: saleProp, clientName: clientNameProp, animalName: animalNameProp } : last.current;
  const balance = sale ? saleBalance(sale) : 0;
  const [amount, setAmount] = React.useState(0);
  const [method, setMethod] = React.useState<string | undefined>(undefined);
  const [date, setDate] = React.useState(getTodayLocalISO());
  const [time, setTime] = React.useState(nowTimeHHMM());
  const [description, setDescription] = React.useState("");
  const [observations, setObservations] = React.useState("");
  const [showWhen, setShowWhen] = React.useState(false);
  const [showNotes, setShowNotes] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Cada vez que abre: saldo, forma da venda (se ela tiver uma), agora.
  React.useEffect(() => {
    if (!open) return;
    setAmount(sale ? saleBalance(sale) : 0);
    setMethod(sale?.paymentMethod && methods.some((m) => m.name === sale.paymentMethod) ? sale.paymentMethod : undefined);
    setDate(getTodayLocalISO());
    setTime(nowTimeHHMM());
    setDescription("");
    setObservations("");
    setShowWhen(false);
    setShowNotes(false);
  }, [open, sale, methods]);

  const over = Boolean(sale) && toCents(amount) > balance;
  const toReceive = over ? balance : toCents(amount);
  const isToday = date === getTodayLocalISO();

  const submit = async () => {
    if (saving) return;
    if (!(toReceive > 0)) return void toast.error("Informe o valor recebido.");
    if (!method) return void toast.error("Escolha a forma de pagamento.");
    if (date > getTodayLocalISO()) return void toast.error("A data do recebimento não pode ser futura.");
    setSaving(true);
    try {
      const ok = sale
        ? await receiveSalePayment({
            sale,
            amount: toReceive,
            paymentMethod: method,
            date,
            time,
            observations,
            clientName,
            animalName,
          })
        : await addReceipt({
            amount: toReceive,
            paymentMethod: method,
            date,
            time,
            observations: observations.trim() || undefined,
            description: description.trim() || "Entrada avulsa",
          });
      if (!ok) {
        toast.error("Não foi possível registrar o recebimento. Tente de novo.");
        return;
      }
      toast.success(`${formatCurrencyBRL(toReceive)} recebido (${method}).`);
      await onDone?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const who = [clientName, animalName && `(${animalName})`].filter(Boolean).join(" ");

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{sale ? "Receber pagamento" : "Entrada avulsa"}</DialogTitle>
          <DialogDescription>
            {sale ? who || "Venda sem cliente" : "Dinheiro que entrou sem venda registrada no sistema."}
          </DialogDescription>
        </DialogHeader>

        {/* stopPropagation: o submit (num portal) não pode chegar a um formulário da página. */}
        <form
          noValidate
          className="min-w-0 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void submit();
          }}
        >
          {sale && (
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
              <p className="break-words font-medium text-foreground">{summarizeSaleItems(sale.description, 3)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Venda de {formatDateTime(sale.date, sale.time)}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 border-t border-border/70 pt-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-semibold tabular-nums text-foreground">{formatCurrencyBRL(sale.amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Já pago</p>
                  <p className="font-semibold tabular-nums text-foreground">{formatCurrencyBRL(sale.paidAmount || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Falta</p>
                  <p className="font-semibold tabular-nums text-amber-700">{formatCurrencyBRL(balance)}</p>
                </div>
              </div>
            </div>
          )}

          {!sale && (
            <div className="space-y-1.5">
              <Label htmlFor="receiveDescription">Descrição</Label>
              <Input
                id="receiveDescription"
                value={description}
                placeholder="Ex.: pagamento de conta antiga"
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="receiveAmount">Valor recebido</Label>
            <CurrencyInput id="receiveAmount" value={amount} onValueChange={setAmount} className="h-11 text-base font-semibold" />
            {sale && over && (
              <p className="text-xs text-amber-700">Maior que o saldo — será registrado só o que falta ({formatCurrencyBRL(balance)}).</p>
            )}
            {sale && !over && toReceive > 0 && toReceive < balance && (
              <p className="text-xs text-muted-foreground">
                Pagamento parcial: continuam em aberto {formatCurrencyBRL(toCents(balance - toReceive))}.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <p id="receiveMethodLabel" className="text-sm font-medium text-foreground">
              Forma de pagamento
            </p>
            <ChoiceGroup
              labelledBy="receiveMethodLabel"
              value={method}
              onChange={setMethod}
              options={methods.map((m) => ({ value: m.name, label: m.name, icon: paymentMethodIcon(m) }))}
            />
          </div>

          {showWhen ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="receiveDate">Data</Label>
                <Input id="receiveDate" type="date" value={date} max={getTodayLocalISO()} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="receiveTime">Hora</Label>
                <Input id="receiveTime" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Recebido {isToday ? "hoje" : formatDateTime(date)} às {time}.{" "}
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => setShowWhen(true)}>
                Alterar
              </button>
            </p>
          )}

          {showNotes ? (
            <div className="space-y-1.5">
              <Label htmlFor="receiveNotes">Observação</Label>
              <Textarea id="receiveNotes" rows={2} value={observations} onChange={(e) => setObservations(e.target.value)} />
            </div>
          ) : (
            <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => setShowNotes(true)}>
              + Adicionar observação
            </button>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="font-semibold">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {toReceive > 0 ? `Receber ${formatCurrencyBRL(toReceive)}` : "Receber"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
