import { describe, expect, it } from "vitest";
import { planBiochemicalReferenceUpdate, type ExamReferencesBlob } from "./examReferences";

const blob: ExamReferencesBlob = {
  hemogram: { eritrocitos: { dog: { full: "5,5 a 8,5" } } },
  biochemical: {
    Ureia: { unit: "mg/dL", dog: { min: 10, max: 60 }, cat: { min: 30, max: 65 } },
  },
};

describe("referência do bioquímico corrigida no lançamento", () => {
  it("valor corrigido sobrescreve o cadastro da espécie, sem mexer na outra nem no hemograma", () => {
    const plan = planBiochemicalReferenceUpdate(blob, "Ureia", "dog", { min: 15, max: 65, unit: "mg/dL" });
    expect(plan).not.toBeNull();
    expect(plan!.nextBlob.biochemical!.Ureia).toEqual({ unit: "mg/dL", dog: { min: 15, max: 65 }, cat: { min: 30, max: 65 } });
    expect(plan!.nextBlob.hemogram).toBe(blob.hemogram);
    expect(plan!.change.previous).toEqual({ min: 10, max: 60, unit: "mg/dL" });
  });
  it("igual ao cadastro não grava nada", () => {
    expect(planBiochemicalReferenceUpdate(blob, "Ureia", "cat", { min: 30, max: 65, unit: "mg/dL" })).toBeNull();
    // unidade em branco no lançamento = mantém a do cadastro
    expect(planBiochemicalReferenceUpdate(blob, "Ureia", "cat", { min: 30, max: 65, unit: "" })).toBeNull();
  });
  it("só a unidade mudou também grava", () => {
    const plan = planBiochemicalReferenceUpdate(blob, "Ureia", "dog", { min: 10, max: 60, unit: "mmol/L" });
    expect(plan!.nextBlob.biochemical!.Ureia.unit).toBe("mmol/L");
  });
  it("analito novo vira cadastro, sem 'antes'", () => {
    const plan = planBiochemicalReferenceUpdate(blob, "Lipase", "cat", { min: 0, max: 200, unit: "U/L" });
    expect(plan!.nextBlob.biochemical!.Lipase).toEqual({ unit: "U/L", cat: { min: 0, max: 200 } });
    expect(plan!.change.previous).toBeUndefined();
    expect(plan!.nextBlob.biochemical!.Ureia).toEqual(blob.biochemical!.Ureia);
  });
});
