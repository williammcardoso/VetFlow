import { describe, it, expect } from "vitest";
import {
  generateSlotsForDay,
  isMinutesOpen,
  LEGACY_WEEKLY_HOURS,
  LEGACY_INTERVAL_MINUTES,
  type AgendaException,
} from "./agendaAvailabilityApi";

// Segunda-feira real (pra bater com weekday=1 do horário-padrão) e sábado real.
const A_MONDAY = "2026-09-07";
const A_SATURDAY = "2026-09-12";
const A_SUNDAY = "2026-09-13";

describe("generateSlotsForDay", () => {
  it("reproduz o horário que era fixo no código (seg-sex 8-13/15-18, sáb 8-12, dom fechado)", () => {
    expect(generateSlotsForDay(A_MONDAY, LEGACY_WEEKLY_HOURS, [], LEGACY_INTERVAL_MINUTES)).toEqual([
      "08:00", "09:00", "10:00", "11:00", "12:00", "15:00", "16:00", "17:00",
    ]);
    expect(generateSlotsForDay(A_SATURDAY, LEGACY_WEEKLY_HOURS, [], LEGACY_INTERVAL_MINUTES)).toEqual([
      "08:00", "09:00", "10:00", "11:00",
    ]);
    expect(generateSlotsForDay(A_SUNDAY, LEGACY_WEEKLY_HOURS, [], LEGACY_INTERVAL_MINUTES)).toEqual([]);
  });

  it("intervalo de 30min dobra a quantidade de horários (pedido do usuário — reduzir 'encaixe')", () => {
    const slots = generateSlotsForDay(A_MONDAY, LEGACY_WEEKLY_HOURS, [], 30);
    expect(slots).toEqual([
      "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
      "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    ]);
  });

  it("exceção 'fechado' vence o horário-padrão do dia (feriado numa segunda)", () => {
    const exceptions: AgendaException[] = [{ id: "1", date: A_MONDAY, isClosed: true, blocks: [] }];
    expect(generateSlotsForDay(A_MONDAY, LEGACY_WEEKLY_HOURS, exceptions, LEGACY_INTERVAL_MINUTES)).toEqual([]);
  });

  it("exceção com horário customizado substitui o padrão do dia (sábado à tarde só numa data)", () => {
    const exceptions: AgendaException[] = [
      { id: "1", date: A_SATURDAY, isClosed: false, blocks: [{ start: "08:00", end: "12:00" }, { start: "14:00", end: "17:00" }] },
    ];
    expect(generateSlotsForDay(A_SATURDAY, LEGACY_WEEKLY_HOURS, exceptions, LEGACY_INTERVAL_MINUTES)).toEqual([
      "08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00",
    ]);
  });
});

describe("isMinutesOpen", () => {
  it("aceita horário dentro de um bloco aberto e rejeita almoço/fora do expediente", () => {
    const toMin = (h: number, m: number) => h * 60 + m;
    expect(isMinutesOpen(A_MONDAY, toMin(10, 30), LEGACY_WEEKLY_HOURS, [])).toBe(true);
    expect(isMinutesOpen(A_MONDAY, toMin(14, 0), LEGACY_WEEKLY_HOURS, [])).toBe(false); // almoço
    expect(isMinutesOpen(A_MONDAY, toMin(19, 0), LEGACY_WEEKLY_HOURS, [])).toBe(false); // depois do fechamento
    expect(isMinutesOpen(A_SUNDAY, toMin(9, 0), LEGACY_WEEKLY_HOURS, [])).toBe(false); // domingo fechado
  });
});
