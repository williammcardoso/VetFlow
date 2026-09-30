import type { ReminderItem } from "@/lib/reminders";
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from "@/lib/notificationPrefs";
import type { ScheduleUI } from "@/lib/schedulesApi";

// Sininho do cabeçalho: cada notificação é UM item de verdade (um horário,
// um pet, um lembrete), com id próprio. Regras:
// - clicar marca como lido (continua na lista, sem o ponto azul);
// - o item some sozinho quando se resolve (horário passou/atendido,
//   lembrete enviado, dado como resolvido ou dose aplicada, backup feito);
// - item novo (id novo) acende de novo, mesmo que outro parecido já tenha
//   sido lido;
// - cada tipo pode ser desligado em Configuração › Notificações.

export type NotificationSection = "agora" | "lembretes" | "sistema";
export type NotificationKind = "agenda" | "pendente" | "vacina" | "retorno" | "backup";
export type NotificationTone = "sky" | "amber" | "rose" | "orange" | "violet";

export interface AppNotification {
  id: string;
  section: NotificationSection;
  kind: NotificationKind;
  tone: NotificationTone;
  title: string;
  detail: string;
  /** Selo curto de tempo/urgência ("em 25 min", "atrasado há 3 dias"). */
  when?: string;
  href: string;
  /** Lembrete que pode ser enviado direto do sininho. */
  reminder?: ReminderItem;
}

export const SECTION_LABELS: Record<NotificationSection, string> = {
  agora: "Agora",
  lembretes: "Vacinas e acompanhamentos",
  sistema: "Sistema",
};

export const SECTION_ORDER: NotificationSection[] = ["agora", "lembretes", "sistema"];

/** Link do "ver todos" de cada seção. */
export const SECTION_HREF: Record<NotificationSection, string> = {
  agora: "/agenda",
  lembretes: "/clinical/returns-forecast",
  sistema: "/settings/backup",
};

/** Qual preferência liga/desliga cada tipo. */
export const KIND_PREF: Record<NotificationKind, keyof NotificationPrefs> = {
  agenda: "agenda",
  pendente: "pendentes",
  vacina: "vacinas",
  retorno: "acompanhamentos",
  backup: "backup",
};

/** Tira os tipos desligados nas preferências. */
export function filterByPrefs(list: AppNotification[], prefs: NotificationPrefs): AppNotification[] {
  return list.filter((n) => prefs[KIND_PREF[n.kind]] !== false);
}

export interface NotificationInput {
  now: Date;
  schedules: ScheduleUI[];
  reminders: ReminderItem[];
  /** Lembretes já enviados (chave → quando). */
  sent: Record<string, string>;
  /** Lembretes dados como resolvidos (ex.: acompanhamento feito por conversa). */
  resolved?: Record<string, string>;
  /** animal id → nome do pet e do tutor. */
  pets: Map<string, { animal: string; client: string }>;
  /** Prazos (dias antes / atrasados até). Os liga/desliga são aplicados por filterByPrefs. */
  prefs?: Pick<NotificationPrefs, "diasAntes" | "atrasadosAte">;
  /** Dias desde o último backup; null = nunca; undefined = não é admin (não mostra). */
  backupDays?: number | null;
  backupReminderDays: number;
}

const normalizeStatus = (value: unknown) => {
  const raw = String(value ?? "scheduled").toLowerCase().trim();
  if (raw === "agendado") return "scheduled";
  if (raw === "em atendimento") return "in_progress";
  if (raw === "atendido") return "attended";
  if (raw === "não atendido" || raw === "nao atendido") return "no_show";
  if (raw === "cancelado") return "cancelled";
  return raw;
};

