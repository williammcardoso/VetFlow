// Log da agenda (tabela agenda_log, migration 20261123120000): cada linha é um
// agendamento criado, alterado, cancelado, reativado, excluído ou com a situação
// trocada, com a linha inteira antes/depois. Aqui fica só a parte "pura" —
// rótulos, o que mudou campo a campo e a busca — para a tela e os testes.
import {
  KIND_LABEL,
  PLACE_LABEL,
  formatScheduleTimeRange,
  isBookingKind,
  parseKindInfo,
  vaccineList,
  type BookingKind,
  type BookingKindInfo,
} from "@/lib/agendaKinds";
import { normalizeSearch } from "@/lib/clientSearch";

export type AgendaLogEvent = "novo" | "alterado" | "cancelado" | "reativado" | "excluido" | "situacao";

export interface AgendaLogEntry {
  id: number;
  /** Quando aconteceu (ISO). */
  at: string;
  event: AgendaLogEvent;
  scheduleId: string | null;
  /** Computador da agenda pública ou "Agenda interna". */
  who: string | null;
  before: ScheduleSnapshot | null;
  after: ScheduleSnapshot | null;
  changes: LogChange[];
  /** Registros antigos (antes do log): o texto do aviso enviado na época. */
  legacyLines: string[] | null;
}

export interface ScheduleSnapshot {
  date: string;
  time: string;
  durationMinutes: number | null;
  title: string;
  clientName: string;
  animalName: string;
  status: string;
  kind: BookingKind | null;
  kindInfo: BookingKindInfo;
  notes: string;
  hasClientLink: boolean;
  hasAnimalLink: boolean;
}

export interface LogChange {
  label: string;
  before: string;
  after: string;
}

const EVENTS: AgendaLogEvent[] = ["novo", "alterado", "cancelado", "reativado", "excluido", "situacao"];

export const EVENT_LABEL: Record<AgendaLogEvent, string> = {
  novo: "Agendado",
  alterado: "Alterado",
  cancelado: "Cancelado",
  reativado: "Reativado",
  excluido: "Excluído",
  situacao: "Situação",
};

export const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendado",
  in_progress: "Em atendimento",
  attended: "Atendido",
  no_show: "Faltou",
  cancelled: "Cancelado",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const EMPTY = "—";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const pad = (n: number) => String(n).padStart(2, "0");

export function snapshotOf(raw: unknown): ScheduleSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const duration = Number(r.duration_minutes);
  return {
    date: str(r.date),
    time: str(r.time),
    durationMinutes: Number.isFinite(duration) && duration > 0 ? duration : null,
    title: str(r.title),
    clientName: str(r.client_name),
    animalName: str(r.animal_name),
    status: str(r.status) || "scheduled",
    kind: isBookingKind(r.kind) ? r.kind : null,
    kindInfo: parseKindInfo(r.kind_info),
    notes: str(r.notes),
    hasClientLink: !!str(r.client_id),
    hasAnimalLink: !!str(r.animal_id),
  };
}

/** "Ter 25/11/2026 · 14:00–15:00" */
export function formatWhen(s: Pick<ScheduleSnapshot, "date" | "time" | "durationMinutes"> | null): string {
  if (!s || !s.date) return EMPTY;
  const [y, m, d] = s.date.split("-").map(Number);
  if (!y || !m || !d) return s.date;
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  const day = `${weekday} ${pad(d)}/${pad(m)}/${y}`;
  return s.time ? `${day} · ${formatScheduleTimeRange(s.time, s.durationMinutes)}` : day;
}

