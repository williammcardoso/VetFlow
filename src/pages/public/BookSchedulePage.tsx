import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CornerDownRight,
  Loader2,
  Lock,
  Monitor,
  PawPrint,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  cancelPublicBooking,
  createSchedule,
  listScheduleTimesInRange,
  updatePublicBooking,
  type ScheduleTimeSummary,
} from "@/lib/schedulesApi";
import { getCompanySettings } from "@/lib/settingsApi";
import { cn, generateUUID, getTodayLocalISO } from "@/lib/utils";
import { useAgendaAvailability } from "@/hooks/useAgendaAvailability";
import { generateSlotsForDay, getVaccineOptions } from "@/lib/agendaAvailabilityApi";
import { bookSlot, listHoldsInRange, subscribeAgendaChanges, type HoldConflict, type ScheduleHold } from "@/lib/agendaHoldsApi";
import { buildCellMap, freeRunLength, minutesToHHMM, rangeCells, toMinutes } from "@/lib/agendaOccupancy";
import {
  DEFAULT_VACCINE_OPTIONS,
  KIND_LABEL,
  composeBookingTitle,
  formatScheduleTimeRange,
  minDurationFor,
  pruneKindInfo,
  validateBooking,
  type BookingKind,
  type BookingKindInfo,
} from "@/lib/agendaKinds";
import { BookingKindFields } from "@/components/agenda/BookingKindFields";
import { KIND_VISUAL, KindBadge } from "@/components/agenda/bookingKindVisual";
import { useBookingHold, type HeldCells } from "@/hooks/useBookingHold";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Navegador não tem como ler o nome real do computador (Windows não expõe
// isso pra página nenhuma) — em vez disso, cada aparelho "se apresenta" uma
// vez (ex.: "Balcão 1") e o navegador lembra sozinho depois, via
// localStorage. Vai junto nas observações de cada agendamento criado dali e
// aparece para os outros computadores quando este segura um horário.
const STATION_NAME_STORAGE_KEY = "vetflow:agendar-horario:nomeComputador";

function readStationName(): string {
  try {
    return localStorage.getItem(STATION_NAME_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function writeStationName(name: string): void {
  try {
    localStorage.setItem(STATION_NAME_STORAGE_KEY, name);
  } catch {
    // localStorage bloqueado (aba anônima, configuração do navegador) —
    // sem persistência nesse caso, mas não quebra a página.
  }
}

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDayHeader(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const dayLabel = (dateISO: string) => {
  const d = new Date(`${dateISO}T12:00:00`);
  return `${WEEKDAY_LABELS[d.getDay()]} ${formatDayHeader(d)}`;
};

const fmtDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
};

const firstName = (name?: string) => (name || "").trim().split(/\s+/)[0] || "";

type Notice = { tone: "amber" | "red" | "slate"; title: string; text?: string };

const NOTICE_STYLE: Record<Notice["tone"], string> = {
  amber: "border-amber-300 bg-amber-50 text-amber-900",
  red: "border-red-200 bg-red-50 text-red-900",
  slate: "border-slate-200 bg-slate-50 text-slate-800",
};

// Página pública (sem login) — o link vai pro balcão da agropecuária, pra
// eles reservarem horário direto na agenda do veterinário sem precisar ligar.
//
// Como evita dois computadores no mesmo horário:
// - Clicou num horário, ele fica "Em reserva" para os outros (trava no banco,
//   agenda_hold) — consulta trava os 2 horários assim que escolhe o tipo.
// - A grade de todos atualiza na hora (Realtime) e, por garantia, a cada 10 s.
// - Ao gravar, o banco confere de novo (agenda_book) na mesma transação.
// - A trava solta ao gravar, cancelar, fechar a aba ou com 10 min parada.
// Horário aberto, intervalo e lista de vacinas vêm de Configuração › Horários
// da agenda pública.
const BookSchedulePage: React.FC = () => {
  // Identidade desta aba nas travas (useState: não muda nem com recarga a quente).
  const [sessionId] = React.useState(() => generateUUID());
  const [companyName, setCompanyName] = React.useState("");

  // Nome do computador/balcão (só nesse navegador — ver STATION_NAME_STORAGE_KEY).
  const [stationName, setStationName] = React.useState<string>(() => readStationName());
  const [stationDialogOpen, setStationDialogOpen] = React.useState(false);
  const [stationNameInput, setStationNameInput] = React.useState("");
  const [gateInput, setGateInput] = React.useState("");

  const saveStation = (raw: string) => {
    const trimmed = raw.trim();
    writeStationName(trimmed);
    setStationName(trimmed);
  };

  const { weeklyHours, exceptions, settings: availability } = useAgendaAvailability();
  const intervalMinutes = availability.intervalMinutes;
  const getDaySlots = React.useCallback(
    (dateISO: string) => generateSlotsForDay(dateISO, weeklyHours, exceptions, intervalMinutes),
    [weeklyHours, exceptions, intervalMinutes]
  );
  const [vaccineOptions, setVaccineOptions] = React.useState<string[]>(DEFAULT_VACCINE_OPTIONS);

  React.useEffect(() => {
    getCompanySettings()
      .then((s) => setCompanyName(s.companyName || ""))
      .catch(() => setCompanyName(""));
    void getVaccineOptions().then((r) => setVaccineOptions(r.options));
  }, []);

  // Janela de 7 dias "rolando" a partir de hoje (não presa a segunda-feira).
  // `todayISO`/`nowMinutes` são recalculados a cada render — a página
  // re-renderiza sozinha pelas atualizações da grade, então atravessar a
  // virada do dia com a aba aberta não precisa de F5.
  const todayISO = getTodayLocalISO();
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const [dayOffset, setDayOffset] = React.useState(0);
  const weekStart = React.useMemo(() => addDays(new Date(`${todayISO}T12:00:00`), dayOffset), [todayISO, dayOffset]);
  const weekDays = React.useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const startISO = toISODate(weekDays[0]);
  const endISO = toISODate(weekDays[6]);

  const [bookings, setBookings] = React.useState<ScheduleTimeSummary[]>([]);
  const [holds, setHolds] = React.useState<ScheduleHold[]>([]);
  const [loadingWeek, setLoadingWeek] = React.useState(true);
  // Só a PRIMEIRA carga troca a grade por "Carregando..."; depois a grade fica
  // no lugar (esmaecida) enquanto busca, pra página não pular de altura.
  const [everLoaded, setEverLoaded] = React.useState(false);

  const weekKey = `${startISO}|${endISO}`;
  const weekKeyRef = React.useRef(weekKey);
  weekKeyRef.current = weekKey;

  const refreshWeek = React.useCallback(
    async (silent: boolean) => {
      const key = `${startISO}|${endISO}`;
      if (!silent) setLoadingWeek(true);
      try {
        const [rows, holdRows] = await Promise.all([
          listScheduleTimesInRange(startISO, endISO),
          listHoldsInRange(startISO, endISO).catch(() => null),
        ]);
        if (weekKeyRef.current !== key) return;
        setBookings(rows);
        if (holdRows) setHolds(holdRows);
      } catch {
        if (!silent && weekKeyRef.current === key) setBookings([]);
      } finally {
        if (!silent && weekKeyRef.current === key) {
          setLoadingWeek(false);
          setEverLoaded(true);
        }
      }
    },
    [startISO, endISO]
  );
  const refreshRef = React.useRef(refreshWeek);
  refreshRef.current = refreshWeek;

  React.useEffect(() => {
    void refreshWeek(false);
  }, [refreshWeek]);

  // Garantia caso o tempo real caia: atualiza sozinho a cada 10 s, em silêncio.
  React.useEffect(() => {
    const id = window.setInterval(() => void refreshRef.current(true), 10000);
    return () => window.clearInterval(id);
  }, []);

  // Tempo real: qualquer computador reservou, travou ou soltou → atualiza já.
  React.useEffect(() => {
    let timer: number | undefined;
    const unsubscribe = subscribeAgendaChanges(sessionId, () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void refreshRef.current(true), 250);
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [sessionId]);

  // --- Formulário ---
  const [sel, setSel] = React.useState<{ date: string; time: string } | null>(null);
  const [editing, setEditing] = React.useState<ScheduleTimeSummary | null>(null);
  const [clientName, setClientName] = React.useState("");
  const [kind, setKind] = React.useState<BookingKind | null>(null);
  const [info, setInfo] = React.useState<BookingKindInfo>({});
  /** "Até" escolhido; nulo = duração mínima do tipo. */
  const [chosenDuration, setChosenDuration] = React.useState<number | null>(null);
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = React.useState(false);
  const [holdExpired, setHoldExpired] = React.useState(false);
  const clientNameRef = React.useRef<HTMLInputElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  // Conflitos que o banco apontou e a grade ainda não mostrava — evita ficar
  // pedindo o mesmo horário de novo até a próxima atualização.
  const [serverBlocks, setServerBlocks] = React.useState<Map<string, HoldConflict & { until: number }>>(new Map());
  const registerConflicts = (dateISO: string, conflicts: HoldConflict[]) => {
    if (!conflicts.length) return;
    setServerBlocks((prev) => {
      const next = new Map(prev);
      for (const c of conflicts) next.set(`${dateISO}|${c.time}`, { ...c, until: Date.now() + 20000 });
      return next;
    });
  };

  const {
    held,
    supported: holdSupported,
    pending: holdPending,
    request: requestHold,
    release: releaseHold,
    forget: forgetHold,
    touch: touchHold,
    enqueue: enqueueHoldCall,
  } = useBookingHold({
    sessionId,
    station: stationName,
    onExpire: (cells: HeldCells) => {
      setHoldExpired(true);
      setNotice({
        tone: "slate",
        title: `O horário ${cells.times[0]} de ${dayLabel(cells.date)} ficou 10 minutos parado e foi liberado para os outros computadores.`,
        text: "Se continuar preenchendo, o sistema tenta reservar de novo — se alguém pegou nesse meio-tempo, ele avisa.",
      });
    },
  });
  const heldRef = React.useRef(held);
  heldRef.current = held;
  const holdSupportedRef = React.useRef(holdSupported);
  holdSupportedRef.current = holdSupported;

  // Contagem regressiva só quando falta pouco para a trava vencer.
  const [nowTick, setNowTick] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!held) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [held]);

  const cellMap = React.useMemo(() => buildCellMap(bookings, getDaySlots, intervalMinutes), [bookings, getDaySlots, intervalMinutes]);
  const holdsByCell = React.useMemo(() => {
    const map = new Map<string, ScheduleHold>();
    const now = Date.now();
    for (const h of holds) if (Date.parse(h.expiresAt) > now) map.set(`${h.date}|${h.time}`, h);
    return map;
  }, [holds]);

  const otherHoldAt = (dateISO: string, cell: string) => {
    const h = holdsByCell.get(`${dateISO}|${cell}`);
    return h && h.sessionId !== sessionId ? h : undefined;
  };
  const bookingsAt = (dateISO: string, cell: string) =>
    (cellMap.get(`${dateISO}|${cell}`) || []).filter((e) => e.booking.id !== editing?.id);
  const serverBlockAt = (dateISO: string, cell: string) => {
    const b = serverBlocks.get(`${dateISO}|${cell}`);
    return b && b.until > Date.now() ? b : undefined;
  };
  const isFreeForMe = (dateISO: string, cell: string) =>
    bookingsAt(dateISO, cell).length === 0 && !otherHoldAt(dateISO, cell) && !serverBlockAt(dateISO, cell);

  /** Por que não dá pra emendar mais horários depois de `run` horários livres. */
  const blockReason = (dateISO: string, startCell: string, run: number): string => {
    const daySlots = getDaySlots(dateISO);
    const idx = daySlots.indexOf(startCell);
    const start = toMinutes(startCell) ?? 0;
    const nextMin = start + run * intervalMinutes;
    const cell = daySlots[idx + run];
    if (!cell || toMinutes(cell) !== nextMin) return `a agenda fecha às ${minutesToHHMM(nextMin)}`;
    const other = otherHoldAt(dateISO, cell);
    if (other) return `${cell} está em reserva por ${other.station || "outro computador"}`;
    const sb = serverBlockAt(dateISO, cell);
    if (sb?.type === "held") return `${cell} está em reserva por ${sb.who || "outro computador"}`;
    const who = bookingsAt(dateISO, cell)[0]?.booking.clientName || sb?.who;
    return `às ${cell} já tem agendamento${who ? ` (${firstName(who)})` : ""}`;
  };

  const minDuration = minDurationFor(kind, intervalMinutes);
  const effectiveDuration = Math.max(chosenDuration ?? 0, minDuration);
  const neededCells = Math.max(1, Math.ceil(effectiveDuration / intervalMinutes));
  const minCells = Math.max(1, Math.ceil(minDuration / intervalMinutes));
  const daySel = sel ? getDaySlots(sel.date) : [];
  const selIdx = sel ? daySel.indexOf(sel.time) : -1;
  const runSel = sel && selIdx !== -1 ? freeRunLength(daySel, sel.time, intervalMinutes, (c) => isFreeForMe(sel.date, c), 16) : 0;
  const desiredCells = sel ? rangeCells(daySel, sel.time, effectiveDuration, intervalMinutes) : null;
  const fits = !!desiredCells && runSel >= neededCells;
  // Segura o que dá a partir do horário clicado (pelo menos ele) — se a
  // consulta não couber, o primeiro horário continua seu enquanto escolhe outro.
  const holdTarget = sel && selIdx !== -1 ? daySel.slice(selIdx, selIdx + Math.min(neededCells, runSel)) : [];

  const durationOptions = React.useMemo(() => {
    const maxCells = Math.max(minCells, Math.min(runSel, 8));
    return Array.from({ length: maxCells - minCells + 1 }, (_, i) => (minCells + i) * intervalMinutes);
  }, [minCells, runSel, intervalMinutes]);

  const rangeError = (() => {
    if (!sel) return null;
    if (selIdx === -1) return "Esse horário não está na grade — escolha um horário livre.";
    if (fits) return null;
    const what = kind ? `${KIND_LABEL[kind]}${chosenDuration ? ` de ${fmtDuration(effectiveDuration)}` : ""}` : "O atendimento";
    const need = kind && !chosenDuration && minCells > 1 ? ` precisa de ${fmtDuration(minDuration)}` : " não cabe aqui";
    return `${what}${need}: ${blockReason(sel.date, sel.time, runSel)}. Escolha outro horário na grade${chosenDuration ? " ou diminua o \"até\"" : ""}.`;
  })();

  // Alguém segura o horário de antes e ainda não disse o tipo: se for
  // consulta, vai precisar deste — melhor combinar antes de finalizar.
  const neighborWarning = (() => {
    if (!sel || selIdx === -1) return null;
    const start = toMinutes(sel.time);
    if (start === null) return null;
    const prev = minutesToHHMM(start - intervalMinutes);
    const h = otherHoldAt(sel.date, prev);
    if (!h || h.kind) return null;
    const who = h.station || "Outro computador";
    return `${who} está agendando às ${prev} e ainda não escolheu o tipo. Se for consulta, vai precisar das ${sel.time} — combine com ${who} antes de finalizar.`;
  })();

  // Mantém a trava igual ao que está escolhido (horário + duração + tipo).
  const holdKey = sel ? `${sel.date}|${holdTarget.join(",")}|${kind ?? ""}|${editing?.id ?? ""}|${stationName}` : "";
  React.useEffect(() => {
    if (holdSupportedRef.current === false) return;
    if (!sel) {
      if (heldRef.current) void releaseHold();
      return;
    }
    if (selIdx === -1) return;
    if (holdTarget.length === 0) {
      // O próprio horário escolhido foi ocupado por outro computador.
      const reason = blockReason(sel.date, sel.time, 0);
      void releaseHold();
      setSel(null);
      setNotice({ tone: "red", title: `O horário ${sel.time} de ${dayLabel(sel.date)} não está mais livre: ${reason}.`, text: "Escolha outro horário na grade." });
      return;
    }
    const date = sel.date;
    const timer = window.setTimeout(async () => {
      try {
        setHoldExpired(false);
        const res = await requestHold({ date, times: holdTarget, kind, ignoreScheduleId: editing?.id ?? null });
        if (res?.status === "conflict") {
          registerConflicts(date, res.conflicts);
          void refreshRef.current(true);
        }
      } catch (err) {
        setNotice({ tone: "red", title: err instanceof Error ? err.message : "Falha ao reservar o horário." });
      }
    }, 120);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdKey]);

  // Mexeu na página: renova a trava; se ela já tinha vencido, tenta pegar de novo.
  const onActivity = () => {
    if (holdExpired && sel && holdTarget.length > 0 && holdSupportedRef.current !== false) {
      setHoldExpired(false);
      setNotice(null);
      const date = sel.date;
      void requestHold({ date, times: holdTarget, kind, ignoreScheduleId: editing?.id ?? null })
        .then((res) => {
          if (res?.status === "conflict") {
            registerConflicts(date, res.conflicts);
            void refreshRef.current(true);
          }
        })
        .catch(() => undefined);
      return;
    }
    touchHold();
  };

  const resetForm = () => {
    setSel(null);
    setEditing(null);
    setClientName("");
    setKind(null);
    setInfo({});
    setChosenDuration(null);
    setHoldExpired(false);
  };

  const handleKindChange = (k: BookingKind) => {
    setKind(k);
    setInfo((prev) => pruneKindInfo(k, prev));
    setChosenDuration(null);
  };

  const handlePickSlot = (dateISO: string, cell: string) => {
    setNotice(null);
    const other = otherHoldAt(dateISO, cell);
    if (other) {
      const who = other.station || "outro computador";
      setNotice({
        tone: "amber",
        title: `${cell} de ${dayLabel(dateISO)} está em reserva por ${who}.`,
        text: `O agendamento ainda não foi finalizado. Aguarde a finalização, fale com quem está no ${who} ou escolha outro horário.`,
      });
      return;
    }
    // Com o tipo já escolhido, nem seleciona onde ele não cabe.
    if (kind && minCells > 1) {
      const run = freeRunLength(getDaySlots(dateISO), cell, intervalMinutes, (c) => isFreeForMe(dateISO, c), minCells);
      if (run < minCells) {
        setNotice({
          tone: "red",
          title: `${KIND_LABEL[kind]} precisa de ${fmtDuration(minDuration)}: ${blockReason(dateISO, cell, run)}.`,
          text: "Escolha outro horário na grade.",
        });
        return;
      }
    }
    setSel({ date: dateISO, time: cell });
    setChosenDuration(null);
    // Próximo passo natural: o nome do cliente.
    window.setTimeout(() => clientNameRef.current?.focus(), 0);
  };

  const startEdit = (b: ScheduleTimeSummary) => {
    setNotice(null);
    setEditing(b);
    setSel({ date: b.date, time: b.time });
    setClientName(b.clientName || "");
    setKind(b.kind ?? null);
    // Agendamento antigo (texto livre): o texto vira observação e escolhe o tipo.
    setInfo(b.kind ? { ...(b.kindInfo ?? {}) } : { obs: b.title || "" });
    setChosenDuration(b.durationMinutes ?? null);
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const problem = (() => {
    if (!sel) return "Escolha um horário livre na grade.";
    const v = validateBooking(kind, info);
    if (v) return v;
    if (kind !== "bloqueio" && !clientName.trim()) return "Informe o nome do cliente.";
    if (!fits) return rangeError || "Esse horário não comporta o atendimento.";
    return null;
  })();

  const stationNote = stationName.trim()
    ? `Agendado pelo link público (balcão da agropecuária) — computador: ${stationName.trim()}.`
    : "Agendado pelo link público (balcão da agropecuária).";

  // Sem as funções no banco (migration não aplicada): grava como antes, uma
  // linha por horário, sem trava — a observação vai junto no texto.
  const legacySave = async (title: string, name: string, kindInfo: BookingKindInfo) => {
    if (!sel || !desiredCells) return;
    const dayRows = await listScheduleTimesInRange(sel.date, sel.date);
    const dayMap = buildCellMap(
      dayRows.filter((b) => b.id !== editing?.id),
      getDaySlots,
      intervalMinutes
    );
    const taken = desiredCells.find((c) => dayMap.has(`${sel.date}|${c}`));
    if (taken) throw new Error(`O horário ${taken} acabou de ser reservado por outra pessoa. Escolha outro.`);
    const text = kindInfo.obs ? `${title} — ${kindInfo.obs}` : title;
    if (editing) {
      await updatePublicBooking(editing.id, { date: new Date(`${sel.date}T12:00:00`), time: sel.time, clientName: name, title: text });
      return;
    }
    for (const cell of desiredCells) {
      await createSchedule({
        date: new Date(`${sel.date}T12:00:00`),
        time: cell,
        title: text,
        clientId: "",
        clientName: name,
        animalId: "",
        animalName: "",
        status: "scheduled",
        notes: stationNote,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (problem || !sel || !kind || !desiredCells) {
      toast.error(problem || "Preencha todos os campos.");
      return;
    }
    const moved = !editing || editing.date !== sel.date || editing.time !== sel.time;
    if (moved) {
      if (sel.date < getTodayLocalISO()) {
        toast.error("A data não pode ser no passado.");
        return;
      }
      const startMin = toMinutes(sel.time) ?? 0;
      if (sel.date === getTodayLocalISO() && startMin < nowMinutes) {
        toast.error(`O horário ${sel.time} de hoje já passou. Escolha um horário mais adiante.`);
        return;
      }
    }

    const kindInfo = pruneKindInfo(kind, info);
    const title = composeBookingTitle(kind, kindInfo);
    const name = clientName.trim() || (kind === "bloqueio" ? "Não agendar" : "");
    const id = editing?.id ?? `sched-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const date = sel.date;
    const time = sel.time;

    setSaving(true);
    try {
      let status: "ok" | "unavailable" = "unavailable";
      if (holdSupported !== false) {
        const res = await enqueueHoldCall(() => bookSlot(sessionId, {
          id,
          date,
          time,
          durationMinutes: effectiveDuration,
          title,
          clientName: name,
          notes: editing ? undefined : stationNote,
          kind,
          kindInfo,
        }));
        if (res.status === "conflict") {
          registerConflicts(date, res.conflicts);
          void refreshRef.current(true);
          const c = res.conflicts[0];
          setNotice({
            tone: "red",
            title:
              c?.type === "held"
                ? `Não deu para gravar: ${c.time} está em reserva por ${c.who || "outro computador"}.`
                : `Não deu para gravar: às ${c?.time ?? time} já tem agendamento${c?.who ? ` (${firstName(c.who)})` : ""}.`,
            text: "A grade foi atualizada. Escolha outro horário.",
          });
          return;
        }
        status = res.status;
      }
      if (status === "unavailable") await legacySave(title, name, kindInfo);

      forgetHold();
      setBookings((prev) => [
        ...prev.filter((b) => b.id !== id),
        {
          id,
          date,
          time,
          clientName: name,
          title,
          stationName: editing ? editing.stationName : stationName.trim() || undefined,
          kind,
          kindInfo,
          durationMinutes: effectiveDuration,
        },
      ]);
      const range = formatScheduleTimeRange(time, effectiveDuration);
      if (editing) {
        toast.success("Agendamento atualizado!");
      } else {
        setSuccess(`${title} · ${dayLabel(date)} ${range}${name ? ` · ${name}` : ""}`);
        toast.success("Horário reservado!");
      }
      resetForm();
      setNotice(null);
      void refreshRef.current(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gravar o agendamento.");
    } finally {
      setSaving(false);
    }
  };

  const doCancelBooking = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await cancelPublicBooking(editing.id);
      setBookings((prev) => prev.filter((b) => b.id !== editing.id));
      await releaseHold();
      toast.success("Agendamento cancelado.");
      resetForm();
      void refreshRef.current(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cancelar o agendamento.");
    } finally {
      setSaving(false);
    }
  };

  // --- Resumo do dia — clicar na data do cabeçalho da grade.
  const [summaryDateISO, setSummaryDateISO] = React.useState<string | null>(null);
  const summaryBookings = React.useMemo(
    () =>
      bookings
        .filter((b) => b.date === summaryDateISO)
        .sort((a, b) => (toMinutes(a.time) ?? 0) - (toMinutes(b.time) ?? 0)),
    [bookings, summaryDateISO]
  );
  const summaryOpenSlots = summaryDateISO ? getDaySlots(summaryDateISO) : [];
  const summaryBusyCells = summaryDateISO ? summaryOpenSlots.filter((s) => cellMap.has(`${summaryDateISO}|${s}`)).length : 0;

  const heldCoversDesired =
    !!held && !!sel && held.date === sel.date && !!desiredCells && desiredCells.every((c) => held.times.includes(c));
  const msLeft = held ? held.expiresAt - nowTick : 0;
  const showCountdown = !!held && msLeft > 0 && msLeft < 2 * 60 * 1000;
  const countdownText = `${Math.floor(msLeft / 60000)}:${String(Math.floor((msLeft % 60000) / 1000)).padStart(2, "0")}`;

  const kindHint = kind ? (
    <p className={cn("text-xs font-medium", KIND_VISUAL[kind].text)}>
      {kind === "consulta"
        ? `Consulta trava no mínimo ${fmtDuration(minDuration)} (${minCells} horários seguidos).`
        : `${KIND_LABEL[kind]} trava ${fmtDuration(minDuration)}.`}{" "}
      Precisa de mais tempo? Mude o "até" no horário.
    </p>
  ) : null;

  const legend = (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <span className="h-3 w-3 rounded border border-teal-200 bg-teal-50" /> Livre
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-3 w-3 rounded bg-teal-600" /> Seu horário
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-3 w-3 rounded border border-dashed border-amber-400 bg-amber-50" /> Em reserva (outro computador)
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-3 w-3 rounded border border-orange-300 bg-orange-100" /> Ocupado
      </span>
    </div>
  );

  const renderBookingButton = (
    b: ScheduleTimeSummary,
    isStart: boolean,
    isPast: boolean,
    d: Date
  ) => {
    const visual = b.kind ? KIND_VISUAL[b.kind] : null;
    const Icon = visual?.icon;
    const blocked = b.kind === "bloqueio";
    const label = blocked ? "Bloqueado" : firstName(b.clientName) || "Ocupado";
    const isEditingThis = editing?.id === b.id;
    return (
      <HoverCard key={`${b.id}-${isStart ? "s" : "c"}`} openDelay={150} closeDelay={80}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            onClick={() => startEdit(b)}
            className={cn(
              "flex h-6 w-full items-center justify-center gap-0.5 truncate rounded-md border px-1 text-[10px] font-medium transition-colors",
              isPast
                ? "border-transparent bg-muted text-muted-foreground/50"
                : blocked
                  ? "border-zinc-300 bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  : isStart
                    ? "border-orange-300 bg-orange-100 text-orange-900 hover:bg-orange-200"
                    : "border-orange-200 bg-orange-50 text-orange-800/80 hover:bg-orange-100",
              isEditingThis && "ring-2 ring-amber-400"
            )}
          >
            {isStart ? Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden /> : <CornerDownRight className="h-3 w-3 shrink-0" aria-hidden />}
            <span className="truncate">{label}</span>
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-72 text-sm" align="center">
          <p className="font-semibold text-foreground">{blocked ? "Horário bloqueado" : b.clientName || "Sem nome"}</p>
          {b.kind && <KindBadge kind={b.kind} info={b.kindInfo} className="mt-1" />}
          {b.title && <p className="mt-1 text-muted-foreground">{b.title}</p>}
          {b.kindInfo?.obs && <p className="mt-0.5 text-muted-foreground">Obs.: {b.kindInfo.obs}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            {formatDayHeader(d)} · {formatScheduleTimeRange(b.time, b.durationMinutes)}
          </p>
          {b.stationName && <p className="mt-1 text-xs text-muted-foreground">Agendado por: {b.stationName}</p>}
          <p className="mt-2 text-xs font-medium text-teal-700">Clique para editar ou cancelar</p>
        </HoverCardContent>
      </HoverCard>
    );
  };

  const renderCell = (d: Date, hour: string) => {
    const dISO = toISODate(d);
    const slotMinutes = toMinutes(hour);
    const isPast = dISO < todayISO || (dISO === todayISO && slotMinutes !== null && slotMinutes < nowMinutes);
    const openSlots = getDaySlots(dISO);
    if (!openSlots.includes(hour)) {
      return (
        <td key={dISO} className="border-b border-r border-border/40 p-1 text-center text-muted-foreground/30 last:border-r-0">
          —
        </td>
      );
    }
    const entries = cellMap.get(`${dISO}|${hour}`) || [];
    if (entries.length > 0) {
      return (
        <td key={dISO} className="border-b border-r border-border/40 p-1 text-center align-top last:border-r-0">
          <div className="flex flex-col gap-0.5">{entries.map((e) => renderBookingButton(e.booking, e.isStart, isPast, d))}</div>
        </td>
      );
    }
    const other = otherHoldAt(dISO, hour);
    if (other && !isPast) {
      return (
        <td key={dISO} className="border-b border-r border-border/40 p-1 text-center last:border-r-0">
          <button
            type="button"
            onClick={() => handlePickSlot(dISO, hour)}
            title={`Em reserva por ${other.station || "outro computador"} — ainda não finalizado`}
            className="flex h-7 w-full items-center justify-center gap-0.5 truncate rounded-md border border-dashed border-amber-400 bg-amber-50 px-1 text-[10px] font-semibold text-amber-800"
          >
            <Lock className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{other.station || "Em reserva"}</span>
          </button>
        </td>
      );
    }
    const isMine = !!sel && sel.date === dISO && holdTarget.includes(hour);
    const runHere =
      kind && minCells > 1 ? freeRunLength(openSlots, hour, intervalMinutes, (c) => isFreeForMe(dISO, c), minCells) : minCells;
    const fitsHere = runHere >= minCells;
    return (
      <td key={dISO} className="border-b border-r border-border/40 p-1 text-center last:border-r-0">
        <button
          type="button"
          disabled={isPast}
          onClick={() => handlePickSlot(dISO, hour)}
          title={!isPast && !isMine && !fitsHere && kind ? `${KIND_LABEL[kind]} de ${fmtDuration(minDuration)} não cabe aqui` : undefined}
          className={cn(
            "h-7 w-full rounded-md border text-[11px] transition-colors",
            isMine
              ? "border-teal-600 bg-teal-600 font-semibold text-white"
              : isPast
                ? "cursor-not-allowed border-transparent bg-muted text-muted-foreground/50"
                : fitsHere
                  ? "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
                  : "border-dashed border-teal-200 bg-white text-teal-700/50 hover:bg-teal-50"
          )}
        >
          {isMine ? (hour === sel?.time ? "Seu" : "↳") : isPast ? "-" : fitsHere ? "Livre" : `só ${fmtDuration(runHere * intervalMinutes)}`}
        </button>
      </td>
    );
  };

  const gridHours = React.useMemo(() => {
    const set = new Set<string>();
    weekDays.forEach((d) => getDaySlots(toISODate(d)).forEach((h) => set.add(h)));
    return Array.from(set).sort();
  }, [weekDays, getDaySlots]);

  const submitLabel = sel ? `Reservar ${formatScheduleTimeRange(sel.time, effectiveDuration)}` : "Reservar horário";

  return (
    <div
      className="flex vf-viewport-min-h items-center justify-center bg-muted/40 p-4"
      onPointerDownCapture={onActivity}
      onKeyDownCapture={onActivity}
    >
      <Card className="w-full max-w-3xl rounded-2xl border-border/80">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
            <PawPrint className="h-6 w-6 text-teal-700" />
          </div>
          <CardTitle className="text-lg">Agendar horário{companyName ? ` — ${companyName}` : ""}</CardTitle>
          <p className="text-sm text-muted-foreground">Reserve um horário na agenda (consulta, vacina, medicação...).</p>
          {stationName && (
            <button
              type="button"
              onClick={() => {
                setStationNameInput(stationName);
                setStationDialogOpen(true);
              }}
              className="mx-auto mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground underline decoration-dotted hover:text-foreground"
            >
              <Monitor className="h-3 w-3" aria-hidden /> Computador: {stationName} (trocar)
            </button>
          )}
        </CardHeader>
        <CardContent>
          {!stationName ? (
            // Sem saber qual computador é, os outros não teriam como saber
            // quem está segurando um horário — por isso a agenda só libera
            // depois da identificação (uma vez por computador).
            <form
              className="mx-auto max-w-md space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-5 text-center"
              onSubmit={(e) => {
                e.preventDefault();
                if (!gateInput.trim()) {
                  toast.error("Digite um nome para este computador.");
                  return;
                }
                saveStation(gateInput);
              }}
            >
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-100">
                <Monitor className="h-5 w-5 text-amber-800" aria-hidden />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-amber-950">Identifique este computador para liberar a agenda</p>
                <p className="text-sm text-amber-900/80">
                  Quando alguém estiver agendando, os outros computadores veem o nome de quem está segurando o horário. Fica
                  salvo neste navegador — é só uma vez.
                </p>
              </div>
              <Input
                value={gateInput}
                onChange={(e) => setGateInput(e.target.value)}
                placeholder="Ex.: Balcão 1, Computador do caixa"
                autoFocus
                className="bg-white text-center"
                aria-label="Nome deste computador"
              />
              <Button type="submit" className="w-full bg-amber-600 text-white hover:bg-amber-700">
                Liberar a agenda
              </Button>
            </form>
          ) : success ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-teal-700" />
              <p className="text-sm font-semibold">Horário reservado!</p>
              <p className="max-w-md text-sm text-muted-foreground">{success}</p>
              <p className="text-xs text-muted-foreground">O agendamento já está na agenda do veterinário.</p>
              <Button variant="outline" className="mt-2" onClick={() => setSuccess(null)}>
                <CalendarPlus className="mr-2 h-4 w-4" /> Reservar outro horário
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Calendário semanal */}
              <div className="relative rounded-xl border border-border p-3">
                <div className="mb-2 flex items-center justify-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setDayOffset((o) => o - 7)}
                    title="Semana anterior"
                    aria-label="Semana anterior"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <p className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                    {formatDayHeader(weekDays[0])} — {formatDayHeader(weekDays[6])}
                  </p>
                  <button
                    type="button"
                    onClick={() => setDayOffset((o) => o + 7)}
                    title="Semana seguinte"
                    aria-label="Semana seguinte"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Espaço nas laterais pros botões redondos não taparem a grade. */}
                <div className="px-14 sm:px-16">
                  {!everLoaded ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Carregando horários...
                    </div>
                  ) : (
                    <div className={cn("overflow-x-auto transition-opacity", loadingWeek && "pointer-events-none opacity-50")}>
                      <table className="w-full min-w-[560px] border-collapse text-xs">
                        <thead>
                          <tr>
                            <th className="sticky left-0 z-10 w-12 border-b border-r border-border/60 bg-card p-1 text-left text-muted-foreground"> </th>
                            {weekDays.map((d) => {
                              const dISO = toISODate(d);
                              const isPast = dISO < todayISO;
                              const isToday = dISO === todayISO;
                              return (
                                <th
                                  key={dISO}
                                  className={cn(
                                    "border-b border-r border-border/40 p-1 text-center font-medium last:border-r-0",
                                    isPast && "text-muted-foreground/50"
                                  )}
                                >
                                  <button
                                    type="button"
                                    onClick={() => setSummaryDateISO(dISO)}
                                    title="Ver resumo do dia"
                                    className={cn("w-full rounded-md px-1 py-0.5 transition-colors hover:bg-muted", isToday && "text-teal-700")}
                                  >
                                    <div className="text-sm font-bold">{isToday ? "Hoje" : WEEKDAY_LABELS[d.getDay()]}</div>
                                    <div className="text-xs font-semibold">{formatDayHeader(d)}</div>
                                  </button>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {gridHours.map((hour) => (
                            <tr key={hour}>
                              <td className="sticky left-0 z-10 border-b border-r border-border/60 bg-card p-1 text-sm font-bold text-foreground">
                                {hour}
                              </td>
                              {weekDays.map((d) => renderCell(d, hour))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                {legend}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Clique num horário livre para reservar, num ocupado para editar ou cancelar, ou na data para ver o resumo do dia.
                </p>

                {/* Botões redondos grandes: esquerda volta 1 dia, direita avança 1 semana. */}
                <button
                  type="button"
                  onClick={() => setDayOffset((o) => o - 1)}
                  title="Ver o dia anterior"
                  aria-label="Ver o dia anterior"
                  className="absolute left-0 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-teal-700/20 bg-teal-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-teal-700 sm:left-1 sm:h-14 sm:w-14"
                >
                  <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
                </button>
                <button
                  type="button"
                  onClick={() => setDayOffset((o) => o + 7)}
                  title="Ver a semana seguinte"
                  aria-label="Ver a semana seguinte"
                  className="absolute right-0 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-teal-700/20 bg-teal-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-teal-700 sm:right-1 sm:h-14 sm:w-14"
                >
                  <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
                </button>
              </div>

              {notice && (
                <div role="status" className={cn("flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm", NOTICE_STYLE[notice.tone])}>
                  {notice.tone === "amber" ? (
                    <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{notice.title}</p>
                    {notice.text && <p className="mt-0.5 opacity-90">{notice.text}</p>}
                  </div>
                  <button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso" className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Formulário */}
              <form ref={formRef} onSubmit={handleSubmit} className="scroll-mt-4 space-y-4">
                {editing && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                      <span>
                        Editando o agendamento de <strong>{editing.clientName || "sem nome"}</strong> — clique num horário livre para mudar o horário.
                        {!editing.kind && editing.title && (
                          <span className="mt-0.5 block text-xs">
                            Agendamento antigo: "{editing.title}" — escolha o tipo abaixo (o texto vai para a observação).
                          </span>
                        )}
                      </span>
                    </span>
                    <Button type="button" variant="ghost" size="sm" className="h-8 text-amber-900 hover:bg-amber-100" onClick={resetForm}>
                      Sair da edição
                    </Button>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Horário</Label>
                  {sel ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white">
                        <Clock className="h-4 w-4" aria-hidden />
                        {dayLabel(sel.date)} · {sel.time}
                      </span>
                      <span className="text-sm text-muted-foreground">até</span>
                      <Select value={String(effectiveDuration)} onValueChange={(v) => setChosenDuration(Number(v))}>
                        <SelectTrigger className="h-9 w-[92px]" aria-label="Horário de término">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(new Set([...durationOptions, effectiveDuration]))
                            .sort((a, b) => a - b)
                            .map((d) => (
                              <SelectItem key={d} value={String(d)}>
                                {minutesToHHMM((toMinutes(sel.time) ?? 0) + d)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {holdSupported !== false &&
                        (holdPending ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Reservando...
                          </span>
                        ) : heldCoversDesired ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-200">
                            <Lock className="h-3 w-3" aria-hidden /> Reservado para você
                          </span>
                        ) : null)}
                      <button
                        type="button"
                        onClick={() => (editing ? resetForm() : setSel(null))}
                        className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden /> Soltar horário
                      </button>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-teal-300 bg-teal-50/60 px-3 py-2 text-sm text-teal-800">
                      Clique num horário <strong>Livre</strong> na grade — ele fica reservado para você enquanto preenche.
                    </p>
                  )}
                  {rangeError && <p className="text-sm font-medium text-red-700">{rangeError}</p>}
                  {neighborWarning && (
                    <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 ring-1 ring-inset ring-amber-200">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      {neighborWarning}
                    </p>
                  )}
                  {showCountdown && (
                    <p className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 ring-1 ring-inset ring-amber-200">
                      Sem mexer há um tempo: o horário será liberado para os outros em <strong className="tabular-nums">{countdownText}</strong>.
                      <button type="button" onClick={() => touchHold(true)} className="font-semibold underline">
                        Continuar reservando
                      </button>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="clientName">
                    Nome do cliente {kind === "bloqueio" && <span className="font-normal text-muted-foreground">(opcional)</span>}
                  </Label>
                  <Input
                    id="clientName"
                    ref={clientNameRef}
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nome de quem vai ser atendido"
                  />
                </div>

                <BookingKindFields
                  kind={kind}
                  info={info}
                  onKindChange={handleKindChange}
                  onInfoChange={setInfo}
                  vaccineOptions={vaccineOptions}
                  kindHint={kindHint}
                  idPrefix="public-booking"
                />

                {editing ? (
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setCancelConfirmOpen(true)}
                      disabled={saving}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Cancelar horário
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Salvar alterações
                    </Button>
                  </div>
                ) : (
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reservando...
                      </>
                    ) : (
                      <>
                        <CalendarPlus className="mr-2 h-4 w-4" /> {submitLabel}
                      </>
                    )}
                  </Button>
                )}
                {problem && sel && <p className="text-center text-xs text-muted-foreground">Falta: {problem}</p>}
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmação de cancelamento (o formulário não é modal, então não empilha). */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esse agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O horário de {editing?.clientName || "esse cliente"} às {editing?.time} vai ficar livre de novo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setCancelConfirmOpen(false);
                void doCancelBooking();
              }}
            >
              Cancelar horário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resumo do dia */}
      <Dialog open={!!summaryDateISO} onOpenChange={(open) => !open && setSummaryDateISO(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resumo do dia{summaryDateISO ? ` — ${dayLabel(summaryDateISO)}` : ""}</DialogTitle>
            <DialogDescription>
              {summaryOpenSlots.length === 0
                ? "Clínica fechada nesse dia."
                : `${summaryBookings.length} agendamento(s) · ${summaryBusyCells} de ${summaryOpenSlots.length} horários ocupados (já descontando almoço e horário fechado).`}
            </DialogDescription>
          </DialogHeader>
          {summaryBookings.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum horário ocupado nesse dia.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {summaryBookings.map((b) => (
                <div key={b.id} className="flex items-start justify-between gap-2 rounded-lg border border-border p-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      <span className="tabular-nums">{formatScheduleTimeRange(b.time, b.durationMinutes)}</span> —{" "}
                      {b.kind === "bloqueio" ? "Horário bloqueado" : b.clientName || "Sem nome"}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {b.kind && <KindBadge kind={b.kind} info={b.kindInfo} />}
                      {b.title && <span className="truncate text-xs text-muted-foreground">{b.title}</span>}
                    </div>
                    {b.kindInfo?.obs && <p className="truncate text-xs text-muted-foreground">Obs.: {b.kindInfo.obs}</p>}
                    {b.stationName && <p className="truncate text-xs text-muted-foreground">Agendado por: {b.stationName}</p>}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => {
                      setSummaryDateISO(null);
                      startEdit(b);
                    }}
                  >
                    Editar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Trocar o nome do computador/balcão (só neste navegador). */}
      <Dialog open={stationDialogOpen} onOpenChange={setStationDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Identificar este computador</DialogTitle>
            <DialogDescription>
              Um nome curto pra saber de qual computador saiu cada reserva e quem está segurando um horário (ex.: "Balcão 1",
              "Computador do caixa"). Fica salvo só neste navegador.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={stationNameInput}
            onChange={(e) => setStationNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (stationNameInput.trim()) {
                  saveStation(stationNameInput);
                  setStationDialogOpen(false);
                }
              }
            }}
            placeholder="Ex.: Balcão 1"
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStationDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!stationNameInput.trim()}
              onClick={() => {
                saveStation(stationNameInput);
                setStationDialogOpen(false);
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookSchedulePage;