const scheduleDateTime = (s: ScheduleUI) => {
  const d = new Date(s.date);
  const [h = 0, m = 0] = (s.time || "00:00").split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const formatBR = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

function minutesLabel(minutes: number): string {
  if (minutes <= 1) return "agora";
  if (minutes < 60) return `em ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `em ${h}h` : `em ${h}h${String(m).padStart(2, "0")}`;
}

function reminderWhen(days: number): string {
  if (days < 0) return `atrasado há ${plural(Math.abs(days), "dia", "dias")}`;
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ${days} dias`;
}

export function buildNotifications(input: NotificationInput): AppNotification[] {
  const { now } = input;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const out: AppNotification[] = [];

  // Agora: próximas 2h e horários de hoje que passaram sem conclusão.
  const active = input.schedules
    .filter((s) => ["scheduled", "in_progress"].includes(normalizeStatus(s.status)))
    .map((s) => ({ s, at: scheduleDateTime(s) }))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  for (const { s, at } of active) {
    const diffMin = Math.round((at.getTime() - now.getTime()) / 60_000);
    const who = [s.animalName, s.clientName].filter(Boolean).join(" · ") || "Sem paciente informado";
    const title = `${s.time} — ${s.title || "Atendimento"}`;
    if (diffMin >= 0 && diffMin <= 120) {
      out.push({
        id: `agenda:${s.id}:${s.time}`,
        section: "agora",
        kind: "agenda",
        tone: "sky",
        title,
        detail: who,
        when: minutesLabel(diffMin),
        href: "/agenda",
      });
    } else if (at >= startOfToday && diffMin < -15) {
      out.push({
        id: `pendente:${s.id}`,
        section: "agora",
        kind: "pendente",
        tone: "amber",
        title,
        detail: `Sem conclusão · ${who}`,
        when: "marque na agenda",
        href: "/agenda",
      });
    }
  }

  // Lembretes: dos próximos dias e atrasados recentes, ainda não avisados nem resolvidos.
  const ahead = input.prefs?.diasAntes ?? DEFAULT_NOTIFICATION_PREFS.diasAntes;
  const overdue = input.prefs?.atrasadosAte ?? DEFAULT_NOTIFICATION_PREFS.atrasadosAte;
  const reminders = input.reminders
    .filter((r) => r.daysUntil <= ahead && r.daysUntil >= -overdue && !input.sent[r.key] && !input.resolved?.[r.key])
    // Mais perto da data primeiro (hoje, amanhã, atrasado há 2 dias...), o antigo por último.
    .sort((a, b) => Math.abs(a.daysUntil) - Math.abs(b.daysUntil) || a.daysUntil - b.daysUntil);
  for (const r of reminders) {
    const pet = input.pets.get(r.animalId);
    const animal = pet?.animal || "Pet";
    out.push({
      id: `lembrete:${r.key}`,
      section: "lembretes",
      kind: r.kind,
      tone: r.daysUntil <= 0 ? "rose" : "amber",
      title: r.kind === "vacina" ? `${r.vaccine || "Vacina"} — ${animal}` : `Acompanhamento — ${animal}`,
      detail: [pet?.client, `previsto para ${formatBR(r.dueDate)}`].filter(Boolean).join(" · "),
      when: reminderWhen(r.daysUntil),
      href: "/clinical/returns-forecast",
      reminder: r,
    });
  }

  // Backup (só admin). O id muda por semana: lido volta a lembrar na semana seguinte.
  if (input.backupDays !== undefined && (input.backupDays === null || input.backupDays > input.backupReminderDays)) {
    const weekKey = Math.floor(now.getTime() / (7 * 86_400_000));
    out.push({
      id: `backup:${weekKey}`,
      section: "sistema",
      kind: "backup",
      tone: "violet",
      title: "Backup dos dados atrasado",
      detail:
        input.backupDays === null
          ? "Nenhum backup feito neste computador ainda."
          : `Último backup há ${plural(input.backupDays, "dia", "dias")}.`,
      when: "fazer agora",
      href: "/settings/backup",
    });
  }
  return out;
}

// ------------------------------------------------------------ lidos
const READ_KEY = "vf:notif:read";
const LEGACY_KEY = "vf_notifications_dismissed";
const KEEP_MS = 60 * 86_400_000;

/** Ids lidos (id → quando). Guardado no aparelho. */
export function loadReadMap(): Record<string, number> {
  try {
    localStorage.removeItem(LEGACY_KEY);
    return JSON.parse(localStorage.getItem(READ_KEY) || "{}");
  } catch {
    return {};
  }
}

/** Salva, jogando fora o que já saiu da lista há mais de 60 dias. */
export function saveReadMap(map: Record<string, number>, currentIds: string[], now = Date.now()): Record<string, number> {
  const current = new Set(currentIds);
  const pruned: Record<string, number> = {};
  for (const [id, at] of Object.entries(map)) if (current.has(id) || now - at < KEEP_MS) pruned[id] = at;
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(pruned));
  } catch {
    /* modo privado */
  }
  return pruned;
}
