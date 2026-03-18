import { supabase } from "@/integrations/supabase/client";
import type { CatalogItem, CatalogItemType } from "@/mockData/catalog";

const TABLE = "catalog_items";

function rowToItem(r: Record<string, unknown>): CatalogItem {
  return {
    id: r.id as string,
    name: r.name as string,
    type: r.type as CatalogItemType,
    price: Number(r.price),
    sku: r.sku as string | undefined,
    unit: r.unit as string | undefined,
    stockQty: r.stock_qty != null ? Number(r.stock_qty) : undefined,
    brand: r.brand as string | undefined,
    group: r.group as string | undefined,
    active: r.active === true,
    recommended: r.recommended === true,
  };
}

export async function getCatalog(): Promise<CatalogItem[]> {
  const { data, error } = await supabase.from(TABLE).select("*").order("name", { ascending: true });
  if (error) {
    console.error("[getCatalog] error", error);
    return [];
  }
  return (data || []).map(rowToItem);
}

export async function getCatalogByType(type: CatalogItemType): Promise<CatalogItem[]> {
  const list = await getCatalog();
  return list.filter((it) => it.type === type && it.active);
}

export async function findCatalogItem(id: string): Promise<CatalogItem | undefined> {
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();
  if (error || !data) return undefined;
  return rowToItem(data as Record<string, unknown>);
}

export async function addCatalogItem(
  item: Omit<CatalogItem, "id" | "active"> & { active?: boolean }
): Promise<CatalogItem | null> {
  const id = `${item.type === "product" ? "prod" : "serv"}-${Date.now()}`;
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      id,
      name: item.name,
      type: item.type,
      price: Number(item.price) || 0,
      sku: item.sku ?? null,
      unit: item.unit ?? null,
      stock_qty: item.type === "product" ? (item.stockQty ?? 0) : null,
      brand: item.brand ?? null,
      group: item.group ?? null,
      active: item.active ?? true,
      recommended: item.recommended ?? false,
    })
    .select()
    .single();
  if (error) {
    console.error("[addCatalogItem] error", error);
    return null;
  }
  return rowToItem(data as Record<string, unknown>);
}

export async function updateCatalogItem(updated: CatalogItem): Promise<boolean> {
  const { error } = await supabase
    .from(TABLE)
    .update({
      name: updated.name,
      type: updated.type,
      price: updated.price,
      sku: updated.sku ?? null,
      unit: updated.unit ?? null,
      stock_qty: updated.type === "product" ? (updated.stockQty ?? 0) : null,
      brand: updated.brand ?? null,
      group: updated.group ?? null,
      active: updated.active,
      recommended: updated.recommended ?? false,
    })
    .eq("id", updated.id);
  if (error) {
    console.error("[updateCatalogItem] error", error);
    return false;
  }
  return true;
}

export async function removeCatalogItem(id: string): Promise<boolean> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("[removeCatalogItem] error", error);
    return false;
  }
  return true;
}

export async function adjustStock(id: string, delta: number): Promise<boolean> {
  const item = await findCatalogItem(id);
  if (!item || item.type !== "product") return false;
  const current = item.stockQty || 0;
  const newQty = Math.max(0, current + delta);
  const { error } = await supabase.from(TABLE).update({ stock_qty: newQty }).eq("id", id);
  if (error) {
    console.error("[adjustStock] error", error);
    return false;
  }
  return true;
}
