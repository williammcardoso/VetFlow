import { describe, it, expect } from "vitest";
import { buildTrends } from "./ExamTrendCard";
import type { ExamEntry, BiochemicalEntry, HemogramReference } from "@/types/exam";

function bioExam(date: string, entries: BiochemicalEntry[]): ExamEntry {
  return {
    id: `exam-${date}`,
    date,
    time: "10:00",
    type: "Bioquímico",
    vet: "Dra. Teste",
    biochemicalEntries: entries,
  };
}

function urea(result: string, overrides: Partial<BiochemicalEntry> = {}): BiochemicalEntry {
  return {
    id: `bio-${result}-${Math.random()}`,
    enzyme: "Ureia",
    material: "Soro",
    methodology: "x",
    equipment: "x",
    result,
    minReference: "21",
    maxReference: "60",
    referenceUnit: "mg/dL",
    ...overrides,
  };
}

describe("buildTrends", () => {
  it("excludes analytes with fewer than 2 historical values", () => {
    const exams = [bioExam("2026-01-01", [urea("45")])];
    expect(buildTrends(exams)).toHaveLength(0);
  });

  it("groups the same analyte across exams into one trend, sorted by date", () => {
    const exams = [
      bioExam("2026-08-19", [urea("66")]),
      bioExam("2026-01-01", [urea("45")]),
      bioExam("2026-02-05", [urea("80")]),
    ];
    const trends = buildTrends(exams);
    expect(trends).toHaveLength(1);
    expect(trends[0].name).toBe("Ureia");
    expect(trends[0].points.map((p) => p.value)).toEqual([45, 80, 66]);
    expect(trends[0].min).toBe(21);
    expect(trends[0].max).toBe(60);
    expect(trends[0].unit).toBe("mg/dL");
  });

  it("ignores non-Bioquímico exams and entries with unparseable results", () => {
    const exams: ExamEntry[] = [
      { id: "e1", date: "2026-01-01", time: "10:00", type: "Hemograma Completo", vet: "x" },
      bioExam("2026-01-05", [urea("45")]),
      bioExam("2026-01-10", [urea("")]),
    ];
    expect(buildTrends(exams)).toHaveLength(0);
  });

  it("keeps separate trends per analyte name", () => {
    const creatinina = (result: string) =>
      urea(result, { enzyme: "Creatinina", minReference: "0.5", maxReference: "1.5" });
    const exams = [
      bioExam("2026-01-01", [urea("45"), creatinina("1.2")]),
      bioExam("2026-02-01", [urea("50"), creatinina("1.4")]),
    ];
    const trends = buildTrends(exams);
    expect(trends.map((t) => t.name)).toEqual(["Creatinina", "Ureia"]);
  });

  it("builds hemogram trends from fixed ExamEntry fields, using species-specific reference", () => {
    const hemogramExam = (date: string, eritrocitos: string, plaquetas: string): ExamEntry => ({
      id: `exam-${date}`,
      date,
      time: "10:00",
      type: "Hemograma Completo",
      vet: "Dra. Teste",
      eritrocitos,
      contagemPlaquetaria: plaquetas,
    });
    const exams = [
      hemogramExam("2026-01-01", "7.2", "180000"),
      hemogramExam("2026-02-01", "9.1", "600000"),
    ];
    const hemogramReferences: Record<string, HemogramReference> = {
      eritrocitos: { dog: { min: 5.5, max: 8.5 }, cat: { min: 6.5, max: 10.0 } },
      contagemPlaquetaria: { dog: { min: 166000, max: 575000 }, cat: { min: 150000, max: 600000 } },
    };

    const trends = buildTrends(exams, hemogramReferences, "dog");
    const eritrocitosTrend = trends.find((t) => t.name === "Eritrócitos");
    const plaquetasTrend = trends.find((t) => t.name === "Plaquetas");

    expect(eritrocitosTrend?.points.map((p) => p.value)).toEqual([7.2, 9.1]);
    expect(eritrocitosTrend?.min).toBe(5.5);
    expect(eritrocitosTrend?.max).toBe(8.5);
    expect(plaquetasTrend?.points.map((p) => p.value)).toEqual([180000, 600000]);
    // 600.000 está fora da faixa de cão (166.000-575.000) — evolução deve
    // continuar mostrando o ponto, só marcado como fora da faixa na UI.
    expect(plaquetasTrend?.max).toBe(575000);
  });

  it("leaves hemogram reference undefined when species is not provided", () => {
    const exams: ExamEntry[] = [
      { id: "e1", date: "2026-01-01", time: "10:00", type: "Hemograma Completo", vet: "x", hematocrito: "40" },
      { id: "e2", date: "2026-02-01", time: "10:00", type: "Hemograma Completo", vet: "x", hematocrito: "42" },
    ];
    const hemogramReferences: Record<string, HemogramReference> = {
      hematocrito: { dog: { min: 37, max: 55 }, cat: { min: 30, max: 45 } },
    };
    const trends = buildTrends(exams, hemogramReferences, undefined);
    const hematocritoTrend = trends.find((t) => t.name === "Hematócrito");
    expect(hematocritoTrend?.min).toBeUndefined();
    expect(hematocritoTrend?.max).toBeUndefined();
  });
});
