import { supabase } from "@/integrations/supabase/client";
import type { FinancialTransaction, OverallFinancialSummary } from "@/mockData/financial";

const TABLE = "financial_transactions";

function rowToTransaction(r: Record<string, unknown>): FinancialTransaction {
  return {
    id: r.id as string,
    date: r.date as string,
    time: (r.time as string) || "",
    description: r.description as string,
    type: r.type as "income" | "expense",
    amount: Number(r.amount),
    category: (r.category as string) || "",
    relatedAnimalId: r.related_animal_id as string | undefined,
    relatedClientId: r.related_client_id as string | undefined,
    paymentMethod: r.payment_method as string | undefined,
    status: r.status as FinancialTransaction["status"],
    paidAmount: r.paid_amount != null ? Number(r.paid_amount) : undefined,
    responsible: r.responsible as string | undefined,
    observations: r.observations as string | undefined,
    paymentInstallments: r.payment_installments != null ? Number(r.payment_installments) : undefined,
    saleId: r.sale_id as string | undefined,
    supplierCost: r.supplier_cost != null ? Number(r.supplier_cost) : undefined,
    financialFee: r.financial_fee != null ? Number(r.financial_fee) : undefined,
    discountAmount: r.discount_amount != null ? Number(r.discount_amount) : undefined,
    surchargeAmount: r.surcharge_amount != null ? Number(r.surcharge_amount) : undefined,
    cancelReason: r.cancel_reason as string | undefined,
    cancelledAt: r.cancelled_at as string | undefined,
    purchaseGroupId: r.purchase_group_id as string | undefined,
    installmentLabel: r.installment_label as string | undefined,
  };
}

export async function getFinancialTransactions(): Promise<FinancialTransaction[]> {
  const { data, error } = await supabase.from(TABLE).select("*").order("date", { ascending: false }).order("time", { ascending: false });
  if (error) {
    console.error("[getFinancialTransactions] error", error);
    return [];
  }
  return (data || []).map(rowToTransaction);
}

export async function getOverallFinancialSummary(): Promise<OverallFinancialSummary> {
  const list = await getFinancialTransactions();
  const totalRevenue = list.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = list.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  return { totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses };
}

