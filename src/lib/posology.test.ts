import { describe, expect, it } from "vitest";
import type { MedicationData } from "@/types/medication";
import {
  buildManipulatedPosology,
  buildPosology,
  calculateDoseByWeight,
  formsForUse,
  parseConcentration,
  refreshMedicationPosology,
  sitesForUse,
  type PosologyInput,
} from "./posology";

const base: PosologyInput = { useType: "Uso Oral", form: "Comprimido", dose: "1", frequency: "12 horas", period: "7 dias" };
const run = (over: Partial<PosologyInput>) => buildPosology({ ...base, ...over });

describe("buildPosology — comprimidos e cápsulas", () => {
  it("frase no infinitivo e quantidade em unidades, no plural certo", () => {
    expect(run({})).toEqual({
      text: "Administrar 1 comprimido, a cada 12 horas, durante 7 dias.",
      quantityDisplay: "14 comprimidos",
      quantityNumber: 14,
    });
  });

  it("24 horas vira 'a cada 24 horas' (nunca '1 vez ao dia')", () => {
    expect(run({ frequency: "24 horas (1x/dia)" }).text).toBe(
      "Administrar 1 comprimido, a cada 24 horas, durante 7 dias."
    );
  });

  it("meio: '1/2 (meio) comprimido'", () => {
    const r = run({ dose: "1/2 (meio)", frequency: "24 horas (1x/dia)", period: "5 dias" });
    expect(r.text).toBe("Administrar 1/2 (meio) comprimido, a cada 24 horas, durante 5 dias.");
    expect(r.quantityDisplay).toBe("3 comprimidos");
  });

  it("um quarto: '1/4 (um quarto) do comprimido' e arredonda pra CIMA", () => {
    const r = run({ dose: "1/4", frequency: "24 horas (1x/dia)", period: "5 dias" });
    expect(r.text).toBe("Administrar 1/4 (um quarto) do comprimido, a cada 24 horas, durante 5 dias.");
    expect(r.quantityDisplay).toBe("2 comprimidos");
  });

  it("três quartos e um terço", () => {
    expect(run({ dose: "3/4" }).text).toBe("Administrar 3/4 (três quartos) do comprimido, a cada 12 horas, durante 7 dias.");
    expect(run({ dose: "1/3" }).text).toBe("Administrar 1/3 (um terço) do comprimido, a cada 12 horas, durante 7 dias.");
  });

  it("dose mista: '1 comprimido e meio' (de '1 + 1/2 (um e meio)', '1 1/2' ou '1 e 1/2')", () => {
    for (const dose of ["1 + 1/2 (um e meio)", "1 1/2", "1 e 1/2"]) {
      const r = run({ dose, period: "30 dias" });
      expect(r.text).toBe("Administrar 1 comprimido e meio, a cada 12 horas, durante 30 dias.");
      expect(r.quantityDisplay).toBe("90 comprimidos");
    }
    expect(run({ dose: "2 + 1/4" }).text).toBe("Administrar 2 comprimidos e um quarto, a cada 12 horas, durante 7 dias.");
  });

  it("cápsula no feminino: 'meia', 'da', plural", () => {
    expect(run({ form: "Cápsula", dose: "1/2" }).text).toBe("Administrar 1/2 (meia) cápsula, a cada 12 horas, durante 7 dias.");
    expect(run({ form: "Cápsula", dose: "1/4" }).text).toBe("Administrar 1/4 (um quarto) da cápsula, a cada 12 horas, durante 7 dias.");
    expect(run({ form: "Cápsula", dose: "1 + 1/2" }).text).toBe("Administrar 1 cápsula e meia, a cada 12 horas, durante 7 dias.");
    expect(run({ form: "Cápsula", dose: "2", frequency: "24 horas (1x/dia)", period: "10 dias" })).toMatchObject({
      text: "Administrar 2 cápsulas, a cada 24 horas, durante 10 dias.",
      quantityDisplay: "20 cápsulas",
    });
  });

  it("48 horas conta metade das doses (antes contava como 1x/dia)", () => {
    expect(run({ frequency: "48 horas", period: "10 dias" })).toMatchObject({
      text: "Administrar 1 comprimido, a cada 48 horas, durante 10 dias.",
      quantityDisplay: "5 comprimidos",
    });
  });

  it("semanal e mensal viram intervalo em dias", () => {
    expect(run({ frequency: "1x por semana", period: "30 dias" }).text).toBe(
      "Administrar 1 comprimido, a cada 7 dias, durante 30 dias."
    );
    expect(run({ frequency: "1x por mês", period: "90 dias" })).toMatchObject({
      text: "Administrar 1 comprimido, a cada 30 dias, durante 90 dias.",
      quantityDisplay: "3 comprimidos",
    });
  });

  it("dose única: sem duração na frase, quantidade = a dose", () => {
    expect(run({ frequency: "Dose única", period: "7 dias" })).toMatchObject({
      text: "Administrar 1 comprimido, em dose única.",
      quantityDisplay: "1 comprimido",
    });
  });

  it("uso contínuo: frase certa e quantidade fica pro veterinário", () => {
    expect(run({ frequency: "24 horas (1x/dia)", period: "Uso contínuo" })).toMatchObject({
      text: "Administrar 1 comprimido, a cada 24 horas, em uso contínuo.",
      quantityDisplay: "",
    });
  });

  it("se necessário", () => {
    expect(run({ frequency: "Se necessário", period: "5 dias" })).toMatchObject({
      text: "Administrar 1 comprimido, se necessário, durante 5 dias.",
      quantityDisplay: "",
    });
  });
});

