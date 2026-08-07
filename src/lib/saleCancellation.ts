import {
  addFinancialTransaction,
  getFinancialTransactions,
  updateFinancialTransaction,
} from "@/lib/financialApi";
import { getSaleConsumptions, getSaleItems } from "@/lib/saleItemsApi";
import { adjustStock } from "@/lib/catalogApi";
import type { FinancialTransaction } from "@/mockData/financial";

export async function getReceiptsForSale(saleId: string): Promise<FinancialTransaction[]> {
  const list = await getFinancialTransactions();
  return list.filter(
    (t) =>
      t.type === "income" &&
      t.category === "Recebimento" &&
      (t.saleId === saleId || (t.description || "").includes(saleId))
  );
}

/** Só os recebimentos de verdade (positivos) — exclui estornos já lançados
 * anteriormente, que também ficam nessa mesma lista como valores negativos. */
async function getPositiveReceiptsForSale(saleId: string): Promise<FinancialTransaction[]> {
  const receipts = await getReceiptsForSale(saleId);
  return receipts.filter((r) => r.amount > 0);
}

// Soma dos recebimentos já estornados (entradas negativas geradas por um cancelamento anterior)
export async function getReversedAmountForSale(saleId: string): Promise<number> {
  const receipts = await getReceiptsForSale(saleId);
  return receipts.filter((r) => r.amount < 0).reduce((sum, r) => sum - r.amount, 0);
}

export interface CancelSaleResult {
  reversedReceiptsCount: number;
  reversedReceiptsTotal: number;
  restockedItemsCount: number;
}

export async function cancelSaleWithReversal(params: {
  saleId: string;
  reason: string;
}): Promise<CancelSaleResult | null> {
  const { saleId, reason } = params;
  const list = await getFinancialTransactions();
  const sale = list.find((t) => t.id === saleId && t.category === "Venda de Produtos");
  if (!sale) return null;
  if ((sale.status || "pending") === "cancelled") return null;

  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  // 1) Lançamento negativo para cada recebimento registrado nesta venda —
  // só os positivos, para não "des-estornar" um estorno anterior se essa
  // função rodar de novo por engano.
  const receipts = await getPositiveReceiptsForSale(saleId);
  for (const receipt of receipts) {
    await addFinancialTransaction({
      date,
      time,
      description: `Estorno do recebimento (venda ${saleId.slice(-8)}) — motivo: ${reason}`,
      type: "income",
      amount: -receipt.amount,
      category: "Recebimento",
      saleId,
      paymentMethod: receipt.paymentMethod,
      relatedClientId: sale.relatedClientId,
      relatedAnimalId: sale.relatedAnimalId,
    });
  }
  const reversedReceiptsTotal = receipts.reduce((s, r) => s + r.amount, 0);

  // 2) Reverter estoque: produtos vendidos + insumos da composição
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

  // 3) Cancelar a venda
  await updateFinancialTransaction(saleId, {
    status: "cancelled",
    cancelReason: reason,
    cancelledAt: now.toISOString(),
    paidAmount: 0,
  });

  return {
    reversedReceiptsCount: receipts.length,
    reversedReceiptsTotal,
    restockedItemsCount: restock.size,
  };
}
