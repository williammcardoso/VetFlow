import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  renderDocumentTemplate,
  displayDocumentText,
  extractTemplateVariables,
  blankPendingMarkers,
  fillPendingMarkers,
  pendingPaths,
  type DocumentTemplateContext,
} from "./documentTemplateEngine";

describe("pendências no texto editado à mão", () => {
  const editado = "Peso: [[PENDENTE: atend.peso]] kg. Vacinas: (X) V10. Obs: [[PENDENTE: atend.obs]]";
  it("o que se digita no campo entra no texto mesmo depois de editado", () => {
    const texto = fillPendingMarkers(editado, { "atend.peso": "6,6" });
    expect(texto).toBe("Peso: 6,6 kg. Vacinas: (X) V10. Obs: [[PENDENTE: atend.obs]]");
    expect(pendingPaths(texto)).toEqual(["atend.obs"]);
  });
  it("campo vazio mantém a marca; na emissão a sobra vira linha em branco", () => {
    expect(fillPendingMarkers(editado, { "atend.peso": "  " })).toBe(editado);
    expect(blankPendingMarkers(editado)).toBe("Peso: __________ kg. Vacinas: (X) V10. Obs: __________");
  });
});

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

  it("mantém &, < e > dos valores como foram digitados (o PDF imprime texto puro)", () => {
    const { texto } = renderDocumentTemplate("Nome: {{resp.nome}} <TCLE>", {
      resp: { nome: "Empresa & Cia <teste>" },
    });
    expect(texto).toBe("Nome: Empresa & Cia <teste> <TCLE>");
  });

  it("displayDocumentText desfaz o escape gravado em documentos antigos", () => {
    expect(displayDocumentText("Pet &amp; Cia &lt;5 kg&gt;")).toBe("Pet & Cia <5 kg>");
    expect(displayDocumentText("&amp;lt;")).toBe("&lt;");
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
