import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarDays, Check, CheckCircle2, MessageCircle, RotateCcw, Syringe, Undo2 } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { useAppointments } from "@/hooks/useAppointments";
import { reminderPhone, useReminderSender } from "@/hooks/useReminderSender";
import { ResolveReminderDialog } from "@/components/reminders/ResolveReminderDialog";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { KpiStrip } from "@/components/saas/KpiStrip";
import { IconChip, Panel } from "@/components/finance/FinanceUI";
import { TONES, type Tone } from "@/components/finance/financeTheme";
import { speciesIcon, speciesTone } from "@/components/clients/clientVisuals";
import { Button } from "@/components/ui/button";
import { getPatientRecordPath } from "@/utils/patientDisplayId";
import { displayAppointmentType } from "@/lib/appointmentDisplay";
import { cn } from "@/lib/utils";
import { buildReminders, type ReminderItem } from "@/lib/reminders";

type PeriodFilter = "7" | "30" | "90" | "all" | "overdue" | "resolved";

const PERIODS: Array<{ key: PeriodFilter; label: string }> = [
  { key: "7", label: "7 dias" },
  { key: "30", label: "30 dias" },
  { key: "90", label: "90 dias" },
  { key: "all", label: "Todos" },
];

const formatBR = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

function urgency(daysUntil: number): { label: string; tone: Tone } {
  if (daysUntil < 0) return { label: `atrasado há ${Math.abs(daysUntil)} ${Math.abs(daysUntil) === 1 ? "dia" : "dias"}`, tone: "rose" };
  if (daysUntil === 0) return { label: "hoje", tone: "rose" };
  if (daysUntil <= 7) return { label: `em ${daysUntil} ${daysUntil === 1 ? "dia" : "dias"}`, tone: "amber" };
  return { label: `em ${daysUntil} dias`, tone: "slate" };
}

