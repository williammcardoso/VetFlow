import { supabase } from "@/integrations/supabase/client";

// Contador de envios ao tutor (WhatsApp): quantas vezes cada exame, receita,
// orçamento ou documento foi mandado e quando foi a última. Tabela
// send_log (migration 20260930130000); sem ela, guarda no aparelho.

export type SendItemType = "exam" | "prescription" | "budget" | "document";

export interface SendTrack {
  type: SendItemType;
  id: string;
  animalId?: string;
}

export interface SendStat {
  count: number;
  /** ISO da última vez */
  last: string;
}

export const sendKey = (type: SendItemType, id: string) => `${type}:${id}`;

const LOCAL_KEY = "vf:send-log";
/** Avisa as telas abertas que um envio foi registrado. */
export const SEND_LOGGED_EVENT = "vf:send-logged";

type LocalEvents = Record<string, string[]>; // chave → datas ISO

function readLocal(): LocalEvents {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeLocal(map: LocalEvents) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(map));
  } catch {
    /* modo privado */
  }
}

/**
 * Junta os envios do banco com os que ficaram só no aparelho (o aparelho
 * guarda apenas o que não conseguiu gravar no banco — não há duplicata).
 */
export function mergeSendEvents(dbRows: Array<{ item_key: string; sent_at: string }>, local: LocalEvents): Record<string, SendStat> {
  const out: Record<string, SendStat> = {};
  const add = (key: string, iso: string) => {
    const at = new Date(iso).toISOString();
    const cur = out[key];
    out[key] = { count: (cur?.count ?? 0) + 1, last: !cur || at > cur.last ? at : cur.last };
  };
  for (const r of dbRows) add(r.item_key, r.sent_at);
  for (const [key, list] of Object.entries(local)) for (const iso of list) add(key, iso);
  return out;
}

export async function getSendLog(): Promise<Record<string, SendStat>> {
  const local = readLocal();
  const { data, error } = await supabase.from("send_log").select("item_key, sent_at").order("sent_at", { ascending: false }).limit(10000);
  return mergeSendEvents(error ? [] : ((data ?? []) as Array<{ item_key: string; sent_at: string }>), local);
}

function currentUsername(): string | null {
  try {
    return (JSON.parse(sessionStorage.getItem("vf:auth:session") || "null") as { username?: string } | null)?.username ?? null;
  } catch {
    return null;
  }
}

/** Registra um envio (banco + aparelho) e avisa as telas abertas. */
export async function recordSend(track: SendTrack): Promise<void> {
  const key = sendKey(track.type, track.id);
  const at = new Date().toISOString();
  const local = readLocal();
  local[key] = [...(local[key] ?? []), at].slice(-50);
  writeLocal(local);
  window.dispatchEvent(new CustomEvent(SEND_LOGGED_EVENT, { detail: { key, at } }));
  const { error } = await supabase.from("send_log").insert({
    item_key: key,
    item_type: track.type,
    animal_id: track.animalId ?? null,
    sent_by: currentUsername(),
  });
  if (error) {
    console.warn("[send_log] não gravou no banco — fica no aparelho (migration aplicada?)", error.message);
    return;
  }
  // Gravou no banco: tira do aparelho (senão contaria duas vezes).
  const after = readLocal();
  after[key] = (after[key] ?? []).filter((iso) => iso !== at);
  if (after[key].length === 0) delete after[key];
  writeLocal(after);
}

/** "Enviado 2× · último 30/09 15:40" */
export function formatSendStat(stat: SendStat): string {
  const d = new Date(stat.last);
  const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `Enviado ${stat.count}× · último ${date} ${time}`;
}
