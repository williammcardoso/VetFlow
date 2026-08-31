import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, Loader2, PawPrint, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  cancelPublicBooking,
  computeEncaixeIds,
  createSchedule,
  listScheduleTimesInRange,
  updatePublicBooking,
  type ScheduleTimeSummary,
} from "@/lib/schedulesApi";
import { getCompanySettings } from "@/lib/settingsApi";
import { getTodayLocalISO } from "@/lib/utils";

const MIN_GAP_MINUTES = 60;
const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const GRID_HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

// Navegador não tem como ler o nome real do computador (Windows não expõe
// isso pra página nenhuma) — em vez disso, cada aparelho "se apresenta" uma
// vez (ex.: "Balcão 1") e o navegador lembra sozinho depois, via
// localStorage. Vai junto nas observações de cada agendamento criado
// dali, pra dar pra saber de qual computador saiu cada reserva.
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

// Horário de funcionamento (confirmado com o usuário) — seg-sex 8h-18h,
// sábado 8h-12h, domingo fechado. Sem tabela de configuração pra isso no
// sistema ainda, então fica fixo aqui; se mudar, é só ajustar esses 2 pontos.
// Almoço seg-sex das 13h às 15h (reservado, não aparece como horário livre).
function getDaySlots(dayOfWeek: number): string[] {
  if (dayOfWeek === 0) return []; // domingo: fechado
  if (dayOfWeek === 6) return ["08:00", "09:00", "10:00", "11:00"]; // sábado até 12h
  return ["08:00", "09:00", "10:00", "11:00", "12:00", "15:00", "16:00", "17:00"];
}
function isWithinBusinessHours(dayOfWeek: number, minutes: number): boolean {
  if (dayOfWeek === 0) return false;
  if (dayOfWeek === 6) return minutes >= 8 * 60 && minutes < 12 * 60;
  if (minutes >= 13 * 60 && minutes < 15 * 60) return false; // almoço
  return minutes >= 8 * 60 && minutes < 18 * 60;
}

function toMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mondayOf(dateISO: string): Date {
  const d = new Date(`${dateISO}T12:00:00`);
  const diff = (d.getDay() + 6) % 7; // segunda = 0
  d.setDate(d.getDate() - diff);
  return d;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDayHeader(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// Encontra, entre os horários abertos daquele dia, o mais próximo do minuto
// informado — usado pra agrupar um agendamento "torto" (ex.: 8h30) na célula
// da grade mais perto dele, em vez de duplicar/esconder informação.
function nearestSlot(minutes: number, openSlots: string[]): string {
  let best = openSlots[0];
  let bestDiff = Infinity;
  for (const slot of openSlots) {
    const slotMin = toMinutes(slot);
    if (slotMin === null) continue;
    const diff = Math.abs(slotMin - minutes);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = slot;
    }
  }
  return best;
}

type PendingAction =
  | { type: "conflict"; message: string }
  | { type: "cancel" };

// Página pública (sem login) — o link vai pro balcão da agropecuária, pra
// eles reservarem horário direto na agenda do veterinário (principalmente
// vacinação a domicílio) sem precisar ligar. `schedules` já tem RLS aberta
// pra `anon` (mesmo padrão usado em document_signatures/documents pras
// outras páginas públicas), então dá pra chamar createSchedule() direto.
// Reserva ~1h por horário checando conflito com agendamentos existentes no
// mesmo dia, em vez de adicionar coluna de duração (não existe no sistema).
const BookSchedulePage: React.FC = () => {
  const [companyName, setCompanyName] = React.useState("");
  const [clientName, setClientName] = React.useState("");
  const [date, setDate] = React.useState(getTodayLocalISO());
  const [time, setTime] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // Nome do computador/balcão (só nesse navegador — ver STATION_NAME_STORAGE_KEY).
  const [stationName, setStationName] = React.useState<string>(() => readStationName());
  const [stationDialogOpen, setStationDialogOpen] = React.useState(false);
  const [stationNameInput, setStationNameInput] = React.useState("");

  const openStationDialog = () => {
    setStationNameInput(stationName);
    setStationDialogOpen(true);
  };

  const handleSaveStationName = () => {
    const trimmed = stationNameInput.trim();
    writeStationName(trimmed);
    setStationName(trimmed);
    setStationDialogOpen(false);
  };

  const todayMonday = React.useMemo(() => mondayOf(getTodayLocalISO()), []);
  const [weekStart, setWeekStart] = React.useState<Date>(todayMonday);
  const weekDays = React.useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const [bookings, setBookings] = React.useState<ScheduleTimeSummary[]>([]);
  const [loadingWeek, setLoadingWeek] = React.useState(true);
  const encaixeIds = React.useMemo(() => computeEncaixeIds(bookings, MIN_GAP_MINUTES), [bookings]);

  React.useEffect(() => {
    getCompanySettings()
      .then((s) => setCompanyName(s.companyName || ""))
      .catch(() => setCompanyName(""));
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setLoadingWeek(true);
    const startISO = toISODate(weekDays[0]);
    const endISO = toISODate(weekDays[6]);
    listScheduleTimesInRange(startISO, endISO)
      .then((rows) => { if (!cancelled) setBookings(rows); })
      .catch(() => { if (!cancelled) setBookings([]); })
      .finally(() => { if (!cancelled) setLoadingWeek(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  // Vários computadores do balcão usam essa página ao mesmo tempo — sem
  // isso, quem já estava com a grade aberta só via o horário reservado por
  // outro computador depois de um F5. Atualiza sozinho a cada 10s, sem
  // mostrar "Carregando..." (silencioso, pra não interromper quem está
  // digitando no formulário embaixo).
  React.useEffect(() => {
    const startISO = toISODate(weekDays[0]);
    const endISO = toISODate(weekDays[6]);
    const intervalId = setInterval(() => {
      listScheduleTimesInRange(startISO, endISO)
        .then((rows) => setBookings(rows))
        .catch(() => { /* falha passageira — tenta de novo no próximo tick */ });
    }, 10000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  // Agrupa os agendamentos da semana pela célula da grade (dia + hora cheia)
  // mais próxima de cada um — assim um "encaixe" torto (ex.: 8h30) ganha o
  // próprio botãozinho na célula certa, ao lado do agendamento vizinho, em
  // vez de ficar escondido atrás de um só "Ocupado" genérico.
  const bookingsBySlot = React.useMemo(() => {
    const map = new Map<string, ScheduleTimeSummary[]>();
    for (const d of weekDays) {
      const dISO = toISODate(d);
      const openSlots = getDaySlots(d.getDay());
      if (openSlots.length === 0) continue;
      for (const b of bookings) {
        if (b.date !== dISO) continue;
        const bMin = toMinutes(b.time);
        if (bMin === null) continue;
        const slot = nearestSlot(bMin, openSlots);
        const key = `${dISO}|${slot}`;
        const list = map.get(key) || [];
        list.push(b);
        map.set(key, list);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => (toMinutes(a.time) ?? 0) - (toMinutes(b.time) ?? 0));
    }
    return map;
  }, [bookings, weekDays]);

  const clientNameRef = React.useRef<HTMLInputElement>(null);
  const handlePickSlot = (dateISO: string, slotTime: string) => {
    setDate(dateISO);
    setTime(slotTime);
    // Depois de escolher o horário no calendário, já manda o foco pro nome
    // do cliente — próximo passo natural, sem precisar rolar/clicar de novo.
    clientNameRef.current?.focus();
  };

  // Se for confirmado um "encaixe" (horário perto de outro já marcado — ex.:
  // duas vacinas em casas vizinhas), guarda aqui o motivo pra mostrar no
  // diálogo de confirmação antes de gravar.
  const [conflictWarning, setConflictWarning] = React.useState<string | null>(null);

  const doCreateBooking = async () => {
    setSaving(true);
    try {
      const created = await createSchedule({
        date: new Date(`${date}T12:00:00`),
        time,
        title: description.trim(),
        clientId: "",
        clientName: clientName.trim(),
        animalId: "",
        animalName: "",
        status: "scheduled",
        notes: stationName.trim()
          ? `Agendado pelo link público (balcão da agropecuária) — computador: ${stationName.trim()}.`
          : "Agendado pelo link público (balcão da agropecuária).",
      });

      // Atualiza o calendário na hora, sem precisar recarregar a página —
      // antes o horário recém-reservado só aparecia como "Ocupado" depois
      // de um F5, porque `bookings` (carregado uma vez por semana) nunca
      // era atualizado após salvar.
      setBookings((prev) => [
        ...prev,
        { id: created.id, date, time, clientName: clientName.trim(), title: description.trim(), stationName: stationName.trim() || undefined },
      ]);

      setSuccess(true);
      toast.success("Horário reservado com sucesso!");
      setClientName("");
      setTime("");
      setDescription("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reservar o horário.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!clientName.trim() || !date || !time || !description.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }
    if (date < getTodayLocalISO()) {
      toast.error("A data não pode ser no passado.");
      return;
    }
    const requestedMinutes = toMinutes(time);
    if (requestedMinutes === null) {
      toast.error("Horário inválido.");
      return;
    }
    const dayOfWeek = new Date(`${date}T12:00:00`).getDay();
    if (!isWithinBusinessHours(dayOfWeek, requestedMinutes)) {
      toast.error("Esse horário está fora do funcionamento da clínica (seg-sex 8h-18h, sáb 8h-12h).");
      return;
    }

    setSaving(true);
    try {
      const existing = await listScheduleTimesInRange(date, date);
      const conflict = existing.find((b) => {
        const bMin = toMinutes(b.time);
        return bMin !== null && Math.abs(bMin - requestedMinutes) < MIN_GAP_MINUTES;
      });
      if (conflict) {
        // Não bloqueia mais — vira um "encaixe" que precisa de confirmação,
        // pra permitir casos tipo duas vacinas em casas vizinhas (8h e 8h30).
        setSaving(false);
        setConflictWarning(
          `Esse horário está perto de outro agendamento: ${[conflict.clientName, conflict.title].filter(Boolean).join(" — ") || "sem nome"} às ${conflict.time}.`
        );
        return;
      }

      await doCreateBooking();
    } catch (err) {
      setSaving(false);
      toast.error(err instanceof Error ? err.message : "Erro ao reservar o horário.");
    }
  };

  // --- Edição de um agendamento já existente (corrigir erro de digitação,
  // mudar horário, ou cancelar) — o balcão não tem outro jeito de arrumar um
  // agendamento errado, já que não tem acesso à Agenda interna.
  const [editingBooking, setEditingBooking] = React.useState<ScheduleTimeSummary | null>(null);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editDate, setEditDate] = React.useState("");
  const [editTime, setEditTime] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editSaving, setEditSaving] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<PendingAction | null>(null);

  const openEditDialog = (booking: ScheduleTimeSummary) => {
    setEditingBooking(booking);
    setEditName(booking.clientName || "");
    setEditDate(booking.date);
    setEditTime(booking.time);
    setEditDescription(booking.title || "");
    setEditDialogOpen(true);
  };

  const closeEditFlow = () => {
    setEditDialogOpen(false);
    setEditingBooking(null);
    setPendingAction(null);
  };

  const doUpdateBooking = async () => {
    if (!editingBooking) return;
    setEditSaving(true);
    try {
      await updatePublicBooking(editingBooking.id, {
        date: new Date(`${editDate}T12:00:00`),
        time: editTime,
        clientName: editName.trim(),
        title: editDescription.trim(),
      });
      setBookings((prev) =>
        prev.map((b) =>
          b.id === editingBooking.id
            ? { ...b, date: editDate, time: editTime, clientName: editName.trim(), title: editDescription.trim() }
            : b
        )
      );
      toast.success("Agendamento atualizado!");
      closeEditFlow();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar o agendamento.");
      setEditDialogOpen(true);
    } finally {
      setEditSaving(false);
    }
  };

  const doCancelBooking = async () => {
    if (!editingBooking) return;
    setEditSaving(true);
    try {
      await cancelPublicBooking(editingBooking.id);
      setBookings((prev) => prev.filter((b) => b.id !== editingBooking.id));
      toast.success("Agendamento cancelado.");
      closeEditFlow();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cancelar o agendamento.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking || editSaving) return;

    if (!editName.trim() || !editDate || !editTime || !editDescription.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }
    const requestedMinutes = toMinutes(editTime);
    if (requestedMinutes === null) {
      toast.error("Horário inválido.");
      return;
    }
    const dayOfWeek = new Date(`${editDate}T12:00:00`).getDay();
    if (!isWithinBusinessHours(dayOfWeek, requestedMinutes)) {
      toast.error("Esse horário está fora do funcionamento da clínica (seg-sex 8h-18h, sáb 8h-12h).");
      return;
    }

    setEditSaving(true);
    try {
      const existing = await listScheduleTimesInRange(editDate, editDate);
      const conflict = existing.find((b) => {
        if (b.id === editingBooking.id) return false; // não conflita consigo mesmo
        const bMin = toMinutes(b.time);
        return bMin !== null && Math.abs(bMin - requestedMinutes) < MIN_GAP_MINUTES;
      });
      if (conflict) {
        setEditSaving(false);
        setEditDialogOpen(false);
        setPendingAction({
          type: "conflict",
          message: `Esse horário está perto de outro agendamento: ${[conflict.clientName, conflict.title].filter(Boolean).join(" — ") || "sem nome"} às ${conflict.time}.`,
        });
        return;
      }
      await doUpdateBooking();
    } catch (err) {
      setEditSaving(false);
      toast.error(err instanceof Error ? err.message : "Erro ao verificar conflito.");
    }
  };

  const handleAskCancel = () => {
    setEditDialogOpen(false);
    setPendingAction({ type: "cancel" });
  };

  // --- Resumo do dia — clicar na data do cabeçalho da grade abre um modal
  // com os horários ocupados daquele dia (descontando almoço/fechado).
  const [summaryDateISO, setSummaryDateISO] = React.useState<string | null>(null);
  const summaryBookings = React.useMemo(
    () =>
      bookings
        .filter((b) => b.date === summaryDateISO)
        .sort((a, b) => (toMinutes(a.time) ?? 0) - (toMinutes(b.time) ?? 0)),
    [bookings, summaryDateISO]
  );
  const summaryOpenSlots = summaryDateISO ? getDaySlots(new Date(`${summaryDateISO}T12:00:00`).getDay()) : [];

  const canGoPrevWeek = toISODate(weekStart) > toISODate(todayMonday);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-3xl rounded-2xl border-border/80">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
            <PawPrint className="h-6 w-6 text-teal-700" />
          </div>
          <CardTitle className="text-lg">Agendar horário{companyName ? ` — ${companyName}` : ""}</CardTitle>
          <p className="text-sm text-muted-foreground">Reserve um horário na agenda (ex.: vacina a domicílio, consulta).</p>
          <button
            type="button"
            onClick={openStationDialog}
            className="mx-auto mt-1 text-xs text-muted-foreground underline decoration-dotted hover:text-foreground"
          >
            {stationName ? `Computador: ${stationName} (trocar)` : "Identificar este computador"}
          </button>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-teal-700" />
              <p className="text-sm font-semibold">Horário reservado!</p>
              <p className="text-sm text-muted-foreground">O agendamento já está na agenda do veterinário.</p>
              <Button variant="outline" className="mt-2" onClick={() => setSuccess(false)}>
                <CalendarPlus className="mr-2 h-4 w-4" /> Reservar outro horário
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Calendário semanal */}
              <div className="rounded-xl border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!canGoPrevWeek}
                    onClick={() => setWeekStart(addDays(weekStart, -7))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <p className="text-sm font-medium">
                    {formatDayHeader(weekDays[0])} — {formatDayHeader(weekDays[6])}
                  </p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {loadingWeek ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando horários...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] border-collapse text-xs">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 w-12 border-r border-border/60 bg-card p-1 text-left text-muted-foreground"> </th>
                          {weekDays.map((d) => {
                            const dISO = toISODate(d);
                            const isPast = dISO < getTodayLocalISO();
                            return (
                              <th key={dISO} className={`p-1 text-center font-medium ${isPast ? "text-muted-foreground/50" : ""}`}>
                                <button
                                  type="button"
                                  onClick={() => setSummaryDateISO(dISO)}
                                  title="Ver resumo do dia"
                                  className="w-full rounded-md px-1 py-0.5 transition-colors hover:bg-muted"
                                >
                                  <div>{WEEKDAY_LABELS[d.getDay()]}</div>
                                  <div className="text-[10px] font-normal">{formatDayHeader(d)}</div>
                                </button>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {GRID_HOURS.map((hour) => (
                          <tr key={hour}>
                            <td className="sticky left-0 z-10 border-r border-border/60 bg-card p-1 text-muted-foreground">{hour}</td>
                            {weekDays.map((d) => {
                              const dISO = toISODate(d);
                              const isPast = dISO < getTodayLocalISO();
                              const openSlots = getDaySlots(d.getDay());
                              const isOpen = openSlots.includes(hour);
                              if (!isOpen) {
                                return <td key={dISO} className="p-1 text-center text-muted-foreground/30">—</td>;
                              }
                              const cellBookings = bookingsBySlot.get(`${dISO}|${hour}`) || [];
                              const isSelected = date === dISO && time === hour && cellBookings.length === 0;

                              if (cellBookings.length === 0) {
                                return (
                                  <td key={dISO} className="p-1 text-center">
                                    <button
                                      type="button"
                                      disabled={isPast}
                                      onClick={() => handlePickSlot(dISO, hour)}
                                      className={`h-7 w-full rounded-md border text-[11px] transition-colors ${
                                        isSelected
                                          ? "border-teal-600 bg-teal-600 text-white"
                                          : isPast
                                            ? "border-transparent bg-muted text-muted-foreground/50 cursor-not-allowed"
                                            : "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
                                      }`}
                                    >
                                      {isPast ? "-" : "Livre"}
                                    </button>
                                  </td>
                                );
                              }

                              return (
                                <td key={dISO} className="p-1 text-center align-top">
                                  <div className="flex flex-col gap-0.5">
                                    {cellBookings.map((b) => {
                                      const isEncaixe = encaixeIds.has(b.id);
                                      const shortName = (b.clientName || "Ocupado").split(" ")[0];
                                      return (
                                        <HoverCard key={b.id} openDelay={150} closeDelay={80}>
                                          <HoverCardTrigger asChild>
                                            <button
                                              type="button"
                                              onClick={() => openEditDialog(b)}
                                              className={`h-6 w-full truncate rounded-md border px-1 text-[10px] font-medium transition-colors ${
                                                isEncaixe
                                                  ? "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200"
                                                  : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
                                              }`}
                                            >
                                              {shortName}
                                            </button>
                                          </HoverCardTrigger>
                                          <HoverCardContent className="w-72 text-sm" align="center">
                                            <p className="font-semibold text-foreground">{b.clientName || "Sem nome"}</p>
                                            {b.title && <p className="mt-0.5 text-muted-foreground">{b.title}</p>}
                                            <p className="mt-2 text-xs text-muted-foreground">
                                              {formatDayHeader(d)} às {b.time}
                                              {isEncaixe && " • Encaixe (tem outro agendamento perto)"}
                                            </p>
                                            {b.stationName && (
                                              <p className="mt-1 text-xs text-muted-foreground">Agendado por: {b.stationName}</p>
                                            )}
                                            <p className="mt-2 text-xs font-medium text-teal-700">Clique para editar ou cancelar</p>
                                          </HoverCardContent>
                                        </HoverCard>
                                      );
                                    })}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Clique num horário livre pra preencher o formulário abaixo, num horário ocupado pra editar, ou na data pra ver o resumo do dia.
                </p>
              </div>

              {/* Formulário */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="clientName">Nome do cliente</Label>
                  <Input
                    id="clientName"
                    ref={clientNameRef}
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nome de quem vai receber a visita"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      min={getTodayLocalISO()}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="time">Horário</Label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Descrição / Observação</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Vacina V10, Consulta..."
                    rows={2}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reservando...
                    </>
                  ) : (
                    <>
                      <CalendarPlus className="mr-2 h-4 w-4" /> Reservar horário
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Cada horário reserva cerca de 1h na agenda. Funcionamento: seg-sex 8h-18h, sáb 8h-12h.
                </p>
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmação de encaixe ao criar */}
      <AlertDialog open={!!conflictWarning} onOpenChange={(open) => !open && setConflictWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Horário perto de outro agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              {conflictWarning} Se forem visitas próximas (ex.: casas vizinhas), pode confirmar o encaixe mesmo assim.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConflictWarning(null)}>Escolher outro horário</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConflictWarning(null);
                void doCreateBooking();
              }}
            >
              Encaixar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Editar agendamento existente */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) closeEditFlow(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar agendamento</DialogTitle>
            <DialogDescription>Corrija os dados ou cancele esse horário.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="editClientName">Nome do cliente</Label>
              <Input id="editClientName" value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="editDate">Data</Label>
                <Input id="editDate" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editTime">Horário</Label>
                <Input id="editTime" type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editDescription">Descrição / Observação</Label>
              <Textarea
                id="editDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                required
              />
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleAskCancel}
                disabled={editSaving}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Cancelar horário
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={closeEditFlow} disabled={editSaving}>
                  Fechar
                </Button>
                <Button type="submit" disabled={editSaving}>
                  {editSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Salvar alterações
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de encaixe ao editar, e confirmação de cancelamento —
          nunca junto com o Dialog de edição aberto ao mesmo tempo (dois
          modais empilhados quebram o layout), por isso fecha um pra abrir o
          outro em vez de sobrepor. */}
      <AlertDialog
        open={!!pendingAction}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null);
            if (editingBooking) setEditDialogOpen(true);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === "cancel" ? "Cancelar esse agendamento?" : "Horário perto de outro agendamento"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === "cancel"
                ? `O horário de ${editingBooking?.clientName || "esse cliente"} às ${editingBooking?.time} vai ficar livre de novo.`
                : `${pendingAction?.type === "conflict" ? pendingAction.message : ""} Se forem visitas próximas (ex.: casas vizinhas), pode confirmar o encaixe mesmo assim.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingAction(null);
                setEditDialogOpen(true);
              }}
            >
              {pendingAction?.type === "cancel" ? "Voltar" : "Escolher outro horário"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setPendingAction(null);
                if (pendingAction?.type === "cancel") {
                  void doCancelBooking();
                } else {
                  void doUpdateBooking();
                }
              }}
            >
              {pendingAction?.type === "cancel" ? "Cancelar horário" : "Encaixar mesmo assim"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resumo do dia */}
      <Dialog open={!!summaryDateISO} onOpenChange={(open) => !open && setSummaryDateISO(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Resumo do dia{summaryDateISO ? ` — ${formatDayHeader(new Date(`${summaryDateISO}T12:00:00`))}` : ""}
            </DialogTitle>
            <DialogDescription>
              {summaryOpenSlots.length === 0
                ? "Clínica fechada nesse dia."
                : `${summaryBookings.length} agendamento(s) de ${summaryOpenSlots.length} horário(s) possíveis (já descontando almoço e horário fechado).`}
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
                      {b.time} — {b.clientName || "Sem nome"}
                      {encaixeIds.has(b.id) && <span className="ml-1.5 text-xs font-normal text-amber-700">(encaixe)</span>}
                    </p>
                    {b.title && <p className="truncate text-xs text-muted-foreground">{b.title}</p>}
                    {b.stationName && <p className="truncate text-xs text-muted-foreground">Agendado por: {b.stationName}</p>}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => {
                      setSummaryDateISO(null);
                      openEditDialog(b);
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

      {/* Nome do computador/balcão — só fica salvo nesse navegador
          (localStorage), pra saber de qual aparelho saiu cada reserva. */}
      <Dialog open={stationDialogOpen} onOpenChange={setStationDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Identificar este computador</DialogTitle>
            <DialogDescription>
              Um nome curto pra saber de qual computador saiu cada reserva (ex.: "Balcão 1", "Caixa"). Fica salvo só
              neste navegador — cada computador precisa fazer isso uma vez.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={stationNameInput}
            onChange={(e) => setStationNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSaveStationName();
              }
            }}
            placeholder="Ex.: Balcão 1"
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStationDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveStationName}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookSchedulePage;
