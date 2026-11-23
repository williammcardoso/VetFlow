// Agenda particular (página /agenda-particular, migration 20261123160000):
// lembretes pessoais pelo Pushover. Aqui só a parte "pura" — leitura dos dados
// do banco, rótulos de repetição, prévia dos próximos avisos e sons.
import { relativeDay, whenPhrase } from "@/lib/agendaLog";

export interface PrivateReminder {
  id: number;
  texto: string;
  detalhes: string | null;
  /** Nulo = uma vez só. */
  aCadaDias: number | null;
  hora: string;
  /** Próximo aviso, horário de Brasília: "AAAA-MM-DDTHH:MM". */
  proximo: string;
  ultimo: string | null;
  ativo: boolean;
  /** 0 normal | 1 alta | 2 insiste até confirmar */
  prioridade: number;
  som: string | null;
}

export interface PrivateConfig {
  /** Só os 4 últimos caracteres do token da pasta PARTICULARES (nulo = sem pasta própria). */
  tokenParticular: string | null;
  pushoverOk: boolean;
  aparelhosParticular: string | null;
  aparelhosVetflow: string | null;
  horaPadrao: string;
  somPadrao: string | null;
}

export interface PrivateData {
  dono: string;
  config: PrivateConfig;
  lembretes: PrivateReminder[];
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export function parsePrivateData(raw: unknown): PrivateData {
  const r = (raw ?? {}) as Record<string, unknown>;
  const c = (r.config ?? {}) as Record<string, unknown>;
  const list = Array.isArray(r.lembretes) ? (r.lembretes as Record<string, unknown>[]) : [];
  return {
    dono: str(r.dono) ?? "",
    config: {
      tokenParticular: str(c.token_particular),
      pushoverOk: c.pushover_ok === true,
      aparelhosParticular: str(c.aparelhos_particular),
      aparelhosVetflow: str(c.aparelhos_vetflow),
      horaPadrao: str(c.hora_padrao) ?? "08:00",
      somPadrao: str(c.som_padrao),
    },
    lembretes: list.map((l) => {
      const dias = l.a_cada_dias === null || l.a_cada_dias === undefined ? null : Number(l.a_cada_dias);
      return {
        id: Number(l.id),
        texto: str(l.texto) ?? "",
        detalhes: str(l.detalhes),
        aCadaDias: dias && dias >= 1 ? dias : null,
        hora: str(l.hora) ?? "08:00",
        proximo: str(l.proximo) ?? "",
        ultimo: str(l.ultimo),
        ativo: l.ativo === true,
        prioridade: Number.isFinite(Number(l.prioridade)) ? Number(l.prioridade) : 1,
        som: str(l.som),
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Repetição
// ---------------------------------------------------------------------------
export type RepeatMode = "uma" | "dia" | "semana" | "cada";

export const REPEAT_LABEL: Record<RepeatMode, string> = {
  uma: "Uma vez só",
  dia: "Todo dia",
  semana: "Toda semana",
  cada: "A cada…",
};

export function repeatModeOf(dias: number | null): RepeatMode {
  if (!dias) return "uma";
  if (dias === 1) return "dia";
  if (dias === 7) return "semana";
  return "cada";
}

export function diasOf(mode: RepeatMode, every: number): number | null {
  if (mode === "uma") return null;
  if (mode === "dia") return 1;
  if (mode === "semana") return 7;
  return Math.max(1, Math.round(every) || 1);
}

const WEEKDAY_FULL = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const splitWhen = (proximo: string) => {
  const [date = "", time = ""] = proximo.split("T");
  return { date, time };
};

const weekdayOf = (dateISO: string) => {
  const [y, m, d] = dateISO.split("-").map(Number);
  return WEEKDAY_FULL[new Date(y, (m || 1) - 1, d || 1).getDay()];
};

/** "A cada 3 dias às 08:00", "Toda semana (quinta) às 08:00", "Uma vez só". */
export function ruleLabel(dias: number | null, hora: string, proximo?: string): string {
  if (!dias) return "Uma vez só";
  if (dias === 1) return `Todo dia às ${hora}`;
  if (dias === 7) {
    const date = proximo ? splitWhen(proximo).date : "";
    if (!date) return `Toda semana às ${hora}`;
    const day = weekdayOf(date);
    // "Todo domingo/sábado", "Toda segunda...sexta"
    return `${day === "domingo" || day === "sábado" ? "Todo" : "Toda"} ${day} às ${hora}`;
  }
  return `A cada ${dias} dias às ${hora}`;
}

/** "hoje às 08:00", "qui 26/11 às 08:00". */
export function nextLabel(proximo: string, todayISO: string): string {
  const { date, time } = splitWhen(proximo);
  return whenPhrase({ date, time }, todayISO);
}

/** Já passou (em horário de Brasília) — o aviso sai na próxima volta do relógio (até 5 min). */
export function isDue(proximo: string, nowLocal: Date = new Date()): boolean {
  const { date, time } = splitWhen(proximo);
  if (!date || !time) return false;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime() <= nowLocal.getTime();
}

const addDaysISO = (dateISO: string, days: number) => {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

/** Os próximos dias de aviso a partir do primeiro (para a prévia do formulário). */
export function upcomingDays(firstISO: string, dias: number | null, count = 3): string[] {
  if (!firstISO) return [];
  if (!dias) return [firstISO];
  return Array.from({ length: count }, (_, i) => addDaysISO(firstISO, i * dias));
}

/** Prévia em texto: "hoje, sex 26/11 e seg 29/11 às 08:00". */
export function upcomingLabel(firstISO: string, hora: string, dias: number | null, todayISO: string): string {
  const days = upcomingDays(firstISO, dias).map((d) => relativeDay(d, todayISO));
  if (days.length === 0) return "";
  const list = days.length === 1 ? days[0] : `${days.slice(0, -1).join(", ")} e ${days[days.length - 1]}`;
  return `${list} às ${hora}${dias ? "…" : ""}`;
}

// ---------------------------------------------------------------------------
// Sons do Pushover (https://pushover.net/api#sounds)
// ---------------------------------------------------------------------------
export const PUSHOVER_SOUNDS: { value: string; label: string }[] = [
  { value: "pushover", label: "Pushover (padrão)" },
  { value: "bugle", label: "Corneta" },
  { value: "cashregister", label: "Caixa registradora" },
  { value: "magic", label: "Mágica" },
  { value: "cosmic", label: "Cósmico" },
  { value: "classical", label: "Clássico" },
  { value: "pianobar", label: "Piano bar" },
  { value: "incoming", label: "Chegando" },
  { value: "intermission", label: "Intervalo" },
  { value: "gamelan", label: "Gamelão" },
  { value: "bike", label: "Campainha de bicicleta" },
  { value: "falling", label: "Queda" },
  { value: "mechanical", label: "Mecânico" },
  { value: "tugboat", label: "Rebocador" },
  { value: "spacealarm", label: "Alarme espacial" },
  { value: "siren", label: "Sirene" },
  { value: "alien", label: "Alarme alienígena (longo)" },
  { value: "climb", label: "Subida (longo)" },
  { value: "persistent", label: "Persistente (longo)" },
  { value: "echo", label: "Eco (longo)" },
  { value: "updown", label: "Sobe e desce (longo)" },
  { value: "vibrate", label: "Só vibrar" },
  { value: "none", label: "Silencioso" },
];

export const soundLabel = (value: string | null | undefined) =>
  PUSHOVER_SOUNDS.find((s) => s.value === value)?.label ?? value ?? "";

/** "iphone-a, iphone-b" ↔ lista (nomes de aparelho do Pushover). */
export const splitDevices = (s: string | null | undefined): string[] =>
  (s ?? "").split(",").map((d) => d.trim()).filter(Boolean);
export const joinDevices = (list: string[]): string => list.map((d) => d.trim()).filter(Boolean).join(",");
