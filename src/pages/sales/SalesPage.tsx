import React from "react";
import { Link } from "react-router-dom";
import { Plus, Receipt, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrencyBRL, formatDateTime } from "@/lib/utils";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { useRegistryList } from "@/hooks/useRegistryList";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { KpiStrip } from "@/components/saas/KpiStrip";
import { PeriodFilter, isWithinPeriod, periodRange } from "@/components/saas/PeriodFilter";
import SaleDetailModal from "@/components/SaleDetailModal";
import CancelSaleDialog from "@/components/CancelSaleDialog";
import DeleteSaleDialog from "@/components/DeleteSaleDialog";
import { ReceivePaymentDialog } from "@/components/sales/ReceivePaymentDialog";
import { SaleStatusBadge } from "@/components/sales/SaleStatusBadge";
import {
  receiptMethodsBySale,
  saleBalance,
  saleStatus,
  summarizeSaleItems,
  type SaleStatusKey,
} from "@/lib/salePayment";
import type { FinancialTransaction } from "@/mockData/financial";
import type { Animal, Client } from "@/types/client";

type StatusFilter = "all" | "open" | "paid" | "cancelled";

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "open", label: "A receber" },
  { key: "paid", label: "Pagas" },
  { key: "cancelled", label: "Canceladas" },
];

const matchesStatus = (key: SaleStatusKey, filter: StatusFilter) =>
  filter === "all" ||
  (filter === "open" && (key === "open" || key === "partial")) ||
  (filter === "paid" && key === "paid") ||
  (filter === "cancelled" && key === "cancelled");

// Mesmas colunas no cabeçalho e nas linhas. xl, não xl: com o menu lateral
// aberto, uma tela de 1024px deixa ~770px — as 5 colunas espremiam os itens
// (e nome longo de exame invadia a coluna do cliente). Abaixo disso fica o
// formato de lista do celular.
const COLUMNS =
  "xl:grid xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_7.5rem_7.5rem_minmax(8.5rem,auto)] xl:items-center xl:gap-4";

const PAGE_SIZE = 30;

