import React from "react";
import { BellRing, CalendarRange, Info } from "lucide-react";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { IconChip, Panel } from "@/components/finance/FinanceUI";
import { TONES, type Tone } from "@/components/finance/financeTheme";
import { KIND_ICON } from "@/components/NotificationBell";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppNotifications, useNotificationPrefs } from "@/hooks/useAppNotifications";
import { useAuth } from "@/contexts/AuthContext";
import type { NotificationKind } from "@/lib/notifications";
import type { NotificationPrefs } from "@/lib/notificationPrefs";
import { cn } from "@/lib/utils";

type ToggleKey = "agenda" | "pendentes" | "vacinas" | "acompanhamentos" | "backup";

const TOGGLES: Array<{
  key: ToggleKey;
  kind: NotificationKind;
  tone: Tone;
  title: string;
  description: string;
  example: string;
  adminOnly?: boolean;
}> = [
  {
    key: "agenda",
    kind: "agenda",
    tone: "sky",
    title: "Próximos horários",
    description: "Atendimentos da agenda nas próximas 2 horas.",
    example: "10:30 — Consulta · Rex · Maria · em 30 min",
  },
  {
    key: "pendentes",
    kind: "pendente",
    tone: "amber",
    title: "Horários sem conclusão",
    description: "Horários de hoje que já passaram e não foram marcados como atendidos.",
    example: "08:00 — Consulta · Sem conclusão · marque na agenda",
  },
  {
    key: "vacinas",
    kind: "vacina",
    tone: "sky",
    title: "Vacinas",
    description: "Próxima dose de vacina chegando ou atrasada, com o botão de lembrar pelo WhatsApp.",
    example: "V10 — Mel · Ana · amanhã",
  },
  {
    key: "acompanhamentos",
    kind: "retorno",
    tone: "orange",
    title: "Acompanhamentos",
    description: "Acompanhamento recomendado no atendimento chegando ou atrasado.",
    example: "Acompanhamento — Kiara · atrasado há 4 dias",
  },
  {
    key: "backup",
    kind: "backup",
    tone: "violet",
    title: "Backup atrasado",
    description: "Quando passar de 7 dias sem backup neste computador.",
    example: "Backup dos dados atrasado · fazer agora",
    adminOnly: true,
  },
];

const AHEAD_OPTIONS = [1, 3, 7, 15, 30];
const OVERDUE_OPTIONS = [0, 7, 15, 30, 60, 90, 365];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Configuração › Notificações: o que o sininho mostra e com quanto tempo.
// Salva na hora (sem botão), vale no computador e no celular.
export default function NotificationSettingsPage() {
  const { session } = useAuth();
  const { prefs, update, savedOnlyHere } = useNotificationPrefs();
  const { all } = useAppNotifications();

  const countByKind = React.useMemo(() => {
    const map: Partial<Record<NotificationKind, number>> = {};
    for (const n of all) map[n.kind] = (map[n.kind] ?? 0) + 1;
    return map;
  }, [all]);

  const toggles = TOGGLES.filter((t) => !t.adminOnly || session?.role === "admin");
  const enabledCount = toggles.filter((t) => prefs[t.key]).length;

  return (
    <PageShell className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Notificações"
        description="Escolha o que aparece no sininho e com quanto tempo de antecedência."
        icon={BellRing}
        module="settings"
        breadcrumb={<>Painel &gt; Configuração &gt; Notificações</>}
        className="mb-0 sm:mb-0"
      />

      {savedOnlyHere && (
        <p className={cn("flex items-start gap-2 rounded-xl border px-3 py-2 text-sm", TONES.amber.card)}>
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          <span className="text-amber-900">
            Salvo só neste aparelho. Para valer também no celular/outro computador, aplique a migration
            <code className="mx-1 rounded bg-white/70 px-1 text-xs">20260930120000_settings_notifications_key.sql</code>
            no Supabase.
          </span>
        </p>
      )}

      <Panel
        title="O que aparece no sininho"
        icon={BellRing}
        tone="sky"
        description={`${plural(enabledCount, "tipo ligado", "tipos ligados")} de ${toggles.length}`}
      >
        <ul className="divide-y divide-border/70">
          {toggles.map((t) => {
            const on = prefs[t.key];
            const count = countByKind[t.kind] ?? 0;
            const id = `notif-${t.key}`;
            return (
              <li key={t.key} className={cn("flex items-start gap-3 px-4 py-3.5", !on && "bg-muted/20")}>
                <IconChip icon={KIND_ICON[t.kind]} tone={t.tone} className={cn(!on && "opacity-50")} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <label htmlFor={id} className={cn("cursor-pointer font-semibold", on ? "text-foreground" : "text-muted-foreground")}>
                      {t.title}
                    </label>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                        count > 0 && on ? TONES[t.tone].badge : "bg-muted text-muted-foreground ring-border"
                      )}
                    >
                      {count > 0 ? `hoje: ${plural(count, "aviso", "avisos")}` : "nada hoje"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground/80">
                    Exemplo: <span className="italic">{t.example}</span>
                  </p>
                </div>
                <Switch id={id} checked={on} onCheckedChange={(v) => void update({ [t.key]: v } as Partial<NotificationPrefs>)} className="mt-1" />
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="Prazos das vacinas e acompanhamentos" icon={CalendarRange} tone="orange" description="Vale para o sininho">
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Avisar com antecedência de</label>
            <Select value={String(prefs.diasAntes)} onValueChange={(v) => void update({ diasAntes: Number(v) })}>
              <SelectTrigger aria-label="Dias de antecedência">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AHEAD_OPTIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {plural(d, "dia", "dias")} antes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Quando a data prevista estiver a esse número de dias ou menos.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Mostrar atrasados por até</label>
            <Select value={String(prefs.atrasadosAte)} onValueChange={(v) => void update({ atrasadosAte: Number(v) })}>
              <SelectTrigger aria-label="Dias de atraso">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OVERDUE_OPTIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d === 0 ? "Não mostrar atrasados" : d === 365 ? "Sempre (até 1 ano)" : `${plural(d, "dia", "dias")} depois da data`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Depois disso sai do sininho, mas continua na tela de lembretes.</p>
          </div>
        </div>
      </Panel>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <IconChip icon={Info} tone="slate" size="sm" />
        <span className="pt-1.5">
          Salva na hora. Desligar um tipo só tira do sininho — as telas (Agenda, Vacinas e acompanhamentos, Backup) continuam mostrando tudo.
        </span>
      </p>
    </PageShell>
  );
}
