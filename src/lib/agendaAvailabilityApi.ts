import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

/** Um intervalo aberto num dia, ex.: {start:"08:00", end:"13:00"}. */
export interface HourBlock {
  start: string;
  end: string;
}

/** Horário-padrão de um dia da semana (0=domingo..6=sábado). */
export interface WeeklyDayHours {
  weekday: number;
  isOpen: boolean;
  blocks: HourBlock[];
}

/** Exceção pontual — fecha ou muda o horário de uma data específica. */
export interface AgendaException {
  id: string;
  date: string; // yyyy-MM-dd
  isClosed: boolean;
  blocks: HourBlock[]; // só relevante quando isClosed = false
  reason?: string;
}

export interface AgendaSettings {
  intervalMinutes: number;
}

// --- Valores usados até aqui, fixos no código de BookSchedulePage.tsx ---
// servem de fallback caso a migration (20260901120000_agenda_availability_config.sql)
// ainda não tenha sido aplicada no banco, pra a página pública nunca quebrar.
export const LEGACY_WEEKLY_HOURS: WeeklyDayHours[] = [
  { weekday: 0, isOpen: false, blocks: [] },
  { weekday: 1, isOpen: true, blocks: [{ start: "08:00", end: "13:00" }, { start: "15:00", end: "18:00" }] },
  { weekday: 2, isOpen: true, blocks: [{ start: "08:00", end: "13:00" }, { start: "15:00", end: "18:00" }] },
  { weekday: 3, isOpen: true, blocks: [{ start: "08:00", end: "13:00" }, { start: "15:00", end: "18:00" }] },
  { weekday: 4, isOpen: true, blocks: [{ start: "08:00", end: "13:00" }, { start: "15:00", end: "18:00" }] },
  { weekday: 5, isOpen: true, blocks: [{ start: "08:00", end: "13:00" }, { start: "15:00", end: "18:00" }] },
  { weekday: 6, isOpen: true, blocks: [{ start: "08:00", end: "12:00" }] },
];
export const LEGACY_INTERVAL_MINUTES = 60;

const WEEKLY_TABLE = "agenda_weekly_hours";
const EXCEPTIONS_TABLE = "agenda_exceptions";
const SETTINGS_TABLE = "agenda_settings";

function rowToWeeklyDay(r: Record<string, unknown>): WeeklyDayHours {
  return {
    weekday: Number(r.weekday),
    isOpen: !!r.is_open,
    blocks: Array.isArray(r.blocks) ? (r.blocks as HourBlock[]) : [],
  };
}

function rowToException(r: Record<string, unknown>): AgendaException {
  return {
    id: r.id as string,
    date: r.date as string,
    isClosed: !!r.is_closed,
    blocks: Array.isArray(r.blocks) ? (r.blocks as HourBlock[]) : [],
    reason: (r.reason as string) || undefined,
  };
}

/** Busca as 7 linhas do horário-padrão. Lança erro se a tabela ainda não existir (migration não aplicada) — quem chama decide o fallback. */
export async function getWeeklyHours(): Promise<WeeklyDayHours[]> {
  if (!isSupabaseConfigured) throw new Error("Supabase não está configurado.");
  const { data, error } = await supabase.from(WEEKLY_TABLE).select("*").order("weekday", { ascending: true });
  if (error) throw new Error(`Falha ao carregar horário-padrão: ${error.message}`);
  return (data || []).map((r) => rowToWeeklyDay(r as Record<string, unknown>));
}

