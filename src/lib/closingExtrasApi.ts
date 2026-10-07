import { supabase } from "@/integrations/supabase/client";

// Acréscimos do Fechamento 50/50 que ficam fora da divisão (ex.: aplicações a
// domicílio cobradas no sistema da agropecuária, que são 100% da clínica).
// Somados depois da divisão, direto para quem recebe.

export type ExtraBeneficiary = "clinic" | "agro";

export interface ClosingExtra {
  id: string;
  year: number;
  month: number;
  description: string;
  amount: number;
  beneficiary: ExtraBeneficiary;
  createdAt?: string;
  createdBy?: string;
}

const TABLE = "monthly_closing_extras";

const isMissingTable = (error: { code?: string; message?: string } | null) =>
  !!error && (error.code === "PGRST205" || error.code === "42P01" || /could not find the table|does not exist/i.test(error.message || ""));

function rowToExtra(r: Record<string, unknown>): ClosingExtra {
  return {
    id: r.id as string,
    year: Number(r.year),
    month: Number(r.month),
    description: (r.description as string) || "",
    amount: Number(r.amount ?? 0),
    beneficiary: r.beneficiary === "agro" ? "agro" : "clinic",
    createdAt: (r.created_at as string) || undefined,
    createdBy: (r.created_by as string) || undefined,
  };
}

/** Acréscimos do mês. `available: false` = tabela ainda não criada (migration 20261007120000). */
export async function listClosingExtras(year: number, month: number): Promise<{ items: ClosingExtra[]; available: boolean }> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("year", year)
    .eq("month", month)
    .order("created_at", { ascending: true });
  if (isMissingTable(error)) return { items: [], available: false };
  if (error) throw new Error(`Falha ao carregar os acréscimos: ${error.message}`);
  return { items: (data || []).map((r) => rowToExtra(r as Record<string, unknown>)), available: true };
}

export async function addClosingExtra(entry: Omit<ClosingExtra, "id" | "createdAt">): Promise<ClosingExtra> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      year: entry.year,
      month: entry.month,
      description: entry.description.trim(),
      amount: Math.round(entry.amount * 100) / 100,
      beneficiary: entry.beneficiary,
      created_by: entry.createdBy ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`Falha ao salvar o acréscimo: ${error.message}`);
  return rowToExtra(data as Record<string, unknown>);
}

export async function deleteClosingExtra(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(`Falha ao excluir o acréscimo: ${error.message}`);
}

/** Descrições já usadas (mais recentes primeiro) — sugestão no campo. */
export async function listExtraDescriptions(): Promise<string[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("description, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of data || []) {
    const d = String((r as { description?: string }).description || "").trim();
    const key = d.toLowerCase();
    if (d && !seen.has(key)) {
      seen.add(key);
      out.push(d);
    }
  }
  return out;
}

export function sumExtras(items: Pick<ClosingExtra, "amount" | "beneficiary">[]): { clinic: number; agro: number } {
  const total = { clinic: 0, agro: 0 };
  for (const it of items) total[it.beneficiary] += it.amount;
  return { clinic: Math.round(total.clinic * 100) / 100, agro: Math.round(total.agro * 100) / 100 };
}
