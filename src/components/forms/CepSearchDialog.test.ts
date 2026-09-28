import { describe, expect, it } from "vitest";
import { splitCityUf, ufFromCep } from "./CepSearchDialog";

describe("ufFromCep", () => {
  it("acha a UF pela faixa de CEP dos Correios", () => {
    expect(ufFromCep("13970-170")).toBe("SP");
    expect(ufFromCep("01001-000")).toBe("SP");
    expect(ufFromCep("20040-020")).toBe("RJ");
    expect(ufFromCep("30130-010")).toBe("MG");
    expect(ufFromCep("70040-010")).toBe("DF");
    expect(ufFromCep("74000-000")).toBe("GO");
    expect(ufFromCep("69900-000")).toBe("AC");
    expect(ufFromCep("90010-000")).toBe("RS");
  });

  it("vazio quando não dá pra saber", () => {
    expect(ufFromCep("")).toBe("");
    expect(ufFromCep(undefined)).toBe("");
    expect(ufFromCep("abc")).toBe("");
  });
});

describe("splitCityUf", () => {
  it("separa a UF grudada na cidade (como está nas configurações da clínica)", () => {
    expect(splitCityUf("Itapira/SP")).toEqual({ city: "Itapira", uf: "SP" });
    expect(splitCityUf("Mogi Mirim - SP")).toEqual({ city: "Mogi Mirim", uf: "SP" });
    expect(splitCityUf("Belo Horizonte, mg")).toEqual({ city: "Belo Horizonte", uf: "MG" });
  });

  it("cidade sem UF fica como está", () => {
    expect(splitCityUf("Itapira")).toEqual({ city: "Itapira", uf: "" });
    expect(splitCityUf("Mogi-Guaçu")).toEqual({ city: "Mogi-Guaçu", uf: "" });
    expect(splitCityUf("")).toEqual({ city: "", uf: "" });
  });
});