export async function saveWeeklyDay(day: WeeklyDayHours): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Supabase não está configurado.");
  const { error } = await supabase
    .from(WEEKLY_TABLE)
    .upsert({ weekday: day.weekday, is_open: day.isOpen, blocks: day.blocks, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Falha ao salvar horário de ${WEEKDAY_NAMES[day.weekday]}: ${error.message}`);
}

export const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export async function listExceptions(): Promise<AgendaException[]> {
  if (!isSupabaseConfigured) throw new Error("Supabase não está configurado.");
  const { data, error } = await supabase.from(EXCEPTIONS_TABLE).select("*").order("date", { ascending: true });
  if (error) throw new Error(`Falha ao carregar exceções: ${error.message}`);
  return (data || []).map((r) => rowToException(r as Record<string, unknown>));
}

export async function createException(entry: Omit<AgendaException, "id">): Promise<AgendaException> {
  if (!isSupabaseConfigured) throw new Error("Supabase não está configurado.");
  const { data, error } = await supabase
    .from(EXCEPTIONS_TABLE)
    .insert({
      date: entry.date,
      is_closed: entry.isClosed,
      blocks: entry.isClosed ? [] : entry.blocks,
      reason: entry.reason || null,
    })
    .select()
    .single();
  if (error) throw new Error(`Falha ao criar exceção: ${error.message}`);
  return rowToException(data as Record<string, unknown>);
}

export async function updateException(id: string, entry: Omit<AgendaException, "id">): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Supabase não está configurado.");
  const { error } = await supabase
    .from(EXCEPTIONS_TABLE)
    .update({
      date: entry.date,
      is_closed: entry.isClosed,
      blocks: entry.isClosed ? [] : entry.blocks,
      reason: entry.reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(`Falha ao atualizar exceção: ${error.message}`);
}

export async function deleteException(id: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Supabase não está configurado.");
  const { error } = await supabase.from(EXCEPTIONS_TABLE).delete().eq("id", id);
  if (error) throw new Error(`Falha ao excluir exceção: ${error.message}`);
}

export async function getAgendaSettings(): Promise<AgendaSettings> {
  if (!isSupabaseConfigured) throw new Error("Supabase não está configurado.");
  const { data, error } = await supabase.from(SETTINGS_TABLE).select("interval_minutes").eq("id", "default").maybeSingle();
  if (error) throw new Error(`Falha ao carregar configuração da agenda: ${error.message}`);
  return { intervalMinutes: (data?.interval_minutes as number) || LEGACY_INTERVAL_MINUTES };
}

export async function saveAgendaSettings(settings: AgendaSettings): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Supabase não está configurado.");
  const { error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert({ id: "default", interval_minutes: settings.intervalMinutes, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Falha ao salvar configuração da agenda: ${error.message}`);
}

// --- Cálculo de horários abertos — puro, sem dependência de banco, usado
// tanto pela página pública (agendar-horario) quanto pela prévia da tela de
// admin. Resolve exceção da data específica primeiro; sem exceção, cai no
// horário-padrão do dia da semana. ---

function toMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function minutesToTime(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function resolveDayBlocks(dateISO: string, weekly: WeeklyDayHours[], exceptions: AgendaException[]): HourBlock[] {
  const exception = exceptions.find((e) => e.date === dateISO);
  if (exception) {
    return exception.isClosed ? [] : exception.blocks;
  }
  const dayOfWeek = new Date(`${dateISO}T12:00:00`).getDay();
  const day = weekly.find((w) => w.weekday === dayOfWeek);
  if (!day || !day.isOpen) return [];
  return day.blocks;
}

/** Todos os horários agendáveis de uma data, no passo de `intervalMinutes` — o que alimenta a grade e o campo de horário. */
export function generateSlotsForDay(
  dateISO: string,
  weekly: WeeklyDayHours[],
  exceptions: AgendaException[],
  intervalMinutes: number
): string[] {
  const blocks = resolveDayBlocks(dateISO, weekly, exceptions);
  const slots: string[] = [];
  const step = intervalMinutes > 0 ? intervalMinutes : LEGACY_INTERVAL_MINUTES;
  for (const block of blocks) {
    const start = toMinutes(block.start);
    const end = toMinutes(block.end);
    if (start === null || end === null || end <= start) continue;
    for (let t = start; t < end; t += step) slots.push(minutesToTime(t));
  }
  return slots;
}

/** Se um horário (em minutos) cai dentro de algum bloco aberto daquela data — usado pra validar o formulário mesmo se o horário não bater exatamente num múltiplo do intervalo. */
export function isMinutesOpen(
  dateISO: string,
  minutes: number,
  weekly: WeeklyDayHours[],
  exceptions: AgendaException[]
): boolean {
  const blocks = resolveDayBlocks(dateISO, weekly, exceptions);
  return blocks.some((b) => {
    const s = toMinutes(b.start);
    const e = toMinutes(b.end);
    return s !== null && e !== null && minutes >= s && minutes < e;
  });
}
