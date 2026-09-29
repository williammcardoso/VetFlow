import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  Banknote,
  Boxes,
  CheckCircle2,
  CircleDashed,
  Clock,
  Coins,
  CreditCard,
  FlaskConical,
  Layers,
  Microscope,
  Package,
  Pill,
  QrCode,
  Receipt,
  Scissors,
  ShoppingBag,
  Stethoscope,
  Syringe,
  Tag,
  TrendingUp,
  Undo2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { FinancialTransaction } from "@/mockData/financial";
import type { SaleStatusKey } from "@/lib/salePayment";

// Identidade visual do financeiro/vendas: cada conceito tem SEMPRE a mesma
// cor e o mesmo ícone, em todas as telas (indicadores, listas, relatórios,
// prontuário). Assim o usuário reconhece "o que é o quê" pela cor antes de
// ler — repasse é laranja, a receber é âmbar, recebido é verde-azulado...
// Classes escritas por extenso (o Tailwind só gera classes que aparecem no código).

export type Tone = "sky" | "teal" | "emerald" | "amber" | "orange" | "rose" | "violet" | "slate";

export const TONES: Record<
  Tone,
  {
    /** Fundo + ícone do "chip" de ícone. */
    chip: string;
    /** Texto/valor na cor do conceito. */
    text: string;
    /** Cartão tingido (destaque). */
    card: string;
    /** Rótulo em cima do valor no cartão tingido. */
    label: string;
    /** Barra de ranking. */
    bar: string;
    /** Selo (badge). */
    badge: string;
  }
> = {
  sky: {
    chip: "bg-sky-50 text-sky-600 ring-sky-100",
    text: "text-sky-700",
    card: "border-sky-200 bg-sky-50/50",
    label: "text-sky-700",
    bar: "bg-sky-100",
    badge: "bg-sky-50 text-sky-700 ring-sky-600/20",
  },
  teal: {
    chip: "bg-teal-50 text-teal-600 ring-teal-100",
    text: "text-teal-700",
    card: "border-teal-200 bg-teal-50/50",
    label: "text-teal-700",
    bar: "bg-teal-100",
    badge: "bg-teal-50 text-teal-700 ring-teal-600/20",
  },
  emerald: {
    chip: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    text: "text-emerald-700",
    card: "border-emerald-200 bg-emerald-50/50",
    label: "text-emerald-700",
    bar: "bg-emerald-100",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  },
  amber: {
    chip: "bg-amber-50 text-amber-600 ring-amber-100",
    text: "text-amber-700",
    card: "border-amber-200 bg-amber-50/50",
    label: "text-amber-800",
    bar: "bg-amber-100",
    badge: "bg-amber-50 text-amber-800 ring-amber-600/20",
  },
  orange: {
    chip: "bg-orange-50 text-orange-600 ring-orange-100",
    text: "text-orange-700",
    card: "border-orange-200 bg-orange-50/50",
    label: "text-orange-700",
    bar: "bg-orange-100",
    badge: "bg-orange-50 text-orange-700 ring-orange-600/20",
  },
  rose: {
    chip: "bg-rose-50 text-rose-600 ring-rose-100",
    text: "text-rose-700",
    card: "border-rose-200 bg-rose-50/50",
    label: "text-rose-700",
    bar: "bg-rose-100",
    badge: "bg-rose-50 text-rose-700 ring-rose-600/20",
  },
  violet: {
    chip: "bg-violet-50 text-violet-600 ring-violet-100",
    text: "text-violet-700",
    card: "border-violet-200 bg-violet-50/50",
    label: "text-violet-700",
    bar: "bg-violet-100",
    badge: "bg-violet-50 text-violet-700 ring-violet-600/20",
  },
  slate: {
    chip: "bg-slate-100 text-slate-600 ring-slate-200",
    text: "text-slate-700",
    card: "border-slate-200 bg-slate-50",
    label: "text-slate-700",
    bar: "bg-slate-100",
    badge: "bg-slate-100 text-slate-700 ring-slate-500/20",
  },
};

export interface Concept {
  label: string;
  icon: LucideIcon;
  tone: Tone;
}