describe("buildPosology — local de aplicação separado por vírgula", () => {
  it("gotas no ouvido: 'Instilar 4 gotas, em ambos os ouvidos, …' + 1 frasco", () => {
    expect(
      run({ useType: "Uso Auricular", form: "Gotas", dose: "4", site: "em ambos os ouvidos", period: "15 dias" })
    ).toMatchObject({
      text: "Instilar 4 gotas, em ambos os ouvidos, a cada 12 horas, durante 15 dias.",
      quantityDisplay: "1 frasco",
    });
  });

  it("colírio: 1 gota no singular", () => {
    expect(
      run({ useType: "Uso Oftalmológico", form: "Gotas", dose: "1", site: "no olho direito", frequency: "8 horas", period: "10 dias" })
    ).toMatchObject({
      text: "Instilar 1 gota, no olho direito, a cada 8 horas, durante 10 dias.",
      quantityDisplay: "1 frasco",
    });
  });

  it("spray oral", () => {
    expect(run({ form: "Spray", dose: "1", site: "diretamente na boca", period: "60 dias" })).toMatchObject({
      text: "Aplicar 1 borrifada, diretamente na boca, a cada 12 horas, durante 60 dias.",
      quantityDisplay: "1 frasco",
    });
  });

  it("pomada sem dose: 'uma fina camada' + 1 bisnaga", () => {
    expect(run({ useType: "Uso Tópico", form: "Pomada", dose: "", site: "na lesão" })).toMatchObject({
      text: "Aplicar uma fina camada, na lesão, a cada 12 horas, durante 7 dias.",
      quantityDisplay: "1 bisnaga",
    });
  });

  it("injetável com via", () => {
    expect(
      run({ useType: "Uso Injetável", form: "Líquido (mL)", dose: "0,5", site: "por via subcutânea", frequency: "24 horas (1x/dia)", period: "5 dias" })
    ).toMatchObject({ text: "Aplicar 0,5 mL, por via subcutânea, a cada 24 horas, durante 5 dias.", quantityDisplay: "1 frasco" });
  });

  it("pipeta mensal em uso contínuo", () => {
    expect(
      run({ useType: "Uso Tópico", form: "Pipeta", dose: "1", site: "na nuca", frequency: "1x por mês", period: "Uso contínuo" })
    ).toMatchObject({ text: "Aplicar 1 pipeta, na nuca, a cada 30 dias, em uso contínuo.", quantityDisplay: "" });
  });

  it("local 'Outro' com texto livre", () => {
    expect(
      run({ useType: "Uso Auricular", form: "Gotas", dose: "4", site: "Outro", customSite: "após a limpeza do ouvido" }).text
    ).toBe("Instilar 4 gotas, após a limpeza do ouvido, a cada 12 horas, durante 7 dias.");
  });
});

