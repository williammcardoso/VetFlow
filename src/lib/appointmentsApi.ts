import { supabase } from "@/integrations/supabase/client";
import type { AppointmentEntry } from "@/types/appointment";

const TABLE = "appointments";
const LOCAL_KEY_PREFIX = "local:appointments:";

function isLikelyUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function localKey(animalId: string): string {
  return `${LOCAL_KEY_PREFIX}${animalId}`;
}

function readLocalAppointments(animalId: string): AppointmentEntry[] {
  try {
    const raw = localStorage.getItem(localKey(animalId));
    return raw ? (JSON.parse(raw) as AppointmentEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLocalAppointments(animalId: string, list: AppointmentEntry[]) {
  localStorage.setItem(localKey(animalId), JSON.stringify(list));
}

function rowToAppointment(r: Record<string, unknown>): AppointmentEntry {
  return {
    id: r.id as string,
    animalId: r.animal_id as string,
    date: r.date as string,
    time: (r.time as string) || "",
    type: (r.type as AppointmentEntry["type"]) || "",
    vet: (r.vet as string) || "",
    pesoAtual: r.peso_atual != null ? Number(r.peso_atual) : undefined,
    temperaturaCorporal: r.temperatura_corporal != null ? Number(r.temperatura_corporal) : undefined,
    frequenciaCardiaca: r.frequencia_cardiaca != null ? Number(r.frequencia_cardiaca) : undefined,
    frequenciaRespiratoria: r.frequencia_respiratoria != null ? Number(r.frequencia_respiratoria) : undefined,
    observacoesGerais: r.observacoes_gerais as string | undefined,
    details: (r.details as AppointmentEntry["details"]) || {},
    attachments: Array.isArray(r.attachments) ? (r.attachments as { name: string; url: string }[]) : [],
  };
}

export async function getAppointments(): Promise<AppointmentEntry[]> {
  const { data, error } = await supabase.from(TABLE).select("*").order("date", { ascending: false }).order("time", { ascending: false });
  if (error) {
    console.error("[getAppointments] error", error);
    return [];
  }
  return (data || []).map((r: Record<string, unknown>) => rowToAppointment(r));
}

export async function getAppointmentsByAnimal(animalId: string): Promise<AppointmentEntry[]> {
  if (!isLikelyUuid(animalId)) {
    return readLocalAppointments(animalId);
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("animal_id", animalId)
    .order("date", { ascending: false })
    .order("time", { ascending: false });
  if (error) {
    console.error("[getAppointmentsByAnimal] error", error);
    return readLocalAppointments(animalId);
  }
  return (data || []).map((r: Record<string, unknown>) => rowToAppointment(r));
}

export async function getAppointmentById(id: string): Promise<AppointmentEntry | null> {
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();
  if (error || !data) return null;
  return rowToAppointment(data as Record<string, unknown>);
}

export async function addAppointment(entry: Omit<AppointmentEntry, "id">): Promise<AppointmentEntry | null> {
  if (!isLikelyUuid(entry.animalId)) {
    const localEntry: AppointmentEntry = {
      ...entry,
      id: `local-app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    const current = readLocalAppointments(entry.animalId);
    writeLocalAppointments(entry.animalId, [localEntry, ...current]);
    return localEntry;
  }

  const id = `app-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const insertObj = {
    id,
    animal_id: entry.animalId,
    date: entry.date,
    time: entry.time ?? null,
    type: entry.type ?? null,
    vet: entry.vet ?? null,
    peso_atual: entry.pesoAtual ?? null,
    temperatura_corporal: entry.temperaturaCorporal ?? null,
    frequencia_cardiaca: entry.frequenciaCardiaca ?? null,
    frequencia_respiratoria: entry.frequenciaRespiratoria ?? null,
    observacoes_gerais: entry.observacoesGerais ?? null,
    details: entry.details ?? {},
    attachments: entry.attachments ?? [],
  };
  const { data, error } = await supabase.from(TABLE).insert(insertObj).select().single();
  if (error) {
    console.error("[addAppointment] error", error);
    return null;
  }
  return rowToAppointment(data as Record<string, unknown>);
}

export async function updateAppointment(updated: AppointmentEntry): Promise<boolean> {
  if (!isLikelyUuid(updated.animalId) || updated.id.startsWith("local-app-")) {
    const current = readLocalAppointments(updated.animalId);
    const next = current.map((item) => (item.id === updated.id ? updated : item));
    writeLocalAppointments(updated.animalId, next);
    return true;
  }

  const { error } = await supabase
    .from(TABLE)
    .update({
      animal_id: updated.animalId,
      date: updated.date,
      time: updated.time ?? null,
      type: updated.type ?? null,
      vet: updated.vet ?? null,
      peso_atual: updated.pesoAtual ?? null,
      temperatura_corporal: updated.temperaturaCorporal ?? null,
      frequencia_cardiaca: updated.frequenciaCardiaca ?? null,
      frequencia_respiratoria: updated.frequenciaRespiratoria ?? null,
      observacoes_gerais: updated.observacoesGerais ?? null,
      details: updated.details ?? {},
      attachments: updated.attachments ?? [],
    })
    .eq("id", updated.id);
  if (error) {
    console.error("[updateAppointment] error", error);
    return false;
  }
  return true;
}

export async function removeAppointment(id: string): Promise<boolean> {
  if (id.startsWith("local-app-")) {
    // Percorre chaves locais para remover o item sem depender do animal_id externo.
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(LOCAL_KEY_PREFIX))
        .forEach((k) => {
          const raw = localStorage.getItem(k);
          const list = raw ? (JSON.parse(raw) as AppointmentEntry[]) : [];
          const next = list.filter((item) => item.id !== id);
          localStorage.setItem(k, JSON.stringify(next));
        });
      return true;
    } catch {
      return false;
    }
  }

  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("[removeAppointment] error", error);
    return false;
  }
  return true;
}
