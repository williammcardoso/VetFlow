import { describe, expect, it } from "vitest";
import { SHARED_EXPENSE_CATEGORY, computeMonthlyClosing, expensePayer, isSharedExpense } from "./monthlyClosing";
import { computePeriodFinancials } from "./financialSummary";
import type { FinancialTransaction } from "@/mockData/financial";

const tx = (p: Partial<FinancialTransaction>): FinancialTransaction =>
  ({
    id: "t",
    date: "2026-11-10",
    time: "10:00",
    description: "",
    type: "income",
    amount: 0,
    category: "Venda de Produtos",
    ...p,
  }) as FinancialTransaction;

const despesa = (p: Partial<FinancialTransaction>) => tx({ type: "expense", category: SHARED_EXPENSE_CATEGORY, ...p });

describe("despesas no Fechamento 50/50", () => {
  const sales = [tx({ id: "s1", amount: 1000, paidAmount: 1000, status: "paid" })];
  const receipts = [tx({ id: "r1", category: "Recebimento", saleId: "s1", amount: 1000 })];

  it("saem do lucro antes da divisão e voltam inteiras para quem pagou", () => {
    const c = computeMonthlyClosing({
      year: 2026,
      month: 11,
      sales,
      saleItems: [],
      purchases: [],
      receipts,
      expenses: [
        despesa({ id: "d1", amount: 300, responsible: "clinic", description: "Aluguel do centro cirúrgico" }),
        despesa({ id: "d2", amount: 100, responsible: "agro", description: "Insulfilm da sala" }),
      ],
    });
    expect(c.custoDespesas).toBe(400);
    expect(c.lucroLiquido).toBe(600);
    expect(c.metadeClinica).toBe(300);
    expect(c.reembolsoClinica).toBe(300);
    expect(c.reembolsoAgro).toBe(100);
    // Clínica recebe 300 + 300; agropecuária 300 + 100: cada uma arcou com 200.
    expect(c.metadeClinica + c.reembolsoClinica).toBe(600);
    expect(c.metadeAgro + c.reembolsoAgro).toBe(400);
  });

  it("sem despesas a conta continua a mesma", () => {
    const c = computeMonthlyClosing({ year: 2026, month: 11, sales, saleItems: [], purchases: [], receipts });
    expect(c.custoDespesas).toBe(0);
    expect(c.reembolsoClinica).toBe(0);
    expect(c.lucroLiquido).toBe(1000);
  });

  it("quem pagou: sem informação vale a clínica (quem lança)", () => {
    expect(expensePayer({ responsible: "agro" })).toBe("agro");
    expect(expensePayer({ responsible: "clinic" })).toBe("clinic");
    expect(expensePayer({ responsible: undefined })).toBe("clinic");
  });

  it("período: despesa entra no lucro e sai das saídas fora do 50/50", () => {
    const fin = computePeriodFinancials(
      [...sales, ...receipts, despesa({ id: "d1", amount: 300 }), tx({ id: "e2", type: "expense", category: "Aluguel", amount: 500 })],
      [],
      "2026-11-01",
      "2026-11-30"
    );
    expect(fin.sharedExpenses.map((t) => t.id)).toEqual(["d1"]);
    expect(fin.otherExpenses.map((t) => t.id)).toEqual(["e2"]);
    expect(fin.closing.custoDespesas).toBe(300);
    expect(fin.closing.lucroLiquido).toBe(700);
    expect(isSharedExpense({ type: "income", category: SHARED_EXPENSE_CATEGORY })).toBe(false);
  });
});