describe("buildPosology — líquidos e gotas orais: só '1 frasco'", () => {
  it("gotas orais", () => {
    expect(run({ form: "Gotas", dose: "10", period: "30 dias" })).toMatchObject({
      text: "Administrar 10 gotas, a cada 12 horas, durante 30 dias.",
      quantityDisplay: "1 frasco",
    });
  });

  it("líquido em mL (antes: 'Dê 5 líquido (ml)')", () => {
    expect(run({ form: "Líquido (mL)", dose: "5", period: "10 dias" })).toMatchObject({
      text: "Administrar 5 mL, a cada 12 horas, durante 10 dias.",
      quantityDisplay: "1 frasco",
    });
  });

  it("vírgula decimal e forma antiga 'Líquido (ml)'", () => {
    expect(run({ form: "Líquido (ml)", dose: "0,25", frequency: "6 horas", period: "14 dias" }).text).toBe(
      "Administrar 0,25 mL, a cada 6 horas, durante 14 dias."
    );
  });
});

describe("buildPosology — uso alimentar", () => {
  it("ração por dia (quantidade diária) com total em kg", () => {
    expect(
      run({ useType: "Uso Alimentar", form: "Ração (g)", dose: "70", frequency: "24 horas (1x/dia)", period: "90 dias" })
    ).toMatchObject({ text: "Oferecer 70 g por dia, durante 90 dias.", quantityDisplay: "6,3 kg" });
  });

  it("sachê em unidades", () => {
    expect(
      run({ useType: "Uso Alimentar", form: "Sachê", dose: "1", frequency: "24 horas (1x/dia)", period: "30 dias" })
    ).toMatchObject({ text: "Oferecer 1 sachê por dia, durante 30 dias.", quantityDisplay: "30 sachês" });
  });

  it("ração 2x ao dia continua com o intervalo", () => {
    expect(
      run({ useType: "Uso Alimentar", form: "Ração (g)", dose: "35", frequency: "12 horas", period: "30 dias" }).text
    ).toBe("Oferecer 35 g, a cada 12 horas, durante 30 dias.");
  });
});

describe("buildPosology — textos livres e dados antigos", () => {
  it("duração livre sem número não ganha 'durante' (antes: 'durante até voltar…')", () => {
    const r = run({ period: "Outro", customPeriod: "até voltar o apetite normal" });
    expect(r.text).toBe("Administrar 1 comprimido, a cada 12 horas, até voltar o apetite normal.");
    expect(r.quantityDisplay).toBe("");
  });

  it("duração livre em semanas entra na conta", () => {
    expect(run({ period: "Outro", customPeriod: "2 semanas" })).toMatchObject({
      text: "Administrar 1 comprimido, a cada 12 horas, durante 2 semanas.",
      quantityDisplay: "28 comprimidos",
    });
  });

  it("frequência livre '48h' vira 'a cada 48 horas' e conta certo", () => {
    expect(run({ frequency: "Outro", customFrequency: "48h", period: "10 dias" })).toMatchObject({
      text: "Administrar 1 comprimido, a cada 48 horas, durante 10 dias.",
      quantityDisplay: "5 comprimidos",
    });
  });

  it("receita antiga com o texto livre gravado direto em frequency/period", () => {
    expect(run({ frequency: "a cada 48 horas", period: "até voltar o apetite normal" }).text).toBe(
      "Administrar 1 comprimido, a cada 48 horas, até voltar o apetite normal."
    );
  });

  it("forma 'Outro' usa o nome digitado e deixa a quantidade pro veterinário", () => {
    expect(run({ form: "Outro", customForm: "Pasta oral", dose: "2" })).toMatchObject({
      text: "Administrar 2 pasta oral, a cada 12 horas, durante 7 dias.",
      quantityDisplay: "",
    });
  });

  it("sem dose ou sem forma: não inventa frase", () => {
    expect(run({ dose: "" }).text).toBe("");
    expect(run({ form: "" }).text).toBe("");
    expect(run({ form: "Outro", customForm: "" }).text).toBe("");
  });
});

