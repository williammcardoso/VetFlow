import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { mockCompanySettings, mockUserSettings } from "@/mockData/settings";
import type { FinancialTransaction } from "@/mockData/financial";
import type { SaleItem } from "@/lib/saleItemsApi";
import { groupRepassesByProvider } from "@/lib/costProviders";

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
const AMBER = "#B45309";
const EMERALD = "#065F46";
const BORDER = "#D8DDE2";
const SLATE = "#4B5563";

const base = StyleSheet.create({
  page: {
    padding: 48,
    paddingBottom: 64,
    fontFamily: "Inter",
    fontSize: 10,
    color: DARK,
    backgroundColor: WHITE,
  },

  // Cabecalho
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

  // Linha decorativa dupla
  ruleTeal: { height: 2.5, backgroundColor: TEAL, marginTop: 10 },
  ruleLight: { height: 1, backgroundColor: BORDER, marginTop: 2, marginBottom: 18 },

  // Titulo do documento
  docMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  docTitle: { fontSize: 20, fontWeight: 700, color: TEAL, letterSpacing: 1 },
  docType: { fontSize: 9, color: SLATE, marginTop: 3 },
  docRef: { fontSize: 8.5, color: SLATE, textAlign: "right" },
  docDate: { fontSize: 8.5, color: SLATE, marginTop: 2, textAlign: "right" },

  // Info cards
  infoRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  infoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 5,
    padding: 10,
    backgroundColor: LIGHT_GRAY,
  },
  infoBoxRight: {},
  infoLabel: { fontSize: 7.5, color: SLATE, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 },
  infoValue: { fontSize: 10.5, color: DARK, fontWeight: 700 },
  infoSub: { fontSize: 8, color: GRAY, marginTop: 2 },

  // Status
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 9, fontWeight: 700 },
  statusSep: { width: 1, height: 12, backgroundColor: BORDER, marginHorizontal: 4 },
  statusInfo: { fontSize: 8.5, color: SLATE },

  // Tabela
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
    marginBottom: 0,
  },
  thItem: { flex: 1, fontSize: 7.5, fontWeight: 700, color: SLATE },
  thCat: { width: 75, fontSize: 7.5, fontWeight: 700, color: SLATE },
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
  tdItemCat: { fontSize: 7.5, color: GRAY, marginTop: 1.5 },
  tdCat: { width: 75, fontSize: 8.5, color: SLATE },
  tdQty: { width: 28, textAlign: "center", fontSize: 9.5, color: DARK },
  tdUnit: { width: 68, textAlign: "right", fontSize: 9.5, color: DARK },
  tdSub: { width: 75, textAlign: "right", fontSize: 9.5, color: DARK, fontWeight: 700 },

  // Totais
  totalsOuter: { alignItems: "flex-end", marginTop: 0, marginBottom: 4 },
  totalsInner: { width: 180 },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3.5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  totalLineHighlight: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: INK,
    borderRadius: 4,
    marginTop: 5,
  },
  tlLabel: { fontSize: 8.5, color: GRAY },
  tlValue: { fontSize: 8.5, color: DARK, fontWeight: 700 },
  tlLabelAmber: { fontSize: 8.5, color: AMBER },
  tlValueAmber: { fontSize: 8.5, color: AMBER, fontWeight: 700 },
  tlLabelGreen: { fontSize: 8.5, color: EMERALD },
  tlValueGreen: { fontSize: 8.5, color: EMERALD, fontWeight: 700 },
  tlLabelHL: { fontSize: 10, color: WHITE, fontWeight: 700 },
  tlValueHL: { fontSize: 10, color: WHITE, fontWeight: 700 },

  // Cards financeiros
  finRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  finCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  finCardBlue: { borderColor: "#BFDBFE", backgroundColor: "#F0F9FF" },
  finCardGreen: { borderColor: "#A7F3D0", backgroundColor: "#F0FDF4" },
  finCardAmber: { borderColor: "#FDE68A", backgroundColor: "#FFFBEB" },
  finLabel: { fontSize: 7.5, color: SLATE, fontWeight: 700, letterSpacing: 0.3, marginBottom: 4 },
  finValue: { fontSize: 14, fontWeight: 700 },
  finBlue: { color: "#1D4ED8" },
  finGreen: { color: "#059669" },
  finAmber: { color: "#D97706" },

  // Observacao
  obsBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 5,
    padding: 10,
    marginBottom: 16,
    backgroundColor: LIGHT_GRAY,
  },
  obsLabel: { fontSize: 7.5, fontWeight: 700, color: SLATE, marginBottom: 3 },
  obsText: { fontSize: 8.5, color: GRAY },

  // Assinaturas
  sigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
    marginTop: 4,
  },
  sigArea: { flex: 1, alignItems: "center" },
  sigLine: { height: 1, backgroundColor: "#9AA3AE", width: "100%", marginTop: 32, marginBottom: 5 },
  sigName: { fontSize: 9, color: DARK, fontWeight: 700, textAlign: "center" },
  sigSub: { fontSize: 7.5, color: GRAY, textAlign: "center", marginTop: 2 },

  // Footer
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

