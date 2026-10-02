import React from "react";
import { Check, ChevronDown, Loader2, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { TONES } from "@/components/finance/financeTheme";
import { cn } from "@/lib/utils";

// Selo do prestador numa linha de repasse que, clicado, deixa trocar para
// onde o serviço foi (ex.: o hemograma desta vez foi para outro laboratório).
export function ProviderChangePopover({
  provider,
  options,
  serviceName,
  canApplyToCatalog,
  onChange,
}: {
  provider: string;
  /** Prestadores já conhecidos (relatório + cadastro). */
  options: string[];
  serviceName: string;
  /** O item veio do cadastro — dá pra levar a troca para as próximas vendas. */
  canApplyToCatalog: boolean;
  onChange: (provider: string, applyToCatalog: boolean) => Promise<boolean>;
}) {
  const [open, setOpen] = React.useState(false);
  const [custom, setCustom] = React.useState("");
  const [applyToCatalog, setApplyToCatalog] = React.useState(false);
  const [saving, setSaving] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setCustom("");
      setApplyToCatalog(false);
    }
  }, [open]);

  const choose = async (next: string) => {
    const name = next.trim();
    if (!name || saving) return;
    if (name === provider && !applyToCatalog) {
      setOpen(false);
      return;
    }
    setSaving(name);
    const ok = await onChange(name, applyToCatalog);
    setSaving(null);
    if (ok) setOpen(false);
  };

  const list = Array.from(new Set([provider, ...options])).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <Popover open={open} onOpenChange={(v) => !saving && setOpen(v)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset transition-colors hover:bg-orange-100 print:pointer-events-none",
            TONES.orange.badge
          )}
          title="Trocar o prestador deste serviço"
        >
          {provider}
          <ChevronDown className="h-3 w-3 opacity-70 print:hidden" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="border-b border-border/70 px-3 py-2">
          <p className="text-xs font-semibold text-foreground">Para onde foi?</p>
          <p className="truncate text-[11px] text-muted-foreground">{serviceName}</p>
        </div>
        <ul className="max-h-56 overflow-y-auto py-1">
          {list.map((p) => (
            <li key={p}>
              <button
                type="button"
                onClick={() => void choose(p)}
                disabled={!!saving}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-orange-50 disabled:opacity-60",
                  p === provider && "font-semibold text-orange-800"
                )}
              >
                <span className="min-w-0 truncate">{p}</span>
                {saving === p ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                ) : p === provider ? (
                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
        <form
          className="flex gap-1.5 border-t border-border/70 p-2"
          onSubmit={(e) => {
            e.preventDefault();
            void choose(custom);
          }}
        >
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Outro (ex.: Lab. Vida)"
            className="h-8 min-w-0 bg-input text-sm"
            aria-label="Nome de outro prestador"
          />
          <Button type="submit" size="sm" className="h-8 shrink-0 gap-1 bg-orange-600 px-2 text-white hover:bg-orange-700" disabled={!custom.trim() || !!saving}>
            {saving && saving === custom.trim() ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
            Usar
          </Button>
        </form>
        {canApplyToCatalog && (
          <label className="flex cursor-pointer items-start gap-2 border-t border-border/70 px-3 py-2 text-xs text-muted-foreground">
            <Checkbox checked={applyToCatalog} onCheckedChange={(v) => setApplyToCatalog(v === true)} className="mt-0.5" />
            <span>Usar também nas próximas vendas deste serviço (muda o cadastro)</span>
          </label>
        )}
      </PopoverContent>
    </Popover>
  );
}