describe("refreshMedicationPosology (abrir receita pra editar/repetir)", () => {
  const med = (over: Partial<MedicationData>): MedicationData => ({
    id: "m1",
    useType: "Uso Oral",
    pharmacyType: "Farmácia Veterinária",
    medicationName: "Carprofeno",
    concentration: "75mg",
    pharmaceuticalForm: "Comprimido",
    dosePerAdministration: "1/2 (meio)",
    frequency: "12 horas",
    period: "10 dias",
    useCustomInstructions: false,
    generatedInstructions: "Dê 1/2 (meio) comprimido(s), a cada 12 horas, durante 10 dias.",
    generalObservations: "",
    totalQuantity: "10",
    totalQuantityDisplay: "10 comprimido(s)",
    ...over,
  });

  it("regera texto e quantidade da receita antiga com o motor novo", () => {
    expect(refreshMedicationPosology(med({}))).toMatchObject({
      generatedInstructions: "Administrar 1/2 (meio) comprimido, a cada 12 horas, durante 10 dias.",
      totalQuantityDisplay: "10 comprimidos",
      totalQuantity: "10",
      useCustomInstructions: false,
    });
  });

  it("mantém instrução personalizada e quantidade editada", () => {
    const r = refreshMedicationPosology(
      med({ useCustomInstructions: true, generatedInstructions: "Texto meu", quantityEdited: true, totalQuantityDisplay: "1 caixa" })
    );
    expect(r.generatedInstructions).toBe("Texto meu");
    expect(r.totalQuantityDisplay).toBe("1 caixa");
  });

  it("não apaga texto antigo que o motor não consegue gerar (campos vazios)", () => {
    const r = refreshMedicationPosology(
      med({ pharmaceuticalForm: "", dosePerAdministration: "", frequency: "", period: "", generatedInstructions: "Dar 70g por dia" })
    );
    expect(r.generatedInstructions).toBe("Dar 70g por dia");
    expect(r.useCustomInstructions).toBe(true);
  });
});

describe("listas do formulário", () => {
  it("formas e locais dependem do tipo de uso", () => {
    expect(formsForUse("Uso Alimentar")).toContain("Ração (g)");
    expect(formsForUse("Uso Oftalmológico")).not.toContain("Comprimido");
    expect(formsForUse("")).toContain("Comprimido");
    expect(sitesForUse("Uso Auricular")).toContain("em ambos os ouvidos");
    expect(sitesForUse("Uso Alimentar")).toEqual([]);
  });
});

describe("parseConcentration", () => {
  it("mg por unidade, mg/mL, mg por N mL, % e mcg/g", () => {
    expect(parseConcentration("75mg")).toEqual({ mg: 75, perMl: false });
    expect(parseConcentration("50 mg/mL")).toEqual({ mg: 50, perMl: true });
    expect(parseConcentration("100mg/ml")).toEqual({ mg: 100, perMl: true });
    expect(parseConcentration("250mg/5mL")).toEqual({ mg: 50, perMl: true });
    expect(parseConcentration("1%")).toEqual({ mg: 10, perMl: true });
    expect(parseConcentration("2,5 mg")).toEqual({ mg: 2.5, perMl: false });
    expect(parseConcentration("250mcg")?.mg).toBeCloseTo(0.25);
    expect(parseConcentration("1g")).toEqual({ mg: 1000, perMl: false });
    // Só o número = mg por unidade (comprimido "500"); pra líquido não serve.
    expect(parseConcentration("500")).toEqual({ mg: 500, perMl: false });
  });

  it("sem número/unidade → null", () => {
    expect(parseConcentration("")).toBeNull();
    expect(parseConcentration("forte")).toBeNull();
    expect(parseConcentration("10 UI")).toBeNull();
  });
});

