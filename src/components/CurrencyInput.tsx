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

  return (
    <Input
      id={id}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={cn("bg-input", className)}
    />
  );
};

export default CurrencyInput;