/** Data e hora do registro no fuso do navegador: "23/11/2026 às 10:32". */
export function formatLoggedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Dia do registro (AAAA-MM-DD local) — para agrupar a lista. */
export function loggedDayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Cabeçalho do grupo: "Hoje · 23/11", "Ontem · 22/11" ou "Sex 21/11/2026". */
export function formatDayHeader(dayKey: string, todayKey: string, yesterdayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  if (!y || !m || !d) return dayKey;
  const short = `${pad(d)}/${pad(m)}`;
  if (dayKey === todayKey) return `Hoje · ${short}`;
  if (dayKey === yesterdayKey) return `Ontem · ${short}`;
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]} ${short}/${y}`;
}

const show = (v: string) => v || EMPTY;
const vaccinesText = (info: BookingKindInfo) => vaccineList(info).join(" + ");
const kindText = (k: BookingKind | null) => (k ? KIND_LABEL[k] : "");
const placeText = (info: BookingKindInfo) => (info.place ? PLACE_LABEL[info.place] : "");
const statusText = (s: string) => STATUS_LABEL[s] ?? s;

function valueText(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "string") return v.trim();
  return JSON.stringify(v);
}

// Colunas que o log não mostra como mudança (carimbos e chaves internas).
const HIDDEN = new Set(["updated_at", "changed_by", "created_at", "id"]);

/**
 * O que mudou numa alteração, em linguagem de gente: dia/horário juntos, o
 * detalhe do tipo (local, vacinas, observação...) campo a campo.
 */
export function describeChanges(
  rawBefore: Record<string, unknown> | null,
  rawAfter: Record<string, unknown> | null,
  fields: string[] | null
): LogChange[] {
  const before = snapshotOf(rawBefore);
  const after = snapshotOf(rawAfter);
  if (!before || !after) return [];
  const changed = new Set((fields ?? []).filter((f) => !HIDDEN.has(f)));
  const out: LogChange[] = [];
  const push = (label: string, a: string, b: string) => {
    if (a !== b) out.push({ label, before: show(a), after: show(b) });
  };

  if (changed.has("date") || changed.has("time") || changed.has("duration_minutes")) {
    push("Dia e horário", formatWhen(before), formatWhen(after));
  }
  if (changed.has("client_name")) push("Cliente", before.clientName, after.clientName);
  if (changed.has("animal_name")) push("Animal", before.animalName, after.animalName);
  if (changed.has("kind")) push("Tipo", kindText(before.kind), kindText(after.kind));
  if (changed.has("kind_info")) {
    const a = before.kindInfo;
    const b = after.kindInfo;
    push("Local", placeText(a), placeText(b));
    push("Vacinas", vaccinesText(a), vaccinesText(b));
    push("Medicação", a.medication ?? "", b.medication ?? "");
    push("Atendimento", a.other ?? "", b.other ?? "");
    push("Observação", a.obs ?? "", b.obs ?? "");
  }
  if (changed.has("title")) push("Descrição", before.title, after.title);
  if (changed.has("status")) push("Situação", statusText(before.status), statusText(after.status));
  if (changed.has("notes")) push("Anotação", before.notes, after.notes);
  if (changed.has("client_id") && !changed.has("client_name")) {
    push("Cadastro do cliente", before.hasClientLink ? "vinculado" : "sem vínculo", after.hasClientLink ? "vinculado" : "sem vínculo");
  }
  if (changed.has("animal_id") && !changed.has("animal_name")) {
    push("Cadastro do animal", before.hasAnimalLink ? "vinculado" : "sem vínculo", after.hasAnimalLink ? "vinculado" : "sem vínculo");
  }

  // Coluna nova que esta tela ainda não conhece: mostra crua, mas mostra.
  const known = new Set([
    "date", "time", "duration_minutes", "client_name", "animal_name", "kind", "kind_info",
    "title", "status", "notes", "client_id", "animal_id",
  ]);
  for (const f of changed) {
    if (!known.has(f)) push(f, valueText(rawBefore?.[f]), valueText(rawAfter?.[f]));
  }
  return out;
}

/** Texto do aviso antigo, linha a linha, sem os asteriscos de negrito. */
export function legacyLinesOf(message: string | null | undefined): string[] | null {
  const text = (message ?? "").replace(/\*/g, "").trim();
  if (!text) return null;
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

export function entryFromRpc(r: Record<string, unknown>): AgendaLogEntry {
  const event = EVENTS.includes(r.evento as AgendaLogEvent) ? (r.evento as AgendaLogEvent) : "alterado";
  const rawBefore = (r.antes as Record<string, unknown> | null) ?? null;
  const rawAfter = (r.depois as Record<string, unknown> | null) ?? null;
  const fields = Array.isArray(r.campos) ? (r.campos as string[]) : null;
  return {
    id: Number(r.log_id),
    at: String(r.ocorrido_em ?? ""),
    event,
    scheduleId: (r.agendamento_id as string) || null,
    who: str(r.quem) || null,
    before: snapshotOf(rawBefore),
    after: snapshotOf(rawAfter),
    changes: event === "alterado" ? describeChanges(rawBefore, rawAfter, fields) : [],
    legacyLines: legacyLinesOf(r.mensagem as string | null),
  };
}

/** Título do registro: "Agendado", "Cancelado", "Marcado como atendido"... */
export function entryTitle(e: AgendaLogEntry): string {
  if (e.event === "situacao" && e.after) {
    const s = e.after.status;
    if (s === "attended") return "Marcado como atendido";
    if (s === "no_show") return "Marcado como falta";
    if (s === "in_progress") return "Em atendimento";
    if (s === "scheduled") return "Voltou para agendado";
    return `Situação: ${statusText(s)}`;
  }
  return EVENT_LABEL[e.event];
}

/** Busca sem acento em cliente, animal, descrição, quem mexeu, observação e texto antigo. */
export function matchesLogSearch(e: AgendaLogEntry, query: string): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  const parts: string[] = [e.who ?? "", ...(e.legacyLines ?? [])];
  for (const s of [e.before, e.after]) {
    if (!s) continue;
    parts.push(s.clientName, s.animalName, s.title, s.kindInfo.obs ?? "", formatWhen(s));
  }
  for (const c of e.changes) parts.push(c.before, c.after);
  return parts.some((p) => normalizeSearch(p).includes(q));
}
