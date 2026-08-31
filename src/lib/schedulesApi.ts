import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { format } from "date-fns";

export type ScheduleStatus = "scheduled" | "in_progress" | "attended" | "no_show" | "cancelled";

export interface ScheduleUI {
  id: string;
  date: Date;
  time: string;
  title: string;
  clientId: string;
  clientName: string;
  animalId: string;
  animalName: string;
  status: ScheduleStatus;
  notes?: string;
}

const TABLE = "schedules";

async function hasStatusColumn(): Promise<boolean> {
  const { error } = await supabase.from(TABLE).select("status").limit(1);
  if (error && /status/i.test(error.message) && /column/i.test(error.message)) {
    return false;
  }
  return true;
}

function rowToUI(r: Record<string, unknown>): ScheduleUI {
  const d = r.date as string;
  return {
    id: r.id as string,
    date: new Date(d + "T12:00:00"),
    time: (r.time as string) || "",
    title: (r.title as string) || "",
    clientId: (r.client_id as string) || "",
    clientName: (r.client_name as string) || "",
    animalId: (r.animal_id as string) || "",
    animalName: (r.animal_name as string) || "",
    status: ((r.status as ScheduleStatus) || "scheduled"),
    notes: (r.notes as string) || undefined,
  };
}

function uiToInsert(s: Omit<ScheduleUI, "id"> & { id: string }) {
  const dateStr = format(s.date, "yyyy-MM-dd");
  const now = new Date().toISOString();
  return {
    id: s.id,
    date: dateStr,
    time: s.time,
    title: s.title,
    client_id: s.clientId || null,
    client_name: s.clientName || null,
    animal_id: s.animalId || null,
    animal_name: s.animalName || null,
    status: s.status || "scheduled",
    notes: s.notes ?? null,
    updated_at: now,
  };
}

export async function listSchedules(): Promise<ScheduleUI[]> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não está configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (error) {
    throw new Error(`Falha ao carregar agenda: ${error.message}`);
  }

  return (data || []).map((r) => rowToUI(r as Record<string, unknown>));
}

// Usado pela Linha do Tempo do prontuário — traz os agendamentos (Agenda/
// página pública) de um paciente específico, incluindo os cancelados
// (diferente de listScheduleTimesInRange, que os esconde por representarem
// horário liberado): no prontuário o cancelamento é histórico, não deve sumir.
export async function getSchedulesByAnimal(animalId: string): Promise<ScheduleUI[]> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não está configurado.");
  }
  if (!animalId) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("animal_id", animalId)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (error) {
    throw new Error(`Falha ao carregar agendamentos do paciente: ${error.message}`);
  }

  return (data || []).map((r) => rowToUI(r as Record<string, unknown>));
}

export interface ScheduleTimeSummary {
  id: string;
  date: string;
  time: string;
  clientName?: string;
  title?: string;
  /** Nome do computador/balcão que fez a reserva (ver BookSchedulePage.tsx),
   *  extraído de `notes` — só existe pra reservas feitas depois de o
   *  computador ter sido identificado. */
  stationName?: string;
}

// Mesmo texto gravado em BookSchedulePage.tsx (doCreateBooking) — mudar um
// lado sem o outro quebra a extração do nome do computador no hover.
const STATION_NAME_NOTES_PATTERN = /— computador: (.+?)\.?$/;

// Usado pela página pública de agendamento (balcão da agropecuária) — tanto
// pro calendário semanal (marcar horários ocupados, com nome/descrição em
// hint no hover — pedido explícito do usuário) quanto pra checar conflito
// antes de reservar (chamado com startISO === endISO).
export async function listScheduleTimesInRange(startISO: string, endISO: string): Promise<ScheduleTimeSummary[]> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não está configurado.");
  }
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, date, time, client_name, title, status, notes")
    .gte("date", startISO)
    .lte("date", endISO);
  if (error) {
    throw new Error(`Falha ao consultar horários: ${error.message}`);
  }
  return (data || [])
    .map((r) => {
      const row = r as Record<string, unknown>;
      const notes = (row.notes as string) || "";
      const stationMatch = STATION_NAME_NOTES_PATTERN.exec(notes);
      return {
        id: row.id as string,
        date: row.date as string,
        time: (row.time as string) || "",
        clientName: (row.client_name as string) || undefined,
        title: (row.title as string) || undefined,
        status: (row.status as string) || undefined,
        stationName: stationMatch?.[1]?.trim() || undefined,
      };
    })
    // Cancelado libera o horário de novo (usado pelo "Cancelar horário" da
    // página pública) — não trata linha sem status (dado antigo) como cancelada.
    .filter((r) => r.time && r.status !== "cancelled");
}

