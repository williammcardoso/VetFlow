import { describe, expect, it } from "vitest";
import { publicBookingNote } from "./schedulesApi";

describe("publicBookingNote", () => {
  it("lê o computador da nota automática da agenda pública", () => {
    expect(publicBookingNote("Agendado pelo link público (balcão da agropecuária) — computador: Balcao 1.")).toEqual({ station: "Balcao 1" });
    expect(publicBookingNote("Agendado pelo link público (balcão da agropecuária).")).toEqual({});
  });

  it("nota escrita por alguém fica como está", () => {
    expect(publicBookingNote("Trazer exames")).toBeNull();
    expect(publicBookingNote("Agendado pelo link público (balcão da agropecuária). Cliente pediu desconto")).toBeNull();
    expect(publicBookingNote(undefined)).toBeNull();
  });
});
