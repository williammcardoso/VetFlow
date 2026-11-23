import { describe, expect, it } from "vitest";
import {
  describeChanges,
  entryFromRpc,
  entryTitle,
  formatDayHeader,
  formatWhen,
  legacyLinesOf,
  matchesLogSearch,
} from "@/lib/agendaLog";

const row = (over: Record<string, unknown> = {}) => ({
  id: "s1",
  date: "2026-11-25",
  time: "14:00",
  duration_minutes: 60,
  title: "Consulta domiciliar",
  client_name: "Maria Zanovello",
  animal_name: null,
  status: "scheduled",
  kind: "consulta",
  kind_info: { place: "domicilio", obs: "portão azul" },
  notes: null,
  client_id: null,
  animal_id: null,
  updated_at: "2026-11-23T10:00:00Z",
  changed_by: "Balcão 1@2026-11-23T10:00:00Z",
  ...over,
});

describe("formatWhen", () => {
  it("mostra dia da semana, data e faixa de horário", () => {
    expect(formatWhen({ date: "2026-11-25", time: "14:00", durationMinutes: 60 })).toBe("Qua 25/11/2026 · 14:00–15:00");
    expect(formatWhen(null)).toBe("—");
  });
});

describe("describeChanges", () => {
  it("junta dia/horário e detalha o que mudou dentro do tipo", () => {
    const changes = describeChanges(
      row(),
      row({ time: "15:00", kind_info: { place: "domicilio", obs: "portão verde" }, updated_at: "x" }),
      ["kind_info", "time", "updated_at"]
    );
    expect(changes).toEqual([
      { label: "Dia e horário", before: "Qua 25/11/2026 · 14:00–15:00", after: "Qua 25/11/2026 · 15:00–16:00" },
      { label: "Observação", before: "portão azul", after: "portão verde" },
    ]);
  });

  it("troca de tipo e de local com rótulos em português", () => {
    const changes = describeChanges(
      row(),
      row({ kind: "vacina", kind_info: { place: "loja", vaccines: ["V10 importada"], obs: "portão azul" }, title: "Vacina na loja — V10 importada" }),
      ["kind", "kind_info", "title"]
    );
    expect(changes.map((c) => c.label)).toEqual(["Tipo", "Local", "Vacinas", "Descrição"]);
    expect(changes[0]).toEqual({ label: "Tipo", before: "Consulta", after: "Vacina" });
    expect(changes[1]).toEqual({ label: "Local", before: "Domiciliar", after: "Na loja" });
    expect(changes[2]).toEqual({ label: "Vacinas", before: "—", after: "V10 importada" });
  });

  it("coluna desconhecida aparece crua em vez de sumir", () => {
    expect(describeChanges(row(), row({ extra: "novo" }), ["extra"])).toEqual([{ label: "extra", before: "—", after: "novo" }]);
  });
});

describe("entryFromRpc", () => {
  it("monta o registro novo e o título da situação", () => {
    const e = entryFromRpc({
      log_id: 7,
      ocorrido_em: "2026-11-23T13:05:00Z",
      evento: "situacao",
      agendamento_id: "s1",
      quem: "Agenda interna",
      antes: row(),
      depois: row({ status: "attended" }),
      campos: ["status"],
      mensagem: null,
    });
    expect(e.id).toBe(7);
    expect(e.after?.status).toBe("attended");
    expect(entryTitle(e)).toBe("Marcado como atendido");
    expect(e.changes).toEqual([]);
  });

  it("registro antigo vira linhas do aviso, sem asteriscos", () => {
    expect(legacyLinesOf("📅 *Novo agendamento*\n🗓️ Seg 24/11\n💻 Balcão 1")).toEqual([
      "📅 Novo agendamento",
      "🗓️ Seg 24/11",
      "💻 Balcão 1",
    ]);
    expect(legacyLinesOf("")).toBeNull();
  });
});

describe("matchesLogSearch", () => {
  const e = entryFromRpc({
    log_id: 1,
    ocorrido_em: "2026-11-23T13:05:00Z",
    evento: "alterado",
    quem: "Balcão 2",
    antes: row(),
    depois: row({ client_name: "Maria Aparecida Zanovello" }),
    campos: ["client_name"],
  });

  it("acha sem acento por cliente, computador e observação", () => {
    expect(matchesLogSearch(e, "zanovello")).toBe(true);
    expect(matchesLogSearch(e, "balcao 2")).toBe(true);
    expect(matchesLogSearch(e, "PORTAO")).toBe(true);
    expect(matchesLogSearch(e, "joão")).toBe(false);
    expect(matchesLogSearch(e, "")).toBe(true);
  });
});

describe("formatDayHeader", () => {
  it("hoje, ontem e dia comum", () => {
    expect(formatDayHeader("2026-11-23", "2026-11-23", "2026-11-22")).toBe("Hoje · 23/11");
    expect(formatDayHeader("2026-11-22", "2026-11-23", "2026-11-22")).toBe("Ontem · 22/11");
    expect(formatDayHeader("2026-11-21", "2026-11-23", "2026-11-22")).toBe("Sáb 21/11/2026");
  });
});
