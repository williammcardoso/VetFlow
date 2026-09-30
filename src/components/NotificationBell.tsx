import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  DatabaseBackup,
  RotateCcw,
  Settings2,
  Syringe,
  type LucideIcon,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IconChip } from "@/components/finance/FinanceUI";
import { TONES } from "@/components/finance/financeTheme";
import { ResolveReminderDialog } from "@/components/reminders/ResolveReminderDialog";
import { useAppNotifications } from "@/hooks/useAppNotifications";
import type { ReminderItem } from "@/lib/reminders";
import {
  loadReadMap,
  saveReadMap,
  SECTION_HREF,
  SECTION_LABELS,
  SECTION_ORDER,
  type AppNotification,
  type NotificationKind,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

export const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  agenda: Clock,
  pendente: CalendarClock,
  vacina: Syringe,
  retorno: RotateCcw,
  backup: DatabaseBackup,
};

/** Quantos itens por seção aparecem no sininho (o resto fica no "ver todos"). */
const PER_SECTION = 3;

// Sininho: cada item é um horário, um pet ou um aviso de verdade. Clicar
// marca como lido e abre a tela; o item some sozinho quando se resolve.
// O que aparece aqui é escolhido em Configuração › Notificações.
export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [readMap, setReadMap] = React.useState<Record<string, number>>(() => loadReadMap());
  const [resolving, setResolving] = React.useState<ReminderItem | null>(null);
  const { visible: notifications, animalMap, remind, resolve } = useAppNotifications();

  const unread = notifications.filter((n) => !readMap[n.id]).length;

  const markRead = (ids: string[]) => {
    const at = Date.now();
    setReadMap((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = next[id] ?? at;
      return saveReadMap(next, notifications.map((n) => n.id));
    });
  };

  const openItem = (n: AppNotification) => {
    markRead([n.id]);
    setOpen(false);
    navigate(n.href);
  };

  const sections = SECTION_ORDER.map((section) => ({
    section,
    items: notifications.filter((n) => n.section === section),
  })).filter((s) => s.items.length > 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={unread > 0 ? `Notificações: ${unread} não lidas` : "Notificações"}
        >
          <Bell className="h-4 w-4" strokeWidth={1.55} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(24rem,calc(100vw-1rem))] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <div className="flex items-baseline gap-2">
            <p className="text-sm font-bold text-foreground">Notificações</p>
            {unread > 0 && <span className="text-xs font-semibold text-rose-700">{unread} não {unread === 1 ? "lida" : "lidas"}</span>}
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => markRead(notifications.map((n) => n.id))}>
              Marcar tudo como lido
            </Button>
          )}
        </div>

        {sections.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            </span>
            <p className="mt-2 text-sm font-semibold text-foreground">Tudo em dia</p>
            <p className="text-xs text-muted-foreground">Nada precisando da sua atenção agora.</p>
          </div>
        ) : (
          <div className="max-h-[min(70vh,34rem)] overflow-y-auto">
            {sections.map(({ section, items }) => {
              const sectionUnread = items.filter((n) => !readMap[n.id]).length;
              return (
                <section key={section} className="border-b border-border/70 last:border-b-0">
                  <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {SECTION_LABELS[section]}
                      {sectionUnread > 0 && <span className="ml-1.5 text-rose-700">· {sectionUnread}</span>}
                    </p>
                    {items.length > PER_SECTION && (
                      <button
                        type="button"
                        className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
                        onClick={() => {
                          setOpen(false);
                          navigate(SECTION_HREF[section]);
                        }}
                      >
                        Ver todos ({items.length})
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    )}
                  </div>
                  <ul className="pb-1.5">
                    {items.slice(0, PER_SECTION).map((n) => (
                      <NotificationRow
                        key={n.id}
                        n={n}
                        read={!!readMap[n.id]}
                        onOpen={() => openItem(n)}
                        onRemind={
                          n.reminder
                            ? () => {
                                const item = n.reminder!;
                                void remind(item).then((ok) => ok && markRead([n.id]));
                              }
                            : undefined
                        }
                        onResolve={
                          n.reminder
                            ? () => {
                                setOpen(false);
                                setResolving(n.reminder!);
                              }
                            : undefined
                        }
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
        <p className="flex items-start justify-between gap-3 border-t border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          <span className="min-w-0">Clicar marca como lido. Cada aviso some sozinho quando é resolvido — ou toque em ✓ para dar baixa.</span>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary hover:underline"
            onClick={() => {
              setOpen(false);
              navigate("/settings/notifications");
            }}
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden />
            Configurar
          </button>
        </p>
      </PopoverContent>
      <ResolveReminderDialog
        item={resolving}
        petName={resolving ? animalMap.get(resolving.animalId)?.animal.name : undefined}
        clientName={resolving ? animalMap.get(resolving.animalId)?.client.name : undefined}
        onClose={() => setResolving(null)}
        onConfirm={(item, note) => resolve(item, note)}
      />
    </Popover>
  );
}

function NotificationRow({
  n,
  read,
  onOpen,
  onRemind,
  onResolve,
}: {
  n: AppNotification;
  read: boolean;
  onOpen: () => void;
  onRemind?: () => void;
  onResolve?: () => void;
}) {
  const t = TONES[n.tone];
  return (
    <li className={cn("group relative flex items-start gap-2.5 px-3 py-2 transition-colors hover:bg-muted/50", !read && "bg-sky-50/40")}>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-2.5 text-left">
        <IconChip icon={KIND_ICON[n.kind]} tone={n.tone} size="sm" className={cn(read && "opacity-60")} />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm", read ? "font-medium text-foreground/70" : "font-semibold text-foreground")}>{n.title}</span>
          <span className="block truncate text-xs text-muted-foreground">{n.detail}</span>
          {n.when && (
            <span className={cn("mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset", read ? "bg-muted text-muted-foreground ring-border" : t.badge)}>
              {n.when}
            </span>
          )}
        </span>
      </button>
      {onResolve && (
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={onResolve}
          className="mt-0.5 h-7 w-7 shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          title="Resolvido (ex.: já conversou pelo WhatsApp) — sai da lista sem mandar lembrete"
          aria-label={`Marcar como resolvido: ${n.title}`}
        >
          <Check className="h-4 w-4" aria-hidden />
        </Button>
      )}
      {onRemind && (
        <Button
          type="button"
          size="sm"
          onClick={onRemind}
          className="mt-0.5 h-7 shrink-0 gap-1 bg-[#25D366] px-2 text-xs font-semibold text-white hover:bg-[#1ebe5b]"
          aria-label={`Mandar lembrete pelo WhatsApp: ${n.title}`}
        >
          <SiWhatsapp className="h-3.5 w-3.5" aria-hidden />
          Lembrar
        </Button>
      )}
      {!read && <span className="absolute left-1 top-3.5 h-1.5 w-1.5 rounded-full bg-sky-500" aria-label="Não lida" />}
    </li>
  );
}