describe("calculateDoseByWeight", () => {
  const calc = (mgPerKg: number, weightKg: number, concentration: string, form: string) =>
    calculateDoseByWeight({ mgPerKg, weightKg, concentration, form });

  it("comprimido arredonda para 1/4 e fala a fração do jeito da receita", () => {
    // 4,4 mg/kg × 8,5 kg = 37,4 mg ÷ 75 mg ≈ 0,5 comprimido
    const r = calc(4.4, 8.5, "75mg", "Comprimido");
    expect(r).toMatchObject({ suggestedDose: "1/2", suggestedLabel: "1/2 (meio) comprimido" });
    if ("error" in r) throw new Error(r.error);
    expect(r.totalMg).toBeCloseTo(37.4);
    expect(r.actualMgPerKg).toBeCloseTo(4.41, 2);

    // 2,2 mg/kg × 10 kg = 22 mg ÷ 25 mg = 0,88 → 1 comprimido
    expect(calc(2.2, 10, "25mg", "Comprimido")).toMatchObject({ suggestedDose: "1", suggestedLabel: "1 comprimido" });

    // 4,4 × 30 = 132 mg ÷ 75 = 1,76 → 1 + 3/4
    expect(calc(4.4, 30, "75mg", "Comprimido")).toMatchObject({ suggestedDose: "1 + 3/4" });

    // 4,4 × 25,5 = 112,2 ÷ 75 ≈ 1,5 → "1 comprimido e meio"
    expect(calc(4.4, 25.5, "75mg", "Comprimido")).toMatchObject({
      suggestedDose: "1 + 1/2",
      suggestedLabel: "1 comprimido e meio",
    });
  });

  it("comprimido: dose menor que 1/4 fica em 1/4 com aviso", () => {
    const r = calc(0.5, 2, "75mg", "Comprimido");
    expect(r).toMatchObject({ suggestedDose: "1/4", suggestedLabel: "1/4 (um quarto) do comprimido" });
    expect("note" in r && r.note).toBeTruthy();
  });

  it("cápsula não divide: mínimo 1, com aviso quando passa muito do calculado", () => {
    const r = calc(10, 5, "100mg", "Cápsula");
    expect(r).toMatchObject({ suggestedDose: "1", suggestedLabel: "1 cápsula" });
    expect("note" in r && r.note).toBeTruthy();
    expect(calc(10, 20, "100mg", "Cápsula")).toMatchObject({ suggestedDose: "2", suggestedLabel: "2 cápsulas" });
  });

  it("líquido em mL com 1 casa (vírgula) e gotas com 1 mL = 20 gotas", () => {
    expect(calc(5, 6, "50mg/mL", "Líquido (mL)")).toMatchObject({ suggestedDose: "0,6", suggestedLabel: "0,6 mL" });
    // 250mg/5mL = 50 mg/mL; 20 mg/kg × 4 kg = 80 mg → 1,6 mL
    expect(calc(20, 4, "250mg/5mL", "Líquido (mL)")).toMatchObject({ suggestedDose: "1,6" });
    // Dipirona 500 mg/mL: 25 mg/kg × 4 kg = 100 mg = 0,2 mL = 4 gotas
    const g = calc(25, 4, "500mg/mL", "Gotas");
    expect(g).toMatchObject({ suggestedDose: "4", suggestedLabel: "4 gotas" });
    if ("error" in g) throw new Error(g.error);
    expect(g.actualMgPerKg).toBeCloseTo(25);
  });

  it("erros claros quando falta dado ou a concentração não serve pra forma", () => {
    expect(calc(0, 10, "75mg", "Comprimido")).toHaveProperty("error");
    expect(calc(2, 0, "75mg", "Comprimido")).toHaveProperty("error");
    expect(calc(2, 10, "50mg/mL", "Comprimido")).toHaveProperty("error");
    expect(calc(2, 10, "75mg", "Líquido (mL)")).toHaveProperty("error");
    expect(calc(2, 10, "", "Gotas")).toHaveProperty("error");
    expect(calc(2, 10, "75mg", "Spray")).toHaveProperty("error");
  });
});