const norm = (s: string | undefined) =>
  (s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function formatAnimalAge(birthday?: string): string | undefined {
  if (!birthday) return undefined;
  const birth = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return undefined;
  const now = new Date();
  const totalMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (totalMonths < 12) return totalMonths === 1 ? "1 mes" : `${totalMonths} meses`;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  const anoStr = y === 1 ? "1 ano" : `${y} anos`;
  const mesStr = m === 1 ? "1 mes" : m > 1 ? `${m} meses` : "";
  return mesStr ? `${anoStr} e ${mesStr}` : anoStr;
}

function formatClientAddress(client?: Client): string | undefined {
  const a = client?.address;
  if (!a) return undefined;
  if (typeof a === "string") return a;
  const parts = [
    a.street && a.number ? `${a.street}, ${a.number}` : a.street,
    a.complement,
    a.neighborhood,
    a.city,
    a.cep ? `CEP ${a.cep}` : undefined,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

const SalesPage = () => {
  const { data: dbClients, isError: isClientsError } = useClientsList();
  const { transactions, loading, refetch } = useFinancialTransactions();
  const { list: paymentMethods } = useRegistryList("paymentMethods");
  const clients = React.useMemo(() => dbClients || [], [dbClients]);

  const [period, setPeriod] = React.useState(() => periodRange("this-month"));
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [method, setMethod] = React.useState<string>("all");
  const [visible, setVisible] = React.useState(PAGE_SIZE);

  const [selectedSale, setSelectedSale] = React.useState<FinancialTransaction | null>(null);
  const [saleToCancel, setSaleToCancel] = React.useState<FinancialTransaction | null>(null);
  const [saleToDelete, setSaleToDelete] = React.useState<FinancialTransaction | null>(null);
  const [saleToReceive, setSaleToReceive] = React.useState<FinancialTransaction | null>(null);

  React.useEffect(() => setVisible(PAGE_SIZE), [period, search, status, method]);

  const clientById = React.useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const animalOf = React.useCallback(
    (sale?: FinancialTransaction | null): Animal | undefined =>
      sale?.relatedClientId && sale.relatedAnimalId
        ? clientById.get(sale.relatedClientId)?.animals.find((a) => a.id === sale.relatedAnimalId)
        : undefined,
    [clientById]
  );

  const allSales = React.useMemo(
    () => transactions.filter((t) => t.type === "income" && t.category === "Venda de Produtos"),
    [transactions]
  );
  // A venda do prontuário não guardava a forma de pagamento — ela vem do recebimento.
  const methodsBySale = React.useMemo(() => receiptMethodsBySale(transactions), [transactions]);
  const methodsOf = React.useCallback(
    (sale: FinancialTransaction) => (sale.paymentMethod ? [sale.paymentMethod] : methodsBySale.get(sale.id) ?? []),
    [methodsBySale]
  );

  const methodOptions = React.useMemo(() => {
    const names = new Set<string>(paymentMethods.map((pm) => pm.name).filter(Boolean));
    allSales.forEach((s) => methodsOf(s).forEach((m) => names.add(m)));
    return Array.from(names).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [paymentMethods, allSales, methodsOf]);

  // Período + busca + forma (a situação é aplicada depois, para contar cada uma).
  const scoped = React.useMemo(() => {
    const q = norm(search);
    return allSales.filter((s) => {
      if (!isWithinPeriod(s.date, period.from, period.to)) return false;
      if (method !== "all" && !methodsOf(s).includes(method)) return false;
      if (!q) return true;
      const client = s.relatedClientId ? clientById.get(s.relatedClientId) : undefined;
      const animal = animalOf(s);
      return norm(`${client?.name ?? ""} ${animal?.name ?? ""} ${s.description}`).includes(q);
    });
  }, [allSales, period, method, search, clientById, animalOf, methodsOf]);

  const counts = React.useMemo(() => {
    const c: Record<StatusFilter, number> = { all: scoped.length, open: 0, paid: 0, cancelled: 0 };
    for (const s of scoped) {
      const key = saleStatus(s).key;
      if (key === "open" || key === "partial") c.open++;
      else if (key === "paid") c.paid++;
      else c.cancelled++;
    }
    return c;
  }, [scoped]);

  const rows = React.useMemo(() => scoped.filter((s) => matchesStatus(saleStatus(s).key, status)), [scoped, status]);

  const kpis = React.useMemo(() => {
    const active = scoped.filter((s) => s.status !== "cancelled");
    const sold = active.reduce((sum, s) => sum + s.amount, 0);
    const received = active.reduce((sum, s) => sum + Math.min(s.amount, s.paidAmount || 0), 0);
    // "A receber" olha TODAS as datas: conta em aberto não pode sumir atrás do filtro de período.
    const openSales = allSales.filter((s) => saleBalance(s) > 0);
    return {
      sold,
      count: active.length,
      received,
      ticket: active.length > 0 ? sold / active.length : 0,
      open: openSales.reduce((sum, s) => sum + saleBalance(s), 0),
      openCount: openSales.length,
    };
  }, [scoped, allSales]);

  const shown = rows.slice(0, visible);
  const remaining = rows.length - shown.length;
  const isFiltering = Boolean(search.trim()) || status !== "all" || method !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setMethod("all");
  };

  const detailClient = selectedSale?.relatedClientId ? clientById.get(selectedSale.relatedClientId) : undefined;
  const detailAnimal = animalOf(selectedSale);
  const receiveClient = saleToReceive?.relatedClientId ? clientById.get(saleToReceive.relatedClientId) : undefined;
  const cancelClient = saleToCancel?.relatedClientId ? clientById.get(saleToCancel.relatedClientId) : undefined;

  return (
    <PageShell className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Vendas"
        description="Tudo o que foi vendido — no PDV, no prontuário ou por orçamento."
        icon={Receipt}
        module="sales"
        breadcrumb={<>Painel &gt; Vendas</>}
        className="mb-0 sm:mb-0"
        actions={
          <>
            <Button asChild variant="outline" className="flex-1 sm:flex-none">
              <Link to="/sales/receipts">Recebimentos</Link>
            </Button>
            <Button asChild className="flex-1 font-semibold sm:flex-none">
              <Link to="/sales/pos">
                <Plus className="mr-2 h-4 w-4" /> Nova venda
              </Link>
            </Button>
          </>
        }
      />

      <KpiStrip
        loading={loading}
        items={[
          {
            label: "Vendido no período",
            value: formatCurrencyBRL(kpis.sold),
            hint: plural(kpis.count, "venda", "vendas"),
          },
          {
            label: "Recebido",
            value: formatCurrencyBRL(kpis.received),
            hint: kpis.sold > 0 ? `${Math.round((kpis.received / kpis.sold) * 100)}% do vendido` : "—",
          },
          {
            label: "A receber",
            value: formatCurrencyBRL(kpis.open),
            hint: kpis.openCount > 0 ? `${plural(kpis.openCount, "venda", "vendas")} · todas as datas` : "Nada em aberto",
            tone: kpis.open > 0 ? "warning" : "default",
            onClick:
              kpis.openCount > 0
                ? () => {
                    setStatus("open");
                    setPeriod(periodRange("all"));
                  }
                : undefined,
          },
          {
            label: "Ticket médio",
            value: formatCurrencyBRL(kpis.ticket),
            hint: "por venda no período",
          },
        ]}
      />

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm" aria-label="Lista de vendas">
        {/* Busca, período, situação e forma */}
        <div className="space-y-3 border-b border-border/70 p-3 sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por tutor, pet ou item"
                aria-label="Buscar vendas"
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div role="radiogroup" aria-label="Situação" className="inline-flex w-full overflow-x-auto rounded-xl bg-muted p-1 sm:w-auto">
              {STATUS_FILTERS.map(({ key, label }) => {
                const active = status === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setStatus(key)}
                    className={cn(
                      "flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                      active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                    <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">{counts[key]}</span>
                  </button>
                );
              })}
            </div>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-9 w-full rounded-lg bg-input sm:w-52" aria-label="Forma de pagamento">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">Todas as formas</SelectItem>
                {methodOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cabeçalho das colunas (computador) */}
        <div className="hidden border-b border-border/70 bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground xl:block">
          <div className={COLUMNS}>
            <span>Venda</span>
            <span>Cliente</span>
            <span>Data</span>
            <span className="text-right">Valor</span>
            <span className="text-right">Situação</span>
          </div>
        </div>

        {loading ? (
          <ul className="divide-y divide-border/70" aria-hidden>
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="space-y-2 px-4 py-3.5">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium text-foreground">
              {allSales.length === 0 ? "Nenhuma venda registrada ainda" : "Nenhuma venda encontrada"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {allSales.length === 0
                ? "As vendas do PDV, do prontuário e dos orçamentos aparecem aqui."
                : "Mude o período ou a busca para ver outras vendas."}
            </p>
            <div className="mt-4">
              {allSales.length === 0 ? (
                <Button asChild>
                  <Link to="/sales/pos">
                    <Plus className="mr-2 h-4 w-4" /> Nova venda
                  </Link>
                </Button>
              ) : (
                isFiltering && (
                  <Button variant="outline" onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" /> Limpar filtros
                  </Button>
                )
              )}
            </div>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border/70">
              {shown.map((sale) => {
                const client = sale.relatedClientId ? clientById.get(sale.relatedClientId) : undefined;
                const animal = animalOf(sale);
                const st = saleStatus(sale);
                const balance = saleBalance(sale);
                const methods = methodsOf(sale);
                const who = [client?.name, animal?.name && `(${animal.name})`].filter(Boolean).join(" ");
                return (
                  <li key={sale.id} className="relative px-3 py-3 transition-colors hover:bg-muted/40 sm:px-4">
                    <div className={cn("flex flex-col gap-2", COLUMNS)}>
                      <div className="min-w-0">
                        {/* Botão "esticado": a linha toda abre o detalhe; o "Receber" fica por cima (z-10). */}
                        <button
                          type="button"
                          onClick={() => setSelectedSale(sale)}
                          className="block w-full text-left font-medium leading-snug text-foreground after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-primary/60"
                        >
                          <span className={cn("[overflow-wrap:anywhere]", st.key === "cancelled" && "text-muted-foreground line-through")}>
                            {summarizeSaleItems(sale.description, 3)}
                          </span>
                        </button>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          <span className="xl:hidden">
                            {[who, formatDateTime(sale.date, sale.time)].filter(Boolean).join(" · ")}
                            {methods.length > 0 && " · "}
                          </span>
                          {methods.join(" + ")}
                          {methods.length === 0 && <span className="hidden xl:inline">—</span>}
                        </p>
                      </div>
                      <p className="hidden min-w-0 truncate text-sm text-foreground xl:block" title={who}>
                        {who || <span className="text-muted-foreground">Sem cliente</span>}
                      </p>
                      <p className="hidden text-sm tabular-nums text-muted-foreground xl:block">
                        {formatDateTime(sale.date)}
                        <span className="block text-xs">{sale.time}</span>
                      </p>
                      <div className="flex items-center justify-between gap-3 xl:contents">
                        <div className="xl:text-right">
                          <p className={cn("font-semibold tabular-nums text-foreground", st.key === "cancelled" && "text-muted-foreground")}>
                            {formatCurrencyBRL(sale.amount)}
                          </p>
                          {st.key === "partial" && <p className="text-xs text-amber-800">falta {formatCurrencyBRL(balance)}</p>}
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <SaleStatusBadge sale={sale} />
                          {balance > 0 && (
                            <Button size="sm" className="relative z-10 h-8 font-semibold" onClick={() => setSaleToReceive(sale)}>
                              Receber
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-4 py-2.5 text-xs text-muted-foreground">
              <span aria-live="polite">
                {remaining > 0
                  ? `Mostrando ${shown.length} de ${plural(rows.length, "venda", "vendas")}`
                  : plural(rows.length, "venda", "vendas")}
              </span>
              {remaining > 0 && (
                <Button variant="ghost" size="sm" className="h-8" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  Mostrar mais ({remaining})
                </Button>
              )}
            </div>
          </>
        )}
        {isClientsError && (
          <p className="border-t border-border/70 px-4 py-2 text-xs text-destructive">Falha ao carregar clientes — os nomes podem não aparecer.</p>
        )}
      </section>

      <SaleDetailModal
        open={!!selectedSale}
        transaction={selectedSale}
        onClose={() => setSelectedSale(null)}
        onRequestCancel={(sale) => { setSelectedSale(null); setSaleToCancel(sale); }}
        onRequestDelete={(sale) => { setSelectedSale(null); setSaleToDelete(sale); }}
        onRequestReceive={(sale) => { setSelectedSale(null); setSaleToReceive(sale); }}
        clientName={detailClient?.name}
        clientPhone={detailClient?.mainPhoneContact || undefined}
        clientAddress={formatClientAddress(detailClient)}
        animalName={detailAnimal?.name}
        animalSpecies={detailAnimal?.species}
        animalBreed={detailAnimal?.breed}
        animalAge={formatAnimalAge(detailAnimal?.birthday)}
        animalPatientCode={detailAnimal?.patientCode}
      />

      <ReceivePaymentDialog
        open={!!saleToReceive}
        onOpenChange={(open) => { if (!open) setSaleToReceive(null); }}
        sale={saleToReceive}
        clientName={receiveClient?.name}
        animalName={animalOf(saleToReceive)?.name}
        methods={paymentMethods}
        onDone={refetch}
      />

      <CancelSaleDialog
        open={!!saleToCancel}
        sale={saleToCancel}
        onClose={() => setSaleToCancel(null)}
        onCancelled={() => { void refetch(); }}
        clientName={cancelClient?.name}
        clientPhone={cancelClient?.mainPhoneContact || undefined}
        animalName={animalOf(saleToCancel)?.name}
      />

      <DeleteSaleDialog
        open={!!saleToDelete}
        sale={saleToDelete}
        onClose={() => setSaleToDelete(null)}
        onDeleted={() => { void refetch(); }}
      />
    </PageShell>
  );
};

export default SalesPage;
