import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { mockCompanySettings } from "@/mockData/settings";
import { formatPhoneBR } from "@/lib/utils";
import type { FinancialTransaction } from "@/mockData/financial";

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
const LIGHT_GRAY = "#F5F6F7";
const WHITE = "#FFFFFF";
const BORDER = "#D8DDE2";
const SLATE = "#4B5563";
const AMBER = "#B45309";
const RED = "#B91C1C";
const EMERALD = "#065F46";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const styles = StyleSheet.create({
  page: {
    padding: 36,
    paddingBottom: 46,
    fontFamily: "Inter",
    fontSize: 9.5,
    color: DARK,
    backgroundColor: WHITE,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  clinicName: { fontSize: 15, fontWeight: 700, color: DARK },
  clinicSub: { fontSize: 8, color: GRAY, marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  contactText: { fontSize: 7.5, color: GRAY, marginTop: 1, textAlign: "right" },

  ruleTeal: { height: 2, backgroundColor: TEAL, marginTop: 6 },
  ruleLight: { height: 1, backgroundColor: BORDER, marginTop: 2, marginBottom: 8 },

  docMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  docTitle: { fontSize: 16, fontWeight: 700, color: TEAL, letterSpacing: 0.8 },
  docType: { fontSize: 8.5, color: SLATE, marginTop: 2 },
  docDate: { fontSize: 8, color: SLATE, textAlign: "right" },

  kpiRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  kpiCard: {
    flexBasis: "23%",
    flexGrow: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: LIGHT_GRAY,
  },
  kpiLabel: { fontSize: 6.5, color: SLATE, fontWeight: 700, letterSpacing: 0.3, marginBottom: 2 },
  kpiValue: { fontSize: 11.5, fontWeight: 700, color: DARK },

  highlight: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: INK,
  },
  highlightLabel: { fontSize: 8.5, fontWeight: 700, color: WHITE, letterSpacing: 0.6 },
  highlightSub: { fontSize: 7, color: "#D1D5DB", marginTop: 1 },
  highlightValue: { fontSize: 14, fontWeight: 700, color: WHITE },

  sectionLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: TEAL,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: TEAL,
    paddingBottom: 3,
  },
  thDate: { width: 78, fontSize: 7, fontWeight: 700, color: SLATE },
  thDesc: { flex: 1, fontSize: 7, fontWeight: 700, color: SLATE },
  thCat: { width: 90, fontSize: 7, fontWeight: 700, color: SLATE },
  thValue: { width: 80, textAlign: "right", fontSize: 7, fontWeight: 700, color: SLATE },
  thType: { width: 56, textAlign: "right", fontSize: 7, fontWeight: 700, color: SLATE },

  tableRow: {
    flexDirection: "row",
    paddingVertical: 3.5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    alignItems: "center",
  },
  tdDate: { width: 78, fontSize: 8, color: DARK },
  tdDesc: { flex: 1, fontSize: 8, color: DARK },
  tdCat: { width: 90, fontSize: 7.5, color: SLATE },
  tdValue: { width: 80, textAlign: "right", fontSize: 8, color: DARK, fontWeight: 700 },
  tdType: { width: 56, textAlign: "right", fontSize: 7.5, fontWeight: 700 },

  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  footerText: { fontSize: 7, color: "#9CA3AF" },
});

export interface FinancialOverviewTransactionRow {
  date: string;
  time?: string;
  description: string;
  category?: string;
  amount: number;
  type: FinancialTransaction["type"];
}

export interface FinancialOverviewPdfContentProps {
  periodLabel: string;
  totalFaturado: number;
  totalRecebido: number;
  totalEmAberto: number;
  ticketMedio: number;
  percentRecebido: number;
  totalRepasses: number;
  totalCompras: number;
  lucroReal: number;
  margemReal: number;
  situacao: string;
  lastTransactions: FinancialOverviewTransactionRow[];
}

const formatDateBR = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
};

const situacaoColor = (situacao: string) => {
  if (situacao === "Pendências") return RED;
  if (situacao === "Atenção") return AMBER;
  return EMERALD;
};

