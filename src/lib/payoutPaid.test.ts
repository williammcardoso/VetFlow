import { describe, expect, it } from "vitest";
import { summarizePayout } from "./payoutPaid";

describe("summarizePayout (repasse pago antes do fechamento)", () => {
  it("pago sai do a pagar, total continua o mesmo", () => {
    const r = summarizePayout([
      { amount: 16, paidAt: "2026-11-24" },
      { amount: 35 },
      { amount: 170, paidAt: null },
    ]);
    expect(r).toEqual({ total: 221, paid: 16, toPay: 205 });
  });

  it("soma em centavos (sem erro de 0,1 + 0,2)", () => {
    expect(summarizePayout([{ amount: 0.1, paidAt: "2026-11-24" }, { amount: 0.2, paidAt: "2026-11-24" }])).toEqual({
      total: 0.3,
      paid: 0.3,
      toPay: 0,
    });
  });

  it("lista vazia", () => {
    expect(summarizePayout([])).toEqual({ total: 0, paid: 0, toPay: 0 });
  });
});
