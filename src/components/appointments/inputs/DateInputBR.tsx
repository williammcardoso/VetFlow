import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

const pad2 = (n: number) => String(n).padStart(2, "0");

export function isoToBR(iso?: string) {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}

export function brToISO(br?: string) {
  if (!br) return "";
  const cleaned = br.trim();
  // Accept already-ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

  const m = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return "";
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (!d || !mo || !y) return "";
  if (mo < 1 || mo > 12) return "";
  if (d < 1 || d > 31) return "";

  const iso = `${y}-${pad2(mo)}-${pad2(d)}`;
  const dt = new Date(`${iso}T00:00:00`);
  // Validate real calendar date
  if (Number.isNaN(dt.getTime())) return "";
  if (dt.getFullYear() !== y || dt.getMonth() + 1 !== mo || dt.getDate() !== d) return "";
  return iso;
}

function maskDDMMYYYY(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  if (digits.length <= 2) return d;
  if (digits.length <= 4) return `${d}/${m}`;
  return `${d}/${m}/${y}`;
}

type Props = {
  id?: string;
  valueISO: string;
  onChangeISO: (nextISO: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
};

/**
 * Input de data em pt-BR (DD/MM/AAAA), com máscara leve.
 * Mantém o valor de saída em ISO (YYYY-MM-DD) para compatibilidade.
 */
export default function DateInputBR({
  id,
  valueISO,
  onChangeISO,
  placeholder = "DD/MM/AAAA",
  className,
  required,
}: Props) {
  const formatted = useMemo(() => isoToBR(valueISO), [valueISO]);
  const [raw, setRaw] = useState(formatted);

  useEffect(() => {
    setRaw(formatted);
  }, [formatted]);

  return (
    <Input
      id={id}
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      value={raw}
      required={required}
      className={className}
      onChange={(e) => {
        const masked = maskDDMMYYYY(e.target.value);
        setRaw(masked);
        const iso = brToISO(masked);
        if (iso) onChangeISO(iso);
        if (masked.trim() === "") onChangeISO("");
      }}
    />
  );
}