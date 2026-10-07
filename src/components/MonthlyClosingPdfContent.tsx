import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { MonthlyClosingBreakdown } from "@/lib/monthlyClosing";
import { CLOSING_PARTNERS } from "@/lib/monthlyClosing";
import { mockCompanySettings } from "@/mockData/settings";

Font.register({
  family: "Inter",
  fonts: [
    { src: "/fonts/Inter-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Inter-Bold.ttf", fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const TEAL = "#0F766E";
const INK = "#1F2937";
const DARK = "#111827";
const GRAY = "#6B7280";
const WHITE = "#FFFFFF";
const AMBER = "#B45309";
const EMERALD = "#065F46";
const BORDER = "#D8DDE2";

const s = StyleSheet.create({
  page: { padding: 48, paddingBottom: 56, fontFamily: "Inter", fontSize: 10, color: DARK },
  header: { marginBottom: 18, borderBottomWidth: 2, borderBottomColor: TEAL, paddingBottom: 10 },
  company: { fontSize: 11, fontWeight: 700, color: TEAL },
  title: { fontSize: 18, fontWeight: 700, marginTop: 6 },
  subtitle: { fontSize: 10, color: GRAY, marginTop: 3 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: TEAL, marginBottom: 8, textTransform: "uppercase" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  rowLabel: { color: GRAY, fontSize: 10 },
  rowValue: { fontWeight: 700, fontSize: 10 },
  rowNeg: { color: AMBER },
  rowPos: { color: EMERALD },
  highlight: {
    marginTop: 14,
    padding: 12,
    backgroundColor: INK,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: EMERALD,
  },
  splitRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  splitCard: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
  },
  splitLabel: { fontSize: 9, color: GRAY, textTransform: "uppercase", fontWeight: 700 },
  splitValue: { fontSize: 14, fontWeight: 700, marginTop: 4, color: TEAL },
  note: { marginTop: 16, fontSize: 8, color: GRAY, lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 28, left: 48, right: 48, fontSize: 8, color: GRAY },
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#9CA3AF", paddingBottom: 4, marginBottom: 2 },
  thText: { fontSize: 8, fontWeight: 700, color: GRAY, textTransform: "uppercase" },
  tr: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  cItem: { width: "62%", fontSize: 9.5 },
  cQty: { width: "13%", fontSize: 9.5, fontWeight: 700, textAlign: "right" },
  cValue: { width: "25%", fontSize: 9.5, fontWeight: 700, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 2, borderTopColor: TEAL, paddingTop: 6, marginTop: 6 },
});

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

/** Linha do anexo "Vendas por item" (o que foi vendido no mês). */
export interface ClosingItemRow {
  name: string;
  quantity: number;
  total: number;
}

/** Acréscimo fora do 50/50 (vai direto para uma das partes). */
export interface ClosingExtraRow {
  description: string;
  amount: number;
  beneficiary: "clinic" | "agro";
}

interface Props {
  data: MonthlyClosingBreakdown;
  /** Anexo com os itens vendidos no mês — página extra no fim. */
  items?: ClosingItemRow[];
  /** Acréscimos fora do 50/50 — somam na parte de quem recebe. */
  extras?: ClosingExtraRow[];
}

const qty = (q: number) => (Number.isInteger(q) ? String(q) : q.toLocaleString("pt-BR"));

const MonthlyClosingPdfContent: React.FC<Props> = ({ data, items, extras }) => {
  const company = mockCompanySettings;
  const generatedAt = new Date().toLocaleString("pt-BR");
  const extraClinic = (extras ?? []).filter((e) => e.beneficiary === "clinic").reduce((t, e) => t + e.amount, 0);
  const extraAgro = (extras ?? []).filter((e) => e.beneficiary === "agro").reduce((t, e) => t + e.amount, 0);
  const hasExtras = (extras ?? []).length > 0;
  const partnerName = (b: "clinic" | "agro") => (b === "clinic" ? CLOSING_PARTNERS.clinic : CLOSING_PARTNERS.agro);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.company}>{company.companyName}</Text>
          <Text style={s.title}>Fechamento Mensal 50/50</Text>
          <Text style={s.subtitle}>{data.label} · {data.salesCount} venda(s)</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Composição do resultado</Text>
          <View style={s.row}>
            <Text style={s.rowLabel}>Faturamento bruto</Text>
            <Text style={s.rowValue}>{fmt(data.bruto)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>(−) Compras de estoque (Almoxarifado)</Text>
            <Text style={[s.rowValue, s.rowNeg]}>{fmt(data.custoCompras)}</Text>
          </View>
          {data.custoProdutos > 0 && (
            <View style={s.row}>
              <Text style={s.rowLabel}>(−) Custo de produtos (venda antiga)</Text>
              <Text style={[s.rowValue, s.rowNeg]}>{fmt(data.custoProdutos)}</Text>
            </View>
          )}
          <View style={s.row}>
            <Text style={s.rowLabel}>(−) Repasses (labs / especialistas)</Text>
            <Text style={[s.rowValue, s.rowNeg]}>{fmt(data.custoRepasses)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>(−) Taxas de cartão / operadora</Text>
            <Text style={[s.rowValue, s.rowNeg]}>{fmt(data.taxasCartao)}</Text>
          </View>
        </View>

        <View style={s.highlight}>
          <View style={[s.row, { borderBottomColor: "#374151" }]}>
            <Text style={[s.rowLabel, { color: WHITE, fontWeight: 700 }]}>
              Lucro líquido real
            </Text>
            <Text style={[s.rowValue, { color: WHITE, fontSize: 13 }]}>
              {fmt(data.lucroLiquido)}
            </Text>
          </View>
          <Text style={{ fontSize: 8, color: "#D1D5DB", marginTop: 4 }}>
            Margem: {data.margemPct}% sobre o faturamento bruto
          </Text>
        </View>

        <View style={s.splitRow}>
          <View style={s.splitCard}>
            <Text style={s.splitLabel}>{CLOSING_PARTNERS.clinic} (50%)</Text>
            <Text style={s.splitValue}>{fmt(data.metadeClinica)}</Text>
          </View>
          <View style={s.splitCard}>
            <Text style={s.splitLabel}>{CLOSING_PARTNERS.agro} (50%)</Text>
            <Text style={s.splitValue}>{fmt(data.metadeAgro)}</Text>
          </View>
        </View>

        {hasExtras && (
          <View style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>Acréscimos fora do 50/50</Text>
            {(extras ?? []).map((e, i) => (
              <View key={i} style={s.row}>
                <Text style={s.rowLabel}>
                  {e.description} — {partnerName(e.beneficiary)}
                </Text>
                <Text style={[s.rowValue, s.rowPos]}>+ {fmt(e.amount)}</Text>
              </View>
            ))}
            <Text style={[s.sectionTitle, { marginTop: 14 }]}>Total a receber</Text>
            <View style={s.splitRow}>
              <View style={s.splitCard}>
                <Text style={s.splitLabel}>{CLOSING_PARTNERS.clinic}</Text>
                <Text style={s.splitValue}>{fmt(data.metadeClinica + extraClinic)}</Text>
                <Text style={{ fontSize: 8, color: GRAY, marginTop: 3 }}>
                  50% {fmt(data.metadeClinica)}
                  {extraClinic > 0 ? ` + acréscimos ${fmt(extraClinic)}` : ""}
                </Text>
              </View>
              <View style={s.splitCard}>
                <Text style={s.splitLabel}>{CLOSING_PARTNERS.agro}</Text>
                <Text style={s.splitValue}>{fmt(data.metadeAgro + extraAgro)}</Text>
                <Text style={{ fontSize: 8, color: GRAY, marginTop: 3 }}>
                  50% {fmt(data.metadeAgro)}
                  {extraAgro > 0 ? ` + acréscimos ${fmt(extraAgro)}` : ""}
                </Text>
              </View>
            </View>
          </View>
        )}

        <Text style={s.note}>
          Modelo 50/50: o lucro líquido real é dividido igualmente entre {CLOSING_PARTNERS.clinic} e{" "}
          {CLOSING_PARTNERS.agro}. Saídas operacionais (aluguel, luz, salários etc.) não entram neste
          cálculo. Documento gerado em {generatedAt}.
        </Text>

        <Text
          style={s.footer}
          render={({ pageNumber, totalPages }) =>
            `${company.companyName} · Fechamento 50/50 · ${data.label} · Página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>

      {items && items.length > 0 && (
        <Page size="A4" style={s.page} wrap>
          <View style={s.header}>
            <Text style={s.company}>{company.companyName}</Text>
            <Text style={s.title}>Anexo — Vendas por item</Text>
            <Text style={s.subtitle}>
              {data.label} · {qty(items.reduce((t, i) => t + i.quantity, 0))} itens · {items.length} tipos
            </Text>
          </View>
          <View style={s.th} fixed>
            <Text style={[s.thText, { width: "62%" }]}>Item</Text>
            <Text style={[s.thText, { width: "13%", textAlign: "right" }]}>Qtd</Text>
            <Text style={[s.thText, { width: "25%", textAlign: "right" }]}>Valor</Text>
          </View>
          {items.map((it, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={s.cItem}>{it.name}</Text>
              <Text style={s.cQty}>{qty(it.quantity)}×</Text>
              <Text style={s.cValue}>{fmt(it.total)}</Text>
            </View>
          ))}
          <View style={s.totalRow} wrap={false}>
            <Text style={{ fontSize: 11, fontWeight: 700 }}>Total dos itens</Text>
            <Text style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>{fmt(items.reduce((t, i) => t + i.total, 0))}</Text>
          </View>
          <Text style={s.note}>
            Valor de cada item pelo preço de venda (antes de desconto/acréscimo da venda). O faturamento do fechamento
            usa o valor final de cada venda.
          </Text>
          <Text
            style={s.footer}
            render={({ pageNumber, totalPages }) =>
              `${company.companyName} · Fechamento 50/50 · ${data.label} · Página ${pageNumber} de ${totalPages}`
            }
            fixed
          />
        </Page>
      )}
    </Document>
  );
};

export default MonthlyClosingPdfContent;
