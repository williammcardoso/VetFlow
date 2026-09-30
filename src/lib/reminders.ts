import { supabase } from "@/integrations/supabase/client";
import type { AppointmentEntry } from "@/types/appointment";

// Lembretes de vacina e de acompanhamento (tela Previsão de Acompanhamentos
// e Vacinas): o que está para vencer, a mensagem pronta para o WhatsApp e o
// registro de quem já foi avisado.

export type ReminderKind = "vacina" | "retorno";

export interface ReminderItem {
  /** Identifica o lembrete (para marcar como enviado). */
  key: string;
  kind: ReminderKind;
  appointmentId: string;
  appointmentType: string;
  appointmentDate: string;
  animalId: string;
  dueDate: string; // AAAA-MM-DD
  /** Nome da vacina (só vacina). */
  vaccine?: string;
  /** Dias até a data prevista (negativo = atrasado). */
  daysUntil: number;
}

const DAY = 86_400_000;
const parseLocal = (iso: string) => new Date(`${iso}T00:00:00`);
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();

/**
 * Todos os lembretes pendentes, do mais urgente para o mais distante.
 * Ignora o que já foi resolvido: a vacina cuja dose seguinte já foi aplicada
 * (outro atendimento de Vacina do mesmo tipo depois) e o acompanhamento de
 * paciente que já voltou (outro atendimento, que não seja só vacina, depois).
 */
