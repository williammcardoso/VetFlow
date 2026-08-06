import { Button } from "@/components/ui/button";
import { CheckCircle2, RotateCcw, AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface DashboardStatusStripProps {
  attendedToday: number;
  weeklyAlerts: number;
  lowStockCount: number;
}

const itemBase =
  "rounded-xl border px-3 py-2.5 min-h-[72px] flex items-center justify-between gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm";

export default function DashboardStatusStrip({
  attendedToday,
  weeklyAlerts,
  lowStockCount,
}: DashboardStatusStripProps) {
  const hasStockAlert = lowStockCount > 0;

  return (
    <div className="rounded-2xl border border-border/70 bg-card px-3 py-3 shadow-sm sm:px-4">
      <div className="grid gap-3 md:grid-cols-6 xl:grid-cols-12">
        <Link
          to="/clinical/appointments-report?period=today"
          className={`${itemBase} border-emerald-200/80 bg-emerald-50/55 md:col-span-3 xl:col-span-3 dark:border-emerald-700/40 dark:bg-emerald-950/20`}
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Atendidos hoje</p>
            <p className="mt-1 text-3xl font-semibold leading-none tracking-tight text-emerald-700 dark:text-emerald-300">{attendedToday}</p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/45 dark:text-emerald-300">
            <CheckCircle2 className="h-6 w-6" />
          </span>
        </Link>

        <Link
          to="/clinical/returns-forecast"
          className={`${itemBase} border-orange-200/80 bg-orange-50/55 md:col-span-3 xl:col-span-3 dark:border-orange-700/40 dark:bg-orange-950/20`}
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Retornos/vacinas 7d</p>
            <p className="mt-1 text-3xl font-semibold leading-none tracking-tight text-orange-700 dark:text-orange-300">{weeklyAlerts}</p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-900/45 dark:text-orange-300">
            <RotateCcw className="h-6 w-6" />
          </span>
        </Link>

        <Link
          to="/stock/products-services"
          className={`${itemBase} md:col-span-3 xl:col-span-3 ${
            hasStockAlert
              ? "border-amber-300/90 bg-amber-50/70 dark:border-amber-600/50 dark:bg-amber-950/25"
              : "border-amber-200/70 bg-amber-50/45 dark:border-amber-800/35 dark:bg-amber-950/15"
          }`}
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estoque crítico</p>
            <p
              className={`mt-1 text-3xl font-semibold leading-none tracking-tight ${
                hasStockAlert ? "text-amber-700 dark:text-amber-300" : "text-amber-700/75 dark:text-amber-300/80"
              }`}
            >
              {lowStockCount}
            </p>
          </div>
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              hasStockAlert
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/45 dark:text-amber-300"
                : "bg-amber-100/80 text-amber-700 dark:bg-amber-900/35 dark:text-amber-300/85"
            }`}
          >
            <AlertTriangle className="h-6 w-6" />
          </span>
        </Link>

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
