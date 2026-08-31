import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, Plus, Trash2, CalendarOff, Pencil, AlertTriangle } from "lucide-react";
import { useAgendaAvailability } from "@/hooks/useAgendaAvailability";
import {
  saveWeeklyDay,
  saveAgendaSettings,
  createException,
  updateException,
  deleteException,
  WEEKDAY_NAMES,
  type WeeklyDayHours,
  type HourBlock,
  type AgendaException,
} from "@/lib/agendaAvailabilityApi";

const INTERVAL_OPTIONS = [15, 20, 30, 45, 60, 90, 120];

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function blocksValid(blocks: HourBlock[]): boolean {
  return blocks.every((b) => /^\d{2}:\d{2}$/.test(b.start) && /^\d{2}:\d{2}$/.test(b.end) && b.start < b.end);
}

function summarizeBlocks(blocks: HourBlock[]): string {
  if (blocks.length === 0) return "Sem horário definido";
  return blocks.map((b) => `${b.start}–${b.end}`).join(" e ");
}

// Editor de uma lista de blocos {start,end} — usado tanto no horário-padrão
// (por dia da semana) quanto no horário customizado de uma exceção.
function BlockListEditor({
  blocks,
  onChange,
}: {
  blocks: HourBlock[];
  onChange: (next: HourBlock[]) => void;
}) {
  const update = (i: number, field: "start" | "end", value: string) => {
    onChange(blocks.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)));
  };
  const remove = (i: number) => onChange(blocks.filter((_, idx) => idx !== i));
  const add = () => onChange([...blocks, { start: "08:00", end: "12:00" }]);

  return (
    <div className="space-y-2">
      {blocks.map((b, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input type="time" value={b.start} onChange={(e) => update(i, "start", e.target.value)} className="w-32" />
          <span className="text-sm text-muted-foreground">até</span>
          <Input type="time" value={b.end} onChange={(e) => update(i, "end", e.target.value)} className="w-32" />
          {b.start >= b.end && <span className="text-xs text-destructive">fim antes do início</span>}
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="ml-auto h-8 w-8 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar intervalo
      </Button>
    </div>
  );
}

const AgendaAvailabilityPage: React.FC = () => {
  const { weeklyHours, exceptions, settings, loading, usingFallback, refetch } = useAgendaAvailability();

  const [localWeekly, setLocalWeekly] = useState<WeeklyDayHours[]>(weeklyHours);
  useEffect(() => setLocalWeekly(weeklyHours), [weeklyHours]);
  const [savingWeekly, setSavingWeekly] = useState(false);

  const [localInterval, setLocalInterval] = useState(settings.intervalMinutes);
  useEffect(() => setLocalInterval(settings.intervalMinutes), [settings.intervalMinutes]);
  const [savingInterval, setSavingInterval] = useState(false);

  const setDay = (weekday: number, changes: Partial<WeeklyDayHours>) => {
    setLocalWeekly((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...changes } : d)));
  };

  const weeklyValid = localWeekly.every((d) => !d.isOpen || blocksValid(d.blocks));

  const handleSaveWeekly = async () => {
    if (!weeklyValid) {
      toast.error("Corrija os intervalos com horário de fim antes do início.");
      return;
    }
    setSavingWeekly(true);
    try {
      await Promise.all(localWeekly.map((d) => saveWeeklyDay(d)));
      toast.success("Horário-padrão da semana salvo.");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar o horário-padrão.");
    } finally {
      setSavingWeekly(false);
    }
  };

  const handleSaveInterval = async () => {
    setSavingInterval(true);
    try {
      await saveAgendaSettings({ intervalMinutes: localInterval });
      toast.success("Intervalo entre horários salvo.");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar o intervalo.");
    } finally {
      setSavingInterval(false);
    }
  };

  // --- Exceções ---
  const [exDialogOpen, setExDialogOpen] = useState(false);
  const [editingException, setEditingException] = useState<AgendaException | null>(null);
  const [exDate, setExDate] = useState(toISODate(new Date()));
  const [exClosed, setExClosed] = useState(true);
  const [exBlocks, setExBlocks] = useState<HourBlock[]>([{ start: "08:00", end: "12:00" }]);
  const [exReason, setExReason] = useState("");
  const [exSaving, setExSaving] = useState(false);

  const openNewException = () => {
    setEditingException(null);
    setExDate(toISODate(new Date()));
    setExClosed(true);
    setExBlocks([{ start: "08:00", end: "12:00" }]);
    setExReason("");
    setExDialogOpen(true);
  };

  const openEditException = (exception: AgendaException) => {
    setEditingException(exception);
    setExDate(exception.date);
    setExClosed(exception.isClosed);
    setExBlocks(exception.blocks.length > 0 ? exception.blocks : [{ start: "08:00", end: "12:00" }]);
    setExReason(exception.reason || "");
    setExDialogOpen(true);
  };

  const handleSaveException = async () => {
    if (!exDate) {
      toast.error("Escolha uma data.");
      return;
    }
    if (!exClosed && !blocksValid(exBlocks)) {
      toast.error("Corrija os intervalos de horário dessa exceção.");
      return;
    }
    setExSaving(true);
    try {
      const payload = { date: exDate, isClosed: exClosed, blocks: exClosed ? [] : exBlocks, reason: exReason.trim() || undefined };
      if (editingException) {
        await updateException(editingException.id, payload);
      } else {
        await createException(payload);
      }
      toast.success("Exceção salva.");
      setExDialogOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar a exceção. Se a data já tiver uma exceção cadastrada, edite-a em vez de criar outra.");
    } finally {
      setExSaving(false);
    }
  };

  const handleDeleteException = async (exception: AgendaException) => {
    try {
      await deleteException(exception.id);
      toast.success("Exceção removida.");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover a exceção.");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Horários da Agenda Pública"
        description="Controla os dias e horários que aparecem em agendar-horario, sem precisar pedir alteração no sistema."
        icon={Clock}
        module="settings"
        breadcrumb={<>Painel &gt; Configurações &gt; Horários da agenda pública</>}
        actions={
          <Button asChild variant="outline" className="rounded-xl border-border/70">
            <Link to="/agenda">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        }
      />

      <div className="flex-1">
        <div className="mx-auto max-w-4xl space-y-5">
          {usingFallback && !loading && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Ainda usando o horário padrão do sistema</AlertTitle>
              <AlertDescription>
                Essa tela ainda não conseguiu ler a configuração do banco (a migration pode não ter sido aplicada). Os valores abaixo são
                o horário que já estava fixo — pode editar e salvar normalmente, mas confirme com quem administra o Supabase se a
                migration <code>agenda_availability_config</code> já rodou.
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <>
              {/* Intervalo entre horários */}
              <Card className="vf-surface-card vf-tone-settings rounded-2xl border-border/80">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Clock className="h-5 w-5 text-vf-settings" /> Intervalo entre horários
                  </CardTitle>
                  <CardDescription>
                    Espaçamento entre um horário e outro na grade de agendamento (ex.: 30 min = 08:00, 08:30, 09:00...). Também é a
                    distância mínima avisada como "encaixe" quando alguém tenta marcar muito perto de um agendamento já existente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-end gap-3 pt-0">
                  <div className="space-y-2">
                    <Label htmlFor="interval">Intervalo</Label>
                    <Select value={String(localInterval)} onValueChange={(v) => setLocalInterval(Number(v))}>
                      <SelectTrigger id="interval" className="w-40 bg-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INTERVAL_OPTIONS.map((m) => (
                          <SelectItem key={m} value={String(m)}>
                            {m} minutos
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSaveInterval} disabled={savingInterval || localInterval === settings.intervalMinutes}>
                    {savingInterval ? "Salvando..." : "Salvar intervalo"}
                  </Button>
                </CardContent>
              </Card>

              {/* Horário-padrão da semana */}
              <Card className="vf-surface-card vf-tone-settings rounded-2xl border-border/80">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Clock className="h-5 w-5 text-vf-settings" /> Horário-padrão da semana
                  </CardTitle>
                  <CardDescription>
                    O horário que vale toda semana. Pra fechar um dia específico (feriado) ou abrir com horário diferente só numa data,
                    use as exceções abaixo — não precisa mudar o padrão pra isso.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {localWeekly
                    .slice()
                    .sort((a, b) => a.weekday - b.weekday)
                    .map((day) => (
                      <div key={day.weekday} className="rounded-xl border border-border/70 p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="font-medium text-foreground">{WEEKDAY_NAMES[day.weekday]}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{day.isOpen ? "Aberto" : "Fechado"}</span>
                            <Switch checked={day.isOpen} onCheckedChange={(v) => setDay(day.weekday, { isOpen: v })} />
                          </div>
                        </div>
                        {day.isOpen && (
                          <BlockListEditor blocks={day.blocks} onChange={(blocks) => setDay(day.weekday, { blocks })} />
                        )}
                      </div>
                    ))}
                  <div className="flex justify-end">
                    <Button onClick={handleSaveWeekly} disabled={savingWeekly || !weeklyValid}>
                      {savingWeekly ? "Salvando..." : "Salvar horário-padrão"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Exceções por data */}
              <Card className="vf-surface-card vf-tone-settings rounded-2xl border-border/80">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                        <CalendarOff className="h-5 w-5 text-vf-settings" /> Exceções por data
                      </CardTitle>
                      <CardDescription>Feriado, imprevisto, ou um dia com horário fora do padrão (ex.: sábado à tarde só nessa data).</CardDescription>
                    </div>
                    <Button size="sm" onClick={openNewException}>
                      <Plus className="mr-1 h-4 w-4" /> Nova exceção
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {exceptions.length === 0 ? (
                    <p className="py-2 text-sm text-muted-foreground">Nenhuma exceção cadastrada.</p>
                  ) : (
                    <div className="space-y-2">
                      {exceptions.map((exception) => (
                        <div key={exception.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {new Date(`${exception.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", weekday: "short" })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {exception.isClosed ? "Fechado o dia todo" : summarizeBlocks(exception.blocks)}
                              {exception.reason ? ` · ${exception.reason}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button variant="ghost" size="icon" title="Editar" onClick={() => openEditException(exception)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Remover" onClick={() => handleDeleteException(exception)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <Dialog open={exDialogOpen} onOpenChange={setExDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingException ? "Editar exceção" : "Nova exceção"}</DialogTitle>
            <DialogDescription>Vale só pra essa data — não muda o horário-padrão da semana.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ex-date">Data</Label>
              <Input id="ex-date" type="date" value={exDate} onChange={(e) => setExDate(e.target.value)} disabled={!!editingException} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Fechado o dia todo</p>
                <p className="text-xs text-muted-foreground">Desligue pra definir um horário diferente do padrão só nesse dia.</p>
              </div>
              <Switch checked={exClosed} onCheckedChange={setExClosed} />
            </div>
            {!exClosed && (
              <div className="space-y-2">
                <Label>Horário nesse dia</Label>
                <BlockListEditor blocks={exBlocks} onChange={setExBlocks} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="ex-reason">Motivo (opcional)</Label>
              <Input id="ex-reason" value={exReason} onChange={(e) => setExReason(e.target.value)} placeholder="Ex: Feriado, viagem, evento" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExDialogOpen(false)} disabled={exSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveException} disabled={exSaving}>
              {exSaving ? "Salvando..." : "Salvar exceção"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default AgendaAvailabilityPage;
