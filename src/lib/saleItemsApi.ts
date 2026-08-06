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
  productCost?: number;
  providerCost?: number;
  costProvider?: string;
  subtotal: number;
}

export interface SaleItemConsumption {
  id: string;
  saleId: string;
  saleItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
}

export type NewSaleItem = Omit<SaleItem, "id" | "saleId"> & {
  consumptions?: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
  }>;
};

function rowToSaleItem(r: Record<string, unknown>): SaleItem {
  const cost = Number(r.cost ?? 0);
  const productCost =
    r.product_cost != null ? Number(r.product_cost) : undefined;
  const providerCost =
    r.provider_cost != null ? Number(r.provider_cost) : undefined;
  return {
    id: r.id as string,
    saleId: r.sale_id as string,
    catalogItemId: r.catalog_item_id as string | undefined,
    name: r.name as string,
    type: r.type as "product" | "service",
    category: r.category as string | undefined,
    quantity: Number(r.quantity),
    unitPrice: Number(r.unit_price),
    cost,
    productCost,
    providerCost,
    costProvider: (r.cost_provider as string | undefined) || undefined,
    subtotal: Number(r.subtotal),
  };
}

function rowToConsumption(r: Record<string, unknown>): SaleItemConsumption {
  return {
    id: r.id as string,
    saleId: r.sale_id as string,
    saleItemId: String(r.sale_item_id),
    productId: r.product_id as string,
    productName: r.product_name as string,
    quantity: Number(r.quantity),
    unitCost: Number(r.unit_cost ?? 0),
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
  items: NewSaleItem[]
): Promise<SaleItem[]> {
  if (items.length === 0) return [];
  const rows = items.map((item) => {
    const productCost = item.productCost ?? 0;
    const providerCost = item.providerCost ?? 0;
    const cost = item.cost ?? productCost + providerCost;
    return {
      sale_id: saleId,
      catalog_item_id: item.catalogItemId ?? null,
      name: item.name,
      type: item.type,
      category: item.category ?? null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      cost,
      product_cost: productCost,
      provider_cost: providerCost,
      cost_provider: item.costProvider ?? null,
      subtotal: item.subtotal,
    };
  });
  const { data, error } = await supabase.from("sale_items").insert(rows).select("*");
  if (error) {
    console.error("[addSaleItems] error", error);
    return [];
  }
  const inserted = (data || []).map(rowToSaleItem);

  // Snapshot de insumos — casamos por ordem de inserção
  const consumptionRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < inserted.length; i++) {
    const cons = items[i]?.consumptions || [];
    for (const c of cons) {
      if (c.quantity <= 0) continue;
      consumptionRows.push({
        sale_id: saleId,
        sale_item_id: inserted[i].id,
        product_id: c.productId,
        product_name: c.productName,
        quantity: c.quantity,
        unit_cost: c.unitCost,
      });
    }
  }
  if (consumptionRows.length > 0) {
    const { error: consError } = await supabase
      .from("sale_item_consumptions")
      .insert(consumptionRows);
    if (consError) {
      console.error("[addSaleItems] consumptions error", consError);
    }
  }

  return inserted;
}

/** Busca itens de várias vendas (ex.: relatório de repasses por prestador). */
export async function getSaleItemsBySaleIds(saleIds: string[]): Promise<SaleItem[]> {
  if (saleIds.length === 0) return [];
  const { data, error } = await supabase
    .from("sale_items")
    .select("*")
    .in("sale_id", saleIds);
  if (error) {
    console.error("[getSaleItemsBySaleIds] error", error);
    return [];
  }
  return (data || []).map(rowToSaleItem);
}

export async function getSaleConsumptions(saleId: string): Promise<SaleItemConsumption[]> {
  const { data, error } = await supabase
    .from("sale_item_consumptions")
    .select("*")
    .eq("sale_id", saleId);
  if (error) {
    console.error("[getSaleConsumptions] error", error);
    return [];
  }
  return (data || []).map(rowToConsumption);
}

export async function getSaleConsumptionsBySaleIds(
  saleIds: string[]
): Promise<SaleItemConsumption[]> {
  if (saleIds.length === 0) return [];
  const { data, error } = await supabase
    .from("sale_item_consumptions")
    .select("*")
    .in("sale_id", saleIds);
  if (error) {
    console.error("[getSaleConsumptionsBySaleIds] error", error);
    return [];
  }
  return (data || []).map(rowToConsumption);
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
