import { describe, expect, it } from "vitest";
import { computePeriodFinancials, revenueByCategory, sumByDay, topSoldItems } from "./financialSummary";
import { budgetTotal } from "./budgetConversion";
import { catalogCategoryLabel } from "./catalogCategories";
import { chunk, fetchAllPages } from "./supabasePaging";
import type { FinancialTransaction } from "@/mockData/financial";
import type { CatalogItem } from "@/mockData/catalog";
import type { SaleItem } from "./saleItemsApi";

const tx = (p: Partial<FinancialTransaction>): FinancialTransaction =>
  ({
    id: "t",
    date: "2026-09-10",
    time: "10:00",
    description: "",
    type: "income",
    amount: 0,
    category: "Venda de Produtos",
    ...p,
  }) as FinancialTransaction;

const item = (p: Partial<SaleItem>): SaleItem => ({
  id: "i",
  saleId: "s1",
  name: "Item",
  type: "service",
  quantity: 1,
  unitPrice: 0,
  cost: 0,
  subtotal: 0,
  ...p,
});

describe("computePeriodFinancials", () => {
  const transactions = [
    tx({ id: "s1", amount: 200, paidAmount: 200, status: "paid" }),
    tx({ id: "s2", amount: 100, paidAmount: 40, status: "partial" }),
    tx({ id: "s3", amount: 999, status: "cancelled" }),
    tx({ id: "s-old", date: "2026-08-20", amount: 80, paidAmount: 0, status: "pending" }),
    tx({ id: "r1", category: "Recebimento", saleId: "s1", amount: 200 }),
    tx({ id: "r2", category: "Recebimento", saleId: "s2", amount: 40 }),
    tx({ id: "r3", category: "Recebimento", saleId: "s9", amount: -30 }),
    tx({ id: "e1", type: "expense", category: "Estoque", amount: 50 }),
    tx({ id: "e2", type: "expense", category: "Aluguel", amount: 500 }),
  ];
  const items = [
    item({ saleId: "s1", cost: 60, providerCost: 60, costProvider: "Laboratório externo", subtotal: 150 }),
    item({ saleId: "s2", subtotal: 100 }),
  ];
  const fin = computePeriodFinancials(transactions, items, "2026-09-01", "2026-09-30");

  it("faturado sem as canceladas e ticket por venda (não por dia)", () => {
    expect(fin.faturado).toBe(300);
    expect(fin.sales.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(fin.cancelledSales.map((s) => s.id)).toEqual(["s3"]);
    expect(fin.ticketMedio).toBe(150);
  });
  it("recebido = só recebimentos (estorno desconta), sem somar a venda de novo", () => {
    expect(fin.recebido).toBe(210);
  });
  it("a receber olha todas as datas", () => {
    expect(fin.openSales.map((s) => s.id).sort()).toEqual(["s-old", "s2"]);
    expect(fin.openTotal).toBe(140);
  });
  it("lucro igual ao Fechamento 50/50: bruto − repasses − compras (aluguel fica fora)", () => {
    expect(fin.closing.bruto).toBe(300);
    expect(fin.closing.custoRepasses).toBe(60);
    expect(fin.closing.custoCompras).toBe(50);
    expect(fin.closing.lucroLiquido).toBe(190);
    expect(fin.closing.metadeClinica).toBe(95);
    expect(fin.otherExpenses.map((t) => t.id)).toEqual(["e2"]);
  });
});

describe("categorias e ranking", () => {
  const catalog = new Map<string, CatalogItem>([
    ["c1", { id: "c1", name: "Hemograma", type: "service", price: 80, active: true, category: "exame_externo" }],
  ]);
  it("categoria vem do catálogo quando o item vendido não gravou", () => {
    const rows = revenueByCategory(
      [
        item({ catalogItemId: "c1", subtotal: 80 }),
        item({ catalogItemId: "c1", category: "exame_externo", subtotal: 80, quantity: 2 }),
        item({ name: "Avulso", subtotal: 30 }),
      ],
      catalog
    );
    expect(rows).toEqual([
      { category: "exame_externo", value: 160, quantity: 3 },
      { category: undefined, value: 30, quantity: 1 },
    ]);
  });
  it("mais vendidos juntam pelo item do catálogo", () => {
    const top = topSoldItems([
      item({ catalogItemId: "c1", name: "Hemograma", subtotal: 80 }),
      item({ catalogItemId: "c1", name: "Hemograma", subtotal: 160, quantity: 2 }),
      item({ name: "Consulta", subtotal: 120 }),
    ]);
    expect(top.map((t) => [t.name, t.value, t.quantity])).toEqual([
      ["Hemograma", 240, 3],
      ["Consulta", 120, 1],
    ]);
  });
  it("rótulos de categoria", () => {
    expect(catalogCategoryLabel("exame_externo")).toBe("Exame externo");
    expect(catalogCategoryLabel("Insumos")).toBe("Insumos");
    expect(catalogCategoryLabel(undefined)).toBe("Sem categoria");
    expect(catalogCategoryLabel("banho_tosa")).toBe("Banho tosa");
  });
  it("soma por dia", () => {
    expect(sumByDay([tx({ date: "2026-09-01", amount: 10 }), tx({ date: "2026-09-01", amount: 5 })], "v")).toEqual({
      "2026-09-01": { v: 15 },
    });
  });
});

describe("budgetTotal", () => {
  it("itens − desconto + acréscimo, em centavos", () => {
    expect(
      budgetTotal({
        items: [
          { itemId: "a", name: "A", qty: 3, price: 0.1 },
          { itemId: "b", name: "B", qty: 1, price: 100 },
        ],
        discountAmount: 10,
        surchargeAmount: 5,
      })
    ).toBe(95.3);
  });
  it("desconto maior que o total não fica negativo", () => {
    expect(budgetTotal({ items: [{ itemId: "a", name: "A", qty: 1, price: 50 }], discountAmount: 80 })).toBe(0);
  });
});

describe("paginação do Supabase", () => {
  it("busca todas as páginas até vir uma incompleta", async () => {
    const rows = [1, 2, 3, 4, 5];
    const calls: Array<[number, number]> = [];
    const { data, error } = await fetchAllPages<number>(async (from, to) => {
      calls.push([from, to]);
      return { data: rows.slice(from, to + 1), error: null };
    }, 2);
    expect(error).toBeNull();
    expect(data).toEqual(rows);
    expect(calls).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });
  it("devolve o erro e para", async () => {
    const { data, error } = await fetchAllPages<number>(async () => ({ data: null, error: new Error("x") }), 2);
    expect(data).toEqual([]);
    expect(error).toBeInstanceOf(Error);
  });
  it("divide ids em lotes", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
