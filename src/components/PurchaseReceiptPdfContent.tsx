import React from "react";
import { Document, Page, StyleSheet, Text, View, Font } from "@react-pdf/renderer";
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
const LIGHT_GRAY = "#F5F6F7";
const WHITE = "#FFFFFF";
const BORDER = "#D8DDE2";
const SLATE = "#4B5563";
const AMBER = "#B45309";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatDateBR = (iso?: string) => {
  if (!iso) return "-";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
};

const styles = StyleSheet.create({
  page: {
    padding: 34,
    paddingBottom: 44,
    fontFamily: "Inter",
    fontSize: 9.5,
    color: DARK,
    backgroundColor: WHITE,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 5,
  },
  clinicName: { fontSize: 15, fontWeight: 700, color: DARK },
  clinicSub: { fontSize: 8, color: GRAY, marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  contactText: { fontSize: 7.5, color: GRAY, marginTop: 1, textAlign: "right" },

  ruleTeal: { height: 2, backgroundColor: TEAL, marginTop: 6 },
  ruleLight: { height: 1, backgroundColor: BORDER, marginTop: 2, marginBottom: 12 },

  docMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  docTitle: { fontSize: 15, fontWeight: 700, color: TEAL, letterSpacing: 0.8 },
  docSub: { fontSize: 8, color: SLATE, marginTop: 3 },
  docRef: { fontSize: 8.5, color: SLATE, textAlign: "right" },

  // Faixa de destaque: data e fornecedor, os 2 dados mais importantes pra
  // identificar rapidamente qual pedido de baixa é esse.
  highlightRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: TEAL,
    borderRadius: 5,
    backgroundColor: "#ECFDF5",
    marginBottom: 14,
    overflow: "hidden",
  },
  highlightCell: { flex: 1, paddingVertical: 8, paddingHorizontal: 10 },
  highlightDivider: { width: 1, backgroundColor: "#A7D9CE" },
  highlightLabel: { fontSize: 7, color: TEAL, fontWeight: 700, letterSpacing: 0.6, marginBottom: 2 },
  highlightValue: { fontSize: 13, color: DARK, fontWeight: 700 },

  sectionLabel: {
    fontSize: 7.5,
    fontWeight: 700,
    color: TEAL,
    letterSpacing: 1,
    marginBottom: 6,
  },

  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: TEAL,
    paddingBottom: 5,
  },
  thItem: { flex: 1, fontSize: 7.5, fontWeight: 700, color: SLATE },
  thQty: { width: 55, textAlign: "center", fontSize: 7.5, fontWeight: 700, color: SLATE },
  thUnit: { width: 75, textAlign: "right", fontSize: 7.5, fontWeight: 700, color: SLATE },
  thSub: { width: 80, textAlign: "right", fontSize: 7.5, fontWeight: 700, color: SLATE },

  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    alignItems: "center",
  },
  tdItem: { flex: 1, fontSize: 9.5, color: DARK },
  tdQty: { width: 55, textAlign: "center", fontSize: 9.5, color: DARK },
  tdUnit: { width: 75, textAlign: "right", fontSize: 9.5, color: DARK },
  tdSub: { width: 80, textAlign: "right", fontSize: 9.5, color: DARK, fontWeight: 700 },

  installmentsSection: { marginTop: 14 },
  thInstLabel: { flex: 1, fontSize: 7.5, fontWeight: 700, color: SLATE },
  thInstDate: { width: 100, textAlign: "center", fontSize: 7.5, fontWeight: 700, color: SLATE },
  thInstAmount: { width: 90, textAlign: "right", fontSize: 7.5, fontWeight: 700, color: SLATE },
  tdInstLabel: { flex: 1, fontSize: 9.5, color: DARK },
  tdInstDate: { width: 100, textAlign: "center", fontSize: 9.5, color: DARK },
  tdInstAmount: { width: 90, textAlign: "right", fontSize: 9.5, color: DARK, fontWeight: 700 },

  fallbackNote: {
    fontSize: 7.5,
    color: AMBER,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 4,
    padding: 6,
    marginTop: 8,
  },

  totalsOuter: { alignItems: "flex-end", marginTop: 10 },
  totalsInner: { width: 200 },
  totalLineHighlight: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: INK,
    borderRadius: 4,
  },
  tlLabelHL: { fontSize: 9.5, color: WHITE, fontWeight: 700 },
  tlValueHL: { fontSize: 12, color: WHITE, fontWeight: 700 },

  footer: {
    position: "absolute",
    bottom: 16,
    left: 34,
    right: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  footerText: { fontSize: 6.5, color: "#9CA3AF" },
});

export interface PurchaseReceiptLineItem {
  name: string;
  quantity?: number;
  unitCost?: number;
  subtotal?: number;
}

export interface PurchaseReceiptInstallment {
  label: string;
  date: string;
  amount: number;
}

