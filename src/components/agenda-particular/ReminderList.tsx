import React from "react";
import { BellRing, CheckCheck, Loader2, PauseCircle, Pencil, Plus, Repeat, Send, Siren, Trash2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { IconChip, Panel } from "@/components/finance/FinanceUI";
import { TONES } from "@/components/finance/financeTheme";
import { isDue, nextLabel, ruleLabel, soundLabel, type PrivateReminder } from "@/lib/agendaParticular";
import { cn } from "@/lib/utils";

type Filter = "ativos" | "pausados";

/** "2026-11-23T08:00" (horário de Brasília) → "23/11/2026 às 08:00". */
const fmtLocal = (s: string) => {
  const [d = "", t = ""] = s.split("T");
  const [y, m, dd] = d.split("-");
  return y && m && dd ? `${dd}/${m}/${y}${t ? ` às ${t}` : ""}` : s;
};

function ReminderRow({
  r,
  todayISO,
  busy,
  onEdit,
  onToggle,
  onTest,
  onDelete,
}: {
  r: PrivateReminder;
  todayISO: string;
  busy: boolean;
  onEdit: () => void;
  onToggle: (ativo: boolean) => void;
  onTest: () => void;
  onDelete: () => void;
}) {
  const insiste = r.prioridade >= 2;
  const sentOnce = !r.ativo && !r.aCadaDias && !!r.ultimo;
  const tone = !r.ativo ? "slate" : insiste ? "rose" : "teal";
  const icon = sentOnce ? CheckCheck : !r.ativo ? PauseCircle : insiste ? Siren : BellRing;
  return (
    <li className="grid gap-x-4 gap-y-2 border-b border-border/70 px-4 py-3 last:border-b-0 xl:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex min-w-0 items-start gap-3">
        <IconChip icon={icon} tone={tone} size="sm" />
        <div className="min-w-0 space-y-0.5">
          <p className={cn("break-words text-[15px] font-semibold leading-snug", !r.ativo && "text-muted-foreground")}>{r.texto}</p>
          {r.detalhes ? <p className="break-words text-sm text-muted-foreground">{r.detalhes}</p> : null}
          <p className="text-sm text-foreground/80">
            {r.ativo ? (
              <>
                Próximo: <strong className={cn("font-bold tabular-nums", TONES[tone].text)}>{nextLabel(r.proximo, todayISO)}</strong>
                {isDue(r.proximo) ? <span className="ml-1 text-xs font-medium text-amber-700">(sai em instantes)</span> : null}
              </>
            ) : sentOnce ? (
              <>Enviado em <span className="font-semibold tabular-nums">{fmtLocal(r.ultimo!)}</span></>
            ) : (
              <span className="font-semibold text-muted-foreground">Pausado</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Repeat className="h-3.5 w-3.5" aria-hidden />
              {ruleLabel(r.aCadaDias, r.hora, r.proximo)}
            </span>
            {insiste ? (
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ring-1", TONES.rose.badge)}>
                <Siren className="h-3 w-3" aria-hidden /> Insiste até confirmar
              </span>
            ) : null}
            {r.som ? (
              <span className="inline-flex items-center gap-1">
                <Volume2 className="h-3.5 w-3.5" aria-hidden /> {soundLabel(r.som)}
              </span>
            ) : null}
            {r.ultimo && !sentOnce ? <span title={`Último aviso: ${fmtLocal(r.ultimo)}`}>Último: {fmtLocal(r.ultimo)}</span> : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 pl-11 xl:pl-0">
        <label className="mr-1 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Switch checked={r.ativo} onCheckedChange={onToggle} disabled={busy} aria-label={r.ativo ? "Pausar" : "Reativar"} />
          {r.ativo ? "Ligado" : "Desligado"}
        </label>
        <Button variant="ghost" size="sm" onClick={onTest} disabled={busy} title="Mandar um aviso de teste agora">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="ml-1.5 hidden sm:inline">Testar</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit} disabled={busy} title="Editar">
          <Pencil className="h-4 w-4" />
          <span className="ml-1.5 hidden sm:inline">Editar</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} disabled={busy} title="Apagar" className="text-rose-700 hover:bg-rose-50 hover:text-rose-800">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

export function ReminderList({
  reminders,
  todayISO,
  busyId,
  onNew,
  onEdit,
  onToggle,
  onTest,
  onDelete,
}: {
  reminders: PrivateReminder[];
  todayISO: string;
  busyId: number | null;
  onNew: () => void;
  onEdit: (r: PrivateReminder) => void;
  onToggle: (r: PrivateReminder, ativo: boolean) => void;
  onTest: (r: PrivateReminder) => void;
  onDelete: (r: PrivateReminder) => void;
}) {
  const [filter, setFilter] = React.useState<Filter>("ativos");
  const ativos = reminders.filter((r) => r.ativo);
  const pausados = reminders.filter((r) => !r.ativo);
  const list = filter === "ativos" ? ativos : pausados;

  return (
    <Panel
      title="Lembretes"
      icon={BellRing}
      tone="teal"
      description="Os próximos avisos primeiro."
      actions={
        <>
          <div className="flex gap-1">
            {(["ativos", "pausados"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  filter === f ? "border-teal-700 bg-teal-700 text-white" : "border-border bg-card hover:bg-muted"
                )}
              >
                {f === "ativos" ? "Ligados" : "Desligados"} <span className="tabular-nums">{f === "ativos" ? ativos.length : pausados.length}</span>
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={onNew} className="lg:hidden">
            <Plus className="mr-1 h-4 w-4" /> Novo
          </Button>
        </>
      }
    >
      {list.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          {filter === "ativos" ? "Nenhum lembrete ligado. Crie um no formulário." : "Nenhum lembrete desligado."}
        </p>
      ) : (
        <ul>
          {list.map((r) => (
            <ReminderRow
              key={r.id}
              r={r}
              todayISO={todayISO}
              busy={busyId === r.id}
              onEdit={() => onEdit(r)}
              onToggle={(a) => onToggle(r, a)}
              onTest={() => onTest(r)}
              onDelete={() => onDelete(r)}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}
