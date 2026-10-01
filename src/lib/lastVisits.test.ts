import { describe, expect, it } from "vitest";
import { clientLastVisit, isVisitSale, mergeLastVisits, toLocalStamp, type PatientEvent } from "./lastVisits";

const ev = (p: Partial<PatientEvent>): PatientEvent => ({ animalId: "rex", source: "atendimento", label: "consulta", ...p });

describe("última atualização do prontuário", () => {
  it("o registro mais recente vence, seja qual for", () => {
    const v = mergeLastVisits([
      ev({ date: "2026-09-20", time: "10:00" }),
      ev({ date: "2026-09-25", time: "09:00", source: "exame", label: "exame" }),
      ev({ date: "2026-09-27", time: "16:00", source: "receita", label: "receita" }),
      ev({ date: "2026-09-26", source: "pesagem", label: "pesagem" }),
    ]);
    expect(v.byAnimal.rex).toMatchObject({ date: "2026-09-27", label: "receita" });
  });
  it("mesmo dia: a hora desempata; mesma hora, atendimento ganha", () => {
    const sameDay = mergeLastVisits([
      ev({ date: "2026-09-28", time: "09:00" }),
      ev({ date: "2026-09-28", time: "15:30", source: "venda", label: "venda" }),
    ]);
    expect(sameDay.byAnimal.rex.label).toBe("venda");
    const sameTime = mergeLastVisits([
      ev({ date: "2026-09-28", time: "15:30", source: "venda", label: "venda" }),
      ev({ date: "2026-09-28", time: "15:30", label: "vacina" }),
    ]);
    expect(sameTime.byAnimal.rex.label).toBe("vacina");
  });
  it("data com fuso (documento, observação) vira data/hora local", () => {
    expect(toLocalStamp("2026-09-30")).toEqual({ date: "2026-09-30", time: undefined });
    const local = toLocalStamp("2026-09-30T23:30:00.000Z")!;
    const d = new Date("2026-09-30T23:30:00.000Z");
    expect(local.date).toBe(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    expect(toLocalStamp(null)).toBeNull();
  });
  it("venda conta; recebimento e cancelada não", () => {
    expect(isVisitSale({ type: "income", category: "Venda de Produtos", status: "paid", date: "2026-09-28" })).toBe(true);
    expect(isVisitSale({ type: "income", category: "Recebimento", date: "2026-09-28" })).toBe(false);
    expect(isVisitSale({ type: "income", category: "Venda de Produtos", status: "cancelled", date: "2026-09-28" })).toBe(false);
    expect(isVisitSale({ type: "expense", category: "Estoque", date: "2026-09-28" })).toBe(false);
  });
  it("cliente: o mais recente entre os pets e as vendas no nome dele", () => {
    const v = mergeLastVisits([
      ev({ animalId: "rex", date: "2026-09-20" }),
      ev({ animalId: null, clientId: "ana", date: "2026-09-29", source: "venda", label: "venda" }),
    ]);
    expect(clientLastVisit(v, "ana", ["rex"])).toMatchObject({ date: "2026-09-29", label: "venda" });
    expect(clientLastVisit(v, "bia", ["fantasma"])).toBeUndefined();
  });
});
