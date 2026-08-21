import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// crypto.randomUUID() só existe em contexto seguro (HTTPS ou localhost).
// Acessar o app por IP da rede local (http://192.168.x.x) ou navegadores
// mais antigos derruba essa checagem, então caímos para getRandomValues
// (disponível em qualquer contexto) e, por último, Math.random.
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // segue para o fallback abaixo
    }
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Máscara de telefone brasileiro: (99) 99999-9999 ou (99) 9999-9999.
 * Tolera entrada já formatada, com +55 ou só dígitos.
 */
export function formatPhoneBR(value?: string | null): string {
  if (!value) return "";
  let digits = String(value).replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

/** Idade por extenso a partir da data de nascimento (ex.: "11 anos e 3 meses"). */
export function formatAgeLong(birthday?: string | null): string {
  if (!birthday) return "";
  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return "";
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) {
    months--;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  const parts: string[] = [];
  if (years > 0) parts.push(years === 1 ? "1 ano" : `${years} anos`);
  if (months > 0) parts.push(months === 1 ? "1 mês" : `${months} meses`);
  if (parts.length === 0) return days === 1 ? "1 dia" : `${Math.max(0, days)} dias`;
  return parts.join(" e ");
}

/**
 * Converte um número digitado em formato brasileiro (vírgula decimal, ponto
 * de milhar) ou americano em `number`. Usado em campos de resultado/
 * referência de exame, onde o usuário pode digitar em qualquer um dos dois
 * formatos (ex.: "1.250" como mil duzentos e cinquenta, ou "12,5" como
 * doze e meio).
 */
export function parseBrNumber(raw: string): number | undefined {
  const trimmed = (raw || "").trim();
  if (!trimmed) return undefined;
  let cleaned = trimmed.replace(/[^0-9.,]/g, "");
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  if (lastComma > lastDot) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot !== -1) {
    const dotCount = (cleaned.match(/\./g) || []).length;
    const decimalsAfterLastDot = cleaned.length - lastDot - 1;
    if (dotCount > 1 || decimalsAfterLastDot === 3) {
      cleaned = cleaned.replace(/\./g, "");
    }
  }
  const n = Number(cleaned);
  return Number.isNaN(n) ? undefined : n;
}

// "YYYY-MM-DD" puro vira meia-noite UTC se parseado direto com `new Date(str)`;
// em fuso negativo (Brasil, UTC-3) isso volta pro dia anterior. Forçar hora
// local evita o bug — usar em qualquer cálculo que leia data de nascimento,
// retorno, vacina etc. a partir de uma string "YYYY-MM-DD".
export const parseLocalDate = (dateStr: string): Date => new Date(`${dateStr}T00:00:00`);

// Data de "hoje" em "YYYY-MM-DD", em hora LOCAL — evitar
// `new Date().toISOString().split("T")[0]`, que usa UTC e pode voltar pro
// dia anterior perto da meia-noite no fuso do Brasil.
export const getTodayLocalISO = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const brlFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatCurrencyBRL = (value: number) => brlFormatter.format(value);

export const formatDateTime = (dateString: string, timeString?: string) => {
  if (!dateString) return "N/A";
  const [year, month, day] = dateString.split('-');
  if (timeString) {
    return `${day}/${month}/${year} ${timeString}`;
  }
  return `${day}/${month}/${year}`;
};

// "Nome x2" lido em voz alta soa como erro de digitação. Usado para textos
// puros (ex.: description de financial_transactions, gravada no banco) —
// telas que renderizam JSX mostram a quantidade como bolinha (ver
// FinancialPage.tsx) em vez de texto. Omite a quantidade quando é 1 — não
// há necessidade de marcar a unidade óbvia.
export const formatItemQty = (name: string, qty: number) => (qty > 1 ? `${name} ×${qty}` : name);

// Extrai "Nome ×2" (formato gravado por formatItemQty) de volta em
// { name, qty } para telas que querem renderizar a quantidade como elemento
// visual (bolinha) em vez de texto plano.
export const parseItemQty = (text: string): { name: string; qty?: number } => {
  // Aceita "Nome ×2" (formato atual) e "Nome (×2)" (formato usado antes de
  // trocar para bolinha) — descrições antigas já gravadas no banco usam o formato velho.
  const m = text.match(/^(.*?)\s*\(?×(\d+)\)?$/);
  if (!m) return { name: text };
  return { name: m[1], qty: Number(m[2]) };
};