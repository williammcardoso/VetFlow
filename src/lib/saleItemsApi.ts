import { supabase } from "@/integrations/supabase/client";

export interface SaleItem {
  id: string;
  saleId: string;
  catalogItemId?: string;
  name: string;
  type: "product" | "service";
  category?: string;
  quantity: number;
  unitPrice: number;
  cost: number;
  subtotal: number;
}

function rowToSaleItem(r: Record<string, unknown>): SaleItem {
  return {
    id: r.id as string,
    saleId: r.sale_id as string,
    catalogItemId: r.catalog_item_id as string | undefined,
    name: r.name as string,
    type: r.type as "product" | "service",
    category: r.category as string | undefined,
    quantity: Number(r.quantity),
    unitPrice: Number(r.unit_price),
    cost: Number(r.cost ?? 0),
    subtotal: Number(r.subtotal),
  };
}

export async function getSaleItems(saleId: string): Promise<SaleItem[]> {
  const { data, error } = await supabase
    .from("sale_items")
    .select("*")
    .eq("sale_id", saleId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[getSaleItems] error", error);
    return [];
  }
  return (data || []).map(rowToSaleItem);
}

export async function addSaleItems(
  saleId: string,
  items: Omit<SaleItem, "id" | "saleId">[]
): Promise<boolean> {
  if (items.length === 0) return true;
  const rows = items.map((item) => ({
    sale_id: saleId,
    catalog_item_id: item.catalogItemId ?? null,
    name: item.name,
    type: item.type,
    category: item.category ?? null,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    cost: item.cost ?? 0,
    subtotal: item.subtotal,
  }));
  const { error } = await supabase.from("sale_items").insert(rows);
  if (error) {
    console.error("[addSaleItems] error", error);
    return false;
  }
  return true;
}

export async function deleteSaleItems(saleId: string): Promise<boolean> {
  const { error } = await supabase
    .from("sale_items")
    .delete()
    .eq("sale_id", saleId);
  if (error) {
    console.error("[deleteSaleItems] error", error);
    return false;
  }
  return true;
}
