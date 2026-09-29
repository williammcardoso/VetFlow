import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calculator, Stethoscope, TrendingUp, Wheat, type LucideIcon } from "lucide-react";
import { cn, formatCurrencyBRL } from "@/lib/utils";
import { CLOSING_PARTNERS, type MonthlyClosingBreakdown } from "@/lib/monthlyClosing";
import { Panel } from "@/components/finance/FinanceUI";
import { CONCEPTS, TONES, type Tone } from "@/components/finance/financeTheme";

type RowKey = "bruto" | "repasses" | "produtos" | "compras" | "taxas";

interface Row {
  key: RowKey;
  label: string;
  hint?: string;
  value: number;
  icon: LucideIcon;
  tone: Tone;
}

/**
 * Demonstrativo do período no mesmo visual do Fechamento 50/50: bruto,
 * deduções em cor (repasse laranja, compras âmbar, taxas vermelho), lucro em
 * faixa verde e a divisão Clínica (verde-azulado) / Agropecuária (âmbar).
 */
export function ResultBreakdown({
  closing,
  periodLabel,
  onRowClick,
  footer,
  className,
}: {
  closing: MonthlyClosingBreakdown;
  periodLabel: string;
  /** Linhas clicáveis abrem o detalhamento (bruto, repasses, compras). */
  onRowClick?: (key: RowKey) => void;
  footer?: React.ReactNode;
  className?: string;
}) {
  const rows: Row[] = [
    { key: "bruto", label: "Faturamento bruto", hint: `${closing.salesCount} ${closing.salesCount === 1 ? "venda" : "vendas"}`, value: closing.bruto, ...pick(CONCEPTS.faturado) },
    { key: "repasses", label: "Repasses a prestadores", hint: "labs e especialistas", value: closing.custoRepasses, ...pick(CONCEPTS.repasses) },
    ...(closing.custoProdutos > 0
      ? [{ key: "produtos" as const, label: "Custo de produtos", hint: "vendas antigas", value: closing.custoProdutos, ...pick(CONCEPTS.produtos) }]
      : []),
    { key: "compras", label: "Compras do almoxarifado", hint: "insumos", value: closing.custoCompras, ...pick(CONCEPTS.compras) },
    { key: "taxas", label: "Taxas de cartão", hint: "repassadas ao cliente", value: closing.taxasCartao, ...pick(CONCEPTS.taxas) },
  ];
  const clickable = (key: RowKey) => Boolean(onRowClick) && (key === "bruto" || key === "repasses" || key === "compras");
  const negative = closing.lucroLiquido < 0;

  return (
    <Panel
      title="Resultado"
      icon={Calculator}
      tone="emerald"
      description={`Mesma conta do Fechamento 50/50 · ${periodLabel}`}
      className={className}
    >
      <ul className="divide-y divide-border/60 px-2 py-1 text-sm">
        {rows.map((row) => {
          const deduction = row.key !== "bruto";
          const zero = Math.abs(row.value) < 0.005;
          const content = (
            <>
              <span className="flex min-w-0 items-center gap-2.5">
                <row.icon className={cn("h-4 w-4 shrink-0", zero ? "text-muted-foreground/50" : TONES[row.tone].text)} aria-hidden />
                <span className={cn("min-w-0", deduction ? "text-muted-foreground" : "font-semibold text-foreground")}>
                  {deduction ? "(−) " : ""}
                  {row.label}
                  {row.hint && <span className="ml-1.5 text-xs text-muted-foreground/80">{row.hint}</span>}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 tabular-nums",
                  deduction ? (zero ? "text-muted-foreground" : cn("font-semibold", TONES[row.tone].text)) : "font-bold text-foreground"
                )}
              >
                {deduction && !zero ? "− " : ""}
                {formatCurrencyBRL(Math.abs(row.value))}
              </span>
            </>
          );
          return (
            <li key={row.key}>
              {clickable(row.key) ? (
                <button
                  type="button"
                  onClick={() => onRowClick?.(row.key)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-center justify-between gap-3 px-2 py-2.5">{content}</div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="px-4 pb-4">
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl px-3 py-3",
            negative ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"
          )}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4" aria-hidden />
            = Lucro líquido real
            <span className="text-xs font-medium opacity-80">margem {closing.margemPct}%</span>
          </span>
          <span className={cn("text-lg font-bold tabular-nums", negative ? "text-rose-700" : "text-emerald-700")}>
            {negative ? "− " : ""}
            {formatCurrencyBRL(Math.abs(closing.lucroLiquido))}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SplitCard label={`${CLOSING_PARTNERS.clinic} · 50%`} value={closing.metadeClinica} icon={Stethoscope} tone="teal" />
          <SplitCard label={`${CLOSING_PARTNERS.agro} · 50%`} value={closing.metadeAgro} icon={Wheat} tone="amber" />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{footer ?? "Saídas operacionais não entram no 50/50."}</span>
          <Link to="/financial/monthly-closing" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
            Fechamento 50/50 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </Panel>
  );
}

function pick(concept: { icon: LucideIcon; tone: Tone }) {
  return { icon: concept.icon, tone: concept.tone };
}

function SplitCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: Tone }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5", TONES[tone].card)}>
      <div className="min-w-0">
        <p className={cn("text-[11px] font-semibold uppercase tracking-wide", TONES[tone].label)}>{label}</p>
        <p className={cn("mt-0.5 text-xl font-bold tabular-nums", TONES[tone].text)}>{formatCurrencyBRL(value)}</p>
      </div>
      <Icon className={cn("h-5 w-5 shrink-0 opacity-70", TONES[tone].text)} aria-hidden />
    </div>
  );
}
