import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { mockCompanySettings } from "@/mockData/settings";
import { formatPhoneBR } from "@/lib/utils";
import { classifyTransaction } from "@/lib/financialTransactionDisplay";
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

const formatDateBR = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
};

const movementColor = (label: string) => {
  if (label === "Estorno") return RED;
  if (label === "Compra" || label === "Saída") return AMBER;
  if (label === "Recebimento") return EMERALD;
  return TEAL;
};

const styles = StyleSheet.create({
  page: {
    padding: 48,
    paddingBottom: 64,
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
  kpiValue: { fontSize: 11, fontWeight: 700, color: DARK },

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

  section: { marginTop: 8, marginBottom: 2 },
  sectionLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: TEAL,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  emptyNote: { fontSize: 8.5, color: GRAY, paddingVertical: 5 },

  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: TEAL,
    paddingBottom: 3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    alignItems: "center",
  },

  // Repasses por prestador
  thProvider: { flex: 1, fontSize: 7, fontWeight: 700, color: SLATE },
  thAmount: { width: 80, textAlign: "right", fontSize: 7, fontWeight: 700, color: SLATE },
  thPct: { width: 50, textAlign: "right", fontSize: 7, fontWeight: 700, color: SLATE },
  tdProvider: { flex: 1, fontSize: 8.5, color: DARK, fontWeight: 700 },
  tdAmount: { width: 80, textAlign: "right", fontSize: 8.5, color: AMBER, fontWeight: 700 },
  tdPct: { width: 50, textAlign: "right", fontSize: 8.5, color: GRAY },

  // Detalhamento por paciente
  thDate: { width: 62, fontSize: 6.5, fontWeight: 700, color: SLATE },
  thPatient: { flex: 1.1, fontSize: 6.5, fontWeight: 700, color: SLATE },
  thClient: { flex: 1, fontSize: 6.5, fontWeight: 700, color: SLATE },
  thService: { flex: 1.2, fontSize: 6.5, fontWeight: 700, color: SLATE },
  thProviderName: { flex: 0.9, fontSize: 6.5, fontWeight: 700, color: SLATE },
  thRepasse: { width: 64, textAlign: "right", fontSize: 6.5, fontWeight: 700, color: SLATE },
  tdDate: { width: 62, fontSize: 7.3, color: GRAY },
  tdPatient: { flex: 1.1, fontSize: 7.5, color: DARK, fontWeight: 700 },
  tdClient: { flex: 1, fontSize: 7.3, color: SLATE },
  tdService: { flex: 1.2, fontSize: 7.3, color: DARK },
  tdProviderName: { flex: 0.9, fontSize: 7.3, color: SLATE },
  tdRepasse: { width: 64, textAlign: "right", fontSize: 7.5, color: AMBER, fontWeight: 700 },

  // Movimentos
  thMovDate: { width: 78, fontSize: 7, fontWeight: 700, color: SLATE },
  thMovDesc: { flex: 1, fontSize: 7, fontWeight: 700, color: SLATE },
  thMovCat: { width: 90, fontSize: 7, fontWeight: 700, color: SLATE },
  thMovValue: { width: 80, textAlign: "right", fontSize: 7, fontWeight: 700, color: SLATE },
  tdMovDate: { width: 78, fontSize: 8, color: DARK },
  tdMovDesc: { flex: 1, fontSize: 8, color: DARK },
  tdMovCat: { width: 90, fontSize: 7.5, color: SLATE },
  tdMovValue: { width: 80, textAlign: "right", fontSize: 8, fontWeight: 700 },

  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  footerText: { fontSize: 7, color: "#9CA3AF" },
});

export interface RepasseProviderRow {
  provider: string;
  amount: number;
}

export interface RepasseDetalhadoRow {
  date: string;
  time?: string;
  animalName: string;
  patientCode?: number | string;
  clientName: string;
  serviceName: string;
  quantity: number;
  provider: string;
  amount: number;
}

export interface FinancialReportPdfContentProps {
  periodLabel: string;
  faturamento: number;
  recebido: number;
  totalRepasses: number;
  totalTaxas: number;
  lucroReal: number;
  margemReal: number;
  liquidoReal: number;
  margemLiquida: number;
  comprasAlmoxarifado: number;
  saidas: number;
  totalEmAberto: number;
  providerFilterLabel?: string;
  repassesPorPrestador: RepasseProviderRow[];
  repassesDetalhados: RepasseDetalhadoRow[];
  movimentos: FinancialTransaction[];
}

