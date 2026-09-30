import { describe, expect, it } from "vitest";
import { formatTrendNumber, niceScale, orderTrendsForReport, trendStatus, trendSummary, type AnalyteTrend } from "./examTrends";

const trend = (p: Partial<AnalyteTrend>): AnalyteTrend => ({
  name: "Ureia",
  category: "biochemical",
  unit: "mg/dL",
  min: 20,
  max: 46,
  points: [
    { dateLabel: "12/08/2026", date: "2026-08-12", value: 40 },
    { dateLabel: "30/09/2026", date: "2026-09-30", value: 60 },
  ],
  ...p,
});

describe("PDF de evolução", () => {
  it("resumo diz o último valor, se está na faixa e quanto variou", () => {
    expect(trendSummary(trend({}))).toBe("Último resultado (30/09/2026): 60 mg/dL — acima da referência. Subiu 50% desde 12/08/2026.");
    expect(trendSummary(trend({ min: undefined, max: undefined, unit: "" }))).toBe(
      "Último resultado (30/09/2026): 60 — sem referência cadastrada. Subiu 50% desde 12/08/2026."
    );
  });
  it("status e número no padrão brasileiro", () => {
    expect(trendStatus(10, trend({}))).toBe("low");
    expect(trendStatus(30, trend({}))).toBe("normal");
    expect(formatTrendNumber(12500.5)).toBe("12.500,5");
  });
  it("hemograma vem antes do bioquímico", () => {
    const list = orderTrendsForReport([
      trend({ name: "Ureia" }),
      trend({ name: "Plaquetas", category: "hemogram" }),
      trend({ name: "ALT" }),
    ]);
    expect(list.map((t) => t.name)).toEqual(["Plaquetas", "ALT", "Ureia"]);
  });
});

describe("eixo do gráfico do PDF", () => {
  it("marcas redondas cobrindo a faixa", () => {
    const s = niceScale(4350, 18650);
    expect(s.ticks.every((t) => t % 1000 === 0)).toBe(true);
    expect(s.min).toBeLessThanOrEqual(4350);
    expect(s.max).toBeGreaterThanOrEqual(18650);
    expect(niceScale(0.35, 1.65).ticks).toEqual([0, 0.5, 1, 1.5, 2]);
  });
  it("variação absurda não vira porcentagem gigante", () => {
    const t = trend({ name: "Plaquetas", unit: "/µL", min: 175000, max: 500000, points: [
      { dateLabel: "30/07/2026", date: "2026-07-30", value: 250 },
      { dateLabel: "06/08/2026", date: "2026-08-06", value: 210000 },
    ] });
    expect(trendSummary(t)).toContain("Mudou muito desde 30/07/2026");
  });
});
