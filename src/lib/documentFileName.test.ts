import { describe, expect, it } from "vitest";
import { officialDocumentFileName } from "./documentFileName";

describe("officialDocumentFileName", () => {
  it("título do modelo + pet + dia da emissão (formato BR, nunca ISO)", () => {
    expect(officialDocumentFileName("TCLE — Procedimento Cirúrgico", "Thor", new Date(2026, 10, 23, 14, 30))).toBe(
      "TCLE - Procedimento Cirúrgico - Thor - 23-11-2026.pdf"
    );
  });

  it("sem data válida fica só título e pet", () => {
    expect(officialDocumentFileName("Atestado Sanitário / de Saúde Animal", "Mel", null)).toBe(
      "Atestado Sanitário ou de Saúde Animal - Mel.pdf"
    );
    expect(officialDocumentFileName("Termo", "Mel", "não é data")).toBe("Termo - Mel.pdf");
  });
});
