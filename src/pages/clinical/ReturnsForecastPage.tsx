import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppointments } from "@/hooks/useAppointments";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw, Syringe, CalendarDays, ExternalLink } from "lucide-react";

type PeriodFilter = "7" | "30" | "90" | "all";

interface ReturnAlert {
  kind: "retorno" | "vacina";
  animalId: string;
  animalName: string;
  clientName: string;
  clientId?: string;
  dueDate: Date;
  label: string;
  daysUntil: number;
}

export default function ReturnsForecastPage() {
  const { appointments } = useAppointments();
  const { data: dbClients } = useClientsList();
  const [period, setPeriod] = useState<PeriodFilter>("30");

  // "YYYY-MM-DD" puro vira meia-noite UTC se parseado direto; em fuso negativo
  // (Brasil, UTC-3) isso volta pro dia anterior. Forcar hora local evita o bug.
  const parseLocalDate = (dateStr: string) => new Date(`${dateStr}T00:00:00`);

  const animalMap = useMemo(() => {
    const map = new Map<string, { animalName: string; clientName: string; clientId: string }>();
    for (const client of dbClients || []) {
      for (const animal of client.animals || []) {
        map.set(animal.id, { animalName: animal.name, clientName: client.name, clientId: client.id });
      }
    }
    return map;
  }, [dbClients]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const cutoff = useMemo(() => {
    if (period === "all") return null;
    return new Date(today.getTime() + Number(period) * 86400000);
  }, [period, today]);

  const alerts: ReturnAlert[] = useMemo(() => {
    const list: ReturnAlert[] = [];

    for (const app of appointments) {
      const d = app.details as Record<string, unknown>;
      const info = animalMap.get(app.animalId);

      // Retorno
      const days = d?.retornoRecomendadoEmDias as number | undefined;
      if (days) {
        const dueDate = new Date(parseLocalDate(app.date).getTime() + days * 86400000);
        if (dueDate >= today && (!cutoff || dueDate <= cutoff)) {
          const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
          list.push({
            kind: "retorno",
            animalId: app.animalId,
            animalName: info?.animalName ?? "Pet",
            clientName: info?.clientName ?? "Tutor",
            clientId: info?.clientId,
            dueDate,
            label: `Retorno (consulta de ${parseLocalDate(app.date).toLocaleDateString("pt-BR")})`,
            daysUntil,
          });
        }
      }

      // Vacina
      if (app.type === "Vacina") {
        const nextDose = d?.proximaDose as string | undefined;
        const tipoVacina = (d?.tipoVacina as string) || "Vacina";
        if (nextDose) {
          const dueDate = parseLocalDate(nextDose);
          if (dueDate >= today && (!cutoff || dueDate <= cutoff)) {
            const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
            list.push({
              kind: "vacina",
              animalId: app.animalId,
              animalName: info?.animalName ?? "Pet",
              clientName: info?.clientName ?? "Tutor",
              clientId: info?.clientId,
              dueDate,
              label: `Próxima dose: ${tipoVacina}`,
              daysUntil,
            });
          }
        }
      }
    }

    return list.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [appointments, animalMap, today, cutoff]);

  const retornos = alerts.filter((a) => a.kind === "retorno");
  const vacinas = alerts.filter((a) => a.kind === "vacina");

  const periodLabel: Record<PeriodFilter, string> = {
    "7": "7 dias",
    "30": "30 dias",
    "90": "90 dias",
    "all": "Todos",
  };

  function urgencyColor(days: number) {
    if (days <= 3) return "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/20 dark:border-red-700/30";
    if (days <= 7) return "text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/20 dark:border-orange-700/30";
    return "text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/30 dark:border-slate-700/30";
  }

  function renderList(items: ReturnAlert[], icon: React.ReactNode, emptyMsg: string) {
    if (items.length === 0) {
      return (
        <p className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyMsg}
        </p>
      );
    }
    return (
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={`${item.kind}-${item.animalId}-${i}`}
            className={`flex items-center justify-between rounded-lg border px-4 py-3 ${urgencyColor(item.daysUntil)}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0">{icon}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {item.clientId ? (
                    <Link
                      to={`/clients/${item.clientId}/animals/${item.animalId}/record`}
                      className="truncate text-sm font-semibold hover:underline"
                    >
                      {item.animalName}
                    </Link>
                  ) : (
                    <span className="truncate text-sm font-semibold">{item.animalName}</span>
                  )}
                  {item.clientId && (
                    <Link to={`/clients/${item.clientId}/animals/${item.animalId}/record`} className="shrink-0 opacity-50 hover:opacity-100">
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                <p className="truncate text-xs opacity-70">{item.clientName} · {item.label}</p>
              </div>
            </div>
            <div className="ml-3 shrink-0 text-right">
              <p className="text-sm font-semibold">{item.dueDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}</p>
              <p className="text-xs opacity-70">em {item.daysUntil}d</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <PageShell className="space-y-4 font-sans">
      <PageHeader
        title="Previsão de Retornos e Vacinas"
        description="Retornos recomendados e próximas doses registrados nos prontuários."
        icon={CalendarDays}
        module="clinical"
        breadcrumb={<>Agenda &gt; Previsão</>}
        className="mb-0 rounded-2xl border border-border/70 bg-card px-6 py-4 shadow-sm"
        breadcrumbClassName="mb-1 text-xs text-muted-foreground"
        titleClassName="text-3xl font-semibold tracking-tight"
        descriptionClassName="mt-1 text-sm text-muted-foreground"
        iconWrapperClassName="h-11 w-11 rounded-[14px]"
        iconClassName="h-5 w-5"
        actions={
          <div className="flex items-center gap-2">
            {(["7", "30", "90", "all"] as PeriodFilter[]).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? "default" : "outline"}
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => setPeriod(p)}
              >
                {periodLabel[p]}
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border border-border/65 bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">Retornos</p>
              <h2 className="text-[1.05rem] font-semibold tracking-tight text-foreground">Consultas de retorno</h2>
            </div>
            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
              {retornos.length}
            </Badge>
          </div>
          {renderList(retornos, <RotateCcw className="h-4 w-4" />, `Nenhum retorno previsto nos próximos ${period === "all" ? "registros" : periodLabel[period]}.`)}
        </Card>

        <Card className="rounded-2xl border border-border/65 bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Vacinas</p>
              <h2 className="text-[1.05rem] font-semibold tracking-tight text-foreground">Próximas doses</h2>
            </div>
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {vacinas.length}
            </Badge>
          </div>
          {renderList(vacinas, <Syringe className="h-4 w-4" />, `Nenhuma vacina prevista nos próximos ${period === "all" ? "registros" : periodLabel[period]}.`)}
        </Card>
      </div>
    </PageShell>
  );
}
