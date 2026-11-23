import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { entryFromRpc, type AgendaLogEntry } from "@/lib/agendaLog";

export type AgendaLogErrorKind = "auth" | "missing" | "offline" | "other";

export class AgendaLogError extends Error {
  kind: AgendaLogErrorKind;
  constructor(kind: AgendaLogErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

/**
 * Log da agenda — só abre com usuário e senha do VetFlow: a função
 * agenda_log_listar confere a senha no próprio banco (a tabela não é lida
 * direto pela internet). `days` = últimos N dias (0 = tudo).
 */
export async function fetchAgendaLog(username: string, password: string, days: number): Promise<AgendaLogEntry[]> {
  if (!isSupabaseConfigured) throw new AgendaLogError("other", "Supabase não está configurado.");
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new AgendaLogError("offline", "Sem conexão com a internet. Tente de novo em instantes.");
  }
  const { data, error } = await supabase.rpc("agenda_log_listar", {
    p_usuario: username.trim(),
    p_senha: password,
    p_dias: days,
    p_limite: 2000,
  });
  if (error) {
    const msg = error.message || "";
    if (/unauthorized/i.test(msg)) throw new AgendaLogError("auth", "Usuário ou senha inválidos.");
    if (error.code === "PGRST202" || error.code === "42883" || /could not find the function/i.test(msg)) {
      throw new AgendaLogError("missing", "O log ainda não foi ativado no banco (falta rodar o SQL 20261123120000 no Supabase).");
    }
    if (/failed to fetch|network/i.test(msg)) {
      throw new AgendaLogError("offline", "Não deu para falar com o servidor. Tente de novo em instantes.");
    }
    throw new AgendaLogError("other", `Não deu para abrir o log: ${msg}`);
  }
  return ((data ?? []) as Record<string, unknown>[]).map(entryFromRpc);
}
