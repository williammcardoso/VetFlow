import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Building, CheckCircle2, Copy, Loader2, Lock, Pencil, Printer, Scale, Stethoscope, Trash2, Wheat, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Field } from "@/components/forms/FormLayout";
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
  const [notesText, setNotesText] = useState("");
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
    setNotesText("");
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
    setNotesText(t.observations ?? "");
    setAmount(t.amount);
    setProvider(name);
    fillPixFor(name, false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const what = description.trim().replace(/\s+/g, " ");
    const obs = notesText.trim().replace(/\s+/g, " ");
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
        const ok = await updateFinancialTransaction(editing.id, { date, description: what, amount: value, responsible: name, observations: obs });
        if (!ok) return void toast.error("Não consegui salvar a alteração. Tente de novo.");
      } else {
        const created = await addFinancialTransaction({
          date,
          time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          description: what,
          observations: obs || undefined,
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
          .map((t) => ({
            date: t.date,
            patient: "Despesa",
            tutor: t.observations?.trim() || "sem cliente",
            service: t.description,
            quantity: 1,
            amount: t.amount,
          })),
      })),
    [monthProviders, monthExpenses]
  );

  const providerPixSaved = !!savedKey(provider) && pixFromSaved;

  const copyPix = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("PIX copiado.");
    } catch {
      // Sem https (acesso pelo IP da rede local) o navegador bloqueia a cópia.
      toast.error("Não consegui copiar — selecione o texto e copie.");
    }
  };

  const monthName = periodLabel.split(" / ")[0];
  // Colunas da lista no computador: data | despesa | repassar para | valor | ações.
  const LIST_COLS = "xl:grid-cols-[6.5rem_minmax(0,1.6fr)_minmax(0,1fr)_8.5rem_4.5rem]";

  return (
    <PageShell className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Despesas"
        description="Gastos não cobrados do cliente: repasse ao fornecedor, descontado do lucro antes da divisão 50/50."
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

      {/* Monitor grande (2xl): lançamento e lista à esquerda, resumo do mês
          fixo à direita — mesmo desenho de Orçamentos/PDV, sem faixa larga
          vazia. Notebook (xl, ~1366 com o menu aberto): o resumo desce, senão
          espremia os campos. Flex e não grade com row-span: a grade abria um
          vão entre o formulário e a lista quando o resumo ficava mais alto. */}
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start">
        <div className="min-w-0 flex-1 space-y-4">
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
            className={cn(editing && "ring-1 ring-rose-300")}
          >
            <form onSubmit={handleSubmit}>
              {/* Linhas alinhadas: data | valor | o que foi | observações, e
                  embaixo repassar para | PIX (cada um ocupando duas colunas).
                  lg e não sm para pôr lado a lado: o breakpoint ignora o menu
                  lateral — no tablet com ele aberto os campos espremiam. */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-4 p-4 sm:gap-x-4 xl:grid-cols-[11rem_9.5rem_minmax(0,1fr)_minmax(0,1fr)]">
                <Field label="Data" htmlFor="exp-date" className="col-span-1">
                  <DatePickerBR id="exp-date" valueISO={date} onChangeISO={setDate} className="w-full" />
                </Field>
                <Field label="Valor" htmlFor="exp-amount" className="col-span-1">
                  {/* Máscara de dinheiro: digita só os números (15000 → R$ 150,00). */}
                  <CurrencyInput id="exp-amount" value={amount} onValueChange={setAmount} className="h-10 w-full text-right font-semibold tabular-nums" />
                </Field>
                <Field label="O que foi" htmlFor="exp-description" required className="lg:col-span-1">
                  <Input
                    id="exp-description"
                    list="exp-descriptions"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex.: Aluguel do centro cirúrgico"
                    className="h-10 bg-card"
                    autoComplete="off"
                  />
                  <datalist id="exp-descriptions">
                    {descriptions.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </Field>
                <Field
                  label={
                    <>
                      Observações <span className="font-normal text-muted-foreground">(opcional)</span>
                    </>
                  }
                  htmlFor="exp-notes"
                  className="lg:col-span-1"
                >
                  <Input
                    id="exp-notes"
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Ex.: cirurgia da Meg, tutora Rute"
                    className="h-10 bg-card"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Repassar para" htmlFor="exp-provider" required className="lg:col-span-1 xl:col-span-2">
                  <Input
                    id="exp-provider"
                    list="exp-providers"
                    value={provider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    placeholder="Fornecedor ou seu nome"
                    className="h-10 bg-card"
                    autoComplete="off"
                  />
                  <datalist id="exp-providers">
                    {providerOptions.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </Field>
                <Field
                  label="PIX / dados para pagamento"
                  htmlFor="exp-pix"
                  className="lg:col-span-1 xl:col-span-2"
                  hint={
                    providerPixSaved ? (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> PIX salvo de {savedKey(provider)}
                      </span>
                    ) : (
                      "Fica salvo para o próximo lançamento e sai no PDF de repasse."
                    )
                  }
                >
                  <Input
                    id="exp-pix"
                    value={pix}
                    onChange={(e) => {
                      setPix(e.target.value);
                      setPixFromSaved(false);
                    }}
                    placeholder="Ex.: PIX (CPF) 123.456.789-00 — titular"
                    className={cn("h-10 bg-card", providerPixSaved && "border-emerald-300 bg-emerald-50/40")}
                    autoComplete="off"
                  />
                </Field>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-t border-border/70 bg-muted/30 px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Cada parte arca com <span className="font-bold tabular-nums text-foreground">{fmt(amount / 2)}</span>
                </span>
                <Button type="submit" disabled={saving} className="h-10 gap-2 bg-rose-600 px-5 font-semibold text-white shadow-sm hover:bg-rose-700">
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
            description={
              monthExpenses.length > 0
                ? `${monthExpenses.length === 1 ? "1 lançamento" : `${monthExpenses.length} lançamentos`} · entram no Fechamento 50/50`
                : "Entram no Fechamento 50/50 deste mês"
            }
            actions={<span className="text-base font-bold tabular-nums text-rose-700">− {fmt(total)}</span>}
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
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <IconChip icon={Building} tone="rose" />
                <p className="text-sm font-medium text-foreground">Nenhuma despesa em {monthName}.</p>
                <p className="text-xs text-muted-foreground">Lance acima o que não foi cobrado do cliente.</p>
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    "hidden items-center gap-x-4 border-b border-border/70 bg-muted/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground xl:grid",
                    LIST_COLS
                  )}
                >
                  <span>Data</span>
                  <span>Despesa</span>
                  <span>Repassar para</span>
                  <span className="text-right">Valor</span>
                  <span className="sr-only">Ações</span>
                </div>
                <ul className="divide-y divide-border/70">
                  {monthExpenses.map((t) => {
                    const name = expenseProvider(t);
                    const key = savedKey(name);
                    const obs = t.observations?.trim();
                    const badge = (
                      <span className={cn("inline-flex min-w-0 max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset", TONES.orange.badge)}>
                        <CONCEPTS.repasses.icon className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="truncate">{name}</span>
                      </span>
                    );
                    return (
                      <li
                        key={t.id}
                        className={cn(
                          "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-4 py-3 transition-colors hover:bg-muted/40 xl:items-center xl:gap-x-4",
                          LIST_COLS,
                          editing?.id === t.id && "bg-rose-50/60 hover:bg-rose-50/60"
                        )}
                      >
                        <span className="hidden text-sm tabular-nums text-muted-foreground xl:block">{formatDateTime(t.date)}</span>
                        <div className="flex min-w-0 items-start gap-3 xl:items-center">
                          <IconChip icon={CONCEPTS.despesas.icon} tone="rose" size="sm" />
                          <div className="min-w-0">
                            {/* Celular: quebra em linhas; computador: uma linha só. */}
                            <p className="break-words text-sm font-semibold text-foreground xl:truncate">{t.description}</p>
                            {obs && <p className="break-words text-xs text-muted-foreground xl:truncate">{obs}</p>}
                            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground xl:hidden">
                              <span className="tabular-nums">{formatDateTime(t.date)}</span>
                              {badge}
                            </p>
                          </div>
                        </div>
                        <div className="hidden min-w-0 xl:block">
                          {badge}
                          <p className={cn("mt-0.5 truncate text-[11px]", key ? "text-emerald-700" : "font-medium text-amber-700")} title={key ? notes[key] : undefined}>
                            {key ? "PIX salvo" : "sem PIX salvo"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 xl:contents">
                          <span className="text-sm font-bold tabular-nums text-rose-700 xl:text-right">− {fmt(t.amount)}</span>
                          {!locked ? (
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                type="button"
                                onClick={() => startEdit(t)}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                aria-label={`Editar ${t.description}`}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setToDelete(t)}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-700"
                                aria-label={`Excluir ${t.description}`}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="hidden xl:block" />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Panel>
        </div>

        <aside className="min-w-0 2xl:sticky 2xl:top-4 2xl:w-[22rem] 2xl:shrink-0">
          <Panel title={`Resumo de ${monthName}`} icon={Scale} tone="emerald" description="O que entra no Fechamento 50/50">
            {/* Embaixo da lista (tablet/notebook): duas colunas — totais | a repassar. */}
            <div className="space-y-4 p-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 2xl:block 2xl:space-y-4">
              <div className="space-y-4">
                <div className={cn("rounded-xl border px-3 py-3", TONES.rose.card)}>
                  <p className={cn("text-[11px] font-semibold uppercase tracking-wide", TONES.rose.label)}>Despesas do mês</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-rose-700">{fmt(total)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">desconta do lucro antes da divisão</p>
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Cada parte arca com</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { label: "Clínica", icon: Stethoscope, tone: "teal" },
                        { label: "Agropecuária", icon: Wheat, tone: "amber" },
                      ] as const
                    ).map((p) => (
                      <div key={p.label} className={cn("rounded-xl border px-3 py-2", TONES[p.tone].card)}>
                        <p className={cn("flex items-center gap-1 text-[11px] font-semibold", TONES[p.tone].label)}>
                          <p.icon className="h-3.5 w-3.5" aria-hidden /> {p.label}
                        </p>
                        <p className={cn("mt-0.5 text-lg font-bold tabular-nums", TONES[p.tone].text)}>{fmt(total / 2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <CONCEPTS.repasses.icon className="h-3.5 w-3.5 text-orange-600" aria-hidden /> A repassar
                  </p>
                  {monthProviders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nada a repassar neste mês.</p>
                  ) : (
                    <ul className="space-y-2">
                      {monthProviders.map(([name, value]) => {
                        const key = savedKey(name);
                        const pixText = key ? notes[key] : "";
                        return (
                          <li key={name} className={cn("rounded-xl border px-3 py-2", TONES.orange.card)}>
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="min-w-0 truncate text-sm font-semibold text-foreground">{name}</span>
                              <span className="shrink-0 text-sm font-bold tabular-nums text-orange-700">{fmt(value)}</span>
                            </div>
                            {pixText ? (
                              <button
                                type="button"
                                onClick={() => void copyPix(pixText)}
                                className="mt-1 flex w-full min-w-0 items-center gap-1.5 rounded text-left text-xs text-muted-foreground hover:text-foreground"
                                title="Copiar PIX"
                              >
                                <Copy className="h-3 w-3 shrink-0" aria-hidden />
                                <span className="truncate">{pixText}</span>
                              </button>
                            ) : (
                              <p className="mt-1 text-xs font-medium text-amber-700">Sem PIX salvo — edite a despesa e preencha.</p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full gap-2 border-orange-200 font-semibold text-orange-800 hover:bg-orange-50"
                  onClick={() => setPayoutOpen(true)}
                  disabled={monthExpenses.length === 0}
                  title="PDF para a Agrocentro pagar cada fornecedor, com o PIX"
                >
                  <Printer className="h-4 w-4" aria-hidden /> PDF do repasse
                </Button>
                <Link
                  to="/financial/monthly-closing"
                  className="flex items-center justify-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Ver no Fechamento 50/50 <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          </Panel>
        </aside>
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
