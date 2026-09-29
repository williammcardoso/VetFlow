import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Layers, Printer, Receipt, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { KpiStrip } from "@/components/saas/KpiStrip";
import { PeriodFilter, describePeriod, periodRange } from "@/components/saas/PeriodFilter";
import { DailyBarChart } from "@/components/saas/DailyBarChart";
import { BarList } from "@/components/saas/BarList";
import { Panel } from "@/components/finance/FinanceUI";
import { CONCEPTS, categoryVisual, paymentMethodVisual } from "@/components/finance/financeTheme";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { useCatalog } from "@/hooks/useCatalog";
import { getSaleItemsBySaleIds, type SaleItem } from "@/lib/saleItemsApi";
import { catalogCategoryLabel } from "@/lib/catalogCategories";
import {
  computePeriodFinancials,
  isCancelled,
  isSale,
  revenueByCategory,
  sumByDay,
  topSoldItems,
} from "@/lib/financialSummary";
import { summarizeSaleItems } from "@/lib/salePayment";
import { openPrintReport } from "@/lib/printReport";
import { formatCurrencyBRL, formatDateTime } from "@/lib/utils";

const fmt = formatCurrencyBRL;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const pct = (part: number, total: number) => (total > 0 ? `${Math.round((part / total) * 100)}%` : "");
const qtyLabel = (q: number) => (Number.isInteger(q) ? String(q) : q.toLocaleString("pt-BR", { maximumFractionDigits: 2 }));
const SALES_SERIES = [{ key: "vendas", label: "Vendido", color: "hsl(199 89% 48%)" }];
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] as string);

