import { supabase } from "@/integrations/supabase/client";
import type { PurchaseOrder, PurchaseOrderItem, POStatus } from "@/mockData/registry";

const PO_TABLE = "purchase_orders";
const ITEMS_TABLE = "purchase_order_items";

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const { data: poData, error: poError } = await supabase.from(PO_TABLE).select("*").order("date", { ascending: false });
  if (poError) {
    console.error("[getPurchaseOrders] error", poError);
    return [];
  }
  const orders = poData || [];
  const { data: itemsData } = await supabase.from(ITEMS_TABLE).select("*");
  const itemsByPo = new Map<string, PurchaseOrderItem[]>();
  (itemsData || []).forEach((row: Record<string, unknown>) => {
    const list = itemsByPo.get(row.purchase_order_id as string) || [];
    list.push({
      itemId: row.item_id as string,
      name: row.name as string,
      qty: Number(row.qty),
    });
    itemsByPo.set(row.purchase_order_id as string, list);
  });
  return orders.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    supplier: r.supplier as string | undefined,
    date: r.date as string,
    status: r.status as POStatus,
    items: itemsByPo.get(r.id as string) || [],
    notes: r.notes as string | undefined,
  }));
}

export async function addPurchaseOrder(
  po: Omit<PurchaseOrder, "id" | "status" | "date"> & { date?: string; status?: POStatus }
): Promise<PurchaseOrder | null> {
  const id = `po-${Date.now()}`;
  const { error: poError } = await supabase.from(PO_TABLE).insert({
    id,
    supplier: po.supplier ?? null,
    date: po.date || new Date().toISOString().split("T")[0],
    status: po.status || "open",
    notes: po.notes ?? null,
  });
  if (poError) {
    console.error("[addPurchaseOrder] error", poError);
    return null;
  }
  const items = po.items || [];
  if (items.length > 0) {
    const rows = items.map((it) => ({
      purchase_order_id: id,
      item_id: it.itemId,
      name: it.name,
      qty: it.qty,
    }));
    await supabase.from(ITEMS_TABLE).insert(rows);
  }
  return {
    id,
    supplier: po.supplier,
    date: po.date || new Date().toISOString().split("T")[0],
    status: po.status || "open",
    items,
    notes: po.notes,
  };
}

export async function updatePurchaseOrder(updated: PurchaseOrder): Promise<boolean> {
  const { error: poError } = await supabase
    .from(PO_TABLE)
    .update({
      supplier: updated.supplier ?? null,
      date: updated.date,
      status: updated.status,
      notes: updated.notes ?? null,
    })
    .eq("id", updated.id);
  if (poError) {
    console.error("[updatePurchaseOrder] error", poError);
    return false;
  }
  await supabase.from(ITEMS_TABLE).delete().eq("purchase_order_id", updated.id);
  if ((updated.items || []).length > 0) {
    const rows = (updated.items || []).map((it) => ({
      purchase_order_id: updated.id,
      item_id: it.itemId,
      name: it.name,
      qty: it.qty,
    }));
    await supabase.from(ITEMS_TABLE).insert(rows);
  }
  return true;
}

export async function updatePurchaseOrderStatus(id: string, status: POStatus): Promise<boolean> {
  const { error } = await supabase.from(PO_TABLE).update({ status }).eq("id", id);
  if (error) {
    console.error("[updatePurchaseOrderStatus] error", error);
    return false;
  }
  return true;
}

export async function removePurchaseOrder(id: string): Promise<boolean> {
  const { error } = await supabase.from(PO_TABLE).delete().eq("id", id);
  if (error) {
    console.error("[removePurchaseOrder] error", error);
    return false;
  }
  return true;
}
