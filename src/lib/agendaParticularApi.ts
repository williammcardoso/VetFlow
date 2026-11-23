import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { parsePrivateData, type PrivateData } from "@/lib/agendaParticular";

// Agenda particular: toda chamada leva usuário e senha do VetFlow — as funções
// do banco conferem a senha (e se é o dono da agenda) a cada vez. A senha fica
// só na memória da página (nada de localStorage).

export interface Creds {
  username: string;
  password: string;
}

export type PrivateAgendaErrorKind = "auth" | "owner" | "missing" | "offline" | "pushover" | "other";

export class PrivateAgendaError extends Error {
  kind: PrivateAgendaErrorKind;
  constructor(kind: PrivateAgendaErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

function toError(error: { code?: string; message?: string }): PrivateAgendaError {
  const msg = error.message || "";
  if (/unauthorized/i.test(msg)) return new PrivateAgendaError("auth", "Usuário ou senha inválidos.");
  if (/not_owner/i.test(msg)) return new PrivateAgendaError("owner", "Esta agenda particular é de outro usuário do VetFlow.");
  if (/sem_pushover/i.test(msg)) return new PrivateAgendaError("pushover", "O Pushover ainda não está configurado no banco.");
  if (/texto_vazio/i.test(msg)) return new PrivateAgendaError("other", "Escreva o que é para lembrar.");
  if (/intervalo_invalido/i.test(msg)) return new PrivateAgendaError("other", "O intervalo precisa ser de pelo menos 1 dia.");
  if (/nao_encontrado/i.test(msg)) return new PrivateAgendaError("other", "Esse lembrete não existe mais. Atualize a página.");
  if (error.code === "PGRST202" || error.code === "42883" || /could not find the function/i.test(msg)) {
    return new PrivateAgendaError("missing", "A agenda particular ainda não foi ativada no banco (falta rodar o SQL 20261123160000 no Supabase).");
  }
  if (/failed to fetch|network/i.test(msg)) return new PrivateAgendaError("offline", "Não deu para falar com o servidor. Tente de novo em instantes.");
  return new PrivateAgendaError("other", msg || "Algo deu errado.");
}

async function call<T>(fn: string, creds: Creds, args: Record<string, unknown> = {}): Promise<T> {
  if (!isSupabaseConfigured) throw new PrivateAgendaError("other", "Supabase não está configurado.");
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new PrivateAgendaError("offline", "Sem conexão com a internet. Tente de novo em instantes.");
  }
  const { data, error } = await supabase.rpc(fn, { p_usuario: creds.username.trim(), p_senha: creds.password, ...args });
  if (error) throw toError(error);
  return data as T;
}

export async function loadPrivateAgenda(creds: Creds): Promise<PrivateData> {
  return parsePrivateData(await call<unknown>("agenda_particular_dados", creds));
}

export interface ReminderInput {
  id?: number;
  texto: string;
  detalhes: string;
  aCadaDias: number | null;
  /** HH:MM */
  hora: string;
  /** AAAA-MM-DD do (próximo) aviso */
  data: string;
  prioridade: number;
  som: string | null;
  ativo: boolean;
}

export async function saveReminder(creds: Creds, r: ReminderInput): Promise<number> {
  const id = await call<number>("agenda_particular_salvar", creds, {
    p_lembrete: {
      id: r.id ?? null,
      texto: r.texto,
      detalhes: r.detalhes,
      a_cada_dias: r.aCadaDias,
      hora: r.hora,
      data: r.data,
      prioridade: r.prioridade,
      som: r.som,
      ativo: r.ativo,
    },
  });
  return Number(id);
}

export const setReminderActive = (creds: Creds, id: number, ativo: boolean) =>
  call<void>("agenda_particular_ativar", creds, { p_id: id, p_ativo: ativo });

export const deleteReminder = (creds: Creds, id: number) => call<void>("agenda_particular_apagar", creds, { p_id: id });

/** Aviso de teste agora (de um lembrete, ou genérico para conferir a pasta). */
export const sendTest = (creds: Creds, id: number | null) => call<number>("agenda_particular_testar", creds, { p_id: id });

export interface ConfigPatch {
  pushover_token?: string;
  aparelhos_particular?: string;
  aparelhos_vetflow?: string;
  hora_padrao?: string;
  som_padrao?: string;
}

export const saveConfig = (creds: Creds, patch: ConfigPatch) =>
  call<void>("agenda_particular_config_salvar", creds, { p_config: patch });

export interface PushoverDevices {
  devices: string[];
  licenses: string[];
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Aparelhos ligados à conta do Pushover. O banco pergunta ao Pushover em
 * segundo plano; a resposta chega em ~1 s, então lê algumas vezes.
 */
export async function fetchPushoverDevices(creds: Creds): Promise<PushoverDevices> {
  const req = await call<number>("agenda_particular_aparelhos_pedir", creds);
  for (let i = 0; i < 10; i++) {
    await wait(i === 0 ? 900 : 700);
    const res = await call<Record<string, unknown> | null>("agenda_particular_aparelhos_ler", creds, { p_req: req });
    if (!res) continue;
    if (typeof res.erro === "string") throw new PrivateAgendaError("pushover", res.erro);
    if (res.status !== 1) {
      const errors = Array.isArray(res.errors) ? (res.errors as string[]).join(" ") : "";
      throw new PrivateAgendaError("pushover", `O Pushover recusou: ${errors || "chave inválida"}`);
    }
    const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
    return { devices: list(res.devices), licenses: list(res.licenses) };
  }
  throw new PrivateAgendaError("pushover", "O Pushover demorou para responder. Tente de novo.");
}
