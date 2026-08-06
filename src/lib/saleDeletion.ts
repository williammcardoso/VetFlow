import { deleteFinancialTransaction, getFinancialTransactions } from "@/lib/financialApi";
import { deleteSaleItems, getSaleConsumptions, getSaleItems } from "@/lib/saleItemsApi";
import { adjustStock } from "@/lib/catalogApi";
import { getReceiptsForSale } from "@/lib/saleCancellation";

export type DeleteSaleOutcome =
  | { success: true }
  | { success: false; reason: "not_found" | "has_receipts" };

export async function deleteSaleIfEligible(saleId: string): Promise<DeleteSaleOutcome> {
  const list = await getFinancialTransactions();
  const sale = list.find((t) => t.id === saleId && t.category === "Venda de Produtos");
  if (!sale) return { success: false, reason: "not_found" };

  const receipts = await getReceiptsForSale(saleId);
  if (receipts.length > 0) return { success: false, reason: "has_receipts" };

  const items = await getSaleItems(saleId);
  const productItems = items.filter((i) => i.type === "product" && i.catalogItemId);
  const consumptions = await getSaleConsumptions(saleId);
  const restock = new Map<string, number>();
  for (const i of productItems) {
    restock.set(
      i.catalogItemId as string,
      (restock.get(i.catalogItemId as string) || 0) + i.quantity
    );
  }
  for (const c of consumptions) {
    restock.set(c.productId, (restock.get(c.productId) || 0) + c.quantity);
  }
  await Promise.all(
    Array.from(restock.entries()).map(([id, qty]) => adjustStock(id, qty))
  );

  await deleteSaleItems(saleId);
  await deleteFinancialTransaction(saleId);

  return { success: true };
}
