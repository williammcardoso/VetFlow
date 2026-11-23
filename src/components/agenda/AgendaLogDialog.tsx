import React from "react";
import {
  CalendarDays,
  CalendarPlus,
  ClipboardCheck,
  KeyRound,
  Loader2,
  LogOut,
  Monitor,
  Pencil,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Search,
  StickyNote,
  Trash2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconChip } from "@/components/finance/FinanceUI";
import { TONES, type Tone } from "@/components/finance/financeTheme";
import { KindPlaceChip } from "@/components/agenda/bookingKindVisual";
import { getSession } from "@/lib/authApi";
import { fetchAgendaLog, AgendaLogError } from "@/lib/agendaLogApi";
import {
  EVENT_LABEL,
  entrySentence,
  entryTitle,
  formatDayHeader,
  formatLoggedAt,
  formatWhen,
  loggedDayKey,
  matchesLogSearch,
  type AgendaLogEntry,
  type AgendaLogEvent,
  type Seg,
} from "@/lib/agendaLog";
import { cn, getTodayLocalISO } from "@/lib/utils";

// Cor e ícone por tipo de registro: verde = agendado, âmbar = alterado,
// vermelho = cancelado (mesmo mapa de conceitos do resto do sistema).
const EVENT_VISUAL: Record<AgendaLogEvent, { icon: LucideIcon; tone: Tone; plural: string }> = {
  novo: { icon: CalendarPlus, tone: "emerald", plural: "Agendados" },
  alterado: { icon: Pencil, tone: "amber", plural: "Alterados" },
  cancelado: { icon: XCircle, tone: "rose", plural: "Cancelados" },
  reativado: { icon: RotateCcw, tone: "sky", plural: "Reativados" },
  excluido: { icon: Trash2, tone: "slate", plural: "Excluídos" },
  situacao: { icon: ClipboardCheck, tone: "violet", plural: "Situação" },
};
const EVENT_ORDER: AgendaLogEvent[] = ["novo", "alterado", "cancelado", "reativado", "excluido", "situacao"];

const PERIODS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "0", label: "Tudo" },
];

const hhmm = (iso: string) => formatLoggedAt(iso).split(" às ")[1] ?? "";

function dayKeyOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return loggedDayKey(d.toISOString());
}

function Sentence({ segs }: { segs: Seg[] }) {
  return (
    <p className="text-[15px] leading-snug text-foreground/80">
      {segs.map((s, i) =>
        s.bold ? (
          <strong key={i} className="font-bold text-foreground">
            {s.text}
          </strong>
        ) : (
          <React.Fragment key={i}>{s.text}</React.Fragment>
        )
      )}
    </p>
  );
}

