import React from "react";
import { CalendarDays, ChevronDown, ListOrdered, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { IconChip, Panel } from "@/components/finance/FinanceUI";
import { TONES, categoryVisual } from "@/components/finance/financeTheme";
import { formatQtyName, type DayGroup, type ItemGroup } from "@/lib/salesBreakdown";
import { cn, formatCurrencyBRL } from "@/lib/utils";

const fmt = formatCurrencyBRL;
const dayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const weekday = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
const qtyLabel = (q: number) => (Number.isInteger(q) ? String(q) : q.toLocaleString("pt-BR"));

function useOpenSet() {
  const [open, setOpen] = React.useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return { open, toggle };
}

/** Linha de uma venda dentro do detalhe (abre o detalhe da venda). */
function SaleLine({
  date,
  time,
  animalName,
  clientName,
  middle,
  value,
  onOpen,
}: {
  date: string;
  time?: string;
  animalName: string;
  clientName: string;
  middle?: React.ReactNode;
  value: number;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 py-2 pl-14 pr-4 text-left transition-colors hover:bg-muted/70"
        title="Ver a venda"
      >
        <span className="w-[74px] shrink-0 text-xs tabular-nums text-muted-foreground">
          {dayMonth(date)}
          {time ? ` ${time}` : ""}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">
            <span className="font-semibold text-foreground">{animalName}</span>
            <span className="text-muted-foreground"> · {clientName}</span>
          </span>
          {middle}
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{fmt(value)}</span>
      </button>
    </li>
  );
}

// "5 hemogramas, 10 consultas": cada item do período com a quantidade e o
// valor; clicar mostra os clientes, e cada cliente abre a venda.
export function SalesByItemPanel({ groups, onOpenSale }: { groups: ItemGroup[]; onOpenSale: (saleId: string) => void }) {
  const { open, toggle } = useOpenSet();
  const [query, setQuery] = React.useState("");
  const q = query
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
  const shown = q
    ? groups.filter((g) => g.name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().includes(q))
    : groups;
  const totalQty = groups.reduce((s, g) => s + g.quantity, 0);

  return (
    <Panel
      title="Vendas por item"
      icon={ListOrdered}
      tone="sky"
      description="Quantas vezes cada item saiu · clique para ver os clientes"
      className="print:break-inside-avoid"
      actions={
        <span className="text-xs text-muted-foreground">
          <span className="font-bold tabular-nums text-sky-700">{qtyLabel(totalQty)}</span> itens · {groups.length} tipos
        </span>
      }
    >
      {groups.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhum item vendido no período.</p>
      ) : (
        <>
          {groups.length > 8 && (
            <div className="relative border-b border-border/70 px-4 py-2 print:hidden">
              <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrar item (ex.: hemograma)"
                className="h-8 bg-input pl-8 text-sm"
                aria-label="Filtrar item"
              />
            </div>
          )}
          <ul className="max-h-[480px] divide-y divide-border/70 overflow-y-auto">
            {shown.map((g) => {
              const v = categoryVisual(g.category);
              const isOpen = open.has(g.key);
              return (
                <li key={g.key}>
                  <button
                    type="button"
                    onClick={() => toggle(g.key)}
                    aria-expanded={isOpen}
                    className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50", isOpen && "bg-sky-50/50")}
                  >
                    <IconChip icon={v.icon} tone={v.tone} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{g.name}</span>
                    <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-sm font-bold tabular-nums ring-1 ring-inset", TONES.sky.badge)}>
                      {qtyLabel(g.quantity)}×
                    </span>
                    <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">{fmt(g.total)}</span>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform print:hidden", isOpen && "rotate-180")} aria-hidden />
                  </button>
                  {isOpen && (
                    <ul className="divide-y divide-border/50 border-t border-border/50 bg-muted/30">
                      {g.lines.map((l, i) => (
                        <SaleLine
                          key={`${l.saleId}-${i}`}
                          date={l.date}
                          time={l.time}
                          animalName={l.animalName}
                          clientName={l.clientName}
                          middle={l.quantity !== 1 ? <span className="text-xs text-muted-foreground">{qtyLabel(l.quantity)}×</span> : undefined}
                          value={l.subtotal}
                          onOpen={() => onOpenSale(l.saleId)}
                        />
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhum item com esse nome.</li>}
          </ul>
        </>
      )}
    </Panel>
  );
}

// Lista corrida: dia 01 — consulta, hemograma; dia 03 — consulta...
// Clicar no dia abre as vendas dele.
export function DailySalesPanel({ days, onOpenSale }: { days: DayGroup[]; onOpenSale: (saleId: string) => void }) {
  const { open, toggle } = useOpenSet();
  return (
    <Panel
      title="Itens vendidos por dia"
      icon={CalendarDays}
      tone="teal"
      description="Lista corrida do período · clique no dia para ver as vendas"
      className="print:break-inside-avoid"
      actions={<span className="text-xs text-muted-foreground">{days.length} {days.length === 1 ? "dia" : "dias"} com venda</span>}
    >
      {days.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma venda no período.</p>
      ) : (
        <ul className="max-h-[480px] divide-y divide-border/70 overflow-y-auto">
          {days.map((d) => {
            const isOpen = open.has(d.date);
            return (
              <li key={d.date}>
                <button
                  type="button"
                  onClick={() => toggle(d.date)}
                  aria-expanded={isOpen}
                  className={cn("flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50", isOpen && "bg-teal-50/50")}
                >
                  <span className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-teal-50 py-1 ring-1 ring-inset ring-teal-100">
                    <span className="text-sm font-bold tabular-nums text-teal-800">{dayMonth(d.date)}</span>
                    <span className="text-[10px] font-medium uppercase text-teal-700/80">{weekday(d.date)}</span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-wrap gap-1 pt-0.5">
                    {d.items.map((it) => (
                      <span key={it.name} className="rounded-md bg-muted/70 px-1.5 py-0.5 text-xs font-medium text-foreground/85">
                        {formatQtyName(it.name, it.quantity)}
                      </span>
                    ))}
                  </span>
                  <span className="shrink-0 pt-0.5 text-right">
                    <span className="block text-sm font-bold tabular-nums text-foreground">{fmt(d.total)}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {d.sales.length} {d.sales.length === 1 ? "venda" : "vendas"}
                    </span>
                  </span>
                  <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform print:hidden", isOpen && "rotate-180")} aria-hidden />
                </button>
                {isOpen && (
                  <ul className="divide-y divide-border/50 border-t border-border/50 bg-muted/30">
                    {d.sales.map((s) => (
                      <SaleLine
                        key={s.saleId}
                        date={s.date}
                        time={s.time}
                        animalName={s.animalName}
                        clientName={s.clientName}
                        middle={
                          <span className="block truncate text-xs text-muted-foreground">
                            {s.items.map((it) => formatQtyName(it.name, it.quantity)).join(" · ")}
                          </span>
                        }
                        value={s.amount}
                        onOpen={() => onOpenSale(s.saleId)}
                      />
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
