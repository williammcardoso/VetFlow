import { describe, expect, it } from "vitest";
import { parseCorpoIntoSegments } from "./documentPdfLayout";

describe("parseCorpoIntoSegments", () => {
  it("reconhece o título (uma ou duas linhas em caixa alta no início)", () => {
    const segs = parseCorpoIntoSegments("TERMO DE CONSENTIMENTO\nPARA REALIZAÇÃO DE EXAMES\n\nTexto normal aqui.");
    expect(segs[0]).toEqual({ kind: "titulo", texto: "TERMO DE CONSENTIMENTO PARA REALIZAÇÃO DE EXAMES" });
  });

  it("junta linhas de parágrafo quebradas (hard-wrap do markdown) em um só bloco justificável", () => {
    const segs = parseCorpoIntoSegments(
      "TÍTULO\n\nAtesto, para os devidos fins, que o(a) Sr.(a) Maria, portador(a) do\nCPF nº 000, compareceu a este estabelecimento."
    );
    const paragrafo = segs.find((s) => s.kind === "paragrafo");
    expect(paragrafo).toEqual({
      kind: "paragrafo",
      texto: "Atesto, para os devidos fins, que o(a) Sr.(a) Maria, portador(a) do CPF nº 000, compareceu a este estabelecimento.",
    });
  });

  it("reconhece seção numerada", () => {
    const segs = parseCorpoIntoSegments("TÍTULO\n\n1. DIAGNÓSTICO / INDICAÇÃO\nOtite externa.");
    expect(segs.find((s) => s.kind === "secao")).toEqual({ kind: "secao", texto: "1. DIAGNÓSTICO / INDICAÇÃO" });
  });

  it("agrupa IDENTIFICAÇÃO DO PACIENTE + IDENTIFICAÇÃO DO RESPONSÁVEL num único segmento pareado", () => {
    const texto = [
      "TÍTULO",
      "",
      "IDENTIFICAÇÃO DO PACIENTE",
      "Nome: Thor",
      "Espécie: Canina",
      "",
      "IDENTIFICAÇÃO DO RESPONSÁVEL PELO ANIMAL",
      "Nome: Maria",
      "CPF: 000",
    ].join("\n");
    const segs = parseCorpoIntoSegments(texto);
    const id = segs.find((s) => s.kind === "identificacao");
    expect(id).toMatchObject({
      kind: "identificacao",
      paciente: { titulo: "IDENTIFICAÇÃO DO PACIENTE", campos: [{ rotulo: "Nome", valor: "Thor" }, { rotulo: "Espécie", valor: "Canina" }] },
      responsavel: { titulo: "IDENTIFICAÇÃO DO RESPONSÁVEL PELO ANIMAL", campos: [{ rotulo: "Nome", valor: "Maria" }, { rotulo: "CPF", valor: "000" }] },
    });
  });

  it("reconhece um bloco de assinatura dupla (responsável + vet) a partir das linhas de sublinhado", () => {
    const texto = [
      "TÍTULO",
      "",
      "Itapira, 15 de agosto de 2026.",
      "",
      "______________________________________",
      "Maria Aparecida Souza",
      "CPF 000.000.000-00",
      "Responsável pelo animal",
      "",
      "______________________________________",
      "Dr. William Cardoso",
      "CRMV-SP nº 56895",
      "Médico-Veterinário",
    ].join("\n");
    const segs = parseCorpoIntoSegments(texto);
    const assinaturas = segs.find((s) => s.kind === "assinaturas");
    expect(assinaturas).toEqual({
      kind: "assinaturas",
      entradas: [
        { nome: "Maria Aparecida Souza", documento: "CPF 000.000.000-00", papel: "Responsável pelo animal" },
        { nome: "Dr. William Cardoso", documento: "CRMV-SP nº 56895", papel: "Médico-Veterinário" },
      ],
    });
  });

  it("reconhece um bloco de assinatura única (só o veterinário, ex.: atestados)", () => {
    const texto = [
      "TÍTULO",
      "",
      "______________________________________",
      "Dr. William Cardoso",
      "CRMV-SP nº 56895",
      "Médico-Veterinário",
    ].join("\n");
    const segs = parseCorpoIntoSegments(texto);
    const assinaturas = segs.find((s) => s.kind === "assinaturas");
    expect(assinaturas).toEqual({
      kind: "assinaturas",
      entradas: [{ nome: "Dr. William Cardoso", documento: "CRMV-SP nº 56895", papel: "Médico-Veterinário" }],
    });
  });

  it("mantém linha de preenchimento manual (rótulo + pontos) isolada, sem juntar com o parágrafo vizinho", () => {
    const segs = parseCorpoIntoSegments(
      "TÍTULO\n\nCausa básica: ......................................................\nCausa intermediária: ..............................................."
    );
    const linhas = segs.filter((s) => s.kind === "linha");
    expect(linhas.length).toBe(2);
  });

  it("junta campos que a biblioteca quebrou em duas linhas terminando com travessão (ex.: A1)", () => {
    const texto = [
      "TÍTULO",
      "",
      "IDENTIFICAÇÃO DO PACIENTE",
      "Nome: Thor — Espécie: Canina — Raça: Labrador —",
      "Sexo: Macho — Idade: 5 anos — Microchip: 123",
    ].join("\n");
    const segs = parseCorpoIntoSegments(texto);
    const id = segs.find((s) => s.kind === "identificacao");
    expect(id).toMatchObject({
      kind: "identificacao",
      paciente: {
        campos: [
          { rotulo: "Nome", valor: "Thor" },
          { rotulo: "Espécie", valor: "Canina" },
          { rotulo: "Raça", valor: "Labrador" },
          { rotulo: "Sexo", valor: "Macho" },
          { rotulo: "Idade", valor: "5 anos" },
          { rotulo: "Microchip", valor: "123" },
        ],
      },
    });
  });

  it("não junta linhas 'Rótulo: valor' (ex.: checkbox com label) com a frase seguinte — bug real reportado pelo usuário (B3/anestesia)", () => {
    const texto = [
      "TÍTULO",
      "",
      "Classificação ASA: ( x ) I ( ) II ( ) III ( ) IV ( ) V ( ) E",
      "Exames realizados: HEMATOLOGICOS, US, RX, CARDIOLOGICOS",
      "Comorbidades identificadas: Sobrepeso",
    ].join("\n");
    const segs = parseCorpoIntoSegments(texto);
    const linhas = segs.filter((s) => s.kind === "linha").map((s) => (s as { texto: string }).texto);
    expect(linhas).toEqual([
      "Classificação ASA: ( x ) I ( ) II ( ) III ( ) IV ( ) V ( ) E",
      "Exames realizados: HEMATOLOGICOS, US, RX, CARDIOLOGICOS",
      "Comorbidades identificadas: Sobrepeso",
    ]);
    expect(segs.find((s) => s.kind === "paragrafo")).toBeUndefined();
  });

  it("linha 'Rótulo: valor' seguida de prosa comum não gruda nela (ex.: Fármacos previstos: X / Estou ciente...)", () => {
    const texto = [
      "TÍTULO",
      "",
      "Fármacos previstos: TIVA + INALATÓRIA",
      "Estou ciente de que o protocolo poderá ser alterado a critério técnico da equipe,",
      "conforme a resposta individual do paciente.",
    ].join("\n");
    const segs = parseCorpoIntoSegments(texto);
    const linha = segs.find((s) => s.kind === "linha");
    const paragrafo = segs.find((s) => s.kind === "paragrafo");
    expect(linha).toEqual({ kind: "linha", texto: "Fármacos previstos: TIVA + INALATÓRIA" });
    expect(paragrafo).toEqual({
      kind: "paragrafo",
      texto: "Estou ciente de que o protocolo poderá ser alterado a critério técnico da equipe, conforme a resposta individual do paciente.",
    });
  });

  it("reconhece tabela markdown (cabeçalho + separador + linhas) em vez de virar parágrafo emendado — bug real reportado (A4/vacinação)", () => {
    const texto = [
      "TÍTULO",
      "",
      "| Vacina | Fabricante | Lote | Validade |",
      "|--------|-----------|------|----------|",
      "| V10 | Ronvac | 005-10 | 05/25 |",
      "|      |           |      |          |",
    ].join("\n");
    const segs = parseCorpoIntoSegments(texto);
    const tabela = segs.find((s) => s.kind === "tabela");
    expect(tabela).toEqual({
      kind: "tabela",
      cabecalhos: ["Vacina", "Fabricante", "Lote", "Validade"],
      linhas: [
        ["V10", "Ronvac", "005-10", "05/25"],
        ["", "", "", ""],
      ],
    });
    expect(segs.find((s) => s.kind === "paragrafo")).toBeUndefined();
  });

  it("remove ** de negrito markdown dentro de célula de tabela (ex.: linha TOTAL do orçamento D2)", () => {
    const texto = ["TÍTULO", "", "| A | B |", "|---|---|", "| **TOTAL** | **R$ 100** |"].join("\n");
    const segs = parseCorpoIntoSegments(texto);
    const tabela = segs.find((s) => s.kind === "tabela") as { linhas: string[][] } | undefined;
    expect(tabela?.linhas[0]).toEqual(["TOTAL", "R$ 100"]);
  });

  it("não quebra com texto vazio", () => {
    expect(parseCorpoIntoSegments("")).toEqual([]);
  });
});