const SalesReportsPage: React.FC = () => {
  const { transactions, loading } = useFinancialTransactions();
  const { items: catalog } = useCatalog();
  const [period, setPeriod] = useState(() => periodRange("this-month"));
  const [periodSaleItems, setPeriodSaleItems] = useState<SaleItem[]>([]);

  const periodLabel = describePeriod(period.from, period.to);

  const periodSaleIds = useMemo(
    () =>
      transactions
        .filter((t) => isSale(t) && !isCancelled(t) && (!period.from || t.date >= period.from) && (!period.to || t.date <= period.to))
        .map((t) => t.id)
        .join(","),
    [transactions, period]
  );
  useEffect(() => {
    let stale = false;
    getSaleItemsBySaleIds(periodSaleIds ? periodSaleIds.split(",") : []).then((items) => {
      if (!stale) setPeriodSaleItems(items);
    });
    return () => {
      stale = true;
    };
  }, [periodSaleIds]);

  const fin = useMemo(
    () => computePeriodFinancials(transactions, periodSaleItems, period.from, period.to),
    [transactions, periodSaleItems, period]
  );
  const catalogById = useMemo(() => new Map(catalog.map((item) => [item.id, item])), [catalog]);

  const chartValues = useMemo(() => sumByDay(fin.sales, "vendas"), [fin.sales]);
  const porCategoria = useMemo(() => revenueByCategory(periodSaleItems, catalogById), [periodSaleItems, catalogById]);
  const totalItens = porCategoria.reduce((s, r) => s + r.value, 0);
  const maisVendidos = useMemo(() => topSoldItems(periodSaleItems, 10), [periodSaleItems]);

  // Forma de pagamento vem do recebimento (a venda do prontuário não guardava a forma).
  const porForma = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of fin.receipts) {
      const key = r.paymentMethod || "Não informado";
      map.set(key, (map.get(key) || 0) + r.amount);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((r) => Math.abs(r.value) >= 0.005)
      .sort((a, b) => b.value - a.value);
  }, [fin.receipts]);

  const handlePrint = () => {
    const rows = (cells: string[][]) =>
      cells.map((r) => `<tr>${r.map((c, i) => `<td${i === r.length - 1 ? ' style="text-align:right"' : ""}>${c}</td>`).join("")}</tr>`).join("");
    const empty = (cols: number) => `<tr><td colspan="${cols}">Sem dados</td></tr>`;
    openPrintReport(
      "Relatório de vendas",
      `
      <h1>Relatório de vendas</h1><p>Período: ${escapeHtml(periodLabel)}</p>
      <div class="kpi"><strong>Vendido:</strong> ${fmt(fin.faturado)} (${plural(fin.sales.length, "venda", "vendas")})</div>
      <div class="kpi"><strong>Ticket médio:</strong> ${fmt(fin.ticketMedio)}</div>
      <div class="kpi"><strong>Recebido:</strong> ${fmt(fin.recebido)}</div>
      <div class="kpi"><strong>A receber (todas as datas):</strong> ${fmt(fin.openTotal)}</div>
      <h2>Por categoria</h2>
      <table><thead><tr><th>Categoria</th><th>Itens</th><th style="text-align:right">Valor</th></tr></thead><tbody>${
        porCategoria.length
          ? rows(porCategoria.map((r) => [escapeHtml(catalogCategoryLabel(r.category)), qtyLabel(r.quantity), fmt(r.value)]))
          : empty(3)
      }</tbody></table>
      <h2>Mais vendidos</h2>
      <table><thead><tr><th>Item</th><th>Qtd.</th><th style="text-align:right">Valor</th></tr></thead><tbody>${
        maisVendidos.length ? rows(maisVendidos.map((r) => [escapeHtml(r.name), qtyLabel(r.quantity), fmt(r.value)])) : empty(3)
      }</tbody></table>
      <h2>Vendas do período</h2>
      <table><thead><tr><th>Data</th><th>Itens</th><th style="text-align:right">Valor</th></tr></thead><tbody>${
        fin.sales.length
          ? rows(fin.sales.map((s) => [formatDateTime(s.date, s.time), escapeHtml(summarizeSaleItems(s.description, 4)), fmt(s.amount)]))
          : empty(3)
      }</tbody></table>
      ${
        fin.cancelledSales.length
          ? `<p style="color:#64748b;font-size:12px">${plural(fin.cancelledSales.length, "venda cancelada", "vendas canceladas")} no período (fora dos totais).</p>`
          : ""
      }
    `
    );
  };

  return (
    <PageShell className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Relatório de vendas"
        description={`O que foi vendido, quanto e como foi pago · ${periodLabel}`}
        icon={BarChart3}
        module="sales"
        breadcrumb={<>Painel &gt; Vendas &gt; Relatório</>}
        className="mb-0 sm:mb-0"
        actions={
          <>
            <Button asChild variant="outline" className="flex-1 sm:flex-none">
              <Link to="/sales/my-sales">
                <Receipt className="mr-2 h-4 w-4 text-sky-600" /> Vendas
              </Link>
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
          </>
        }
      />

      <PeriodFilter from={period.from} to={period.to} onChange={setPeriod} className="print:hidden" />

      <KpiStrip
        loading={loading}
        items={[
          {
            label: "Vendido",
            concept: CONCEPTS.faturado,
            value: fmt(fin.faturado),
            hint:
              plural(fin.sales.length, "venda", "vendas") +
              (fin.cancelledSales.length > 0 ? ` · ${plural(fin.cancelledSales.length, "cancelada", "canceladas")} fora` : ""),
          },
          { label: "Ticket médio", concept: CONCEPTS.ticket, value: fmt(fin.ticketMedio), hint: "por venda" },
          {
            label: "Recebido",
            concept: CONCEPTS.recebido,
            value: fmt(fin.recebido),
            hint: fin.faturado > 0 ? `${Math.round((fin.recebido / fin.faturado) * 100)}% do vendido` : "—",
          },
          {
            label: "A receber",
            concept: CONCEPTS.aReceber,
            value: fmt(fin.openTotal),
            hint: fin.openSales.length > 0 ? `${plural(fin.openSales.length, "venda", "vendas")} · todas as datas` : "Nada em aberto",
            colorValue: fin.openTotal > 0,
          },
        ]}
      />

      <Panel
        title="Vendas por dia"
        icon={BarChart3}
        tone="sky"
        description={periodLabel}
        className="print:break-inside-avoid"
        actions={<span className="text-sm font-bold tabular-nums text-sky-700">{fmt(fin.faturado)}</span>}
      >
        <div className="p-3 sm:p-4">
          {fin.sales.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Nenhuma venda no período.</div>
          ) : (
            <DailyBarChart values={chartValues} series={SALES_SERIES} from={period.from} to={period.to} className="h-[260px] w-full" />
          )}
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Por categoria" icon={Layers} tone="sky" description="Categorias do catálogo" className="print:break-inside-avoid">
          <div className="p-3 sm:p-4">
            {porCategoria.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum item vendido no período.</p>
            ) : (
              <BarList
                items={porCategoria.map((row) => {
                  const v = categoryVisual(row.category);
                  return {
                    key: row.category ?? "",
                    label: catalogCategoryLabel(row.category),
                    value: row.value,
                    hint: `${plural(row.quantity, "item", "itens")} · ${pct(row.value, totalItens)}`,
                    icon: v.icon,
                    tone: v.tone,
                  };
                })}
              />
            )}
          </div>
        </Panel>

        <Panel
          title="Recebido por forma"
          icon={CONCEPTS.recebido.icon}
          tone="teal"
          description="Confere com a gaveta e a maquininha"
          className="print:break-inside-avoid"
          actions={<span className="text-sm font-bold tabular-nums text-teal-700">{fmt(fin.recebido)}</span>}
        >
          <div className="p-3 sm:p-4">
            {porForma.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum recebimento no período.</p>
            ) : (
              <BarList
                items={porForma.map((row) => {
                  const v = paymentMethodVisual(row.name);
                  return { key: row.name, label: row.name, value: row.value, hint: pct(row.value, fin.recebido), icon: v.icon, tone: v.tone };
                })}
              />
            )}
          </div>
        </Panel>
      </div>

      <Panel
        title="Mais vendidos"
        icon={Trophy}
        tone="violet"
        description="Top 10 por valor no período"
        className="print:break-inside-avoid"
      >
        <div className="p-3 sm:p-4">
          {maisVendidos.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum item vendido no período.</p>
          ) : (
            <BarList
              ranked
              tone="violet"
              items={maisVendidos.map((row) => ({
                key: row.key,
                label: row.name,
                value: row.value,
                hint: `× ${qtyLabel(row.quantity)}`,
              }))}
            />
          )}
        </div>
      </Panel>
    </PageShell>
  );
};

export default SalesReportsPage;
