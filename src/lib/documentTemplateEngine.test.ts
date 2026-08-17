import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderDocumentTemplate, extractTemplateVariables, type DocumentTemplateContext } from "./documentTemplateEngine";

describe("renderDocumentTemplate", () => {
  it("resolve uma variável simples a partir do contexto", () => {
    const { texto, variaveisPendentes } = renderDocumentTemplate("Olá, {{resp.nome}}!", {
      resp: { nome: "Maria" },
    });
    expect(texto).toBe("Olá, Maria!");
    expect(variaveisPendentes).toEqual([]);
  });

  it("nunca renderiza undefined ou vazio silenciosamente para variável ausente", () => {
    const { texto, variaveisPendentes } = renderDocumentTemplate("CPF: {{resp.cpf}}", {
      resp: { nome: "Maria" },
    });
    expect(texto).not.toContain("undefined");
    expect(texto).toBe("CPF: [[PENDENTE: resp.cpf]]");
    expect(variaveisPendentes).toEqual(["resp.cpf"]);
  });

  it("trata string vazia (após trim) como pendente, não como valor válido", () => {
    const { texto, variaveisPendentes } = renderDocumentTemplate("Obs: {{atend.observacoes}}", {
      atend: { observacoes: "   " },
    });
    expect(texto).toBe("Obs: [[PENDENTE: atend.observacoes]]");
    expect(variaveisPendentes).toEqual(["atend.observacoes"]);
  });

  it("filtra itens vazios de uma lista antes de renderizar, sem marcador em branco", () => {
    const { texto, variaveisPendentes } = renderDocumentTemplate("{{exame.requisitos}}", {
      exame: { requisitos: ["Contraste iodado", "", "  ", "Corte fino"] },
    });
    expect(texto).toBe("- Contraste iodado\n- Corte fino");
    expect(texto).not.toMatch(/^-\s*$/m);
    expect(variaveisPendentes).toEqual([]);
  });

  it("lista vazia (todos os itens filtrados) conta como pendente", () => {
    const { variaveisPendentes } = renderDocumentTemplate("{{exame.requisitos}}", {
      exame: { requisitos: ["", "   "] },
    });
    expect(variaveisPendentes).toEqual(["exame.requisitos"]);
  });

  it("expande [BLOCO DE IDENTIFICAÇÃO DO PACIENTE] e resolve as variáveis internas do bloco", () => {
    const { texto, variaveisPendentes } = renderDocumentTemplate(
      "[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]",
      { pac: { nome: "Rex", especie: "Canina", raca: "SRD", sexo: "Macho", idade: "3 anos", peso: "12", pelagem: "Preta", microchip: "123", resenha: "-" } }
    );
    expect(texto).toContain("IDENTIFICAÇÃO DO PACIENTE");
    expect(texto).toContain("Nome: Rex");
    expect(texto).toContain("Espécie: Canina");
    expect(variaveisPendentes).toEqual([]);
  });

  it("expande [BLOCO DE ASSINATURA DO MÉDICO-VETERINÁRIO] (coluna única, só vet)", () => {
    const { texto } = renderDocumentTemplate("[BLOCO DE ASSINATURA DO MÉDICO-VETERINÁRIO]", {
      doc: { local: "Itapira", data_extenso: "15 de agosto de 2026" },
      vet: { nome: "Dr. William Cardoso", crmv: "56895", crmv_uf: "SP" },
    });
    expect(texto).toContain("Dr. William Cardoso");
    expect(texto).toContain("CRMV-SP nº 56895");
    expect(texto).not.toContain("Responsável pelo animal");
  });

  it("escapa caracteres de HTML nos valores interpolados, sem mexer no texto estático do modelo", () => {
    const { texto } = renderDocumentTemplate("Nome: {{resp.nome}} <TCLE>", {
      resp: { nome: "Empresa & Cia <teste>" },
    });
    expect(texto).toBe("Nome: Empresa &amp; Cia &lt;teste&gt; <TCLE>");
  });

  it("deixa colchetes que não são um bloco reconhecido intocados", () => {
    const { texto } = renderDocumentTemplate("Texto [NÃO É UM BLOCO] normal", {});
    expect(texto).toBe("Texto [NÃO É UM BLOCO] normal");
  });

  it("renderiza um modelo real da biblioteca (A1) sem sobrar {{ }} nem pendência quando todo o contexto é fornecido", () => {
    const md = readFileSync(
      path.resolve(__dirname, "../../docs/documentos/vetflow-modelos-documentos.md"),
      "utf8"
    );
    const secao = md.slice(md.indexOf("## A1."), md.indexOf("## A2."));
    const corpo = secao.match(/```\n([\s\S]*?)```/)![1].trim();

    const context: DocumentTemplateContext = {
      resp: { nome: "Maria Souza", cpf: "000.000.000-00" },
      atend: {
        data: "15/08/2026",
        hora_entrada: "09h00",
        hora_saida: "10h00",
        procedimento: "Consulta clínica",
      },
      pac: { nome: "Rex", especie: "Canina", raca: "SRD", sexo: "Macho", idade: "3 anos", microchip: "123456" },
      doc: { local: "Itapira", data_extenso: "15 de agosto de 2026" },
      vet: { nome: "Dr. William Cardoso", crmv: "56895", crmv_uf: "SP" },
    };

    const { texto, variaveisPendentes } = renderDocumentTemplate(corpo, context);
    expect(variaveisPendentes).toEqual([]);
    expect(texto).not.toMatch(/\{\{|\}\}/);
    expect(texto).toContain("Maria Souza");
  });
});

describe("extractTemplateVariables", () => {
  it("extrai os caminhos {{ }} usados, ordenados e sem duplicata", () => {
    const corpo = "Nome: {{pac.nome}}\nCPF: {{resp.cpf}}\nNome de novo: {{pac.nome}}\nData: {{atend.data}}";
    expect(extractTemplateVariables(corpo)).toEqual(["atend.data", "pac.nome", "resp.cpf"]);
  });

  it("não expande blocos — se o corpo ainda tem [BLOCO ...], as variáveis internas do bloco não aparecem", () => {
    expect(extractTemplateVariables("[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]")).toEqual([]);
  });

  it("devolve array vazio quando não há nenhuma variável", () => {
    expect(extractTemplateVariables("Texto sem variáveis.")).toEqual([]);
  });
});
