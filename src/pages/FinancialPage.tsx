import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, formatCurrencyBRL, formatDateTime, parseItemQty } from "@/lib/utils";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import type { FinancialTransaction } from "@/mockData/financial";
import { getSaleItemsBySaleIds, type SaleItem } from "@/lib/saleItemsApi";
import { groupRepassesByProvider } from "@/lib/costProviders";
import { classifyTransaction } from "@/lib/financialTransactionDisplay";
import { toast } from "sonner";
import FinancialOverviewPdfContent from "@/components/FinancialOverviewPdfContent";
import { createPdfBlob, openPdf } from "@/lib/pdfExport";
import { exportRowsToXlsx } from "@/lib/xlsxExport";
import {
  DollarSign,
  CheckCircle,
  AlertCircle,
  Tag,
  TrendingUp,
  Clock,
  PawPrint,
  Wallet,
  ArrowUpRight,
} from "lucide-react";
import { PageHeader } from "@/components/saas/PageHeader";
import { PageShell } from "@/components/saas/PageShell";
import { SectionCard } from "@/components/saas/SectionCard";

const iso = (d: Date) => d.toISOString().split("T")[0];

// Atalhos de período — é assim que o financeiro costuma ser consultado
// (fechamento do mês, mês passado), em vez de digitar as duas datas.
const PERIOD_SHORTCUTS: { label: string; range: () => { from: string; to: string } }[] = [
  {
    label: "Este mês",
    range: () => {
      const n = new Date();
      return {
        from: iso(new Date(n.getFullYear(), n.getMonth(), 1)),
        to: iso(new Date(n.getFullYear(), n.getMonth() + 1, 0)),
      };
    },
  },
  {
    label: "Mês passado",
    range: () => {
      const n = new Date();
      return {
        from: iso(new Date(n.getFullYear(), n.getMonth() - 1, 1)),
        to: iso(new Date(n.getFullYear(), n.getMonth(), 0)),
      };
    },
  },
  {
    label: "Últimos 30 dias",
    range: () => {
      const n = new Date();
      const start = new Date(n);
      start.setDate(start.getDate() - 30);
      return { from: iso(start), to: iso(n) };
    },
  },
];

// Descrições de venda vêm como "Venda para X (Y): Item1 x1, Item2 x2" — separa
// quem comprou dos itens em si, que é o que a pessoa quer identificar rápido.
const splitSaleDescription = (label: string): { who?: string; items: string } => {
  const idx = label.indexOf(": ");
  if (idx === -1) return { items: label };
  return { who: label.slice(0, idx), items: label.slice(idx + 2) };
};

const withinRange = (dateStr: string, from?: string, to?: string) => {
  const dt = new Date(`${dateStr}T00:00`);
  const f = from ? new Date(`${from}T00:00`) : undefined;
  const t = to ? new Date(`${to}T23:59`) : undefined;
  return (!f || dt >= f) && (!t || dt <= t);
};

// Recebimentos de uma venda. Estornos entram como valores negativos na mesma
// categoria, então a soma já desconta o que foi devolvido.
const sumReceiptsForSale = (list: FinancialTransaction[], saleId: string) => {
  const receipts = list.filter(
    (t) =>
      t.type === "income" &&
      t.category === "Recebimento" &&
      (t.saleId === saleId || (t.description || "").includes(saleId))
  );
  return receipts.reduce((s, r) => s + r.amount, 0);
};

