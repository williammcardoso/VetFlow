import { describe, expect, it } from "vitest";
import { SHARED_EXPENSE_CATEGORY, computeMonthlyClosing, expenseProvider, isSharedExpense } from "./monthlyClosing";
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

  it("são repasse a fornecedor: saem do recebido antes da divisão, sem somar em nenhuma parte", () => {
    const c = computeMonthlyClosing({
      year: 2026,
      month: 11,
      sales,
      saleItems: [],
      purchases: [],
      receipts,
      expenses: [
        despesa({ id: "d1", amount: 300, responsible: "Centro Cirúrgico Vet", description: "Aluguel do centro cirúrgico" }),
        despesa({ id: "d2", amount: 100, responsible: "William", description: "Insulfilm da sala" }),
      ],
    });
    expect(c.custoDespesas).toBe(400);
    expect(c.lucroLiquido).toBe(600);
    expect(c.metadeClinica).toBe(300);
    expect(c.metadeAgro).toBe(300);
    // Recebido = repasses + metades: o dinheiro fecha.
    expect(c.custoDespesas + c.metadeClinica + c.metadeAgro).toBe(c.recebido);
  });

  it("sem despesas a conta continua a mesma", () => {
    const c = computeMonthlyClosing({ year: 2026, month: 11, sales, saleItems: [], purchases: [], receipts });
    expect(c.custoDespesas).toBe(0);
    expect(c.lucroLiquido).toBe(1000);
  });

  it("fornecedor: nome gravado; lançamentos da 1ª versão (clinic/agro) mostram a parte", () => {
    expect(expenseProvider({ responsible: " Centro Cirúrgico Vet " })).toBe("Centro Cirúrgico Vet");
    expect(expenseProvider({ responsible: "clinic" })).toBe("Clínica");
    expect(expenseProvider({ responsible: "agro" })).toBe("Agropecuária");
    expect(expenseProvider({ responsible: undefined })).toBe("Fornecedor não informado");
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
