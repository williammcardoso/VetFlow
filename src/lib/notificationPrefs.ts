import { supabase } from "@/integrations/supabase/client";

// O que o sininho mostra (tela Configuração › Notificações). Fica no banco
// (tabela settings, chave "notifications" — migration 20260930120000) para
// valer no computador e no celular; enquanto a migration não for aplicada,
// fica guardado só no aparelho.

export interface NotificationPrefs {
  /** Horários das próximas 2 horas. */
  agenda: boolean;
  /** Horários de hoje que passaram sem conclusão. */
  pendentes: boolean;
  vacinas: boolean;
  acompanhamentos: boolean;
  /** Backup atrasado (só aparece para administrador). */
  backup: boolean;
  /** Avisar vacinas/acompanhamentos com quantos dias de antecedência. */
  diasAntes: number;
  /** Atrasados aparecem até quantos dias depois da data. */
  atrasadosAte: number;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  agenda: true,
  pendentes: true,
  vacinas: true,
  acompanhamentos: true,
  backup: true,
  diasAntes: 7,
  atrasadosAte: 30,
};

const LOCAL_KEY = "vf:notif:prefs";
const SETTINGS_KEY = "notifications";

const clampDays = (value: unknown, fallback: number, max: number) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : fallback;
};

/** Completa o que faltar com o padrão e corrige números fora da faixa. */
export function normalizePrefs(raw: unknown): NotificationPrefs {
  const p = (raw && typeof raw === "object" ? raw : {}) as Partial<NotificationPrefs>;
  const d = DEFAULT_NOTIFICATION_PREFS;
  const bool = (v: unknown, fb: boolean) => (typeof v === "boolean" ? v : fb);
  return {
    agenda: bool(p.agenda, d.agenda),
    pendentes: bool(p.pendentes, d.pendentes),
    vacinas: bool(p.vacinas, d.vacinas),
    acompanhamentos: bool(p.acompanhamentos, d.acompanhamentos),
    backup: bool(p.backup, d.backup),
    diasAntes: clampDays(p.diasAntes, d.diasAntes, 60),
    atrasadosAte: clampDays(p.atrasadosAte, d.atrasadosAte, 365),
  };
}

function readLocal(): NotificationPrefs | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? normalizePrefs(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeLocal(prefs: NotificationPrefs) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(prefs));
  } catch {
    /* modo privado */
  }
}

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const { data, error } = await supabase.from("settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
  if (!error && data?.value) {
    const prefs = normalizePrefs(data.value);
    writeLocal(prefs);
    return prefs;
  }
  return readLocal() ?? DEFAULT_NOTIFICATION_PREFS;
}

/** Salva. `savedInDb: false` = ficou só neste aparelho (migration não aplicada ou sem internet). */
export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<{ savedInDb: boolean }> {
  const clean = normalizePrefs(prefs);
  writeLocal(clean);
  const { error } = await supabase
    .from("settings")
    .upsert({ key: SETTINGS_KEY, value: clean, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) console.warn("[notificationPrefs] salvo só no aparelho", error.message);
  return { savedInDb: !error };
}
