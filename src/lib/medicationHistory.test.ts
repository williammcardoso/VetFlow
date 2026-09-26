import { describe, expect, it } from "vitest";
import type { MedicationData } from "@/types/medication";
import { buildMedicationSuggestions, filterMedicationSuggestions } from "./medicationHistory";

const med = (over: Partial<MedicationData>): MedicationData => ({
  id: "m1",
  useType: "Uso Oral",
  pharmacyType: "Farmácia Veterinária",
  medicationName: "Carprofeno",
  concentration: "75mg",
  pharmaceuticalForm: "Comprimido",
  dosePerAdministration: "1/2",
  frequency: "12 horas",
  period: "10 dias",
  useCustomInstructions: false,
  generatedInstructions: "",
  generalObservations: "",
  totalQuantity: "",
  totalQuantityDisplay: "",
  ...over,
});

describe("buildMedicationSuggestions", () => {
  it("agrupa o mesmo medicamento com a mesma posologia e conta os usos", () => {
    const list = buildMedicationSuggestions([
      { med: med({ id: "a" }), date: "2026-09-01" },
      { med: med({ id: "b", medicationName: " carprofeno " }), date: "2026-09-20" },
      { med: med({ id: "c", dosePerAdministration: "1" }), date: "2026-09-10" },
    ]);
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ count: 2, lastDate: "2026-09-20", title: "Carprofeno 75mg" });
    expect(list[1].count).toBe(1);
  });

  it("mostra a instrução como o motor atual gera (não o texto antigo gravado)", () => {
    const [s] = buildMedicationSuggestions([
      { med: med({ generatedInstructions: "Dê 1/2 comprimido(s) a cada 12 horas" }), date: "2026-09-01" },
    ]);
    expect(s.detail).toBe("Administrar 1/2 (meio) comprimido, a cada 12 horas, durante 10 dias.");
  });

  it("instrução escrita à mão diferente é outra sugestão, e é a que aparece", () => {
    const list = buildMedicationSuggestions([
      { med: med({}), date: "2026-09-01" },
      { med: med({ useCustomInstructions: true, generatedInstructions: "Dar junto com a comida." }), date: "2026-09-02" },
    ]);
    expect(list).toHaveLength(2);
    expect(list.map((s) => s.detail)).toContain("Dar junto com a comida.");
  });

  it("ignora medicamento sem nome e ordena por uso e depois pelo mais recente", () => {
    const list = buildMedicationSuggestions([
      { med: med({ medicationName: "" }), date: "2026-09-25" },
      { med: med({ medicationName: "Dipirona", concentration: "500mg/mL", pharmaceuticalForm: "Gotas", dosePerAdministration: "4" }), date: "2026-09-02" },
      { med: med({ medicationName: "Meloxicam", concentration: "0,5mg" }), date: "2026-09-05" },
    ]);
    expect(list.map((s) => s.med.medicationName)).toEqual(["Meloxicam", "Dipirona"]);
  });
});

describe("filterMedicationSuggestions", () => {
  const all = buildMedicationSuggestions([
    { med: med({}), date: "2026-09-01" },
    { med: med({ medicationName: "Cefalexina", concentration: "500mg", pharmaceuticalForm: "Cápsula", dosePerAdministration: "1" }), date: "2026-09-02" },
  ]);

  it("precisa de 2 letras e ignora acento/maiúscula", () => {
    expect(filterMedicationSuggestions(all, "c")).toEqual([]);
    expect(filterMedicationSuggestions(all, "CE").map((s) => s.med.medicationName)).toEqual(["Cefalexina"]);
    expect(filterMedicationSuggestions(all, "carpro").map((s) => s.med.medicationName)).toEqual(["Carprofeno"]);
    expect(filterMedicationSuggestions(all, "75")).toHaveLength(1);
  });

  it("respeita o limite", () => {
    expect(filterMedicationSuggestions(all, "mg", 1)).toHaveLength(1);
  });

  it("começo do nome primeiro, meio da palavra por último", () => {
    const list = buildMedicationSuggestions([
      { med: med({ medicationName: "Pró Rim Homeopet", concentration: "" }), date: "2026-09-01" },
      { med: med({ medicationName: "Pró Rim Homeopet", concentration: "" }), date: "2026-09-02" },
      { med: med({ medicationName: "Omeprazol", concentration: "10mg" }), date: "2026-09-03" },
      { med: med({ medicationName: "Metronidazol", concentration: "400mg" }), date: "2026-09-04" },
    ]);
    expect(filterMedicationSuggestions(list, "me").map((s) => s.med.medicationName)).toEqual([
      "Metronidazol",
      "Pró Rim Homeopet",
      "Omeprazol",
    ]);
  });
});