function generateTransactionId(): string {
  return `ft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function addFinancialTransaction(
  newTransaction: Omit<FinancialTransaction, "id">
): Promise<FinancialTransaction | null> {
  const id = generateTransactionId();
  const insertObj = {
    id,
    date: newTransaction.date,
    time: newTransaction.time,
    description: newTransaction.description,
    type: newTransaction.type,
    amount: newTransaction.amount,
    category: newTransaction.category,
    related_animal_id: newTransaction.relatedAnimalId ?? null,
    related_client_id: newTransaction.relatedClientId ?? null,
    payment_method: newTransaction.paymentMethod ?? null,
    status: newTransaction.status ?? null,
    paid_amount: newTransaction.paidAmount ?? 0,
    responsible: newTransaction.responsible ?? null,
    observations: newTransaction.observations ?? null,
    payment_installments: newTransaction.paymentInstallments ?? null,
    sale_id: newTransaction.saleId ?? null,
    supplier_cost: newTransaction.supplierCost ?? 0,
    financial_fee: newTransaction.financialFee ?? 0,
    discount_amount: newTransaction.discountAmount ?? 0,
    surcharge_amount: newTransaction.surchargeAmount ?? 0,
    purchase_group_id: newTransaction.purchaseGroupId ?? null,
    installment_label: newTransaction.installmentLabel ?? null,
  };
  const { data, error } = await supabase.from(TABLE).insert(insertObj).select().single();
  if (error) {
    console.error("[addFinancialTransaction] error", error);
    return null;
  }
  return rowToTransaction(data as Record<string, unknown>);
}

export async function updateFinancialTransaction(id: string, changes: Partial<FinancialTransaction>): Promise<boolean> {
  const updates: Record<string, unknown> = {};
  if (changes.date != null) updates.date = changes.date;
  if (changes.time != null) updates.time = changes.time;
  if (changes.description != null) updates.description = changes.description;
  if (changes.type != null) updates.type = changes.type;
  if (changes.amount != null) updates.amount = changes.amount;
  if (changes.category != null) updates.category = changes.category;
  if (changes.relatedAnimalId != null) updates.related_animal_id = changes.relatedAnimalId;
  if (changes.relatedClientId != null) updates.related_client_id = changes.relatedClientId;
  if (changes.paymentMethod != null) updates.payment_method = changes.paymentMethod;
  if (changes.status != null) updates.status = changes.status;
  if (changes.paidAmount != null) updates.paid_amount = changes.paidAmount;
  if (changes.responsible != null) updates.responsible = changes.responsible;
  if (changes.observations != null) updates.observations = changes.observations;
  if (changes.paymentInstallments != null) updates.payment_installments = changes.paymentInstallments;
  if (changes.saleId != null) updates.sale_id = changes.saleId;
  if (changes.supplierCost != null) updates.supplier_cost = changes.supplierCost;
  if (changes.financialFee != null) updates.financial_fee = changes.financialFee;
  if (changes.discountAmount != null) updates.discount_amount = changes.discountAmount;
  if (changes.surchargeAmount != null) updates.surcharge_amount = changes.surchargeAmount;
  if (changes.cancelReason != null) updates.cancel_reason = changes.cancelReason;
  if (changes.cancelledAt != null) updates.cancelled_at = changes.cancelledAt;
  if (Object.keys(updates).length === 0) return true;
  const { error } = await supabase.from(TABLE).update(updates).eq("id", id);
  if (error) {
    console.error("[updateFinancialTransaction] error", error);
    return false;
  }
  return true;
}

export async function sumReceiptsForSale(saleId: string): Promise<number> {
  const list = await getFinancialTransactions();
  const receipts = list.filter(
    (t) =>
      t.type === "income" &&
      t.category === "Recebimento" &&
      (t.saleId === saleId || (t.description || "").includes(saleId))
  );
  return receipts.reduce((s, r) => s + r.amount, 0);
}

export async function registerReceiptWithSale(data: {
  saleId: string;
  amount: number;
  date: string;
  time: string;
  paymentMethod?: string;
  description?: string;
  relatedClientId?: string;
  relatedAnimalId?: string;
}): Promise<void> {
  await addFinancialTransaction({
    date: data.date,
    time: data.time,
    description: data.description || `Recebimento da venda ${data.saleId}`,
    type: "income",
    amount: data.amount,
    category: "Recebimento",
    paymentMethod: data.paymentMethod,
    saleId: data.saleId,
    relatedClientId: data.relatedClientId,
    relatedAnimalId: data.relatedAnimalId,
  });
  const paid = await sumReceiptsForSale(data.saleId);
  const list = await getFinancialTransactions();
  const sale = list.find((t) => t.id === data.saleId && t.category === "Venda de Produtos");
  if (sale) {
    const newStatus: FinancialTransaction["status"] =
      paid >= sale.amount ? "paid" : paid > 0 ? "partial" : "pending";
    await updateFinancialTransaction(sale.id, { paidAmount: paid, status: newStatus });
  }
}

export async function addReceipt(data: {
  saleId?: string;
  amount: number;
  paymentMethod?: string;
  description?: string;
  relatedClientId?: string;
  relatedAnimalId?: string;
  date?: string;
  time?: string;
  observations?: string;
}): Promise<void> {
  const now = new Date();
  await addFinancialTransaction({
    date: data.date || now.toISOString().split("T")[0],
    time: data.time || now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    description: data.description || "Recebimento",
    type: "income",
    amount: data.amount,
    category: "Recebimento",
    paymentMethod: data.paymentMethod,
    saleId: data.saleId,
    relatedClientId: data.relatedClientId,
    relatedAnimalId: data.relatedAnimalId,
    observations: data.observations,
  });
  if (data.saleId) {
    const paid = await sumReceiptsForSale(data.saleId);
    const list = await getFinancialTransactions();
    const sale = list.find((t) => t.id === data.saleId && t.category === "Venda de Produtos");
    if (sale) {
      const newStatus = paid >= sale.amount ? "paid" : paid > 0 ? "partial" : "pending";
      await updateFinancialTransaction(sale.id, { paidAmount: paid, status: newStatus });
    }
  }
}

export async function deleteFinancialTransaction(id: string): Promise<boolean> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("[deleteFinancialTransaction] error", error);
    return false;
  }
  return true;
}

export async function removeReceipt(receiptId: string): Promise<boolean> {
  const list = await getFinancialTransactions();
  const removed = list.find((t) => t.id === receiptId);
  if (!removed) return false;
  const saleId = removed.category === "Recebimento" && removed.saleId ? removed.saleId : undefined;
  const { error } = await supabase.from(TABLE).delete().eq("id", receiptId);
  if (error) {
    console.error("[removeReceipt] error", error);
    return false;
  }
  if (saleId) {
    const paid = await sumReceiptsForSale(saleId);
    const sale = list.find((t) => t.id === saleId && t.category === "Venda de Produtos");
    if (sale) {
      const newStatus: FinancialTransaction["status"] =
        paid >= sale.amount ? "paid" : paid > 0 ? "partial" : "pending";
      await updateFinancialTransaction(sale.id, { paidAmount: paid, status: newStatus });
    }
  }
  return true;
}
