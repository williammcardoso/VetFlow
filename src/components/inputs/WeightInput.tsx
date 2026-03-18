import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

type Props = {
  id?: string;
  value: number | "";
  onChange: (v: number | "") => void;
  placeholder?: string;
  className?: string;
};

// WeightInput works as a fixed-point mask with 3 decimal places.
// User types digits only; the input shifts decimals automatically:
// typing sequence: "2" -> "0,002", "24" -> "0,024", "240" -> "0,240", "2400" -> "2,400", "24000" -> "24,000"

const digitsToNumber = (digits: string): number => {
  const n = parseInt(digits || "0", 10);
  return n / 1000;
};

const numberToDigits = (n: number): string => {
  return String(Math.round(n * 1000));
};

const formatFromDigits = (digits: string) => {
  if (!digits || digits === "") return "";
  const num = digitsToNumber(digits);
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
};

export default function WeightInput({ id, value, onChange, placeholder, className }: Props) {
  const [digits, setDigits] = useState<string>("");

  // Initialize from external value
  useEffect(() => {
    if (value === "" || value === undefined) {
      setDigits("");
      return;
    }
    setDigits(numberToDigits(value as number));
  }, [value]);

  const handleChange = (raw: string) => {
    // Keep only digits — user types numbers, mask shifts automatically
    const only = raw.replace(/\D/g, "");
    if (only === "") {
      setDigits("");
      onChange("");
      return;
    }
    // Remove leading zeros unless user really intends them: preserve as-is
    const normalized = only.replace(/^0+(?=\d)/, "");
    setDigits(normalized);
    onChange(digitsToNumber(normalized));
  };

  const handleBlur = () => {
    // Force format on blur (already formatted by render)
  };

  return (
    <Input
      id={id}
      value={formatFromDigits(digits)}
      placeholder={placeholder || "Ex: 0,002"}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e.target.value)}
      onBlur={handleBlur}
      className={className}
      inputMode="numeric"
    />
  );
}

