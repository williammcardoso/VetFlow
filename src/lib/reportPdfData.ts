import type { ReportPdfColumn, ReportPdfRow, ReportTablePdfProps } from "@/components/ReportTablePdfContent";
import { formatQtyName, type DayGroup, type ItemGroup } from "@/lib/salesBreakdown";
import { saleStatus, summarizeSaleItems } from "@/lib/salePayment";
import { formatCurrencyBRL } from "@/lib/utils";
import type { FinancialTransaction } from "@/mockData/financial";

// Monta o conteúdo dos PDFs dos cartões de Financeiro › Relatórios — o que a
// tela mostra, com o detalhe já aberto (clientes de cada item, vendas de cada
// dia, itens de cada compra).

const fmt = formatCurrencyBRL;
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const when = (date: string, time?: string) => `${dm(date)}${time ? ` ${time}` : ""}`;
const weekday = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
const qty = (q: number) => (Number.isInteger(q) ? String(q) : q.toLocaleString("pt-BR"));
const sum = (list: FinancialTransaction[]) => list.reduce((s, t) => s + t.amount, 0);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export interface People {
  clientName?: string;
  animalName?: string;
}
const peopleText = (p: People, fallback: string) =>
  p.animalName && p.clientName ? `${p.animalName} · ${p.clientName}` : p.clientName || p.animalName || fallback;

const ACCENT = { sky: "#0369A1", teal: "#0F766E", emerald: "#047857", amber: "#B45309" };

export function itemsReportPdf(groups: ItemGroup[], periodLabel: string): ReportTablePdfProps {
  const totalQty = groups.reduce((s, g) => s + g.quantity, 0);
  const total = groups.reduce((s, g) => s + g.total, 0);
  const summaryColumns: ReportPdfColumn[] = [
    { label: "Item", width: "60%" },
    { label: "Qtd", width: "15%", align: "right" },
    { label: "Valor", width: "25%", align: "right" },
  ];
  return {
    title: "Vendas por item",
    periodLabel,
    summary: `${qty(totalQty)} itens · ${plural(groups.length, "tipo", "tipos")}`,
    accent: ACCENT.sky,
    columns: [
      { label: "Data", width: "15%" },
      { label: "Paciente · tutor", width: "55%" },
      { label: "Qtd", width: "10%", align: "right" },
      { label: "Valor", width: "20%", align: "right" },
    ],
    sections: [
      { title: "Resumo", columns: summaryColumns, rows: groups.map((g) => ({ cells: [g.name, `${qty(g.quantity)}×`, fmt(g.total)] })) },
      ...groups.map((g) => ({
        title: g.name,
        right: `${qty(g.quantity)}× · ${fmt(g.total)}`,
        rows: g.lines.map((l) => ({
          cells: [when(l.date, l.time), `${l.animalName} · ${l.clientName}`, qty(l.quantity), fmt(l.subtotal)],
        })),
      })),
    ],
    total: { label: "Total dos itens", value: fmt(total) },
  };
}

export function dailyReportPdf(days: DayGroup[], periodLabel: string): ReportTablePdfProps {
  const total = days.reduce((s, d) => s + d.total, 0);
  const salesCount = days.reduce((s, d) => s + d.sales.length, 0);
  return {
    title: "Itens vendidos por dia",
    periodLabel,
    summary: `${plural(days.length, "dia", "dias")} com venda · ${plural(salesCount, "venda", "vendas")}`,
    accent: ACCENT.teal,
    columns: [
      { label: "Hora", width: "9%" },
      { label: "Paciente · tutor", width: "33%" },
      { label: "Itens", width: "40%" },
      { label: "Valor", width: "18%", align: "right" },
    ],
    sections: days.map((d) => ({
      title: `${dm(d.date)} (${weekday(d.date)})`,
      right: `${fmt(d.total)} · ${plural(d.sales.length, "venda", "vendas")}`,
      note: d.items.map((it) => formatQtyName(it.name, it.quantity)).join(" · "),
      rows: d.sales.map((s) => ({
        cells: [
          s.time ?? "",
          `${s.animalName} · ${s.clientName}`,
          s.items.map((it) => formatQtyName(it.name, it.quantity)).join(" · "),
          fmt(s.amount),
        ],
      })),
    })),
    total: { label: "Total do período", value: fmt(total) },
  };
}

