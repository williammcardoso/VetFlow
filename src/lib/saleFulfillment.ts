import { adjustStock } from "@/lib/catalogApi";
import { addSaleItems, type NewSaleItem } from "@/lib/saleItemsApi";
import {
  resolveCartLineCosts,
  type ResolvedLineCost,
} from "@/lib/saleCosting";
import type { CatalogItem } from "@/mockData/catalog";

export interface SaleLineInput {
  catalogItemId: string;
  name: string;
  type: "product" | "service";
  category?: string;
  quantity: number;
  unitPrice: number;
}

export interface FulfilledSaleCosts {
  totalCost: number;
  totalProductCost: number;
  totalProviderCost: number;
  resolved: Map<string, ResolvedLineCost>;
}

/**
 * Grava itens da venda com custo separado (produto vs prestador) e baixa
 * estoque de produtos vendidos diretamente. Serviço não baixa mais insumo
 * por composição (ver saleCosting.ts) — o custo de insumo entra agregado no
 * Fechamento 50/50 via Compras de Estoque.
 */
export async function fulfillSaleLines(params: {
  saleId: string;
  lines: SaleLineInput[];
  catalog: CatalogItem[];
}): Promise<FulfilledSaleCosts> {
  const { saleId, lines, catalog } = params;
  const catalogById = new Map(catalog.map((c) => [c.id, c]));
  const resolved = await resolveCartLineCosts(
    lines.map((l) => ({ catalogItemId: l.catalogItemId, quantity: l.quantity })),
    catalogById
  );

  const saleItems: NewSaleItem[] = lines.map((line) => {
    const r = resolved.get(line.catalogItemId);
    const unitProduct = r?.unitProductCost ?? 0;
    const unitProvider = r?.unitProviderCost ?? 0;
    const qty = line.quantity;
    return {
      catalogItemId: line.catalogItemId,
      name: line.name,
      type: line.type,
      category: line.category,
      quantity: qty,
      unitPrice: line.unitPrice,
      productCost: unitProduct,
      providerCost: unitProvider,
      cost: unitProduct + unitProvider,
      costProvider: r?.costProvider,
      subtotal: line.unitPrice * qty,
    };
  });

  await addSaleItems(saleId, saleItems);

  // Baixa de estoque só de produtos vendidos diretamente (não de insumo por
  // composição de serviço, que não existe mais).
  const stockDeltas = new Map<string, number>();
  for (const line of lines) {
    const item = catalogById.get(line.catalogItemId);
    if (item?.type === "product") {
      stockDeltas.set(
        line.catalogItemId,
        (stockDeltas.get(line.catalogItemId) || 0) - line.quantity
      );
    }
  }

  await Promise.all(
    Array.from(stockDeltas.entries()).map(([id, delta]) => adjustStock(id, delta))
  );

  let totalProductCost = 0;
  let totalProviderCost = 0;
  for (const line of lines) {
    const r = resolved.get(line.catalogItemId);
    totalProductCost += (r?.unitProductCost ?? 0) * line.quantity;
    totalProviderCost += (r?.unitProviderCost ?? 0) * line.quantity;
  }

  return {
    totalCost: totalProductCost + totalProviderCost,
    totalProductCost,
    totalProviderCost,
    resolved,
  };
}
