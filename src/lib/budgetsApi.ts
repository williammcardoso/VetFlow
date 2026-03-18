import { supabase } from "@/integrations/supabase/client";
import type { Budget, BudgetItem as BudgetItemType, BudgetStatus } from "@/mockData/budgets";

const BUDGETS_TABLE = "budgets";
const ITEMS_TABLE = "budget_items";

function mapBudgetRow(r: Record<string, unknown>, items: BudgetItemType[]): Budget {
  return {
    id: r.id as string,
    clientId: r.client_id as string | undefined,
    animalId: r.animal_id as string | undefined,
    date: r.date as string,
    status: r.status as BudgetStatus,
    notes: r.notes as string | undefined,
    items,
  };
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
    date: data.date || new Date().toISOString().split("T")[0],
    status: data.status || "draft",
    notes: data.notes ?? null,
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
    { id, client_id: data.clientId, animal_id: data.animalId, date: data.date || "", status: data.status || "draft", notes: data.notes },
    items
  );
}

export async function updateBudget(updated: Budget): Promise<boolean> {
  const { error: budgetError } = await supabase
    .from(BUDGETS_TABLE)
    .update({
      client_id: updated.clientId ?? null,
      animal_id: updated.animalId ?? null,
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