export function salesReportPdf(sales: FinancialTransaction[], people: (t: FinancialTransaction) => People, periodLabel: string): ReportTablePdfProps {
  const active = sales.filter((t) => t.status !== "cancelled");
  const cancelled = sales.length - active.length;
  return {
    title: "Vendas",
    periodLabel,
    summary: `${plural(active.length, "venda", "vendas")}${cancelled ? ` · ${plural(cancelled, "cancelada", "canceladas")}` : ""}`,
    accent: ACCENT.sky,
    columns: [
      { label: "Data", width: "13%" },
      { label: "Itens · paciente/tutor", width: "53%" },
      { label: "Situação", width: "14%" },
      { label: "Valor", width: "20%", align: "right" },
    ],
    sections: [
      {
        rows: [...sales].reverse().map(
          (t): ReportPdfRow => ({
            cells: [when(t.date, t.time), summarizeSaleItems(t.description, 6), saleStatus(t).label, fmt(t.amount)],
            sub: peopleText(people(t), "Venda avulsa"),
            tone: t.status === "cancelled" ? "muted" : "normal",
          })
        ),
      },
    ],
    total: { label: "Total vendido (sem canceladas)", value: fmt(sum(active)) },
  };
}

export function receiptsReportPdf(receipts: FinancialTransaction[], people: (t: FinancialTransaction) => People, periodLabel: string): ReportTablePdfProps {
  const byMethod = new Map<string, number>();
  for (const t of receipts) {
    const key = t.paymentMethod || "Não informado";
    byMethod.set(key, (byMethod.get(key) || 0) + t.amount);
  }
  return {
    title: "Recebimentos",
    periodLabel,
    summary: plural(receipts.length, "lançamento", "lançamentos"),
    accent: ACCENT.emerald,
    columns: [
      { label: "Data", width: "13%" },
      { label: "Quem pagou", width: "53%" },
      { label: "Forma", width: "14%" },
      { label: "Valor", width: "20%", align: "right" },
    ],
    sections: [
      {
        rows: [...receipts].reverse().map(
          (t): ReportPdfRow => ({
            cells: [
              when(t.date, t.time),
              peopleText(people(t), t.description.replace(/^Recebimento:\s*/, "") || "Recebimento"),
              t.paymentMethod || "—",
              `${t.amount < 0 ? "− " : ""}${fmt(Math.abs(t.amount))}`,
            ],
            sub: t.amount < 0 ? "Estorno" : undefined,
            tone: t.amount < 0 ? "negative" : "normal",
          })
        ),
      },
      {
        title: "Por forma de pagamento",
        columns: [
          { label: "Forma", width: "70%" },
          { label: "Valor", width: "30%", align: "right" },
        ],
        rows: Array.from(byMethod.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([method, value]) => ({ cells: [method, fmt(value)] })),
      },
    ],
    total: { label: "Total recebido", value: fmt(sum(receipts)) },
  };
}

/** "Compra de estoque - Fornecedor: X: itens (Parcela 1/3)" → fornecedor + itens. */
export function parsePurchaseDescription(description: string): { supplier?: string; itemsText: string } {
  const m = (description || "").match(/^Compra de estoque(?: - Fornecedor: (.*?))?: (.*)$/s);
  if (!m) return { itemsText: description };
  return { supplier: m[1] || undefined, itemsText: m[2].replace(/ \(Parcela \d+\/\d+\)$/, "") };
}

export function expensesReportPdf(
  expenses: FinancialTransaction[],
  periodLabel: string,
  /** Itens de cada compra (pela transação), quando cadastrados. */
  itemsOf: (t: FinancialTransaction) => string | undefined
): ReportTablePdfProps {
  return {
    title: "Compras e saídas",
    periodLabel,
    summary: plural(expenses.length, "lançamento", "lançamentos"),
    accent: ACCENT.amber,
    columns: [
      { label: "Data", width: "13%" },
      { label: "Fornecedor / descrição", width: "53%" },
      { label: "Tipo", width: "14%" },
      { label: "Valor", width: "20%", align: "right" },
    ],
    sections: [
      {
        rows: [...expenses].reverse().map((t): ReportPdfRow => {
          const purchase = t.category === "Estoque" ? parsePurchaseDescription(t.description) : null;
          return {
            cells: [
              when(t.date, t.time),
              purchase ? purchase.supplier || "Compra do almoxarifado" : t.description,
              purchase ? `Compra${t.installmentLabel ? ` ${t.installmentLabel.replace("Parcela ", "")}` : ""}` : t.category || "Saída",
              `− ${fmt(Math.abs(t.amount))}`,
            ],
            sub: purchase ? itemsOf(t) || purchase.itemsText : undefined,
          };
        }),
      },
    ],
    total: { label: "Total de compras e saídas", value: `− ${fmt(sum(expenses))}` },
  };
}
