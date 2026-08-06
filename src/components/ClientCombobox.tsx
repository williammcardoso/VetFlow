import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ClientComboboxOption {
  id: string;
  name: string;
}

interface ClientComboboxProps {
  clients: ClientComboboxOption[];
  value?: string;
  onChange: (clientId: string | undefined) => void;
  placeholder?: string;
  /** Rótulo da opção que limpa a seleção. Omitido = sem opção de limpar. */
  allLabel?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Seleção de cliente com busca digitável.
 *
 * Um `<Select>` simples fica inutilizável conforme a base cresce (vira um
 * scroll de milhares de itens), então todo campo de cliente do sistema usa
 * este componente.
 */
const ClientCombobox: React.FC<ClientComboboxProps> = ({
  clients,
  value,
  onChange,
  placeholder = "Selecione o cliente...",
  allLabel,
  disabled,
  className,
  id,
}) => {
  const [open, setOpen] = React.useState(false);
  const selected = value ? clients.find((c) => c.id === value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between border border-border bg-card font-normal text-sm",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{selected?.name ?? (value ? "—" : placeholder)}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar cliente..." className="h-9" />
          <CommandList>
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup>
              {allLabel && (
                <CommandItem
                  value={allLabel}
                  onSelect={() => {
                    onChange(undefined);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                  {allLabel}
                </CommandItem>
              )}
              {clients.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.name}
                  onSelect={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === c.id ? "opacity-100" : "opacity-0")}
                  />
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ClientCombobox;
