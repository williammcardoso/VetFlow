import React from "react";
import { ArrowDownLeft, ChevronDown, ChevronRight, Loader2, Receipt, ShoppingBag } from "lucide-react";
import { IconChip, Panel, PaymentMethodBadge } from "@/components/finance/FinanceUI";
import { TONES, movementVisual } from "@/components/finance/financeTheme";
import { SaleStatusBadge } from "@/components/sales/SaleStatusBadge";
import { isCancelled, isReceipt, isSale } from "@/lib/financialSummary";
import { summarizeSaleItems } from "@/lib/salePayment";
import { getPurchaseItemsByTransactionIds, type PurchaseItem } from "@/lib/purchaseItemsApi";
import { cn, formatCurrencyBRL, slugifyFileName } from "@/lib/utils";
import { expensesReportPdf, receiptsReportPdf, salesReportPdf } from "@/lib/reportPdfData";
import { ReportPdfButton } from "@/components/finance/reports/ReportPdfButton";
import type { FinancialTransaction } from "@/mockData/financial";

const fmt = formatCurrencyBRL;
const when = (t: FinancialTransaction) => `${t.date.slice(8, 10)}/${t.date.slice(5, 7)}${t.time ? ` ${t.time}` : ""}`;
const sum = (list: FinancialTransaction[]) => list.reduce((s, t) => s + t.amount, 0);

export interface MovementPeople {
  clientName?: string;
  animalName?: string;
}

// "Compra de estoque - Fornecedor: Agrocentro: Seringa ×20, Agulha ×50 (Parcela 1/3)"
function parsePurchase(description: string): { supplier?: string; itemsText: string } {
  const m = (description || "").match(/^Compra de estoque(?: - Fornecedor: (.*?))?: (.*)$/s);
  if (!m) return { itemsText: description };
  return { supplier: m[1] || undefined, itemsText: m[2].replace(/ \(Parcela \d+\/\d+\)$/, "") };
}

const peopleLabel = (p: MovementPeople, fallback: string) =>
  p.animalName && p.clientName ? `${p.animalName} · ${p.clientName}` : p.clientName || p.animalName || fallback;

function Header({ count, total, tone, pdf }: { count: number; total: number; tone: "sky" | "emerald" | "amber"; pdf: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">
        {count} · <span className={cn("font-bold tabular-nums", TONES[tone].text)}>{fmt(total)}</span>
      </span>
      {pdf}
    </span>
  );
}

const Empty = ({ text }: { text: string }) => <p className="px-4 py-10 text-center text-sm text-muted-foreground">{text}</p>;

