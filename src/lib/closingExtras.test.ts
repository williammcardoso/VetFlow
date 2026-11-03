import { describe, expect, it } from "vitest";
import { sumExtras } from "./closingExtrasApi";
import { reconcileWithOrion } from "./monthlyClosing";

describe("acréscimos do fechamento", () => {
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
  it("confere com o total de venda do Orion (vendas + acréscimos)", () => {
    // Outubro/2026: 4.750,00 de serviços + 1.110,00 de aplicações a domicílio = 5.860,00 no Orion.
    expect(reconcileWithOrion(4750, 1110, 5860)).toEqual({ vetflow: 5860, diff: 0 });
    expect(reconcileWithOrion(4615, 1110, 5860)).toEqual({ vetflow: 5725, diff: -135 });
    expect(reconcileWithOrion(0.1, 0.2, null)).toEqual({ vetflow: 0.3, diff: null });
  });
});
