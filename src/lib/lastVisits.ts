import { supabase } from "@/integrations/supabase/client";
import { fetchAllPages } from "@/lib/supabasePaging";

// Última visita do paciente/cliente: o mais recente entre atendimento e
// venda — tem paciente que vem só tomar uma injeção e é lançado apenas no
// financeiro. Recebimento (pagamento de algo antigo) e venda cancelada não
// contam como visita.

export type VisitSource = "atendimento" | "venda";

export interface LastVisit {
  /** "aaaa-mm-dd" */
  date: string;
  source: VisitSource;
}

export interface LastVisits {
  byAnimal: Record<string, LastVisit>;
  /** Vendas sem pet (só tutor) também contam para o cliente. */
  byClient: Record<string, LastVisit>;
}

interface ApptRow {
  animal_id?: string | null;
  date?: string | null;
}

interface SaleRow {
  related_animal_id?: string | null;
  related_client_id?: string | null;
  date?: string | null;
  type?: string | null;
  category?: string | null;
  status?: string | null;
}

/** Mais recente vence; no mesmo dia, "atendimento" tem preferência. */
export function newerVisit(a: LastVisit | undefined, b: LastVisit | undefined): LastVisit | undefined {
  if (!a) return b;
  if (!b) return a;
  if (a.date !== b.date) return a.date > b.date ? a : b;
  return a.source === "atendimento" ? a : b;
}

export const isVisitSale = (r: SaleRow) =>
  r.type === "income" && (r.category || "") !== "Recebimento" && r.status !== "cancelled" && !!r.date;

export function mergeLastVisits(appointments: ApptRow[], sales: SaleRow[]): LastVisits {
  const byAnimal: Record<string, LastVisit> = {};
  const byClient: Record<string, LastVisit> = {};
  for (const r of appointments) {
    if (!r.animal_id || !r.date) continue;
    byAnimal[r.animal_id] = newerVisit(byAnimal[r.animal_id], { date: r.date.slice(0, 10), source: "atendimento" })!;
  }
  for (const r of sales) {
    if (!isVisitSale(r)) continue;
    const visit: LastVisit = { date: r.date!.slice(0, 10), source: "venda" };
    if (r.related_animal_id) byAnimal[r.related_animal_id] = newerVisit(byAnimal[r.related_animal_id], visit)!;
    if (r.related_client_id) byClient[r.related_client_id] = newerVisit(byClient[r.related_client_id], visit)!;
  }
  return { byAnimal, byClient };
}

/** Última visita do cliente: a mais recente entre os pets dele e as vendas no nome dele. */
export function clientLastVisit(visits: LastVisits, clientId: string, animalIds: string[]): LastVisit | undefined {
  let best = visits.byClient[clientId];
  for (const id of animalIds) best = newerVisit(best, visits.byAnimal[id]);
  return best;
}

export async function listLastVisits(): Promise<LastVisits> {
  const [appts, sales] = await Promise.all([
    fetchAllPages<ApptRow>((from, to) => supabase.from("appointments").select("animal_id, date").order("date", { ascending: false }).range(from, to)),
    fetchAllPages<SaleRow>((from, to) =>
      supabase
        .from("financial_transactions")
        .select("related_animal_id, related_client_id, date, type, category, status")
        .eq("type", "income")
        .order("date", { ascending: false })
        .range(from, to)
    ),
  ]);
  if (appts.error) console.error("[listLastVisits] atendimentos", appts.error);
  if (sales.error) console.error("[listLastVisits] vendas", sales.error);
  return mergeLastVisits(appts.data ?? [], sales.data ?? []);
}
