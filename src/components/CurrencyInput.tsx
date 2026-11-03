"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CurrencyInputProps = {
  value?: number;
  onValueChange: (value: number) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

const formatBRL = (val: number) => {
  if (typeof val !== "number" || isNaN(val)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
};

const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value = 0,
  onValueChange,
  id,
  placeholder = "R$ 0,00",
  className,
  disabled = false,
}) => {
  const [display, setDisplay] = React.useState<string>(formatBRL(value));

  React.useEffect(() => {
    setDisplay(formatBRL(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value || "";
    // Remove tudo que não é dígito
    const digits = raw.replace(/\D/g, "");
    // Converte para centavos
    const cents = digits ? parseInt(digits, 10) : 0;
    const next = cents / 100;
    setDisplay(formatBRL(next));
    onValueChange(next);
  };

  const handleBlur = () => {
    setDisplay(formatBRL(value));
  };

  // A máscara monta os centavos pelos dígitos em ordem: clicar no meio do
  // "R$ 0,00" e digitar ali embaralhava o valor. Ao entrar no campo, seleciona
  // tudo — o que se digita substitui o valor.
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    requestAnimationFrame(() => el.setSelectionRange(0, el.value.length));
  };

  return (
    <Input
      id={id}
      // Só dígitos (a máscara monta os centavos): teclado numérico no celular.
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder}
      disabled={disabled}
      className={cn("bg-input", className)}
    />
  );
};

export default CurrencyInput;