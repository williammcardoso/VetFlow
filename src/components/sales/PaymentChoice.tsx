import * as React from "react";
import { Banknote, CreditCard, QrCode, Wallet } from "lucide-react";
import { ChoiceGroup } from "@/components/forms/FormLayout";
import { cn } from "@/lib/utils";
import type { PayMode } from "@/lib/salePayment";

export interface PaymentMethodOption {
  id: string;
  name: string;
  /** "cash" | "pix" | "credit" | "debit" (campo `type` do cadastro de formas de pagamento). */
  type?: string;
  [key: string]: unknown;
}

/** Ícone pela natureza da forma de pagamento (cadastro) ou pelo nome. */
export function paymentMethodIcon(method: Pick<PaymentMethodOption, "name" | "type">) {
  const hint = `${method.type ?? ""} ${method.name}`.toLowerCase();
  if (/cash|dinheiro|esp[eé]cie/.test(hint)) return Banknote;
  if (/pix/.test(hint)) return QrCode;
  if (/credit|cr[eé]dito|debit|d[eé]bito|cart/.test(hint)) return CreditCard;
  return Wallet;
}

/**
 * Pagamento na hora da venda: "Recebido agora" (padrão — a venda já nasce
 * paga) ou "Fica a receber" (fica em aberto). A forma de pagamento é
 * perguntada uma vez só: obrigatória se recebeu agora; se ficou a receber é
 * opcional e, quando informada, já vem marcada na hora do "Receber".
 */
export function PaymentChoice({
  mode,
  onModeChange,
  method,
  onMethodChange,
  methods,
  idPrefix = "payment",
  className,
}: {
  mode: PayMode;
  onModeChange: (mode: PayMode) => void;
  method: string | undefined;
  onMethodChange: (method: string | undefined) => void;
  methods: PaymentMethodOption[];
  idPrefix?: string;
  className?: string;
}) {
  const labelId = `${idPrefix}-method-label`;
  return (
    <div className={cn("space-y-3", className)}>
      <div role="radiogroup" aria-label="Pagamento" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(
          [
            { key: "now", label: "Recebido agora" },
            { key: "later", label: "Fica a receber" },
          ] as const
        ).map(({ key, label }) => {
          const active = mode === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onModeChange(key)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <p id={labelId} className="text-sm font-medium text-foreground">
          {mode === "now" ? (
            <>
              Forma de pagamento<span className="text-destructive" aria-hidden> *</span>
            </>
          ) : (
            <>
              Como vai pagar? <span className="font-normal text-muted-foreground">(opcional)</span>
            </>
          )}
        </p>
        {methods.length > 0 ? (
          <ChoiceGroup
            labelledBy={labelId}
            value={method}
            onChange={onMethodChange}
            allowDeselect={mode === "later"}
            options={methods.map((m) => ({ value: m.name, label: m.name, icon: paymentMethodIcon(m) }))}
          />
        ) : (
          <p className="text-xs text-muted-foreground">Cadastre as formas em Financeiro › Formas de pagamento.</p>
        )}
      </div>

      {mode === "later" && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          A venda fica em aberto (Recebimentos › A receber). Na hora de receber, o saldo e a forma já vêm preenchidos.
        </p>
      )}
    </div>
  );
}
