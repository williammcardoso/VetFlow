import { describe, expect, it } from "vitest";
import { buildReminderMessage, buildReminders, firstName } from "./reminders";
import { cellValue, tableColumns } from "./backupApi";
import type { AppointmentEntry } from "@/types/appointment";

const app = (p: Partial<AppointmentEntry> & { details?: Record<string, unknown> }): AppointmentEntry =>
  ({ id: "a", animalId: "pet1", date: "2026-09-01", time: "10:00", type: "Consulta", vet: "Vet", ...p }) as AppointmentEntry;

const TODAY = new Date(2026, 8, 29); // 29/09/2026

describe("buildReminders", () => {
  it("vacina com próxima dose vira lembrete, com dias até a data", () => {
    const list = buildReminders([app({ id: "v1", type: "Vacina", details: { tipoVacina: "V10", proximaDose: "2026-10-05" } })], TODAY);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ kind: "vacina", vaccine: "V10", dueDate: "2026-10-05", daysUntil: 6 });
  });
  it("some quando a dose seguinte da MESMA vacina já foi aplicada", () => {
    const list = buildReminders(
      [
        app({ id: "v1", date: "2026-08-01", type: "Vacina", details: { tipoVacina: "V10", proximaDose: "2026-09-01" } }),
        app({ id: "v2", date: "2026-09-02", type: "Vacina", details: { tipoVacina: "v10", proximaDose: "2027-09-02" } }),
        app({ id: "v3", date: "2026-08-01", type: "Vacina", details: { tipoVacina: "Antirrábica", proximaDose: "2026-10-01" } }),
      ],
      TODAY
    );
    expect(list.map((r) => r.appointmentId).sort()).toEqual(["v2", "v3"]);
  });
  it("acompanhamento soma os dias à data do atendimento e some se o pet voltou", () => {
    const pending = buildReminders([app({ id: "c1", date: "2026-09-20", details: { retornoRecomendadoEmDias: 15 } })], TODAY);
    expect(pending[0]).toMatchObject({ kind: "retorno", dueDate: "2026-10-05", daysUntil: 6 });
    const resolved = buildReminders(
      [
        app({ id: "c1", date: "2026-09-01", details: { retornoRecomendadoEmDias: 15 } }),
        app({ id: "c2", date: "2026-09-16", type: "Retorno" }),
      ],
      TODAY
    );
    expect(resolved.find((r) => r.appointmentId === "c1")).toBeUndefined();
  });
  it("vacina depois não conta como volta do acompanhamento; atrasado fica negativo", () => {
    const list = buildReminders(
      [
        app({ id: "c1", date: "2026-09-01", details: { retornoRecomendadoEmDias: 10 } }),
        app({ id: "v9", date: "2026-09-15", type: "Vacina", details: { tipoVacina: "V10" } }),
      ],
      TODAY
    );
    expect(list).toHaveLength(1);
    expect(list[0].daysUntil).toBe(-18);
  });
});

describe("mensagem do lembrete", () => {
  it("vacina: primeiro nome, vacina, pet, data e clínica", () => {
    const msg = buildReminderMessage({
      kind: "vacina",
      clientName: "Maria Aparecida Souza",
      animalName: "Rex",
      dueDate: "2026-10-05",
      daysUntil: 6,
      vaccine: "V10",
      clinicName: "Clínica X",
    });
    expect(msg).toContain("Olá, Maria!");
    expect(msg).toContain("*V10*");
    expect(msg).toContain("*Rex*");
    expect(msg).toContain("*05/10/2026*");
    expect(msg.endsWith("Clínica X")).toBe(true);
  });
  it("atrasado e hoje mudam o texto", () => {
    expect(buildReminderMessage({ kind: "vacina", clientName: "Ana", animalName: "Mel", dueDate: "2026-09-20", daysUntil: -9 })).toContain(
      "estava prevista"
    );
    expect(buildReminderMessage({ kind: "vacina", clientName: "Ana", animalName: "Mel", dueDate: "2026-09-29", daysUntil: 0 })).toContain("é *hoje*");
    expect(firstName("  ")).toBe("");
  });
});

describe("planilha do backup", () => {
  it("colunas = união das chaves na ordem em que aparecem", () => {
    expect(tableColumns([{ a: 1, b: 2 }, { b: 3, c: 4 }])).toEqual(["a", "b", "c"]);
  });
  it("objeto vira JSON, vazio vira branco e texto enorme é cortado", () => {
    expect(cellValue({ x: 1 })).toBe('{"x":1}');
    expect(cellValue(null)).toBe("");
    expect(cellValue(12)).toBe(12);
    expect(String(cellValue("a".repeat(40_000))).length).toBeLessThan(32_767);
  });
});

describe("enviado × resolvido", () => {
  it("separa pelo canal e fica com a data mais recente", async () => {
    const { mergeReminderRows } = await import("./reminders");
    const status = mergeReminderRows(
      [
        { reminder_key: "a", sent_at: "2026-09-29T10:00:00Z", channel: "whatsapp" },
        { reminder_key: "a", sent_at: "2026-09-30T10:00:00Z", channel: "whatsapp" },
        { reminder_key: "b", sent_at: "2026-09-30T11:00:00Z", channel: "resolvido" },
        { reminder_key: "c", sent_at: "2026-09-30T12:00:00Z", channel: null },
      ],
      { sent: { d: "2026-09-01T00:00:00Z" }, resolved: {} }
    );
    expect(status.sent).toEqual({ a: "2026-09-30T10:00:00Z", c: "2026-09-30T12:00:00Z", d: "2026-09-01T00:00:00Z" });
    expect(status.resolved).toEqual({ b: "2026-09-30T11:00:00Z" });
  });
});

describe("anotação no prontuário", () => {
  it("diz o que era, quando, e o que foi conversado", async () => {
    const { buildResolutionNote } = await import("./reminders");
    expect(
      buildResolutionNote({ kind: "retorno", dueDate: "2026-09-26", appointmentType: "Consulta", appointmentDate: "2026-09-19" }, "  Está bem, sem coceira. ")
    ).toBe("Acompanhamento previsto para 26/09/2026 (após Consulta de 19/09/2026) — contato com o tutor: Está bem, sem coceira.");
    expect(
      buildResolutionNote({ kind: "vacina", vaccine: "V10", dueDate: "2026-10-01", appointmentType: "Vacina", appointmentDate: "2025-10-01" }, "Vacinou em outro local.")
    ).toBe("Vacina V10 prevista para 01/10/2026 — contato com o tutor: Vacinou em outro local.");
  });
});
