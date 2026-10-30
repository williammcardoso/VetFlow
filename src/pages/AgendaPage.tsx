"use client";

import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { eachDayOfInterval, endOfWeek, format, isSameDay, isToday, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FaArrowLeft, FaCalendarPlus, FaPlus, FaTimes, FaSave, FaCalendarAlt, FaClock, FaUser, FaPaw, FaStickyNote, FaEdit, FaTrashAlt } from "@/components/icons/fa";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { useSchedulesList, useScheduleMutations } from "@/hooks/useSchedules";
import { publicBookingNote, type ScheduleStatus, type ScheduleUI } from "@/lib/schedulesApi";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { CalendarDays, ChevronDown, Globe } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from "@/components/saas/StatusBadge";
import ClientCombobox from "@/components/ClientCombobox";
import { SiWhatsapp } from "react-icons/si";
import { formatScheduleTimeRange, scheduleEndTime } from "@/lib/agendaKinds";
import { KindBadge } from "@/components/agenda/bookingKindVisual";
import { AppointmentNoticeDialog } from "@/components/agenda/AppointmentNoticeDialog";
import { SentBadge } from "@/components/SentBadge";

const AgendaPage = () => {
  const { data: dbClients, isError: isClientsError } = useClientsList();
  const clients = dbClients || [];
  const { data: schedules = [], isLoading, isError, error, refetch } = useSchedulesList();
  const { create, update, remove } = useScheduleMutations();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<ScheduleUI | null>(null);

  const [newAppointmentTitle, setNewAppointmentTitle] = useState("");
  const [newAppointmentTime, setNewAppointmentTime] = useState("09:00");
  const [newAppointmentClientId, setNewAppointmentClientId] = useState<string>("");
  const [newAppointmentAnimalId, setNewAppointmentAnimalId] = useState<string>("");
  const [newAppointmentNotes, setNewAppointmentNotes] = useState("");
  const [newAppointmentStatus, setNewAppointmentStatus] = useState<ScheduleStatus>("scheduled");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [reportStatus, setReportStatus] = useState<"all" | ScheduleStatus>("all");

  const statusLabel: Record<ScheduleStatus, string> = {
    scheduled: "Agendado",
    in_progress: "Em atendimento",
    attended: "Atendido",
    no_show: "Não atendido",
    cancelled: "Cancelado",
  };

  const filteredAnimals = newAppointmentClientId
    ? clients.find((c) => c.id === newAppointmentClientId)?.animals || []
    : [];

  const handleClientChange = (clientId: string) => {
    setNewAppointmentClientId(clientId);
    setNewAppointmentAnimalId("");
  };

  const appointmentsSorted = useMemo(
    () =>
      [...schedules].sort(
        (a, b) => a.date.getTime() - b.date.getTime() || a.time.localeCompare(b.time)
      ),
    [schedules]
  );

  const appointmentsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return appointmentsSorted.filter((app) => isSameDay(app.date, selectedDate));
  }, [appointmentsSorted, selectedDate]);



  const weekDays = useMemo(() => {
    if (!selectedDate) return [];
    const start = startOfWeek(selectedDate, { locale: ptBR, weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { locale: ptBR, weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  const appointmentsByWeekDay = useMemo(() => {
    return weekDays.map((day) => ({
      day,
      items: appointmentsSorted.filter((app) => isSameDay(app.date, day)),
    }));
  }, [appointmentsSorted, weekDays]);

  const appointmentsByMonthDay = useMemo(() => {
    if (!selectedDate) return [];
    const monthItems = appointmentsSorted.filter((app) => app.date.getMonth() === selectedDate.getMonth() && app.date.getFullYear() === selectedDate.getFullYear());
    const grouped = new Map<string, ScheduleUI[]>();
    for (const app of monthItems) {
      const key = format(app.date, "yyyy-MM-dd");
      const list = grouped.get(key) || [];
      list.push(app);
      grouped.set(key, list);
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({ key, date: new Date(`${key}T12:00:00`), items }));
  }, [appointmentsSorted, selectedDate]);

  const appointmentDates = useMemo(
    () => schedules.map((app) => app.date),
    [schedules]
  );
  const appointmentDatesToday = useMemo(
    () => appointmentDates.filter((d) => isToday(d)),
    [appointmentDates]
  );
  const appointmentDatesNotToday = useMemo(
    () => appointmentDates.filter((d) => !isToday(d)),
    [appointmentDates]
  );

  const handleAddAppointmentClick = (date?: Date) => {
    setEditingAppointment(null);
    setNewAppointmentTitle("");
    setNewAppointmentTime("09:00");
    setNewAppointmentClientId("");
    setNewAppointmentAnimalId("");
    setNewAppointmentNotes("");
    setNewAppointmentStatus("scheduled");
    setSelectedDate(date || new Date());
    setIsDialogOpen(true);
  };

  const openEditDialogFor = (appointment: ScheduleUI) => {
    setEditingAppointment(appointment);
    setNewAppointmentTitle(appointment.title);
    setNewAppointmentTime(appointment.time);
    setNewAppointmentClientId(appointment.clientId);
    setNewAppointmentAnimalId(appointment.animalId);
    setNewAppointmentNotes(appointment.notes || "");
    setNewAppointmentStatus(appointment.status || "scheduled");
    setSelectedDate(appointment.date);
    setIsDialogOpen(true);
  };

  // Editar um agendamento cujo horário já passou não é bloqueado (às vezes é
  // exatamente pra corrigir algo depois do fato), mas pede confirmação antes
  // de abrir — sem isso era fácil alterar um horário antigo sem perceber.
  const [pastEditConfirm, setPastEditConfirm] = useState<ScheduleUI | null>(null);
  const isAppointmentPast = (appointment: ScheduleUI) => {
    const [h, m] = appointment.time.split(":").map(Number);
    const dt = new Date(appointment.date);
    dt.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
    return dt.getTime() < Date.now();
  };
  const handleEditAppointmentClick = (appointment: ScheduleUI) => {
    if (isAppointmentPast(appointment)) {
      setPastEditConfirm(appointment);
      return;
    }
    openEditDialogFor(appointment);
  };

  const handleSetStatus = async (app: ScheduleUI, status: ScheduleStatus) => {
    try {
      await update.mutateAsync({ ...app, status });
      toast.success(`Status alterado para "${statusLabel[status]}".`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao atualizar status.";
      toast.error(msg);
    }
  };

  // Aviso pelo WhatsApp: abre a prévia com o texto do serviço (vacina,
  // consulta domiciliar...) e o telefone já achado — dá para conferir antes.
  const [noticeFor, setNoticeFor] = useState<ScheduleUI | null>(null);

  const handleSaveAppointment = async () => {
    if (!newAppointmentTitle || !selectedDate || !newAppointmentTime || !newAppointmentClientId || !newAppointmentAnimalId) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const client = clients.find((c) => c.id === newAppointmentClientId);
    const animal = client?.animals.find((a) => a.id === newAppointmentAnimalId);

    if (!client || !animal) {
      toast.error(isClientsError ? "Falha ao carregar clientes do banco." : "Cliente ou animal selecionado inválido.");
      return;
    }

    const [hours, minutes] = newAppointmentTime.split(":").map(Number);
    const appointmentDateTime = new Date(selectedDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    try {
      if (editingAppointment) {
        await update.mutateAsync({
          ...editingAppointment,
          date: appointmentDateTime,
          time: newAppointmentTime,
          title: newAppointmentTitle,
          clientId: newAppointmentClientId,
          clientName: client.name,
          animalId: newAppointmentAnimalId,
          animalName: animal.name,
          status: newAppointmentStatus,
          notes: newAppointmentNotes,
        });
        toast.success("Agendamento atualizado com sucesso!");
      } else {
        await create.mutateAsync({
          date: appointmentDateTime,
          time: newAppointmentTime,
          title: newAppointmentTitle,
          clientId: newAppointmentClientId,
          clientName: client.name,
          animalId: newAppointmentAnimalId,
          animalName: animal.name,
          status: newAppointmentStatus,
          notes: newAppointmentNotes,
        });
        toast.success("Agendamento criado com sucesso!");
      }
      setIsDialogOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar agendamento.";
      toast.error(msg);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      toast.info("Agendamento excluído.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao excluir agendamento.";
      toast.error(msg);
    }
  };

  const saving = create.isPending || update.isPending;
  const agendaErrorMessage = isError ? (error instanceof Error ? error.message : String(error)) : null;
  const reportData = useMemo(() => {
    const filtered = schedules.filter((s) => {
      const d = s.date;
      const fromOk = reportFrom ? d >= new Date(`${reportFrom}T00:00:00`) : true;
      const toOk = reportTo ? d <= new Date(`${reportTo}T23:59:59`) : true;
      const statusOk = reportStatus === "all" ? true : (s.status || "scheduled") === reportStatus;
      return fromOk && toOk && statusOk;
    });
    const byStatus = filtered.reduce<Record<ScheduleStatus, number>>(
      (acc, item) => {
        const key = item.status || "scheduled";
        acc[key] += 1;
        return acc;
      },
      { scheduled: 0, in_progress: 0, attended: 0, no_show: 0, cancelled: 0 }
    );
    return { filtered, byStatus, total: filtered.length };
  }, [reportFrom, reportTo, reportStatus, schedules]);

  return (
    <PageShell>
      <PageHeader
        title="Agenda"
        description="Gerencie seus agendamentos e consultas com leitura operacional rápida."
        icon={CalendarDays}
        module="clinical"
        breadcrumb={<>Painel &gt; Agenda</>}
        actions={
          <Button asChild variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground transition-colors duration-200">
            <Link to="/">
              <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Link>
          </Button>
        }
      />

      {agendaErrorMessage && (
        <div className="px-6 pt-4">
          <Alert variant="destructive">
            <AlertTitle>Erro ao carregar a agenda</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <span>{agendaErrorMessage}</span>
              <span className="text-xs">
                Confirme se a tabela <code className="rounded bg-muted px-1">schedules</code> existe e as políticas RLS permitem leitura. Veja{" "}
                <code className="rounded bg-muted px-1">supabase/migrations/20260319210000_settings_schedules.sql</code>.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 w-fit border-[hsl(var(--vf-clinical))]/30 text-vf-clinical hover:bg-[hsl(var(--vf-clinical))]/10"
                onClick={() => refetch()}
              >
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Monitor grande: o calendário cresce com a tela (dias maiores) e a lista
          do dia fica com o resto, em cartões compactos. */}
      <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-[24rem_minmax(0,1fr)] 2xl:grid-cols-[28rem_minmax(0,1fr)]">
        <Card className="vf-surface-card vf-tone-clinical card-hover rounded-2xl border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <FaCalendarAlt className="h-5 w-5 text-vf-clinical" /> Calendário
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              className="rounded-md border shadow bg-input w-full"
              disabled={isLoading || isError}
              modifiers={{
                hasAppointments: appointmentDatesNotToday,
                todayWithAppointments: appointmentDatesToday,
              }}
              modifiersClassNames={{
                hasAppointments: "vf-calendar-day-has-appointments",
                todayWithAppointments: "vf-calendar-day-today-has-appointments",
              }}
              // Dias ocupam a largura do cartão (antes 36px fixos e sobrava
              // espaço dos lados) e crescem no monitor grande.
              classNames={{
                months: "w-full",
                month: "w-full space-y-3",
                caption_label: "text-base font-semibold capitalize",
                head_row: "flex w-full",
                head_cell: "flex-1 text-center text-[0.8rem] font-normal text-muted-foreground",
                row: "mt-1.5 flex w-full",
                cell: "relative flex flex-1 items-center justify-center p-0 text-center focus-within:relative focus-within:z-20",
                day: cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-9 w-9 p-0 font-normal tabular-nums aria-selected:opacity-100 sm:h-10 sm:w-10 2xl:h-11 2xl:w-11 2xl:text-base"
                ),
                day_today: "vf-calendar-day-today",
              }}
            />
            <Button
              onClick={() => handleAddAppointmentClick(selectedDate)}
              disabled={isLoading || isError}
              className="mt-4 w-full sm:w-auto rounded-md bg-[hsl(var(--vf-clinical))] font-semibold text-white transition-all duration-200 shadow-md hover:bg-[hsl(var(--vf-clinical)/0.9)] hover:shadow-lg"
            >
              <FaCalendarPlus className="mr-2 h-4 w-4" /> Novo Agendamento
            </Button>
          </CardContent>
        </Card>

        <Card className="vf-surface-card vf-tone-clinical card-hover rounded-2xl border-border/80">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <FaClock className="h-5 w-5 text-vf-clinical" />
                {viewMode === "day" && `Agendamentos para ${selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : "nenhum dia selecionado"}`}
                {viewMode === "week" && `Visão semanal - ${selectedDate ? format(selectedDate, "'semana de' dd/MM", { locale: ptBR }) : ""}`}
                {viewMode === "month" && `Visão mensal - ${selectedDate ? format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR }) : ""}`}
              </CardTitle>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "day" | "week" | "month")}>
                <TabsList className="h-9">
                  <TabsTrigger value="day">Dia</TabsTrigger>
                  <TabsTrigger value="week">Semana</TabsTrigger>
                  <TabsTrigger value="month">Mês</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <p className="text-muted-foreground py-4">Carregando agendamentos...</p>
            ) : isError ? (
              <p className="text-muted-foreground py-4">Não foi possível exibir os agendamentos.</p>
            ) : viewMode === "day" && appointmentsForSelectedDate.length > 0 ? (
              // Cartão compacto: horário numa coluna, ações ao lado do texto
              // (não na outra ponta da tela) e, no monitor grande, dois por linha.
              <div className="grid grid-cols-1 gap-3 min-[1800px]:grid-cols-2">
                {appointmentsForSelectedDate.map((app) => {
                  const end = scheduleEndTime(app.time, app.durationMinutes);
                  const publicNote = publicBookingNote(app.notes);
                  const blocked = app.kind === "bloqueio";
                  const cancelled = app.status === "cancelled";
                  return (
                    <div
                      key={app.id}
                      className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-xl border border-border/80 bg-input/70 p-3 shadow-sm transition-colors duration-200 hover:border-[hsl(var(--vf-clinical))]/40 hover:bg-[hsl(var(--vf-clinical))]/[0.06] sm:grid-cols-[3.5rem_minmax(0,1fr)_auto]"
                    >
                      <div className="pt-0.5">
                        <p className={cn("text-lg font-bold leading-none tabular-nums", cancelled ? "text-muted-foreground line-through" : "text-foreground")}>{app.time}</p>
                        {end && <p className="mt-1 text-[11px] font-medium tabular-nums text-muted-foreground">até {end}</p>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold leading-snug text-foreground">{app.title}</p>
                        {!blocked && (
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
                            <span className="inline-flex min-w-0 items-center gap-1"><FaUser className="h-3 w-3 shrink-0" /> {app.clientName || "Sem nome"}</span>
                            {app.animalName && (
                              <>
                                <span aria-hidden>•</span>
                                <span className="inline-flex min-w-0 items-center gap-1"><FaPaw className="h-3 w-3 shrink-0" /> {app.animalName}</span>
                              </>
                            )}
                          </p>
                        )}
                        {app.kindInfo?.obs && (
                          <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                            <FaStickyNote className="mt-0.5 h-3 w-3 shrink-0" /> Obs.: {app.kindInfo.obs}
                          </p>
                        )}
                        {publicNote ? (
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground" title={app.notes}>
                            <Globe className="h-3 w-3 shrink-0" /> Agenda pública{publicNote.station ? ` · ${publicNote.station}` : ""}
                          </p>
                        ) : (
                          app.notes && (
                            <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                              <FaStickyNote className="mt-0.5 h-3 w-3 shrink-0" /> {app.notes}
                            </p>
                          )
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={app.status || "scheduled"} className="inline-flex" />
                          {app.kind && <KindBadge kind={app.kind} info={app.kindInfo} />}
                          <SentBadge type="schedule" id={app.id} />
                        </div>
                      </div>
                      <div className="col-start-2 flex items-center gap-1 sm:col-start-3 sm:row-start-1 sm:self-start">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" disabled={remove.isPending || update.isPending} className="h-8 w-8 border-[hsl(var(--vf-clinical))]/35 hover:bg-[hsl(var(--vf-clinical))]/12" aria-label="Abrir ações de status">
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem className="text-foreground" onClick={() => void handleSetStatus(app, "scheduled")}>Agendado</DropdownMenuItem>
                            <DropdownMenuItem className="text-foreground" onClick={() => void handleSetStatus(app, "in_progress")}>Em atendimento</DropdownMenuItem>
                            <DropdownMenuItem className="text-foreground" onClick={() => void handleSetStatus(app, "attended")}>Atendido</DropdownMenuItem>
                            <DropdownMenuItem className="text-foreground" onClick={() => void handleSetStatus(app, "no_show")}>Não atendido</DropdownMenuItem>
                            <DropdownMenuItem className="text-foreground" onClick={() => void handleSetStatus(app, "cancelled")}>Cancelado</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {/* Horário bloqueado não tem tutor: o botão fica invisível
                            (não some) para editar/excluir seguirem alinhados. */}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Avisar pelo WhatsApp: ${app.title}`}
                          title="Aviso pelo WhatsApp"
                          onClick={() => setNoticeFor(app)}
                          disabled={blocked}
                          aria-hidden={blocked || undefined}
                          tabIndex={blocked ? -1 : undefined}
                          className={cn("h-8 w-8 rounded-md transition-colors duration-200 hover:bg-[#25D366]/10", blocked && "invisible")}
                        >
                          <SiWhatsapp className="h-4 w-4 text-[#25D366]" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar agendamento ${app.title}`}
                          title={`Editar agendamento ${app.title}`}
                          onClick={() => handleEditAppointmentClick(app)}
                          disabled={remove.isPending}
                          className="h-8 w-8 rounded-md transition-colors duration-200 hover:bg-muted hover:text-foreground"
                        >
                          <FaEdit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Excluir agendamento ${app.title}`}
                          title={`Excluir agendamento ${app.title}`}
                          onClick={() => handleDeleteAppointment(app.id)}
                          disabled={remove.isPending}
                          className="h-8 w-8 rounded-md transition-colors duration-200 hover:bg-muted hover:text-foreground"
                        >
                          <FaTrashAlt className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : viewMode === "week" ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {appointmentsByWeekDay.map(({ day, items }) => (
                  <div key={day.toISOString()} className="rounded-xl border border-border/80 bg-input/60 p-3">
                    <p className="text-sm font-semibold text-foreground">
                      {format(day, "EEE, dd/MM", { locale: ptBR })}
                    </p>
                    {items.length === 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">Sem agendamentos.</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {items.map((app) => (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => handleEditAppointmentClick(app)}
                            className="w-full rounded-lg border border-border/70 bg-card px-2.5 py-2 text-left transition-colors hover:border-[hsl(var(--vf-clinical))]/35"
                          >
                            <p className="text-xs font-semibold text-foreground">{formatScheduleTimeRange(app.time, app.durationMinutes)} - {app.title}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground truncate">{app.clientName} • {app.animalName}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <StatusBadge status={app.status || "scheduled"} className="inline-flex" />
                        {app.kind && <KindBadge kind={app.kind} info={app.kindInfo} />}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : viewMode === "month" ? (
              appointmentsByMonthDay.length > 0 ? (
                <div className="space-y-3">
                  {appointmentsByMonthDay.map(({ key, date, items }) => (
                    <div key={key} className="rounded-xl border border-border/80 bg-input/50 p-3">
                      <p className="text-sm font-semibold text-foreground">
                        {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </p>
                      <div className="mt-2 space-y-2">
                        {items.map((app) => (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => handleEditAppointmentClick(app)}
                            className="w-full rounded-lg border border-border/70 bg-card px-2.5 py-2 text-left transition-colors hover:border-[hsl(var(--vf-clinical))]/35"
                          >
                            <p className="text-xs font-semibold text-foreground">{formatScheduleTimeRange(app.time, app.durationMinutes)} - {app.title}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground truncate">{app.clientName} • {app.animalName}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <StatusBadge status={app.status || "scheduled"} className="inline-flex" />
                        {app.kind && <KindBadge kind={app.kind} info={app.kindInfo} />}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground py-4">Nenhum agendamento neste mês.</p>
              )
            ) : (
              <p className="text-muted-foreground py-4">Nenhum agendamento para este dia.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="vf-surface-card vf-tone-clinical no-card-lift rounded-2xl border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-foreground">Relatório de atendimentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* Filtros com a largura do conteúdo (antes, 4 colunas de 25% cada). */}
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="bg-input sm:w-44" aria-label="De" />
            <Input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="bg-input sm:w-44" aria-label="Até" />
            <Select value={reportStatus} onValueChange={(v) => setReportStatus(v as "all" | ScheduleStatus)}>
              <SelectTrigger className="bg-input sm:w-52">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="scheduled">Agendado</SelectItem>
                <SelectItem value="in_progress">Em atendimento</SelectItem>
                <SelectItem value="attended">Atendido</SelectItem>
                <SelectItem value="no_show">Não atendido</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setReportFrom(""); setReportTo(""); setReportStatus("all"); }}>
              Limpar filtros
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
            <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm"><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold">{reportData.total}</p></div>
            <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm"><p className="text-xs text-muted-foreground">Agendado</p><p className="font-semibold">{reportData.byStatus.scheduled}</p></div>
            <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm"><p className="text-xs text-muted-foreground">Em atendimento</p><p className="font-semibold">{reportData.byStatus.in_progress}</p></div>
            <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm"><p className="text-xs text-muted-foreground">Atendido</p><p className="font-semibold">{reportData.byStatus.attended}</p></div>
            <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm"><p className="text-xs text-muted-foreground">Não atendido</p><p className="font-semibold">{reportData.byStatus.no_show}</p></div>
            <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm"><p className="text-xs text-muted-foreground">Cancelado</p><p className="font-semibold">{reportData.byStatus.cancelled}</p></div>
          </div>

          <div className="max-h-[280px] overflow-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Data/Hora</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Atendimento</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Tutor/Pet</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Ação</th>
                </tr>
              </thead>
              <tbody>
                {reportData.filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-sm text-muted-foreground">Sem atendimentos no filtro selecionado.</td>
                  </tr>
                ) : (
                  reportData.filtered.map((item) => (
                    <tr key={`report-${item.id}`} className="border-b border-border/60">
                      <td className="px-3 py-2">{format(item.date, "dd/MM/yyyy")} {item.time}</td>
                      <td className="px-3 py-2 font-medium">{item.title}</td>
                      <td className="px-3 py-2 text-muted-foreground">{[item.clientName, item.animalName].filter(Boolean).join(" • ")}</td>
                      <td className="px-3 py-2"><StatusBadge status={item.status || "scheduled"} /></td>
                      <td className="px-3 py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="outline" className="h-7 w-7 border-[hsl(var(--vf-clinical))]/35 hover:bg-[hsl(var(--vf-clinical))]/12" aria-label="Abrir ações de status">
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            {item.kind !== "bloqueio" && (
                              <>
                                <DropdownMenuItem className="text-foreground" onClick={() => setNoticeFor(item)}>
                                  <SiWhatsapp className="mr-2 h-3.5 w-3.5 text-[#25D366]" /> Aviso pelo WhatsApp
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem className="text-foreground" onClick={() => void handleSetStatus(item, "scheduled")}>Agendado</DropdownMenuItem>
                            <DropdownMenuItem className="text-foreground" onClick={() => void handleSetStatus(item, "in_progress")}>Em atendimento</DropdownMenuItem>
                            <DropdownMenuItem className="text-foreground" onClick={() => void handleSetStatus(item, "attended")}>Atendido</DropdownMenuItem>
                            <DropdownMenuItem className="text-foreground" onClick={() => void handleSetStatus(item, "no_show")}>Não atendido</DropdownMenuItem>
                            <DropdownMenuItem className="text-foreground" onClick={() => void handleSetStatus(item, "cancelled")}>Cancelar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card shadow-sm border border-border rounded-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">
              {editingAppointment ? "Editar Agendamento" : "Novo Agendamento"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Preencha os detalhes do agendamento.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="appointmentDate" className="text-muted-foreground font-medium">
                Data
              </Label>
              <Input
                id="appointmentDate"
                type="date"
                value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointmentTime" className="text-muted-foreground font-medium">
                Hora
              </Label>
              <Input
                id="appointmentTime"
                type="time"
                value={newAppointmentTime}
                onChange={(e) => setNewAppointmentTime(e.target.value)}
                className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointmentTitle" className="text-muted-foreground font-medium">
                Título/Motivo
              </Label>
              <Input
                id="appointmentTitle"
                placeholder="Ex: Consulta de Rotina"
                value={newAppointmentTitle}
                onChange={(e) => setNewAppointmentTitle(e.target.value)}
                className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientSelect" className="text-muted-foreground font-medium">
                Cliente
              </Label>
              <ClientCombobox
                id="clientSelect"
                clients={clients}
                value={newAppointmentClientId || undefined}
                onChange={(id) => handleClientChange(id ?? "")}
                className="h-10 bg-input rounded-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="animalSelect" className="text-muted-foreground font-medium">
                Animal
              </Label>
              <Select onValueChange={setNewAppointmentAnimalId} value={newAppointmentAnimalId || undefined} disabled={!newAppointmentClientId}>
                <SelectTrigger id="animalSelect" className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200">
                  <SelectValue placeholder="Selecione o animal" />
                </SelectTrigger>
                <SelectContent>
                  {filteredAnimals.map((animal) => (
                    <SelectItem key={animal.id} value={animal.id}>
                      {animal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointmentNotes" className="text-muted-foreground font-medium">
                Observações
              </Label>
              <Textarea
                id="appointmentNotes"
                placeholder="Notas adicionais sobre o agendamento..."
                value={newAppointmentNotes}
                onChange={(e) => setNewAppointmentNotes(e.target.value)}
                className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointmentStatus" className="text-muted-foreground font-medium">
                Status
              </Label>
              <Select value={newAppointmentStatus} onValueChange={(v) => setNewAppointmentStatus(v as ScheduleStatus)}>
                <SelectTrigger id="appointmentStatus" className="bg-input rounded-md border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="in_progress">Em atendimento</SelectItem>
                  <SelectItem value="attended">Atendido</SelectItem>
                  <SelectItem value="no_show">Não atendido</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto bg-card border border-border text-foreground hover:bg-muted rounded-md transition-all duration-200 shadow-sm hover:shadow-md">
              <FaTimes className="mr-2 h-4 w-4" /> Cancelar
            </Button>
            <Button
              onClick={() => void handleSaveAppointment()}
              disabled={saving || isError}
              className="w-full sm:w-auto rounded-md bg-[hsl(var(--vf-clinical))] font-semibold text-white transition-all duration-200 shadow-md hover:bg-[hsl(var(--vf-clinical)/0.9)] hover:shadow-lg"
            >
              <FaSave className="mr-2 h-4 w-4" /> {saving ? "Salvando..." : "Salvar Agendamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AppointmentNoticeDialog appointment={noticeFor} clients={clients} onOpenChange={(open) => !open && setNoticeFor(null)} />

      <AlertDialog open={!!pastEditConfirm} onOpenChange={(open) => !open && setPastEditConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Este horário já passou</AlertDialogTitle>
            <AlertDialogDescription>
              {pastEditConfirm
                ? `"${pastEditConfirm.title}" em ${format(pastEditConfirm.date, "dd/MM/yyyy")} às ${pastEditConfirm.time} já aconteceu (ou já passou da hora). Deseja realmente alterar este agendamento?`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPastEditConfirm(null)}>Não</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const appointment = pastEditConfirm;
                setPastEditConfirm(null);
                if (appointment) openEditDialogFor(appointment);
              }}
            >
              Sim, alterar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
};

export default AgendaPage;
