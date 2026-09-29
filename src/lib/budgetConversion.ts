import type { Budget } from "@/mockData/budgets";
import type { CatalogItem } from "@/mockData/catalog";
import { addFinancialTransaction } from "@/lib/financialApi";
import { addSaleItems } from "@/lib/saleItemsApi";
import { fulfillSaleLines } from "@/lib/saleFulfillment";
import { resolveCartLineCosts } from "@/lib/saleCosting";
import { setBudgetPaymentMethod, updateBudgetStatus } from "@/lib/budgetsApi";
import { formatItemQty, getTodayLocalISO } from "@/lib/utils";
import { buildSaleObservations, nowTimeHHMM, receiveSalePayment, toCents, type PayMode } from "@/lib/salePayment";

// Orçamento → venda num lugar só (tela de Orçamentos e prontuário). Antes
// eram duas implementações diferentes: a do prontuário ignorava o desconto e
// o acréscimo negociados, não calculava o custo (repasse) e gravava item fora
// do catálogo sem sale_items — o mesmo orçamento virava vendas de valores
// diferentes conforme a tela.

/** Valor negociado do orçamento: itens − desconto + acréscimo. */
export function budgetTotal(budget: Pick<Budget, "items" | "discountAmount" | "surchargeAmount">): number {
  const subtotal = budget.items.reduce((sum, it) => sum + it.qty * it.price, 0);
  return Math.max(0, toCents(subtotal - (budget.discountAmount ?? 0) + (budget.surchargeAmount ?? 0)));
}

export interface ConvertBudgetResult {
  ok: boolean;
  saleId?: string;
  /** "Recebido agora": o recebimento foi gravado junto. */
  received?: boolean;
  error?: string;
}

export async function convertBudgetToSale(input: {
  budget: Budget;
  catalogItems: CatalogItem[];
  payMode: PayMode;
  paymentMethod?: string;
  /** Atendimento a que a venda fica vinculada (prontuário). */
  appointmentId?: string;
  responsible?: string;
  clientName?: string;
  animalName?: string;
}): Promise<ConvertBudgetResult> {
  const { budget, catalogItems, payMode, paymentMethod } = input;
  if (payMode === "now" && !paymentMethod) return { ok: false, error: "Escolha a forma de pagamento." };

  const findCatalogItem = (id: string) => catalogItems.find((it) => it.id === id);
  const total = budgetTotal(budget);
  const catalogLines = budget.items.filter((it) => findCatalogItem(it.itemId));
  const customLines = budget.items.filter((it) => !findCatalogItem(it.itemId));
  const catalogById = new Map(catalogItems.map((c) => [c.id, c]));
  const resolved = await resolveCartLineCosts(
    catalogLines.map((it) => ({ catalogItemId: it.itemId, quantity: it.qty })),
    catalogById
  );
  const totalCost = catalogLines.reduce((sum, it) => sum + (resolved.get(it.itemId)?.unitCost ?? 0) * it.qty, 0);

  const clientName = input.clientName ?? budget.clientName;
  const animalName = input.animalName ?? budget.animalName;
  const who = clientName ? ` para ${clientName}${animalName ? ` (${animalName})` : ""}` : "";
  const discount = budget.discountAmount ?? 0;
  const surcharge = budget.surchargeAmount ?? 0;

  const transaction = await addFinancialTransaction({
    date: getTodayLocalISO(),
    time: nowTimeHHMM(),
    description: `Venda${who}: ${budget.items.map((i) => formatItemQty(i.name, i.qty)).join(", ")}`,
    type: "income",
    amount: total,
    category: "Venda de Produtos",
    relatedClientId: budget.clientId,
    relatedAnimalId: budget.animalId,
    paymentMethod: paymentMethod || undefined,
    status: "pending",
    supplierCost: totalCost,
    discountAmount: discount > 0 ? discount : undefined,
    surchargeAmount: surcharge > 0 ? surcharge : undefined,
    observations: buildSaleObservations(input.appointmentId, budget.notes || ""),
    responsible: input.responsible,
  });
  if (!transaction) return { ok: false, error: "Falha ao gerar a venda. O orçamento não foi convertido." };

  if (catalogLines.length > 0) {
    await fulfillSaleLines({
      saleId: transaction.id,
      catalog: catalogItems,
      lines: catalogLines.map((it) => {
        const catItem = findCatalogItem(it.itemId)!;
        return {
          catalogItemId: it.itemId,
          name: it.name,
          type: catItem.type,
          category: catItem.category,
          quantity: it.qty,
          unitPrice: it.price,
        };
      }),
    });
  }
  // Itens personalizados (fora do catálogo): sem estoque/custo.
  if (customLines.length > 0) {
    await addSaleItems(
      transaction.id,
      customLines.map((it) => ({
        catalogItemId: it.itemId,
        name: it.name,
        type: "service" as const,
        quantity: it.qty,
        unitPrice: it.price,
        cost: 0,
        productCost: 0,
        providerCost: 0,
        subtotal: it.price * it.qty,
      }))
    );
  }

  // Guarda a forma usada (senão o campo volta vazio) e marca como convertido.
  if (paymentMethod) await setBudgetPaymentMethod(budget.id, paymentMethod);
  await updateBudgetStatus(budget.id, "converted");

  let received = false;
  if (payMode === "now" && total > 0) {
    received = await receiveSalePayment({
      sale: {
        id: transaction.id,
        amount: total,
        paidAmount: 0,
        status: "pending",
        relatedClientId: budget.clientId,
        relatedAnimalId: budget.animalId,
      },
      paymentMethod,
      clientName,
      animalName,
    });
  }
  return { ok: true, saleId: transaction.id, received };
}
