import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { BarChart3, Printer, Stethoscope, PawPrint, RotateCcw, Syringe, ExternalLink, CalendarDays } from "lucide-react";
import { useAppointments } from "@/hooks/useAppointments";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { formatDateTime } from "@/lib/utils";
import type { AppointmentEntry } from "@/types/appointment";

const withinRange = (dateStr: string, from?: string, to?: string) => {
  const dt = new Date(`${dateStr}T00:00`);
  const f = from ? new Date(`${from}T00:00`) : undefined;
  const t = to ? new Date(`${to}T23:59`) : undefined;
  return (!f || dt >= f) && (!t || dt <= t);
};

const getDefaultPeriod = (preset: string) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const iso = (d: Date) => d.toISOString().split("T")[0];

  if (preset === "today") {
    return { from: iso(now), to: iso(now) };
  }
  if (preset === "this_week") {
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: iso(monday), to: iso(sunday) };
  }
  if (preset === "last_month") {
    const lm = m === 0 ? 11 : m - 1;
    const ly = m === 0 ? y - 1 : y;
    return {
      from: `${ly}-${String(lm + 1).padStart(2, "0")}-01`,
      to: `${ly}-${String(lm + 1).padStart(2, "0")}-${new Date(ly, lm + 1, 0).getDate()}`,
    };
  }
  if (preset === "last_3") {
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return { from: iso(threeMonthsAgo), to: iso(now) };
  }
  // this_month (default)
  return {
    from: `${y}-${String(m + 1).padStart(2, "0")}-01`,
    to: `${y}-${String(m + 1).padStart(2, "0")}-${new Date(y, m + 1, 0).getDate()}`,
  };
};

const PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "this_week", label: "Esta semana" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
  { value: "last_3", label: "Últimos 3 meses" },
  { value: "custom", label: "Escolher datas" },
];

