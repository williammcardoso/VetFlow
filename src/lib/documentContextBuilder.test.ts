import { describe, expect, it } from "vitest";
import { calcularIdadeTexto, mergeManualFields, buildAutoDocumentContext } from "./documentContextBuilder";
import type { Animal, Client } from "@/types/client";
import type { CompanySettings } from "@/types/settings";

const ANIMAL_BASE: Animal = {
  id: "a1",
  name: "Thor",
  species: "Canina",
  breed: "Labrador",
  gender: "Macho",
  birthday: "",
  coatColor: "Dourada",
  weight: 28,
  microchip: "",
  notes: "",
  status: "Ativo",
};

const CLIENT_BASE: Client = {
  id: "c1",
  name: "Maria",
  clientType: "physical",
  nationality: "Brasileira",
  identificationNumber: "000",
  secondaryIdentification: "111",
  birthday: "",
  profession: "",
  acceptEmail: "no",
  acceptWhatsapp: "no",
  acceptSMS: "no",
  mainEmailContact: "maria@example.com",
  mainPhoneContact: "(19) 90000-0000",
  dynamicContacts: [],
  address: { cep: "", street: "Rua X", number: "1", complement: "", neighborhood: "", city: "Itapira", state: "SP" },
  notes: "",
  animals: [],
};

const COMPANY_BASE: CompanySettings = {
  companyName: "Clínica",
  razaoSocial: "",
  cnpj: "",
  crmv: "",
  mapaRegistration: "",
  address: "",
  city: "Itapira",
  zipCode: "",
  phone: "",
  email: "",
};

describe("calcularIdadeTexto", () => {
  it("calcula anos e meses a partir da data de nascimento", () => {
    const doisAnosAtras = new Date();
    doisAnosAtras.setFullYear(doisAnosAtras.getFullYear() - 2);
    const iso = doisAnosAtras.toISOString().slice(0, 10);
    expect(calcularIdadeTexto(iso)).toMatch(/^2 ano\(s\)/);
  });

  it("devolve vazio sem data de nascimento", () => {
    expect(calcularIdadeTexto(null)).toBe("");
    expect(calcularIdadeTexto(undefined)).toBe("");
  });

  it("devolve vazio para data inválida (não quebra)", () => {
    expect(calcularIdadeTexto("não é uma data")).toBe("");
  });
});

describe("buildAutoDocumentContext", () => {
  it("microchip vazio no cadastro vira 'Não informado', nunca fica pendente pro usuário preencher", () => {
    const contexto = buildAutoDocumentContext({
      animal: ANIMAL_BASE,
      client: CLIENT_BASE,
      vetProfile: null,
      company: COMPANY_BASE,
    });
    expect(contexto.pac?.microchip).toBe("Não informado");
  });

  it("usa o microchip do cadastro quando existe", () => {
    const contexto = buildAutoDocumentContext({
      animal: { ...ANIMAL_BASE, microchip: "900000000012345" },
      client: CLIENT_BASE,
      vetProfile: null,
      company: COMPANY_BASE,
    });
    expect(contexto.pac?.microchip).toBe("900000000012345");
  });

  it("resenha nunca fica pendente (não tem campo equivalente no cadastro)", () => {
    const contexto = buildAutoDocumentContext({
      animal: ANIMAL_BASE,
      client: CLIENT_BASE,
      vetProfile: null,
      company: COMPANY_BASE,
    });
    expect(contexto.pac?.resenha).toBe("Não informado");
  });
});

describe("mergeManualFields", () => {
  it("aplica um campo simples por cima do contexto base", () => {
    const base = { atend: { data: "15/08/2026" } };
    const resultado = mergeManualFields(base, { "atend.diagnostico": "Otite externa" });
    expect(resultado.atend).toEqual({ data: "15/08/2026", diagnostico: "Otite externa" });
  });

  it("valor com múltiplas linhas vira array", () => {
    const resultado = mergeManualFields({}, { "exame.requisitos": "Item 1\nItem 2\n\nItem 3" });
    expect(resultado.exame?.requisitos).toEqual(["Item 1", "Item 2", "Item 3"]);
  });

  it("ignora campo em branco (não sobrescreve com vazio)", () => {
    const resultado = mergeManualFields({}, { "atend.observacoes": "   \n  " });
    expect(resultado.atend).toBeUndefined();
  });

  it("não mexe nos escopos que não recebem campo manual", () => {
    const base = { pac: { nome: "Rex" } };
    const resultado = mergeManualFields(base, { "atend.diagnostico": "X" });
    expect(resultado.pac).toEqual({ nome: "Rex" });
  });
});