// Previsão de vacinas e acompanhamentos → lembrete pelo WhatsApp com um
// toque (mensagem pronta), marcando quem já foi avisado. "Resolvido" dá
// baixa sem mandar nada (ex.: acompanhamento feito por conversa no WhatsApp).
export default function ReturnsForecastPage() {
  const { appointments, loading: loadingAppointments } = useAppointments();
  const { animalMap, sent, resolved, remind, resolve, unresolve } = useReminderSender();
  const [period, setPeriod] = useState<PeriodFilter>("30");
  const [resolving, setResolving] = useState<ReminderItem | null>(null);

  // Pet que veio a óbito sai da lista (não tem mais vacina nem retorno a cobrar).
  const everything = useMemo(
    () => buildReminders(appointments).filter((r) => !animalMap.get(r.animalId)?.animal.deceasedAt),
    [appointments, animalMap]
  );
  const all = useMemo(() => everything.filter((r) => !resolved[r.key]), [everything, resolved]);
  const resolvedItems = useMemo(
    () => everything.filter((r) => resolved[r.key]).sort((a, b) => resolved[b.key].localeCompare(resolved[a.key])),
    [everything, resolved]
  );
  const overdueCount = all.filter((r) => r.daysUntil < 0).length;
  const visible = useMemo(() => {
    if (period === "resolved") return resolvedItems;
    if (period === "overdue") return all.filter((r) => r.daysUntil < 0);
    if (period === "all") return all.filter((r) => r.daysUntil >= 0);
    return all.filter((r) => r.daysUntil >= 0 && r.daysUntil <= Number(period));
  }, [all, resolvedItems, period]);

  const retornos = visible.filter((r) => r.kind === "retorno");
  const vacinas = visible.filter((r) => r.kind === "vacina");
  const sentCount = visible.filter((r) => sent[r.key]).length;
  const periodText =
    period === "resolved" ? "resolvidos" : period === "overdue" ? "atrasados" : period === "all" ? "a partir de hoje" : `nos próximos ${period} dias`;

  function renderList(items: ReminderItem[], empty: string) {
    if (loadingAppointments && items.length === 0) {
      return (
        <ul className="divide-y divide-border/70" aria-busy>
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <span className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-muted" />
              <span className="flex-1 space-y-1.5">
                <span className="block h-3.5 w-40 max-w-full animate-pulse rounded bg-muted" />
                <span className="block h-3 w-28 animate-pulse rounded bg-muted" />
              </span>
            </li>
          ))}
        </ul>
      );
    }
    if (items.length === 0) {
      return (
        <div className="px-4 py-10 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </span>
          <p className="mt-2 text-sm font-semibold text-foreground">Nada por aqui</p>
          <p className="text-xs text-muted-foreground">{empty}</p>
        </div>
      );
    }
    return (
      <ul className="divide-y divide-border/70">
        {items.map((item) => {
          const info = animalMap.get(item.animalId);
          const Species = speciesIcon(info?.animal.species);
          const u = urgency(item.daysUntil);
          const sentAt = sent[item.key];
          const resolvedAt = resolved[item.key];
          const hasPhone = Boolean(reminderPhone(info?.client));
          return (
            <li key={item.key} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span
                  className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/5", speciesTone(info?.animal.species).soft)}
                  aria-hidden
                >
                  <Species className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {info ? (
                      <Link
                        to={getPatientRecordPath(info.client.id, info.animal.id, info.animal.patientCode)}
                        className="font-semibold hover:text-primary hover:underline"
                      >
                        {info.animal.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">Pet</span>
                    )}
                    <span className="text-muted-foreground"> · {info?.client.name ?? "Tutor"}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.kind === "vacina" ? (
                      <>
                        <span className="font-medium text-sky-700">{item.vaccine}</span> · dose anterior em {formatBR(item.appointmentDate)}
                      </>
                    ) : (
                      <>
                        Após {displayAppointmentType(item.appointmentType as never)} de {formatBR(item.appointmentDate)}
                      </>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {resolvedAt && (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-500/15">
                        <Check className="h-3 w-3" aria-hidden />
                        Resolvido em {new Date(resolvedAt).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                    {sentAt && (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                        <CheckCircle2 className="h-3 w-3" aria-hidden />
                        Avisado em {new Date(sentAt).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pl-12 sm:shrink-0 sm:flex-nowrap sm:justify-end sm:pl-0">
                <div className="sm:text-right">
                  <p className="text-sm font-bold tabular-nums text-foreground">{formatBR(item.dueDate)}</p>
                  <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", TONES[u.tone].badge)}>{u.label}</span>
                </div>
                <div className="flex items-center gap-1.5 max-sm:w-full max-sm:[&>*]:flex-1 sm:shrink-0">
                {resolvedAt ? (
                  <Button size="sm" variant="outline" className="h-9 gap-1.5 font-semibold" onClick={() => void unresolve(item)}>
                    <Undo2 className="h-4 w-4" aria-hidden />
                    Desfazer
                  </Button>
                ) : (
                  <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 border-emerald-200 font-semibold text-emerald-800 hover:bg-emerald-50"
                  title="Já resolvido (ex.: acompanhamento feito pelo WhatsApp) — sai da lista sem mandar lembrete"
                  onClick={() => setResolving(item)}
                >
                  <Check className="h-4 w-4" aria-hidden />
                  Resolvido
                </Button>
                <Button
                  size="sm"
                  variant={sentAt ? "outline" : "default"}
                  className={cn(
                    "h-9 gap-1.5 font-semibold",
                    !sentAt && "bg-[#25D366] text-white hover:bg-[#1fb957]",
                    !hasPhone && "opacity-60"
                  )}
                  title={hasPhone ? "Abrir o WhatsApp com a mensagem pronta" : "Cliente sem telefone cadastrado"}
                  onClick={() => void remind(item)}
                >
                  <SiWhatsapp className={cn("h-4 w-4", sentAt && "text-[#25D366]")} aria-hidden />
                  {sentAt ? "Reenviar" : "Lembrar"}
                </Button>
                  </>
                )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <PageShell className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Vacinas e acompanhamentos"
        description="Quem está para vencer — avise o tutor pelo WhatsApp com a mensagem pronta."
        icon={CalendarDays}
        module="clinical"
        breadcrumb={<>Agenda &gt; Lembretes</>}
        className="mb-0 sm:mb-0"
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div role="radiogroup" aria-label="Período" className="inline-flex w-full rounded-xl bg-muted p-1 sm:w-auto">
          {PERIODS.map(({ key, label }) => {
            const on = period === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPeriod(key)}
                className={cn(
                  "flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none",
                  on ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          role="radio"
          aria-checked={period === "overdue"}
          onClick={() => setPeriod("overdue")}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
            period === "overdue" ? "border-rose-600 bg-rose-600 text-white" : "border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-50"
          )}
        >
          <AlertTriangle className="h-4 w-4" aria-hidden />
          Atrasados
          <span className={cn("rounded-full px-1.5 text-xs tabular-nums", period === "overdue" ? "bg-white/20" : "bg-rose-100")}>{overdueCount}</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={period === "resolved"}
          onClick={() => setPeriod("resolved")}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
            period === "resolved" ? "border-slate-700 bg-slate-700 text-white" : "border-border bg-card text-slate-700 hover:bg-muted"
          )}
        >
          <Check className="h-4 w-4" aria-hidden />
          Resolvidos
          <span className={cn("rounded-full px-1.5 text-xs tabular-nums", period === "resolved" ? "bg-white/20" : "bg-muted")}>{resolvedItems.length}</span>
        </button>
      </div>

      <KpiStrip
        compactOnPhone
        loading={loadingAppointments}
        items={[
          { label: "Vacinas", icon: Syringe, tone: "sky", value: String(vacinas.length), hint: periodText },
          { label: "Acompanhamentos", icon: RotateCcw, tone: "orange", value: String(retornos.length), hint: periodText },
          {
            label: "Atrasados",
            icon: AlertTriangle,
            tone: "rose",
            value: String(overdueCount),
            hint: "ainda sem retorno",
            colorValue: overdueCount > 0,
            onClick: overdueCount > 0 ? () => setPeriod("overdue") : undefined,
          },
          { label: "Já avisados", icon: MessageCircle, tone: "emerald", value: `${sentCount} de ${visible.length}`, hint: "nesta lista" },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title={period === "resolved" ? "Vacinas resolvidas" : period === "overdue" ? "Vacinas atrasadas" : "Próximas vacinas"}
          icon={Syringe}
          tone="sky"
          description="Próxima dose registrada no atendimento de vacina"
          actions={<span className="rounded-full bg-sky-100 px-2 text-xs font-bold tabular-nums text-sky-700">{vacinas.length}</span>}
        >
          {renderList(vacinas, period === "resolved" ? "Nenhuma vacina dada como resolvida." : period === "overdue" ? "Nenhuma vacina atrasada." : `Nenhuma vacina ${periodText}.`)}
        </Panel>

        <Panel
          title={period === "resolved" ? "Acompanhamentos resolvidos" : period === "overdue" ? "Acompanhamentos atrasados" : "Próximos acompanhamentos"}
          icon={RotateCcw}
          tone="orange"
          description="“Próximo acompanhamento (dias)” registrado no atendimento"
          actions={<span className="rounded-full bg-orange-100 px-2 text-xs font-bold tabular-nums text-orange-700">{retornos.length}</span>}
        >
          {renderList(
            retornos,
            period === "resolved" ? "Nenhum acompanhamento dado como resolvido." : period === "overdue" ? "Nenhum acompanhamento atrasado." : `Nenhum acompanhamento ${periodText}.`
          )}
        </Panel>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <IconChip icon={CheckCircle2} tone="emerald" size="sm" />
        <span className="pt-1.5">
          Some da lista sozinho quando o pet volta: vacina com a dose seguinte aplicada, ou acompanhamento com um novo atendimento
          registrado depois. Se já resolveu de outro jeito (ex.: conversa pelo WhatsApp), toque em <strong>Resolvido</strong>.
        </span>
      </p>
      <ResolveReminderDialog
        item={resolving}
        petName={resolving ? animalMap.get(resolving.animalId)?.animal.name : undefined}
        clientName={resolving ? animalMap.get(resolving.animalId)?.client.name : undefined}
        onClose={() => setResolving(null)}
        onConfirm={(item, note) => resolve(item, note)}
      />
    </PageShell>
  );
}