/** Conceitos do financeiro — mesma cor/ícone em todas as telas. */
export const CONCEPTS = {
  faturado: { label: "Faturado", icon: Receipt, tone: "sky" },
  recebido: { label: "Recebido", icon: Wallet, tone: "teal" },
  aReceber: { label: "A receber", icon: Clock, tone: "amber" },
  lucro: { label: "Lucro líquido", icon: TrendingUp, tone: "emerald" },
  ticket: { label: "Ticket médio", icon: Tag, tone: "violet" },
  repasses: { label: "Repasses a prestadores", icon: Coins, tone: "orange" },
  compras: { label: "Compras do almoxarifado", icon: ShoppingBag, tone: "amber" },
  produtos: { label: "Custo de produtos", icon: Package, tone: "amber" },
  taxas: { label: "Taxas de cartão", icon: CreditCard, tone: "rose" },
  saidas: { label: "Saídas operacionais", icon: ArrowUpRight, tone: "rose" },
  estorno: { label: "Estorno", icon: Undo2, tone: "rose" },
} satisfies Record<string, Concept>;

/** Forma de pagamento: ícone e cor pela natureza (cadastro) ou pelo nome. */
export function paymentMethodVisual(method: { name?: string; type?: string } | string | undefined): { icon: LucideIcon; tone: Tone } {
  const m = typeof method === "string" ? { name: method } : method ?? {};
  const hint = `${m.type ?? ""} ${m.name ?? ""}`.toLowerCase();
  if (/cash|dinheiro|esp[eé]cie/.test(hint)) return { icon: Banknote, tone: "emerald" };
  if (/pix/.test(hint)) return { icon: QrCode, tone: "teal" };
  if (/debit|d[eé]bito/.test(hint)) return { icon: CreditCard, tone: "sky" };
  if (/credit|cr[eé]dito|cart/.test(hint)) return { icon: CreditCard, tone: "violet" };
  return { icon: Wallet, tone: "slate" };
}

/** Situação da venda: selo com cor e ícone. */
export const SALE_STATUS_VISUAL: Record<SaleStatusKey, { icon: LucideIcon; tone: Tone }> = {
  paid: { icon: CheckCircle2, tone: "emerald" },
  partial: { icon: CircleDashed, tone: "sky" },
  open: { icon: Clock, tone: "amber" },
  cancelled: { icon: Ban, tone: "rose" },
};

/** Tipo de lançamento (listas de movimentação). */
export function movementVisual(t: Pick<FinancialTransaction, "type" | "category" | "amount">): {
  label: string;
  icon: LucideIcon;
  tone: Tone;
  sign: "+" | "−" | "";
} {
  if (t.amount < 0) return { label: "Estorno", icon: Undo2, tone: "rose", sign: "−" };
  if (t.type === "expense") {
    return t.category === "Estoque"
      ? { label: "Compra", icon: ShoppingBag, tone: "amber", sign: "−" }
      : { label: "Saída", icon: ArrowUpRight, tone: "rose", sign: "−" };
  }
  if (t.category === "Recebimento") return { label: "Recebimento", icon: ArrowDownLeft, tone: "emerald", sign: "+" };
  return { label: "Venda", icon: Receipt, tone: "sky", sign: "" };
}

/** Categoria do catálogo: ícone e cor. */
export function categoryVisual(category?: string | null): { icon: LucideIcon; tone: Tone } {
  switch ((category || "").toLowerCase()) {
    case "cirurgia":
      return { icon: Scissors, tone: "rose" };
    case "exame_externo":
      return { icon: FlaskConical, tone: "violet" };
    case "exame_interno":
      return { icon: Microscope, tone: "sky" };
    case "especialista":
      return { icon: Stethoscope, tone: "teal" };
    case "vacina":
      return { icon: Syringe, tone: "emerald" };
    case "servico":
      return { icon: Stethoscope, tone: "sky" };
    case "produto":
    case "racao":
    case "acessorio":
      return { icon: Package, tone: "amber" };
    case "medicamento":
      return { icon: Pill, tone: "orange" };
    case "insumos":
      return { icon: Boxes, tone: "slate" };
    default:
      return { icon: Layers, tone: "slate" };
  }
}
