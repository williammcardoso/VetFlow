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
const DARK = "#111827";
const GRAY = "#6B7280";
const AMBER = "#B45309";
const EMERALD = "#065F46";
const BORDER = "#E5E7EB";

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
    backgroundColor: "#ECFDF5",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
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
});

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface Props {
  data: MonthlyClosingBreakdown;
}

const MonthlyClosingPdfContent: React.FC<Props> = ({ data }) => {
  const company = mockCompanySettings;
  const generatedAt = new Date().toLocaleString("pt-BR");

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.company}>{company.name || "VetFlow"}</Text>
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
          <View style={s.row}>
            <Text style={[s.rowLabel, { color: EMERALD, fontWeight: 700 }]}>
              Lucro líquido real
            </Text>
            <Text style={[s.rowValue, s.rowPos, { fontSize: 13 }]}>
              {fmt(data.lucroLiquido)}
            </Text>
          </View>
          <Text style={{ fontSize: 8, color: GRAY, marginTop: 4 }}>
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

        <Text style={s.note}>
          Modelo 50/50: o lucro líquido real é dividido igualmente entre {CLOSING_PARTNERS.clinic} e{" "}
          {CLOSING_PARTNERS.agro}. Saídas operacionais (aluguel, luz, salários etc.) não entram neste
          cálculo. Documento gerado em {generatedAt}.
        </Text>

        <Text style={s.footer}>
          VetFlow · Fechamento 50/50 · {data.label}
        </Text>
      </Page>
    </Document>
  );
};

export default MonthlyClosingPdfContent;
