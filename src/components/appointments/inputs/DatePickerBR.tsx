import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import DateInputBR from "@/components/appointments/inputs/DateInputBR";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  valueISO: string;
  onChangeISO: (nextISO: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
};

function isoToDate(valueISO?: string) {
  if (!valueISO) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valueISO)) return undefined;
  const dt = new Date(`${valueISO}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return undefined;
  return dt;
}

function dateToISO(dt: Date) {
  return format(dt, "yyyy-MM-dd");
}

/**
 * Campo de data pt-BR com máscara (DD/MM/AAAA) + seletor de calendário.
 * Permite digitação e seleção via calendário.
 */
export default function DatePickerBR({
  id,
  valueISO,
  onChangeISO,
  placeholder,
  className,
  required,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const selected = isoToDate(valueISO);

  return (
    <div className={cn("relative", className)}>
      <DateInputBR
        id={id}
        valueISO={valueISO}
        onChangeISO={onChangeISO}
        required={required}
        placeholder={placeholder}
        className={cn("pr-10", className)}
      />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
            aria-label="Abrir calendário"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (!d) return;
              onChangeISO(dateToISO(d));
              setOpen(false);
            }}
            locale={ptBR}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
