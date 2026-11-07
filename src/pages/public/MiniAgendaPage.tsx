import React from "react";
import { CalendarCheck, Pin, RefreshCw } from "lucide-react";
import { listScheduleTimesInRange, type ScheduleTimeSummary } from "@/lib/schedulesApi";
import { subscribeAgendaChanges } from "@/lib/agendaHoldsApi";
import { formatScheduleTimeRange } from "@/lib/agendaKinds";
import { canPinMiniAgenda, openMiniAgenda } from "@/lib/pinMiniAgenda";
import { KindPlaceChip } from "@/components/agenda/bookingKindVisual";
import { generateUUID, getTodayLocalISO } from "@/lib/utils";

const DAYS_AHEAD = 6;
const REFRESH_MS = 30_000;
const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
const minutesOf = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

function dayTitle(iso: string, today: string) {
  const d = new Date(`${iso}T12:00:00`);
  const label = `${WEEKDAYS[d.getDay()]}, ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
  if (iso === today) return `Hoje — ${label}`;
  if (iso === addDays(today, 1)) return `Amanhã — ${label}`;
  return label;
}

function Item({ b, past }: { b: ScheduleTimeSummary; past: boolean }) {
  return (
    <li className={`rounded-[10px] bg-white/70 px-2.5 py-2 shadow-[0_1px_0_rgba(0,0,0,0.06)] ${past ? "opacity-50" : ""}`}>
      <div className="flex items-baseline gap-2">
        <span className="shrink-0 rounded-md bg-amber-300/80 px-1.5 py-0.5 text-[12px] font-extrabold tabular-nums text-slate-900">
          {formatScheduleTimeRange(b.time, b.durationMinutes)}
        </span>
        <span className="min-w-0 truncate text-[13px] font-bold text-slate-900">{b.clientName || "Sem nome"}</span>
      </div>
      {b.kind ? <KindPlaceChip kind={b.kind} info={b.kindInfo} className="mt-1.5 px-2 py-0.5 text-xs" /> : null}
      {b.title ? <p className="mt-1 text-[12px] text-slate-700">{b.title}</p> : null}
      {b.kindInfo?.obs ? <p className="text-[11px] italic text-slate-500">Obs.: {b.kindInfo.obs}</p> : null}
    </li>
  );
}

/** Agenda compacta (estilo post-it) para deixar numa janelinha sempre visível. Atualiza sozinha. */
export default function MiniAgendaPage() {
  const sessionId = React.useRef(generateUUID()).current;
  const [bookings, setBookings] = React.useState<ScheduleTimeSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [tick, setTick] = React.useState(() => new Date());
  const [updatedAt, setUpdatedAt] = React.useState<Date | null>(null);

  const today = getTodayLocalISO();
  const todayRef = React.useRef(today);
  todayRef.current = today;

  const load = React.useCallback(async () => {
    setFetching(true);
    try {
      const start = todayRef.current;
      const rows = await listScheduleTimesInRange(start, addDays(start, DAYS_AHEAD));
      setBookings(rows);
      setFailed(false);
      setUpdatedAt(new Date());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    const refresh = window.setInterval(() => void load(), REFRESH_MS);
    // A janela fica aberta por dias: mantém "hoje" e a hora certos.
    const clock = window.setInterval(() => setTick(new Date()), 30_000);
    let timer: number | undefined;
    const unsubscribe = subscribeAgendaChanges(`mini-${sessionId}`, () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(), 300);
    });
    return () => {
      window.clearInterval(refresh);
      window.clearInterval(clock);
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [load, sessionId]);

  const nowMin = tick.getHours() * 60 + tick.getMinutes();

  const groups = React.useMemo(() => {
    const map = new Map<string, ScheduleTimeSummary[]>();
    for (const b of bookings) {
      if (b.kind === "bloqueio" || b.date < today) continue;
      map.set(b.date, [...(map.get(b.date) ?? []), b]);
    }
    for (const list of map.values()) list.sort((a, b) => a.time.localeCompare(b.time));
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [bookings, today]);

  const hasToday = groups.some(([d]) => d === today);
  const insideFrame = window.self !== window.top;

  return (
    <div className="flex h-screen flex-col bg-[#fff6b8] text-slate-900">
      <header className="flex items-center gap-2 border-b border-amber-300/70 bg-[#ffec82] px-3 py-2.5">
        <CalendarCheck className="h-4 w-4 shrink-0 text-amber-800" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold leading-tight">Agenda</p>
          <p className="truncate text-[11px] leading-tight text-amber-900/80">
            {tick.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            {updatedAt ? ` • atualizado ${updatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          title="Atualizar agora"
          className="grid h-7 w-7 place-items-center rounded-full text-amber-900 hover:bg-amber-300/60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${fetching ? "animate-spin" : ""}`} />
        </button>
        {!insideFrame ? (
          <button
            type="button"
            onClick={() => void openMiniAgenda()}
            title={canPinMiniAgenda() ? "Fixar sobre as outras janelas" : "Abrir em janela pequena"}
            className="grid h-7 w-7 place-items-center rounded-full text-amber-900 hover:bg-amber-300/60"
          >
            <Pin className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {failed ? (
          <p className="rounded-[10px] bg-red-100 px-3 py-2 text-[12px] font-semibold text-red-800">Não consegui carregar a agenda. Vou tentar de novo sozinho.</p>
        ) : null}
        {loading ? <p className="text-center text-[12px] text-amber-900/70">Carregando…</p> : null}

        {!loading && !hasToday ? (
          <section>
            <h2 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-900/80">{dayTitle(today, today)}</h2>
            <p className="rounded-[10px] bg-white/60 px-3 py-2 text-[12px] text-slate-600">Nada agendado para hoje.</p>
          </section>
        ) : null}

        {groups.map(([date, list]) => (
          <section key={date}>
            <h2 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-900/80">
              {dayTitle(date, today)} <span className="font-semibold">({list.length})</span>
            </h2>
            <ul className="space-y-1.5">
              {list.map((b) => (
                <Item key={b.id} b={b} past={date === today && minutesOf(b.time) + (b.durationMinutes ?? 30) <= nowMin} />
              ))}
            </ul>
          </section>
        ))}

        {!loading && groups.length === 0 && !failed ? <p className="text-center text-[12px] text-amber-900/70">Nada agendado nos próximos {DAYS_AHEAD + 1} dias.</p> : null}
      </main>
    </div>
  );
}
