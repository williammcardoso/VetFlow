import { describe, expect, it } from "vitest";
import { bookingCells, buildCellMap, freeRunLength, rangeCells } from "./agendaOccupancy";
import { composeBookingTitle, formatScheduleTimeRange, minDurationFor, pruneKindInfo, validateBooking } from "./agendaKinds";

// Seg: 08:30-13:00 e 15:00-18:00, grade de 30 min
const DAY = [
  "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
];

describe("bookingCells", () => {
  it("consulta de 1h ocupa dois horários", () => {
    expect(bookingCells("15:00", 60, DAY, 30)).toEqual(["15:00", "15:30"]);
  });
  it("agendamento antigo (sem duração) ocupa um horário", () => {
    expect(bookingCells("16:00", null, DAY, 30)).toEqual(["16:00"]);
  });
  it("encaixe torto ocupa os dois horários que encosta", () => {
    expect(bookingCells("10:45", null, DAY, 30)).toEqual(["10:30", "11:00"]);
  });
  it("fora do expediente cai no horário mais próximo", () => {
    expect(bookingCells("13:30", null, DAY, 30)).toEqual(["12:30"]);
  });
});

describe("buildCellMap", () => {
  it("marca início e continuação", () => {
    const map = buildCellMap([{ id: "a", date: "2026-10-06", time: "15:00", durationMinutes: 60 }], () => DAY, 30);
    expect(map.get("2026-10-06|15:00")?.[0].isStart).toBe(true);
    expect(map.get("2026-10-06|15:30")?.[0].isStart).toBe(false);
    expect(map.has("2026-10-06|16:00")).toBe(false);
  });
});

describe("rangeCells", () => {
  it("não atravessa o almoço", () => {
    expect(rangeCells(DAY, "12:30", 60, 30)).toBeNull();
    expect(rangeCells(DAY, "12:00", 60, 30)).toEqual(["12:00", "12:30"]);
  });
  it("não passa do fechamento", () => {
    expect(rangeCells(DAY, "17:30", 60, 30)).toBeNull();
  });
});

describe("freeRunLength", () => {
  it("para no primeiro ocupado", () => {
    expect(freeRunLength(DAY, "15:00", 30, (c) => c !== "16:00")).toBe(2);
  });
  it("para no almoço", () => {
    expect(freeRunLength(DAY, "12:00", 30, () => true)).toBe(2);
  });
});

describe("tipos de atendimento", () => {
  it("consulta é no mínimo 1h; vacina meia hora", () => {
    expect(minDurationFor("consulta", 30)).toBe(60);
    expect(minDurationFor("vacina", 30)).toBe(30);
    expect(minDurationFor("consulta", 60)).toBe(60);
    expect(minDurationFor("vacina", 60)).toBe(60);
  });
  it("valida o que falta", () => {
    expect(validateBooking(null, {})).toMatch(/tipo/);
    expect(validateBooking("consulta", {})).toMatch(/loja ou domiciliar/);
    expect(validateBooking("consulta", { place: "loja" })).toBeNull();
    expect(validateBooking("vacina", { place: "domicilio" })).toMatch(/vacina/i);
    expect(validateBooking("vacina", { place: "domicilio", vaccineOther: "Giárdia" })).toBeNull();
    expect(validateBooking("medicacao", { medication: "  " })).toMatch(/medicação/);
    expect(validateBooking("bloqueio", {})).toBeNull();
  });
  it("monta o texto da agenda sem a observação", () => {
    expect(composeBookingTitle("consulta", { place: "domicilio", obs: "99999-0000" })).toBe("Consulta domiciliar");
    expect(composeBookingTitle("vacina", { place: "loja", vaccines: ["V10 importada"], vaccineOther: "Giárdia" })).toBe(
      "Vacina na loja — V10 importada + Giárdia"
    );
    expect(composeBookingTitle("medicacao", { medication: "Insulina" })).toBe("Medicação — Insulina");
    expect(composeBookingTitle("outro", { other: "Transfusão" })).toBe("Transfusão");
  });
  it("trocar de tipo limpa os campos do tipo anterior", () => {
    expect(pruneKindInfo("medicacao", { place: "loja", vaccines: ["V10"], medication: " Dexa ", obs: "x" })).toEqual({
      medication: "Dexa",
      obs: "x",
    });
  });
  it("faixa de horário só quando passa de meia hora", () => {
    expect(formatScheduleTimeRange("15:00", 60)).toBe("15:00–16:00");
    expect(formatScheduleTimeRange("15:00", 30)).toBe("15:00");
    expect(formatScheduleTimeRange("15:00", null)).toBe("15:00");
  });
});