/** Detalhe de compra/saída — itens da compra carregados ao abrir. */
function ExpenseDetail({ t, all }: { t: FinancialTransaction; all: FinancialTransaction[] }) {
  const isPurchase = t.category === "Estoque";
  const group = t.purchaseGroupId ? all.filter((x) => x.purchaseGroupId === t.purchaseGroupId) : [t];
  const [items, setItems] = React.useState<PurchaseItem[] | null>(isPurchase ? null : []);
  React.useEffect(() => {
    if (!isPurchase) return;
    let alive = true;
    void getPurchaseItemsByTransactionIds(group.map((x) => x.id)).then((map) => {
      if (alive) setItems(Array.from(map.values()).flat());
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.id]);
  const parsed = parsePurchase(t.description);

  return (
    <div className="space-y-1.5 border-t border-border/50 bg-muted/30 py-2.5 pl-14 pr-4 text-sm">
      {isPurchase ? (
        <>
          {parsed.supplier && (
            <p>
              <span className="text-muted-foreground">Fornecedor:</span> <span className="font-semibold">{parsed.supplier}</span>
            </p>
          )}
          {items === null ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Carregando itens...
            </p>
          ) : items.length > 0 ? (
            <ul className="space-y-0.5">
              {items.map((it) => (
                <li key={it.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {it.productName} <span className="text-muted-foreground">× {it.quantity.toLocaleString("pt-BR")}</span>
                  </span>
                  {it.subtotal > 0 && <span className="shrink-0 tabular-nums text-muted-foreground">{fmt(it.subtotal)}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-foreground/90">{parsed.itemsText}</p>
          )}
          {group.length > 1 && (
            <p className="text-xs text-muted-foreground">
              {t.installmentLabel} · compra total {fmt(sum(group))} em {group.length} parcelas
            </p>
          )}
        </>
      ) : (
        <>
          <p>
            <span className="text-muted-foreground">Categoria:</span> <span className="font-semibold">{t.category || "Saída"}</span>
          </p>
          <p className="text-foreground/90">{t.description}</p>
        </>
      )}
      {t.paymentMethod && <PaymentMethodBadge method={t.paymentMethod} />}
      {t.observations && !t.observations.startsWith("@apt:") && <p className="text-xs text-muted-foreground">Obs.: {t.observations}</p>}
    </div>
  );
}

// Movimentações separadas: Vendas / Recebimentos / Compras e saídas, cada uma
// com seu total. Venda e recebimento abrem o detalhe da venda; compra abre os
// itens comprados.
export function MovementsSplit({
  movements,
  allTransactions,
  people,
  onOpenSale,
  periodLabel,
}: {
  movements: FinancialTransaction[];
  allTransactions: FinancialTransaction[];
  people: (t: FinancialTransaction) => MovementPeople;
  onOpenSale: (saleId: string) => void;
  periodLabel: string;
}) {
  const sales = movements.filter(isSale);
  const receipts = movements.filter(isReceipt);
  const expenses = movements.filter((t) => t.type === "expense");
  const [openExpense, setOpenExpense] = React.useState<string | null>(null);

  const rowBtn = "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50";

  // PDF das compras: busca os itens de cada compra (ficam na 1ª parcela).
  const buildExpensesPdf = async () => {
    const groupIds = (t: FinancialTransaction) =>
      t.purchaseGroupId ? allTransactions.filter((x) => x.purchaseGroupId === t.purchaseGroupId).map((x) => x.id) : [t.id];
    const purchases = expenses.filter((t) => t.category === "Estoque");
    const ids = Array.from(new Set(purchases.flatMap(groupIds)));
    const map = await getPurchaseItemsByTransactionIds(ids);
    return expensesReportPdf(expenses, periodLabel, (t) => {
      const items = groupIds(t).flatMap((id) => map.get(id) ?? []);
      if (items.length === 0) return undefined;
      return items
        .map((it) => `${it.productName} ×${it.quantity.toLocaleString("pt-BR")}${it.subtotal > 0 ? ` (${fmt(it.subtotal)})` : ""}`)
        .join(", ");
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Panel
        title="Vendas"
        icon={Receipt}
        tone="sky"
        description="O que foi vendido · clique para ver a venda"
        actions={
          <Header
            count={sales.length}
            total={sum(sales.filter((t) => !isCancelled(t)))}
            tone="sky"
            pdf={
              <ReportPdfButton
                build={() => salesReportPdf(sales, people, periodLabel)}
                fileName={slugifyFileName("vendas", periodLabel)}
                disabled={sales.length === 0}
              />
            }
          />
        }
      >
        {sales.length === 0 ? (
          <Empty text="Nenhuma venda no período." />
        ) : (
          <ul className="max-h-[480px] divide-y divide-border/70 overflow-y-auto">
            {sales.map((t) => {
              const cancelled = isCancelled(t);
              return (
                <li key={t.id}>
                  <button type="button" className={rowBtn} onClick={() => onOpenSale(t.id)}>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-bold text-foreground", cancelled && "text-muted-foreground line-through")}>
                        {summarizeSaleItems(t.description, 3)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {peopleLabel(people(t), "Venda avulsa")} · <span className="tabular-nums">{when(t)}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className={cn("text-sm font-bold tabular-nums", cancelled ? "text-muted-foreground line-through" : "text-foreground")}>{fmt(t.amount)}</span>
                      <SaleStatusBadge sale={t} className="px-1.5 text-[10px]" />
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground print:hidden" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel
        title="Recebimentos"
        icon={ArrowDownLeft}
        tone="emerald"
        description="Dinheiro que entrou · clique para ver a venda"
        actions={
          <Header
            count={receipts.length}
            total={sum(receipts)}
            tone="emerald"
            pdf={
              <ReportPdfButton
                build={() => receiptsReportPdf(receipts, people, periodLabel)}
                fileName={slugifyFileName("recebimentos", periodLabel)}
                disabled={receipts.length === 0}
              />
            }
          />
        }
      >
        {receipts.length === 0 ? (
          <Empty text="Nenhum recebimento no período." />
        ) : (
          <ul className="max-h-[480px] divide-y divide-border/70 overflow-y-auto">
            {receipts.map((t) => {
              const reversal = t.amount < 0;
              const content = (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {peopleLabel(people(t), t.description.replace(/^Recebimento:\s*/, "") || "Recebimento")}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      {reversal && <span className="font-semibold text-rose-700">Estorno</span>}
                      {t.paymentMethod && <PaymentMethodBadge method={t.paymentMethod} />}
                      <span className="tabular-nums">{when(t)}</span>
                    </div>
                  </div>
                  <span className={cn("shrink-0 text-sm font-bold tabular-nums", reversal ? "text-rose-700" : "text-emerald-700")}>
                    {reversal ? "− " : "+ "}
                    {fmt(Math.abs(t.amount))}
                  </span>
                  {t.saleId && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground print:hidden" aria-hidden />}
                </>
              );
              return (
                <li key={t.id}>
                  {t.saleId ? (
                    <button type="button" className={rowBtn} onClick={() => onOpenSale(t.saleId as string)}>
                      {content}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-2.5">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel
        title="Compras e saídas"
        icon={ShoppingBag}
        tone="amber"
        description="Almoxarifado e despesas · clique para discriminar"
        actions={
          <Header
            count={expenses.length}
            total={sum(expenses)}
            tone="amber"
            pdf={
              <ReportPdfButton
                build={buildExpensesPdf}
                fileName={slugifyFileName("compras-e-saidas", periodLabel)}
                disabled={expenses.length === 0}
              />
            }
          />
        }
      >
        {expenses.length === 0 ? (
          <Empty text="Nenhuma compra ou saída no período." />
        ) : (
          <ul className="max-h-[480px] divide-y divide-border/70 overflow-y-auto">
            {expenses.map((t) => {
              const mv = movementVisual(t);
              const isOpen = openExpense === t.id;
              const parsed = t.category === "Estoque" ? parsePurchase(t.description) : null;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    className={cn(rowBtn, isOpen && "bg-amber-50/50")}
                    onClick={() => setOpenExpense(isOpen ? null : t.id)}
                    aria-expanded={isOpen}
                  >
                    <IconChip icon={mv.icon} tone={mv.tone} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {parsed ? parsed.supplier || "Compra do almoxarifado" : t.description}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        <span className={cn("font-medium", TONES[mv.tone].text)}>{mv.label}</span>
                        {t.installmentLabel ? ` · ${t.installmentLabel}` : ""} · <span className="tabular-nums">{when(t)}</span>
                        {parsed ? ` · ${parsed.itemsText}` : ""}
                      </p>
                    </div>
                    <span className={cn("shrink-0 text-sm font-bold tabular-nums", TONES[mv.tone].text)}>− {fmt(Math.abs(t.amount))}</span>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform print:hidden", isOpen && "rotate-180")} aria-hidden />
                  </button>
                  {isOpen && <ExpenseDetail t={t} all={allTransactions} />}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