export function buildReminders(appointments: AppointmentEntry[], today = new Date()): ReminderItem[] {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const byAnimal = new Map<string, AppointmentEntry[]>();
  for (const app of appointments) {
    if (!app.animalId || !app.date) continue;
    const list = byAnimal.get(app.animalId) ?? [];
    list.push(app);
    byAnimal.set(app.animalId, list);
  }

  const items: ReminderItem[] = [];
  for (const app of appointments) {
    if (!app.animalId || !app.date) continue;
    const details = (app.details ?? {}) as Record<string, unknown>;
    const later = (byAnimal.get(app.animalId) ?? []).filter((o) => o.id !== app.id && o.date > app.date);

    // Vacina: próxima dose
    if (app.type === "Vacina" && typeof details.proximaDose === "string" && details.proximaDose) {
      const vaccine = String(details.tipoVacina || "Vacina");
      const done = later.some(
        (o) => o.type === "Vacina" && norm(String((o.details as Record<string, unknown>)?.tipoVacina || "Vacina")) === norm(vaccine)
      );
      if (!done) {
        const due = details.proximaDose.slice(0, 10);
        items.push({
          key: `vacina:${app.animalId}:${app.id}:${due}`,
          kind: "vacina",
          appointmentId: app.id,
          appointmentType: app.type,
          appointmentDate: app.date,
          animalId: app.animalId,
          dueDate: due,
          vaccine,
          daysUntil: Math.round((parseLocal(due).getTime() - start.getTime()) / DAY),
        });
      }
    }

    // Acompanhamento recomendado em N dias
    const days = Number(details.retornoRecomendadoEmDias);
    if (days > 0) {
      const done = later.some((o) => o.type !== "Vacina");
      if (!done) {
        const due = toISO(new Date(parseLocal(app.date).getTime() + days * DAY));
        items.push({
          key: `retorno:${app.animalId}:${app.id}:${due}`,
          kind: "retorno",
          appointmentId: app.id,
          appointmentType: app.type,
          appointmentDate: app.date,
          animalId: app.animalId,
          dueDate: due,
          daysUntil: Math.round((parseLocal(due).getTime() - start.getTime()) / DAY),
        });
      }
    }
  }
  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

const formatBR = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

/** Primeiro nome, para a mensagem soar pessoal ("Olá, Maria!"). */
export function firstName(fullName: string): string {
  return (fullName || "").trim().split(/\s+/)[0] || "";
}

/** Mensagem pronta do lembrete (texto do WhatsApp). */
export function buildReminderMessage(opts: {
  kind: ReminderKind;
  clientName: string;
  animalName: string;
  dueDate: string;
  daysUntil: number;
  vaccine?: string;
  clinicName?: string;
}): string {
  const hello = `Olá, ${firstName(opts.clientName) || "tudo bem"}! Tudo bem? 😊`;
  const when =
    opts.daysUntil < 0
      ? `estava prevista para *${formatBR(opts.dueDate)}*`
      : opts.daysUntil === 0
        ? "é *hoje*"
        : `está prevista para *${formatBR(opts.dueDate)}*`;
  const lines =
    opts.kind === "vacina"
      ? [
          "💉 *Lembrete de vacina*",
          "",
          hello,
          `A próxima dose da vacina *${opts.vaccine || "do pet"}* do(a) *${opts.animalName}* ${when}.`,
          "",
          "Quer agendar um horário? É só responder esta mensagem.",
        ]
      : [
          "🐾 *Lembrete de acompanhamento*",
          "",
          hello,
          `O acompanhamento do(a) *${opts.animalName}* ${opts.daysUntil < 0 ? "estava recomendado para" : "está recomendado para"} *${formatBR(opts.dueDate)}*.`,
          "",
          "Quer agendar um horário? É só responder esta mensagem.",
        ];
  if (opts.clinicName) lines.push("", opts.clinicName);
  return lines.join("\n");
}

// ------------------------------------------------------------ enviados / resolvidos
// Tabela reminder_log (migration 20260929120000). Cada linha é um evento:
// channel "whatsapp" = lembrete enviado; channel "resolvido" = dado como
// resolvido sem mandar lembrete (ex.: acompanhamento feito pelo WhatsApp).
// Sem a tabela, guarda no próprio aparelho — e continua funcionando.
const LOCAL_SENT = "vf:reminders:sent";
const LOCAL_RESOLVED = "vf:reminders:resolved";
export const RESOLVED_CHANNEL = "resolvido";

export interface ReminderStatus {
  /** chave → último envio pelo WhatsApp */
  sent: Record<string, string>;
  /** chave → quando foi dado como resolvido */
  resolved: Record<string, string>;
}

function readLocal(key: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

function writeLocal(key: string, map: Record<string, string>) {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* modo privado */
  }
}

/** Junta as linhas do reminder_log com a reserva do aparelho. */
export function mergeReminderRows(
  rows: Array<{ reminder_key: string; sent_at: string; channel?: string | null }>,
  local: ReminderStatus
): ReminderStatus {
  const sent = { ...local.sent };
  const resolved = { ...local.resolved };
  for (const row of rows) {
    const target = row.channel === RESOLVED_CHANNEL ? resolved : sent;
    if (!target[row.reminder_key] || target[row.reminder_key] < row.sent_at) target[row.reminder_key] = row.sent_at;
  }
  return { sent, resolved };
}

/** Lembretes já enviados e já resolvidos. */
export async function getReminderStatus(): Promise<ReminderStatus> {
  const local = { sent: readLocal(LOCAL_SENT), resolved: readLocal(LOCAL_RESOLVED) };
  const { data, error } = await supabase
    .from("reminder_log")
    .select("reminder_key, sent_at, channel")
    .order("sent_at", { ascending: false })
    .limit(5000);
  if (error) return local;
  return mergeReminderRows((data ?? []) as Array<{ reminder_key: string; sent_at: string; channel: string }>, local);
}

type LogItem = Pick<ReminderItem, "key" | "kind" | "animalId" | "dueDate">;

async function insertLog(item: LogItem, channel: string, extra: { clientId?: string; sentBy?: string }) {
  const { error } = await supabase.from("reminder_log").insert({
    reminder_key: item.key,
    kind: item.kind,
    animal_id: item.animalId,
    client_id: extra.clientId ?? null,
    due_date: item.dueDate,
    channel,
    sent_by: extra.sentBy ?? null,
  });
  if (error) console.warn("[reminder_log] não gravou no banco (migration aplicada?)", error.message);
}

/** Marca como enviado (no banco e no aparelho). */
export async function markReminderSent(item: LogItem, extra: { clientId?: string; sentBy?: string }): Promise<string> {
  const at = new Date().toISOString();
  writeLocal(LOCAL_SENT, { ...readLocal(LOCAL_SENT), [item.key]: at });
  await insertLog(item, "whatsapp", extra);
  return at;
}

/** Dá como resolvido sem mandar lembrete — sai das listas e do sininho. */
export async function markReminderResolved(item: LogItem, extra: { clientId?: string; sentBy?: string }): Promise<string> {
  const at = new Date().toISOString();
  writeLocal(LOCAL_RESOLVED, { ...readLocal(LOCAL_RESOLVED), [item.key]: at });
  await insertLog(item, RESOLVED_CHANNEL, extra);
  return at;
}

/** Desfaz o "resolvido" (volta para a lista). */
export async function unmarkReminderResolved(key: string): Promise<void> {
  const local = readLocal(LOCAL_RESOLVED);
  delete local[key];
  writeLocal(LOCAL_RESOLVED, local);
  const { error } = await supabase.from("reminder_log").delete().eq("reminder_key", key).eq("channel", RESOLVED_CHANNEL);
  if (error) console.warn("[reminder_log] não desfez no banco", error.message);
}
