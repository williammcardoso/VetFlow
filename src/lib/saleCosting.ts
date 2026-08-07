import type { CatalogItem } from "@/mockData/catalog";

export interface ResolvedLineCost {
  catalogItemId: string;
  /** Custo unitário de produtos/insumos */
  unitProductCost: number;
  /** Custo unitário de repasse a prestador */
  unitProviderCost: number;
  /** unitProductCost + unitProviderCost */
  unitCost: number;
  costProvider?: string;
}

/**
 * Resolve custo de produto vs prestador para itens do carrinho.
 * - Produto vendido: productCost = catalog.cost
 * - Serviço com prestador: providerCost = catalog.cost (se houver costProvider ou cost)
 *
 * O custo de insumo por composição (BOM) foi removido (2026-08-07): o modelo
 * de negócio mudou — a agropecuária passou a funcionar como almoxarifado, e o
 * custo de insumos/produtos agora entra no Fechamento 50/50 como despesa
 * agregada do mês (Compras de Estoque), não mais rateado por venda/serviço.
 * Serviço vendido sem repasse externo não carrega custo de produto nenhum.
 */
export async function resolveCartLineCosts(
  lines: Array<{ catalogItemId: string; quantity: number }>,
  catalogById: Map<string, CatalogItem>
): Promise<Map<string, ResolvedLineCost>> {
  const result = new Map<string, ResolvedLineCost>();

  for (const line of lines) {
    const item = catalogById.get(line.catalogItemId);
    if (!item) continue;

    let unitProductCost = 0;
    let unitProviderCost = 0;
    let costProvider = item.costProvider;

    if (item.type === "product") {
      unitProductCost = item.cost ?? 0;
    } else if ((item.cost ?? 0) > 0) {
      unitProviderCost = item.cost ?? 0;
      if (!costProvider) {
        costProvider =
          item.category === "exame_externo"
            ? "Laboratório externo"
            : "Prestador externo";
      }
    }

    result.set(item.id, {
      catalogItemId: item.id,
      unitProductCost,
      unitProviderCost,
      unitCost: unitProductCost + unitProviderCost,
      costProvider: unitProviderCost > 0 ? costProvider : undefined,
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
