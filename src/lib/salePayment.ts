import { addReceipt } from "@/lib/financialApi";
import type { FinancialTransaction } from "@/mockData/financial";

// Rotina de pagamento de venda num lugar só — usada pelo PDV, prontuário,
// orçamentos, lista de vendas e Recebimentos.
//
// Antes: o PDV perguntava a forma de pagamento mas gravava a venda como
// "pendente", e a baixa (em Recebimentos) perguntava tudo de novo; no
// prontuário a venda nem perguntava e a baixa ficava em outra sub-aba. Quase
// toda venda é paga na hora, então o padrão agora é "Recebido agora": a venda
// já nasce paga (venda + recebimento na mesma ação). "Fica a receber" deixa em
// aberto, e o "Receber" depois já vem com saldo e forma preenchidos.

export type PayMode = "now" | "later";

const pad = (n: number) => String(n).padStart(2, "0");

/** "HH:MM" da hora local. */
export function nowTimeHHMM(date = new Date()): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Arredonda pra centavos (evita 59,999999 em somas de ponto flutuante). */
export const toCents = (value: number) => Math.round(value * 100) / 100;

/** Quanto falta receber de uma venda (nunca negativo). */
export function saleBalance(sale: Pick<FinancialTransaction, "amount" | "paidAmount" | "status">): number {
  if (sale.status === "cancelled") return 0;
  return Math.max(0, toCents(sale.amount - (sale.paidAmount || 0)));
}

/** Status de exibição: "a receber" junta pendente e parcial. */
export function isSaleOpen(sale: Pick<FinancialTransaction, "amount" | "paidAmount" | "status">): boolean {
  return sale.status !== "cancelled" && saleBalance(sale) > 0;
}

export type SaleStatusKey = "paid" | "partial" | "open" | "cancelled";

/**
 * Situação da venda para as listas — mesma leitura em todas as telas:
 * "Pago", "Parcial" (recebeu uma parte), "A receber" (nada recebido) e
 * "Cancelada". Vem do valor pago, não do campo status (que é derivado dele).
 */
export function saleStatus(sale: Pick<FinancialTransaction, "amount" | "paidAmount" | "status">): {
  key: SaleStatusKey;
  label: string;
} {
  if (sale.status === "cancelled") return { key: "cancelled", label: "Cancelada" };
  if (saleBalance(sale) <= 0) return { key: "paid", label: "Pago" };
  if ((sale.paidAmount || 0) > 0) return { key: "partial", label: "Parcial" };
  return { key: "open", label: "A receber" };
}

/** O recebimento pertence à venda? (`saleId`, ou o id no texto em registros antigos) */
export function isReceiptOfSale(receipt: Pick<FinancialTransaction, "saleId" | "description">, saleId: string): boolean {
  return receipt.saleId === saleId || (receipt.description || "").includes(saleId);
}

/**
 * Formas de pagamento efetivamente usadas em cada venda (dos recebimentos).
 * A venda feita no prontuário não guardava a forma — ela só existia na baixa.
 */
export function receiptMethodsBySale(transactions: FinancialTransaction[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const t of transactions) {
    if (t.type !== "income" || t.category !== "Recebimento" || t.amount <= 0 || !t.saleId || !t.paymentMethod) continue;
    const list = map.get(t.saleId) ?? [];
    if (!list.includes(t.paymentMethod)) list.push(t.paymentMethod);
    map.set(t.saleId, list);
  }
  return map;
}

// Vínculo venda ↔ atendimento: não há coluna própria; fica como uma tag no
// início de `observations` ("@apt:<id>"), campo que não aparece em outras telas.
const APPOINTMENT_TAG_RE = /^@apt:(\S+)\n?/;

export function buildSaleObservations(appointmentId: string | undefined, text: string): string | undefined {
  const tag = appointmentId ? `@apt:${appointmentId}` : "";
  const combined = [tag, text.trim()].filter(Boolean).join("\n");
  return combined || undefined;
}

export function parseSaleObservations(raw: string | undefined): { appointmentId?: string; text?: string } {
  if (!raw) return {};
  const m = raw.match(APPOINTMENT_TAG_RE);
  if (!m) return { text: raw };
  const rest = raw.slice(m[0].length);
  return { appointmentId: m[1], text: rest || undefined };
}

export function receiptDescription(clientName?: string, animalName?: string): string {
  if (clientName && animalName) return `Recebimento: ${clientName} (${animalName})`;
  if (clientName) return `Recebimento: ${clientName}`;
  return "Recebimento de venda";
}

/**
 * Separa a lista "A, B (x, y), C" em itens — a vírgula dentro de parênteses
 * faz parte do nome ("PCR 3 (erlichia, babesia e anaplasma)").
 */
function splitItemList(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && ch === "," && text[i + 1] === " ") {
      out.push(current);
      current = "";
      i++;
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

/**
 * Itens de uma venda a partir da descrição gravada ("Venda: Fulano (Rex) —
 * Hemograma ×1, Consulta ×1" ou "Venda para Fulano: ..."): "Hemograma · Consulta".
 */
export function summarizeSaleItems(description: string, max = 2): string {
  const text = description || "";
  const sepIdx = text.indexOf(" — ") >= 0 ? text.indexOf(" — ") + 3 : text.indexOf(": ") >= 0 ? text.indexOf(": ") + 2 : -1;
  if (sepIdx < 0) return text;
  const items = splitItemList(text.slice(sepIdx))
    .map((item) => item.replace(/\s*[x×]\d+([.,]\d+)?$/i, "").trim())
    .filter(Boolean);
  if (items.length <= max) return items.join(" · ");
  const rest = items.length - max;
  return `${items.slice(0, max).join(" · ")} +${rest} ${rest > 1 ? "itens" : "item"}`;
}

/**
 * Dá baixa numa venda. Com `amount` omitido, recebe o saldo todo.
 * Retorna se o recebimento foi gravado.
 */
export async function receiveSalePayment(input: {
  sale: Pick<FinancialTransaction, "id" | "amount" | "paidAmount" | "status" | "relatedClientId" | "relatedAnimalId">;
  paymentMethod?: string;
  amount?: number;
  date?: string;
  time?: string;
  observations?: string;
  clientName?: string;
  animalName?: string;
}): Promise<boolean> {
  const amount = toCents(input.amount ?? saleBalance(input.sale));
  if (!(amount > 0)) return false;
  return addReceipt({
    saleId: input.sale.id,
    amount,
    paymentMethod: input.paymentMethod,
    date: input.date,
    time: input.time,
    observations: input.observations?.trim() || undefined,
    description: receiptDescription(input.clientName, input.animalName),
    relatedClientId: input.sale.relatedClientId,
    relatedAnimalId: input.sale.relatedAnimalId,
  });
}
