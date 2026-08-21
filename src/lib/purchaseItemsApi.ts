import { supabase } from "@/integrations/supabase/client";

export interface PurchaseItem {
  id: string;
  transactionId: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

export type NewPurchaseItem = Omit<PurchaseItem, "id" | "transactionId">;

const TABLE = "purchase_items";

function rowToItem(r: Record<string, unknown>): PurchaseItem {
  return {
    id: r.id as string,
    transactionId: r.transaction_id as string,
    productId: (r.product_id as string) || undefined,
    productName: r.product_name as string,
    quantity: Number(r.quantity),
    unitCost: Number(r.unit_cost ?? 0),
    subtotal: Number(r.subtotal ?? 0),
  };
}

export async function addPurchaseItems(
  transactionId: string,
  items: NewPurchaseItem[]
): Promise<PurchaseItem[]> {
  if (items.length === 0) return [];
  const rows = items.map((item) => ({
    transaction_id: transactionId,
    product_id: item.productId ?? null,
    product_name: item.productName,
    quantity: item.quantity,
    unit_cost: item.unitCost,
    subtotal: item.subtotal,
  }));
  const { data, error } = await supabase.from(TABLE).insert(rows).select("*");
  if (error) {
    console.error("[addPurchaseItems] error", error);
    return [];
  }
  return (data || []).map(rowToItem);
}

/** Apaga todos os itens de uma compra — usado antes de regravar ao editar. */
export async function deletePurchaseItemsByTransaction(transactionId: string): Promise<boolean> {
  const { error } = await supabase.from(TABLE).delete().eq("transaction_id", transactionId);
  if (error) {
    console.error("[deletePurchaseItemsByTransaction] error", error);
    return false;
  }
  return true;
}

/** Busca itens de várias compras de uma vez (ex.: histórico, impressão em lote). */
export async function getPurchaseItemsByTransactionIds(
  transactionIds: string[]
): Promise<Map<string, PurchaseItem[]>> {
  const map = new Map<string, PurchaseItem[]>();
  if (transactionIds.length === 0) return map;
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .in("transaction_id", transactionIds)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[getPurchaseItemsByTransactionIds] error", error);
    return map;
  }
  for (const row of data || []) {
    const item = rowToItem(row);
    const list = map.get(item.transactionId) || [];
    list.push(item);
    map.set(item.transactionId, list);
  }
  return map;
}
