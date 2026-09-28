import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Peças dos formulários de cadastro (cliente, animal). Padrão de SaaS de
// referência (Stripe/Vercel/Tailwind UI) + pesquisa Baymard/NN/g:
// - seções com título e explicação curta, sem abas escondendo campo;
// - uma coluna, com campos curtos e ligados lado a lado (CPF/RG, Cidade/UF);
// - opções visíveis (ChoiceGroup) no lugar de select quando são poucas;
// - só o obrigatório marcado (*), com legenda no topo;
// - um único "Salvar" fixo no rodapé.

/** Título + explicação à esquerda (tela larga) ou em cima (celular/tablet); campos num cartão. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid grid-cols-1 gap-3 xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-8", className)}>
      {/* xl:pt-6 = o mesmo respiro interno do cartão: o título fica na altura da primeira linha de campos. */}
      <div className="xl:pt-6">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {/* relative: dentro de <form>, o Radix cria <input>/<select> ocultos com
          position:absolute pra cada opção/select; sem um ancestral posicionado
          aqui eles "escapavam" da área de rolagem e a página inteira rolava
          (o cabeçalho sumia no celular). */}
      <div className="relative rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-6">{children}</div>
    </section>
  );
}

/**
 * Grade dos campos: 2 colunas iguais no celular/tablet e 4 no computador —
 * sempre as mesmas linhas verticais, então todo campo começa alinhado com os
 * das outras linhas e das outras seções (antes, com 12 fatias, cada linha
 * dividia de um jeito e nada batia).
 * O Field ocupa a linha toda por padrão (col-span-2); `col-span-1` = metade
 * no celular/tablet e 1/4 no computador; `lg:col-span-2` = metade no
 * computador; `sm:col-span-1` = linha toda só no celular.
 */
export function FieldGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-4 lg:grid-cols-4", className)}>{children}</div>;
}

export function Field({
  label,
  htmlFor,
  labelId,
  required,
  hint,
  error,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  /** Pra grupos (ChoiceGroup) que se ligam ao rótulo por aria-labelledby. */
  labelId?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("relative col-span-2 min-w-0 space-y-1.5", className)}>
      <Label id={labelId} htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (obrigatório)</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * Opções lado a lado (radio): tudo visível, um toque só — no lugar de um
 * select de 2 a 5 itens. `allowDeselect`: tocar de novo na marcada limpa
 * (campo opcional).
 */
export function ChoiceGroup<T extends string>({
  value,
  onChange,
  options,
  labelledBy,
  id,
  allowDeselect,
  className,
}: {
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  options: ChoiceOption<T>[];
  labelledBy?: string;
  id?: string;
  allowDeselect?: boolean;
  className?: string;
}) {
  return (
    <RadioGroupPrimitive.Root
      id={id}
      value={value ?? ""}
      onValueChange={(v) => onChange(v as T)}
      aria-labelledby={labelledBy}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map(({ value: optionValue, label, icon: Icon }) => (
        <RadioGroupPrimitive.Item
          key={optionValue}
          value={optionValue}
          onClick={() => {
            if (allowDeselect && optionValue === value) onChange(undefined);
          }}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition-colors",
            "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "data-[state=checked]:border-primary data-[state=checked]:bg-primary/[0.07] data-[state=checked]:text-primary data-[state=checked]:shadow-none data-[state=checked]:ring-1 data-[state=checked]:ring-primary"
          )}
        >
          {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
          {label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

/** Liga/desliga em forma de etiqueta (ex.: "aceita WhatsApp"). */
export function ToggleChip({
  pressed,
  onPressedChange,
  children,
}: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        pressed
          ? "border-primary bg-primary/[0.07] text-primary shadow-none ring-1 ring-primary"
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded border",
          pressed ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
        )}
        aria-hidden
      >
        {pressed ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      </span>
      {children}
    </button>
  );
}

/**
 * Leva o usuário até o primeiro campo com erro: rola até ele e dá foco (no
 * grupo de opções, foca a primeira opção).
 */
export function focusField(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  // Sem animação: rolagem suave é pulada quando a aba não está visível e não
  // respeita quem pediu menos movimento no aparelho.
  el.scrollIntoView({ block: "center" });
  const target = el.matches("input, textarea, button, select") ? el : el.querySelector<HTMLElement>("input, textarea, button");
  (target ?? el).focus({ preventScroll: true });
}

/**
 * Rodapé fixo com as ações do formulário. No celular/tablet vai de ponta a
 * ponta (margem negativa = padding do Layout: px-4, px-6 a partir de sm); no
 * computador fica exatamente na largura do conteúdo — as páginas de cadastro
 * têm largura máxima e a barra passava 24px pra cada lado dos cartões.
 */
export function StickyActionBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0",
        className
      )}
    >
      <div className="flex items-center justify-end gap-2">{children}</div>
    </div>
  );
}
