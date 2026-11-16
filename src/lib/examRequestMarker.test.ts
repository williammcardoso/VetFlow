import { describe, expect, it } from "vitest";
import { buildExamRequestMarker, parseExamRequestData } from "./examRequestMarker";
import type { ExamRequestPdfData } from "@/components/ExamRequestPdfContent";

const data: ExamRequestPdfData = {
  clientName: "Maria",
  animalName: "Thor",
  laboratorio: "Patológica",
  vetSolicitante: "Dr. Fulano",
  dataColeta: "2026-11-16",
  horarioColeta: "08:30",
  suspeita: "Função renal --> investigar",
  exames: ["Hemograma completo", "Exame que não está na lista"],
  useDigitalSignature: true,
};

describe("pedido de exame no content do documento", () => {
  it("lê de volta o que foi gravado (inclusive texto com -->)", () => {
    const content = buildExamRequestMarker(data) + "<div>html do pedido</div>";
    expect(parseExamRequestData(content)).toEqual(data);
  });

  it("documento comum não é pedido de exame", () => {
    expect(parseExamRequestData("<p>Atestado</p>")).toBeNull();
    expect(parseExamRequestData(undefined)).toBeNull();
  });
});
