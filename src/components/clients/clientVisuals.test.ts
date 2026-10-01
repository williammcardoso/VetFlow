import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatAgeShort, formatDateBR, formatWeightKg, getInitials, sexLabel, speciesKind, formatRelativeDays } from "./clientVisuals";

describe("getInitials", () => {
  it("primeiro e último nome, ignorando da/de/do/dos/e", () => {
    expect(getInitials("Maria da Silva")).toBe("MS");
    expect(getInitials("WILLIAM CARDOSO")).toBe("WC");
    expect(getInitials("Marilda da Penha de Moraes Cardoso")).toBe("MC");
    expect(getInitials("Luê")).toBe("LU");
    expect(getInitials("  ")).toBe("?");
  });
});

describe("speciesKind / sexLabel", () => {
  it("reconhece cão e gato pelo que está gravado", () => {
    expect(speciesKind("Canino")).toBe("dog");
    expect(speciesKind("cão")).toBe("dog");
    expect(speciesKind("Felino")).toBe("cat");
    expect(speciesKind("Pássaro")).toBe("other");
    expect(speciesKind(undefined)).toBe("other");
  });

  it("sexo em português, vazio quando não informado", () => {
    expect(sexLabel("Macho")).toBe("Macho");
    expect(sexLabel("Fêmea")).toBe("Fêmea");
    expect(sexLabel("female")).toBe("Fêmea");
    expect(sexLabel("Outro")).toBe("");
    expect(sexLabel(undefined)).toBe("");
  });
});

describe("formatDateBR / formatWeightKg", () => {
  it("data sem fuso e peso com vírgula", () => {
    expect(formatDateBR("2026-09-26")).toBe("26/09/2026");
    expect(formatDateBR("2026-03-04T23:30:00Z")).toBe("04/03/2026");
    expect(formatDateBR("")).toBe("");
    expect(formatWeightKg(6.1)).toBe("6,1 kg");
    expect(formatWeightKg(0)).toBe("");
  });
});

describe("formatAgeShort", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 28, 10, 0, 0)); // 28/09/2026
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("anos, meses ou dias, no singular quando é 1", () => {
    expect(formatAgeShort("2014-07-01")).toBe("12 anos");
    expect(formatAgeShort("2025-09-28")).toBe("1 ano");
    expect(formatAgeShort("2026-04-15")).toBe("5 meses");
    expect(formatAgeShort("2026-08-28")).toBe("1 mês");
    expect(formatAgeShort("2026-09-20")).toBe("8 dias");
    expect(formatAgeShort("")).toBe("");
  });
});
describe("última visita em palavras", () => {
  const hoje = new Date(2026, 8, 30, 15, 0);
  it("dias, meses e anos", () => {
    expect(formatRelativeDays("2026-09-30", hoje)).toBe("hoje");
    expect(formatRelativeDays("2026-09-29", hoje)).toBe("ontem");
    expect(formatRelativeDays("2026-09-26", hoje)).toBe("há 4 dias");
    expect(formatRelativeDays("2026-08-15", hoje)).toBe("há 1 mês");
    expect(formatRelativeDays("2026-05-01", hoje)).toBe("há 4 meses");
    expect(formatRelativeDays("2024-09-01", hoje)).toBe("há 2 anos");
    expect(formatRelativeDays("2026-10-02", hoje)).toBe("agendado");
    expect(formatRelativeDays("", hoje)).toBe("");
  });
});