const FinancialReportPdfContent: React.FC<FinancialReportPdfContentProps> = ({
  periodLabel,
  faturamento,
  recebido,
  totalRepasses,
  totalTaxas,
  lucroReal,
  margemReal,
  liquidoReal,
  margemLiquida,
  comprasAlmoxarifado,
  saidas,
  totalEmAberto,
  providerFilterLabel,
  repassesPorPrestador,
  repassesDetalhados,
  movimentos,
}) => {
  const company = mockCompanySettings;
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const totalRepassesFiltrado = repassesDetalhados.reduce((s, r) => s + r.amount, 0);

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
            <Text style={styles.docTitle}>RELATÓRIO FINANCEIRO</Text>
            <Text style={styles.docType}>{periodLabel}</Text>
          </View>
          <Text style={styles.docDate}>Emitido em {today}</Text>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>FATURAMENTO</Text>
            <Text style={styles.kpiValue}>{fmt(faturamento)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>RECEBIDO</Text>
            <Text style={styles.kpiValue}>{fmt(recebido)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>REPASSES</Text>
            <Text style={[styles.kpiValue, { color: AMBER }]}>{fmt(totalRepasses)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>TAXAS OPERADORA</Text>
            <Text style={[styles.kpiValue, { color: AMBER }]}>{fmt(totalTaxas)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>ALMOXARIFADO</Text>
            <Text style={[styles.kpiValue, { color: AMBER }]}>{fmt(comprasAlmoxarifado)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>LUCRO REAL</Text>
            <Text style={[styles.kpiValue, { color: EMERALD }]}>{fmt(lucroReal)} ({margemReal}%)</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>SAÍDAS OPERACIONAIS</Text>
            <Text style={[styles.kpiValue, { color: RED }]}>{fmt(saidas)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>A RECEBER (GERAL)</Text>
            <Text style={styles.kpiValue}>{fmt(totalEmAberto)}</Text>
          </View>
        </View>

        <View style={styles.highlight}>
          <View>
            <Text style={styles.highlightLabel}>LUCRO LÍQUIDO REAL</Text>
            <Text style={styles.highlightSub}>Faturamento − repasses − compras do almoxarifado − taxas de operadora</Text>
          </View>
          <Text style={styles.highlightValue}>{fmt(liquidoReal)} ({margemLiquida}%)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>REPASSES POR PRESTADOR</Text>
          {repassesPorPrestador.length === 0 ? (
            <Text style={styles.emptyNote}>Nenhum repasse no período.</Text>
          ) : (
            <>
              <View style={styles.tableHead}>
                <Text style={styles.thProvider}>Prestador</Text>
                <Text style={styles.thAmount}>Valor</Text>
                <Text style={styles.thPct}>%</Text>
              </View>
              {repassesPorPrestador.map((r, idx) => (
                <View key={r.provider} style={[styles.tableRow, idx % 2 === 1 ? { backgroundColor: LIGHT_GRAY } : {}]} wrap={false}>
                  <Text style={styles.tdProvider}>{r.provider}</Text>
                  <Text style={styles.tdAmount}>{fmt(r.amount)}</Text>
                  <Text style={styles.tdPct}>{totalRepasses > 0 ? Math.round((r.amount / totalRepasses) * 100) : 0}%</Text>
                </View>
              ))}
              <View style={[styles.tableRow, { backgroundColor: LIGHT_GRAY, borderBottomWidth: 0 }]}>
                <Text style={[styles.tdProvider, { fontWeight: 700 }]}>Total</Text>
                <Text style={styles.tdAmount}>{fmt(totalRepasses)}</Text>
                <Text style={styles.tdPct}>100%</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            DETALHAMENTO POR PACIENTE{providerFilterLabel ? ` · ${providerFilterLabel}` : ""}
          </Text>
          {repassesDetalhados.length === 0 ? (
            <Text style={styles.emptyNote}>
              Nenhum paciente com repasse no período{providerFilterLabel ? " para este prestador" : ""}.
            </Text>
          ) : (
            <>
              <View style={styles.tableHead}>
                <Text style={styles.thDate}>Data</Text>
                <Text style={styles.thPatient}>Paciente</Text>
                <Text style={styles.thClient}>Tutor</Text>
                <Text style={styles.thService}>Serviço</Text>
                <Text style={styles.thProviderName}>Prestador</Text>
                <Text style={styles.thRepasse}>Repasse</Text>
              </View>
              {repassesDetalhados.map((r, idx) => (
                <View key={`${r.date}-${idx}`} style={[styles.tableRow, idx % 2 === 1 ? { backgroundColor: LIGHT_GRAY } : {}]} wrap={false}>
                  <Text style={styles.tdDate}>{formatDateBR(r.date)}</Text>
                  <Text style={styles.tdPatient}>{r.animalName}{r.patientCode != null ? ` #${r.patientCode}` : ""}</Text>
                  <Text style={styles.tdClient}>{r.clientName}</Text>
                  <Text style={styles.tdService}>{r.serviceName}{r.quantity > 1 ? ` ×${r.quantity}` : ""}</Text>
                  <Text style={styles.tdProviderName}>{r.provider}</Text>
                  <Text style={styles.tdRepasse}>{fmt(r.amount)}</Text>
                </View>
              ))}
              <View style={[styles.tableRow, { backgroundColor: LIGHT_GRAY, borderBottomWidth: 0 }]}>
                <Text style={[styles.tdPatient, { flex: 1 }]}>
                  Total ({repassesDetalhados.length} {repassesDetalhados.length === 1 ? "item" : "itens"})
                </Text>
                <Text style={styles.tdRepasse}>{fmt(totalRepassesFiltrado)}</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MOVIMENTOS DO PERÍODO</Text>
          {movimentos.length === 0 ? (
            <Text style={styles.emptyNote}>Sem dados no período.</Text>
          ) : (
            <>
              <View style={styles.tableHead}>
                <Text style={styles.thMovDate}>Data</Text>
                <Text style={styles.thMovDesc}>Descrição</Text>
                <Text style={styles.thMovCat}>Categoria</Text>
                <Text style={styles.thMovValue}>Valor</Text>
              </View>
              {movimentos.map((m, idx) => {
                const kind = classifyTransaction(m);
                const color = movementColor(kind.label);
                return (
                  <View key={m.id} style={[styles.tableRow, idx % 2 === 1 ? { backgroundColor: LIGHT_GRAY } : {}]} wrap={false}>
                    <Text style={styles.tdMovDate}>{formatDateBR(m.date)}{m.time ? `  ${m.time}` : ""}</Text>
                    <Text style={styles.tdMovDesc}>{m.description}</Text>
                    <Text style={styles.tdMovCat}>{m.category}</Text>
                    <Text style={[styles.tdMovValue, { color }]}>
                      {kind.signal}{fmt(Math.abs(m.amount))}
                    </Text>
                  </View>
                );
              })}
            </>
          )}
        </View>

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

export default FinancialReportPdfContent;
