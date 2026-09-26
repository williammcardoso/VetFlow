import { describe, expect, it } from "vitest";
import {
  COMPONENT_UNITS,
  VEHICLE_UNITS,
  formatQuantityWithUnit,
  normalizeMeasure,
  vehicleTypeLabel,
  withSavedOption,
} from "./manipulatedUnits";

describe("formatQuantityWithUnit", () => {
  it("componente: abrevia a unidade; % colado no número", () => {
    expect(formatQuantityWithUnit("10", "Miligrama (mg)")).toBe("10 mg");
    expect(formatQuantityWithUnit("0,03", "%")).toBe("0,03%");
    expect(formatQuantityWithUnit("2", "Miligrama por quilo (mg/kg)")).toBe("2 mg/kg");
    expect(formatQuantityWithUnit("1 bilhão", "UFC")).toBe("1 bilhão UFC");
    expect(formatQuantityWithUnit("1x10^9", "UFC")).toBe("1x10^9 UFC");
    expect(formatQuantityWithUnit("400", "UI (Unidade Internacional)")).toBe("400 UI");
  });

  it("q.s.p. em forma farmacêutica: singular/plural pela quantidade", () => {
    expect(formatQuantityWithUnit("60", "cápsula(s)")).toBe("60 cápsulas");
    expect(formatQuantityWithUnit("1", "cápsula(s)")).toBe("1 cápsula");
    expect(formatQuantityWithUnit("30", "biscoito(s)")).toBe("30 biscoitos");
    expect(formatQuantityWithUnit("30", "comprimido(s)")).toBe("30 comprimidos");
  });

  it("q.s.p. em volume/massa, inclusive os rótulos antigos", () => {
    expect(formatQuantityWithUnit("30", "mililitro(s) (mL)")).toBe("30 mL");
    expect(formatQuantityWithUnit("50", "grama(s) (g)")).toBe("50 g");
    expect(formatQuantityWithUnit("5", "ufc/g")).toBe("5 UFC/g");
  });

  it("'Outro' usa o texto digitado; quantidade já com unidade não repete", () => {
    expect(formatQuantityWithUnit("2", "Outro", "mEq")).toBe("2 mEq");
    expect(formatQuantityWithUnit("10", "outro(s)", "seringas")).toBe("10 seringas");
    expect(formatQuantityWithUnit("350mL", "creme(s)")).toBe("350mL");
    expect(formatQuantityWithUnit("", "cápsula(s)")).toBe("");
    expect(formatQuantityWithUnit("5", "")).toBe("5");
  });
});

describe("listas e valores gravados", () => {
  it("tem % e as unidades de dose por peso no componente; cápsulas voltam ao q.s.p.", () => {
    expect(COMPONENT_UNITS).toEqual(expect.arrayContaining(["%", "Miligrama por quilo (mg/kg)", "UFC"]));
    expect(VEHICLE_UNITS).toEqual(expect.arrayContaining(["cápsula(s)", "comprimido(s)", "biscoito(s)", "mililitro(s) (mL)"]));
  });

  it("valor gravado fora da lista entra antes do 'Outro'", () => {
    expect(withSavedOption(["a", "b", "Outro"], "c")).toEqual(["a", "b", "c", "Outro"]);
    expect(withSavedOption(["a", "outro(s)"], "creme(s)")).toEqual(["a", "creme(s)", "outro(s)"]);
    expect(withSavedOption(["a", "Outro"], "a")).toEqual(["a", "Outro"]);
    expect(withSavedOption(["a"], "")).toEqual(["a"]);
  });

  it("medida antiga e tipo do q.s.p.", () => {
    expect(normalizeMeasure("Líquido (ml)")).toBe("Líquido (mL)");
    expect(normalizeMeasure("Cápsula")).toBe("Cápsula");
    expect(vehicleTypeLabel("Veículo")).toBe("Veículo");
    expect(vehicleTypeLabel("Outro", "Xarope")).toBe("Xarope");
    expect(vehicleTypeLabel("Outro", "")).toBe("Excipiente");
    expect(vehicleTypeLabel(undefined)).toBe("Excipiente");
  });
});
