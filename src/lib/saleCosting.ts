import type { CatalogItem } from "@/mockData/catalog";
import {
  getServiceComponentsByServiceIds,
  type ServiceComponent,
} from "@/lib/serviceComponentsApi";

export interface ResolvedLineCost {
  catalogItemId: string;
  /** Custo unitário de produtos/insumos */
  unitProductCost: number;
  /** Custo unitário de repasse a prestador */
  unitProviderCost: number;
  /** unitProductCost + unitProviderCost */
  unitCost: number;
  costProvider?: string;
  /** Insumos por 1 unidade do serviço vendido */
  consumptions: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
  }>;
}

/**
 * Resolve custo de produto vs prestador + insumos (BOM) para itens do carrinho.
 * - Produto vendido: productCost = catalog.cost
 * - Serviço com prestador: providerCost = catalog.cost (se houver costProvider ou cost)
 * - Serviço com composição: productCost += soma dos insumos
 */
export async function resolveCartLineCosts(
  lines: Array<{ catalogItemId: string; quantity: number }>,
  catalogById: Map<string, CatalogItem>
): Promise<Map<string, ResolvedLineCost>> {
  const serviceIds = lines
    .map((l) => catalogById.get(l.catalogItemId))
    .filter((item): item is CatalogItem => !!item && item.type === "service")
    .map((item) => item.id);

  const componentsByService = await getServiceComponentsByServiceIds(serviceIds);
  const result = new Map<string, ResolvedLineCost>();

  for (const line of lines) {
    const item = catalogById.get(line.catalogItemId);
    if (!item) continue;

    const components: ServiceComponent[] = componentsByService.get(item.id) || [];
    const consumptions = components.map((c) => ({
      productId: c.productId,
      productName: c.productName || "Insumo",
      quantity: c.quantity,
      unitCost: c.productCost ?? 0,
    }));
    const bomUnitCost = consumptions.reduce(
      (s, c) => s + c.unitCost * c.quantity,
      0
    );

    let unitProductCost = 0;
    let unitProviderCost = 0;
    let costProvider = item.costProvider;

    if (item.type === "product") {
      unitProductCost = item.cost ?? 0;
    } else {
      unitProductCost = bomUnitCost;
      // Repasse externo fica separado dos insumos
      if ((item.cost ?? 0) > 0) {
        unitProviderCost = item.cost ?? 0;
        if (!costProvider) {
          costProvider =
            item.category === "exame_externo"
              ? "Laboratório externo"
              : "Prestador externo";
        }
      }
    }

    result.set(item.id, {
      catalogItemId: item.id,
      unitProductCost,
      unitProviderCost,
      unitCost: unitProductCost + unitProviderCost,
      costProvider: unitProviderCost > 0 ? costProvider : undefined,
      consumptions,
    });
  }

  return result;
}

export function totalProductCostFromResolved(
  lines: Array<{ catalogItemId: string; quantity: number }>,
  resolved: Map<string, ResolvedLineCost>
): number {
  return lines.reduce((sum, line) => {
    const r = resolved.get(line.catalogItemId);
    return sum + (r?.unitProductCost ?? 0) * line.quantity;
  }, 0);
}

export function totalProviderCostFromResolved(
  lines: Array<{ catalogItemId: string; quantity: number }>,
  resolved: Map<string, ResolvedLineCost>
): number {
  return lines.reduce((sum, line) => {
    const r = resolved.get(line.catalogItemId);
    return sum + (r?.unitProviderCost ?? 0) * line.quantity;
  }, 0);
}
