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
