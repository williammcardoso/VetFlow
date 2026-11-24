import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Building, CheckCircle2, Loader2, Lock, Pencil, Printer, Scale, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CurrencyInput from "@/components/CurrencyInput";
import DatePickerBR from "@/components/appointments/inputs/DatePickerBR";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { KpiStrip } from "@/components/saas/KpiStrip";
import { IconChip, Panel } from "@/components/finance/FinanceUI";
import { CONCEPTS, TONES } from "@/components/finance/financeTheme";
import { ProviderPayoutDialog } from "@/components/finance/ProviderPayoutDialog";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { addFinancialTransaction, deleteFinancialTransaction, updateFinancialTransaction } from "@/lib/financialApi";
import { getMonthlyClosing } from "@/lib/monthlyClosingsApi";
import { listProviderNotes, providerNoteId, saveProviderNote } from "@/lib/providerNotes";
import { SHARED_EXPENSE_CATEGORY, expenseProvider, getMonthBounds, isSharedExpense, monthLabel } from "@/lib/monthlyClosing";
import type { FinancialTransaction } from "@/mockData/financial";
import { cn, formatCurrencyBRL, formatDateTime, getTodayLocalISO } from "@/lib/utils";

const fmt = formatCurrencyBRL;
const sum = (list: FinancialTransaction[]) => Math.round(list.reduce((s, t) => s + t.amount, 0) * 100) / 100;

/**
 * Despesas que entram no Fechamento 50/50 sem cobrar do cliente (aluguel de
 * centro cirúrgico, insulfilm da sala...): um repasse a fornecedor tirado do
 * que entrou, descontado antes da divisão. O PIX de cada fornecedor fica
 * salvo no mesmo cadastro do PDF de repasse dos prestadores — digitou uma vez,
 * vem preenchido no próximo lançamento.
 */
