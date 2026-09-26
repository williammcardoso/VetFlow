import { describe, expect, it } from "vitest";
import { numberToWordsPt, withQuantityInWords } from "./numberWords";

describe("numberToWordsPt", () => {
  it.each([
    [0, "zero"],
    [1, "um"],
    [10, "dez"],
    [14, "catorze"],
    [20, "vinte"],
    [28, "vinte e oito"],
    [100, "cem"],
    [101, "cento e um"],
    [120, "cento e vinte"],
    [250, "duzentos e cinquenta"],
    [1000, "mil"],
    [1005, "mil e cinco"],
    [1200, "mil e duzentos"],
    [1250, "mil duzentos e cinquenta"],
    [2000, "dois mil"],
    [21000, "vinte e um mil"],
  ])("%i → %s", (n, words) => {
    expect(numberToWordsPt(n)).toBe(words);
  });

  it("feminino", () => {
    expect(numberToWordsPt(1, true)).toBe("uma");
    expect(numberToWordsPt(2, true)).toBe("duas");
    expect(numberToWordsPt(22, true)).toBe("vinte e duas");
    expect(numberToWordsPt(200, true)).toBe("duzentas");
  });
});

describe("withQuantityInWords (receita controlada)", () => {
  it("masculino e feminino pelo substantivo", () => {
    expect(withQuantityInWords("28 comprimidos")).toBe("28 (vinte e oito) comprimidos");
    expect(withQuantityInWords("1 frasco")).toBe("1 (um) frasco");
    expect(withQuantityInWords("2 cápsulas")).toBe("2 (duas) cápsulas");
    expect(withQuantityInWords("1 bisnaga")).toBe("1 (uma) bisnaga");
    expect(withQuantityInWords("1 caixa")).toBe("1 (uma) caixa");
  });

  it("não mexe no que não é número inteiro + texto", () => {
    expect(withQuantityInWords("6,3 kg")).toBe("6,3 kg");
    expect(withQuantityInWords("uso contínuo")).toBe("uso contínuo");
    expect(withQuantityInWords("")).toBe("");
    expect(withQuantityInWords("28 (vinte e oito) comprimidos")).toBe("28 (vinte e oito) comprimidos");
  });
});