const CHART_COLORS = ["#0d9488", "#059669", "#0891b2", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f59e0b"];

const AppointmentsReportPage: React.FC = () => {
  const { appointments } = useAppointments();
  const { data: dbClients } = useClientsList();
  const [searchParams] = useSearchParams();

  const initialPreset = searchParams.get("period") || "this_month";
  const [periodPreset, setPeriodPreset] = useState<string>(initialPreset);
  const defaultPeriod = useMemo(() => getDefaultPeriod(initialPreset), [initialPreset]);
  const [dateFrom, setDateFrom] = useState<string>(defaultPeriod.from);
  const [dateTo, setDateTo] = useState<string>(defaultPeriod.to);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [vetFilter, setVetFilter] = useState<string>("all");

  useEffect(() => {
    if (periodPreset === "custom") return;
    const { from, to } = getDefaultPeriod(periodPreset);
    setDateFrom(from);
    setDateTo(to);
  }, [periodPreset]);

  const animalMap = useMemo(() => {
    const map = new Map<string, { animalName: string; clientName: string; clientId: string }>();
    for (const client of dbClients || []) {
      for (const animal of client.animals || []) {
        map.set(animal.id, { animalName: animal.name, clientName: client.name, clientId: client.id });
      }
    }
    return map;
  }, [dbClients]);

  const distinctVets = useMemo(() => {
    const set = new Set<string>();
    for (const app of appointments) {
      if (app.vet && app.vet.trim()) set.add(app.vet.trim());
    }
    return Array.from(set).sort();
  }, [appointments]);

  const inPeriod = useMemo(
    () => appointments.filter((app) => withinRange(app.date, dateFrom, dateTo)),
    [appointments, dateFrom, dateTo]
  );

  const filtered = useMemo(() => {
    return inPeriod.filter((app) => {
      if (typeFilter !== "all" && app.type !== typeFilter) return false;
      if (vetFilter !== "all" && app.vet !== vetFilter) return false;
      return true;
    });
  }, [inPeriod, typeFilter, vetFilter]);

  const { total, distinctPatients, retornosGerados, vacinasAplicadas, byType, byDay, byVet } = useMemo(() => {
    const total = filtered.length;
    const distinctPatients = new Set(filtered.map((a) => a.animalId)).size;
    const retornosGerados = filtered.filter(
      (a) => Boolean((a.details as Record<string, unknown>)?.retornoRecomendadoEmDias)
    ).length;
    const vacinasAplicadas = filtered.filter((a) => a.type === "Vacina").length;

    const typeCounts: Record<string, number> = {};
    filtered.forEach((a) => {
      const t = a.type || "Não informado";
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    const byType = Object.entries(typeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const dayCounts: Record<string, number> = {};
    filtered.forEach((a) => {
      dayCounts[a.date] = (dayCounts[a.date] || 0) + 1;
    });
    const byDay = Object.entries(dayCounts)
      .map(([date, count]) => ({
        date: new Date(date + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        dateFull: date,
        atendimentos: count,
      }))
      .sort((a, b) => a.dateFull.localeCompare(b.dateFull));

    const vetCounts: Record<string, number> = {};
    filtered.forEach((a) => {
      const v = a.vet?.trim() || "Não informado";
      vetCounts[v] = (vetCounts[v] || 0) + 1;
    });
    const byVet = Object.entries(vetCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { total, distinctPatients, retornosGerados, vacinasAplicadas, byType, byDay, byVet };
  }, [filtered]);

  const periodLabel =
    periodPreset === "today"
      ? "Hoje"
      : periodPreset === "this_week"
        ? "Esta semana"
        : periodPreset === "this_month"
          ? "Este mês"
          : periodPreset === "last_month"
            ? "Mês passado"
            : periodPreset === "last_3"
              ? "Últimos 3 meses"
              : `${formatDateTime(dateFrom)} a ${formatDateTime(dateTo)}`;

  const barChartConfig = { atendimentos: { label: "Atendimentos", color: "#0d9488" } };

  const sortedList = useMemo(
    () => [...filtered].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
    [filtered]
  );

  const handlePrint = () => {
    const popup = window.open("", "_blank", "width=1024,height=768");
    if (!popup) return;
    const rows = sortedList
      .map((a) => {
        const info = animalMap.get(a.animalId);
        return `<tr><td>${formatDateTime(a.date, a.time)}</td><td>${info?.animalName || "-"}</td><td>${info?.clientName || "-"}</td><td>${a.type}</td><td>${a.vet || "-"}</td></tr>`;
      })
      .join("");
    popup.document.write(`
      <html><head><title>Relatório de Atendimentos</title><style>
      body{font-family:Arial,sans-serif;padding:24px;color:#0f172a} h1{margin:0 0 8px} h2{margin:22px 0 8px}
      table{width:100%;border-collapse:collapse;margin-top:8px} th,td{border:1px solid #e2e8f0;padding:8px;font-size:12px} th{background:#f8fafc;text-align:left}
      .kpi{display:inline-block;margin-right:16px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}
      </style></head><body>
      <h1>Relatório de Atendimentos</h1><p>Período: ${periodLabel}</p>
      <div class="kpi"><strong>Total:</strong> ${total}</div>
      <div class="kpi"><strong>Pacientes distintos:</strong> ${distinctPatients}</div>
      <div class="kpi"><strong>Retornos gerados:</strong> ${retornosGerados}</div>
      <div class="kpi"><strong>Vacinas aplicadas:</strong> ${vacinasAplicadas}</div>
      <h2>Atendimentos do período</h2>
      <table><thead><tr><th>Data</th><th>Pet</th><th>Tutor</th><th>Tipo</th><th>Veterinário</th></tr></thead><tbody>${rows || "<tr><td colspan='5'>Sem dados</td></tr>"}</tbody></table>
      </body></html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <PageShell>
      <PageHeader
        title="Relatório de Atendimentos"
        description={`Volume, tipos e distribuição de atendimentos. Período ativo: ${periodLabel}.`}
        icon={Stethoscope}
        module="clinical"
        breadcrumb={<>Painel &gt; Atendimento &gt; Relatório</>}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-[160px] border border-border bg-card">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="Consulta">Consulta</SelectItem>
                <SelectItem value="Vacina">Vacina</SelectItem>
                <SelectItem value="Retorno">Retorno</SelectItem>
                <SelectItem value="Cirurgia">Cirurgia</SelectItem>
                <SelectItem value="Emergência">Emergência</SelectItem>
                <SelectItem value="Check-up">Check-up</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
            {distinctVets.length > 1 && (
              <Select value={vetFilter} onValueChange={setVetFilter}>
                <SelectTrigger className="h-9 w-[160px] border border-border bg-card">
                  <SelectValue placeholder="Veterinário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os vets</SelectItem>
                  {distinctVets.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={periodPreset} onValueChange={setPeriodPreset}>
              <SelectTrigger className="h-9 w-[160px] border border-border bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {periodPreset === "custom" && (
              <>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-32 border border-border bg-card" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-32 border border-border bg-card" />
              </>
            )}
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
            <Link to="/clinical/returns-forecast">
              <Button variant="ghost" className="gap-2 text-muted-foreground">
                <RotateCcw className="h-4 w-4" /> Previsões
              </Button>
            </Link>
          </div>
        }
      />

      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="vf-surface-card vf-tone-clinical rounded-xl">
            <CardContent className="p-4">
              <div className="text-xs text-emerald-700 font-medium">Total no período</div>
              <div className="text-xl font-bold text-emerald-800">{total}</div>
            </CardContent>
          </Card>
          <Card className="vf-surface-card vf-tone-clinical rounded-xl">
            <CardContent className="p-4">
              <div className="text-xs text-sky-700 font-medium">Pacientes distintos</div>
              <div className="text-xl font-bold text-sky-800">{distinctPatients}</div>
            </CardContent>
          </Card>
          <Card className="vf-surface-card vf-tone-clinical rounded-xl">
            <CardContent className="p-4">
              <div className="text-xs text-orange-700 font-medium">Acompanhamentos gerados</div>
              <div className="text-xl font-bold text-orange-800">{retornosGerados}</div>
            </CardContent>
          </Card>
          <Card className="vf-surface-card vf-tone-clinical rounded-xl">
            <CardContent className="p-4">
              <div className="text-xs text-blue-700 font-medium">Vacinas aplicadas</div>
              <div className="text-xl font-bold text-blue-800">{vacinasAplicadas}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="vf-surface-card vf-tone-clinical rounded-xl print:break-inside-avoid">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Atendimentos por dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {byDay.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">Nenhum atendimento no período.</div>
            ) : (
              <ChartContainer config={barChartConfig} className="h-[240px] w-full">
                <BarChart data={byDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="atendimentos" fill="#0d9488" radius={[4, 4, 0, 0]} name="Atendimentos" />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="vf-surface-card vf-tone-clinical rounded-xl print:break-inside-avoid">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" /> Atendimentos por tipo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {byType.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Nenhum atendimento no período.</div>
              ) : (
                <div className="space-y-2">
                  {byType.map((t, i) => (
                    <div key={t.name} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="truncate text-sm text-foreground">{t.name}</span>
                      </div>
                      <Badge variant="secondary">{t.value}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="vf-surface-card vf-tone-clinical rounded-xl print:break-inside-avoid">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" /> Atendimentos por veterinário
              </CardTitle>
            </CardHeader>
            <CardContent>
              {byVet.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Nenhum atendimento no período.</div>
              ) : (
                <div className="space-y-2">
                  {byVet.map((v) => (
                    <div key={v.name} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                      <span className="truncate text-sm text-foreground">{v.name}</span>
                      <Badge variant="secondary">{v.value}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="vf-surface-card vf-tone-clinical rounded-xl print:break-inside-avoid">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PawPrint className="h-4 w-4 text-primary" /> Lista de atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedList.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Nenhum atendimento encontrado para os filtros selecionados.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3">Data</th>
                      <th className="py-2 pr-3">Pet</th>
                      <th className="py-2 pr-3">Tutor</th>
                      <th className="py-2 pr-3">Tipo</th>
                      <th className="py-2 pr-3">Veterinário</th>
                      <th className="py-2 pr-3 print:hidden"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedList.map((a: AppointmentEntry) => {
                      const info = animalMap.get(a.animalId);
                      return (
                        <tr key={a.id} className="border-b border-border/40 hover:bg-muted/40">
                          <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(a.date, a.time)}</td>
                          <td className="py-2 pr-3">{info?.animalName || "-"}</td>
                          <td className="py-2 pr-3">{info?.clientName || "-"}</td>
                          <td className="py-2 pr-3">
                            <Badge variant="outline" className="font-normal">{a.type || "-"}</Badge>
                          </td>
                          <td className="py-2 pr-3">{a.vet || "-"}</td>
                          <td className="py-2 pr-3 print:hidden">
                            {info?.clientId && (
                              <Link
                                to={`/clients/${info.clientId}/animals/${a.animalId}/view-appointment/${a.id}`}
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                Ver <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground print:block hidden">
          Relatório de atendimentos — {formatDateTime(new Date().toISOString().split("T")[0], new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }))} — Período: {periodLabel}
        </p>
      </div>
    </PageShell>
  );
};

export default AppointmentsReportPage;
