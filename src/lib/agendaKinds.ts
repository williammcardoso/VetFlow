// Tipo de atendimento do agendamento (agenda pública e agenda interna).
// O tipo define a duração mínima — consulta trava 1h sozinha, sem depender de
// quem está no balcão lembrar de marcar "horário mais longo".

export type BookingKind = "consulta" | "vacina" | "medicacao" | "outro" | "bloqueio";
export type BookingPlace = "loja" | "domicilio";

/** Detalhes escolhidos no formulário — vai para `schedules.kind_info`. */
export interface BookingKindInfo {
  place?: BookingPlace;
  vaccines?: string[];
  /** Vacina fora da lista ("Outra"). */
  vaccineOther?: string;
  medication?: string;
  other?: string;
  /** Observação livre (telefone, 2 animais, valor combinado...). */
  obs?: string;
}

export const BOOKING_KINDS: BookingKind[] = ["consulta", "vacina", "medicacao", "outro", "bloqueio"];

export const KIND_LABEL: Record<BookingKind, string> = {
  consulta: "Consulta",
  vacina: "Vacina",
  medicacao: "Medicação",
  outro: "Outros",
  bloqueio: "Bloquear horário",
};

/** Duração mínima de cada tipo, em minutos. */
export const KIND_MIN_MINUTES: Record<BookingKind, number> = {
  consulta: 60,
  vacina: 30,
  medicacao: 30,
  outro: 30,
  bloqueio: 30,
};

export const PLACE_LABEL: Record<BookingPlace, string> = {
  loja: "Na loja",
  domicilio: "Domiciliar",
};

/** Lista inicial — a lista de verdade fica em Configuração › Horários da agenda pública. */
export const DEFAULT_VACCINE_OPTIONS = [
  "V10 importada",
  "V12 nacional",
  "Raiva importada",
  "Raiva nacional",
  "V4 felina",
  "V5 felina",
];

export const kindNeedsPlace = (kind: BookingKind | null | undefined): boolean => kind === "consulta" || kind === "vacina";

export function isBookingKind(value: unknown): value is BookingKind {
  return typeof value === "string" && (BOOKING_KINDS as string[]).includes(value);
}

/** Duração mínima respeitando o passo da grade (ex.: grade de 60 min → consulta = 1 horário). */
export function minDurationFor(kind: BookingKind | null | undefined, intervalMinutes: number): number {
  const step = intervalMinutes > 0 ? intervalMinutes : 30;
  const min = kind ? KIND_MIN_MINUTES[kind] : step;
  return Math.max(step, Math.ceil(min / step) * step);
}

const clean = (s?: string) => (s ?? "").trim();

/** Vacinas escolhidas, com a "Outra" especificada no fim. */
export function vaccineList(info: BookingKindInfo): string[] {
  const list = (info.vaccines ?? []).map(clean).filter(Boolean);
  const other = clean(info.vaccineOther);
  return other ? [...list, other] : list;
}

/** O que falta preencher (null = pode gravar). */
export function validateBooking(kind: BookingKind | null, info: BookingKindInfo): string | null {
  if (!kind) return "Escolha o tipo de atendimento.";
  if (kindNeedsPlace(kind) && !info.place) return kind === "consulta" ? "Consulta na loja ou domiciliar?" : "Vacina na loja ou domiciliar?";
  if (kind === "vacina" && vaccineList(info).length === 0) return "Escolha a vacina (ou especifique em Outra).";
  if (kind === "medicacao" && !clean(info.medication)) return "Especifique a medicação.";
  if (kind === "outro" && !clean(info.other)) return "Especifique o atendimento.";
  return null;
}

/**
 * Texto do agendamento (coluna `title`): é o que aparece na agenda, no
 * prontuário e no lembrete por WhatsApp — por isso a observação não entra.
 */
export function composeBookingTitle(kind: BookingKind, info: BookingKindInfo): string {
  const place = info.place === "domicilio" ? "domiciliar" : "na loja";
  switch (kind) {
    case "consulta":
      return `Consulta ${place}`;
    case "vacina": {
      const list = vaccineList(info);
      return list.length ? `Vacina ${place} — ${list.join(" + ")}` : `Vacina ${place}`;
    }
    case "medicacao":
      return clean(info.medication) ? `Medicação — ${clean(info.medication)}` : "Medicação";
    case "outro":
      return clean(info.other) || "Outros";
    case "bloqueio":
      return "Horário bloqueado";
  }
}

/** Só os campos que valem para o tipo (troca de tipo não deixa lixo do anterior). */
export function pruneKindInfo(kind: BookingKind, info: BookingKindInfo): BookingKindInfo {
  const out: BookingKindInfo = {};
  if (kindNeedsPlace(kind) && info.place) out.place = info.place;
  if (kind === "vacina") {
    const vaccines = (info.vaccines ?? []).map(clean).filter(Boolean);
    if (vaccines.length) out.vaccines = vaccines;
    if (clean(info.vaccineOther)) out.vaccineOther = clean(info.vaccineOther);
  }
  if (kind === "medicacao" && clean(info.medication)) out.medication = clean(info.medication);
  if (kind === "outro" && clean(info.other)) out.other = clean(info.other);
  if (clean(info.obs)) out.obs = clean(info.obs);
  return out;
}

/** Lê o `kind_info` gravado (jsonb) sem confiar no formato. */
export function parseKindInfo(raw: unknown): BookingKindInfo {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const place = r.place === "loja" || r.place === "domicilio" ? r.place : undefined;
  const vaccines = Array.isArray(r.vaccines) ? r.vaccines.filter((v): v is string => typeof v === "string" && !!v.trim()) : undefined;
  return {
    place,
    vaccines: vaccines?.length ? vaccines : undefined,
    vaccineOther: str(r.vaccineOther),
    medication: str(r.medication),
    other: str(r.other),
    obs: str(r.obs),
  };
}

const toMin = (t: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const toHHMM = (total: number) => `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

/** Horário de término quando o agendamento passa de meia hora (senão null). */
export function scheduleEndTime(time: string, durationMinutes?: number | null): string | null {
  const start = toMin(time);
  if (start === null || !durationMinutes || durationMinutes <= 30) return null;
  return toHHMM(start + durationMinutes);
}

/** "15:00–16:00" quando o agendamento tem duração maior que meia hora; senão só "15:00". */
export function formatScheduleTimeRange(time: string, durationMinutes?: number | null): string {
  const end = scheduleEndTime(time, durationMinutes);
  return end ? `${time}–${end}` : time;
}
