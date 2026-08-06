import { supabase } from "@/integrations/supabase/client";
import type { Budget, BudgetItem as BudgetItemType, BudgetStatus } from "@/mockData/budgets";

const BUDGETS_TABLE = "budgets";
const ITEMS_TABLE = "budget_items";

function mapBudgetRow(r: Record<string, unknown>, items: BudgetItemType[]): Budget {
  return {
    id: r.id as string,
    clientId: r.client_id as string | undefined,
    animalId: r.animal_id as string | undefined,
    // Snapshot do momento da emissão — o PDF do orçamento imprime estes
    // valores, então precisam sobreviver a mudanças no cadastro do cliente.
    clientName: r.client_name as string | undefined,
    animalName: r.animal_name as string | undefined,
    clientPhone: r.client_phone as string | undefined,
    date: r.date as string,
    status: r.status as BudgetStatus,
    notes: r.notes as string | undefined,
    paymentMethod: r.payment_method as string | undefined,
    discountAmount: r.discount_amount != null ? Number(r.discount_amount) : undefined,
    surchargeAmount: r.surcharge_amount != null ? Number(r.surcharge_amount) : undefined,
    items,
  };
}

/** Grava a forma de pagamento no momento da conversão em venda. */
export async function setBudgetPaymentMethod(id: string, paymentMethod?: string): Promise<boolean> {
  const { error } = await supabase
    .from(BUDGETS_TABLE)
    .update({ payment_method: paymentMethod ?? null })
    .eq("id", id);
  if (error) {
    console.error("[setBudgetPaymentMethod] error", error);
    return false;
  }
  return true;
}

export async function getBudgets(): Promise<Budget[]> {
  const { data: budgetsData, error: budgetsError } = await supabase
    .from(BUDGETS_TABLE)
    .select("*")
    .order("date", { ascending: false });
  if (budgetsError) {
    console.error("[getBudgets] error", budgetsError);
    return [];
  }
  const budgets = budgetsData || [];
  const { data: itemsData } = await supabase.from(ITEMS_TABLE).select("*");
  const itemsByBudget = new Map<string, BudgetItemType[]>();
  (itemsData || []).forEach((row: Record<string, unknown>) => {
    const list = itemsByBudget.get(row.budget_id as string) || [];
    list.push({
      itemId: row.item_id as string,
      name: row.name as string,
      qty: Number(row.qty),
      price: Number(row.price),
    });
    itemsByBudget.set(row.budget_id as string, list);
  });
  return budgets.map((r: Record<string, unknown>) =>
    mapBudgetRow(r, itemsByBudget.get(r.id as string) || [])
  );
}

export async function addBudget(
  data: Omit<Budget, "id" | "status" | "date"> & { status?: BudgetStatus; date?: string }
): Promise<Budget | null> {
  const id = `bud-${Date.now()}`;
  const { error: budgetError } = await supabase.from(BUDGETS_TABLE).insert({
    id,
    client_id: data.clientId ?? null,
    animal_id: data.animalId ?? null,
    client_name: data.clientName ?? null,
    animal_name: data.animalName ?? null,
    client_phone: data.clientPhone ?? null,
    date: data.date || new Date().toISOString().split("T")[0],
    status: data.status || "draft",
    notes: data.notes ?? null,
    discount_amount: data.discountAmount ?? 0,
    surcharge_amount: data.surchargeAmount ?? 0,
  });
  if (budgetError) {
    console.error("[addBudget] error", budgetError);
    return null;
  }
  const items = data.items || [];
  if (items.length > 0) {
    const rows = items.map((it) => ({
      budget_id: id,
      item_id: it.itemId,
      name: it.name,
      qty: it.qty,
      price: it.price,
    }));
    const { error: itemsError } = await supabase.from(ITEMS_TABLE).insert(rows);
    if (itemsError) console.error("[addBudget] items error", itemsError);
  }
  return mapBudgetRow(
    {
      id,
      client_id: data.clientId,
      animal_id: data.animalId,
      client_name: data.clientName,
      animal_name: data.animalName,
      client_phone: data.clientPhone,
      date: data.date || "",
      status: data.status || "draft",
      notes: data.notes,
      discount_amount: data.discountAmount ?? 0,
      surcharge_amount: data.surchargeAmount ?? 0,
    },
    items
  );
}

export async function updateBudget(updated: Budget): Promise<boolean> {
  const { error: budgetError } = await supabase
    .from(BUDGETS_TABLE)
    .update({
      client_id: updated.clientId ?? null,
      animal_id: updated.animalId ?? null,
      client_name: updated.clientName ?? null,
      animal_name: updated.animalName ?? null,
      client_phone: updated.clientPhone ?? null,
      date: updated.date,
      status: updated.status,
      notes: updated.notes ?? null,
    })
    .eq("id", updated.id);
  if (budgetError) {
    console.error("[updateBudget] error", budgetError);
    return false;
  }
  await supabase.from(ITEMS_TABLE).delete().eq("budget_id", updated.id);
  if ((updated.items || []).length > 0) {
    const rows = (updated.items || []).map((it) => ({
      budget_id: updated.id,
      item_id: it.itemId,
      name: it.name,
      qty: it.qty,
      price: it.price,
    }));
    await supabase.from(ITEMS_TABLE).insert(rows);
  }
  return true;
}

export async function updateBudgetStatus(id: string, status: BudgetStatus): Promise<boolean> {
  const { error } = await supabase.from(BUDGETS_TABLE).update({ status }).eq("id", id);
  if (error) {
    console.error("[updateBudgetStatus] error", error);
    return false;
  }
  return true;
}

export async function removeBudget(id: string): Promise<boolean> {
  const { error } = await supabase.from(BUDGETS_TABLE).delete().eq("id", id);
  if (error) {
    console.error("[removeBudget] error", error);
    return false;
  }
  return true;
}
