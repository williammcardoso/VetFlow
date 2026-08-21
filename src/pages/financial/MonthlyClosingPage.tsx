import React, { useEffect, useMemo, useState } from "react";
import { formatCurrencyBRL } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { useAuth } from "@/contexts/AuthContext";
import { getSaleItemsBySaleIds, type SaleItem } from "@/lib/saleItemsApi";
import {
  CLOSING_PARTNERS,
  computeMonthlyClosing,
  getMonthBounds,
  monthLabel,
  type MonthlyClosingBreakdown,
} from "@/lib/monthlyClosing";
import {
  closeMonth,
  getMonthlyClosing,
  reopenMonth,
  type MonthlyClosingRecord,
} from "@/lib/monthlyClosingsApi";
import MonthlyClosingPdfContent from "@/components/MonthlyClosingPdfContent";
import { createPdfBlob, openPdf } from "@/lib/pdfExport";
import { ArrowLeft, Calculator, Lock, Unlock, Printer, Scale, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

const fmt = (v: number) =>
  formatCurrencyBRL(v);

const MonthlyClosingPage: React.FC = () => {
  const { transactions } = useFinancialTransactions();
  const { session } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [printing, setPrinting] = useState(false);
  const [closedRecord, setClosedRecord] = useState<MonthlyClosingRecord | null>(null);
  const [closingLoading, setClosingLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const { from, to } = useMemo(() => getMonthBounds(year, month), [year, month]);

  useEffect(() => {
    let cancelled = false;
    setClosingLoading(true);
    getMonthlyClosing(year, month).then((record) => {
      if (!cancelled) {
        setClosedRecord(record);
        setClosingLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const monthSales = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.type === "income" &&
          t.category === "Venda de Produtos" &&
          t.date >= from &&
          t.date <= to
      ),
    [transactions, from, to]
  );

  // Lista de Compras do Almoxarifado (Estoque → Compras) — desde 2026-08-07 é
  // daqui que vem o custo de insumo, agregado por mês, em vez de por venda.
  const monthPurchases = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.type === "expense" &&
          t.category === "Estoque" &&
          t.date >= from &&
          t.date <= to
      ),
    [transactions, from, to]
  );

  useEffect(() => {
    let cancelled = false;
    getSaleItemsBySaleIds(monthSales.map((s) => s.id)).then((items) => {
      if (!cancelled) setSaleItems(items);
    });
    return () => {
      cancelled = true;
    };
  }, [monthSales]);

  const liveClosing: MonthlyClosingBreakdown = useMemo(
    () =>
      computeMonthlyClosing({
        year,
        month,
        sales: monthSales,
        saleItems,
        purchases: monthPurchases,
      }),
    [year, month, monthSales, saleItems, monthPurchases]
  );

  const isClosed = !!closedRecord;
  const closing: MonthlyClosingBreakdown = isClosed
    ? { ...closedRecord!, label: monthLabel(year, month) }
    : liveClosing;

  const diverged =
    isClosed &&
    (Math.round(closedRecord!.lucroLiquido * 100) !== Math.round(liveClosing.lucroLiquido * 100) ||
      closedRecord!.salesCount !== liveClosing.salesCount);

  const handleCloseMonth = async () => {
    setActionLoading(true);
    try {
      const ok = await closeMonth(liveClosing, session?.username);
      if (!ok) {
        toast.error("Erro ao fechar o mês.");
        return;
      }
      const record = await getMonthlyClosing(year, month);
      setClosedRecord(record);
      toast.success("Mês fechado. Os valores ficam travados até reabrir.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenMonth = async () => {
    setActionLoading(true);
    try {
      const ok = await reopenMonth(year, month);
      if (!ok) {
        toast.error("Erro ao reabrir o mês.");
        return;
      }
      setClosedRecord(null);
      toast.success("Mês reaberto. Os valores voltam a ser calculados ao vivo.");
    } finally {
      setActionLoading(false);
    }
  };

  const yearOptions = useMemo(() => {
    const years = new Set<number>([now.getFullYear()]);
    transactions.forEach((t) => {
      const y = Number(t.date.slice(0, 4));
      if (y) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions, now]);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const blob = await createPdfBlob(<MonthlyClosingPdfContent data={closing} />);
      await openPdf({
        blob,
        fileName: `fechamento-50-50-${year}-${String(month).padStart(2, "0")}.pdf`,
      });
    } catch {
      toast.error("Erro ao gerar PDF do fechamento.");
    } finally {
      setPrinting(false);
    }
  };

  const rows = [
    { label: "Faturamento bruto", value: closing.bruto, tone: "neutral" as const },
    { label: "(−) Compras de estoque (Almoxarifado)", value: -closing.custoCompras, tone: "amber" as const },
    // Legado: só aparece se houver venda antiga com custo de insumo embutido
    // (composição/BOM, descontinuada) — meses novos não geram esse valor.
    ...(closing.custoProdutos > 0
      ? [{ label: "(−) Custo de produtos (venda antiga)", value: -closing.custoProdutos, tone: "amber" as const }]
      : []),
    { label: "(−) Repasses (labs / especialistas)", value: -closing.custoRepasses, tone: "amber" as const },
    { label: "(−) Taxas de cartão / operadora", value: -closing.taxasCartao, tone: "amber" as const },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Fechamento Mensal 50/50"
        description={`Divisão do lucro líquido real entre ${CLOSING_PARTNERS.clinic} e ${CLOSING_PARTNERS.agro}.`}
        icon={Scale}
        module="finance"
        breadcrumb={<>Painel &gt; Financeiro &gt; Fechamento 50/50</>}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="h-9 w-[140px] border border-border bg-card">
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
              <SelectTrigger className="h-9 w-[100px] border border-border bg-card">
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
            <Button onClick={handlePrint} disabled={printing} className="gap-2">
              <Printer className="h-4 w-4" />
              {printing ? "Gerando..." : "PDF"}
            </Button>
            {!closingLoading && (
              isClosed ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={actionLoading} className="gap-2">
                      <Unlock className="h-4 w-4" />
                      Reabrir mês
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reabrir {monthLabel(year, month)}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Os valores travados serão descartados e a tela volta a calcular ao vivo a partir das vendas
                        atuais. Use isso só se precisar corrigir algo — se já repassou este fechamento para a
                        agropecuária, o valor pode mudar depois de reaberto.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleReopenMonth}>Reabrir mesmo assim</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={actionLoading || liveClosing.salesCount === 0} className="gap-2">
                      <Lock className="h-4 w-4" />
                      Fechar mês
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Fechar {monthLabel(year, month)}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Trava o resultado atual ({fmt(liveClosing.lucroLiquido)} de lucro líquido, {fmt(liveClosing.metadeClinica)} para cada lado)
                        como o fechamento oficial deste mês. Se algum lançamento for corrigido depois, o valor
                        exibido aqui não muda sozinho — você precisa reabrir para recalcular.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCloseMonth}>Fechar mês</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )
            )}
            <Link to="/stock/purchases">
              <Button variant="outline" className="gap-2">
                <ShoppingBag className="h-4 w-4" /> Lista de Compras
              </Button>
            </Link>
            <Link to="/financial">
              <Button variant="ghost" className="gap-2 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
            </Link>
          </div>
        }
      />

      <div className="space-y-5">
        {isClosed && (
          <div className="flex items-start gap-2 rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-3 text-sm text-teal-800">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <span className="font-semibold">Mês fechado</span>
              {closedRecord?.closedAt && (
                <> em {new Date(closedRecord.closedAt).toLocaleDateString("pt-BR")}</>
              )}
              {closedRecord?.closedBy && <> por {closedRecord.closedBy}</>}.
              {" "}Os valores abaixo estão travados no que foi fechado, não recalculam ao vivo.
              {diverged && (
                <div className="mt-1 flex items-center gap-1 text-amber-700">
                  ⚠ As vendas do mês mudaram desde o fechamento (lançamento corrigido depois). Reabra para atualizar, se necessário.
                </div>
              )}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="vf-surface-card vf-tone-finance rounded-xl border-border/80">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Período</div>
              <div className="text-xl font-bold mt-1">{closing.label}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {closing.salesCount} venda(s) no mês
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-emerald-200 bg-emerald-50/40">
            <CardContent className="p-4">
              <div className="text-xs text-emerald-700 uppercase tracking-wide font-medium">
                Lucro líquido real
              </div>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {fmt(closing.lucroLiquido)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Margem {closing.margemPct}% sobre o bruto
              </div>
            </CardContent>
          </Card>
          <Card className="vf-surface-card vf-tone-finance rounded-xl border-border/80">
            <CardContent className="p-4 flex items-start gap-3">
              <Calculator className="h-5 w-5 text-[hsl(var(--vf-finance))] mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground">Fórmula</div>
                <div className="text-sm font-medium mt-1 leading-snug">
                  Bruto − compras (almoxarifado) − repasses − taxas
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Saídas operacionais não entram
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-xl border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Composição do resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0"
                >
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      row.tone === "amber"
                        ? "text-amber-700"
                        : "text-foreground"
                    }`}
                  >
                    {row.tone === "amber" ? "− " : ""}
                    {fmt(Math.abs(row.value))}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between py-3 mt-1 rounded-lg bg-emerald-50 px-3">
                <span className="text-sm font-semibold text-emerald-800">
                  = Lucro líquido real
                </span>
                <span className="text-base font-bold text-emerald-700 tabular-nums">
                  {fmt(closing.lucroLiquido)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="rounded-xl border-teal-200 bg-teal-50/30">
            <CardContent className="p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-teal-800">
                {CLOSING_PARTNERS.clinic} · 50%
              </div>
              <div className="text-3xl font-bold text-teal-800 mt-2">
                {fmt(closing.metadeClinica)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Parte da clínica no lucro líquido do mês.
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-amber-200 bg-amber-50/30">
            <CardContent className="p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                {CLOSING_PARTNERS.agro} · 50%
              </div>
              <div className="text-3xl font-bold text-amber-800 mt-2">
                {fmt(closing.metadeAgro)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Parte da agropecuária (Agrocentro) no lucro líquido do mês.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
};

export default MonthlyClosingPage;
