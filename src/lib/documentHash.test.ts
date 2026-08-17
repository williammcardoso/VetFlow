import { describe, expect, it } from "vitest";
import { computeDocumentHash } from "./documentHash";

describe("computeDocumentHash", () => {
  const base = {
    numero: 1,
    templateCodigo: "A1",
    templateVersao: 1,
    emitidoEm: "2026-08-15T12:00:00.000Z",
    corpoRenderizado: "ATESTADO DE COMPARECIMENTO...",
  };

  it("é determinístico para o mesmo conteúdo", async () => {
    const a = await computeDocumentHash(base);
    const b = await computeDocumentHash({ ...base });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("muda se o texto renderizado mudar (integridade)", async () => {
    const original = await computeDocumentHash(base);
    const alterado = await computeDocumentHash({
      ...base,
      corpoRenderizado: base.corpoRenderizado + " texto adulterado",
    });
    expect(alterado).not.toBe(original);
  });

  it("muda se o número do documento mudar", async () => {
    const doc1 = await computeDocumentHash(base);
    const doc2 = await computeDocumentHash({ ...base, numero: 2 });
    expect(doc1).not.toBe(doc2);
  });
});
