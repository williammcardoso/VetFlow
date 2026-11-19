import { supabase } from "@/integrations/supabase/client";

// Especialistas externos que pedem os dados do tutor e do pet (nome +
// WhatsApp). Ficam no cadastro auxiliar (registry, key "specialistContacts"):
// mandou uma vez, aparece para escolher nas próximas, em qualquer aparelho.

const REGISTRY_KEY = "specialistContacts";

export interface SpecialistContact {
  id: string;
  name: string;
  phone: string;
}

const digits = (s: string) => s.replace(/\D/g, "");
/** Um contato por número: mandar de novo com outro nome só renomeia. */
export const specialistContactId = (phone: string) => `specialist-${digits(phone).replace(/^55(?=\d{10,11}$)/, "")}`;

export async function listSpecialistContacts(): Promise<SpecialistContact[]> {
  const { data, error } = await supabase.from("registry").select("id, name, extra").eq("key", REGISTRY_KEY);
  if (error) {
    console.error("[specialistContacts] list", error);
    return [];
  }
  return ((data || []) as Array<{ id: string; name: string; extra?: { phone?: string } }>)
    .filter((r) => r.extra?.phone)
    .map((r) => ({ id: r.id, name: r.name, phone: r.extra!.phone! }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function saveSpecialistContact(name: string, phone: string): Promise<SpecialistContact | null> {
  const contact = { id: specialistContactId(phone), name: name.trim(), phone: phone.trim() };
  const { error } = await supabase
    .from("registry")
    .upsert({ id: contact.id, key: REGISTRY_KEY, name: contact.name, extra: { phone: contact.phone } }, { onConflict: "id" });
  if (error) {
    console.error("[specialistContacts] save", error);
    return null;
  }
  return contact;
}

export async function removeSpecialistContact(id: string): Promise<boolean> {
  const { error } = await supabase.from("registry").delete().eq("id", id).eq("key", REGISTRY_KEY);
  if (error) console.error("[specialistContacts] remove", error);
  return !error;
}
