import { describe, expect, it } from "vitest";
import { addressText, ageText, availableShareFields, buildPatientShareText, DEFAULT_SHARE_FIELDS, sexText } from "./patientShareText";

const now = new Date(2026, 10, 19, 10, 0); // 19/11/2026
const animal = {
  name: "Thor",
  species: "Canina",
  breed: "Golden Retriever",
  gender: "Macho",
  neutered: true,
  birthday: "2018-01-20",
  coatColor: "Dourado",
  microchip: "",
};
const client = {
  name: "Carlos Henrique Souza",
  clientType: "physical" as const,
  identificationNumber: "123.456.789-00",
  secondaryIdentification: "12.345.678-9",
  mainPhoneContact: "(19) 98888-1111",
  secondaryPhoneContact: "(19) 97777-0000",
  secondaryPhoneLabel: "Esposa",
  mainEmailContact: "carlos@example.com",
  address: { cep: "13010-000", street: "Rua das Flores", number: "120", complement: "apto 2", neighborhood: "Centro", city: "Campinas", state: "SP" },
};

describe("buildPatientShareText", () => {
  it("monta o texto com os campos marcados, sem RG por padrão", () => {
    const text = buildPatientShareText({
      animal,
      client,
      include: DEFAULT_SHARE_FIELDS,
      weight: { kg: 32.5, date: "2026-10-15" },
      note: "Ecocardiograma — sopro grau III",
      clinicName: "Clínica Moraes Cardoso",
      now,
    });
    expect(text).toBe(
      [
        "*Dados do paciente — Clínica Moraes Cardoso*",
        "",
        "📋 *Solicitação:* Ecocardiograma — sopro grau III",
        "",
        "🐾 *Paciente*",
        "Nome: Thor",
        "Espécie: Canina — Golden Retriever",
        "Sexo: Macho, castrado",
        "Nascimento: 20/01/2018 (8 anos e 9 meses)",
        "Peso: 32,5 kg (pesado em 15/10/2026)",
        "Pelagem: Dourado",
        "",
        "👤 *Tutor*",
        "Nome: Carlos Henrique Souza",
        "CPF: 123.456.789-00",
        "Telefone: (19) 98888-1111",
        "Outro telefone: (19) 97777-0000 (Esposa)",
        "E-mail: carlos@example.com",
        "Endereço: Rua das Flores, 120, apto 2 — Centro, Campinas/SP — CEP 13010-000",
      ].join("\n")
    );
  });

  it("só nome do pet e do tutor quando nada é marcado; CNPJ/IE para empresa", () => {
    const text = buildPatientShareText({ animal, client: { ...client, clientType: "legal" }, include: ["documento", "rg"], now });
    expect(text).toBe(
      ["*Dados do paciente*", "", "🐾 *Paciente*", "Nome: Thor", "", "👤 *Tutor*", "Nome: Carlos Henrique Souza", "CNPJ: 123.456.789-00", "IE: 12.345.678-9"].join("\n")
    );
  });
});

describe("partes do texto", () => {
  it("idade, sexo e endereço", () => {
    expect(ageText("2018-01-20", now)).toBe("8 anos e 9 meses");
    expect(ageText("2026-11-19", now)).toBe("menos de 1 mês");
    expect(ageText("2025-11-19", now)).toBe("1 ano");
    expect(sexText("Fêmea", false)).toBe("Fêmea, não castrada");
    expect(sexText("Macho", null)).toBe("Macho");
    expect(addressText({ street: "Rua A", number: "1", city: "Itapira" })).toBe("Rua A, 1 — Itapira");
    expect(addressText({})).toBe("");
  });

  it("só oferece os campos que têm dado", () => {
    expect(availableShareFields({ name: "Mel", species: "Felina" }, { name: "Ana", mainPhoneContact: "(19) 9" }, 0)).toEqual(["especie", "telefone"]);
  });
});
