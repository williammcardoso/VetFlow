import { describe, expect, it } from "vitest";
import { sanitizeFileName } from "./documentEmissionApi";

describe("sanitizeFileName", () => {
  it("remove acentos (Storage do Supabase rejeita chave com acento)", () => {
    expect(sanitizeFileName("B3_Antonio_José_5.pdf")).toBe("B3_Antonio_Jose_5.pdf");
  });

  it("troca espaço e caracteres especiais por underscore", () => {
    expect(sanitizeFileName("Atestado (via cão/gato) № 5.pdf")).toMatch(/^[a-zA-Z0-9._-]+$/);
  });

  it("não sobra underscore duplicado quando junta vários espaços", () => {
    expect(sanitizeFileName("A   B   C.pdf")).not.toMatch(/__/);
  });
});
