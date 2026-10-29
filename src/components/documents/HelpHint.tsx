import * as React from "react";
import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * "?" ao lado de um campo: toque/clique abre a dica. Popover, não tooltip —
 * tooltip depende de passar o mouse e não abre no celular.
 */
export function HelpHint({ text, label = "Ajuda", className }: { text: string; label?: string; className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors",
            "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            className
          )}
        >
          <HelpCircle className="h-4 w-4" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-72 text-sm leading-relaxed">
        {text}
      </PopoverContent>
    </Popover>
  );
}
