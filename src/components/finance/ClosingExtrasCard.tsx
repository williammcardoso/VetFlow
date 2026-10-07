import React from "react";
import { AlertTriangle, Loader2, Lock, PlusCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addClosingExtra, deleteClosingExtra, type ClosingExtra, type ExtraBeneficiary } from "@/lib/closingExtrasApi";
import { CLOSING_PARTNERS } from "@/lib/monthlyClosing";
import { cn, formatCurrencyBRL } from "@/lib/utils";

const fmt = formatCurrencyBRL;

const TONE: Record<ExtraBeneficiary, { badge: string; on: string; off: string }> = {
  clinic: {
    badge: "bg-teal-50 text-teal-800 ring-teal-200",
    on: "border-teal-600 bg-teal-600 text-white hover:bg-teal-700",
    off: "border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100",
  },
  agro: {
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    on: "border-amber-600 bg-amber-600 text-white hover:bg-amber-700",
    off: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
  },
};

const PARTNER_LABEL: Record<ExtraBeneficiary, string> = {
  clinic: CLOSING_PARTNERS.clinic,
  agro: CLOSING_PARTNERS.agro,
};

/** "1.000,50" / "1000.50" / "R$ 80" → número (NaN se não der). */
export function parseMoneyBR(raw: string): number {
  const s = raw.replace(/R\$|\s/g, "");
  if (!s) return NaN;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  return Number(normalized);
}

// Valores fora do 50/50 (ex.: aplicações a domicílio cobradas no sistema da
// agropecuária = 100% clínica). Não mexem no lucro; somam na parte de quem recebe.
export function ClosingExtrasCard({
  year,
  month,
  items,
  available,
  loading,
  locked,
  descriptions,
  createdBy,
  onChange,
}: {
  year: number;
  month: number;
  items: ClosingExtra[];
  /** Tabela criada (migration 20261007120000). */
  available: boolean;
  loading: boolean;
  /** Mês fechado: só leitura. */
  locked: boolean;
  /** Descrições usadas antes (sugestão). */
  descriptions: string[];
  createdBy?: string;
  onChange: (items: ClosingExtra[]) => void;
}) {
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [beneficiary, setBeneficiary] = React.useState<ExtraBeneficiary>("clinic");
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseMoneyBR(amount);
    if (!description.trim()) {
      toast.error("Escreva a descrição (ex.: Aplicações a domicílio).");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    setSaving(true);
    try {
      const created = await addClosingExtra({ year, month, description, amount: value, beneficiary, createdBy });
      onChange([...items, created]);
      setDescription("");
      setAmount("");
      toast.success(`Acréscimo de ${fmt(value)} para ${PARTNER_LABEL[beneficiary]} lançado.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar o acréscimo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ClosingExtra) => {
    setDeleting(item.id);
    try {
      await deleteClosingExtra(item.id);
      onChange(items.filter((i) => i.id !== item.id));
      toast.success("Acréscimo excluído.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao excluir o acréscimo.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Card className="rounded-xl border-violet-200 bg-violet-50/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PlusCircle className="h-5 w-5 text-violet-600" aria-hidden />
          Acréscimos fora do 50/50
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Valores que não entram na divisão e vão direto para uma das partes — ex.: aplicações a domicílio cobradas no sistema da
          agropecuária, que são 100% da clínica.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!available && !loading ? (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Falta rodar no Supabase o SQL <code className="text-xs">20261007120000_fechamento_acrescimos.sql</code> para lançar acréscimos.
          </p>
        ) : loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando...
          </p>
        ) : (
          <>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum acréscimo neste mês.</p>
            ) : (
              <ul className="divide-y divide-border/60 rounded-lg border border-border/70 bg-card">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{item.description}</span>
                    <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset", TONE[item.beneficiary].badge)}>
                      {PARTNER_LABEL[item.beneficiary]}
                    </span>
                    <span className="w-28 shrink-0 text-right text-sm font-bold tabular-nums text-violet-700">+ {fmt(item.amount)}</span>
                    {!locked && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        disabled={deleting === item.id}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                        aria-label={`Excluir ${item.description}`}
                        title="Excluir"
                      >
                        {deleting === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {locked ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" aria-hidden /> Mês fechado: para lançar ou excluir acréscimos, reabra o mês.
              </p>
            ) : (
              <form onSubmit={handleAdd} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8.5rem_auto_auto] sm:items-end">
                <div className="min-w-0 space-y-1">
                  <Label htmlFor="extra-description" className="text-xs">
                    Descrição
                  </Label>
                  <Input
                    id="extra-description"
                    list="extra-descriptions"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex.: Aplicações a domicílio"
                    className="bg-input"
                  />
                  <datalist id="extra-descriptions">
                    {descriptions.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="extra-amount" className="text-xs">
                    Valor (R$)
                  </Label>
                  <Input
                    id="extra-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    className="bg-input text-right tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-medium">Para quem</span>
                  <div className="flex gap-1.5" role="radiogroup" aria-label="Para quem vai o valor">
                    {(["clinic", "agro"] as ExtraBeneficiary[]).map((b) => (
                      <button
                        key={b}
                        type="button"
                        role="radio"
                        aria-checked={beneficiary === b}
                        onClick={() => setBeneficiary(b)}
                        className={cn("h-9 rounded-lg border px-3 text-sm font-medium transition-colors", beneficiary === b ? TONE[b].on : TONE[b].off)}
                      >
                        {PARTNER_LABEL[b]}
                      </button>
                    ))}
                  </div>
                </div>
                <Button type="submit" disabled={saving} className="h-9 gap-1.5 bg-violet-600 text-white hover:bg-violet-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                  Adicionar
                </Button>
              </form>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
