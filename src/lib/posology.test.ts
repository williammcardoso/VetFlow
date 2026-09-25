import { describe, expect, it } from "vitest";
import { buildPosology, formsForUse, sitesForUse, type PosologyInput } from "./posology";

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

  it("fração: tira o '(meio)' do texto e usa singular", () => {
    const r = run({ dose: "1/2 (meio)", frequency: "24 horas (1x/dia)", period: "5 dias" });
    expect(r.text).toBe("Administrar 1/2 comprimido, 1 vez ao dia, durante 5 dias.");
    expect(r.quantityDisplay).toBe("3 comprimidos");
  });

  it("arredonda pra CIMA (1/4 por 5 dias = 1,25 → 2 comprimidos)", () => {
    expect(run({ dose: "1/4", frequency: "24 horas (1x/dia)", period: "5 dias" }).quantityDisplay).toBe("2 comprimidos");
  });

  it("dose mista '1 + 1/2 (um e meio)'", () => {
    const r = run({ dose: "1 + 1/2 (um e meio)", period: "30 dias" });
    expect(r.text).toBe("Administrar 1 e 1/2 comprimido, a cada 12 horas, durante 30 dias.");
    expect(r.quantityDisplay).toBe("90 comprimidos");
  });

  it("cápsula no plural", () => {
    expect(run({ form: "Cápsula", dose: "2", frequency: "24 horas (1x/dia)", period: "10 dias" })).toMatchObject({
      text: "Administrar 2 cápsulas, 1 vez ao dia, durante 10 dias.",
      quantityDisplay: "20 cápsulas",
    });
  });

  it("48 horas conta metade das doses (antes contava como 1x/dia)", () => {
    expect(run({ frequency: "48 horas", period: "10 dias" })).toMatchObject({
      text: "Administrar 1 comprimido, a cada 48 horas, durante 10 dias.",
      quantityDisplay: "5 comprimidos",
    });
  });

  it("mensal por 90 dias (antipulgas) = 3 comprimidos", () => {
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
      text: "Administrar 1 comprimido, 1 vez ao dia, em uso contínuo.",
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

describe("buildPosology — gotas (1 mL = 20 gotas)", () => {
  it("oral: 'Administrar' e frasco com mínimo em mL (antes: '600 gotas(s)')", () => {
    expect(run({ form: "Gotas", dose: "10", period: "30 dias" })).toMatchObject({
      text: "Administrar 10 gotas, a cada 12 horas, durante 30 dias.",
      quantityDisplay: "1 frasco (mín. 30 mL)",
    });
  });

  it("ouvido: 'Instilar' + local", () => {
    expect(
      run({ useType: "Uso Auricular", form: "Gotas", dose: "4", site: "em ambos os ouvidos", period: "15 dias" })
    ).toMatchObject({
      text: "Instilar 4 gotas em ambos os ouvidos, a cada 12 horas, durante 15 dias.",
      quantityDisplay: "1 frasco (mín. 6 mL)",
    });
  });

  it("colírio: 1 gota no singular, mínimo arredondado pra cima", () => {
    expect(
      run({ useType: "Uso Oftalmológico", form: "Gotas", dose: "1", site: "no olho direito", frequency: "8 horas", period: "10 dias" })
    ).toMatchObject({
      text: "Instilar 1 gota no olho direito, a cada 8 horas, durante 10 dias.",
      quantityDisplay: "1 frasco (mín. 2 mL)",
    });
  });
});

describe("buildPosology — embalagens e líquidos", () => {
  it("spray oral: 1 frasco (antes '120 spray')", () => {
    expect(
      run({ form: "Spray", dose: "1", site: "diretamente na boca", period: "60 dias" })
    ).toMatchObject({
      text: "Aplicar 1 borrifada diretamente na boca, a cada 12 horas, durante 60 dias.",
      quantityDisplay: "1 frasco",
    });
  });

  it("pomada sem dose: 'uma fina camada' + 1 bisnaga", () => {
    expect(run({ useType: "Uso Tópico", form: "Pomada", dose: "", site: "na lesão" })).toMatchObject({
      text: "Aplicar uma fina camada na lesão, a cada 12 horas, durante 7 dias.",
      quantityDisplay: "1 bisnaga",
    });
  });

  it("líquido em mL (antes: 'Dê 5 líquido (ml)')", () => {
    expect(run({ form: "Líquido (mL)", dose: "5", period: "10 dias" })).toMatchObject({
      text: "Administrar 5 mL, a cada 12 horas, durante 10 dias.",
      quantityDisplay: "1 frasco (mín. 100 mL)",
    });
  });

  it("líquido com vírgula decimal e forma antiga 'Líquido (ml)'", () => {
    expect(run({ form: "Líquido (ml)", dose: "0,25", frequency: "6 horas", period: "14 dias" })).toMatchObject({
      text: "Administrar 0,25 mL, a cada 6 horas, durante 14 dias.",
      quantityDisplay: "1 frasco (mín. 14 mL)",
    });
  });

  it("injetável: 'Aplicar' com via", () => {
    expect(
      run({ useType: "Uso Injetável", form: "Líquido (mL)", dose: "0,5", site: "por via subcutânea", frequency: "24 horas (1x/dia)", period: "5 dias" })
    ).toMatchObject({ text: "Aplicar 0,5 mL por via subcutânea, 1 vez ao dia, durante 5 dias." });
  });

  it("pipeta mensal em uso contínuo", () => {
    expect(
      run({ useType: "Uso Tópico", form: "Pipeta", dose: "1", site: "na nuca", frequency: "1x por mês", period: "Uso contínuo" })
    ).toMatchObject({ text: "Aplicar 1 pipeta na nuca, a cada 30 dias, em uso contínuo.", quantityDisplay: "" });
  });
});

describe("buildPosology — uso alimentar", () => {
  it("ração por dia com total em kg", () => {
    expect(
      run({ useType: "Uso Alimentar", form: "Ração (g)", dose: "70", frequency: "24 horas (1x/dia)", period: "90 dias" })
    ).toMatchObject({ text: "Oferecer 70 g por dia, durante 90 dias.", quantityDisplay: "6,3 kg" });
  });

  it("sachê em unidades", () => {
    expect(
      run({ useType: "Uso Alimentar", form: "Sachê", dose: "1", frequency: "24 horas (1x/dia)", period: "30 dias" })
    ).toMatchObject({ text: "Oferecer 1 sachê por dia, durante 30 dias.", quantityDisplay: "30 sachês" });
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

  it("sem dose ainda: não inventa frase", () => {
    expect(run({ dose: "" }).text).toBe("");
  });

  it("sem forma escolhida (ou 'Outro' sem nome): não inventa frase", () => {
    expect(run({ form: "" }).text).toBe("");
    expect(run({ form: "Outro", customForm: "" }).text).toBe("");
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
