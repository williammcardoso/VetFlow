import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconChip, Panel } from "@/components/finance/FinanceUI";
import { TONES, type Tone } from "@/components/finance/financeTheme";
import { cn } from "@/lib/utils";

// Histórico do prontuário: tudo o que aconteceu com o paciente, agrupado por
// dia, com filtro por tipo. Cada evento traz o próprio botão — "Abrir" leva à
// tela do registro, "Ver" leva ao item na aba dele (destacado), "PDF" abre o
// arquivo. Antes era um olho igual pra tudo: em exame/receita abria a edição,
// em documento do editor não fazia nada e em arquivo enviado pelo celular
// tentava navegar pro conteúdo do arquivo como se fosse um endereço.

export type TimelineKind =
  | "atendimento"
  | "agendamento"
  | "exame"
  | "receita"
  | "documento"
  | "venda"
  | "peso"
  | "observacao";

export interface TimelineAction {
  label: string;
  icon?: LucideIcon;
  title?: string;
  onClick: () => void;
}

export interface TimelineItem {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm (opcional) */
  time?: string;
  kind: TimelineKind;
  /** Selo do evento (ex.: "Receita controlada"). */
  label: string;
  title: string;
  subtitle?: string;
  /** Só quando se sabe quem fez — nunca o usuário logado como palpite. */
  author?: string;
  icon: LucideIcon;
  tone: Tone;
  /** Cancelado: título riscado e cores apagadas. */
  muted?: boolean;
  actions?: TimelineAction[];
}

const KIND_FILTERS: Array<{ kind: TimelineKind; label: string }> = [
  { kind: "atendimento", label: "Atendimentos" },
  { kind: "exame", label: "Exames" },
  { kind: "receita", label: "Receitas" },
  { kind: "documento", label: "Documentos" },
  { kind: "venda", label: "Vendas" },
  { kind: "peso", label: "Peso" },
  { kind: "observacao", label: "Observações" },
  { kind: "agendamento", label: "Agendamentos" },
];

const PAGE_SIZE = 40;

const sortKey = (item: Pick<TimelineItem, "date" | "time">) =>
  `${item.date.slice(0, 10)}T${(item.time || "00:00").slice(0, 5)}`;


function localDate(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

function dayLabel(iso: string, today = new Date()): string {
  const d = localDate(iso);
  if (!d) return iso || "Sem data";
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((start.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  const label = d.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function PatientTimeline({ items: rawItems, petName }: { items: TimelineItem[]; petName?: string }) {
  // Mais recente primeiro (data + hora; sem hora conta como 00:00). Antes a
  // ordenação montava Date com "undefined" quando faltava a hora e a ordem
  // desses eventos ficava aleatória.
  const items = React.useMemo(() => [...rawItems].sort((a, b) => sortKey(b).localeCompare(sortKey(a))), [rawItems]);
  const [kind, setKind] = React.useState<TimelineKind | "all">("all");
  const [visible, setVisible] = React.useState(PAGE_SIZE);
  React.useEffect(() => setVisible(PAGE_SIZE), [kind]);

  const counts = React.useMemo(() => {
    const acc = {} as Record<TimelineKind, number>;
    for (const it of items) acc[it.kind] = (acc[it.kind] ?? 0) + 1;
    return acc;
  }, [items]);
  const filters = KIND_FILTERS.filter((f) => (counts[f.kind] ?? 0) > 0);

  const filtered = kind === "all" ? items : items.filter((it) => it.kind === kind);
  const shown = filtered.slice(0, visible);
  const remaining = filtered.length - shown.length;

  // Agrupa por dia mantendo a ordem (a lista já vem do mais recente pro mais antigo).
  const groups = React.useMemo(() => {
    const out: Array<{ date: string; items: TimelineItem[] }> = [];
    for (const it of shown) {
      const day = it.date.slice(0, 10);
      const last = out[out.length - 1];
      if (last && last.date === day) last.items.push(it);
      else out.push({ date: day, items: [it] });
    }
    return out;
  }, [shown]);

  return (
    <Panel
      title="Linha do tempo"
      icon={History}
      tone="teal"
      description={petName ? `Tudo o que aconteceu com ${petName}, do mais recente ao mais antigo` : "Do mais recente ao mais antigo"}
    >
      {filters.length > 1 && (
        <div className="border-b border-border/70 p-3 sm:p-4">
          <div role="radiogroup" aria-label="Tipo de evento" className="flex w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1 sm:inline-flex sm:w-auto">
            {[{ kind: "all" as const, label: "Todos" }, ...filters].map((f) => {
              const active = kind === f.kind;
              const n = f.kind === "all" ? items.length : counts[f.kind];
              return (
                <button
                  key={f.kind}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setKind(f.kind)}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                    active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f.label}
                  <span className="ml-1.5 text-xs font-semibold tabular-nums text-muted-foreground">{n}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 ring-1 ring-teal-100">
            <History className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-3 text-sm font-semibold text-foreground">Nenhum evento registrado</p>
          <p className="mt-1 text-sm text-muted-foreground">Atendimentos, exames, receitas, documentos e vendas aparecem aqui.</p>
        </div>
      ) : (
        <>
          {groups.map((group) => (
            <section key={group.date} aria-label={dayLabel(group.date)}>
              <h3 className="flex items-center justify-between gap-2 border-b border-border/70 bg-muted/30 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>{dayLabel(group.date)}</span>
                <span className="font-medium normal-case tracking-normal">
                  {group.items.length} {group.items.length === 1 ? "evento" : "eventos"}
                </span>
              </h3>
              <ol className="relative">
                {/* Trilho ligando os ícones do dia */}
                {group.items.length > 1 && (
                  <span aria-hidden className="absolute bottom-7 left-[29.5px] top-7 w-px bg-border sm:left-[33.5px]" />
                )}
                {group.items.map((it) => (
                  <li
                    key={it.id}
                    className="relative flex items-start gap-3 border-b border-border/50 px-3 py-3 transition-colors last:border-b-0 hover:bg-muted/40 sm:px-4"
                  >
                    <IconChip icon={it.icon} tone={it.tone} className={cn("relative", it.muted && "opacity-60")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span
                              className={cn(
                                "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                                TONES[it.tone].badge
                              )}
                            >
                              {it.label}
                            </span>
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {it.time ? it.time.slice(0, 5) : null}
                              {it.time && it.author ? " · " : null}
                              {it.author}
                            </span>
                          </div>
                          <p
                            className={cn(
                              "mt-1 font-semibold leading-snug text-foreground [overflow-wrap:anywhere]",
                              it.muted && "text-muted-foreground line-through"
                            )}
                          >
                            {it.title}
                          </p>
                          {it.subtitle && (
                            <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                              {it.subtitle}
                            </p>
                          )}
                        </div>
                        {it.actions && it.actions.length > 0 && (
                          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                            {it.actions.map((action) => {
                              const Icon = action.icon;
                              return (
                                <Button
                                  key={action.label}
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold"
                                  title={action.title}
                                  onClick={action.onClick}
                                >
                                  {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
                                  {action.label}
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-4 py-2.5 text-xs text-muted-foreground">
            <span aria-live="polite">
              {remaining > 0 ? `Mostrando ${shown.length} de ${filtered.length} eventos` : `${filtered.length} ${filtered.length === 1 ? "evento" : "eventos"}`}
            </span>
            {remaining > 0 && (
              <Button variant="ghost" size="sm" className="h-8" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Mostrar mais ({remaining})
              </Button>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}
