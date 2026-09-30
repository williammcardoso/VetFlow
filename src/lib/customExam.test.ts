import { describe, expect, it } from "vitest";
import {
  analitoReference,
  analitoStatus,
  customExamSummary,
  examDisplayName,
  legacyResultBlocks,
  reportBlocks,
  templateBlocks,
  templateSignature,
  usesCustomBlocks,
} from "./customExam";
import type { CustomExamBlock } from "@/types/exam";

type Analito = Extract<CustomExamBlock, { kind: "analito" }>;
const analito = (p: Partial<Analito>): Analito => ({ id: "a", kind: "analito", name: "Reticulócitos absolutos", result: "87400", unit: "/µL", ...p });

// O exame do print: contagem de reticulócitos.
const reticulocitos: CustomExamBlock[] = [
  analito({ id: "1", name: "Hemácias", result: "4,62", unit: "milhões/µL" }),
  analito({ id: "2", name: "Hematócrito", result: "31", unit: "%" }),
  analito({ id: "3", name: "Contagem absoluta", result: "1,9", unit: "%" }),
  analito({ id: "4", name: "% de reticulócitos corrigida", result: "1,3", unit: "%", refText: "< 1% não regenerativa · 1 a 2% regenerativa · > 3% regeneração intensa" }),
  analito({ id: "5", name: "Reticulócitos absolutos", result: "87400", unit: "/µL", refMin: "60000", refMax: "150000" }),
  { id: "6", kind: "texto", title: "Conclusão", text: "Leve regeneração" },
  { id: "7", kind: "referencia", title: "Reticulócitos absolutos", text: "< 60.000/µL – nenhum grau\n60.000 a 150.000/µL – leve" },
  { id: "8", kind: "secao", title: "" },
];

describe("exame montado em blocos", () => {
  it("tipos com tela própria não usam blocos", () => {
    expect(usesCustomBlocks("Outro")).toBe(true);
    expect(usesCustomBlocks("Urinálise")).toBe(true);
    expect(usesCustomBlocks("Hemograma Completo")).toBe(false);
    expect(examDisplayName({ type: "Outro", examName: "Contagem de reticulócitos" })).toBe("Contagem de reticulócitos");
    expect(examDisplayName({ type: "Urinálise" })).toBe("Urinálise");
  });
  it("marca acima/abaixo pela faixa numérica, aceitando número brasileiro", () => {
    expect(analitoStatus(analito({ result: "87.400", refMin: "60.000", refMax: "150.000" }))).toBe("normal");
    expect(analitoStatus(analito({ result: "45000", refMin: "60000", refMax: "150000" }))).toBe("low");
    expect(analitoStatus(analito({ result: "1,9", refMax: "1,5" }))).toBe("high");
    expect(analitoStatus(analito({ result: "leve", refMin: "1" }))).toBe("unknown");
  });
  it("referência junta faixa e texto", () => {
    expect(analitoReference(analito({ refMin: "60000", refMax: "150000" }))).toBe("60000 – 150000 /µL");
    expect(analitoReference(analito({ unit: "%", refText: "< 1% não regenerativa" }))).toBe("< 1% não regenerativa");
  });
  it("laudo leva só o que foi preenchido", () => {
    expect(reportBlocks(reticulocitos).map((b) => b.id)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
  });
  it("modelo guarda o formato: sem resultados nem conclusão, com a tabela de referência", () => {
    const t = templateBlocks(reticulocitos);
    expect(t.filter((b) => b.kind === "analito").every((b) => b.kind === "analito" && b.result === "")).toBe(true);
    expect(t.find((b) => b.kind === "texto")).toMatchObject({ title: "Conclusão", text: "" });
    expect(t.find((b) => b.kind === "referencia")).toMatchObject({ text: expect.stringContaining("60.000") });
    expect(t.some((b) => b.kind === "secao")).toBe(false);
  });
  it("mudar só os valores não conta como formato novo; mudar a referência conta", () => {
    const base = templateSignature({ metodo: "Manual", blocks: reticulocitos });
    const outrosValores = reticulocitos.map((b) => (b.kind === "analito" ? { ...b, result: "1" } : b.kind === "texto" ? { ...b, text: "x" } : b));
    expect(templateSignature({ metodo: "Manual ", blocks: outrosValores })).toBe(base);
    const outraRef = reticulocitos.map((b) => (b.id === "5" && b.kind === "analito" ? { ...b, refMax: "160000" } : b));
    expect(templateSignature({ metodo: "Manual", blocks: outraRef })).not.toBe(base);
  });
  it("resumo do prontuário e exame antigo só com texto", () => {
    expect(customExamSummary({ customBlocks: reticulocitos })).toBe("Conclusão: Leve regeneração · Hemácias: 4,62 milhões/µL · Hematócrito: 31 %");
    expect(customExamSummary({ result: "Negativo para ovos" })).toBe("Negativo para ovos");
    expect(legacyResultBlocks("Negativo")[0]).toMatchObject({ kind: "texto", title: "Resultado", text: "Negativo" });
  });
});

describe("evolução de exame montado", () => {
  it("analito numérico de dois exames vira série; texto não", async () => {
    const { buildTrends } = await import("./examTrends");
    const exam = (date: string, result: string) => ({
      id: date, date, time: "10:00", type: "Outro", vet: "V", examName: "Contagem de reticulócitos",
      customBlocks: [
        analito({ id: "r", result, refMin: "60000", refMax: "150000" }),
        { id: "c", kind: "texto" as const, title: "Conclusão", text: "leve" },
      ],
    });
    const trends = buildTrends([exam("2026-09-28", "87400"), exam("2026-10-20", "120.000")]);
    expect(trends).toHaveLength(1);
    expect(trends[0]).toMatchObject({ name: "Reticulócitos absolutos (Contagem de reticulócitos)", category: "outros", min: 60000, max: 150000 });
    expect(trends[0].points.map((p) => p.value)).toEqual([87400, 120000]);
  });
});