const FinancialOverviewPdfContent: React.FC<FinancialOverviewPdfContentProps> = ({
  periodLabel,
  totalFaturado,
  totalRecebido,
  totalEmAberto,
  ticketMedio,
  percentRecebido,
  totalRepasses,
  totalCompras,
  lucroReal,
  margemReal,
  situacao,
  lastTransactions,
}) => {
  const company = mockCompanySettings;
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View>
            <Text style={styles.clinicName}>{company.companyName}</Text>
            <Text style={styles.clinicSub}>
              CRMV {company.crmv}  ·  MAPA {company.mapaRegistration}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.contactText}>{formatPhoneBR(company.phone) || company.phone}  ·  {company.email}</Text>
            <Text style={styles.contactText}>
              {company.address}  ·  {company.city}  ·  CEP {company.zipCode}
            </Text>
          </View>
        </View>
        <View style={styles.ruleTeal} />
        <View style={styles.ruleLight} />

        <View style={styles.docMeta}>
          <View>
            <Text style={styles.docTitle}>VISÃO GERAL FINANCEIRA</Text>
            <Text style={styles.docType}>{periodLabel}</Text>
          </View>
          <Text style={styles.docDate}>Emitido em {today}</Text>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>TOTAL FATURADO</Text>
            <Text style={styles.kpiValue}>{fmt(totalFaturado)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>TOTAL RECEBIDO</Text>
            <Text style={styles.kpiValue}>{fmt(totalRecebido)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>EM ABERTO</Text>
            <Text style={[styles.kpiValue, totalEmAberto > 0 ? { color: RED } : {}]}>{fmt(totalEmAberto)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>% RECEBIDO</Text>
            <Text style={styles.kpiValue}>{percentRecebido}%</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>TICKET MÉDIO</Text>
            <Text style={styles.kpiValue}>{fmt(ticketMedio)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>REPASSES (PRESTADOR)</Text>
            <Text style={[styles.kpiValue, { color: AMBER }]}>{fmt(totalRepasses)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>COMPRAS (ESTOQUE)</Text>
            <Text style={[styles.kpiValue, { color: AMBER }]}>{fmt(totalCompras)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>SITUAÇÃO</Text>
            <Text style={[styles.kpiValue, { color: situacaoColor(situacao), fontSize: 11 }]}>{situacao}</Text>
          </View>
        </View>

        <View style={styles.highlight}>
          <View>
            <Text style={styles.highlightLabel}>LUCRO REAL DO PERÍODO</Text>
            <Text style={styles.highlightSub}>Faturado − repasses − compras − taxas de operadora</Text>
          </View>
          <Text style={styles.highlightValue}>{fmt(lucroReal)} ({margemReal}%)</Text>
        </View>

        <Text style={styles.sectionLabel}>ÚLTIMAS TRANSAÇÕES ({lastTransactions.length})</Text>
        <View style={styles.tableHead}>
          <Text style={styles.thDate}>Data</Text>
          <Text style={styles.thDesc}>Descrição</Text>
          <Text style={styles.thCat}>Categoria</Text>
          <Text style={styles.thValue}>Valor</Text>
          <Text style={styles.thType}>Tipo</Text>
        </View>
        {lastTransactions.length === 0 ? (
          <Text style={{ fontSize: 9, color: GRAY, paddingVertical: 10 }}>Sem dados no período.</Text>
        ) : (
          lastTransactions.map((t, idx) => (
            <View
              key={`${t.date}-${idx}`}
              style={[styles.tableRow, idx % 2 === 1 ? { backgroundColor: LIGHT_GRAY } : {}]}
              wrap={false}
            >
              <Text style={styles.tdDate}>{formatDateBR(t.date)}{t.time ? `  ${t.time}` : ""}</Text>
              <Text style={styles.tdDesc}>{t.description}</Text>
              <Text style={styles.tdCat}>{t.category || "-"}</Text>
              <Text style={styles.tdValue}>{fmt(t.amount)}</Text>
              <Text style={[styles.tdType, { color: t.type === "income" ? EMERALD : RED }]}>
                {t.type === "income" ? "Entrada" : "Saída"}
              </Text>
            </View>
          ))
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{company.companyName} — Documento gerado pelo sistema</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages} — Emitido em ${today}`}
          />
        </View>
      </Page>
    </Document>
  );
};

export default FinancialOverviewPdfContent;