const CAT_LABELS: Record<string, string> = {
  cirurgia: "Cirurgia",
  exame_externo: "Exame Externo",
  exame_interno: "Exame Interno",
  vacina: "Vacina",
  servico: "Servico",
  produto: "Produto",
  medicamento: "Medicamento",
};

const STATUS: Record<string, { label: string; color: string; dot: string }> = {
  paid:      { label: "Pago",      color: "#059669", dot: "#059669" },
  partial:   { label: "Parcial",   color: "#2563EB", dot: "#2563EB" },
  pending:   { label: "Pendente",  color: "#D97706", dot: "#D97706" },
  cancelled: { label: "Cancelado", color: "#DC2626", dot: "#DC2626" },
};

export interface SaleReceiptPdfContentProps {
  transaction: FinancialTransaction;
  items: SaleItem[];
  mode?: "client" | "internal";
  clientName?: string;
  clientPhone?: string;
  clientAddress?: string;
  animalName?: string;
  animalSpecies?: string;
  animalBreed?: string;
  animalAge?: string;
}

const SaleReceiptPdfContent: React.FC<SaleReceiptPdfContentProps> = (props) => {
  const {
    transaction, items, mode = "client",
    clientName, clientPhone, clientAddress,
    animalName, animalSpecies, animalBreed, animalAge,
  } = props;
  const company = mockCompanySettings;
  const user = mockUserSettings;
  const isInternal = mode === "internal";

  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const saleDate = new Date(
    `${transaction.date}T${transaction.time || "00:00"}`
  ).toLocaleString("pt-BR");

  const total = transaction.amount;
  const pago = transaction.paidAmount || 0;
  const saldo = Math.max(0, total - pago);
  const totalCost = items.reduce((s, i) => s + i.cost * i.quantity, 0);
  const lucro = total - totalCost;
  const margem = total > 0 ? Math.round((lucro / total) * 100) : 0;
  const repassesByProvider = groupRepassesByProvider(items);
  const st = STATUS[transaction.status || "pending"] || STATUS.pending;

  const itemsSubtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const discountAmount = transaction.discountAmount || 0;
  const surchargeAmount = transaction.surchargeAmount || 0;
  const operatorFee = transaction.financialFee || 0;
  const hasBreakdown = discountAmount > 0 || surchargeAmount > 0 || operatorFee > 0;

  return (
    <Document>
      <Page size="A4" style={base.page}>

        {/* Cabecalho */}
        <View style={base.header}>
          <View>
            <Text style={base.clinicName}>{company.companyName}</Text>
            <Text style={base.clinicSub}>
              CRMV {company.crmv}  ·  MAPA {company.mapaRegistration}
            </Text>
          </View>
          <View style={base.headerRight}>
            <Text style={base.contactText}>{company.phone}  ·  {company.email}</Text>
            <Text style={base.contactText}>{company.address}  ·  {company.city}  ·  CEP {company.zipCode}</Text>
          </View>
        </View>
        <View style={base.ruleTeal} />
        <View style={base.ruleLight} />

        {/* Titulo */}
        <View style={base.docMeta}>
          <View>
            <Text style={base.docTitle}>
              {isInternal ? "RELATORIO DE VENDA" : "COMPROVANTE DE VENDA"}
            </Text>
            <Text style={base.docType}>
              {isInternal
                ? "Documento interno — uso restrito"
                : `Emitido por ${user.userName}  ·  CRMV ${company.crmv}`}
            </Text>
          </View>
          <View>
            <Text style={base.docRef}>Ref. {transaction.id.slice(-8).toUpperCase()}</Text>
            <Text style={base.docDate}>{saleDate}</Text>
          </View>
        </View>

        {/* Info tutor e paciente */}
        <View style={base.infoRow}>
          <View style={base.infoBox}>
            <Text style={base.infoLabel}>TUTOR / RESPONSAVEL</Text>
            <Text style={base.infoValue}>{clientName || "Nao informado"}</Text>
            {clientPhone && (
              <Text style={base.infoSub}>Tel: {clientPhone}</Text>
            )}
            {clientAddress && (
              <Text style={base.infoSub}>End: {clientAddress}</Text>
            )}
          </View>
          <View style={[base.infoBox]}>
            <Text style={base.infoLabel}>PACIENTE</Text>
            <Text style={base.infoValue}>{animalName || "Nao informado"}</Text>
            {(animalSpecies || animalBreed || animalAge) && (
              <Text style={base.infoSub}>
                {[animalSpecies, animalBreed, animalAge]
                  .filter((v): v is string => !!v)
                  .join("  |  ")}
              </Text>
            )}
          </View>
        </View>

        {/* Status e pagamento */}
        {isInternal && (
          <View style={base.statusRow}>
            <View style={[base.statusDot, { backgroundColor: st.dot }]} />
            <Text style={[base.statusText, { color: st.color }]}>{st.label}</Text>
            <View style={base.statusSep} />
            {transaction.paymentMethod && (
              <Text style={base.statusInfo}>Pagamento: {transaction.paymentMethod}</Text>
            )}
            <View style={base.statusSep} />
            <Text style={base.statusInfo}>{saleDate}</Text>
          </View>
        )}

        {/* Tabela de itens */}
        {items.length > 0 && (
          <View style={{ marginBottom: 4 }}>
            <Text style={base.sectionLabel}>ITENS DA VENDA</Text>
            <View style={base.tableHead}>
              <Text style={base.thItem}>Procedimento / Produto</Text>
              <Text style={base.thCat}>Categoria</Text>
              <Text style={base.thQty}>Qtd</Text>
              <Text style={base.thUnit}>Unit.</Text>
              <Text style={base.thSub}>Subtotal</Text>
            </View>
            {items.map((item, idx) => (
              <View
                key={item.id}
                style={[
                  base.tableRow,
                  idx % 2 === 1 ? { backgroundColor: LIGHT_GRAY } : {},
                ]}
                wrap={false}
              >
                <Text style={base.tdItem}>{item.name}</Text>
                <Text style={base.tdCat}>
                  {item.category ? (CAT_LABELS[item.category] || item.category) : "-"}
                </Text>
                <Text style={base.tdQty}>{item.quantity}</Text>
                <Text style={base.tdUnit}>{fmt(item.unitPrice)}</Text>
                <Text style={base.tdSub}>{fmt(item.subtotal)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Composicao do valor (desconto, acrescimo, taxa, repasse, total) */}
        {items.length > 0 && (
          <View style={base.totalsOuter}>
            <View style={base.totalsInner}>
              {(hasBreakdown || (isInternal && totalCost > 0)) && (
                <View style={base.totalLine}>
                  <Text style={base.tlLabel}>Subtotal dos itens</Text>
                  <Text style={base.tlValue}>{fmt(itemsSubtotal)}</Text>
                </View>
              )}
              {discountAmount > 0 && (
                <View style={base.totalLine}>
                  <Text style={base.tlLabelAmber}>Desconto</Text>
                  <Text style={base.tlValueAmber}>- {fmt(discountAmount)}</Text>
                </View>
              )}
              {surchargeAmount > 0 && (
                <View style={base.totalLine}>
                  <Text style={base.tlLabel}>Acrescimo</Text>
                  <Text style={base.tlValue}>+ {fmt(surchargeAmount)}</Text>
                </View>
              )}
              {operatorFee > 0 && (
                <View style={base.totalLine}>
                  <Text style={base.tlLabel}>Taxa de operadora</Text>
                  <Text style={base.tlValue}>+ {fmt(operatorFee)}</Text>
                </View>
              )}
              {isInternal && totalCost > 0 && (
                <>
                  {repassesByProvider.map((row) => (
                    <View key={row.provider} style={base.totalLine}>
                      <Text style={base.tlLabelAmber}>Repasse → {row.provider}</Text>
                      <Text style={base.tlValueAmber}>- {fmt(row.amount)}</Text>
                    </View>
                  ))}
                  <View style={base.totalLine}>
                    <Text style={base.tlLabelGreen}>Lucro estimado ({margem}%)</Text>
                    <Text style={base.tlValueGreen}>{fmt(lucro)}</Text>
                  </View>
                </>
              )}
              <View style={base.totalLineHighlight}>
                <Text style={base.tlLabelHL}>TOTAL</Text>
                <Text style={base.tlValueHL}>{fmt(total)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Cards financeiros */}
        {isInternal && (
          <View style={base.finRow}>
            <View style={[base.finCard, base.finCardBlue]}>
              <Text style={base.finLabel}>VALOR TOTAL</Text>
              <Text style={[base.finValue, base.finBlue]}>{fmt(total)}</Text>
            </View>
            <View style={[base.finCard, base.finCardGreen]}>
              <Text style={base.finLabel}>VALOR PAGO</Text>
              <Text style={[base.finValue, base.finGreen]}>{fmt(pago)}</Text>
            </View>
            <View style={[base.finCard, base.finCardAmber]}>
              <Text style={base.finLabel}>SALDO A PAGAR</Text>
              <Text style={[base.finValue, base.finAmber]}>{fmt(saldo)}</Text>
            </View>
          </View>
        )}

        {/* Observacao (modo cliente) */}
        {!isInternal && (
          <View style={base.obsBox}>
            <Text style={base.obsLabel}>OBSERVACOES</Text>
            <Text style={base.obsText}>
              Este comprovante nao tem validade fiscal. Em caso de duvidas,
              entre em contato: {company.phone} - {company.email}
            </Text>
          </View>
        )}

        {/* Assinaturas */}
        <View style={base.sigRow}>
          <View style={base.sigArea}>
            <View style={base.sigLine} />
            <Text style={base.sigName}>{user.userName}</Text>
            <Text style={base.sigSub}>CRMV {company.crmv}</Text>
          </View>
          <View style={base.sigArea}>
            <View style={base.sigLine} />
            <Text style={base.sigName}>{clientName || "Tutor / Responsavel"}</Text>
            <Text style={base.sigSub}>Assinatura do Responsavel</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={base.footer} fixed>
          <Text style={base.footerText}>
            {isInternal ? "DOCUMENTO INTERNO — NAO COMPARTILHAR" : company.companyName}
          </Text>
          <Text
            style={base.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages} — Emitido em ${today}`}
          />
        </View>

      </Page>
    </Document>
  );
};

export default SaleReceiptPdfContent;
