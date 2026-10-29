import { describe, expect, it } from "vitest";
import { hintForLine, hintForSection, hintForVariable, normalizeHintKey } from "./documentFieldHints";

describe("documentFieldHints", () => {
  it("normaliza acento, caixa e pontuação", () => {
    expect(normalizeHintKey("Classificação ASA:")).toBe("classificacao asa");
  });

  it("acha a dica pelo rótulo da linha", () => {
    expect(hintForLine("Classificação ASA", "3. AVALIAÇÃO PRÉ-ANESTÉSICA")).toMatch(/Risco anestésico/);
  });

  it("o mesmo rótulo muda de dica conforme a seção", () => {
    expect(hintForLine("Nome", "ATESTADO DE VACINAÇÃO")).toMatch(/vacina/);
    expect(hintForLine("Nome", "3. INSTITUIÇÃO DESTINATÁRIA")).toMatch(/instituição/);
    expect(hintForLine("1. Nome", "TESTEMUNHAS")).toMatch(/Testemunha/);
  });

  it("linha só de opções usa a dica da seção", () => {
    expect(hintForLine("", "5. MONITORAÇÃO")).toBeUndefined();
    expect(hintForSection("5. MONITORAÇÃO")).toMatch(/monitoração/);
  });

  it("dica dos dados da etapa 'complete os dados'", () => {
    expect(hintForVariable("atend.protocolo_anestesico")).toMatch(/Fármacos/);
    expect(hintForVariable("pac.pelagem")).toMatch(/cadastro do paciente/);
    expect(hintForVariable("xyz.qualquer")).toBeUndefined();
  });
});
