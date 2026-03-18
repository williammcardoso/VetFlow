import { supabase } from "@/integrations/supabase/client";
import type { ExamEntry } from "@/types/exam";

const TABLE = "exams";

function rowToExam(r: Record<string, unknown>): ExamEntry {
  const data = (r.data as Record<string, unknown>) || {};
  return {
    id: r.id as string,
    date: r.date as string,
    time: (r.time as string) || "",
    type: (r.type as string) || "",
    vet: (r.vet as string) || "",
    result: r.result as string | undefined,
    observacoesGeraisExame: r.observacoes_gerais_exame as string | undefined,
    liberadoPor: r.liberado_por as string | undefined,
    laboratory: r.laboratory as string | undefined,
    laboratoryDate: r.laboratory_date as string | undefined,
    ...data,
  } as ExamEntry;
}

function examToRow(entry: ExamEntry): Record<string, unknown> {
  const { id, date, time, type, vet, result, observacoesGeraisExame, liberadoPor, laboratory, laboratoryDate, ...rest } = entry;
  return {
    id,
    animal_id: (entry as Record<string, unknown>).animalId ?? null,
    date,
    time: time ?? null,
    type: type ?? null,
    vet: vet ?? null,
    result: result ?? null,
    observacoes_gerais_exame: observacoesGeraisExame ?? null,
    liberado_por: liberadoPor ?? null,
    laboratory: laboratory ?? null,
    laboratory_date: laboratoryDate ?? null,
    data: rest,
  };
}

export async function getExams(animalId?: string): Promise<ExamEntry[]> {
  let q = supabase.from(TABLE).select("*").order("date", { ascending: false }).order("time", { ascending: false });
  if (animalId) q = q.eq("animal_id", animalId);
  const { data, error } = await q;
  if (error) {
    console.error("[getExams] error", error);
    return [];
  }
  return (data || []).map((r: Record<string, unknown>) => rowToExam(r));
}

export async function getExamById(id: string): Promise<ExamEntry | null> {
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();
  if (error || !data) return null;
  return rowToExam(data as Record<string, unknown>);
}

export async function addExam(entry: Omit<ExamEntry, "id">): Promise<ExamEntry | null> {
  const id = `exam-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const row = examToRow({ ...entry, id });
  const { data, error } = await supabase.from(TABLE).insert({ ...row, id }).select().single();
  if (error) {
    console.error("[addExam] error", error);
    return null;
  }
  return rowToExam(data as Record<string, unknown>);
}

export async function updateExam(updated: ExamEntry): Promise<boolean> {
  const row = examToRow(updated);
  const { id, ...updates } = row;
  const { error } = await supabase.from(TABLE).update(updates).eq("id", id);
  if (error) {
    console.error("[updateExam] error", error);
    return false;
  }
  return true;
}

export async function removeExam(id: string): Promise<boolean> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("[removeExam] error", error);
    return false;
  }
  return true;
}
