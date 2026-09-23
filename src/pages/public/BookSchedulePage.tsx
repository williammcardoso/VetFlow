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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, Loader2, PawPrint, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  cancelPublicBooking,
  createSchedule,
  listScheduleTimesInRange,
  updatePublicBooking,
  type ScheduleTimeSummary,
} from "@/lib/schedulesApi";
import { getCompanySettings } from "@/lib/settingsApi";
import { getTodayLocalISO } from "@/lib/utils";
import { useAgendaAvailability } from "@/hooks/useAgendaAvailability";
import { generateSlotsForDay, isMinutesOpen } from "@/lib/agendaAvailabilityApi";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

// Página pública (sem login) — o link vai pro balcão da agropecuária, pra
// eles reservarem horário direto na agenda do veterinário (principalmente
// vacinação a domicílio) sem precisar ligar. `schedules` já tem RLS aberta
// pra `anon` (mesmo padrão usado em document_signatures/documents pras
// outras páginas públicas), então dá pra chamar createSchedule() direto.
// Reserva ~1 intervalo por horário (ver useAgendaAvailability) checando
// conflito com agendamentos existentes no mesmo dia, em vez de adicionar
// coluna de duração (não existe no sistema). Horário aberto/fechado, blocos
// e intervalo entre horários vêm de agenda_weekly_hours/agenda_exceptions/
// agenda_settings (Configuração > Horários da agenda pública) — não são mais
// fixos aqui.
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

  // Horário de funcionamento, exceções e intervalo — configuráveis em
  // Configuração > Horários da agenda pública (cai no horário que era fixo
  // no código, como fallback, se a config ainda não tiver sido aplicada).
  const { weeklyHours, exceptions, settings: availability } = useAgendaAvailability();
  const intervalMinutes = availability.intervalMinutes;
  const getDaySlots = React.useCallback(
    (dateISO: string) => generateSlotsForDay(dateISO, weeklyHours, exceptions, intervalMinutes),
    [weeklyHours, exceptions, intervalMinutes]
  );

  // Janela de 7 dias "rolando" a partir de hoje (não mais presa a
  // segunda-feira): antes, no fim da semana (ex.: sexta) a grade mostrava
  // maioria dos dias já passados e só sobrava 1-2 dias livres, dando a
  // impressão de que não tinha mais horário — sem perceber que dava pra
  // clicar em "próxima semana". `todayISO` é recalculado a cada render (a
  // página já re-renderiza sozinha a cada 10s pelo polling de reservas),
  // então se o balcão deixar a aba aberta atravessando a virada do dia, a
  // janela "puxa" sozinha pro dia novo sem precisar de F5.
  const todayISO = getTodayLocalISO();
  // Minuto atual (recalculado a cada render, mesmo tick do todayISO acima) —
  // usado pra apagar visualmente os horários de HOJE que já passaram (antes
  // só o dia inteiro ficava "passado"; um horário das 8h continuava
  // aparecendo "Livre" e clicável às 16h). Usuários reclamaram que a grade
  // tem informação demais e se perdem — reaproveita a mesma cor já usada
  // pros dias passados em vez de inventar mais uma.
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  // Deslocamento da janela em DIAS a partir de hoje (negativo = passado, pra
  // acompanhar agendamentos que já aconteceram): setinha ao lado da data anda
  // 7 dias, botão grande da esquerda anda 1 dia, o da direita anda 7.
  const [dayOffset, setDayOffset] = React.useState(0);
  const weekStart = React.useMemo(
    () => addDays(new Date(`${todayISO}T12:00:00`), dayOffset),
    [todayISO, dayOffset]
  );
  const weekDays = React.useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const [bookings, setBookings] = React.useState<ScheduleTimeSummary[]>([]);
  const [loadingWeek, setLoadingWeek] = React.useState(true);
  // Só a PRIMEIRA carga troca a grade por "Carregando..."; depois disso a
  // grade fica no lugar (esmaecida) enquanto busca — com a navegação dia a
  // dia, trocar por um spinner minúsculo a cada clique fazia a página pular
  // de altura e o botão redondo (centralizado na caixa) sair de baixo do
  // cursor.
  const [everLoaded, setEverLoaded] = React.useState(false);

  // Grade da semana: todos os horários que aparecem em pelo menos um dia da
  // semana visível — dias com expediente diferente (ex.: sábado até 12h)
  // simplesmente ficam "—" nas linhas que não têm.
  const gridHours = React.useMemo(() => {
    const set = new Set<string>();
    weekDays.forEach((d) => getDaySlots(toISODate(d)).forEach((h) => set.add(h)));
    return Array.from(set).sort();
  }, [weekDays, getDaySlots]);

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
      .finally(() => {
        if (cancelled) return;
        setLoadingWeek(false);
        setEverLoaded(true);
      });
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
      const openSlots = getDaySlots(dISO);
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
  }, [bookings, weekDays, getDaySlots]);

  const clientNameRef = React.useRef<HTMLInputElement>(null);

  // Mais de um horário pro mesmo cliente (ex.: dois pets, ou vacina +
  // consulta) numa reserva só — "horário 1" continua nos campos date/time de
  // sempre; cada linha extra é um horário a mais, criado junto no mesmo
  // envio, com o mesmo nome/descrição.
  const [extraSlots, setExtraSlots] = React.useState<Array<{ id: string; date: string; time: string }>>([]);
  const addExtraSlot = () => {
    setExtraSlots((prev) => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date, time: "" }]);
  };
  const removeExtraSlot = (id: string) => {
    setExtraSlots((prev) => prev.filter((s) => s.id !== id));
  };
  const updateExtraSlot = (id: string, patch: Partial<{ date: string; time: string }>) => {
    setExtraSlots((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, ...patch };
        // Horário escolhido pode não existir mais se a data mudou (ex.: sábado tem menos horário).
        if (patch.date && next.time && !getDaySlots(patch.date).includes(next.time)) next.time = "";
        return next;
      })
    );
  };

  const handlePickSlot = (dateISO: string, slotTime: string) => {
    // Se já tem um horário extra pendente (usuário clicou "+ Agendar outro
    // horário" e ainda não escolheu quando), o clique na grade preenche esse
    // horário extra em vez de substituir o principal — dá pra ir clicando
    // vários horários seguidos pro mesmo cliente sem perder o que já tinha.
    const pendingExtraIndex = extraSlots.findIndex((s) => !s.time);
    if (pendingExtraIndex !== -1) {
      setExtraSlots((prev) => prev.map((s, i) => (i === pendingExtraIndex ? { ...s, date: dateISO, time: slotTime } : s)));
      return;
    }
    setDate(dateISO);
    setTime(slotTime);
    // Depois de escolher o horário no calendário, já manda o foco pro nome
    // do cliente — próximo passo natural, sem precisar rolar/clicar de novo.
    clientNameRef.current?.focus();
  };

  const doCreateBookings = async (slots: Array<{ date: string; time: string }>) => {
    setSaving(true);
    let successCount = 0;
    try {
      for (const slot of slots) {
        const created = await createSchedule({
          date: new Date(`${slot.date}T12:00:00`),
          time: slot.time,
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
        successCount += 1;
        // Atualiza o calendário na hora (linha a linha, não só no fim) — antes
        // o horário recém-reservado só aparecia como "Ocupado" depois de um
        // F5; agora, mesmo se um horário do meio da lista falhar, os
        // anteriores já ficam refletidos na grade em vez de sumir até o
        // próximo polling.
        setBookings((prev) => [
          ...prev,
          {
            id: created.id,
            date: slot.date,
            time: slot.time,
            clientName: clientName.trim(),
            title: description.trim(),
            stationName: stationName.trim() || undefined,
          },
        ]);
      }

      setSuccess(true);
      toast.success(slots.length > 1 ? `${slots.length} horários reservados com sucesso!` : "Horário reservado com sucesso!");
      setClientName("");
      setTime("");
      setDescription("");
      setExtraSlots([]);
    } catch (err) {
      if (successCount > 0) {
        toast.warning(
          `${successCount} de ${slots.length} horário(s) foram reservados antes de um erro. Confira a grade — o(s) que faltou(aram) precisa(m) ser reservado(s) de novo.`
        );
      } else {
        toast.error(err instanceof Error ? err.message : "Erro ao reservar o horário.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const allSlots = [{ date, time }, ...extraSlots.map((s) => ({ date: s.date, time: s.time }))];

    if (!clientName.trim() || !description.trim() || allSlots.some((s) => !s.date || !s.time)) {
      toast.error("Preencha todos os campos (incluindo os horários extras, se adicionou algum).");
      return;
    }

    const chaves = allSlots.map((s) => `${s.date}|${s.time}`);
    if (new Set(chaves).size !== chaves.length) {
      toast.error("Você selecionou o mesmo horário mais de uma vez.");
      return;
    }

    const agora = new Date();
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
    for (const slot of allSlots) {
      if (slot.date < getTodayLocalISO()) {
        toast.error(`A data ${formatDayHeader(new Date(`${slot.date}T12:00:00`))} não pode ser no passado.`);
        return;
      }
      const minutos = toMinutes(slot.time);
      if (minutos === null) {
        toast.error("Horário inválido.");
        return;
      }
      if (slot.date === getTodayLocalISO() && minutos < minutosAgora) {
        toast.error(`O horário ${slot.time} de hoje já passou. Escolha um horário mais adiante.`);
        return;
      }
      if (!isMinutesOpen(slot.date, minutos, weeklyHours, exceptions)) {
        toast.error(`O horário ${slot.time} está fora do funcionamento da clínica em ${formatDayHeader(new Date(`${slot.date}T12:00:00`))}.`);
        return;
      }
    }

    setSaving(true);
    try {
      // Antes "encaixe" (horário perto de outro) virava confirmação em vez de
      // bloqueio -- fazia sentido quando o intervalo era maior. Com a agenda
      // toda em blocos fixos (ex.: 30 min), dois agendamentos só colidem se
      // for o exato mesmo horário -- aí é ocupado mesmo, bloqueia direto.
      const datasUnicas = Array.from(new Set(allSlots.map((s) => s.date)));
      for (const d of datasUnicas) {
        const existing = await listScheduleTimesInRange(d, d);
        const horariosDesseDia = allSlots.filter((s) => s.date === d).map((s) => s.time);
        const ocupado = existing.find((b) => horariosDesseDia.includes(b.time));
        if (ocupado) {
          setSaving(false);
          toast.error(
            `O horário ${ocupado.time} de ${formatDayHeader(new Date(`${d}T12:00:00`))} acabou de ser reservado por outra pessoa. Escolha outro.`
          );
          return;
        }
      }

      await doCreateBookings(allSlots);
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
  const [cancelConfirmOpen, setCancelConfirmOpen] = React.useState(false);

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
    setCancelConfirmOpen(false);
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
    if (!isMinutesOpen(editDate, requestedMinutes, weeklyHours, exceptions)) {
      toast.error("Esse horário está fora do funcionamento da clínica nesse dia.");
      return;
    }

    setEditSaving(true);
    try {
      const existing = await listScheduleTimesInRange(editDate, editDate);
      const conflict = existing.some((b) => b.id !== editingBooking.id && b.time === editTime);
      if (conflict) {
        setEditSaving(false);
        toast.error("Já existe outro agendamento nesse horário. Escolha outro.");
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
    setCancelConfirmOpen(true);
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
  const summaryOpenSlots = summaryDateISO ? getDaySlots(summaryDateISO) : [];

  // Horários que aparecem no <Select> do formulário — inclui o valor atual
  // mesmo se não bater com a configuração vigente (ex.: agendamento antigo
  // feito antes de mudar o horário-padrão), pra nunca sumir um valor já
  // escolhido/salvo.
  const withCurrentOption = (options: string[], current: string): string[] => {
    if (!current || options.includes(current)) return options;
    return [...options, current].sort();
  };
  const timeOptions = date ? withCurrentOption(getDaySlots(date), time) : [];
  const editTimeOptions = editDate ? withCurrentOption(getDaySlots(editDate), editTime) : [];

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

                {/* Espaço reservado nas laterais pra caber os botões redondos
                    sem tapar a última/primeira coluna da grade. */}
                <div className="px-14 sm:px-16">
                  {!everLoaded ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Carregando horários...
                    </div>
                  ) : (
                    <div className={`overflow-x-auto transition-opacity ${loadingWeek ? "pointer-events-none opacity-50" : ""}`}>
                      <table className="w-full min-w-[560px] border-collapse text-xs">
                        <thead>
                          <tr>
                            <th className="sticky left-0 z-10 w-12 border-b border-r border-border/60 bg-card p-1 text-left text-muted-foreground"> </th>
                            {weekDays.map((d) => {
                              const dISO = toISODate(d);
                              const isPast = dISO < todayISO;
                              const isToday = dISO === todayISO;
                              return (
                                <th key={dISO} className={`border-b border-r border-border/40 p-1 text-center font-medium last:border-r-0 ${isPast ? "text-muted-foreground/50" : ""}`}>
                                  <button
                                    type="button"
                                    onClick={() => setSummaryDateISO(dISO)}
                                    title="Ver resumo do dia"
                                    className={`w-full rounded-md px-1 py-0.5 transition-colors hover:bg-muted ${isToday ? "text-teal-700" : ""}`}
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
                              <td className="sticky left-0 z-10 border-b border-r border-border/60 bg-card p-1 text-sm font-bold text-foreground">{hour}</td>
                              {weekDays.map((d) => {
                              const dISO = toISODate(d);
                              const slotMinutes = toMinutes(hour);
                              const isPast =
                                dISO < todayISO ||
                                (dISO === todayISO && slotMinutes !== null && slotMinutes < nowMinutes);
                              const openSlots = getDaySlots(dISO);
                              const isOpen = openSlots.includes(hour);
                              if (!isOpen) {
                                return <td key={dISO} className="border-b border-r border-border/40 p-1 text-center text-muted-foreground/30 last:border-r-0">—</td>;
                              }
                              const cellBookings = bookingsBySlot.get(`${dISO}|${hour}`) || [];
                              const isSelected = date === dISO && time === hour && cellBookings.length === 0;

                              if (cellBookings.length === 0) {
                                return (
                                  <td key={dISO} className="border-b border-r border-border/40 p-1 text-center last:border-r-0">
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
                                <td key={dISO} className="border-b border-r border-border/40 p-1 text-center align-top last:border-r-0">
                                  <div className="flex flex-col gap-0.5">
                                    {cellBookings.map((b) => {
                                      const shortName = (b.clientName || "Ocupado").split(" ")[0];
                                      return (
                                        <HoverCard key={b.id} openDelay={150} closeDelay={80}>
                                          <HoverCardTrigger asChild>
                                            <button
                                              type="button"
                                              onClick={() => openEditDialog(b)}
                                              className={`h-6 w-full truncate rounded-md border px-1 text-[10px] font-medium transition-colors ${
                                                isPast
                                                  ? "border-transparent bg-muted text-muted-foreground/50"
                                                  : "border-orange-300 bg-orange-100 text-orange-900 hover:bg-orange-200"
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
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Clique num horário livre pra preencher o formulário abaixo, num horário ocupado pra editar, ou na data pra ver o resumo do dia.
                </p>

                {/* Botões redondos grandes, dentro do gutter reservado acima —
                    os chevrons pequenos passavam despercebidos, e sem eles
                    dava a impressão de que não tinha mais horário quando o
                    fim da semana visível ficava todo no passado. Esquerda
                    anda 1 dia pra trás (dá pra acompanhar o passado); direita
                    anda 1 semana pra frente. */}
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
                      onChange={(e) => {
                        const nextDate = e.target.value;
                        setDate(nextDate);
                        // Horário escolhido pode não existir mais no dia novo
                        // (ex.: sábado tem menos horário que dia de semana).
                        if (time && !getDaySlots(nextDate).includes(time)) setTime("");
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="time">Horário</Label>
                    <Select value={time} onValueChange={setTime} disabled={!date}>
                      <SelectTrigger id="time">
                        <SelectValue placeholder={!date ? "Escolha a data" : timeOptions.length === 0 ? "Fechado nesse dia" : "Selecione"} />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Mais de um horário pro mesmo cliente (ex.: dois pets, ou
                    vacina + consulta) — cada linha extra some/edita
                    independente, e a grade acima preenche a próxima linha
                    vazia em vez do horário 1 quando tem alguma pendente. */}
                {extraSlots.length > 0 && (
                  <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Outros horários para {clientName.trim() || "este cliente"}
                    </p>
                    {extraSlots.map((slot, idx) => {
                      const opts = slot.date ? withCurrentOption(getDaySlots(slot.date), slot.time) : [];
                      return (
                        <div key={slot.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Data {idx + 2}</Label>
                            <Input
                              type="date"
                              min={getTodayLocalISO()}
                              value={slot.date}
                              onChange={(e) => updateExtraSlot(slot.id, { date: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Horário {idx + 2}</Label>
                            <Select
                              value={slot.time}
                              onValueChange={(v) => updateExtraSlot(slot.id, { time: v })}
                              disabled={!slot.date}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={opts.length === 0 ? "Fechado" : "Selecione"} />
                              </SelectTrigger>
                              <SelectContent>
                                {opts.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeExtraSlot(slot.id)}
                            title="Remover este horário"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <Button type="button" variant="outline" size="sm" onClick={addExtraSlot} className="w-full">
                  <Plus className="mr-2 h-4 w-4" /> Agendar outro horário para este cliente
                </Button>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Descrição / Observação</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={"Ex: Vacina V10, Consulta...\nCONSULTA DEVE MARCAR PELO MENOS 1 HORA (2 horários seguidos)"}
                    rows={3}
                    required
                  />
                  <p className="text-xs font-medium text-amber-700">
                    Consulta demora mais que {intervalMinutes} min — marque pelo menos 1 hora (2 horários seguidos) pra não conflitar com o próximo agendamento.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reservando...
                    </>
                  ) : (
                    <>
                      <CalendarPlus className="mr-2 h-4 w-4" />{" "}
                      {extraSlots.length > 0 ? `Reservar ${1 + extraSlots.length} horários` : "Reservar horário"}
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Horários com intervalo de {intervalMinutes} min, conforme o expediente de cada dia.
                </p>
              </form>
            </div>
          )}
        </CardContent>
      </Card>

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
                <Input
                  id="editDate"
                  type="date"
                  value={editDate}
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    setEditDate(nextDate);
                    if (editTime && !getDaySlots(nextDate).includes(editTime)) setEditTime("");
                  }}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editTime">Horário</Label>
                <Select value={editTime} onValueChange={setEditTime} disabled={!editDate}>
                  <SelectTrigger id="editTime">
                    <SelectValue placeholder={editTimeOptions.length === 0 ? "Fechado nesse dia" : "Selecione"} />
                  </SelectTrigger>
                  <SelectContent>
                    {editTimeOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

      {/* Confirmação de cancelamento — nunca junto com o Dialog de edição
          aberto ao mesmo tempo (dois modais empilhados quebram o layout),
          por isso fecha um pra abrir o outro em vez de sobrepor. */}
      <AlertDialog
        open={cancelConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCancelConfirmOpen(false);
            if (editingBooking) setEditDialogOpen(true);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esse agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O horário de {editingBooking?.clientName || "esse cliente"} às {editingBooking?.time} vai ficar livre de novo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setCancelConfirmOpen(false);
                setEditDialogOpen(true);
              }}
            >
              Voltar
            </AlertDialogCancel>
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
