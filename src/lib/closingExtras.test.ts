import { describe, expect, it } from "vitest";
import { sumExtras } from "./closingExtrasApi";

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
});
