import { describe, expect, it } from "vitest";
import type { MedicationData } from "@/types/medication";
import {
  buildPosology,
  formsForUse,
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
