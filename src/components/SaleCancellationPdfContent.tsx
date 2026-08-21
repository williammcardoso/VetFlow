import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { mockCompanySettings, mockUserSettings } from "@/mockData/settings";
import type { FinancialTransaction } from "@/mockData/financial";
import type { SaleItem } from "@/lib/saleItemsApi";

Font.register({
  family: "Inter",
  fonts: [
    { src: "/fonts/Inter-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Inter-Bold.ttf", fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const RED = "#B91C1C";
const INK = "#1F2937";
const DARK = "#111827";
const GRAY = "#6B7280";
const LIGHT_GRAY = "#F5F6F7";
const WHITE = "#FFFFFF";
const BORDER = "#D8DDE2";
const SLATE = "#4B5563";

const s = StyleSheet.create({
  page: {
    padding: 48,
    paddingBottom: 64,
    fontFamily: "Inter",
    fontSize: 10,
    color: DARK,
    backgroundColor: WHITE,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  clinicName: { fontSize: 17, fontWeight: 700, color: DARK },
  clinicSub: { fontSize: 8.5, color: GRAY, marginTop: 3 },
  headerRight: { alignItems: "flex-end" },
  contactText: { fontSize: 8, color: GRAY, marginTop: 2, textAlign: "right" },
  ruleRed: { height: 2.5, backgroundColor: RED, marginTop: 10 },
  ruleLight: { height: 1, backgroundColor: BORDER, marginTop: 2, marginBottom: 18 },
  docMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  docTitle: { fontSize: 20, fontWeight: 700, color: RED, letterSpacing: 1 },
  docType: { fontSize: 9, color: SLATE, marginTop: 3 },
  docRef: { fontSize: 8.5, color: SLATE, textAlign: "right" },
  docDate: { fontSize: 8.5, color: SLATE, marginTop: 2, textAlign: "right" },
  infoRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  infoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 5,
    padding: 10,
    backgroundColor: LIGHT_GRAY,
  },
  infoLabel: { fontSize: 7.5, color: SLATE, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 },
  infoValue: { fontSize: 10.5, color: DARK, fontWeight: 700 },
  infoSub: { fontSize: 8, color: GRAY, marginTop: 2 },
  sectionLabel: {
    fontSize: 7.5,
    fontWeight: 700,
    color: RED,
    letterSpacing: 1,
    marginBottom: 6,
  },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: RED,
    paddingBottom: 5,
  },
  thItem: { flex: 1, fontSize: 7.5, fontWeight: 700, color: SLATE },
  thQty: { width: 28, textAlign: "center", fontSize: 7.5, fontWeight: 700, color: SLATE },
  thUnit: { width: 68, textAlign: "right", fontSize: 7.5, fontWeight: 700, color: SLATE },
  thSub: { width: 75, textAlign: "right", fontSize: 7.5, fontWeight: 700, color: SLATE },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tdItem: { flex: 1, fontSize: 9.5, color: DARK },
  tdQty: { width: 28, textAlign: "center", fontSize: 9.5, color: DARK },
  tdUnit: { width: 68, textAlign: "right", fontSize: 9.5, color: DARK },
  tdSub: { width: 75, textAlign: "right", fontSize: 9.5, color: DARK, fontWeight: 700 },
  totalsOuter: { alignItems: "flex-end", marginTop: 6, marginBottom: 16 },
  totalsInner: { width: 200 },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3.5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tlLabel: { fontSize: 8.5, color: GRAY },
  tlValue: { fontSize: 8.5, color: DARK, fontWeight: 700 },
  totalLineHighlight: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: INK,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: RED,
    marginTop: 3,
  },
  tlLabelHL: { fontSize: 11, color: WHITE, fontWeight: 700 },
  tlValueHL: { fontSize: 11, color: WHITE, fontWeight: 700 },
  reasonBox: {
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 5,
    padding: 10,
    marginBottom: 16,
    backgroundColor: "#FEF2F2",
  },
  reasonLabel: { fontSize: 7.5, fontWeight: 700, color: RED, marginBottom: 3 },
  reasonText: { fontSize: 9, color: DARK },
  sigRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  sigArea: { flex: 1, maxWidth: 260, alignItems: "center" },
  sigLine: { height: 1, backgroundColor: "#9AA3AE", width: "100%", marginTop: 32, marginBottom: 5 },
  sigName: { fontSize: 9, color: DARK, fontWeight: 700, textAlign: "center" },
  sigSub: { fontSize: 7.5, color: GRAY, textAlign: "center", marginTop: 2 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  footerText: { fontSize: 7, color: "#9CA3AF" },
});

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export interface SaleCancellationPdfContentProps {
  transaction: FinancialTransaction;
  items: SaleItem[];
  reversedAmount: number;
  clientName?: string;
  clientPhone?: string;
  animalName?: string;
}

const SaleCancellationPdfContent: React.FC<SaleCancellationPdfContentProps> = ({
  transaction,
  items,
  reversedAmount,
  clientName,
  clientPhone,
  animalName,
}) => {
  const company = mockCompanySettings;
  const user = mockUserSettings;

  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const originalSaleDate = new Date(
    `${transaction.date}T${transaction.time || "00:00"}`
  ).toLocaleString("pt-BR");
  const cancelledAt = transaction.cancelledAt
    ? new Date(transaction.cancelledAt).toLocaleString("pt-BR")
    : today;

  const itemsSubtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const discountAmount = transaction.discountAmount || 0;
  const surchargeAmount = transaction.surchargeAmount || 0;
  const operatorFee = transaction.financialFee || 0;
  const hasBreakdown = discountAmount > 0 || surchargeAmount > 0 || operatorFee > 0;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.clinicName}>{company.companyName}</Text>
            <Text style={s.clinicSub}>
              CRMV {company.crmv}  ·  MAPA {company.mapaRegistration}
            </Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.contactText}>{company.phone}  ·  {company.email}</Text>
            <Text style={s.contactText}>{company.address}  ·  {company.city}  ·  CEP {company.zipCode}</Text>
          </View>
        </View>
        <View style={s.ruleRed} />
        <View style={s.ruleLight} />

        <View style={s.docMeta}>
          <View>
            <Text style={s.docTitle}>COMPROVANTE DE ESTORNO</Text>
            <Text style={s.docType}>Emitido por {user.userName}  ·  CRMV {company.crmv}</Text>
          </View>
          <View>
            <Text style={s.docRef}>Ref. venda {transaction.id.slice(-8).toUpperCase()}</Text>
            <Text style={s.docDate}>Estornado em {cancelledAt}</Text>
          </View>
        </View>

        <View style={s.infoRow}>
          <View style={s.infoBox}>
            <Text style={s.infoLabel}>TUTOR / RESPONSAVEL</Text>
            <Text style={s.infoValue}>{clientName || "Nao informado"}</Text>
            {clientPhone && <Text style={s.infoSub}>Tel: {clientPhone}</Text>}
          </View>
          <View style={s.infoBox}>
            <Text style={s.infoLabel}>VENDA ORIGINAL</Text>
            <Text style={s.infoValue}>{fmt(transaction.amount)}</Text>
            <Text style={s.infoSub}>Realizada em {originalSaleDate}</Text>
            {animalName && <Text style={s.infoSub}>Paciente: {animalName}</Text>}
          </View>
        </View>

        {items.length > 0 && (
          <View style={{ marginBottom: 4 }}>
            <Text style={s.sectionLabel}>ITENS DA VENDA ORIGINAL</Text>
            <View style={s.tableHead}>
              <Text style={s.thItem}>Procedimento / Produto</Text>
              <Text style={s.thQty}>Qtd</Text>
              <Text style={s.thUnit}>Unit.</Text>
              <Text style={s.thSub}>Subtotal</Text>
            </View>
            {items.map((item, idx) => (
              <View
                key={item.id}
                style={[s.tableRow, idx % 2 === 1 ? { backgroundColor: LIGHT_GRAY } : {}]}
                wrap={false}
              >
                <Text style={s.tdItem}>{item.name}</Text>
                <Text style={s.tdQty}>{item.quantity}</Text>
                <Text style={s.tdUnit}>{fmt(item.unitPrice)}</Text>
                <Text style={s.tdSub}>{fmt(item.subtotal)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.totalsOuter}>
          <View style={s.totalsInner}>
            {hasBreakdown && (
              <>
                <View style={s.totalLine}>
                  <Text style={s.tlLabel}>Subtotal dos itens</Text>
                  <Text style={s.tlValue}>{fmt(itemsSubtotal)}</Text>
                </View>
                {discountAmount > 0 && (
                  <View style={s.totalLine}>
                    <Text style={s.tlLabel}>Desconto</Text>
                    <Text style={s.tlValue}>- {fmt(discountAmount)}</Text>
                  </View>
                )}
                {surchargeAmount > 0 && (
                  <View style={s.totalLine}>
                    <Text style={s.tlLabel}>Acrescimo</Text>
                    <Text style={s.tlValue}>+ {fmt(surchargeAmount)}</Text>
                  </View>
                )}
                {operatorFee > 0 && (
                  <View style={s.totalLine}>
                    <Text style={s.tlLabel}>Taxa de operadora</Text>
                    <Text style={s.tlValue}>+ {fmt(operatorFee)}</Text>
                  </View>
                )}
              </>
            )}
            <View style={s.totalLine}>
              <Text style={s.tlLabel}>Valor total da venda original</Text>
              <Text style={s.tlValue}>{fmt(transaction.amount)}</Text>
            </View>
            <View style={s.totalLine}>
              <Text style={s.tlLabel}>Valor que havia sido recebido</Text>
              <Text style={s.tlValue}>{fmt(reversedAmount)}</Text>
            </View>
            <View style={s.totalLineHighlight}>
              <Text style={s.tlLabelHL}>VALOR ESTORNADO</Text>
              <Text style={s.tlValueHL}>{fmt(reversedAmount)}</Text>
            </View>
          </View>
        </View>

        <View style={s.reasonBox}>
          <Text style={s.reasonLabel}>MOTIVO DO CANCELAMENTO</Text>
          <Text style={s.reasonText}>{transaction.cancelReason || "Nao informado"}</Text>
        </View>

        <View style={s.sigRow}>
          <View style={s.sigArea}>
            <View style={s.sigLine} />
            <Text style={s.sigName}>{user.userName}</Text>
            <Text style={s.sigSub}>CRMV {company.crmv} · Responsavel pelo estorno</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{company.companyName}</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages} — Emitido em ${today}`}
          />
        </View>
      </Page>
    </Document>
  );
};

export default SaleCancellationPdfContent;
