import { supabase } from "@/integrations/supabase/client";

export interface ObservationEntry {
  id: string;
  date: string;
  time: string;
  observation: string;
  displayAsAlert: boolean;
  createdBy?: string;
}

const TABLE = "patient_observations";

function rowToObservation(r: Record<string, unknown>): ObservationEntry {
  const created = new Date(r.created_at as string);
  return {
    id: r.id as string,
    date: created.toISOString().split("T")[0],
    time: created.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    observation: (r.observation as string) || "",
    displayAsAlert: Boolean(r.display_as_alert),
    createdBy: (r.created_by as string) || undefined,
  };
}

export async function getObservations(animalId?: string): Promise<ObservationEntry[]> {
  if (!animalId) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("animal_id", animalId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[getObservations] error", error);
    return [];
  }
  return (data || []).map(rowToObservation);
}

export async function addObservation(
  animalId: string,
  entry: { observation: string; displayAsAlert: boolean; createdBy?: string }
): Promise<ObservationEntry | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      animal_id: animalId,
      observation: entry.observation,
      display_as_alert: entry.displayAsAlert,
      created_by: entry.createdBy || null,
    })
    .select()
    .single();
  if (error) {
    console.error("[addObservation] error", error);
    return null;
  }
  return rowToObservation(data);
}

export async function updateObservation(
  id: string,
  updates: { observation?: string; displayAsAlert?: boolean }
): Promise<ObservationEntry | null> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.observation != null) dbUpdates.observation = updates.observation;
  if (updates.displayAsAlert != null) dbUpdates.display_as_alert = updates.displayAsAlert;

  const { data, error } = await supabase
    .from(TABLE)
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("[updateObservation] error", error);
    return null;
  }
  return rowToObservation(data);
}

export async function removeObservation(id: string): Promise<boolean> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("[removeObservation] error", error);
    return false;
  }
  return true;
}
