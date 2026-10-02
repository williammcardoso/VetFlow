import React from "react";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IconChip } from "@/components/finance/FinanceUI";
import { listProviderNotes, saveProviderNote } from "@/lib/providerNotes";
import { renderPdf, openPdf } from "@/lib/pdfExport";
import type { ProviderPayoutGroup } from "@/components/ProviderPayoutPdfContent";
import { formatCurrencyBRL, slugifyFileName } from "@/lib/utils";

// Gera o PDF de repasse (um prestador ou todos) para a Agrocentro agendar o
// pagamento. A observação de cada prestador (ex.: chave PIX) sai no PDF e,
// se marcado, fica guardada para os próximos repasses.
export function ProviderPayoutDialog({
  open,
  onOpenChange,
  groups,
  periodLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sem observação — ela é preenchida aqui. */
  groups: Omit<ProviderPayoutGroup, "note">[];
  periodLabel: string;
}) {
  const [saved, setSaved] = React.useState<Record<string, string>>({});
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [remember, setRemember] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    void listProviderNotes().then((map) => {
      if (!alive) return;
      setSaved(map);
      setNotes(Object.fromEntries(groups.map((g) => [g.provider, map[g.provider] ?? ""])));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const single = groups.length === 1;
  const total = groups.reduce((s, g) => s + g.lines.reduce((t, l) => t + l.amount, 0), 0);

  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      if (remember) {
        const changed = groups.filter((g) => (notes[g.provider] ?? "").trim() !== (saved[g.provider] ?? "").trim());
        const results = await Promise.all(changed.map((g) => saveProviderNote(g.provider, notes[g.provider] ?? "")));
        if (results.some((ok) => !ok)) toast.warning("O PDF sai com a observação, mas ela não ficou salva para a próxima vez.");
      }
      const withNotes: ProviderPayoutGroup[] = groups.map((g) => ({ ...g, note: (notes[g.provider] ?? "").trim() || undefined }));
      const blob = await renderPdf((K) => <K.ProviderPayoutPdfContent groups={withNotes} periodLabel={periodLabel} />);
      await openPdf({
        blob,
        fileName: `${slugifyFileName("repasse", single ? groups[0].provider : "prestadores", periodLabel)}.pdf`,
        persistOptions: { folder: "documents/generated" },
      });
      onOpenChange(false);
    } catch (err) {
      console.error("[repasse] PDF", err);
      toast.error("Não consegui gerar o PDF do repasse.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !generating && onOpenChange(v)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <IconChip icon={Printer} tone="orange" />
            <div className="min-w-0">
              <DialogTitle>{single ? `Repasse — ${groups[0].provider}` : `Repasses — ${groups.length} prestadores`}</DialogTitle>
              <DialogDescription>
                {periodLabel} · {formatCurrencyBRL(total)} · PDF para a Agrocentro agendar o pagamento.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-w-0 max-h-[55vh] space-y-3 overflow-y-auto pr-1">
          {loading ? (
            <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando observações salvas...
            </p>
          ) : (
            groups.map((g) => {
              const subtotal = g.lines.reduce((s, l) => s + l.amount, 0);
              const id = `payout-note-${g.provider}`;
              return (
                <div key={g.provider} className="min-w-0 space-y-1.5">
                  <Label htmlFor={id} className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate">
                      Observação{single ? "" : <> — <span className="font-semibold text-orange-700">{g.provider}</span></>}
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-orange-700">{formatCurrencyBRL(subtotal)}</span>
                  </Label>
                  <Textarea
                    id={id}
                    rows={single ? 3 : 2}
                    value={notes[g.provider] ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [g.provider]: e.target.value }))}
                    placeholder="Ex.: PIX (CNPJ) 12.345.678/0001-90 — Fulano de Tal"
                    className="bg-input"
                  />
                  {saved[g.provider] && (notes[g.provider] ?? "") === saved[g.provider] && (
                    <p className="text-[11px] text-muted-foreground">Observação salva da última vez.</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
          Lembrar {single ? "esta observação" : "as observações"} para os próximos repasses
        </label>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void generate()} disabled={generating || loading} className="bg-orange-600 text-white hover:bg-orange-700">
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Printer className="mr-2 h-4 w-4" aria-hidden />}
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
