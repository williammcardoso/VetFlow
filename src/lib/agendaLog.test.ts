import { describe, expect, it } from "vitest";
import {
  describeChanges,
  entryFromRpc,
  entrySentence,
  entryTitle,
  formatDayHeader,
  formatWhen,
  legacyLinesOf,
  matchesLogSearch,
  relativeDay,
  type Seg,
} from "@/lib/agendaLog";

/** Frase com o negrito marcado como **assim**, para comparar fácil. */
const md = (segs: Seg[] | null) => (segs ?? []).map((s) => (s.bold ? `**${s.text}**` : s.text)).join("");
const TODAY = "2026-11-23";

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

describe("relativeDay", () => {
  it("hoje, amanhã, ontem e dia da semana", () => {
    expect(relativeDay("2026-11-23", TODAY)).toBe("hoje");
    expect(relativeDay("2026-11-24", TODAY)).toBe("amanhã");
    expect(relativeDay("2026-11-22", TODAY)).toBe("ontem");
    expect(relativeDay("2026-11-28", TODAY)).toBe("sáb 28/11");
    expect(relativeDay("2027-01-05", TODAY)).toBe("ter 05/01/2027");
  });
});

describe("entrySentence", () => {
  const vac = (over: Record<string, unknown> = {}) =>
    row({ date: "2026-11-23", time: "09:00", duration_minutes: 30, kind: "vacina", title: "Vacina na loja — V10 importada", client_name: "Karyz", kind_info: { place: "loja", vaccines: ["V10 importada"] }, ...over });
  const entry = (evento: string, antes: unknown, depois: unknown, campos: string[] | null = null) =>
    entryFromRpc({ log_id: 1, ocorrido_em: "2026-11-23T12:00:00Z", evento, quem: "Balcão 1", antes, depois, campos });

  it("novo agendamento", () => {
    expect(md(entrySentence(entry("novo", null, vac()), TODAY))).toBe(
      "Marcou **Vacina na loja — V10 importada** para **Karyz**, **hoje às 09:00**."
    );
  });

  it("vacina que era hoje foi para outro dia", () => {
    const e = entry("alterado", vac(), vac({ date: "2026-11-28", time: "10:00" }), ["date", "time"]);
    expect(entryTitle(e)).toBe("Remarcado");
    expect(md(entrySentence(e, TODAY))).toBe(
      "Mudou o horário: **Vacina na loja — V10 importada** de **Karyz** era **hoje às 09:00** e passou para **sáb 28/11 às 10:00**."
    );
  });

  it("consulta de 1h mostra das/às; troca de cliente e outras mudanças", () => {
    const novo = entry("novo", null, row({ date: "2026-11-24" }));
    expect(md(entrySentence(novo, TODAY))).toBe("Marcou **Consulta domiciliar** para **Maria Zanovello**, **amanhã, das 14:00 às 15:00**.");
    const troca = entry("alterado", row(), row({ client_name: "Maria Aparecida" }), ["client_name"]);
    expect(entryTitle(troca)).toBe("Cliente trocado");
    expect(md(entrySentence(troca, TODAY))).toBe(
      "Trocou o cliente de **Consulta domiciliar** (**qua 25/11, das 14:00 às 15:00**): era **Maria Zanovello**, agora é **Maria Aparecida**."
    );
    const obs = entry("alterado", row(), row({ kind_info: { place: "loja", obs: "x" } }), ["kind_info"]);
    expect(md(entrySentence(obs, TODAY))).toBe(
      "Alterou **Consulta domiciliar** de **Maria Zanovello**, **qua 25/11, das 14:00 às 15:00** — mudou local e observação."
    );
  });

  it("cancelado, falta e bloqueio", () => {
    expect(md(entrySentence(entry("cancelado", vac(), vac({ status: "cancelled" }), ["status"]), TODAY))).toBe(
      "Cancelou **Vacina na loja — V10 importada** de **Karyz**, que seria **hoje às 09:00**."
    );
    expect(md(entrySentence(entry("situacao", vac(), vac({ status: "no_show" }), ["status"]), TODAY))).toBe(
      "Marcou falta: **Karyz** não veio para **Vacina na loja — V10 importada**, **hoje às 09:00**."
    );
    const bloq = row({ kind: "bloqueio", title: "Horário bloqueado", client_name: "Não agendar", date: "2026-11-24", time: "12:00", duration_minutes: 120, kind_info: {} });
    expect(md(entrySentence(entry("novo", null, bloq), TODAY))).toBe("Bloqueou a agenda **amanhã, das 12:00 às 14:00**.");
    expect(entryTitle(entry("novo", null, bloq))).toBe("Horário bloqueado");
    expect(entryTitle(entry("cancelado", bloq, { ...bloq, status: "cancelled" }, ["status"]))).toBe("Bloqueio liberado");
  });

  it("aviso antigo no formato novo (data logo abaixo do título)", () => {
    const e = entryFromRpc({
      log_id: 2,
      ocorrido_em: "2026-11-20T15:00:00Z",
      evento: "alterado",
      quem: "Balcão 2",
      mensagem: "✏️ *Agendamento alterado*\n🗓️ Sáb 28/11 · 10:00\n↩️ antes: Seg 23/11 · 09:00\nVacina na loja — V10 importada\n👤 Karyz\n💻 Balcão 2",
    });
    expect(entryTitle(e)).toBe("Remarcado");
    expect(md(entrySentence(e, TODAY))).toBe(
      "Mudou o horário: **Vacina na loja — V10 importada** de **Karyz** era **hoje às 09:00** e passou para **sáb 28/11 às 10:00**."
    );
  });

  it("aviso antigo no formato de outubro (data depois do cliente) e virada de ano", () => {
    const e = entryFromRpc({
      log_id: 3,
      ocorrido_em: "2026-10-10T15:00:00Z",
      evento: "novo",
      quem: "Balcão 1",
      mensagem: "📅 *Novo agendamento*\nConsulta domiciliar\n👤 Ana Helena\n🗓️ Qua 14/10 · 14:00–15:00\n📝 portão azul\n💻 Balcão 1",
    });
    expect(md(entrySentence(e, TODAY))).toBe("Marcou **Consulta domiciliar** para **Ana Helena**, **qua 14/10, das 14:00 às 15:00**.");
    const virada = entryFromRpc({
      log_id: 4,
      ocorrido_em: "2026-12-28T15:00:00Z",
      evento: "novo",
      mensagem: "📅 *Novo agendamento*\n🗓️ Seg 04/01 · 09:00\nVacina na loja\n👤 Paulo",
    });
    expect(md(entrySentence(virada, TODAY))).toBe("Marcou **Vacina na loja** para **Paulo**, **seg 04/01/2027 às 09:00**.");
  });

  it("aviso antigo sem cliente ou data não inventa frase", () => {
    const e = entryFromRpc({ log_id: 5, ocorrido_em: "2026-10-10T15:00:00Z", evento: "novo", mensagem: "📅 *Novo agendamento*\nqualquer coisa" });
    expect(entrySentence(e, TODAY)).toBeNull();
  });
});