function LogEntryRow({ entry, todayISO }: { entry: AgendaLogEntry; todayISO: string }) {
  const visual = EVENT_VISUAL[entry.event];
  const snap = entry.event === "excluido" ? entry.before : entry.after ?? entry.before;
  const obs = snap?.kindInfo.obs;
  const sentence = entrySentence(entry, todayISO);
  // O que a frase já disse não se repete no quadro de alterações.
  const labels = new Set(entry.changes.map((c) => c.label));
  const boxChanges = entry.changes.filter(
    (c) => c.label !== "Dia e horário" && !(c.label === "Cliente" && !labels.has("Dia e horário"))
  );
  return (
    <li className="grid gap-x-5 gap-y-2 border-b border-border/70 px-1 py-3 last:border-b-0 sm:grid-cols-[13rem_minmax(0,1fr)]">
      {/* O que aconteceu, quando e quem */}
      <div className="flex min-w-0 items-start gap-2.5">
        <IconChip icon={visual.icon} tone={visual.tone} size="sm" />
        <div className="min-w-0">
          <p className={cn("text-sm font-semibold leading-tight", TONES[visual.tone].text)}>{entryTitle(entry)}</p>
          {/* Celular: hora e computador na mesma linha; computador: um embaixo do outro. */}
          <div className="flex flex-wrap items-center gap-x-2 sm:block">
            <p className="text-xs text-muted-foreground" title={formatLoggedAt(entry.at)}>
              às <span className="font-semibold tabular-nums text-foreground">{hhmm(entry.at)}</span>
            </p>
            <p className="inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground sm:mt-0.5">
              <Monitor className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{entry.who || "—"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* O agendamento: a frase de bater o olho e, embaixo, os detalhes */}
      <div className="min-w-0 space-y-1.5">
        {sentence ? <Sentence segs={sentence} /> : null}

        {entry.legacyLines ? (
          // Registro de antes do log: o texto do aviso da época, numa linha corrida.
          <p className="break-words rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wide text-[10px]">Aviso da época: </span>
            {entry.legacyLines.slice(1).join("  ·  ")}
          </p>
        ) : snap ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {snap.kind ? <KindPlaceChip kind={snap.kind} info={snap.kindInfo} className="text-[11px]" /> : null}
            <span className="inline-flex items-center gap-1 tabular-nums">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              {formatWhen(snap)}
            </span>
            {obs ? (
              <span className="inline-flex min-w-0 items-start gap-1">
                <StickyNote className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="break-words">{obs}</span>
              </span>
            ) : null}
          </div>
        ) : null}

        {boxChanges.length > 0 ? (
          <ul className="mt-1 space-y-1 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm">
            {boxChanges.map((c, i) => (
              <li key={i} className="grid gap-x-2 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
                <span className="font-semibold text-amber-900">{c.label}</span>
                <span className="min-w-0 break-words">
                  <span className="text-rose-700 line-through decoration-rose-300">{c.before}</span>
                  <span className="mx-1.5 text-muted-foreground">→</span>
                  <span className="font-semibold text-emerald-800">{c.after}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Log detalhado da agenda (agenda pública). Abre só com usuário e senha do
 * VetFlow — a senha é conferida no banco a cada consulta e fica só na memória
 * enquanto o log está aberto (fechou, pede de novo).
 */
export function AgendaLogDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [username, setUsername] = React.useState(() => getSession()?.username ?? "");
  const [password, setPassword] = React.useState("");
  const [creds, setCreds] = React.useState<{ username: string; password: string } | null>(null);
  const [period, setPeriod] = React.useState("30");
  const [entries, setEntries] = React.useState<AgendaLogEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [eventFilter, setEventFilter] = React.useState<AgendaLogEvent | "todos">("todos");

  const load = React.useCallback(async (c: { username: string; password: string }, days: string) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAgendaLog(c.username, c.password, Number(days));
      setEntries(rows);
      setCreds(c);
      setPassword("");
    } catch (e) {
      if (e instanceof AgendaLogError && e.kind === "auth") setCreds(null);
      setError(e instanceof Error ? e.message : "Não deu para abrir o log.");
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = () => {
    setCreds(null);
    setEntries([]);
    setPassword("");
    setError(null);
    setQuery("");
    setEventFilter("todos");
  };

  const counts = React.useMemo(() => {
    const c = new Map<AgendaLogEvent, number>();
    for (const e of entries) c.set(e.event, (c.get(e.event) ?? 0) + 1);
    return c;
  }, [entries]);

  const visible = React.useMemo(
    () => entries.filter((e) => (eventFilter === "todos" || e.event === eventFilter) && matchesLogSearch(e, query)),
    [entries, eventFilter, query]
  );

  const groups = React.useMemo(() => {
    const out: { key: string; items: AgendaLogEntry[] }[] = [];
    for (const e of visible) {
      const key = loggedDayKey(e.at);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(e);
      else out.push({ key, items: [e] });
    }
    return out;
  }, [visible]);

  const todayKey = dayKeyOffset(0);
  const yesterdayKey = dayKeyOffset(-1);
  const todayISO = getTodayLocalISO();

  // Pedido do usuário: toda vez que abrir o log, pede a senha de novo — ao
  // fechar, a senha e o histórico saem da memória (o usuário fica preenchido).
  const handleOpenChange = (next: boolean) => {
    if (!next) signOut();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col gap-3 overflow-hidden sm:p-5",
          creds ? "max-w-5xl supports-[height:100dvh]:h-[90dvh] h-[90vh]" : "max-w-sm"
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-teal-700" aria-hidden /> Log da agenda
          </DialogTitle>
          <DialogDescription>
            {creds
              ? "Tudo o que foi agendado, alterado, cancelado ou excluído, com dia, hora e o computador."
              : "Entre com o usuário e a senha do VetFlow para ver o histórico de agendamentos."}
          </DialogDescription>
        </DialogHeader>

        {!creds ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!username.trim() || !password) {
                setError("Informe usuário e senha.");
                return;
              }
              void load({ username: username.trim(), password }, period);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="agenda-log-user">Usuário</Label>
              <Input
                id="agenda-log-user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoFocus={!username}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agenda-log-pass">Senha</Label>
              <Input
                id="agenda-log-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus={!!username}
              />
            </div>
            {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p> : null}
            <Button type="submit" className="w-full bg-teal-700 text-white hover:bg-teal-800" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              Abrir o log
            </Button>
          </form>
        ) : (
          <>
            {/* Busca, período e ações */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cliente, animal, computador..."
                  className="pl-8"
                  aria-label="Buscar no log"
                />
              </div>
              <Select
                value={period}
                onValueChange={(v) => {
                  setPeriod(v);
                  void load(creds, v);
                }}
              >
                <SelectTrigger className="w-[10.5rem]" aria-label="Período">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* No celular só o ícone, para caber na linha do período. */}
              <Button variant="outline" size="sm" onClick={() => void load(creds, period)} disabled={loading} aria-label="Atualizar" title="Atualizar">
                <RefreshCw className={cn("h-4 w-4 sm:mr-1.5", loading && "animate-spin")} />
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground" aria-label="Sair do log" title="Sair do log">
                <LogOut className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>

            {/* Filtro por tipo, com a contagem do período */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setEventFilter("todos")}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  eventFilter === "todos" ? "border-teal-700 bg-teal-700 text-white" : "border-border bg-card text-foreground hover:bg-muted"
                )}
              >
                Todos <span className="tabular-nums">{entries.length}</span>
              </button>
              {EVENT_ORDER.filter((ev) => counts.get(ev)).map((ev) => {
                const v = EVENT_VISUAL[ev];
                const active = eventFilter === ev;
                return (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => setEventFilter(active ? "todos" : ev)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1",
                      TONES[v.tone].badge,
                      active && "ring-2 ring-offset-1"
                    )}
                    title={EVENT_LABEL[ev]}
                  >
                    <v.icon className="h-3.5 w-3.5" aria-hidden />
                    {v.plural} <span className="tabular-nums">{counts.get(ev)}</span>
                  </button>
                );
              })}
            </div>

            {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p> : null}

            <div className={cn("min-h-0 flex-1 overflow-y-auto rounded-xl border border-border", loading && "opacity-60")}>
              {groups.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {loading ? "Carregando..." : entries.length === 0 ? "Nada registrado nesse período." : "Nada encontrado com esse filtro."}
                </p>
              ) : (
                groups.map((g) => (
                  <section key={g.key}>
                    <h3 className="sticky top-0 z-10 border-b border-border bg-muted/95 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground backdrop-blur">
                      {formatDayHeader(g.key, todayKey, yesterdayKey)}
                      <span className="ml-2 font-semibold normal-case tracking-normal tabular-nums">
                        {g.items.length} {g.items.length === 1 ? "registro" : "registros"}
                      </span>
                    </h3>
                    <ul className="px-2 sm:px-3">
                      {g.items.map((e) => (
                        <LogEntryRow key={e.id} entry={e} todayISO={todayISO} />
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
