import * as React from "react";
import { Check, Search, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { ClientAvatar, isDeceased, speciesIcon, speciesTone } from "@/components/clients/clientVisuals";
import { findCounterClient, searchClients } from "@/lib/clientSearch";
import { cn, formatPhoneBR } from "@/lib/utils";
import type { Client } from "@/types/client";

const MAX_RESULTS = 6;

/**
 * Escolha de cliente + pet numa peça só (PDV, Orçamentos, Agenda). Busca por
 * tutor, pet, telefone, CPF ou nº da ficha, com o resultado mostrando telefone
 * e pets; buscar pelo pet já escolhe o pet junto. Escolhido, vira um cartão
 * com os pets em etiquetas (no lugar do menu suspenso antigo) e "Trocar".
 */
export function ClientPetPicker({
  id,
  clients,
  clientId,
  animalId,
  onChange,
  petRequired = false,
  counterShortcut = false,
  inline = false,
}: {
  id?: string;
  clients: Client[];
  clientId: string;
  animalId: string;
  onChange: (clientId: string, animalId: string) => void;
  /** Pet obrigatório (Agenda): sem "Nenhum", e cliente com um pet só já vem com ele marcado. */
  petRequired?: boolean;
  /** Atalho "Venda de balcão" para o cliente Consumidor (PDV). */
  counterShortcut?: boolean;
  /**
   * Lista de resultados no fluxo, logo abaixo do campo, em vez de flutuando.
   * Use dentro de Dialog: o modal bloqueia a rolagem (roda do mouse e dedo) de
   * tudo que fica fora dele, e a lista flutuante é desenhada fora.
   */
  inline?: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();

  const selected = clientId ? clients.find((c) => c.id === clientId) : undefined;
  const counter = React.useMemo(() => (counterShortcut ? findCounterClient(clients) : undefined), [clients, counterShortcut]);
  const hits = React.useMemo(() => searchClients(clients, query), [clients, query]);
  const shown = hits.slice(0, MAX_RESULTS);
  const showList = open && query.trim() !== "";

  React.useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  // Lista no fluxo: fecha ao tocar/clicar fora (a flutuante já faz isso sozinha).
  React.useEffect(() => {
    if (!inline || !showList) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [inline, showList]);

  const pick = (client: Client, petIds: string[] = []) => {
    setQuery("");
    setOpen(false);
    setActive(0);
    const living = (client.animals ?? []).filter((a) => !isDeceased(a));
    onChange(client.id, petIds[0] ?? (petRequired && living.length === 1 ? living[0].id : ""));
  };

  const clear = () => {
    onChange("", "");
    // O campo de busca só existe depois que o cartão some.
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  if (selected) {
    const phone = formatPhoneBR(selected.mainPhoneContact);
    const pets = (selected.animals ?? []).filter((a) => !isDeceased(a) || a.id === animalId);
    return (
      <div className="min-w-0 rounded-xl border border-border bg-muted/30 p-2.5">
        <div className="flex items-center gap-2.5">
          <ClientAvatar name={selected.name} className="h-9 w-9 text-xs" />
          <div className="min-w-0 flex-1">
            {/* Quebra em vez de cortar: na coluna do PDV (23rem) nome comprido sumia em "…". */}
            <p className="break-words font-semibold leading-snug text-foreground">{selected.name}</p>
            <p className="truncate text-xs text-muted-foreground">{phone || "Sem telefone"}</p>
          </div>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            Trocar
          </button>
        </div>

        {petRequired && pets.length === 0 && (
          <p className="mt-2.5 border-t border-border/70 pt-2.5 text-xs font-medium text-amber-700">
            Nenhum animal cadastrado para este cliente.
          </p>
        )}

        {pets.length > 0 && (
          <div className="mt-2.5 border-t border-border/70 pt-2.5">
            <p id={`${listId}-pets`} className="mb-1.5 text-xs font-medium text-muted-foreground">
              Pet{" "}
              {petRequired ? (
                <span className="text-destructive" aria-hidden>*</span>
              ) : (
                <span className="font-normal">(opcional)</span>
              )}
            </p>
            <div role="radiogroup" aria-labelledby={`${listId}-pets`} aria-required={petRequired || undefined} className="flex flex-wrap gap-1.5">
              {!petRequired && <PetOption label="Nenhum" checked={!animalId} onClick={() => onChange(selected.id, "")} />}
              {pets.map((a) => (
                <PetOption
                  key={a.id}
                  label={a.name}
                  species={a.species}
                  checked={a.id === animalId}
                  onClick={() => onChange(selected.id, a.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (open) setActive((i) => Math.min(i + 1, shown.length - 1));
      else setOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (showList && shown[active]) {
        e.preventDefault();
        pick(shown[active].client, shown[active].petIds);
      }
    } else if (e.key === "Escape") {
      if (query) setQuery("");
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const field = (
    <div ref={anchorRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        ref={inputRef}
        id={id}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Tutor, pet, telefone ou CPF"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && shown[active] ? `${listId}-${active}` : undefined}
        className="h-10 bg-card pl-9"
      />
    </div>
  );

  const list = (
    <div
      ref={listRef}
      id={listId}
      role="listbox"
      aria-label="Clientes encontrados"
      // No fluxo quem rola é a página/o modal; flutuando, a própria lista.
      className={cn(!inline && "max-h-[20rem] overflow-y-auto")}
    >
      {shown.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
      ) : (
        shown.map(({ client, petIds }, i) => {
          const phone = formatPhoneBR(client.mainPhoneContact);
          const pets = (client.animals ?? []).filter((a) => !isDeceased(a) || petIds.includes(a.id));
          return (
            <div
              key={client.id}
              id={`${listId}-${i}`}
              data-index={i}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onMouseMove={() => setActive(i)}
              onClick={() => pick(client, petIds)}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2",
                i === active ? "bg-accent text-accent-foreground" : "hover:bg-muted"
              )}
            >
              <ClientAvatar name={client.name} className="mt-0.5 h-8 w-8 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{client.name}</p>
                <p className="truncate text-xs text-muted-foreground">{phone || "Sem telefone"}</p>
                {pets.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {pets.slice(0, 4).map((a) => {
                      const Icon = speciesIcon(a.species);
                      const hit = petIds.includes(a.id);
                      return (
                        <span
                          key={a.id}
                          className={cn(
                            "inline-flex h-5 max-w-full items-center gap-1 rounded-full border px-1.5 text-[11px] font-semibold",
                            hit ? speciesTone(a.species).chip : "border-border bg-card text-muted-foreground"
                          )}
                        >
                          <Icon className={cn("h-3 w-3 shrink-0", !hit && speciesTone(a.species).icon)} aria-hidden />
                          <span className="truncate">{a.name}</span>
                        </span>
                      );
                    })}
                    {pets.length > 4 && <span className="text-[11px] text-muted-foreground">+{pets.length - 4}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
      {hits.length > MAX_RESULTS && (
        <p className="px-2 pb-1 pt-1.5 text-center text-xs text-muted-foreground">
          Mais {hits.length - MAX_RESULTS} — continue digitando para achar.
        </p>
      )}
    </div>
  );

  return (
    <div ref={rootRef} className="min-w-0 space-y-2">
      {inline ? (
        <>
          {field}
          {showList && <div className="rounded-xl border border-border bg-popover p-1 shadow-sm">{list}</div>}
        </>
      ) : (
        <Popover open={showList} onOpenChange={setOpen}>
          <PopoverAnchor asChild>{field}</PopoverAnchor>
          <PopoverContent
            align="start"
            className="w-[var(--radix-popover-trigger-width)] min-w-[17rem] p-1"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            // Clicar no próprio campo não fecha a lista.
            onInteractOutside={(e) => {
              if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
            }}
          >
            {list}
          </PopoverContent>
        </Popover>
      )}

      {counter && (
        <button
          type="button"
          onClick={() => pick(counter)}
          className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <Store className="h-4 w-4 shrink-0 text-teal-600" aria-hidden />
          <span className="truncate">Venda de balcão · {counter.name}</span>
        </button>
      )}
    </div>
  );
}

function PetOption({
  label,
  species,
  checked,
  onClick,
}: {
  label: string;
  species?: string;
  checked: boolean;
  onClick: () => void;
}) {
  const Icon = species !== undefined ? speciesIcon(species) : null;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        checked
          ? cn("ring-2 ring-primary/60 ring-offset-1", species !== undefined ? speciesTone(species).chip : "border-foreground/20 bg-muted text-foreground")
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {checked ? (
        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : (
        Icon && <Icon className={cn("h-3.5 w-3.5 shrink-0", species !== undefined && speciesTone(species).icon)} aria-hidden />
      )}
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}
