import { supabase } from "@/integrations/supabase/client";
import type { PrescriptionEntry } from "@/types/medication";

const TABLE = "prescriptions";

function rowToPrescription(r: Record<string, unknown>): PrescriptionEntry {
  const meds = r.medications as unknown;
  const manipulated = r.manipulated_prescription as unknown;
  return {
    id: r.id as string,
    date: r.date as string,
    time: (r.time as string) || "",
    medicationName: (r.medication_name as string) || "",
    treatmentDescription: r.treatment_description as string | undefined,
    instructions: (r.instructions as string) || "",
    type: (r.type as PrescriptionEntry["type"]) || "simple",
    medications: Array.isArray(meds) ? meds as PrescriptionEntry["medications"] : undefined,
    manipulatedPrescription: manipulated && typeof manipulated === "object" ? manipulated as PrescriptionEntry["manipulatedPrescription"] : undefined,
  };
}

export async function getPrescriptions(animalId?: string): Promise<PrescriptionEntry[]> {
  // Nunca chamado de propósito sem animalId (diferente de getAppointments) —
  // um animalId "ainda não resolvido" não deve virar "todas as receitas da
  // clínica" (bug real: prontuário mostrando receita de outro paciente).
  if (!animalId) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("animal_id", animalId)
    .order("date", { ascending: false })
    .order("time", { ascending: false });
  if (error) {
    console.error("[getPrescriptions] error", error);
    return [];
  }
  return (data || []).map((r: Record<string, unknown>) => rowToPrescription(r));
}

export async function getPrescriptionById(id: string): Promise<PrescriptionEntry | null> {
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();
  if (error || !data) return null;
  return rowToPrescription(data as Record<string, unknown>);
}

export async function addPrescription(entry: Omit<PrescriptionEntry, "id">): Promise<PrescriptionEntry | null> {
  const id = `rx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const insertObj = {
    id,
    animal_id: (entry as Record<string, unknown>).animalId ?? null,
    date: entry.date,
    time: entry.time ?? null,
    medication_name: entry.medicationName ?? null,
    treatment_description: entry.treatmentDescription ?? null,
    instructions: entry.instructions ?? null,
    type: entry.type ?? "simple",
    medications: entry.medications ?? [],
    manipulated_prescription: entry.manipulatedPrescription ?? null,
  };
  const { data, error } = await supabase.from(TABLE).insert(insertObj).select().single();
  if (error) {
    console.error("[addPrescription] error", error);
    return null;
  }
  return rowToPrescription(data as Record<string, unknown>);
}

export async function updatePrescription(updated: PrescriptionEntry): Promise<boolean> {
  const { error } = await supabase
    .from(TABLE)
    .update({
      date: updated.date,
      time: updated.time ?? null,
      medication_name: updated.medicationName ?? null,
      treatment_description: updated.treatmentDescription ?? null,
      instructions: updated.instructions ?? null,
      type: updated.type ?? "simple",
      medications: updated.medications ?? [],
      manipulated_prescription: updated.manipulatedPrescription ?? null,
    })
    .eq("id", updated.id);
  if (error) {
    console.error("[updatePrescription] error", error);
    return false;
  }
  return true;
}

export async function removePrescription(id: string): Promise<boolean> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("[removePrescription] error", error);
    return false;
  }
  return true;
}
