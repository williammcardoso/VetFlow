import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type { CompanySettings, UserSettings } from "@/types/settings";
import { updateMockCompanySettings, updateMockUserSettings } from "@/mockData/settings";

const TABLE = "settings";

const DEFAULT_COMPANY: CompanySettings = {
  companyName: "",
  crmv: "",
  mapaRegistration: "",
  address: "",
  city: "",
  zipCode: "",
  phone: "",
  email: "",
  logoUrl: "",
};

const DEFAULT_USER: UserSettings = {
  userName: "",
  userEmail: "",
  userCrmv: "",
  userMapaRegistration: "",
  signatureText: "",
};

export async function getCompanySettings(): Promise<CompanySettings> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não está configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("value")
    .eq("key", "company")
    .maybeSingle();

  if (error) {
    console.error("[settingsApi] getCompanySettings error", error);
    throw new Error(`Falha ao carregar configurações da empresa: ${error.message}`);
  }

  if (!data) {
    const cached = localStorage.getItem("settings:company_cache");
    if (cached) {
      const parsed = { ...DEFAULT_COMPANY, ...(JSON.parse(cached) as Partial<CompanySettings>) };
      updateMockCompanySettings(parsed);
      return parsed;
    }
    updateMockCompanySettings(DEFAULT_COMPANY);
    return DEFAULT_COMPANY;
  }
  const next = { ...DEFAULT_COMPANY, ...(data.value as Partial<CompanySettings>) };
  updateMockCompanySettings(next);
  localStorage.setItem("settings:company_cache", JSON.stringify(next));
  window.dispatchEvent(new Event("vf-company-settings-updated"));
  return next;
}

export async function saveCompanySettings(settings: CompanySettings): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não está configurado.");
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from(TABLE)
    .upsert({ key: "company", value: settings, updated_at: now }, { onConflict: "key" });

  if (error) {
    console.error("[settingsApi] saveCompanySettings error", error);
    throw new Error(`Falha ao salvar configurações: ${error.message}`);
  }
  updateMockCompanySettings(settings);
  localStorage.setItem("settings:company_cache", JSON.stringify(settings));
  window.dispatchEvent(new Event("vf-company-settings-updated"));
}

export async function getUserSettings(): Promise<UserSettings> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não está configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("value")
    .eq("key", "user")
    .maybeSingle();

  if (error) {
    console.error("[settingsApi] getUserSettings error", error);
    throw new Error(`Falha ao carregar configurações do usuário: ${error.message}`);
  }

  if (!data) {
    const cached = localStorage.getItem("settings:user_cache");
    if (cached) {
      const parsed = { ...DEFAULT_USER, ...(JSON.parse(cached) as Partial<UserSettings>) };
      updateMockUserSettings(parsed);
      return parsed;
    }
    updateMockUserSettings(DEFAULT_USER);
    return DEFAULT_USER;
  }
  const next = { ...DEFAULT_USER, ...(data.value as Partial<UserSettings>) };
  updateMockUserSettings(next);
  localStorage.setItem("settings:user_cache", JSON.stringify(next));
  return next;
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não está configurado.");
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from(TABLE)
    .upsert({ key: "user", value: settings, updated_at: now }, { onConflict: "key" });

  if (error) {
    console.error("[settingsApi] saveUserSettings error", error);
    throw new Error(`Falha ao salvar configurações: ${error.message}`);
  }
  updateMockUserSettings(settings);
  localStorage.setItem("settings:user_cache", JSON.stringify(settings));
}