// Atualização parcial usada pela página pública de agendamento pra permitir
// corrigir um agendamento errado (nome/data/horário/descrição) sem precisar
// do registro completo de ScheduleUI (a página não tem clientId/animalId).
export async function updatePublicBooking(
  id: string,
  fields: { date: Date; time: string; clientName: string; title: string }
): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não está configurado.");
  }
  const { error } = await supabase
    .from(TABLE)
    .update({
      date: format(fields.date, "yyyy-MM-dd"),
      time: fields.time,
      client_name: fields.clientName,
      title: fields.title,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    throw new Error(`Falha ao atualizar agendamento: ${error.message}`);
  }
}

// "Cancelar" pela página pública é um soft-delete (status='cancelled'), não
// um DELETE de verdade — mantém histórico e evita precisar dar permissão de
// exclusão pra `anon` na RLS, só de UPDATE (que já é necessária pra editar).
export async function cancelPublicBooking(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não está configurado.");
  }
  const { error } = await supabase
    .from(TABLE)
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    throw new Error(`Falha ao cancelar agendamento: ${error.message}`);
  }
}

// Um agendamento é "encaixe" quando existe outro no mesmo dia a menos de
// `gapMinutes` de distância (mesma regra usada pra avisar sobre conflito na
// página pública de agendamento) — calculado na hora a partir da lista, sem
// precisar de coluna nova no banco pra marcar isso.
export function computeEncaixeIds(
  items: { id: string; date: string; time: string }[],
  gapMinutes = 60
): Set<string> {
  const toMinutes = (t: string): number | null => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  };
  const byDate = new Map<string, { id: string; minutes: number }[]>();
  for (const it of items) {
    const minutes = toMinutes(it.time);
    if (minutes === null) continue;
    const list = byDate.get(it.date) || [];
    list.push({ id: it.id, minutes });
    byDate.set(it.date, list);
  }
  const result = new Set<string>();
  for (const list of byDate.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (Math.abs(list[i].minutes - list[j].minutes) < gapMinutes) {
          result.add(list[i].id);
          result.add(list[j].id);
        }
      }
    }
  }
  return result;
}

export async function createSchedule(entry: Omit<ScheduleUI, "id"> & { id?: string }): Promise<ScheduleUI> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não está configurado.");
  }

  const id = entry.id || `sched-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const row = uiToInsert({
    id,
    date: entry.date,
    time: entry.time,
    title: entry.title,
    clientId: entry.clientId,
    clientName: entry.clientName,
    animalId: entry.animalId,
    animalName: entry.animalName,
    status: entry.status || "scheduled",
    notes: entry.notes,
  });

  const statusEnabled = await hasStatusColumn();
  const insertRow = statusEnabled ? row : (({ status, ...rest }) => rest)(row);
  const { data, error } = await supabase.from(TABLE).insert(insertRow).select().single();

  if (error) {
    throw new Error(`Falha ao criar agendamento: ${error.message}`);
  }

  return rowToUI(data as Record<string, unknown>);
}

export async function updateSchedule(entry: ScheduleUI): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não está configurado.");
  }

  const row = uiToInsert(entry);
  const statusEnabled = await hasStatusColumn();
  const { error } = await supabase
    .from(TABLE)
    .update({
      date: row.date,
      time: row.time,
      title: row.title,
      client_id: row.client_id,
      client_name: row.client_name,
      animal_id: row.animal_id,
      animal_name: row.animal_name,
      ...(statusEnabled ? { status: row.status } : {}),
      notes: row.notes,
      updated_at: row.updated_at,
    })
    .eq("id", entry.id);

  if (error) {
    throw new Error(`Falha ao atualizar agendamento: ${error.message}`);
  }
}

export async function deleteSchedule(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não está configurado.");
  }

  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) {
    throw new Error(`Falha ao excluir agendamento: ${error.message}`);
  }
}
