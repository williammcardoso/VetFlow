import { supabase } from "@/integrations/supabase/client";

// Total de venda do mês no Orion (sistema da Agrocentro, onde o cliente paga),
// digitado do rodapé do relatório completo deles — o Fechamento 50/50 confere
// com as vendas do VetFlow + acréscimos. Tabela monthly_closing_orion
// (migration 20261103120000); sem ela, guarda no aparelho.

const TABLE = "monthly_closing_orion";
const localKey = (year: number, month: number) => `vf:orion-total:${year}-${String(month).padStart(2, "0")}`;

const isMissingTable = (error: { code?: string; message?: string } | null) =>
  !!error && (error.code === "PGRST205" || error.code === "42P01" || /could not find the table|does not exist/i.test(error.message || ""));

function readLocal(year: number, month: number): number | null {
  try {
    const raw = localStorage.getItem(localKey(year, month));
    const value = raw == null ? NaN : Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function writeLocal(year: number, month: number, value: number | null) {
  try {
    if (value == null) localStorage.removeItem(localKey(year, month));
    else localStorage.setItem(localKey(year, month), String(value));
  } catch {
    /* modo privado */
  }
}

/** `shared: false` = ficou só neste aparelho (migration não aplicada). */
export async function getOrionTotal(year: number, month: number): Promise<{ value: number | null; shared: boolean }> {
  const { data, error } = await supabase.from(TABLE).select("total_venda").eq("year", year).eq("month", month).maybeSingle();
  if (isMissingTable(error)) return { value: readLocal(year, month), shared: false };
  if (error) throw new Error(`Falha ao carregar o total do Orion: ${error.message}`);
  return { value: data ? Number((data as { total_venda: unknown }).total_venda) : null, shared: true };
}

/** Grava (ou apaga, com null) o total do mês. */
export async function saveOrionTotal(year: number, month: number, value: number | null, updatedBy?: string): Promise<{ shared: boolean }> {
  const query =
    value == null
      ? supabase.from(TABLE).delete().eq("year", year).eq("month", month)
      : supabase
          .from(TABLE)
          .upsert(
            { year, month, total_venda: Math.round(value * 100) / 100, updated_at: new Date().toISOString(), updated_by: updatedBy ?? null },
            { onConflict: "year,month" }
          );
  const { error } = await query;
  if (isMissingTable(error)) {
    writeLocal(year, month, value);
    return { shared: false };
  }
  if (error) throw new Error(`Falha ao salvar o total do Orion: ${error.message}`);
  return { shared: true };
}
