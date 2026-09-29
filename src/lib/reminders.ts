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

// ------------------------------------------------------------ enviados
// Tabela reminder_log (migration 20260929120000). Enquanto ela não existir,
// guarda no próprio aparelho — e continua funcionando.
const LOCAL_KEY = "vf:reminders:sent";

export interface SentReminder {
  key: string;
  sentAt: string;
}

function readLocal(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeLocal(map: Record<string, string>) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(map));
  } catch {
    /* modo privado */
  }
}

/** Lembretes já enviados (chave → data/hora do último envio). */
export async function getSentReminders(): Promise<Record<string, string>> {
  const merged = readLocal();
  const { data, error } = await supabase
    .from("reminder_log")
    .select("reminder_key, sent_at")
    .order("sent_at", { ascending: true })
    .limit(1000);
  if (!error) {
    for (const row of (data ?? []) as Array<{ reminder_key: string; sent_at: string }>) {
      if (!merged[row.reminder_key] || merged[row.reminder_key] < row.sent_at) merged[row.reminder_key] = row.sent_at;
    }
  }
  return merged;
}

/** Marca como enviado (no banco e no aparelho). */
export async function markReminderSent(
  item: Pick<ReminderItem, "key" | "kind" | "animalId" | "dueDate">,
  extra: { clientId?: string; sentBy?: string }
): Promise<string> {
  const sentAt = new Date().toISOString();
  const local = readLocal();
  local[item.key] = sentAt;
  writeLocal(local);
  const { error } = await supabase.from("reminder_log").insert({
    reminder_key: item.key,
    kind: item.kind,
    animal_id: item.animalId,
    client_id: extra.clientId ?? null,
    due_date: item.dueDate,
    sent_by: extra.sentBy ?? null,
  });
  if (error) console.warn("[reminder_log] não gravou no banco (migration aplicada?)", error.message);
  return sentAt;
}