describe("buildManipulatedPosology — receita manipulada no mesmo motor", () => {
  const parts = {
    route: "Oral",
    measure: "Cápsula",
    dosage: "1",
    frequencyValue: "12",
    frequencyUnit: "Hora(s)",
    durationValue: "7",
    durationUnit: "Dia(s)",
  };

  it("cápsula oral a cada 12 horas", () => {
    expect(buildManipulatedPosology(parts)).toBe("Administrar 1 cápsula, a cada 12 horas, durante 7 dias.");
  });

  it("líquido (ml) antigo vira mL; fração por extenso", () => {
    expect(buildManipulatedPosology({ ...parts, measure: "Líquido (ml)", dosage: "2" })).toBe(
      "Administrar 2 mL, a cada 12 horas, durante 7 dias."
    );
    expect(buildManipulatedPosology({ ...parts, measure: "Comprimido", dosage: "1/2" })).toBe(
      "Administrar 1/2 (meio) comprimido, a cada 12 horas, durante 7 dias."
    );
  });

  it("1 dia vira 'a cada 24 horas' (nunca 1x ao dia); meses e dia no singular", () => {
    expect(
      buildManipulatedPosology({ ...parts, frequencyValue: "1", frequencyUnit: "Dia(s)", durationValue: "2", durationUnit: "Mês(es)" })
    ).toBe("Administrar 1 cápsula, a cada 24 horas, durante 2 meses.");
    expect(buildManipulatedPosology({ ...parts, frequencyValue: "24", durationValue: "1" })).toBe(
      "Administrar 1 cápsula, a cada 24 horas, durante 1 dia."
    );
    expect(buildManipulatedPosology({ ...parts, frequencyValue: "3", frequencyUnit: "Dia(s)" })).toBe(
      "Administrar 1 cápsula, a cada 3 dias, durante 7 dias."
    );
  });

  it("biscoito e sachê: oferecer, com plural e fração", () => {
    expect(buildManipulatedPosology({ ...parts, measure: "Biscoito", dosage: "1", frequencyValue: "24" })).toBe(
      "Oferecer 1 biscoito, a cada 24 horas, durante 7 dias."
    );
    expect(buildManipulatedPosology({ ...parts, measure: "Biscoito", dosage: "1/2" })).toBe(
      "Oferecer 1/2 (meio) biscoito, a cada 12 horas, durante 7 dias."
    );
    expect(buildManipulatedPosology({ ...parts, measure: "Sachê", dosage: "2" })).toBe(
      "Oferecer 2 sachês, a cada 12 horas, durante 7 dias."
    );
  });

  it("semanas: frequência vira dias ('a cada 7 dias'), duração fica em semanas", () => {
    expect(
      buildManipulatedPosology({ ...parts, frequencyValue: "1", frequencyUnit: "Semana(s)", durationValue: "8", durationUnit: "Semana(s)" })
    ).toBe("Administrar 1 cápsula, a cada 7 dias, durante 8 semanas.");
    expect(buildManipulatedPosology({ ...parts, frequencyValue: "2", frequencyUnit: "Semana(s)", durationValue: "1", durationUnit: "Semana(s)" })).toBe(
      "Administrar 1 cápsula, a cada 14 dias, durante 1 semana."
    );
  });

  it("verbo pela via: tópica aplica, oftálmica instila gotas", () => {
    expect(buildManipulatedPosology({ ...parts, route: "Tópica", measure: "Pomada", dosage: "" })).toMatch(/^Aplicar /);
    expect(buildManipulatedPosology({ ...parts, route: "Oftálmica", measure: "Gotas", dosage: "2" })).toMatch(
      /^Instilar 2 gotas/
    );
  });

  it("sem campos → texto vazio (o veterinário escreve à mão)", () => {
    expect(
      buildManipulatedPosology({ route: "", measure: "", dosage: "", frequencyValue: "", frequencyUnit: "", durationValue: "", durationUnit: "" })
    ).toBe("");
  });
});
