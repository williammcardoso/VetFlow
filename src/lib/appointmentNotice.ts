import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { vaccineList, type BookingKind, type BookingKindInfo } from "@/lib/agendaKinds";
import type { ScheduleStatus } from "@/lib/schedulesApi";

// Aviso de agendamento pelo WhatsApp (botão ao lado de editar/excluir na
// Agenda): o texto muda conforme o serviço — vacina leva a lista de vacinas e
// lembra da carteirinha, domiciliar não manda o endereço da clínica, etc.
// A observação interna do agendamento (valor combinado, "2 animais"...) não
// entra: é anotação do balcão, não recado para o tutor.

export interface AppointmentNoticeInput {
  kind?: BookingKind | null;
  kindInfo?: BookingKindInfo | null;
  /** Texto do agendamento — usado nos agendamentos antigos, sem tipo. */
  title: string;
  clientName?: string;
  animalName?: string;
  /** "Macho" / "Fêmea" do cadastro — escolhe "do Thor" / "da Mel". */
  animalGender?: string;
  date: Date;
  time: string;
  status?: ScheduleStatus;
  clinicName?: string;
  /** Endereço da clínica (só entra quando o atendimento é na clínica). */
  clinicAddress?: string;
  /** Referência para "hoje"/"amanhã" (testes). */
  now?: Date;
}

const clean = (s?: string | null) => (s ?? "").trim();

const firstName = (name?: string) => clean(name).split(/\s+/)[0] || "";

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** "do Thor" / "da Mel" / "do(a) Pipoca" — sem nome, "do seu pet". */
export function petRef(animalName?: string, gender?: string): string {
  const name = clean(animalName);
  if (!name) return "do seu pet";
  const g = clean(gender).toLowerCase();
  if (g.startsWith("f")) return `da *${name}*`;
  if (g.startsWith("m")) return `do *${name}*`;
  return `do(a) *${name}*`;
}

/** "*Hoje* (31/10)", "*Amanhã*, sábado (01/11)", "*Segunda-feira, 03/11*". */
export function noticeDateLabel(date: Date, now: Date = new Date()): string {
  const dm = format(date, "dd/MM");
  const weekday = format(date, "EEEE", { locale: ptBR });
  const diff = differenceInCalendarDays(date, now);
  if (diff === 0) return `*Hoje* (${dm})`;
  if (diff === 1) return `*Amanhã*, ${weekday} (${dm})`;
  const sameYear = date.getFullYear() === now.getFullYear();
  return `*${capitalize(weekday)}, ${sameYear ? dm : format(date, "dd/MM/yyyy")}*`;
}

interface ServiceText {
  emoji: string;
  /** Nome do serviço no título da mensagem. */
  name: string;
  /** Linha com o detalhe (vacinas, medicação...). */
  detail?: string;
  /** Onde: clínica, domicílio ou nada (tipo sem local definido). */
  place?: "loja" | "domicilio";
  tips: string[];
}

const TIP_HEALTHY =
  "O pet precisa estar bem de saúde no dia (sem febre, vômito ou diarreia). Se não estiver, avise que a gente remarca.";
const TIP_CARD = "Traga a carteirinha de vacinação.";
const TIP_TRANSPORT = "Gatos e cães pequenos de preferência na caixa de transporte; cães maiores, na guia.";
const TIP_HOME_ROOM = "Um pouco antes do horário, deixe o pet num cômodo fechado — facilita o atendimento.";
const TIP_RECORDS = "Se tiver exames ou receitas anteriores, separe para mostrar (pode mandar foto por aqui).";

