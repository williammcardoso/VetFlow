import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCatalog as getCatalogApi } from "@/lib/catalogApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/saas/StatusBadge";
import DashboardStatusStrip from "@/components/saas/DashboardStatusStrip";
import { PageHeader } from "@/components/saas/PageHeader";
import { useScheduleMutations } from "@/hooks/useSchedules";
import type { ScheduleStatus, ScheduleUI } from "@/lib/schedulesApi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { SiWhatsapp } from "react-icons/si";
import { sendAppointmentReminderViaWhatsApp } from "@/lib/whatsappShare";
import {
  LayoutDashboard,
  AlertTriangle,
  PawPrint,
  ShoppingCart,
  Package,
  Stethoscope,
  Clock3,
  BarChart3,
  CalendarDays,
  ChevronDown,
  RotateCcw,
  Syringe,
} from "lucide-react";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { useSchedulesList } from "@/hooks/useSchedules";
import { useAppointments } from "@/hooks/useAppointments";
import { PageShell } from "@/components/saas/PageShell";
import { Link } from "react-router-dom";
import { getPatientRecordPath } from "@/utils/patientDisplayId";

const Dashboard = () => {
  const { data: dbClients, isError } = useClientsList();
  const { data: schedules = [] } = useSchedulesList();
  const { update } = useScheduleMutations();
  const { appointments: allAppointments } = useAppointments();
  const { data: catalogItems = [] } = useQuery({ queryKey: ["catalog"], queryFn: getCatalogApi });
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const oneDayMs = 24 * 60 * 60 * 1000;

  // "YYYY-MM-DD" puro vira meia-noite UTC se parseado direto; em fuso negativo
  // (Brasil, UTC-3) isso volta pro dia anterior. Forcar hora local evita o bug.
  const parseLocalDate = (dateStr: string) => new Date(`${dateStr}T00:00:00`);

  // Rótulo do cabeçalho de grupo na Agenda Imediata: HOJE / AMANHÃ / dia da
  // semana + data, pra não precisar ler a data completa em cada linha.
  const scheduleGroupLabel = (itemDate: Date, reference: Date) => {
    const d0 = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
    const d1 = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
    const diffDays = Math.round((d1.getTime() - d0.getTime()) / oneDayMs);
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Amanhã";
    return itemDate
      .toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })
      .replace(".", "");
  };

  const toScheduleDateTime = (app: ScheduleUI) => {
    const dt = new Date(app.date);
    const [h = 0, m = 0] = (app.time || "00:00").split(":").map(Number);
    dt.setHours(h, m, 0, 0);
    return dt;
  };

  const toAppointmentDateTime = (app: { date: string; time?: string }) => {
    const dt = parseLocalDate(app.date);
    const [h = 0, m = 0] = (app.time || "00:00").split(":").map(Number);
    dt.setHours(h, m, 0, 0);
    return dt;
  };

  // Counts from appointments table (medical records actually done)
  const appointmentsThisMonthList = allAppointments.filter((app) => {
    const d = toAppointmentDateTime(app);
    return d >= startOfMonth && d <= endOfMonth;
  });
  const appointmentsThisMonth = appointmentsThisMonthList.length;

  const monthTypeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    appointmentsThisMonthList.forEach((a) => {
      const t = a.type || "Outros";
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAppointments, now.getMonth(), now.getFullYear()]);

  const last24hAppointments = allAppointments.filter((app) => {
    const d = toAppointmentDateTime(app);
    const diff = now.getTime() - d.getTime();
    return diff >= 0 && diff <= oneDayMs;
  }).length;

  const appointmentsToday = allAppointments.filter((app) => {
    const d = toAppointmentDateTime(app);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }).length;

  const lowStockCount = catalogItems.filter(
    (it) => it.type === "product" && typeof it.stockQty === "number" && it.stockQty <= 5
  ).length;

  const totalAnimals = (dbClients || []).reduce((acc, c) => acc + (c.animals?.length || 0), 0);

  // Upcoming = agenda calendar (schedules table), not medical records
  const upcomingAll = [...schedules]
    .sort((a, b) => toScheduleDateTime(a).getTime() - toScheduleDateTime(b).getTime())
    .filter((a) => {
      const itemDate = toScheduleDateTime(a);
      const isToday =
        itemDate.getFullYear() === now.getFullYear() &&
        itemDate.getMonth() === now.getMonth() &&
        itemDate.getDate() === now.getDate();
      if (isToday) return true;
      const status = a.status || "scheduled";
      if (status === "attended" || status === "cancelled" || status === "no_show") return false;
      return itemDate.getTime() >= now.getTime();
    });
  // Antes cortava em 3 (`.slice(0, 3)`) mas o badge ao lado mostrava a
  // contagem real (ex.: "7 eventos") — usuário via o número maior sem
  // conseguir ver os outros. Mostra todos, com scroll no card.
  const upcoming = upcomingAll;
  const todayLabel = now.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const in7days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const animalMap = useMemo(() => {
    const map = new Map<string, { animalName: string; clientName: string; clientId: string; patientCode?: number }>();
    for (const client of (dbClients || [])) {
      for (const animal of (client.animals || [])) {
        map.set(animal.id, { animalName: animal.name, clientName: client.name, clientId: client.id, patientCode: animal.patientCode });
      }
    }
    return map;
  }, [dbClients]);

  const returnsThisWeek = useMemo(() => {
    return allAppointments
      .filter((app) => {
        const days = (app.details as Record<string, unknown>)?.retornoRecomendadoEmDias as number | undefined;
        if (!days) return false;
        const returnDate = new Date(parseLocalDate(app.date).getTime() + days * 86400000);
        return returnDate >= today && returnDate <= in7days;
      })
      .map((app) => {
        const days = (app.details as Record<string, unknown>).retornoRecomendadoEmDias as number;
        const returnDate = new Date(parseLocalDate(app.date).getTime() + days * 86400000);
        const info = animalMap.get(app.animalId);
        return { animalId: app.animalId, animalName: info?.animalName ?? "Pet", clientName: info?.clientName ?? "Tutor", clientId: info?.clientId, patientCode: info?.patientCode, returnDate };
      })
      .slice(0, 5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAppointments, animalMap]);

  const vaccinesThisWeek = useMemo(() => {
    return allAppointments
      .filter((app) => {
        if (app.type !== "Vacina") return false;
        const nextDose = (app.details as Record<string, unknown>)?.proximaDose as string | undefined;
        if (!nextDose) return false;
        const doseDate = parseLocalDate(nextDose);
        return doseDate >= today && doseDate <= in7days;
      })
      .map((app) => {
        const d = app.details as Record<string, unknown>;
        const doseDate = parseLocalDate(d.proximaDose as string);
        const info = animalMap.get(app.animalId);
        return { animalId: app.animalId, animalName: info?.animalName ?? "Pet", clientName: info?.clientName ?? "Tutor", clientId: info?.clientId, patientCode: info?.patientCode, doseDate, vaccine: (d.tipoVacina as string) || "Vacina" };
      })
      .slice(0, 5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAppointments, animalMap]);

  const hasWeekAlerts = returnsThisWeek.length > 0 || vaccinesThisWeek.length > 0;

  const handleStatusChange = async (app: ScheduleUI, status: ScheduleStatus) => {
    await update.mutateAsync({ ...app, status });
  };

  const handleSendWhatsAppReminder = (app: ScheduleUI) => {
    const client = (dbClients || []).find((c) => c.id === app.clientId);
    const phone = client?.mainPhoneContact;
    if (!phone) {
      toast.error(
        app.clientId
          ? "Este cliente não tem telefone cadastrado."
          : "Esse agendamento não tem cliente cadastrado vinculado (provavelmente veio da agenda pública) — não dá pra saber o telefone."
      );
      return;
    }
    sendAppointmentReminderViaWhatsApp(phone, {
      clientName: app.clientName || "tutor(a)",
      animalName: app.animalName,
      title: app.title,
      date: app.date,
      time: app.time,
    });
  };

  return (
    <PageShell className="space-y-4 font-sans">
      <PageHeader
        title="Painel de Controle"
        description="Panorama operacional diário da clínica."
        icon={LayoutDashboard}
        module="clinical"
        breadcrumb={<>Painel &gt; Dashboard</>}
        actions={
          <div className="flex items-center gap-2">
            <Badge className="h-8 rounded-full bg-violet-100 px-3 text-xs font-semibold text-violet-700">
              {todayLabel}
            </Badge>
            <Link to="/clinical/appointments-report?period=today">
              <Badge className="h-8 cursor-pointer rounded-full bg-emerald-100 px-3 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-200">
                {appointmentsToday} hoje
              </Badge>
            </Link>
          </div>
        }
      />

      <DashboardStatusStrip
        attendedToday={appointmentsToday}
        weeklyAlerts={returnsThisWeek.length + vaccinesThisWeek.length}
        lowStockCount={lowStockCount}
      />

      <Card className="rounded-2xl vf-surface-card vf-tone-clinical p-4 sm:p-5">
        <div className="mb-2.5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[1.08rem] font-semibold tracking-tight text-foreground">Indicadores principais</h2>
          </div>
          <BarChart3 className="h-[18px] w-[18px] text-vf-clinical" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link
            to="/clinical/appointments-report?period=this_month"
            className="block min-h-[152px] rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-[18px] transition-all duration-200 hover:-translate-y-1 hover:border-emerald-400/70 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Atendimentos no mês</p>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Stethoscope className="h-6 w-6" />
              </span>
            </div>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-emerald-700">{appointmentsThisMonth}</p>
            {monthTypeBreakdown.length > 0 ? (
              <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                {monthTypeBreakdown.map(([type, count]) => `${count} ${type}`).join(" / ")}
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">Nenhum atendimento registrado neste mes.</p>
            )}
          </Link>

          <Card className="min-h-[152px] rounded-2xl border border-sky-200/80 bg-sky-50/50 p-[18px] transition-all duration-200 hover:-translate-y-1 hover:border-sky-400/70 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Animais ativos</p>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <PawPrint className="h-6 w-6" />
              </span>
            </div>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-sky-700">{totalAnimals}</p>
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
              {isError ? "Falha ao carregar clientes." : "Base assistencial ativa."}
            </p>
          </Card>

          <Link
            to="/clinical/appointments-report?period=today"
            className="block min-h-[152px] rounded-2xl border border-violet-200/80 bg-violet-50/50 p-[18px] transition-all duration-200 hover:-translate-y-1 hover:border-violet-400/70 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Atendimentos 24h</p>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Clock3 className="h-6 w-6" />
              </span>
            </div>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-violet-700">{last24hAppointments}</p>
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">Produção clínica nas últimas 24h. Ver relatório.</p>
          </Link>

          <Link
            to="/stock/products-services"
            className="block min-h-[152px] rounded-2xl border border-amber-200/80 bg-amber-50/55 p-[18px] transition-all duration-200 hover:-translate-y-1 hover:border-amber-400/70 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estoque crítico</p>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <AlertTriangle className="h-6 w-6" />
              </span>
            </div>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-amber-700">{lowStockCount}</p>
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">Itens com reposição operacional urgente.</p>
          </Link>
        </div>
      </Card>

      {hasWeekAlerts && (
        <Card className="rounded-2xl vf-surface-card vf-tone-clinical p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[1.08rem] font-semibold tracking-tight text-foreground">Alertas da semana</h2>
              <p className="text-xs text-muted-foreground">Acompanhamentos e vacinas nos próximos 7 dias.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {returnsThisWeek.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-orange-600">
                  <RotateCcw className="h-3.5 w-3.5" /> Acompanhamentos previstos
                </p>
                <div className="space-y-2">
                  {returnsThisWeek.map((r, i) => (
                    <div key={`ret-${r.animalId}-${i}`} className="flex items-center justify-between rounded-lg border border-orange-200/70 bg-orange-50/50 px-3 py-2">
                      <div className="min-w-0">
                        {r.clientId ? (
                          <Link to={getPatientRecordPath(r.clientId, r.animalId, r.patientCode)} className="truncate text-sm font-semibold text-foreground hover:underline">{r.animalName}</Link>
                        ) : (
                          <p className="truncate text-sm font-semibold text-foreground">{r.animalName}</p>
                        )}
                        <p className="truncate text-xs text-muted-foreground">{r.clientName}</p>
                      </div>
                      <span className="ml-2 shrink-0 text-xs font-medium text-orange-700">
                        {r.returnDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {vaccinesThisWeek.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue-600">
                  <Syringe className="h-3.5 w-3.5" /> Vacinas a aplicar
                </p>
                <div className="space-y-2">
                  {vaccinesThisWeek.map((v, i) => (
                    <div key={`vac-${v.animalId}-${i}`} className="flex items-center justify-between rounded-lg border border-blue-200/70 bg-blue-50/50 px-3 py-2">
                      <div className="min-w-0">
                        {v.clientId ? (
                          <Link to={getPatientRecordPath(v.clientId, v.animalId, v.patientCode)} className="truncate text-sm font-semibold text-foreground hover:underline">{v.animalName}</Link>
                        ) : (
                          <p className="truncate text-sm font-semibold text-foreground">{v.animalName}</p>
                        )}
                        <p className="truncate text-xs text-muted-foreground">{v.clientName} · {v.vaccine}</p>
                      </div>
                      <span className="ml-2 shrink-0 text-xs font-medium text-blue-700">
                        {v.doseDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card className="min-h-[236px] h-full rounded-2xl vf-surface-card vf-tone-clinical p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agenda imediata</p>
              <h2 className="text-[1.08rem] font-semibold tracking-tight text-foreground">Próximos atendimentos</h2>
            </div>
            <Badge className="h-7 rounded-full bg-[hsl(var(--vf-clinical))]/25 px-2.5 text-xs font-semibold text-vf-clinical shadow-sm">
              {upcomingAll.length} eventos
            </Badge>
          </div>

          {upcoming.length > 0 ? (
            <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
              {(() => {
                let lastGroupKey = "";
                return upcoming.map((app) => {
                  const itemDate = toScheduleDateTime(app);
                  const groupKey = itemDate.toDateString();
                  const showHeader = groupKey !== lastGroupKey;
                  lastGroupKey = groupKey;
                  const groupLabel = scheduleGroupLabel(itemDate, now);
                  return [
                    showHeader ? (
                      <p
                        key={`h-${groupKey}`}
                        className="sticky top-0 z-10 -mx-1 mb-1.5 mt-4 bg-card px-1 pb-0.5 text-2xl font-extrabold tracking-tight text-vf-clinical first:mt-0"
                      >
                        {groupLabel}
                      </p>
                    ) : null,
                    <Card key={app.id} className="rounded-xl border border-border/70 bg-card px-3 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:border-vf-clinical/70">
                      <div className="flex items-center gap-3">
                        <p className="w-[60px] shrink-0 text-xl font-bold tabular-nums text-vf-clinical">{app.time}</p>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{app.animalName || "Pet"}</p>
                          <p className="truncate text-xs text-muted-foreground">{app.clientName || "Tutor"} - {app.title}</p>
                        </div>
                        <StatusBadge status={app.status || "scheduled"} className="shrink-0 inline-flex" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="outline" className="h-7 w-7 shrink-0 rounded-md border-[hsl(var(--vf-clinical))]/35 hover:bg-[hsl(var(--vf-clinical))]/12" aria-label="Abrir ações de status">
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem className="text-[11px] text-foreground" onClick={() => handleSendWhatsAppReminder(app)}>
                              <SiWhatsapp className="mr-2 h-3.5 w-3.5 text-[#25D366]" /> Enviar lembrete por WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-[11px] text-foreground" onClick={() => void handleStatusChange(app, "scheduled")}>Agendado</DropdownMenuItem>
                            <DropdownMenuItem className="text-[11px] text-foreground" onClick={() => void handleStatusChange(app, "in_progress")}>Em atendimento</DropdownMenuItem>
                            <DropdownMenuItem className="text-[11px] text-foreground" onClick={() => void handleStatusChange(app, "attended")}>Atendido</DropdownMenuItem>
                            <DropdownMenuItem className="text-[11px] text-foreground" onClick={() => void handleStatusChange(app, "no_show")}>Não atendido</DropdownMenuItem>
                            <DropdownMenuItem className="text-[11px] text-foreground" onClick={() => void handleStatusChange(app, "cancelled")}>Cancelado</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>,
                  ];
                });
              })()}
            </div>
          ) : null}
          {upcoming.length > 0 ? (
            <Link
              to="/agenda"
              className="mt-2.5 inline-flex items-center text-xs font-medium text-vf-clinical hover:underline"
            >
              Ver agenda completa →
            </Link>
          ) : (
            <div className="rounded-xl border border-dashed border-border/65 bg-muted/35 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--vf-clinical)/0.12)] text-vf-clinical">
                  <CalendarDays className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Sem atendimentos imediatos</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">Janela livre no curto prazo para organizar encaixes.</p>
                  <Button asChild size="sm" className="mt-1.5 h-8 rounded-lg px-3 text-xs font-medium">
                    <Link to="/agenda">Criar agendamento</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="h-full rounded-2xl vf-surface-card vf-tone-clinical p-4 sm:p-5">
          <div className="mb-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ações rápidas</p>
            <h2 className="text-[1.08rem] font-semibold tracking-tight text-foreground">Atalhos operacionais</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              to="/agenda"
              className="group flex h-full min-h-[104px] rounded-xl border border-blue-300/75 bg-blue-50/65 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-blue-500 hover:shadow-md"
            >
              <div className="flex w-full items-start gap-2.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <CalendarDays className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-tight text-foreground">Organizar agenda</p>
                  <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted-foreground">Ajustar horários e prioridades.</p>
                </div>
              </div>
            </Link>

            <Link
              to="/animals/add"
              className="group flex h-full min-h-[104px] rounded-xl border border-emerald-300/75 bg-emerald-50/65 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500 hover:shadow-md"
            >
              <div className="flex w-full items-start gap-2.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <PawPrint className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-tight text-foreground">Cadastrar pet</p>
                  <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted-foreground">Adicionar novo paciente.</p>
                </div>
              </div>
            </Link>

            <Link
              to="/sales/pos"
              className="group flex h-full min-h-[104px] rounded-xl border border-violet-300/75 bg-violet-50/65 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-violet-500 hover:shadow-md"
            >
              <div className="flex w-full items-start gap-2.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <ShoppingCart className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-tight text-foreground">Nova venda</p>
                  <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted-foreground">Registrar venda em balcão.</p>
                </div>
              </div>
            </Link>

            <Link
              to="/stock/products-services"
              className="group flex h-full min-h-[104px] rounded-xl border border-amber-300/80 bg-amber-50/65 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-amber-500 hover:shadow-md"
            >
              <div className="flex w-full items-start gap-2.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <Package className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-tight text-foreground">Ver estoque</p>
                  <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted-foreground">Reposição e itens críticos.</p>
                </div>
              </div>
            </Link>
          </div>
        </Card>
      </div>
    </PageShell>
  );
};

export default Dashboard;