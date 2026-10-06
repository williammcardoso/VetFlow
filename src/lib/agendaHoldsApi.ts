import { supabase, supabaseAnonKey, supabaseUrl } from "@/integrations/supabase/client";
import type { BookingKind, BookingKindInfo } from "@/lib/agendaKinds";

// Travas da agenda pública: quem clica num horário segura ele (e os seguintes,
// se for consulta) até gravar, cancelar, fechar a aba ou ficar 10 min parado.
// A regra mora no banco (funções agenda_hold / agenda_book, migration
// 20261005120000) — aqui só chama e traduz. Se a migration ainda não rodou,
// as funções devolvem `unavailable` e a página volta ao jeito antigo.

export interface ScheduleHold {
  date: string;
  time: string;
  sessionId: string;
  station: string;
  kind?: BookingKind | null;
  expiresAt: string;
}

export interface HoldConflict {
  time: string;
  type: "booked" | "held";
  /** Cliente do agendamento ou computador que está segurando. */
  who: string;
  /** Horário de início do agendamento/trava que bloqueou. */
  at: string;
}

export type HoldResult =
  | { status: "ok"; expiresAt: string | null }
  | { status: "conflict"; conflicts: HoldConflict[] }
  | { status: "unavailable" };

export type BookResult = { status: "ok"; id: string } | { status: "conflict"; conflicts: HoldConflict[] } | { status: "unavailable" };

export interface BookingPayload {
  id: string;
  date: string;
  time: string;
  durationMinutes: number;
  title: string;
  clientName: string;
  /** Só na criação (observação interna: de qual computador saiu). */
  notes?: string;
  kind: BookingKind;
  kindInfo: BookingKindInfo;
  /** Quem gravou ("Balcão 1@<data-hora>") — vai no aviso por WhatsApp. */
  changedBy?: string;
}

const isMissingFunction = (error: { code?: string; message?: string } | null) =>
  !!error && (error.code === "PGRST202" || error.code === "42883" || /could not find the function/i.test(error.message || ""));

const isMissingTable = (error: { code?: string; message?: string } | null) =>
  !!error && (error.code === "PGRST205" || error.code === "42P01" || /could not find the table|does not exist/i.test(error.message || ""));

function parseConflicts(raw: unknown): HoldConflict[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => {
    const r = (c || {}) as Record<string, unknown>;
    return {
      time: String(r.time ?? ""),
      type: r.type === "held" ? "held" : "booked",
      who: String(r.who ?? ""),
      at: String(r.at ?? r.time ?? ""),
    };
  });
}

/** Segura `times` (lista vazia = soltar tudo). Repetir a chamada renova os 10 minutos. */
export async function holdSlots(params: {
  sessionId: string;
  station: string;
  date: string;
  times: string[];
  kind?: BookingKind | null;
  ignoreScheduleId?: string | null;
}): Promise<HoldResult> {
  const { data, error } = await supabase.rpc("agenda_hold", {
    p_session: params.sessionId,
    p_station: params.station,
    p_date: params.date,
    p_times: params.times,
    p_kind: params.kind ?? null,
    p_ignore_schedule: params.ignoreScheduleId ?? null,
  });
  if (isMissingFunction(error)) return { status: "unavailable" };
  if (error) throw new Error(`Falha ao reservar o horário: ${error.message}`);
  const r = (data || {}) as Record<string, unknown>;
  if (r.ok === true) return { status: "ok", expiresAt: (r.expires_at as string) || null };
  return { status: "conflict", conflicts: parseConflicts(r.conflicts) };
}

export async function releaseHolds(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc("agenda_release", { p_session: sessionId });
  if (error && !isMissingFunction(error)) console.warn("[agenda] soltar travas", error);
}

/**
 * Solta as travas quando a aba fecha/recarrega. `keepalive` deixa o pedido
 * terminar mesmo com a página indo embora — se mesmo assim não chegar (queda
 * de energia, internet), a trava vence sozinha em 10 minutos.
 */
export function releaseHoldsOnUnload(sessionId: string): void {
  if (!supabaseUrl || !supabaseAnonKey) return;
  try {
    void fetch(`${supabaseUrl}/rest/v1/rpc/agenda_release`, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_session: sessionId }),
    }).catch(() => undefined);
  } catch {
    // navegador sem keepalive — a trava vence em 10 min
  }
}

/** Grava (ou altera, se o id já existir) conferindo conflito no banco; solta as travas. */
export async function bookSlot(sessionId: string, booking: BookingPayload): Promise<BookResult> {
  const { data, error } = await supabase.rpc("agenda_book", {
    p_session: sessionId,
    p_booking: {
      id: booking.id,
      date: booking.date,
      time: booking.time,
      duration_minutes: booking.durationMinutes,
      title: booking.title,
      client_name: booking.clientName,
      notes: booking.notes ?? null,
      kind: booking.kind,
      kind_info: booking.kindInfo,
      changed_by: booking.changedBy ?? null,
    },
  });
  if (isMissingFunction(error)) return { status: "unavailable" };
  if (error) throw new Error(`Falha ao gravar o agendamento: ${error.message}`);
  const r = (data || {}) as Record<string, unknown>;
  if (r.ok === true) return { status: "ok", id: String(r.id ?? booking.id) };
  return { status: "conflict", conflicts: parseConflicts(r.conflicts) };
}

/** Travas ainda valendo no período (de todos os computadores). Tabela inexistente = nenhuma. */
export async function listHoldsInRange(startISO: string, endISO: string): Promise<ScheduleHold[]> {
  const { data, error } = await supabase
    .from("schedule_holds")
    .select("date, time, session_id, station, kind, expires_at")
    .gte("date", startISO)
    .lte("date", endISO)
    .gt("expires_at", new Date().toISOString());
  if (isMissingTable(error)) return [];
  if (error) throw new Error(`Falha ao consultar horários em reserva: ${error.message}`);
  return (data || []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      date: row.date as string,
      time: row.time as string,
      sessionId: row.session_id as string,
      station: (row.station as string) || "",
      kind: (row.kind as BookingKind | null) ?? null,
      expiresAt: row.expires_at as string,
    };
  });
}

/**
 * Avisa na hora quando qualquer computador mexe na agenda (agendamento ou
 * trava). Depende do Realtime ligado nas tabelas (parte 5 da migration); sem
 * ele, a página segue com a atualização a cada 10 s.
 */
export function subscribeAgendaChanges(topic: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`agenda-publica-${topic}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, () => onChange())
    .on("postgres_changes", { event: "*", schema: "public", table: "schedule_holds" }, () => onChange())
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
