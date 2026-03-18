import { supabase } from "@/integrations/supabase/client";
import type { RegistryKeySimple, RegistryItem } from "@/mockData/registry";

const TABLE = "registry";

export async function getRegistryList(key: RegistryKeySimple): Promise<RegistryItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, name, extra")
    .eq("key", key)
    .order("name", { ascending: true });
  if (error) {
    console.error("[getRegistryList] error", error);
    return [];
  }
  return (data || []).map((row: { id: string; name: string; extra?: Record<string, unknown> }) => ({
    id: row.id,
    name: row.name,
    ...(row.extra || {}),
  })) as RegistryItem[];
}

export async function addRegistryItem(
  key: RegistryKeySimple,
  data: Omit<RegistryItem, "id">
): Promise<RegistryItem | null> {
  const id = `${key}-${Date.now()}`;
  const extra: Record<string, unknown> = {};
  Object.keys(data).forEach((k) => {
    if (k !== "name") extra[k] = (data as Record<string, unknown>)[k];
  });
  const { data: row, error } = await supabase
    .from(TABLE)
    .insert({ id, key, name: data.name, extra })
    .select()
    .single();
  if (error) {
    console.error("[addRegistryItem] error", error);
    return null;
  }
  return { id: row.id, name: row.name, ...(row.extra || {}) } as RegistryItem;
}

export async function updateRegistryItem(
  key: RegistryKeySimple,
  id: string,
  changes: Partial<RegistryItem>
): Promise<boolean> {
  const { name, ...rest } = changes;
  const updates: Record<string, unknown> = {};
  if (name != null) updates.name = name;
  const extraKeys = Object.keys(rest).filter((k) => k !== "id");
  if (extraKeys.length > 0) {
    const { data: current } = await supabase.from(TABLE).select("extra").eq("id", id).single();
    const currentExtra = (current?.extra as Record<string, unknown>) || {};
    extraKeys.forEach((k) => {
      currentExtra[k] = (rest as Record<string, unknown>)[k];
    });
    updates.extra = currentExtra;
  }
  if (Object.keys(updates).length === 0) return true;
  const { error } = await supabase.from(TABLE).update(updates).eq("id", id).eq("key", key);
  if (error) {
    console.error("[updateRegistryItem] error", error);
    return false;
  }
  return true;
}

export async function removeRegistryItem(key: RegistryKeySimple, id: string): Promise<boolean> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id).eq("key", key);
  if (error) {
    console.error("[removeRegistryItem] error", error);
    return false;
  }
  return true;
}
