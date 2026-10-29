import { describe, expect, it } from "vitest";
import { applyFillAnswers, countFillFields, parseFillFields, prettySectionTitle } from "./documentFillFields";

const CORPO = `TERMO DE TESTE

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]

3. AVALIAÇÃO PRÉ-ANESTÉSICA
Classificação ASA: ( ) I ( ) II ( ) III
Exames realizados: ................................................
Jejum orientado: alimentar ____ h / hídrico ____ h — cumprido? ( ) Sim ( ) Não

6. AUTORIZAÇÃO PARA MANOBRAS DE REANIMAÇÃO
Em caso de parada cardiorrespiratória:
( ) AUTORIZO todas as manobras
( ) AUTORIZO manobras limitadas a: ................................
( ) Pediculado ( ) Séssil — Consistência: ........................

TESTEMUNHAS
1. Nome: ......................... CPF: .............. Ass.: ...........
Data: ....../....../......   Início: ......h......

______________________________________
{{vet.nome}}`;

describe("parseFillFields", () => {
  const sections = parseFillFields(CORPO);

  it("agrupa as linhas com campo pela seção do modelo", () => {
    expect(sections.map((s) => s.title)).toEqual([
      "3. AVALIAÇÃO PRÉ-ANESTÉSICA",
      "6. AUTORIZAÇÃO PARA MANOBRAS DE REANIMAÇÃO",
      "TESTEMUNHAS",
    ]);
    expect(sections[0].lines.map((l) => l.label)).toEqual(["Classificação ASA", "Exames realizados", "Jejum orientado: alimentar"]);
  });

  it("não transforma linha de assinatura nem 'Ass.:' em campo", () => {
    const testemunha = sections[2].lines[0];
    const kinds = testemunha.segments.map((s) => s.kind);
    expect(kinds.filter((k) => k === "blank")).toHaveLength(2); // nome e CPF
    expect(testemunha.segments.at(-1)).toEqual({ kind: "text", text: " Ass.: ..........." });
  });

  it("data e hora pontilhadas viram um campo só", () => {
    const linha = sections[2].lines[1];
    const blanks = linha.segments.filter((s) => s.kind === "blank");
    expect(blanks.map((b) => (b.kind === "blank" ? b.format : null))).toEqual(["date", "time"]);
  });

  it("liga o complemento à opção só quando é dela", () => {
    const [, limitadas, sessil] = sections[1].lines;
    const blankLimitadas = limitadas.segments.find((s) => s.kind === "blank");
    const checkLimitadas = limitadas.segments.find((s) => s.kind === "check");
    expect(blankLimitadas && "attachTo" in blankLimitadas ? blankLimitadas.attachTo : undefined).toBe(
      checkLimitadas?.kind === "check" ? checkLimitadas.id : -1
    );
    const blankConsistencia = sessil.segments.find((s) => s.kind === "blank");
    expect(blankConsistencia && "attachTo" in blankConsistencia).toBe(false);
  });

  it("leva a introdução terminada em ':' como contexto da primeira opção", () => {
    expect(sections[1].lines[0].context).toBe("Em caso de parada cardiorrespiratória:");
    expect(sections[1].lines[1].context).toBeUndefined();
  });

  it("conta os campos", () => {
    // seção 3: 3 ASA + 1 exames + 2 jejum + 2 sim/não; seção 6: 2 opções + 1 limitadas
    // + 2 pediculado/séssil + 1 consistência; testemunhas: nome + CPF + data + hora
    expect(countFillFields(sections)).toBe(18);
  });
});

describe("applyFillAnswers", () => {
  const sections = parseFillFields(CORPO);
  const ids = sections.flatMap((s) => s.lines.flatMap((l) => l.segments.filter((x) => x.kind !== "text"))) as Array<{ id: number }>;

  it("marca opção, troca pontos pelo texto e formata data/hora", () => {
    const [asa1, , , exames] = ids;
    const dataId = ids.at(-2)!.id;
    const horaId = ids.at(-1)!.id;
    const out = applyFillAnswers(CORPO, {
      [asa1.id]: true,
      [exames.id]: "Hemograma e bioquímico",
      [dataId]: "2026-10-29",
      [horaId]: "09:05",
    });
    expect(out).toContain("Classificação ASA: (X) I ( ) II ( ) III");
    expect(out).toContain("Exames realizados: Hemograma e bioquímico");
    expect(out).toContain("Data: 29/10/2026   Início: 09h05");
  });

  it("sem resposta, deixa como estava (pontilhado e assinatura intactos)", () => {
    expect(applyFillAnswers(CORPO, {})).toBe(CORPO);
    const out = applyFillAnswers(CORPO, { 999: "x" });
    expect(out).toContain("______________________________________");
    expect(out).toContain("Ass.: ...........");
  });

  it("campo só com espaços conta como vazio", () => {
    const exames = ids[3];
    expect(applyFillAnswers(CORPO, { [exames.id]: "   " })).toBe(CORPO);
  });
});

describe("prettySectionTitle", () => {
  it("deixa o título em caixa normal mantendo siglas", () => {
    expect(prettySectionTitle("5. AVALIAÇÃO DE RISCO PARA SEDAÇÃO / ANESTESIA")).toBe("5. Avaliação de risco para sedação / anestesia");
    expect(prettySectionTitle("2. CLASSIFICAÇÃO ASA")).toBe("2. Classificação ASA");
    expect(prettySectionTitle("── PARA PREENCHIMENTO APÓS O ATO ──")).toBe("Para preenchimento após o ato");
  });
});