const ExpensesPage: React.FC = () => {
  const { transactions, loading, refetch } = useFinancialTransactions();
  const [searchParams] = useSearchParams();
  const now = new Date();
  const [year, setYear] = useState(() => {
    const m = (searchParams.get("mes") ?? "").match(/^(\d{4})-(\d{2})$/);
    return m ? Number(m[1]) : now.getFullYear();
  });
  const [month, setMonth] = useState(() => {
    const m = (searchParams.get("mes") ?? "").match(/^(\d{4})-(\d{2})$/);
    return m && Number(m[2]) >= 1 && Number(m[2]) <= 12 ? Number(m[2]) : now.getMonth() + 1;
  });
  const { from, to } = useMemo(() => getMonthBounds(year, month), [year, month]);
  const periodLabel = monthLabel(year, month);

  // Mês fechado: lista só para leitura (o fechamento travado não muda sozinho).
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    let cancelled = false;
    getMonthlyClosing(year, month).then((r) => !cancelled && setLocked(!!r));
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  // PIX salvo de cada fornecedor/prestador (fornecedor → observação).
  const [notes, setNotes] = useState<Record<string, string>>({});
  const reloadNotes = () => void listProviderNotes().then(setNotes);
  useEffect(() => {
    void listProviderNotes().then(setNotes);
  }, []);
  /** Nome já cadastrado que bate com o digitado (sem diferenciar acento/maiúscula). */
  const savedKey = (name: string) => {
    const id = providerNoteId(name);
    return name.trim() ? Object.keys(notes).find((k) => providerNoteId(k) === id) : undefined;
  };

  const allExpenses = useMemo(() => transactions.filter(isSharedExpense), [transactions]);
  const monthExpenses = useMemo(
    () =>
      allExpenses
        .filter((t) => t.date >= from && t.date <= to)
        .sort((a, b) => `${b.date}T${b.time || "00:00"}`.localeCompare(`${a.date}T${a.time || "00:00"}`)),
    [allExpenses, from, to]
  );
  const total = sum(monthExpenses);
  const monthProviders = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthExpenses) map.set(expenseProvider(t), (map.get(expenseProvider(t)) ?? 0) + t.amount);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  // Sugestões: fornecedores das despesas anteriores + quem já tem PIX salvo.
  const providerOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const add = (name: string) => {
      const id = providerNoteId(name);
      if (name.trim() && !seen.has(id)) {
        seen.add(id);
        out.push(name.trim());
      }
    };
    [...allExpenses].sort((a, b) => b.date.localeCompare(a.date)).forEach((t) => add(expenseProvider(t)));
    Object.keys(notes).forEach(add);
    return out;
  }, [allExpenses, notes]);
  const descriptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of [...allExpenses].sort((a, b) => b.date.localeCompare(a.date))) {
      const d = t.description.trim();
      if (d && !seen.has(d.toLowerCase())) {
        seen.add(d.toLowerCase());
        out.push(d);
      }
    }
    return out;
  }, [allExpenses]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>([now.getFullYear(), year]);
    transactions.forEach((t) => {
      const y = Number(t.date.slice(0, 4));
      if (y) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
    // now muda a cada render; o ano atual basta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, year]);

  // Formulário (lançar ou editar).
  const [editing, setEditing] = useState<FinancialTransaction | null>(null);
  const [date, setDate] = useState(getTodayLocalISO());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [provider, setProvider] = useState("");
  const [pix, setPix] = useState("");
  /** PIX veio do cadastro (não digitado) — some se trocar de fornecedor. */
  const [pixFromSaved, setPixFromSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<FinancialTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);

  const fillPixFor = (name: string, keepTyped: boolean) => {
    const key = savedKey(name);
    if (key) {
      setPix(notes[key]);
      setPixFromSaved(true);
    } else if (!keepTyped) {
      setPix("");
      setPixFromSaved(false);
    }
  };

  const handleProviderChange = (value: string) => {
    setProvider(value);
    const key = savedKey(value);
    if (key) {
      setPix(notes[key]);
      setPixFromSaved(true);
    } else if (pixFromSaved) {
      setPix("");
      setPixFromSaved(false);
    }
  };

  const resetForm = () => {
    setEditing(null);
    setDate(getTodayLocalISO());
    setDescription("");
    setAmount(0);
    setProvider("");
    setPix("");
    setPixFromSaved(false);
  };

  const startEdit = (t: FinancialTransaction) => {
    const name = t.responsible?.trim() ? expenseProvider(t) : "";
    setEditing(t);
    setDate(t.date);
    setDescription(t.description);
    setAmount(t.amount);
    setProvider(name);
    fillPixFor(name, false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const what = description.trim().replace(/\s+/g, " ");
    const typedProvider = provider.trim().replace(/\s+/g, " ");
    if (!date) return void toast.error("Informe a data da despesa.");
    if (!what) return void toast.error("Escreva o que foi (ex.: Aluguel do centro cirúrgico).");
    if (!(amount > 0)) return void toast.error("Informe um valor maior que zero.");
    if (!typedProvider) return void toast.error("Informe para quem repassar (fornecedor, ou seu nome se você pagou).");
    // Mesmo fornecedor escrito diferente ("centro cirurgico" × "Centro Cirúrgico") vira um só.
    const name = savedKey(typedProvider) ?? providerOptions.find((o) => providerNoteId(o) === providerNoteId(typedProvider)) ?? typedProvider;
    const y = Number(date.slice(0, 4));
    const m = Number(date.slice(5, 7));
    setSaving(true);
    try {
      if (await getMonthlyClosing(y, m)) {
        toast.error(`${monthLabel(y, m)} já está fechado. Reabra no Fechamento 50/50 para lançar despesa nesse mês.`);
        return;
      }
      const value = Math.round(amount * 100) / 100;
      if (editing) {
        const ok = await updateFinancialTransaction(editing.id, { date, description: what, amount: value, responsible: name });
        if (!ok) return void toast.error("Não consegui salvar a alteração. Tente de novo.");
      } else {
        const created = await addFinancialTransaction({
          date,
          time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          description: what,
          type: "expense",
          amount: value,
          category: SHARED_EXPENSE_CATEGORY,
          responsible: name,
        });
        if (!created) return void toast.error("Não consegui lançar a despesa. Tente de novo.");
      }
      // PIX novo ou alterado: fica salvo para o próximo lançamento (e para o PDF de repasse).
      const pixText = pix.trim();
      if (pixText && pixText !== (notes[name] ?? "").trim()) {
        if (await saveProviderNote(name, pixText)) setNotes((prev) => ({ ...prev, [name]: pixText }));
        else toast.warning("A despesa foi salva, mas o PIX não ficou guardado para a próxima vez.");
      }
      toast.success(
        editing ? "Despesa atualizada." : `${fmt(value)} lançado — repassar a ${name}, desconta no fechamento de ${monthLabel(y, m)}.`
      );
      resetForm();
      // Lançou em outro mês: mostra a lista desse mês.
      if (y !== year || m !== month) {
        setYear(y);
        setMonth(m);
      }
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const ok = await deleteFinancialTransaction(toDelete.id);
      if (!ok) return void toast.error("Não consegui excluir a despesa.");
      if (editing?.id === toDelete.id) resetForm();
      toast.success("Despesa excluída.");
      await refetch();
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  // PDF de repasse (o mesmo dos prestadores), um bloco por fornecedor com o PIX.
  const payoutGroups = useMemo(
    () =>
      monthProviders.map(([name]) => ({
        provider: name,
        lines: monthExpenses
          .filter((t) => expenseProvider(t) === name)
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((t) => ({ date: t.date, patient: "Despesa", tutor: "sem cliente", service: t.description, quantity: 1, amount: t.amount })),
      })),
    [monthProviders, monthExpenses]
  );

  const providerPixSaved = !!savedKey(provider) && pixFromSaved;

  return (
    <PageShell className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Despesas"
        description="Gastos que você não cobrou do cliente (aluguel de centro cirúrgico, material da sala). É um repasse ao fornecedor: sai do que entrou e desconta do lucro antes da divisão."
        icon={Building}
        module="finance"
        breadcrumb={<>Painel &gt; Financeiro &gt; Despesas</>}
        className="mb-0 sm:mb-0"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="h-9 w-[140px] border border-border bg-card" aria-label="Mês">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {monthLabel(year, m).split(" / ")[0]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="h-9 w-[100px] border border-border bg-card" aria-label="Ano">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/financial/monthly-closing">
                <Scale className="h-4 w-4 text-emerald-600" /> Fechamento 50/50
              </Link>
            </Button>
          </div>
        }
      />

      {/* Monitor grande: totais em cima, formulário estreito + lista ao lado.
          Celular: o formulário vem primeiro (é o que se usa na hora da compra). */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[26rem_minmax(0,1fr)] xl:items-start">
        <KpiStrip
          loading={loading}
          className="max-sm:order-2 xl:col-span-2"
          items={[
            {
              label: `Despesas · ${periodLabel.split(" / ")[0]}`,
              value: fmt(total),
              hint: total > 0 ? "desconta do lucro antes da divisão" : "nenhuma despesa no mês",
              concept: CONCEPTS.despesas,
              colorValue: total > 0,
            },
            {
              label: "A repassar para",
              value: monthProviders.length === 1 ? "1 fornecedor" : `${monthProviders.length} fornecedores`,
              hint: monthProviders.length > 0 ? monthProviders.map(([name]) => name).join(", ") : "—",
              concept: CONCEPTS.repasses,
            },
            {
              label: "Cada parte arca com",
              value: fmt(total / 2),
              hint: "metade da clínica, metade da agropecuária",
              icon: Scale,
              tone: "slate",
            },
          ]}
        />

        <Panel
          title={editing ? "Editar despesa" : "Lançar despesa"}
          icon={editing ? Pencil : Building}
          tone="rose"
          description={editing ? `Lançada em ${formatDateTime(editing.date)}` : "Vai cobrar do cliente? Use um serviço com repasse."}
          actions={
            editing ? (
              <Button variant="ghost" size="sm" onClick={resetForm} className="h-7 gap-1 text-xs text-muted-foreground">
                <X className="h-3.5 w-3.5" /> Cancelar
              </Button>
            ) : undefined
          }
          className={cn("max-sm:order-1", editing && "ring-1 ring-rose-300")}
        >
          <form onSubmit={handleSubmit} className="space-y-4 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exp-date" className="text-xs font-medium text-muted-foreground">
                  Data
                </Label>
                <DatePickerBR id="exp-date" valueISO={date} onChangeISO={setDate} className="w-[11rem]" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-amount" className="text-xs font-medium text-muted-foreground">
                  Valor
                </Label>
                {/* Máscara de dinheiro: digita só os números (15000 → R$ 150,00). */}
                <CurrencyInput id="exp-amount" value={amount} onValueChange={setAmount} className="h-10 w-[9.5rem] text-right font-semibold tabular-nums" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-description" className="text-xs font-medium text-muted-foreground">
                O que foi
              </Label>
              <Input
                id="exp-description"
                list="exp-descriptions"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: Aluguel do centro cirúrgico — cirurgia do Thor"
                className="h-10 bg-card"
                autoComplete="off"
              />
              <datalist id="exp-descriptions">
                {descriptions.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-provider" className="text-xs font-medium text-muted-foreground">
                Repassar para
              </Label>
              <Input
                id="exp-provider"
                list="exp-providers"
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                placeholder="Fornecedor — ou seu nome, se você pagou"
                className="h-10 bg-card"
                autoComplete="off"
              />
              <datalist id="exp-providers">
                {providerOptions.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-pix" className="text-xs font-medium text-muted-foreground">
                PIX / dados para pagamento
              </Label>
              <Input
                id="exp-pix"
                value={pix}
                onChange={(e) => {
                  setPix(e.target.value);
                  setPixFromSaved(false);
                }}
                placeholder="Ex.: PIX (CPF) 123.456.789-00 — Nome do titular"
                className="h-10 bg-card"
                autoComplete="off"
              />
              <p className={cn("flex items-center gap-1 text-[11px]", providerPixSaved ? "text-emerald-700" : "text-muted-foreground")}>
                {providerPixSaved ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" aria-hidden /> PIX salvo de {savedKey(provider)}
                  </>
                ) : (
                  "Fica salvo para o próximo lançamento e sai no PDF de repasse."
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">
                Cada parte arca com <span className="font-semibold tabular-nums text-foreground">{fmt(amount / 2)}</span>
              </span>
              <Button type="submit" disabled={saving} className="h-10 gap-2 bg-rose-600 px-5 text-white hover:bg-rose-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building className="h-4 w-4" />}
                {saving ? "Salvando..." : editing ? "Salvar alterações" : "Lançar despesa"}
              </Button>
            </div>
          </form>
        </Panel>

        <Panel
          title={`Despesas de ${periodLabel}`}
          icon={CONCEPTS.despesas.icon}
          tone="rose"
          description="Entram no Fechamento 50/50 deste mês"
          className="max-sm:order-3"
          actions={
            <>
              <span className="text-sm font-bold tabular-nums text-rose-700">− {fmt(total)}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-orange-200 text-orange-800 hover:bg-orange-50"
                onClick={() => setPayoutOpen(true)}
                disabled={monthExpenses.length === 0}
                title="PDF para a Agrocentro pagar cada fornecedor, com o PIX"
              >
                <Printer className="h-4 w-4" aria-hidden /> PDF do repasse
              </Button>
            </>
          }
        >
          {locked && (
            <p className="flex items-center gap-1.5 border-b border-border/70 bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Mês fechado: para lançar, editar ou excluir despesas deste mês, reabra no{" "}
              <Link to="/financial/monthly-closing" className="font-semibold text-primary hover:underline">
                Fechamento 50/50
              </Link>
              .
            </p>
          )}
          {loading ? (
            <p className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </p>
          ) : monthExpenses.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma despesa lançada neste mês.</p>
          ) : (
            <ul className="divide-y divide-border/70">
              {monthExpenses.map((t) => {
                const name = expenseProvider(t);
                return (
                  <li key={t.id} className={cn("flex items-center gap-3 px-4 py-2.5", editing?.id === t.id && "bg-rose-50/60")}>
                    <IconChip icon={CONCEPTS.despesas.icon} tone="rose" size="sm" />
                    <div className="min-w-0 flex-1">
                      {/* Celular: quebra em linhas (cortado sobrava "Aluguel CC - ..."). */}
                      <p className="break-words text-sm font-semibold text-foreground sm:truncate">{t.description}</p>
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span className="tabular-nums">{formatDateTime(t.date)}</span>
                        <span
                          className={cn("inline-flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset", TONES.orange.badge)}
                          title={savedKey(name) ? `PIX: ${notes[savedKey(name)!]}` : "Sem PIX salvo"}
                        >
                          <CONCEPTS.repasses.icon className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="truncate">{name}</span>
                        </span>
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-rose-700">− {fmt(t.amount)}</span>
                    {!locked && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => startEdit(t)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={`Editar ${t.description}`}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setToDelete(t)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-700"
                          aria-label={`Excluir ${t.description}`}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && !deleting && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta despesa?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? `${toDelete.description} — ${fmt(toDelete.amount)} (${formatDateTime(toDelete.date)}). ` : ""}
              Ela sai do Fechamento 50/50. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={deleting}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProviderPayoutDialog
        open={payoutOpen}
        onOpenChange={(open) => {
          setPayoutOpen(open);
          if (!open) reloadNotes();
        }}
        groups={payoutGroups}
        periodLabel={periodLabel}
      />
    </PageShell>
  );
};

export default ExpensesPage;
