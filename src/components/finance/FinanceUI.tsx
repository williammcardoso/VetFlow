import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONES, paymentMethodVisual, type Tone } from "@/components/finance/financeTheme";

/** Ícone num quadrado colorido (mesma linguagem dos cartões do Painel). */
export function IconChip({
  icon: Icon,
  tone,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box = size === "sm" ? "h-8 w-8 rounded-lg" : size === "lg" ? "h-11 w-11 rounded-xl" : "h-9 w-9 rounded-xl";
  const glyph = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-5 w-5" : "h-[18px] w-[18px]";
  return (
    <span className={cn("flex shrink-0 items-center justify-center ring-1", box, TONES[tone].chip, className)} aria-hidden>
      <Icon className={glyph} strokeWidth={2} />
    </span>
  );
}

/**
 * Seção em cartão com cabeçalho padrão: ícone colorido + título em negrito +
 * descrição curta, ações à direita.
 */
export function Panel({
  title,
  icon,
  tone,
  description,
  actions,
  children,
  className,
  ariaLabel,
  sectionRef,
}: {
  title: React.ReactNode;
  icon: LucideIcon;
  tone: Tone;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
  sectionRef?: React.Ref<HTMLElement>;
}) {
  return (
    <section
      ref={sectionRef}
      aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
      className={cn("min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border/70 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <IconChip icon={icon} tone={tone} size="sm" />
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold leading-tight text-foreground">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** Forma de pagamento como selo: ícone colorido + nome. */
export function PaymentMethodBadge({ method, className }: { method: string; className?: string }) {
  const { icon: Icon, tone } = paymentMethodVisual(method);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-muted/70 px-1.5 py-0.5 text-[11px] font-medium text-foreground/80",
        className
      )}
    >
      <Icon className={cn("h-3 w-3", TONES[tone].text)} aria-hidden />
      {method}
    </span>
  );
}

// Ícone já pintado na cor do conceito — para listas de opções (ChoiceGroup)
// que recebem só o componente do ícone. Cache: a mesma referência a cada
// render (senão o React recriaria o ícone).
const coloredIcons = new Map<string, React.ComponentType<{ className?: string }>>();
export function coloredIcon(Icon: LucideIcon, tone: Tone): React.ComponentType<{ className?: string }> {
  const key = `${Icon.displayName ?? Icon.name}:${tone}`;
  let Comp = coloredIcons.get(key);
  if (!Comp) {
    const Colored = ({ className }: { className?: string }) => <Icon className={cn(className, TONES[tone].text)} />;
    Colored.displayName = `Colored(${key})`;
    Comp = Colored;
    coloredIcons.set(key, Comp);
  }
  return Comp;
}
