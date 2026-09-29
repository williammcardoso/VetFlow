import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Banknote, ClipboardList, Plus, Search, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { KpiStrip } from "@/components/saas/KpiStrip";
import { PeriodFilter, isWithinPeriod, periodRange } from "@/components/saas/PeriodFilter";
import { ReceivePaymentDialog } from "@/components/sales/ReceivePaymentDialog";
import { SaleStatusBadge } from "@/components/sales/SaleStatusBadge";
import { IconChip, Panel, PaymentMethodBadge } from "@/components/finance/FinanceUI";
import { CONCEPTS, TONES, movementVisual, paymentMethodVisual } from "@/components/finance/financeTheme";
import { ClientAvatar, speciesIcon, speciesTone } from "@/components/clients/clientVisuals";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { useRegistryList } from "@/hooks/useRegistryList";
import { removeReceipt } from "@/lib/financialApi";
import { isReceiptOfSale, saleBalance, summarizeSaleItems } from "@/lib/salePayment";
import { cn, formatCurrencyBRL, formatDateTime } from "@/lib/utils";
import { getPatientRecordPath } from "@/utils/patientDisplayId";
import type { FinancialTransaction } from "@/mockData/financial";

const PAGE_SIZE = 30;
const NO_METHOD = "Não informado";

