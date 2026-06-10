import { Button } from "@/components/ui/button";
import { CalendarClock, CheckCircle2, ShieldAlert, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface DashboardStatusStripProps {
  appointmentsToday: number;
  upcomingCount: number;
  operationalAlerts: number;
}

const itemBase =
  "rounded-xl border px-3 py-2.5 min-h-[72px] flex items-center justify-between gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm";

export default function DashboardStatusStrip({
  appointmentsToday,
  upcomingCount,
  operationalAlerts,
}: DashboardStatusStripProps) {
  const hasPriority = operationalAlerts > 0;

  return (
    <div className="rounded-2xl border border-border/70 bg-card px-3 py-3 shadow-sm sm:px-4">
      <div className="grid gap-3 md:grid-cols-6 xl:grid-cols-12">
        <div className={`${itemBase} border-emerald-200/80 bg-emerald-50/55 md:col-span-3 xl:col-span-3 dark:border-emerald-700/40 dark:bg-emerald-950/20`}>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Atendimentos hoje</p>
            <p className="mt-1 text-3xl font-semibold leading-none tracking-tight text-emerald-700 dark:text-emerald-300">{appointmentsToday}</p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/45 dark:text-emerald-300">
            <CheckCircle2 className="h-6 w-6" />
          </span>
        </div>

        <div className={`${itemBase} border-sky-200/80 bg-sky-50/55 md:col-span-3 xl:col-span-3 dark:border-sky-700/40 dark:bg-sky-950/20`}>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Próximos blocos</p>
            <p className="mt-1 text-3xl font-semibold leading-none tracking-tight text-sky-700 dark:text-sky-300">{upcomingCount}</p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/45 dark:text-sky-300">
            <CalendarClock className="h-6 w-6" />
          </span>
        </div>

        <div
          className={`${itemBase} md:col-span-3 xl:col-span-3 ${
            hasPriority
              ? "border-amber-300/90 bg-amber-50/70 dark:border-amber-600/50 dark:bg-amber-950/25"
              : "border-amber-200/70 bg-amber-50/45 dark:border-amber-800/35 dark:bg-amber-950/15"
          }`}
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Prioridade</p>
            <p
              className={`mt-1 text-3xl font-semibold leading-none tracking-tight ${
                hasPriority ? "text-amber-700 dark:text-amber-300" : "text-amber-700/75 dark:text-amber-300/80"
              }`}
            >
              {operationalAlerts}
            </p>
          </div>
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              hasPriority
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/45 dark:text-amber-300"
                : "bg-amber-100/80 text-amber-700 dark:bg-amber-900/35 dark:text-amber-300/85"
            }`}
          >
            <ShieldAlert className="h-6 w-6" />
          </span>
        </div>

        <div className={`${itemBase} border-border/70 bg-card md:col-span-3 xl:col-span-3`}>
          <div className="grid w-full gap-2 sm:grid-cols-2">
            <Button asChild className="h-8 rounded-lg px-3 text-xs font-medium">
              <Link to="/agenda">
                Abrir agenda
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-8 rounded-lg px-3 text-xs font-medium">
              <Link to="/clients/add">Novo responsável</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
