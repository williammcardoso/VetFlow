import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/saas/StatusBadge";
import DashboardStatusStrip from "@/components/saas/DashboardStatusStrip";
import { getCatalog } from "@/mockData/catalog";
import { PageHeader } from "@/components/saas/PageHeader";
import { useScheduleMutations } from "@/hooks/useSchedules";
import type { ScheduleStatus, ScheduleUI } from "@/lib/schedulesApi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "lucide-react";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { useSchedulesList } from "@/hooks/useSchedules";
import { PageShell } from "@/components/saas/PageShell";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { data: dbClients, isError } = useClientsList();
  const { data: schedules = [] } = useSchedulesList();
  const { update } = useScheduleMutations();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const oneDayMs = 24 * 60 * 60 * 1000;

  const toDateTime = (app: ScheduleUI) => {
    const dt = new Date(app.date);
    const [h = 0, m = 0] = (app.time || "00:00").split(":").map(Number);
    dt.setHours(h, m, 0, 0);
    return dt;
  };

  const appointmentsThisMonth = schedules.filter((app) => {
    const d = toDateTime(app);
    return d >= startOfMonth && d <= endOfMonth;
  }).length;

  const last24hAppointments = schedules.filter((app) => {
    const d = toDateTime(app);
    const diff = now.getTime() - d.getTime();
    return diff >= 0 && diff <= oneDayMs;
  }).length;

  const lowStockCount = getCatalog().filter(
    (it) => it.type === "product" && typeof it.stockQty === "number" && it.stockQty <= 5
  ).length;

  const totalAnimals = (dbClients || []).reduce((acc, c) => acc + (c.animals?.length || 0), 0);

  const upcoming = [...schedules]
    .sort((a, b) => {
      const da = toDateTime(a).getTime();
      const db = toDateTime(b).getTime();
      return da - db;
    })
    .filter((a) => {
      const itemDate = toDateTime(a);
      const isToday =
        itemDate.getFullYear() === now.getFullYear() &&
        itemDate.getMonth() === now.getMonth() &&
        itemDate.getDate() === now.getDate();
      if (isToday) return true;
      const status = a.status || "scheduled";
      if (status === "attended" || status === "cancelled" || status === "no_show") return false;
      return itemDate.getTime() >= now.getTime();
    })
    .slice(0, 3);

  const appointmentsToday = schedules.filter((app) => {
    const d = toDateTime(app);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }).length;
  const operationalAlerts = lowStockCount > 0 ? 1 : 0;
  const todayLabel = now.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

  const handleStatusChange = async (app: ScheduleUI, status: ScheduleStatus) => {
    await update.mutateAsync({ ...app, status });
  };

  return (
    <PageShell className="space-y-4 font-sans">
      <PageHeader
        title="Painel de Controle"
        description="Panorama operacional diario da clinica."
        icon={LayoutDashboard}
        module="clinical"
        breadcrumb={<>Painel &gt; Dashboard</>}
        className="mb-0 rounded-2xl border border-border/70 bg-card px-6 py-4 shadow-sm"
        breadcrumbClassName="mb-1 text-xs text-muted-foreground"
        titleClassName="text-3xl font-semibold tracking-tight"
        descriptionClassName="mt-1 text-sm text-muted-foreground line-clamp-1"
        iconWrapperClassName="h-11 w-11 rounded-[14px]"
        iconClassName="h-5 w-5"
        actions={
          <div className="flex items-center gap-2">
            <Badge className="h-8 rounded-full bg-violet-100 px-3 text-xs font-semibold text-violet-700">
              {todayLabel}
            </Badge>
            <Badge className="h-8 rounded-full bg-emerald-100 px-3 text-xs font-semibold text-emerald-700">
              {appointmentsToday} hoje
            </Badge>
          </div>
        }
      />

      <DashboardStatusStrip
        appointmentsToday={appointmentsToday}
        upcomingCount={upcoming.length}
        operationalAlerts={operationalAlerts}
      />

      <Card className="rounded-2xl border border-border/65 bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-2.5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[1.08rem] font-semibold tracking-tight text-foreground">Indicadores principais</h2>
          </div>
          <BarChart3 className="h-[18px] w-[18px] text-vf-clinical" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="min-h-[152px] rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-[18px] transition-all duration-200 hover:-translate-y-1 hover:border-emerald-400/70 hover:shadow-md dark:border-emerald-700/40 dark:bg-emerald-950/20">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Consultas no mes</p>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/45 dark:text-emerald-300">
                <Stethoscope className="h-6 w-6" />
              </span>
            </div>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-emerald-700 dark:text-emerald-300">{appointmentsThisMonth}</p>
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">Volume assistencial do mes atual.</p>
          </Card>

          <Card className="min-h-[152px] rounded-2xl border border-sky-200/80 bg-sky-50/50 p-[18px] transition-all duration-200 hover:-translate-y-1 hover:border-sky-400/70 hover:shadow-md dark:border-sky-700/40 dark:bg-sky-950/20">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Animais ativos</p>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/45 dark:text-sky-300">
                <PawPrint className="h-6 w-6" />
              </span>
            </div>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-sky-700 dark:text-sky-300">{totalAnimals}</p>
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
              {isError ? "Falha ao carregar clientes." : "Base assistencial ativa."}
            </p>
          </Card>

          <Card className="min-h-[152px] rounded-2xl border border-violet-200/80 bg-violet-50/50 p-[18px] transition-all duration-200 hover:-translate-y-1 hover:border-violet-400/70 hover:shadow-md dark:border-violet-700/40 dark:bg-violet-950/20">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Atendimentos 24h</p>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/45 dark:text-violet-300">
                <Clock3 className="h-6 w-6" />
              </span>
            </div>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-violet-700 dark:text-violet-300">{last24hAppointments}</p>
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">Producao clinica consolidada em 24h.</p>
          </Card>

          <Card className="min-h-[152px] rounded-2xl border border-amber-200/80 bg-amber-50/55 p-[18px] transition-all duration-200 hover:-translate-y-1 hover:border-amber-400/70 hover:shadow-md dark:border-amber-700/40 dark:bg-amber-950/20">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estoque critico</p>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/45 dark:text-amber-300">
                <AlertTriangle className="h-6 w-6" />
              </span>
            </div>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-amber-700 dark:text-amber-300">{lowStockCount}</p>
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">Itens com reposicao operacional urgente.</p>
          </Card>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card className="min-h-[236px] h-full rounded-2xl border border-border/65 bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agenda imediata</p>
              <h2 className="text-[1.08rem] font-semibold tracking-tight text-foreground">Proximos atendimentos</h2>
            </div>
            <Badge className="h-7 rounded-full bg-[hsl(var(--vf-clinical))]/25 px-2.5 text-xs font-semibold text-vf-clinical shadow-sm">
              {upcoming.length} eventos
            </Badge>
          </div>

          {upcoming.length > 0 ? (
            <div className="space-y-2.5">
              {upcoming.map((app) => {
                return (
                  <Card key={app.id} className="rounded-xl border border-border/70 bg-card p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-vf-clinical/70">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{app.animalName || "Pet"}</p>
                        <p className="truncate text-sm text-muted-foreground">{app.clientName || "Tutor"} - {app.title}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {toDateTime(app).toLocaleDateString("pt-BR")} às {app.time}
                        </p>
                        <StatusBadge status={app.status || "scheduled"} className="mt-1 inline-flex" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="outline" className="h-7 w-7 rounded-md border-[hsl(var(--vf-clinical))]/35 hover:bg-[hsl(var(--vf-clinical))]/12" aria-label="Abrir ações de status">
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem className="text-[11px] text-foreground" onClick={() => void handleStatusChange(app, "scheduled")}>Agendado</DropdownMenuItem>
                          <DropdownMenuItem className="text-[11px] text-foreground" onClick={() => void handleStatusChange(app, "in_progress")}>Em atendimento</DropdownMenuItem>
                          <DropdownMenuItem className="text-[11px] text-foreground" onClick={() => void handleStatusChange(app, "attended")}>Atendido</DropdownMenuItem>
                          <DropdownMenuItem className="text-[11px] text-foreground" onClick={() => void handleStatusChange(app, "no_show")}>Não atendido</DropdownMenuItem>
                          <DropdownMenuItem className="text-[11px] text-foreground" onClick={() => void handleStatusChange(app, "cancelled")}>Cancelado</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                );
              })}
            </div>
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

        <Card className="h-full rounded-2xl border border-border/65 bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Acoes rapidas</p>
            <h2 className="text-[1.08rem] font-semibold tracking-tight text-foreground">Atalhos operacionais</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              to="/agenda"
              className="group flex h-full min-h-[104px] rounded-xl border border-blue-300/75 bg-blue-50/65 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-blue-500 hover:shadow-md dark:border-blue-700/45 dark:bg-blue-950/25"
            >
              <div className="flex w-full items-start gap-2.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/45 dark:text-blue-300">
                  <CalendarDays className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-tight text-foreground">Organizar agenda</p>
                  <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted-foreground">Ajustar horarios e prioridades.</p>
                </div>
              </div>
            </Link>

            <Link
              to="/animals/add"
              className="group flex h-full min-h-[104px] rounded-xl border border-emerald-300/75 bg-emerald-50/65 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500 hover:shadow-md dark:border-emerald-700/45 dark:bg-emerald-950/25"
            >
              <div className="flex w-full items-start gap-2.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/45 dark:text-emerald-300">
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
              className="group flex h-full min-h-[104px] rounded-xl border border-violet-300/75 bg-violet-50/65 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-violet-500 hover:shadow-md dark:border-violet-700/45 dark:bg-violet-950/25"
            >
              <div className="flex w-full items-start gap-2.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/45 dark:text-violet-300">
                  <ShoppingCart className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-tight text-foreground">Nova venda</p>
                  <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted-foreground">Registrar venda em balcao.</p>
                </div>
              </div>
            </Link>

            <Link
              to="/stock/products-services"
              className="group flex h-full min-h-[104px] rounded-xl border border-amber-300/80 bg-amber-50/65 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-amber-500 hover:shadow-md dark:border-amber-700/45 dark:bg-amber-950/25"
            >
              <div className="flex w-full items-start gap-2.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/45 dark:text-amber-300">
                  <Package className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-tight text-foreground">Ver estoque</p>
                  <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted-foreground">Reposicao e itens criticos.</p>
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