function serviceText(input: AppointmentNoticeInput): ServiceText {
  const info = input.kindInfo ?? {};
  const home = info.place === "domicilio";
  const place = info.place;
  switch (input.kind) {
    case "consulta":
      return {
        emoji: home ? "🏠" : "🩺",
        name: home ? "Consulta domiciliar" : "Consulta veterinária",
        place: place ?? "loja",
        tips: home ? [TIP_HOME_ROOM, TIP_RECORDS] : [TIP_RECORDS, TIP_TRANSPORT],
      };
    case "vacina": {
      const list = vaccineList(info);
      return {
        emoji: "💉",
        name: home ? "Vacinação domiciliar" : "Vacinação",
        detail: list.length ? `💉 ${list.length > 1 ? "Vacinas" : "Vacina"}: *${list.join(" + ")}*` : undefined,
        place: place ?? "loja",
        tips: home ? [TIP_CARD, TIP_HEALTHY, TIP_HOME_ROOM] : [TIP_CARD, TIP_HEALTHY, TIP_TRANSPORT],
      };
    }
    case "medicacao":
      return {
        emoji: "💊",
        name: "Aplicação de medicação",
        detail: clean(info.medication) ? `💊 Medicação: *${clean(info.medication)}*` : undefined,
        tips: ["Se o medicamento é seu, traga junto com a receita."],
      };
    case "outro":
      return { emoji: "📋", name: clean(info.other) || clean(input.title) || "Atendimento", tips: [] };
    default:
      return { emoji: "🐾", name: clean(input.title) || "Atendimento", tips: [] };
  }
}

/** Mensagem pronta para o WhatsApp (negrito com *...*, uma informação por linha). */
export function buildAppointmentNotice(input: AppointmentNoticeInput): string {
  const now = input.now ?? new Date();
  const s = serviceText(input);
  const who = firstName(input.clientName);
  const hello = who ? `Olá, ${who}! Tudo bem? 😊` : "Olá! Tudo bem? 😊";
  const pet = petRef(input.animalName, input.animalGender);
  const when = `📅 ${noticeDateLabel(input.date, now)}, às *${clean(input.time)}*`;
  const clinic = clean(input.clinicName);
  const lines: string[] = [];

  const service = `${s.emoji} ${s.name}`;

  if (input.status === "cancelled") {
    lines.push(
      "❌ *Agendamento cancelado*",
      "",
      hello,
      `O agendamento ${pet} foi *cancelado*:`,
      "",
      service,
      when,
      "",
      "Quer marcar outro dia? É só responder esta mensagem que a gente acha um horário. 💬"
    );
  } else if (input.status === "no_show") {
    lines.push(
      `${s.emoji} *${s.name}*`,
      "",
      hello,
      `Sentimos a falta ${pet} no atendimento:`,
      "",
      when,
      "",
      "Quer remarcar? É só responder esta mensagem que a gente acha um novo horário. 💬"
    );
  } else {
    const today = differenceInCalendarDays(input.date, now) === 0;
    lines.push(
      `${s.emoji} *${s.name}${today ? " — hoje" : ""}*`,
      "",
      hello,
      today ? `Passando para lembrar do atendimento ${pet}:` : `Passando para confirmar o agendamento ${pet}:`,
      "",
      when
    );
    if (s.detail) lines.push(s.detail);
    if (s.place === "domicilio") lines.push("🏠 Atendimento no seu endereço");
    else if (s.place === "loja") {
      const address = clean(input.clinicAddress);
      lines.push(address ? `📍 Na clínica: ${address}` : "📍 Na clínica");
    }
    if (s.tips.length) {
      lines.push("", "*Para o atendimento:*", ...s.tips.map((t) => `• ${t}`));
    }
    lines.push("", "Pode confirmar respondendo esta mensagem? 👍", "Se precisar remarcar, é só avisar.");
  }

  if (clinic) lines.push("", `*${clinic}*`);
  return lines.join("\n");
}

/**
 * Telefone escrito no texto (observação do agendamento da agenda pública, que
 * não tem cliente cadastrado): "(19) 99363-1981", "19 993631981", "+55 19…".
 */
export function phoneFromText(text?: string | null): string | undefined {
  const re = /(?:\+?55[\s.-]*)?\(?\d{2}\)?[\s.-]*9?[\s.-]*\d{4}[\s.-]*\d{4}/g;
  for (const match of clean(text).match(re) ?? []) {
    const digits = match.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 13) return match.trim();
  }
  return undefined;
}

/** "Rua Campos Salles, 175, Centro — Itapira" (sem repetir a cidade). */
export function clinicAddressLine(address?: string, city?: string): string {
  const a = clean(address);
  const c = clean(city);
  if (!a) return c;
  if (!c || a.toLowerCase().includes(c.toLowerCase())) return a;
  return `${a} — ${c}`;
}
