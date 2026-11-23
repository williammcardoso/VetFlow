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
  scheduleEndTime,
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

/** Título do registro: "Agendado", "Remarcado", "Cancelado", "Marcado como atendido"... */
export function entryTitle(e: AgendaLogEntry): string {
  const snap = e.event === "excluido" ? e.before : e.after ?? e.before;
  const isBlock =
    snap?.kind === "bloqueio" || /^horário bloqueado$/i.test(parseLegacy(e.legacyLines, e.at)?.title ?? "");
  if (isBlock) {
    if (e.event === "novo") return "Horário bloqueado";
    if (e.event === "cancelado") return "Bloqueio liberado";
    if (e.event === "excluido") return "Bloqueio apagado";
    if (e.event === "reativado") return "Bloqueado de novo";
  }
  if (e.event === "alterado") {
    const labels = new Set(e.changes.map((c) => c.label));
    if (labels.has("Dia e horário") || parseLegacy(e.legacyLines, e.at)?.whenBefore) return "Remarcado";
    if (labels.has("Cliente")) return "Cliente trocado";
    return "Alterado";
  }
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

// ---------------------------------------------------------------------------
// Frase "de bater o olho": o que aconteceu, com o essencial em negrito.
// Ex.: "Mudou o horário: Vacina na loja de Karyz era hoje às 09:00 e passou
// para sex 28/11 às 10:00."
// ---------------------------------------------------------------------------

/** Pedaço da frase; `bold` = destaque (o quê, de quem, quando). */
export interface Seg {
  text: string;
  bold?: boolean;
}

interface When {
  date: string;
  time: string;
  end?: string | null;
}

const WEEKDAYS_LOWER = WEEKDAYS.map((w) => w.toLowerCase());

const isoToLocal = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const dayDiff = (a: string, b: string) => Math.round((isoToLocal(a).getTime() - isoToLocal(b).getTime()) / 86_400_000);

/** "hoje", "amanhã", "ontem" ou "sex 28/11" (com o ano só se for outro). */
export function relativeDay(dateISO: string, todayISO: string): string {
  const diff = dayDiff(dateISO, todayISO);
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  if (diff === -1) return "ontem";
  const [y, m, d] = dateISO.split("-").map(Number);
  const year = todayISO.slice(0, 4) === String(y) ? "" : `/${y}`;
  return `${WEEKDAYS_LOWER[isoToLocal(dateISO).getDay()]} ${pad(d)}/${pad(m)}${year}`;
}

/** "hoje às 09:00" ou "amanhã, das 14:00 às 15:00". */
export function whenPhrase(w: When | null | undefined, todayISO: string): string {
  if (!w || !w.date) return "data não informada";
  const day = relativeDay(w.date, todayISO);
  if (!w.time) return day;
  return w.end ? `${day}, das ${w.time} às ${w.end}` : `${day} às ${w.time}`;
}

const whenOf = (s: ScheduleSnapshot | null): When | null =>
  s ? { date: s.date, time: s.time, end: scheduleEndTime(s.time, s.durationMinutes) } : null;

const whoOf = (s: ScheduleSnapshot) =>
  s.animalName ? `${s.clientName || "Sem nome"} (${s.animalName})` : s.clientName || "Sem nome";
const whatOf = (s: ScheduleSnapshot) => s.title || (s.kind ? KIND_LABEL[s.kind] : "") || "Agendamento";

const seg = (text: string): Seg => ({ text });
const bold = (text: string): Seg => ({ text, bold: true });

function joinLabels(labels: string[]): string {
  const lower = labels.map((l) => l.toLowerCase());
  return lower.length <= 1 ? lower.join("") : `${lower.slice(0, -1).join(", ")} e ${lower[lower.length - 1]}`;
}

interface SentenceInput {
  event: AgendaLogEvent;
  status?: string;
  what: string;
  who: string;
  isBlock: boolean;
  when: When | null;
  whenBefore?: When | null;
  clientBefore?: string | null;
  otherChanges?: string[];
}

function buildSentence(p: SentenceInput, todayISO: string): Seg[] {
  const when = whenPhrase(p.when, todayISO);
  const what = bold(p.what);
  const who = bold(p.who);
  if (p.isBlock) {
    if (p.event === "novo") return [seg("Bloqueou a agenda "), bold(when), seg(".")];
    if (p.event === "cancelado") return [seg("Liberou o horário bloqueado de "), bold(when), seg(".")];
    if (p.event === "excluido") return [seg("Apagou o bloqueio de "), bold(when), seg(".")];
    if (p.event === "reativado") return [seg("Bloqueou de novo "), bold(when), seg(".")];
    if (p.whenBefore) {
      return [seg("Mudou o horário bloqueado: era "), bold(whenPhrase(p.whenBefore, todayISO)), seg(" e passou para "), bold(when), seg(".")];
    }
  }
  switch (p.event) {
    case "novo":
      return [seg("Marcou "), what, seg(" para "), who, seg(", "), bold(when), seg(".")];
    case "cancelado":
      return [seg("Cancelou "), what, seg(" de "), who, seg(", que seria "), bold(when), seg(".")];
    case "excluido":
      return [seg("Apagou da agenda "), what, seg(" de "), who, seg(", que seria "), bold(when), seg(".")];
    case "reativado":
      return [seg("Reativou "), what, seg(" de "), who, seg(": volta a valer "), bold(when), seg(".")];
    case "situacao":
      if (p.status === "attended") return [seg("Marcou como atendido: "), what, seg(" de "), who, seg(", "), bold(when), seg(".")];
      if (p.status === "no_show") return [seg("Marcou falta: "), who, seg(" não veio para "), what, seg(", "), bold(when), seg(".")];
      if (p.status === "in_progress") return [seg("Começou o atendimento: "), what, seg(" de "), who, seg(", "), bold(when), seg(".")];
      return [seg("Voltou para agendado: "), what, seg(" de "), who, seg(", "), bold(when), seg(".")];
    default: {
      if (p.whenBefore) {
        return [
          seg("Mudou o horário: "), what, seg(" de "), who,
          seg(" era "), bold(whenPhrase(p.whenBefore, todayISO)), seg(" e passou para "), bold(when), seg("."),
        ];
      }
      if (p.clientBefore) {
        return [seg("Trocou o cliente de "), what, seg(" ("), bold(when), seg("): era "), bold(p.clientBefore), seg(", agora é "), who, seg(".")];
      }
      const others = p.otherChanges?.length ? [seg(` — mudou ${joinLabels(p.otherChanges)}`)] : [];
      return [seg("Alterou "), what, seg(" de "), who, seg(", "), bold(when), ...others, seg(".")];
    }
  }
}

// Avisos antigos (texto do Pushover/WhatsApp). Dois formatos: até 22/10 a data
// vinha depois do cliente; depois, logo abaixo do título. Data sem ano:
// "Qui 06/11 · 16:00–16:30".
interface LegacyParsed {
  when?: When;
  whenBefore?: When;
  title?: string;
  client?: string;
  clientBefore?: string;
  obs?: string;
}

const ANTES = /\s*\(antes: (.*)\)\s*$/;

function parseLegacyWhen(text: string, loggedAtISO: string): When | undefined {
  const m = /(\d{2})\/(\d{2})(?:\/(\d{4}))?\s*·\s*(\d{1,2}:\d{2})(?:\s*[–-]\s*(\d{1,2}:\d{2}))?/.exec(text);
  if (!m) return undefined;
  const [, dd, mm, yyyy, start, end] = m;
  const loggedKey = loggedDayKey(loggedAtISO);
  let year = yyyy ? Number(yyyy) : loggedKey ? Number(loggedKey.slice(0, 4)) : new Date().getFullYear();
  // Aviso de dezembro para janeiro: sem o ano, a data "volta" → é do ano seguinte.
  if (!yyyy && loggedKey && dayDiff(`${year}-${mm}-${dd}`, loggedKey) < -180) year += 1;
  return { date: `${year}-${mm}-${dd}`, time: start.padStart(5, "0"), end: end ? end.padStart(5, "0") : null };
}

export function parseLegacy(lines: string[] | null, loggedAtISO: string): LegacyParsed | null {
  if (!lines || lines.length < 2) return null;
  const out: LegacyParsed = {};
  for (const raw of lines.slice(1)) {
    const line = raw.trim();
    if (line.startsWith("🗓")) out.when = parseLegacyWhen(line, loggedAtISO);
    else if (line.startsWith("↩")) {
      // "↩️ antes: Qui 06/11 · 16:00" (dia/horário) ou "↩️ obs. antes: ..." (ignora)
      if (/antes:/.test(line) && !/obs\. antes:/.test(line)) out.whenBefore = parseLegacyWhen(line, loggedAtISO);
    } else if (line.startsWith("👤")) {
      const text = line.replace(/^👤\s*/u, "");
      const before = ANTES.exec(text)?.[1]?.trim();
      out.client = text.replace(ANTES, "").trim();
      if (before && before !== "—") out.clientBefore = before;
    } else if (line.startsWith("📝")) out.obs = line.replace(/^📝\s*/u, "").trim();
    else if (/^[\p{L}\p{N}]/u.test(line) && !out.title) out.title = line.replace(ANTES, "").trim();
  }
  return out;
}

/** A frase do registro (nula só quando faltam dados para montar). */
export function entrySentence(e: AgendaLogEntry, todayISO: string): Seg[] | null {
  if (e.legacyLines) {
    const p = parseLegacy(e.legacyLines, e.at);
    if (!p || !p.when || !p.client) return null;
    return buildSentence(
      {
        event: e.event,
        what: p.title || "Agendamento",
        who: p.client,
        isBlock: /^horário bloqueado$/i.test(p.title ?? ""),
        when: p.when,
        whenBefore: p.whenBefore,
        clientBefore: p.whenBefore ? null : p.clientBefore,
      },
      todayISO
    );
  }
  const snap = e.event === "excluido" ? e.before : e.after ?? e.before;
  if (!snap) return null;
  const labels = e.changes.map((c) => c.label);
  const timeChanged = labels.includes("Dia e horário");
  const clientChanged = labels.includes("Cliente");
  return buildSentence(
    {
      event: e.event,
      status: e.after?.status,
      what: whatOf(snap),
      who: whoOf(snap),
      isBlock: snap.kind === "bloqueio",
      when: whenOf(snap),
      whenBefore: timeChanged ? whenOf(e.before) : null,
      clientBefore: !timeChanged && clientChanged ? e.before?.clientName || "Sem nome" : null,
      otherChanges: labels.filter((l) => l !== "Dia e horário" && l !== "Cliente"),
    },
    todayISO
  );
}
