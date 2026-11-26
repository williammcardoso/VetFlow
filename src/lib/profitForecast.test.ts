import { describe, expect, it } from "vitest";
import { computeProfitForecast, type ForecastMonthInput } from "./profitForecast";

const m = (month: number, lucro: number, recebido: number, extrasClinic = 0, closed = true, year = 2026): ForecastMonthInput => ({
  year,
  month,
  lucro,
  recebido,
  extrasClinic,
  extrasAgro: 0,
  closed,
});

describe("computeProfitForecast", () => {
  // Números reais da clínica em 26/11/2026 (agosto começou no dia 6).
  const real = computeProfitForecast({
    months: [m(8, 1645.89, 2180), m(9, 4405.54, 7380, 1140), m(10, 3364.58, 4120, 1110), m(11, 3085.06, 5786, 0, false)],
    today: "2026-11-26",
    firstDate: "2026-08-06",
  });

  it("ritmo = lucro dos últimos 3 meses ÷ dias (o mês atual entra até hoje)", () => {
    expect(real.base.months.map((b) => b.days)).toEqual([30, 31, 26]);
    expect(real.base.days).toBe(87);
    expect(real.base.lucro).toBe(10855.18);
    expect(real.base.daily).toBeCloseTo(124.77, 2);
    expect(real.base.marginPct).toBe(63);
    expect(real.base.weakest).toBe("Outubro / 2026");
    expect(real.base.strongest).toBe("Setembro / 2026");
    expect(real.enoughData).toBe(true);
  });

  it("mês atual = lucro até hoje + ritmo nos dias que faltam", () => {
    const nov = real.current!;
    expect(nov.kind).toBe("atual");
    expect(nov.lucroAteAgora).toBe(3085.06);
    expect(nov.lucro).toBeCloseTo(3085.06 + 4 * (10855.18 / 87), 1);
    expect(nov.low).toBeLessThan(nov.lucro);
    expect(nov.high).toBeGreaterThan(nov.lucro);
    // Acréscimos ainda não lançados: média de set/out (o 1º mês com acréscimo em diante).
    expect(nov.extrasEstimated).toBe(true);
    expect(nov.extrasClinic).toBe(1125);
    expect(nov.parteClinica).toBeCloseTo(nov.lucro / 2 + 1125, 1);
    expect(nov.parteAgro).toBeCloseTo(nov.lucro / 2, 1);
  });

  it("meses seguintes = ritmo × dias do mês, faixa do mês fraco ao forte", () => {
    const dez = real.months.find((x) => x.month === 12)!;
    expect(dez.kind).toBe("previsto");
    expect(dez.lucro).toBeCloseTo(31 * (10855.18 / 87), 1);
    expect(dez.low).toBeCloseTo(31 * (3364.58 / 31), 1);
    expect(dez.high).toBeCloseTo(31 * (4405.54 / 30), 1);
    expect(real.months.filter((x) => x.kind === "previsto")).toHaveLength(3);
  });

  it("ano = realizado + mês atual previsto + dezembro", () => {
    const nov = real.current!;
    const dez = real.months.find((x) => x.month === 12)!;
    expect(real.yearEnd.realizado).toBe(9416.01);
    expect(real.yearEnd.lucro).toBeCloseTo(9416.01 + nov.lucro + dez.lucro, 1);
  });

  it("12 meses somam 365 dias de ritmo", () => {
    // dez/2026 a nov/2027
    expect(real.next12.lucro).toBeCloseTo(365 * (10855.18 / 87), 0);
  });

  it("início de mês (menos de 10 dias) não entra no ritmo", () => {
    const f = computeProfitForecast({
      months: [m(8, 3000, 5000), m(9, 3100, 5000), m(10, 2900, 5000), m(11, 50, 100, 0, false)],
      today: "2026-11-03",
      firstDate: "2026-08-01",
    });
    expect(f.base.months.map((b) => b.label)).toEqual(["Agosto / 2026", "Setembro / 2026", "Outubro / 2026"]);
    expect(f.current!.lucro).toBeCloseTo(50 + 27 * (9000 / 92), 1);
  });

  it("um mês só: previsão sem faixa e marcada como pouco histórico", () => {
    const f = computeProfitForecast({ months: [m(11, 1500, 2000, 0, false)], today: "2026-11-15", firstDate: "2026-11-01" });
    expect(f.enoughData).toBe(false);
    expect(f.base.daily).toBe(100);
    expect(f.current!.lucro).toBe(3000);
    expect(f.current!.low).toBe(3000);
    expect(f.current!.high).toBe(3000);
  });

  it("sem movimento nenhum não quebra", () => {
    const f = computeProfitForecast({ months: [m(11, 0, 0, 0, false)], today: "2026-11-02", firstDate: "2026-11-02" });
    expect(f.base.daily).toBe(0);
    expect(f.current!.lucro).toBe(0);
    expect(f.next12.lucro).toBe(0);
  });
});