export interface PurchaseReceiptPurchase {
  id: string;
  date: string;
  time?: string;
  supplier?: string;
  items: PurchaseReceiptLineItem[];
  total: number;
  /** false = compra antiga sem itens estruturados — só nome/qtd, sem custo por item. */
  itemized: boolean;
  /** presente só quando a compra foi parcelada (mais de 1 vencimento). */
  installments?: PurchaseReceiptInstallment[];
}

export default function PurchaseReceiptPdfContent({
  purchases,
}: {
  purchases: PurchaseReceiptPurchase[];
}) {
  const company = mockCompanySettings;
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const multi = purchases.length > 1;

  return (
    <Document>
      {purchases.map((purchase, idx) => (
        <Page key={purchase.id} size="A4" style={styles.page} wrap>
          <View style={styles.header}>
            <View>
              <Text style={styles.clinicName}>{company.companyName}</Text>
              <Text style={styles.clinicSub}>
                CRMV {company.crmv}  ·  MAPA {company.mapaRegistration}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.contactText}>{company.phone}  ·  {company.email}</Text>
              <Text style={styles.contactText}>{company.address}  ·  {company.city}  ·  CEP {company.zipCode}</Text>
            </View>
          </View>
          <View style={styles.ruleTeal} />
          <View style={styles.ruleLight} />

          <View style={styles.docMeta}>
            <View>
              <Text style={styles.docTitle}>RECIBO DE COMPRA — ALMOXARIFADO</Text>
              {multi && (
                <Text style={styles.docSub}>Compra {idx + 1} de {purchases.length}</Text>
              )}
            </View>
            <Text style={styles.docRef}>Ref. {purchase.id.slice(-8).toUpperCase()}</Text>
          </View>

          <View style={styles.highlightRow}>
            <View style={styles.highlightCell}>
              <Text style={styles.highlightLabel}>DATA DA COMPRA</Text>
              <Text style={styles.highlightValue}>
                {formatDateBR(purchase.date)}{purchase.time ? `  ${purchase.time}` : ""}
              </Text>
            </View>
            <View style={styles.highlightDivider} />
            <View style={styles.highlightCell}>
              <Text style={styles.highlightLabel}>FORNECEDOR</Text>
              <Text style={styles.highlightValue}>{purchase.supplier || "Não informado"}</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>ITENS DA COMPRA ({purchase.items.length})</Text>
          <View style={styles.tableHead}>
            <Text style={styles.thItem}>Produto</Text>
            <Text style={styles.thQty}>Qtd</Text>
            <Text style={styles.thUnit}>Custo Unit.</Text>
            <Text style={styles.thSub}>Subtotal</Text>
          </View>
          {purchase.items.map((item, i) => (
            <View
              key={`${item.name}-${i}`}
              style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: LIGHT_GRAY } : {}]}
              wrap={false}
            >
              <Text style={styles.tdItem}>{item.name}</Text>
              <Text style={styles.tdQty}>{item.quantity ?? "-"}</Text>
              <Text style={styles.tdUnit}>{purchase.itemized && item.unitCost != null ? fmt(item.unitCost) : "-"}</Text>
              <Text style={styles.tdSub}>{purchase.itemized && item.subtotal != null ? fmt(item.subtotal) : "-"}</Text>
            </View>
          ))}

          {!purchase.itemized && (
            <Text style={styles.fallbackNote}>
              Compra registrada antes do detalhamento por item — quantidades acima são aproximadas
              e o custo individual de cada produto não ficou salvo, apenas o total da compra.
            </Text>
          )}

          {purchase.installments && purchase.installments.length > 1 && (
            <View style={styles.installmentsSection}>
              <Text style={styles.sectionLabel}>PARCELAS ({purchase.installments.length}x)</Text>
              <View style={styles.tableHead}>
                <Text style={styles.thInstLabel}>Parcela</Text>
                <Text style={styles.thInstDate}>Vencimento</Text>
                <Text style={styles.thInstAmount}>Valor</Text>
              </View>
              {purchase.installments.map((inst, i) => (
                <View
                  key={`${inst.label}-${i}`}
                  style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: LIGHT_GRAY } : {}]}
                  wrap={false}
                >
                  <Text style={styles.tdInstLabel}>{inst.label}</Text>
                  <Text style={styles.tdInstDate}>{formatDateBR(inst.date)}</Text>
                  <Text style={styles.tdInstAmount}>{fmt(inst.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.totalsOuter}>
            <View style={styles.totalsInner}>
              <View style={styles.totalLineHighlight}>
                <Text style={styles.tlLabelHL}>TOTAL DA COMPRA</Text>
                <Text style={styles.tlValueHL}>{fmt(purchase.total)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{company.companyName} — Documento gerado pelo sistema</Text>
            <Text
              style={styles.footerText}
              render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages} — Emitido em ${today}`}
            />
          </View>
        </Page>
      ))}
    </Document>
  );
}
