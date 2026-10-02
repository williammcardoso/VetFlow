import { supabase } from "@/integrations/supabase/client";

// Observação fixa de cada prestador (ex.: chave PIX, nome do titular) que
// sai no PDF de repasse enviado à Agrocentro. Fica no cadastro auxiliar
// (registry, key "providerNotes") — digitou uma vez, vem preenchida nas
// próximas.

const REGISTRY_KEY = "providerNotes";

const slug = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const providerNoteId = (provider: string) => `providerNote-${slug(provider)}`;

/** prestador (como aparece no relatório) → observação */
export async function listProviderNotes(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("registry").select("name, extra").eq("key", REGISTRY_KEY);
  if (error) {
    console.error("[providerNotes] list", error);
    return {};
  }
  const out: Record<string, string> = {};
  for (const row of (data || []) as Array<{ name: string; extra?: { note?: string } }>) {
    if (row.extra?.note) out[row.name] = row.extra.note;
  }
  return out;
}

/** Salva (ou apaga, se vazia) a observação do prestador. */
export async function saveProviderNote(provider: string, note: string): Promise<boolean> {
  const id = providerNoteId(provider);
  const text = note.trim();
  if (!text) {
    const { error } = await supabase.from("registry").delete().eq("id", id).eq("key", REGISTRY_KEY);
    if (error) console.error("[providerNotes] delete", error);
    return !error;
  }
  const { error } = await supabase
    .from("registry")
    .upsert({ id, key: REGISTRY_KEY, name: provider, extra: { note: text } }, { onConflict: "id" });
  if (error) console.error("[providerNotes] save", error);
  return !error;
}
