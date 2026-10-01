import { supabase } from "@/integrations/supabase/client";
import { fetchAllPages } from "@/lib/supabasePaging";
import { displayAppointmentType } from "@/lib/appointmentDisplay";

// Última atualização do prontuário: o registro mais recente do paciente,
// seja qual for — atendimento (consulta, vacina, retorno...), exame, receita,
// venda (ex.: só uma injeção lançada no financeiro), documento, observação ou
// pesagem. Recebimento (pagamento de algo antigo) e venda cancelada não
// contam.

export type VisitSource = "atendimento" | "exame" | "receita" | "venda" | "documento" | "observação" | "pesagem";

export interface LastVisit {
  /** "aaaa-mm-dd" */
  date: string;
  /** "HH:MM" quando o registro tem hora (desempata no mesmo dia). */
  time?: string;
  source: VisitSource;
  /** O que aparece na tela: "consulta", "vacina", "exame", "receita", "venda"... */
  label: string;
}

export interface LastVisits {
  byAnimal: Record<string, LastVisit>;
  /** Vendas sem pet (só tutor) também contam para o cliente. */
  byClient: Record<string, LastVisit>;
}

/** No mesmo minuto, o registro mais "clínico" ganha. */
const PRIORITY: Record<VisitSource, number> = {
  atendimento: 0,
  exame: 1,
  receita: 2,
  documento: 3,
  venda: 4,
  observação: 5,
  pesagem: 6,
};

const stamp = (v: LastVisit) => `${v.date}T${v.time || "00:00"}`;

/** Mais recente vence (data + hora); empate: atendimento > exame > receita > ... */
export function newerVisit(a: LastVisit | undefined, b: LastVisit | undefined): LastVisit | undefined {
  if (!a) return b;
  if (!b) return a;
  const sa = stamp(a);
  const sb = stamp(b);
  if (sa !== sb) return sa > sb ? a : b;
  return PRIORITY[a.source] <= PRIORITY[b.source] ? a : b;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Data/hora do banco ("aaaa-mm-dd" + "HH:MM", ou ISO com fuso) → data e hora locais. */
export function toLocalStamp(date?: string | null, time?: string | null): { date: string; time?: string } | null {
  if (!date) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return { date, time: time?.slice(0, 5) || undefined };
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

export interface PatientEvent {
  animalId?: string | null;
  clientId?: string | null;
  date?: string | null;
  time?: string | null;
  source: VisitSource;
  label: string;
}

export interface SaleRow {
  related_animal_id?: string | null;
  related_client_id?: string | null;
  date?: string | null;
  time?: string | null;
  type?: string | null;
  category?: string | null;
  status?: string | null;
}

export const isVisitSale = (r: SaleRow) =>
  r.type === "income" && (r.category || "") !== "Recebimento" && r.status !== "cancelled" && !!r.date;

export function mergeLastVisits(events: PatientEvent[]): LastVisits {
  const byAnimal: Record<string, LastVisit> = {};
  const byClient: Record<string, LastVisit> = {};
  for (const e of events) {
    const at = toLocalStamp(e.date, e.time);
    if (!at) continue;
    const visit: LastVisit = { ...at, source: e.source, label: e.label };
    if (e.animalId) byAnimal[e.animalId] = newerVisit(byAnimal[e.animalId], visit)!;
    if (e.clientId) byClient[e.clientId] = newerVisit(byClient[e.clientId], visit)!;
  }
  return { byAnimal, byClient };
}

/** Última atualização do cliente: a mais recente entre os pets dele e as vendas no nome dele. */
export function clientLastVisit(visits: LastVisits, clientId: string, animalIds: string[]): LastVisit | undefined {
  let best = visits.byClient[clientId];
  for (const id of animalIds) best = newerVisit(best, visits.byAnimal[id]);
  return best;
}

const all = <T,>(table: string, columns: string, orderBy: string, filter?: (q: any) => any) =>
  fetchAllPages<T>((from, to) => {
    let q = supabase.from(table).select(columns);
    if (filter) q = filter(q);
    // Colunas passadas como texto: o tipo do supabase-js não sabe o formato da linha.
    return q.order(orderBy, { ascending: false }).range(from, to) as any;
  });

export async function listLastVisits(): Promise<LastVisits> {
  type Row = Record<string, string | null>;
  const [appts, exams, rxs, sales, docs, patientDocs, obs, weights] = await Promise.all([
    all<Row>("appointments", "animal_id, date, time, type", "date"),
    all<Row>("exams", "animal_id, date, time", "date"),
    all<Row>("prescriptions", "animal_id, date, time", "date"),
    all<SaleRow>("financial_transactions", "related_animal_id, related_client_id, date, time, type, category, status", "date", (q) =>
      q.eq("type", "income")
    ),
    all<Row>("documents", "paciente_id, emitido_em, status", "emitido_em"),
    all<Row>("patient_documents", "animal_id, created_at", "created_at"),
    all<Row>("patient_observations", "animal_id, created_at", "created_at"),
    all<Row>("patient_weight_entries", "animal_id, recorded_date, recorded_time", "recorded_date"),
  ]);
  for (const [name, r] of Object.entries({ appts, exams, rxs, sales, docs, patientDocs, obs, weights })) {
    if (r.error) console.warn(`[listLastVisits] ${name}`, r.error);
  }

  const events: PatientEvent[] = [
    ...appts.data.map((r) => ({
      animalId: r.animal_id,
      date: r.date,
      time: r.time,
      source: "atendimento" as const,
      label: displayAppointmentType(r.type).toLowerCase(),
    })),
    ...exams.data.map((r) => ({ animalId: r.animal_id, date: r.date, time: r.time, source: "exame" as const, label: "exame" })),
    ...rxs.data.map((r) => ({ animalId: r.animal_id, date: r.date, time: r.time, source: "receita" as const, label: "receita" })),
    ...sales.data.filter(isVisitSale).map((r) => ({
      animalId: r.related_animal_id,
      clientId: r.related_client_id,
      date: r.date,
      time: r.time,
      source: "venda" as const,
      label: "venda",
    })),
    ...docs.data
      .filter((r) => r.status !== "cancelado")
      .map((r) => ({ animalId: r.paciente_id, date: r.emitido_em, source: "documento" as const, label: "documento" })),
    ...patientDocs.data.map((r) => ({ animalId: r.animal_id, date: r.created_at, source: "documento" as const, label: "documento" })),
    ...obs.data.map((r) => ({ animalId: r.animal_id, date: r.created_at, source: "observação" as const, label: "observação" })),
    ...weights.data.map((r) => ({ animalId: r.animal_id, date: r.recorded_date, time: r.recorded_time, source: "pesagem" as const, label: "pesagem" })),
  ];
  return mergeLastVisits(events);
}
