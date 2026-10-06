import { describe, expect, it } from "vitest";
import { formatQtyName, groupSaleItemsByItem, groupSalesByDay, type SaleRef } from "./salesBreakdown";
import type { SaleItem } from "./saleItemsApi";

const item = (saleId: string, name: string, quantity: number, unitPrice: number, catalogItemId?: string): SaleItem => ({
  id: `${saleId}-${name}`,
  saleId,
  catalogItemId,
  name,
  type: "service",
  quantity,
  unitPrice,
  cost: 0,
  subtotal: quantity * unitPrice,
});

const refs: Record<string, SaleRef> = {
  s1: { saleId: "s1", date: "2026-09-01", time: "10:00", amount: 155, clientName: "Ana", animalName: "Rex" },
  s2: { saleId: "s2", date: "2026-09-01", time: "15:00", amount: 120, clientName: "Bia", animalName: "Mel" },
  s3: { saleId: "s3", date: "2026-09-03", time: "09:00", amount: 70, clientName: "Caio", animalName: "Tom" },
};
const ref = (id: string) => refs[id];

const items = [
  item("s1", "Consulta", 1, 120, "c1"),
  item("s1", "Hemograma completo", 1, 35, "h1"),
  item("s2", "Consulta", 1, 120, "c1"),
  item("s3", "Hemograma completo", 2, 35, "h1"),
  item("sX", "Consulta", 1, 120, "c1"), // venda fora do período/cancelada: ignorada
];

describe("groupSaleItemsByItem", () => {
  it("soma quantidades por item e lista os clientes", () => {
    const groups = groupSaleItemsByItem(items, ref);
    expect(groups.map((g) => [g.name, g.quantity, g.total])).toEqual([
      ["Hemograma completo", 3, 105],
      ["Consulta", 2, 240],
    ]);
    expect(groups[0].lines.map((l) => l.clientName)).toEqual(["Ana", "Caio"]);
  });
  it("agrupa pelo nome quando o item não tem cadastro", () => {
    const groups = groupSaleItemsByItem([item("s1", "Curativo ", 1, 20), item("s2", "curativo", 1, 20)], ref);
    expect(groups).toHaveLength(1);
    expect(groups[0].quantity).toBe(2);
  });
});

describe("groupSalesByDay", () => {
  it("lista cada dia com os itens somados e as vendas", () => {
    const days = groupSalesByDay(items, ref);
    expect(days.map((d) => d.date)).toEqual(["2026-09-01", "2026-09-03"]);
    expect(days[0].items).toEqual([
      { name: "Consulta", quantity: 2 },
      { name: "Hemograma completo", quantity: 1 },
    ]);
    expect(days[0].total).toBe(275);
    expect(days[0].sales.map((s) => s.clientName)).toEqual(["Ana", "Bia"]);
  });
});

describe("formatQtyName", () => {
  it("só mostra a quantidade quando passa de 1", () => {
    expect(formatQtyName("Consulta", 1)).toBe("Consulta");
    expect(formatQtyName("Consulta", 2)).toBe("2× Consulta");
  });
});
