import { describe, expect, it } from "vitest";
import { sumExtras } from "./closingExtrasApi";
import { parseMoneyBR } from "@/components/finance/ClosingExtrasCard";

describe("acréscimos do fechamento", () => {
  it("lê valor digitado no jeito brasileiro", () => {
    expect(parseMoneyBR("1.000,50")).toBe(1000.5);
    expect(parseMoneyBR("R$ 80")).toBe(80);
    expect(parseMoneyBR("150,00")).toBe(150);
    expect(parseMoneyBR("99.9")).toBe(99.9);
    expect(Number.isNaN(parseMoneyBR(""))).toBe(true);
  });
  it("soma por parte", () => {
    expect(
      sumExtras([
        { amount: 1000, beneficiary: "clinic" },
        { amount: 0.1, beneficiary: "clinic" },
        { amount: 0.2, beneficiary: "clinic" },
        { amount: 50, beneficiary: "agro" },
      ])
    ).toEqual({ clinic: 1000.3, agro: 50 });
  });
});
