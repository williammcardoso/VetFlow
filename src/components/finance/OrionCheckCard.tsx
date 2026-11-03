import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ClipboardCheck, ListChecks, Loader2, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import CurrencyInput from "@/components/CurrencyInput";
import { IconChip } from "@/components/finance/FinanceUI";
import { reconcileWithOrion } from "@/lib/monthlyClosing";
import { cn, formatCurrencyBRL } from "@/lib/utils";

const fmt = formatCurrencyBRL;

// Conferência do Fechamento 50/50 com o Orion (sistema da Agrocentro, onde o
// cliente paga): o "Total Venda" do relatório completo deles tem que dar as
// vendas do VetFlow + os acréscimos lançados à parte (aplicações a domicílio,
// que no Orion entram como venda).
export function OrionCheckCard({
  vendas,
  acrescimos,
  value,
  loading,
  shared,
  locked,
  detailHref,
  onSave,
}: {
  /** Vendas do mês no VetFlow (faturado). */
  vendas: number;
  acrescimos: number;
  /** Total Venda do Orion (null = ainda não digitado). */
  value: number | null;
  loading: boolean;
  /** false = guardado só neste aparelho (migration não aplicada). */
  shared: boolean;
  /** Mês fechado: só leitura. */
  locked: boolean;
  /** Vendas item a item do mês. */
  detailHref: string;
  onSave: (value: number | null) => Promise<void>;
}) {
  const [draft, setDraft] = React.useState(value ?? 0);
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => setDraft(value ?? 0), [value]);
  const { vetflow, diff } = reconcileWithOrion(vendas, acrescimos, value);
  const dirty = Math.round(draft * 100) !== Math.round((value ?? 0) * 100);

  const save = async (next: number | null) => {
    setSaving(true);
    try {
      await onSave(next);
    } finally {
      setSaving(false);
    }
  };

  const rows = [
    { label: "Vendas do mês no VetFlow", value: vendas },
    { label: "(+) Acréscimos lançados", value: acrescimos },
  ];

  return (
    <Card className="rounded-xl border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <IconChip icon={ClipboardCheck} tone="amber" size="sm" /> Conferência com o Orion
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          O "Total Venda" do relatório completo do Orion tem que dar as vendas do VetFlow mais os acréscimos.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : locked ? (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Total Venda no Orion:{" "}
            <span className="font-semibold text-foreground tabular-nums">{value == null ? "não informado" : fmt(value)}</span>
          </p>
        ) : (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void save(draft > 0 ? draft : null);
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="orion-total" className="text-xs">
                Total Venda no Orion
              </Label>
              <CurrencyInput id="orion-total" value={draft} onValueChange={setDraft} className="w-40 text-right tabular-nums" />
            </div>
            <Button type="submit" variant="outline" disabled={saving || !dirty} className="h-10 gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Salvar
            </Button>
          </form>
        )}

        <div className="space-y-0.5 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between border-b border-border/50 py-1.5">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-semibold tabular-nums">{fmt(r.value)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-b border-border/50 py-1.5">
            <span className="font-medium">= Total no VetFlow</span>
            <span className="font-bold tabular-nums">{fmt(vetflow)}</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="font-medium">Total Venda no Orion</span>
            <span className="font-bold tabular-nums">{value == null ? "—" : fmt(value)}</span>
          </div>
        </div>

        {diff != null && (
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm",
              diff === 0 ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
            )}
          >
            <span className="flex items-center gap-1.5 font-semibold">
              {diff === 0 ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <AlertTriangle className="h-4 w-4" aria-hidden />}
              {diff === 0 ? "Bateu com o Orion" : diff < 0 ? `Faltam ${fmt(-diff)} no VetFlow` : `VetFlow tem ${fmt(diff)} a mais que o Orion`}
            </span>
            {diff !== 0 && (
              <Link to={detailHref} className="inline-flex items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline">
                <ListChecks className="h-3.5 w-3.5" aria-hidden /> Achar a diferença
              </Link>
            )}
          </div>
        )}
        {!shared && !loading && value != null && (
          <p className="text-[11px] text-muted-foreground">
            Guardado só neste aparelho — rode a migration 20261103120000 no Supabase para valer em todos.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
