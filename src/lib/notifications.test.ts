import { beforeEach, describe, expect, it } from "vitest";
import { buildNotifications, loadReadMap, saveReadMap, type NotificationInput } from "./notifications";
import type { ReminderItem } from "./reminders";
import type { ScheduleUI } from "./schedulesApi";

const NOW = new Date(2026, 8, 30, 10, 0); // 30/09/2026 10:00

const sched = (p: Partial<ScheduleUI>): ScheduleUI =>
  ({ id: "s1", date: new Date(2026, 8, 30), time: "10:30", title: "Consulta", clientId: "c", clientName: "Maria", animalId: "a", animalName: "Rex", status: "scheduled", ...p }) as ScheduleUI;

const rem = (p: Partial<ReminderItem>): ReminderItem => ({
  key: "vacina:a1:ap1:2026-10-01",
  kind: "vacina",
  appointmentId: "ap1",
  appointmentType: "Vacina",
  appointmentDate: "2025-10-01",
  animalId: "a1",
  dueDate: "2026-10-01",
  vaccine: "V10",
  daysUntil: 1,
  ...p,
});

const base = (p: Partial<NotificationInput> = {}): NotificationInput => ({
  now: NOW,
  schedules: [],
  reminders: [],
  sent: {},
  pets: new Map([["a1", { animal: "Mel", client: "Ana" }]]),
  lowStock: [],
  backupDays: undefined,
  backupReminderDays: 7,
  ...p,
});

describe("sininho: um item por coisa real", () => {
  it("horário nas próximas 2h vira item próprio, com 'em X min'", () => {
    const list = buildNotifications(base({ schedules: [sched({ id: "s1", time: "10:30" }), sched({ id: "s2", time: "13:00" })] }));
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: "agenda:s1:10:30", title: "10:30 — Consulta", detail: "Rex · Maria", when: "em 30 min" });
  });
  it("horário de hoje que passou sem conclusão vira pendência; atendido some", () => {
    const list = buildNotifications(
      base({ schedules: [sched({ id: "p1", time: "08:00" }), sched({ id: "p2", time: "08:30", status: "attended" as ScheduleUI["status"] })] })
    );
    expect(list.map((n) => n.id)).toEqual(["pendente:p1"]);
  });
  it("lembrete enviado some; atrasado há mais de 30 dias fica só na tela de lembretes", () => {
    const list = buildNotifications(
      base({
        reminders: [rem({ key: "k1" }), rem({ key: "k2", daysUntil: -3 }), rem({ key: "k3", daysUntil: -40 }), rem({ key: "k4", daysUntil: 12 })],
        sent: { k1: "2026-09-29T10:00:00Z" },
      })
    );
    expect(list.map((n) => n.id)).toEqual(["lembrete:k2"]);
    expect(list[0]).toMatchObject({ title: "V10 — Mel", tone: "rose", when: "atrasado há 3 dias" });
  });
  it("lembrete dado como resolvido sai do sininho", () => {
    const list = buildNotifications(base({ reminders: [rem({ key: "k1" }), rem({ key: "k2" })], resolved: { k1: "2026-09-30T09:00:00Z" } }));
    expect(list.map((n) => n.id)).toEqual(["lembrete:k2"]);
  });
  it("estoque baixo é um item só, que acende de novo se a quantidade mudar", () => {
    const low = [
      { id: "1", name: "Dipirona", qty: 2 },
      { id: "2", name: "Seringa", qty: 0 },
    ];
    const [n] = buildNotifications(base({ lowStock: low }));
    expect(n).toMatchObject({ id: "estoque:2", title: "2 produtos com estoque baixo", detail: "Seringa (0), Dipirona (2)" });
  });
  it("backup só para admin e só quando atrasado", () => {
    expect(buildNotifications(base({ backupDays: undefined }))).toHaveLength(0);
    expect(buildNotifications(base({ backupDays: 3 }))).toHaveLength(0);
    expect(buildNotifications(base({ backupDays: null }))[0].detail).toMatch(/Nenhum backup/);
    expect(buildNotifications(base({ backupDays: 9 }))[0].detail).toBe("Último backup há 9 dias.");
  });
});

describe("lidos", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;
  });
  it("guarda o que está na lista e esquece o que saiu há mais de 60 dias", () => {
    const now = Date.now();
    const saved = saveReadMap({ atual: now - 90 * 86_400_000, velho: now - 90 * 86_400_000, recente: now - 86_400_000 }, ["atual"], now);
    expect(Object.keys(saved).sort()).toEqual(["atual", "recente"]);
    expect(loadReadMap()).toEqual(saved);
  });
});
