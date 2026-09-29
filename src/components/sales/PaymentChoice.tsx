import * as React from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { ChoiceGroup } from "@/components/forms/FormLayout";
import { cn } from "@/lib/utils";
import { paymentMethodVisual } from "@/components/finance/financeTheme";
import { coloredIcon } from "@/components/finance/FinanceUI";
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
  return paymentMethodVisual(method).icon;
}

/** Ícone já na cor da forma (PIX verde-azulado, dinheiro verde, crédito roxo, débito azul) — para as opções. */
export function paymentMethodChoiceIcon(method: Pick<PaymentMethodOption, "name" | "type">) {
  const { icon, tone } = paymentMethodVisual(method);
  return coloredIcon(icon, tone);
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
            { key: "now", label: "Recebido agora", icon: CheckCircle2, on: "text-emerald-700" },
            { key: "later", label: "Fica a receber", icon: Clock, on: "text-amber-700" },
          ] as const
        ).map(({ key, label, icon: Icon, on }) => {
          const active = mode === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onModeChange(key)}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                active ? cn("bg-card shadow-sm", on) : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
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
            options={methods.map((m) => ({ value: m.name, label: m.name, icon: paymentMethodChoiceIcon(m) }))}
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
