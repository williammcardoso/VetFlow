import {
  addFinancialTransaction,
  getFinancialTransaction,
  listReceiptsForSale,
  updateFinancialTransaction,
} from "@/lib/financialApi";
import { getTodayLocalISO } from "@/lib/utils";
import { nowTimeHHMM } from "@/lib/salePayment";
import { getSaleConsumptions, getSaleItems } from "@/lib/saleItemsApi";
import { adjustStock } from "@/lib/catalogApi";
import type { FinancialTransaction } from "@/mockData/financial";

/** Recebimentos (e estornos) da venda — busca só os dela, não a tabela inteira. */
export async function getReceiptsForSale(saleId: string): Promise<FinancialTransaction[]> {
  return listReceiptsForSale(saleId);
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
  const found = await getFinancialTransaction(saleId);
  const sale = found && found.category === "Venda de Produtos" ? found : null;
  if (!sale) return null;
  if ((sale.status || "pending") === "cancelled") return null;

  // Data/hora locais (toISOString é UTC: depois das 21h caía no dia seguinte).
  const now = new Date();
  const date = getTodayLocalISO();
  const time = nowTimeHHMM(now);

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
