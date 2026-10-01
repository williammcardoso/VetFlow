import { describe, expect, it } from "vitest";
import { clientLastVisit, mergeLastVisits } from "./lastVisits";

describe("última visita = atendimento ou venda", () => {
  const visits = mergeLastVisits(
    [
      { animal_id: "rex", date: "2026-09-20" },
      { animal_id: "mel", date: "2026-09-10" },
    ],
    [
      // só uma injeção, lançada no financeiro
      { related_animal_id: "rex", related_client_id: "ana", date: "2026-09-28", type: "income", category: "Venda de Produtos", status: "paid" },
      // pagamento de algo antigo não é visita
      { related_animal_id: "mel", related_client_id: "ana", date: "2026-09-29", type: "income", category: "Recebimento", status: null },
      // venda cancelada não conta
      { related_animal_id: "mel", related_client_id: "ana", date: "2026-09-30", type: "income", category: "Venda de Produtos", status: "cancelled" },
      // venda sem pet, só no nome do tutor
      { related_animal_id: null, related_client_id: "bia", date: "2026-09-25", type: "income", category: "Venda de Produtos", status: "paid" },
      { related_animal_id: "x", related_client_id: "x", date: "2026-09-30", type: "expense", category: "Estoque", status: null },
    ]
  );

  it("venda mais recente que o atendimento vira a última visita", () => {
    expect(visits.byAnimal.rex).toEqual({ date: "2026-09-28", source: "venda" });
  });
  it("recebimento e venda cancelada não contam", () => {
    expect(visits.byAnimal.mel).toEqual({ date: "2026-09-10", source: "atendimento" });
  });
  it("cliente: o mais recente entre pets e vendas no nome dele", () => {
    expect(clientLastVisit(visits, "ana", ["rex", "mel"])).toEqual({ date: "2026-09-28", source: "venda" });
    expect(clientLastVisit(visits, "bia", [])).toEqual({ date: "2026-09-25", source: "venda" });
    expect(clientLastVisit(visits, "ninguem", ["fantasma"])).toBeUndefined();
  });
  it("mesmo dia: atendimento tem preferência", () => {
    const v = mergeLastVisits(
      [{ animal_id: "rex", date: "2026-09-28" }],
      [{ related_animal_id: "rex", date: "2026-09-28", type: "income", category: "Venda de Produtos", status: "paid" }]
    );
    expect(v.byAnimal.rex.source).toBe("atendimento");
  });
});
