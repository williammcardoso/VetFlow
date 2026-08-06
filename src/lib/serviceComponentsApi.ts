import { supabase } from "@/integrations/supabase/client";

export interface ServiceComponent {
  id: string;
  serviceId: string;
  productId: string;
  quantity: number;
  productName?: string;
  productCost?: number;
  productStock?: number;
}

export async function getServiceComponents(serviceId: string): Promise<ServiceComponent[]> {
  const map = await getServiceComponentsByServiceIds([serviceId]);
  return map.get(serviceId) || [];
}

/** Busca componentes de vários serviços de uma vez. */
export async function getServiceComponentsByServiceIds(
  serviceIds: string[]
): Promise<Map<string, ServiceComponent[]>> {
  const map = new Map<string, ServiceComponent[]>();
  if (serviceIds.length === 0) return map;

  const { data, error } = await supabase
    .from("service_components")
    .select("*")
    .in("service_id", serviceIds);
  if (error) {
    console.error("[getServiceComponentsByServiceIds] error", error);
    return map;
  }

  const productIds = Array.from(new Set((data || []).map((r) => r.product_id as string)));
  const productsById = new Map<string, { name: string; cost: number; stock: number }>();
  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from("catalog_items")
      .select("id, name, cost, stock_qty")
      .in("id", productIds);
    for (const p of products || []) {
      productsById.set(p.id as string, {
        name: p.name as string,
        cost: Number(p.cost ?? 0),
        stock: Number(p.stock_qty ?? 0),
      });
    }
  }

  for (const r of data || []) {
    const product = productsById.get(r.product_id as string);
    const component: ServiceComponent = {
      id: r.id as string,
      serviceId: r.service_id as string,
      productId: r.product_id as string,
      quantity: Number(r.quantity),
      productName: product?.name,
      productCost: product?.cost,
      productStock: product?.stock,
    };
    const list = map.get(component.serviceId) || [];
    list.push(component);
    map.set(component.serviceId, list);
  }
  return map;
}

export async function setServiceComponents(
  serviceId: string,
  components: Array<{ productId: string; quantity: number }>
): Promise<boolean> {
  const { error: delError } = await supabase
    .from("service_components")
    .delete()
    .eq("service_id", serviceId);
  if (delError) {
    console.error("[setServiceComponents] delete error", delError);
    return false;
  }

  const unique = new Map<string, number>();
  for (const c of components) {
    if (!c.productId || c.quantity <= 0) continue;
    unique.set(c.productId, (unique.get(c.productId) || 0) + c.quantity);
  }
  const rows = Array.from(unique.entries()).map(([productId, quantity]) => ({
    service_id: serviceId,
    product_id: productId,
    quantity,
  }));
  if (rows.length === 0) return true;

  const { error } = await supabase.from("service_components").insert(rows);
  if (error) {
    console.error("[setServiceComponents] insert error", error);
    return false;
  }
  return true;
}

export function sumComponentsCost(components: ServiceComponent[]): number {
  return components.reduce(
    (sum, c) => sum + (c.productCost ?? 0) * c.quantity,
    0
  );
}
