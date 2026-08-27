"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SmartComboOption {
  value: string;
  label: string;
}

export interface SmartComboInputHandle {
  focus: () => void;
  /** Limpa o texto digitado e fecha a lista — usado depois de "Adicionar" pra não deixar o campo com o item anterior nem abrir a lista sozinho. */
  reset: () => void;
}

interface SmartComboInputProps {
  options: SmartComboOption[];
  /**
   * Valor selecionado controlado de fora (ex.: editar um registro que já
   * tem cliente/item preenchido, ou limpar a seleção pelo componente-pai).
   * Omitir esse prop deixa o campo livre pra digitação sem nenhuma
   * sincronização (modo usado hoje no PDV e em Compras) — só passe `value`
   * quando o componente-pai realmente precisa controlar a seleção (é o que
   * os wrappers ClientCombobox/AutocompleteSelect fazem por baixo).
   */
  value?: string;
  onSelect: (value: string, option: SmartComboOption) => void;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "");

/**
 * Campo de texto com autocompletar: usuário digita direto no campo (não
 * precisa clicar num botão pra abrir) e a lista filtrada aparece abaixo; a
 * setinha à direita abre a lista completa sem precisar digitar nada.
 *
 * Diferente de AutocompleteSelect/ClientCombobox (que são um botão que abre
 * um popover com busca por dentro) — aqui o próprio campo é o texto
 * pesquisável, pensado pra digitação rápida no balcão.
 */
const SmartComboInput = forwardRef<SmartComboInputHandle, SmartComboInputProps>(
  (props, ref) => {
    const {
      options,
      value,
      onSelect,
      placeholder = "Digite para buscar...",
      emptyLabel = "Nenhum item encontrado.",
      className,
      id,
      disabled,
    } = props;
    // `"value" in props` (não `value !== undefined`) distingue "componente
    // controlado, sem seleção agora" de "nunca foi controlado" — o PDV e
    // Compras nunca passam `value`, então não são afetados pelo efeito
    // abaixo mesmo quando `value` seria `undefined` de qualquer jeito.
    const isControlled = "value" in props;
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      reset: () => {
        setQuery("");
        setOpen(false);
        setActiveIndex(0);
      },
    }));

    // Sincroniza o texto exibido com o valor controlado — cobre editar um
    // registro já preenchido (inclusive se `options` ainda estiver
    // carregando, por isso depende de `options.length` também) e limpar a
    // seleção de fora. Nunca mexe no que o usuário está digitando: só reage
    // quando `value`/a quantidade de opções muda, não a cada re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
      if (!isControlled) return;
      const match = options.find((o) => o.value === value);
      setQuery(match ? match.label : "");
    }, [value, isControlled, options.length]);

    const filtered = useMemo(() => {
      const q = normalize(query.trim());
      if (!q) return options;
      return options.filter((o) => normalize(o.label).includes(q));
    }, [options, query]);

    const handleSelect = (opt: SmartComboOption) => {
      setQuery(opt.label);
      setOpen(false);
      onSelect(opt.value, opt);
      inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        if (open && filtered[activeIndex]) {
          e.preventDefault();
          handleSelect(filtered[activeIndex]);
        }
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className={cn("relative", className)}>
            <Input
              ref={inputRef}
              id={id}
              value={query}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="off"
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
                setOpen(true);
              }}
              onKeyDown={handleKeyDown}
              className="h-10 bg-card pr-9"
            />
            <button
              type="button"
              tabIndex={-1}
              disabled={disabled}
              onClick={() => {
                setOpen((o) => !o);
                inputRef.current?.focus();
              }}
              className="absolute right-0 top-0 flex h-10 w-9 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
              aria-label="Abrir lista"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            </button>
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] max-h-64 overflow-auto p-1"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {filtered.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyLabel}</div>
          ) : (
            filtered.map((opt, i) => (
              <div
                key={opt.value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(opt)}
                className={cn(
                  "cursor-pointer rounded-sm px-2 py-1.5 text-sm",
                  i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                )}
              >
                {opt.label}
              </div>
            ))
          )}
        </PopoverContent>
      </Popover>
    );
  }
);

SmartComboInput.displayName = "SmartComboInput";

export default SmartComboInput;
