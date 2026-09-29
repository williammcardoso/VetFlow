import { describe, expect, it } from "vitest";
import { describePeriod, isWithinPeriod, periodRange } from "./PeriodFilter";

describe("periodRange", () => {
  const today = new Date(2026, 8, 29, 22, 30); // 29/09/2026 22:30 — depois das 21h (UTC já é dia 30)

  it("este mês, em data local", () => {
    expect(periodRange("this-month", today)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
  });
  it("mês passado, inclusive na virada do ano", () => {
    expect(periodRange("last-month", today)).toEqual({ from: "2026-08-01", to: "2026-08-31" });
    expect(periodRange("last-month", new Date(2026, 0, 15))).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  });
  it("30 dias contando hoje", () => {
    expect(periodRange("last-30", today)).toEqual({ from: "2026-08-31", to: "2026-09-29" });
  });
  it("tudo = sem limites", () => {
    expect(periodRange("all", today)).toEqual({ from: "", to: "" });
  });
});

describe("describePeriod / isWithinPeriod", () => {
  it("mês cheio vira o nome do mês", () => {
    expect(describePeriod("2026-09-01", "2026-09-30")).toBe("setembro de 2026");
    expect(describePeriod("2026-02-01", "2026-02-28")).toBe("fevereiro de 2026");
  });
  it("intervalo livre e sem limites", () => {
    expect(describePeriod("2026-09-01", "2026-09-15")).toBe("01/09/2026 a 15/09/2026");
    expect(describePeriod("", "")).toBe("Todo o período");
    expect(describePeriod("2026-09-01", "")).toBe("Desde 01/09/2026");
  });
  it("limites inclusivos", () => {
    expect(isWithinPeriod("2026-09-01", "2026-09-01", "2026-09-30")).toBe(true);
    expect(isWithinPeriod("2026-09-30", "2026-09-01", "2026-09-30")).toBe(true);
    expect(isWithinPeriod("2026-10-01", "2026-09-01", "2026-09-30")).toBe(false);
    expect(isWithinPeriod("2020-01-01", "", "")).toBe(true);
  });
});