const FinancialPage: React.FC = () => {
  const [dateFrom, setDateFrom] = useState<string>(() => PERIOD_SHORTCUTS[0].range().from);
  const [dateTo, setDateTo] = useState<string>(() => PERIOD_SHORTCUTS[0].range().to);
  const [drilldown, setDrilldown] = useState<"faturado" | "recebido" | "aberto" | "custo" | "compras" | null>(null);
  const { transactions, loading } = useFinancialTransactions();
  const [periodSaleItems, setPeriodSaleItems] = useState<SaleItem[]>([]);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Itens das vendas do período — repasse a prestador de verdade vem daqui
  // (sale_items.cost/costProvider), não do campo supplierCost da transação
  // (esse ficou legado desde a mudança pro modelo de composição por item;
  // sem isso "Repasses (prestador)" sempre mostrava R$ 0,00 aqui, mesmo
  // quando o Relatório Financeiro mostrava o valor certo).
  useEffect(() => {
    const saleIds = transactions
      .filter(
        (t) =>
          t.type === "income" &&
          t.category === "Venda de Produtos" &&
          (t.status || "pending") !== "cancelled" &&
          withinRange(t.date, dateFrom, dateTo)
      )
      .map((t) => t.id);
    let cancelled = false;
    getSaleItemsBySaleIds(saleIds).then((items) => {
      if (!cancelled) setPeriodSaleItems(items);
    });
    return () => {
      cancelled = true;
    };
  }, [transactions, dateFrom, dateTo]);

  const data = useMemo(() => {
    // Filtro por período. Venda cancelada não é faturamento — sem isso o
    // total ficava inflado por vendas estornadas.
    const sales = transactions.filter(
      (t) =>
        t.type === "income" &&
        t.category === "Venda de Produtos" &&
        (t.status || "pending") !== "cancelled" &&
        withinRange(t.date, dateFrom, dateTo)
    );
    const receipts = transactions.filter(
      (t) => t.type === "income" && t.category === "Recebimento" && withinRange(t.date, dateFrom, dateTo)
    );

    const totalFaturado = sales.reduce((s, t) => s + t.amount, 0);
    const totalRecebido = receipts.reduce((s, t) => s + t.amount, 0);

    let totalEmAberto = 0;
    let vendasPendentes = 0;
    const openSales: (FinancialTransaction & { remaining: number })[] = [];
    sales.forEach((sale) => {
      const paid = sumReceiptsForSale(transactions, sale.id);
      const remaining = Math.max(0, sale.amount - paid);
      totalEmAberto += remaining;
      if (remaining > 0) {
        vendasPendentes += 1;
        openSales.push({ ...sale, remaining });
      }
    });

    // Custo dos itens vendidos (repasse a prestador) e taxas de operadora:
    // é o que separa faturamento de lucro real — base da divisão 50/50.
    // repassesPorPrestador (sale_items) é a fonte de verdade atual; supplierCost
    // na transação é legado (vendas de antes da mudança pro modelo por item).
    const repassesPorPrestador = groupRepassesByProvider(periodSaleItems);
    const totalRepassesPorItem = repassesPorPrestador.reduce((s, r) => s + r.amount, 0);
    const costItems = sales.filter((s) => (s.supplierCost ?? 0) > 0);
    // Some vendas com sale_items (custo por item, atual) só com vendas SEM
    // nenhum sale_item (legado puro) — antes escolhia um total OU outro, e
    // se o período tivesse os dois tipos misturados, o repasse das vendas
    // legadas sumia silenciosamente da soma.
    const saleIdsWithItems = new Set(periodSaleItems.map((i) => i.saleId));
    const totalRepassesLegado = sales
      .filter((t) => !saleIdsWithItems.has(t.id))
      .reduce((s, t) => s + (t.supplierCost ?? 0), 0);
    const totalRepasses = totalRepassesPorItem + totalRepassesLegado;
    const totalTaxas = sales.reduce((s, t) => s + (t.financialFee ?? 0), 0);

    // Compras de estoque do período (Almoxarifado) — desde 2026-08-07 é daqui
    // que vem o custo de insumo, agregado por mês em vez de por venda.
    const purchases = transactions.filter(
      (t) => t.type === "expense" && t.category === "Estoque" && withinRange(t.date, dateFrom, dateTo)
    );
    const totalCompras = purchases.reduce((s, t) => s + t.amount, 0);

    const lucroReal = totalFaturado - totalRepasses - totalCompras - totalTaxas;
    const margemReal = totalFaturado > 0 ? Math.round((lucroReal / totalFaturado) * 100) : 0;

    const ticketMedio = sales.length > 0 ? totalFaturado / sales.length : 0;
    const percentRecebido = totalFaturado > 0 ? Math.min(100, Math.round((totalRecebido / totalFaturado) * 100)) : 100;

    // Situação interpretativa: Estável, Atenção, Pendências
    let situacao: "Estável" | "Atenção" | "Pendências" = "Estável";
    if (totalEmAberto > 0 || vendasPendentes > 0) {
      situacao = percentRecebido < 70 ? "Pendências" : "Atenção";
    }

    // Série por dia para gráfico simples (linhas/barras)
    const byDayMap: Record<string, number> = {};
    sales.forEach((s) => {
      byDayMap[s.date] = (byDayMap[s.date] || 0) + s.amount;
    });
    const dayKeys = Object.keys(byDayMap).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const series = dayKeys.map((d) => ({ date: d, value: byDayMap[d] }));

    // Últimas transações (todas no período, ordenadas)
    const lastTransactions = transactions
      .filter((t) => withinRange(t.date, dateFrom, dateTo))
      .sort((a, b) => {
        const A = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
        const B = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
        return B - A;
      })
      .slice(0, 6);

    const periodLabel =
      dateFrom && dateTo
        ? `Período: ${formatDateTime(dateFrom)} a ${formatDateTime(dateTo)}`
        : "Período: todos os registros";

    return {
      totalFaturado,
      totalRecebido,
      totalEmAberto,
      vendasPendentes,
      totalRepasses,
      lucroReal,
      margemReal,
      ticketMedio,
      percentRecebido,
      situacao,
      series,
      lastTransactions,
      periodLabel,
      sales,
      receipts,
      openSales,
      costItems,
      repassesPorPrestador,
      purchases,
      totalCompras,
    };
  }, [transactions, dateFrom, dateTo, periodSaleItems]);

  const cardClass =
    "vf-surface-card vf-tone-finance rounded-xl border border-border bg-card shadow-sm transition-all hover:border-[hsl(var(--vf-finance)/0.35)] hover:shadow-md";
  const clickableCardClass = cn(cardClass, "cursor-pointer");

  const drilldownContent: Record<
    "faturado" | "recebido" | "aberto" | "custo" | "compras",
    { title: string; empty: string; rows: { id?: string; label: string; sublabel: string; value: number; valueClass?: string }[] }
  > = {
    faturado: {
      title: "Total faturado — vendas do período",
      empty: "Nenhuma venda no período.",
      rows: data.sales.map((s) => ({
        label: s.description,
        sublabel: formatDateTime(s.date, s.time),
        value: s.amount,
      })),
    },
    recebido: {
      title: "Total recebido — recebimentos do período",
      empty: "Nenhum recebimento no período.",
      rows: data.receipts.map((r) => ({
        label: r.description,
        sublabel: formatDateTime(r.date, r.time),
        value: r.amount,
        valueClass: "text-emerald-700",
      })),
    },
    aberto: {
      title: "Em aberto — vendas com saldo pendente",
      empty: "Nenhuma venda em aberto no período.",
      rows: data.openSales.map((s) => ({
        id: s.id,
        label: s.description,
        sublabel: formatDateTime(s.date, s.time),
        value: s.remaining,
        valueClass: "text-red-700",
      })),
    },
    custo: {
      title: "Repasses a prestador — por prestador",
      empty: "Nenhum repasse a prestador registrado no período.",
      rows:
        data.repassesPorPrestador.length > 0
          ? data.repassesPorPrestador.map((r) => ({
              label: r.provider,
              sublabel: "Repasse a prestador no período",
              value: r.amount,
              valueClass: "text-amber-700",
            }))
          : data.costItems.map((s) => ({
              label: s.description,
              sublabel: formatDateTime(s.date, s.time),
              value: s.supplierCost ?? 0,
              valueClass: "text-amber-700",
            })),
    },
    compras: {
      title: "Compras de estoque — Almoxarifado",
      empty: "Nenhuma compra registrada no período.",
      rows: data.purchases.map((p) => ({
        label: p.description,
        sublabel: formatDateTime(p.date, p.time),
        value: p.amount,
        valueClass: "text-amber-700",
      })),
    },
  };

  // Gráfico simples com SVG barras/linha (leve e sem libs)
  const Chart = ({ points }: { points: { date: string; value: number }[] }) => {
    const width = 480;
    const height = 140;
    const padding = 24;
    const max = Math.max(1, ...points.map((p) => p.value));
    const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

    const linePath = points
      .map((p, i) => {
        const x = padding + i * step;
        const y = height - padding - (p.value / max) * (height - padding * 2);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

    return (
      <svg width={width} height={height} className="w-full h-[140px]">
        <rect x={0} y={0} width={width} height={height} className="fill-muted/45" rx={12} />
        {/* Linha de tendência */}
        <path d={linePath} stroke="hsl(var(--vf-finance))" strokeWidth={2} fill="none" />
        {/* Pontos */}
        {points.map((p, i) => {
          const x = padding + i * step;
          const y = height - padding - (p.value / max) * (height - padding * 2);
          return <circle key={i} cx={x} cy={y} r={3} fill="hsl(var(--vf-finance))" />;
        })}
      </svg>
    );
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const blob = await createPdfBlob(
        <FinancialOverviewPdfContent
          periodLabel={data.periodLabel}
          totalFaturado={data.totalFaturado}
          totalRecebido={data.totalRecebido}
          totalEmAberto={data.totalEmAberto}
          ticketMedio={data.ticketMedio}
          percentRecebido={data.percentRecebido}
          totalRepasses={data.totalRepasses}
          totalCompras={data.totalCompras}
          lucroReal={data.lucroReal}
          margemReal={data.margemReal}
          situacao={data.situacao}
          lastTransactions={data.lastTransactions}
        />
      );
      await openPdf({ blob, fileName: `visao-geral-financeira-${new Date().toISOString().slice(0, 10)}.pdf` });
    } catch {
      toast.error("Erro ao gerar PDF da Visão Geral.");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportExcel = () => {
    exportRowsToXlsx(`visao-geral-financeira-${new Date().toISOString().slice(0, 10)}`, [
      {
        name: "Últimas transações",
        headers: ["Data", "Descrição", "Categoria", "Valor", "Tipo"],
        rows: data.lastTransactions.map((t) => [
          formatDateTime(t.date, t.time),
          t.description,
          t.category || "",
          t.amount,
          t.type === "income" ? "Entrada" : "Saída",
        ]),
        currencyColumns: [3],
      },
    ]);
  };

  return (
    <PageShell>
      <PageHeader
        title="Visão Geral Financeira"
        description={loading ? "Carregando lançamentos..." : data.periodLabel}
        icon={Wallet}
        module="finance"
        breadcrumb={<>Painel &gt; Financeiro</>}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl border-primary/20 shadow-sm" onClick={() => void handleExportPdf()} disabled={exportingPdf}>
              {exportingPdf ? "Gerando PDF..." : "Exportar PDF"}
            </Button>
            <Button variant="outline" className="rounded-xl border-primary/20 shadow-sm" onClick={handleExportExcel}>
              Exportar Excel
            </Button>
          </div>
        }
      />

      <SectionCard
        title="Período de análise"
        description="Filtre os indicadores por intervalo para leitura financeira mais precisa."
        icon={Wallet}
        tone="finance"
      >
        <div className="relative overflow-hidden rounded-xl border border-border bg-muted/30 p-4">
          <PawPrint className="pointer-events-none absolute -right-2 -top-2 h-24 w-24 text-primary/10" aria-hidden />
          {/* Campos de data com largura fixa (antes cada um ocupava metade da
              tela) + atalhos, que é como o período costuma ser escolhido. */}
          <div className="relative flex flex-wrap items-end gap-3">
            <div className="w-40">
              <label className="text-xs font-medium text-muted-foreground">De</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1 h-9 rounded-lg border-border bg-input"
              />
            </div>
            <div className="w-40">
              <label className="text-xs font-medium text-muted-foreground">Até</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1 h-9 rounded-lg border-border bg-input"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {PERIOD_SHORTCUTS.map((p) => (
                <Button
                  key={p.label}
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg text-xs"
                  onClick={() => {
                    const { from, to } = p.range();
                    setDateFrom(from);
                    setDateTo(to);
                  }}
                >
                  {p.label}
                </Button>
              ))}
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-lg text-xs text-muted-foreground"
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Painel financeiro"
        description="Resumo executivo, tendência e alertas operacionais do caixa."
        icon={TrendingUp}
        tone="finance"
      >
        <Card className={cn(cardClass, "mb-4")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Resumo Financeiro do Período</CardTitle>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                data.situacao === "Estável" &&
                  "bg-emerald-500/15 text-emerald-800",
                data.situacao === "Atenção" &&
                  "bg-amber-500/15 text-amber-900",
                data.situacao === "Pendências" &&
                  "bg-red-500/15 text-red-800"
              )}
            >
              {data.situacao}
            </span>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-0">
            <div
              className="cursor-pointer rounded-xl border border-border bg-muted/40 p-3 transition-colors hover:border-[hsl(var(--vf-finance)/0.35)]"
              onClick={() => setDrilldown("faturado")}
            >
              <div className="text-xs text-muted-foreground">Total faturado</div>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrencyBRL(data.totalFaturado)}
              </div>
            </div>
            <div
              className="cursor-pointer rounded-xl border border-border bg-muted/40 p-3 transition-colors hover:border-[hsl(var(--vf-finance)/0.35)]"
              onClick={() => setDrilldown("recebido")}
            >
              <div className="text-xs text-muted-foreground">% recebido</div>
              <div
                className={cn(
                  "text-2xl font-bold",
                  data.percentRecebido >= 80
                    ? "text-emerald-600"
                    : data.percentRecebido >= 50
                      ? "text-vf-finance"
                      : "text-red-600"
                )}
              >
                {data.percentRecebido}%
              </div>
            </div>
            <div
              className="cursor-pointer rounded-xl border border-border bg-muted/40 p-3 transition-colors hover:border-[hsl(var(--vf-finance)/0.35)]"
              onClick={() => setDrilldown("aberto")}
            >
              <div className="text-xs text-muted-foreground">Pendências</div>
              <div className={cn("text-2xl font-bold", data.totalEmAberto > 0 ? "text-red-700" : "text-green-700")}>
                {data.totalEmAberto > 0 ? "Ativas" : "Nenhuma"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Bar: KPIs menores com ícones lineares. Clicáveis: abrem o
            detalhamento do que compõe cada número. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Card className={clickableCardClass} onClick={() => setDrilldown("faturado")}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Total Faturado</div>
                <div className="text-xl font-bold text-foreground">
                  {formatCurrencyBRL(data.totalFaturado)}
                </div>
              </div>
              <DollarSign className="h-5 w-5 text-vf-finance" />
            </CardContent>
          </Card>
          <Card className={clickableCardClass} onClick={() => setDrilldown("recebido")}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Total Recebido</div>
                <div className="text-xl font-bold text-vf-finance">
                  {formatCurrencyBRL(data.totalRecebido)}
                </div>
              </div>
              <CheckCircle className="h-5 w-5 text-vf-finance" />
            </CardContent>
          </Card>
          <Card className={clickableCardClass} onClick={() => setDrilldown("aberto")}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Em Aberto</div>
                <div className={cn("text-xl font-bold", data.totalEmAberto > 0 ? "text-red-700" : "text-green-700")}>
                  {formatCurrencyBRL(data.totalEmAberto)}
                </div>
              </div>
              <AlertCircle className={cn("h-5 w-5", data.totalEmAberto > 0 ? "text-red-700" : "text-green-700")} />
            </CardContent>
          </Card>
          <Card className={clickableCardClass} onClick={() => setDrilldown("faturado")}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Ticket Médio</div>
                <div className="text-xl font-bold text-foreground">
                  {formatCurrencyBRL(data.ticketMedio)}
                </div>
              </div>
              <Tag className="h-5 w-5 text-vf-finance" />
            </CardContent>
          </Card>
          {/* Custo x lucro real: o faturamento sozinho não diz quanto sobra,
              e é o lucro real que entra na divisão com a agropecuária. */}
          <Card className={clickableCardClass} onClick={() => setDrilldown("custo")}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Repasses (prestador)</div>
                <div className="text-xl font-bold text-amber-700">
                  {formatCurrencyBRL(data.totalRepasses)}
                </div>
              </div>
              <Tag className="h-5 w-5 text-amber-700" />
            </CardContent>
          </Card>
          <Card className={clickableCardClass} onClick={() => setDrilldown("compras")}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Compras (Almoxarifado)</div>
                <div className="text-xl font-bold text-amber-700">
                  {formatCurrencyBRL(data.totalCompras)}
                </div>
              </div>
              <Tag className="h-5 w-5 text-amber-700" />
            </CardContent>
          </Card>
          <Link to="/financial/monthly-closing" className="block">
          <Card className={cardClass}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">
                  Lucro real{data.totalFaturado > 0 ? ` · ${data.margemReal}%` : ""}
                </div>
                <div className="text-xl font-bold text-emerald-700">
                  {formatCurrencyBRL(data.lucroReal)}
                </div>
                <div className="text-[10px] text-primary font-medium mt-0.5 flex items-center gap-0.5">
                  Ver Fechamento 50/50 <ArrowUpRight className="h-2.5 w-2.5" />
                </div>
              </div>
              <TrendingUp className="h-5 w-5 text-emerald-700" />
            </CardContent>
          </Card>
          </Link>
          <Link to="/financial/monthly-closing" className="block">
          <Card className={cardClass}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Metade 50/50 (cada parte)</div>
                <div className="text-xl font-bold text-foreground">
                  {formatCurrencyBRL(data.lucroReal / 2)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Clínica / Agropecuária
                </div>
                <div className="text-[10px] text-primary font-medium mt-0.5 flex items-center gap-0.5">
                  Ver Fechamento 50/50 <ArrowUpRight className="h-2.5 w-2.5" />
                </div>
              </div>
              <Wallet className="h-5 w-5 text-vf-finance" />
            </CardContent>
          </Card>
          </Link>
        </div>

        {/* Main Content: Gráfico (esquerda) + Últimas transações (direita) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className={cardClass + " lg:col-span-2"}>
            <CardHeader className="pb-2 flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-vf-finance" /> Receita no período
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {data.series.length > 0 ? (
                <Chart points={data.series} />
              ) : (
                <div className="relative flex h-[140px] items-center justify-center rounded-[12px] border border-border bg-muted/35">
                  <PawPrint className="absolute h-20 w-20 text-muted-foreground/10" />
                  <p className="text-xs text-muted-foreground">Sem dados de vendas no período.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-vf-finance" /> Últimas transações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.lastTransactions.length > 0 ? (
                data.lastTransactions.map((t) => {
                  const kind = classifyTransaction(t);
                  return (
                    <div
                      key={t.id}
                      className="flex items-start justify-between gap-3 rounded-[12px] border border-border bg-muted/30 p-3"
                    >
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              kind.badgeClass
                            )}
                          >
                            {kind.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(t.date, t.time)}
                          </span>
                        </div>
                        <span className="line-clamp-2 text-sm font-medium text-foreground">
                          {t.description}
                        </span>
                      </div>
                      <div className={cn("shrink-0 text-sm font-bold tabular-nums", kind.amountClass)}>
                        {kind.signal}
                        {formatCurrencyBRL(
                          Math.abs(t.amount)
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[12px] border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Nenhuma transação neste período.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status e Alertas (discreto) */}
        <div className="mt-4">
          <Card className="rounded-[12px] border border-border bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Status e Alertas</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              {data.totalEmAberto > 0 || data.vendasPendentes > 0 ? (
                <>
                  <div>• Existem pendências financeiras no período.</div>
                  <div>
                    • Vendas pendentes: {data.vendasPendentes} | Em aberto:{" "}
                    {formatCurrencyBRL(data.totalEmAberto)}
                  </div>
                </>
              ) : (
                <div>• Tudo em dia. Nenhuma pendência financeira ativa.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Atalhos. Antes apontavam para /financial/accounts-receivable,
            /financial/receipts e /financial/cash-movements — rotas que hoje
            só redirecionam de volta para esta página, então os botões não
            faziam nada. Agora levam para as telas que existem. */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Link to="/sales/my-sales" className="block">
            <button
              type="button"
              className={cn(
                "flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium shadow-sm transition-colors hover:border-primary/30 hover:bg-accent",
                data.totalEmAberto > 0 && "border-red-400/60"
              )}
            >
              <AlertCircle className="h-4 w-4" />
              Vendas em aberto
              {data.vendasPendentes > 0 && (
                <span className="rounded-full bg-red-100 px-1.5 text-xs font-semibold text-red-700">
                  {data.vendasPendentes}
                </span>
              )}
            </button>
          </Link>
          <Link to="/sales/receipts" className="block">
            <button
              type="button"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium shadow-sm transition-colors hover:border-primary/30 hover:bg-accent"
            >
              <CheckCircle className="h-4 w-4" />
              Registrar recebimento
            </button>
          </Link>
          <Link to="/financial/reports" className="block">
            <button
              type="button"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium shadow-sm transition-colors hover:border-primary/30 hover:bg-accent"
            >
              <TrendingUp className="h-4 w-4" />
              Relatório detalhado
            </button>
          </Link>
        </div>
      </SectionCard>

      <Dialog open={drilldown !== null} onOpenChange={(open) => !open && setDrilldown(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-hidden flex flex-col">
          {drilldown && (
            <>
              <DialogHeader>
                <DialogTitle>{drilldownContent[drilldown].title}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {drilldownContent[drilldown].rows.length > 0 ? (
                  drilldownContent[drilldown].rows.map((row, i) => {
                    const { who, items } = splitSaleDescription(row.label);
                    const rowContent = (
                      <>
                        <div className="min-w-0">
                          {who && <div className="truncate text-xs text-muted-foreground">{who}</div>}
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-medium text-foreground">
                            {items.split(", ").map((chunk, j) => {
                              const { name, qty } = parseItemQty(chunk);
                              return (
                                <span key={j} className="inline-flex items-center gap-1">
                                  {name}
                                  {qty && qty > 1 && (
                                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--vf-finance)/0.15)] px-1 text-[10px] font-bold leading-none text-[hsl(var(--vf-finance))]">
                                      {qty}
                                    </span>
                                  )}
                                  {j < items.split(", ").length - 1 && <span className="text-muted-foreground">,</span>}
                                </span>
                              );
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">{row.sublabel}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <div className={cn("text-sm font-bold tabular-nums", row.valueClass)}>
                            {formatCurrencyBRL(row.value)}
                          </div>
                          {drilldown === "aberto" && row.id && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                              Dar baixa
                            </span>
                          )}
                        </div>
                      </>
                    );
                    const rowClass = "flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3";
                    return drilldown === "aberto" && row.id ? (
                      <Link
                        key={i}
                        to={`/sales/receipts?saleId=${row.id}&amount=${row.value}`}
                        className={cn(rowClass, "transition-colors hover:border-red-300 hover:bg-red-50/60")}
                      >
                        {rowContent}
                      </Link>
                    ) : (
                      <div key={i} className={rowClass}>
                        {rowContent}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                    {drilldownContent[drilldown].empty}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
                <span>Total</span>
                <span>
                  {formatCurrencyBRL(
                    drilldownContent[drilldown].rows.reduce((s, r) => s + r.value, 0)
                  )}
                </span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default FinancialPage;