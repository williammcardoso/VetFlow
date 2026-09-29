import { describe, expect, it } from "vitest";
import {
  buildSaleObservations,
  isReceiptOfSale,
  parseSaleObservations,
  receiptDescription,
  receiptMethodsBySale,
  saleBalance,
  saleStatus,
  summarizeSaleItems,
  toCents,
} from "./salePayment";
import type { FinancialTransaction } from "@/mockData/financial";

const tx = (p: Partial<FinancialTransaction>): FinancialTransaction =>
  ({
    id: "t",
    date: "2026-09-29",
    time: "10:00",
    description: "",
    type: "income",
    amount: 0,
    category: "Venda de Produtos",
    ...p,
  }) as FinancialTransaction;

describe("summarizeSaleItems", () => {
  it("lê a descrição do prontuário (depois do travessão)", () => {
    expect(summarizeSaleItems("Venda: Maria (Rex) — Hemograma ×2, Consulta")).toBe("Hemograma · Consulta");
  });
  it("lê a descrição do PDV (depois dos dois-pontos)", () => {
    expect(summarizeSaleItems("Venda para Maria (Rex): Vacina V10, Consulta, Vermífugo ×3")).toBe("Vacina V10 · Consulta +1 item");
  });
  it("tira a quantidade no formato antigo (x2)", () => {
    expect(summarizeSaleItems("Orçamento convertido: Raio-X x2, Consulta")).toBe("Raio-X · Consulta");
  });
  it("resume com plural quando sobram vários itens", () => {
    expect(summarizeSaleItems("Venda: A — Um, Dois, Três, Quatro", 2)).toBe("Um · Dois +2 itens");
  });
  it("vírgula dentro de parênteses faz parte do nome", () => {
    expect(summarizeSaleItems("Venda: A — PCR 3 (erlichia, babesia e anaplasma), Consulta ×2", 3)).toBe(
      "PCR 3 (erlichia, babesia e anaplasma) · Consulta"
    );
  });
  it("sem separador, devolve o texto", () => {
    expect(summarizeSaleItems("Entrada avulsa")).toBe("Entrada avulsa");
  });
});

describe("saleBalance / saleStatus", () => {
  it("compara em centavos (0,1 + 0,2 quita 0,30)", () => {
    const sale = { amount: 0.3, paidAmount: 0.1 + 0.2, status: "partial" as const };
    expect(saleBalance(sale)).toBe(0);
    expect(saleStatus(sale).key).toBe("paid");
  });
  it("saldo parcial e em aberto", () => {
    expect(saleBalance({ amount: 100, paidAmount: 40, status: "partial" })).toBe(60);
    expect(saleStatus({ amount: 100, paidAmount: 40, status: "partial" })).toEqual({ key: "partial", label: "Parcial" });
    expect(saleStatus({ amount: 100, paidAmount: 0, status: "pending" })).toEqual({ key: "open", label: "A receber" });
  });
  it("venda cancelada não tem saldo", () => {
    expect(saleBalance({ amount: 100, paidAmount: 0, status: "cancelled" })).toBe(0);
    expect(saleStatus({ amount: 100, paidAmount: 0, status: "cancelled" }).key).toBe("cancelled");
  });
  it("pago a mais não vira saldo negativo", () => {
    expect(saleBalance({ amount: 50, paidAmount: 80, status: "paid" })).toBe(0);
  });
  it("toCents arredonda ruído de ponto flutuante", () => {
    expect(toCents(59.999999)).toBe(60);
    expect(toCents(0.1 + 0.2)).toBe(0.3);
  });
});

describe("recebimentos da venda", () => {
  it("reconhece pelo sale_id ou pelo id no texto (registros antigos)", () => {
    expect(isReceiptOfSale({ saleId: "ft-1", description: "" }, "ft-1")).toBe(true);
    expect(isReceiptOfSale({ saleId: undefined, description: "Recebimento venda ft-1" }, "ft-1")).toBe(true);
    expect(isReceiptOfSale({ saleId: "ft-2", description: "" }, "ft-1")).toBe(false);
  });
  it("formas usadas por venda: sem estornos e sem repetir", () => {
    const map = receiptMethodsBySale([
      tx({ id: "r1", category: "Recebimento", saleId: "s1", amount: 50, paymentMethod: "PIX" }),
      tx({ id: "r2", category: "Recebimento", saleId: "s1", amount: 30, paymentMethod: "Dinheiro" }),
      tx({ id: "r3", category: "Recebimento", saleId: "s1", amount: 20, paymentMethod: "PIX" }),
      tx({ id: "r4", category: "Recebimento", saleId: "s1", amount: -20, paymentMethod: "Crédito" }),
      tx({ id: "r5", category: "Recebimento", amount: 10, paymentMethod: "PIX" }),
    ]);
    expect(map.get("s1")).toEqual(["PIX", "Dinheiro"]);
    expect(map.size).toBe(1);
  });
  it("descrição do recebimento", () => {
    expect(receiptDescription("Maria", "Rex")).toBe("Recebimento: Maria (Rex)");
    expect(receiptDescription("Maria")).toBe("Recebimento: Maria");
    expect(receiptDescription()).toBe("Recebimento de venda");
  });
});

describe("vínculo com o atendimento (observations)", () => {
  it("ida e volta com atendimento e texto", () => {
    const raw = buildSaleObservations("apt-9", "  pagou na hora  ");
    expect(raw).toBe("@apt:apt-9\npagou na hora");
    expect(parseSaleObservations(raw)).toEqual({ appointmentId: "apt-9", text: "pagou na hora" });
  });
  it("só texto ou nada", () => {
    expect(buildSaleObservations(undefined, "obs")).toBe("obs");
    expect(buildSaleObservations(undefined, "   ")).toBeUndefined();
    expect(parseSaleObservations("obs")).toEqual({ text: "obs" });
    expect(parseSaleObservations("@apt:x")).toEqual({ appointmentId: "x", text: undefined });
  });
});