const norm = (s: string | undefined) =>
  (s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Recebimentos: o que entrou no caixa. "A receber" fica no topo (é o que pede
// ação) e cada venda em aberto tem o próprio "Receber", já preenchido com o
// saldo e a forma escolhida na venda — antes era um formulário para escolher
// a venda numa lista e preencher tudo de novo.
const ReceiptsPage = () => {
  const { list: paymentMethods } = useRegistryList("paymentMethods");
  const { transactions, loading, refetch } = useFinancialTransactions();
  const { data: dbClients } = useClientsList();
  const clients = useMemo(() => dbClients || [], [dbClients]);
  const [searchParams, setSearchParams] = useSearchParams();

  const [period, setPeriod] = useState(() => periodRange("this-month"));
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [receiveTarget, setReceiveTarget] = useState<{ sale: FinancialTransaction | null } | null>(null);
  const [receiptToUndo, setReceiptToUndo] = useState<FinancialTransaction | null>(null);
  const [undoing, setUndoing] = useState(false);

  useEffect(() => setVisible(PAGE_SIZE), [period, search, method]);

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const animalOfTx = useCallback(
    (t?: FinancialTransaction | null) =>
      t?.relatedClientId && t.relatedAnimalId
        ? clientById.get(t.relatedClientId)?.animals.find((a) => a.id === t.relatedAnimalId)
        : undefined,
    [clientById]
  );
  const whoOf = useCallback(
    (t?: FinancialTransaction | null) => {
      if (!t?.relatedClientId) return "";
      const client = clientById.get(t.relatedClientId);
      const animal = t.relatedAnimalId ? client?.animals.find((a) => a.id === t.relatedAnimalId) : undefined;
      return [client?.name, animal?.name && `(${animal.name})`].filter(Boolean).join(" ");
    },
    [clientById]
  );

  const sales = useMemo(
    () => transactions.filter((t) => t.type === "income" && t.category === "Venda de Produtos"),
    [transactions]
  );
  const saleById = useMemo(() => new Map(sales.map((s) => [s.id, s])), [sales]);
  const saleOfReceipt = (r: FinancialTransaction) =>
    (r.saleId && saleById.get(r.saleId)) || sales.find((s) => isReceiptOfSale(r, s.id));

  // Em aberto: todas as datas, a mais antiga primeiro (é a que está esperando há mais tempo).
  const openSales = useMemo(
    () =>
      sales
        .filter((s) => saleBalance(s) > 0)
        .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)),
    [sales]
  );
  const openTotal = openSales.reduce((sum, s) => sum + saleBalance(s), 0);

  const allReceipts = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "income" && t.category === "Recebimento")
        .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)),
    [transactions]
  );

  const periodReceipts = useMemo(
    () => allReceipts.filter((r) => isWithinPeriod(r.date, period.from, period.to)),
    [allReceipts, period]
  );

  // Período + busca (a forma é aplicada depois, para somar cada uma).
  const searched = useMemo(() => {
    const q = norm(search);
    if (!q) return periodReceipts;
    return periodReceipts.filter((r) => {
      const sale = r.saleId ? saleById.get(r.saleId) : undefined;
      return norm(`${whoOf(r)} ${r.description} ${sale?.description ?? ""}`).includes(q);
    });
  }, [periodReceipts, search, saleById, whoOf]);

  // Quanto entrou por forma — confere com a gaveta e a maquininha; cada
  // forma também é um filtro do histórico.
  const byMethod = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of searched) {
      const key = r.paymentMethod || NO_METHOD;
      map.set(key, (map.get(key) || 0) + r.amount);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [searched]);

  const rows = useMemo(
    () => (method === "all" ? searched : searched.filter((r) => (r.paymentMethod || NO_METHOD) === method)),
    [searched, method]
  );

  const totalReceived = periodReceipts.reduce((sum, r) => sum + r.amount, 0);

  // Link direto (?saleId=): abre o "Receber" daquela venda assim que as vendas carregam.
  useEffect(() => {
    const saleId = searchParams.get("saleId");
    if (!saleId || loading) return;
    const sale = saleById.get(saleId);
    if (sale && saleBalance(sale) > 0) setReceiveTarget({ sale });
    else if (sale) toast.info("Essa venda já está quitada.");
    const next = new URLSearchParams(searchParams);
    next.delete("saleId");
    next.delete("amount");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, saleById, loading]);

  const confirmUndo = async () => {
    if (!receiptToUndo || undoing) return;
    setUndoing(true);
    try {
      const ok = await removeReceipt(receiptToUndo.id);
      if (ok) {
        toast.success("Pagamento estornado — o valor voltou para “a receber”.");
        await refetch();
      } else {
        toast.error("Não foi possível estornar.");
      }
    } finally {
      setUndoing(false);
      setReceiptToUndo(null);
    }
  };

  const shown = rows.slice(0, visible);
  const remaining = rows.length - shown.length;
  const receiveSale = receiveTarget?.sale ?? null;

  return (
    <PageShell className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Recebimentos"
        description="O que entrou no caixa e o que ainda falta receber."
        icon={Banknote}
        module="sales"
        breadcrumb={<>Painel &gt; Vendas &gt; Recebimentos</>}
        className="mb-0 sm:mb-0"
        actions={
          <>
            <Button asChild variant="outline" className="flex-1 sm:flex-none">
              <Link to="/sales/my-sales">Vendas</Link>
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setReceiveTarget({ sale: null })}>
              <Plus className="mr-2 h-4 w-4" /> Entrada avulsa
            </Button>
          </>
        }
      />

      <KpiStrip
        loading={loading}
        items={[
          {
            label: "Recebido no período",
            concept: CONCEPTS.recebido,
            value: formatCurrencyBRL(totalReceived),
            hint: plural(periodReceipts.length, "lançamento", "lançamentos"),
            colorValue: true,
          },
          {
            label: "A receber",
            concept: CONCEPTS.aReceber,
            value: formatCurrencyBRL(openTotal),
            hint: openSales.length > 0 ? `${plural(openSales.length, "venda", "vendas")} · todas as datas` : "Nada em aberto",
            colorValue: openTotal > 0,
          },
        ]}
      />

      {openSales.length > 0 && (
        <Panel
          title="A receber"
          icon={CONCEPTS.aReceber.icon}
          tone="amber"
          description="Vendas com saldo em aberto, da mais antiga para a mais nova"
          actions={
            <span className="text-sm text-muted-foreground">
              {plural(openSales.length, "venda", "vendas")} ·{" "}
              <span className="font-bold tabular-nums text-amber-700">{formatCurrencyBRL(openTotal)}</span>
            </span>
          }
        >
          <ul className="divide-y divide-border/70">
            {openSales.map((sale) => {
              const client = sale.relatedClientId ? clientById.get(sale.relatedClientId) : undefined;
              const animal = animalOfTx(sale);
              const SpeciesIcon = animal ? speciesIcon(animal.species) : null;
              const balance = saleBalance(sale);
              return (
                <li key={sale.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <ClientAvatar name={client?.name || "?"} />
                    <div className="min-w-0">
                      <p className="break-words font-semibold leading-snug text-foreground">
                        {client?.name || "Venda sem cliente"}
                        {animal && SpeciesIcon && (
                          <span className="ml-2 inline-flex items-center gap-1 align-middle text-xs font-medium text-muted-foreground">
                            <SpeciesIcon className={cn("h-3.5 w-3.5", speciesTone(animal.species).icon)} aria-hidden />
                            {animal.name}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-sm text-foreground/80">{summarizeSaleItems(sale.description, 3)}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="tabular-nums">{formatDateTime(sale.date, sale.time)}</span>
                        {sale.paymentMethod && <PaymentMethodBadge method={sale.paymentMethod} />}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 pl-[3.25rem] sm:shrink-0 sm:justify-end sm:pl-0">
                    <div className="sm:text-right">
                      <p className="text-base font-bold tabular-nums text-amber-700">{formatCurrencyBRL(balance)}</p>
                      {(sale.paidAmount || 0) > 0 && (
                        <p className="text-xs text-muted-foreground">de {formatCurrencyBRL(sale.amount)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <SaleStatusBadge sale={sale} className="max-sm:hidden" />
                      <Button size="sm" className="h-8 font-semibold" onClick={() => setReceiveTarget({ sale })}>
                        Receber
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      <Panel title="Histórico de recebimentos" icon={CONCEPTS.recebido.icon} tone="teal" description="Tudo o que entrou no caixa, por forma de pagamento">
        <div className="space-y-3 border-b border-border/70 p-3 sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por tutor, pet ou item"
                aria-label="Buscar recebimentos"
                enterKeyHint="search"
                autoComplete="off"
                className="h-10 rounded-xl bg-input pl-9 pr-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <PeriodFilter from={period.from} to={period.to} onChange={setPeriod} />
          </div>
          {byMethod.length > 0 && (
            <div role="radiogroup" aria-label="Forma de pagamento" className="flex gap-1.5 pb-0.5 max-sm:overflow-x-auto sm:flex-wrap">
              {[["all", searched.reduce((sum, r) => sum + r.amount, 0)] as [string, number], ...byMethod].map(([name, value]) => {
                const active = method === name;
                const visual = name === "all" ? null : paymentMethodVisual(name);
                const MethodIcon = visual?.icon;
                return (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setMethod(active && name !== "all" ? "all" : name)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                      active
                        ? "border-primary bg-primary/[0.07] text-foreground ring-1 ring-primary"
                        : "border-border bg-card text-foreground/80 hover:bg-muted/50"
                    )}
                  >
                    {MethodIcon && <MethodIcon className={cn("h-4 w-4", TONES[visual!.tone].text)} aria-hidden />}
                    {name === "all" ? "Todas" : name}
                    <span className="text-xs font-bold tabular-nums text-foreground">{formatCurrencyBRL(value)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {loading ? (
          <ul className="divide-y divide-border/70" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium text-foreground">Nenhum recebimento encontrado</p>
            <p className="mt-1 text-sm text-muted-foreground">Mude o período, a forma de pagamento ou a busca.</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border/70">
              {shown.map((r) => {
                const sale = saleOfReceipt(r);
                const who = whoOf(r) || whoOf(sale);
                const reversal = r.amount < 0;
                const visual = reversal ? movementVisual(r) : paymentMethodVisual(r.paymentMethod || "");
                const clientId = r.relatedClientId || sale?.relatedClientId;
                const animalId = r.relatedAnimalId || sale?.relatedAnimalId;
                const patientCode = clientId && animalId
                  ? clientById.get(clientId)?.animals.find((a) => a.id === animalId)?.patientCode
                  : undefined;
                return (
                  <li key={r.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                    <IconChip icon={visual.icon} tone={visual.tone} />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold leading-snug text-foreground">
                        {who || (sale ? "Venda sem cliente" : r.description)}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        {reversal ? (
                          <span className="font-semibold text-rose-700">Estorno</span>
                        ) : (
                          <PaymentMethodBadge method={r.paymentMethod || "Forma não informada"} />
                        )}
                        <span className="tabular-nums">{formatDateTime(r.date, r.time)}</span>
                        <span className="min-w-0 truncate">
                          {sale ? summarizeSaleItems(sale.description, 2) : who ? r.description : "Entrada avulsa"}
                        </span>
                      </div>
                    </div>
                    <p className={cn("shrink-0 text-sm font-bold tabular-nums", reversal ? "text-rose-700" : "text-emerald-700")}>
                      {reversal ? `− ${formatCurrencyBRL(Math.abs(r.amount))}` : `+ ${formatCurrencyBRL(r.amount)}`}
                    </p>
                    <div className="flex shrink-0 items-center">
                      {clientId && animalId && (
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Abrir prontuário">
                          <Link to={getPatientRecordPath(clientId, animalId, patientCode)} aria-label="Abrir prontuário">
                            <ClipboardList className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      {/* Estornar = desfazer a baixa. Venda cancelada já tem o estorno automático. */}
                      {!reversal && sale?.status !== "cancelled" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-amber-50 hover:text-amber-800"
                          title="Estornar pagamento"
                          aria-label="Estornar pagamento"
                          onClick={() => setReceiptToUndo(r)}
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-4 py-2.5 text-xs text-muted-foreground">
              <span aria-live="polite">
                {remaining > 0
                  ? `Mostrando ${shown.length} de ${plural(rows.length, "lançamento", "lançamentos")}`
                  : plural(rows.length, "lançamento", "lançamentos")}
                {" · "}
                <span className="font-bold tabular-nums text-teal-700">
                  {formatCurrencyBRL(rows.reduce((sum, r) => sum + r.amount, 0))}
                </span>
              </span>
              {remaining > 0 && (
                <Button variant="ghost" size="sm" className="h-8" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  Mostrar mais ({remaining})
                </Button>
              )}
            </div>
          </>
        )}
      </Panel>

      <ReceivePaymentDialog
        open={!!receiveTarget}
        onOpenChange={(open) => { if (!open) setReceiveTarget(null); }}
        sale={receiveSale}
        clientName={receiveSale?.relatedClientId ? clientById.get(receiveSale.relatedClientId)?.name : undefined}
        animalName={
          receiveSale?.relatedClientId && receiveSale.relatedAnimalId
            ? clientById.get(receiveSale.relatedClientId)?.animals.find((a) => a.id === receiveSale.relatedAnimalId)?.name
            : undefined
        }
        methods={paymentMethods}
        onDone={refetch}
      />

      <AlertDialog open={!!receiptToUndo} onOpenChange={(open) => { if (!open && !undoing) setReceiptToUndo(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estornar pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {receiptToUndo && (
                <>
                  {formatCurrencyBRL(receiptToUndo.amount)} ({receiptToUndo.paymentMethod || "forma não informada"}) de{" "}
                  {formatDateTime(receiptToUndo.date, receiptToUndo.time)}.{" "}
                </>
              )}
              O lançamento é apagado e, se for de uma venda, o valor volta para “a receber”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={undoing}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmUndo()} disabled={undoing} className="bg-amber-600 hover:bg-amber-700">
              Estornar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
};

export default ReceiptsPage;
