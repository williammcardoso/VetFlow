"use client";

import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { Budget } from "@/mockData/budgets";
import { mockCompanySettings } from "@/mockData/settings";
import type { UserProfile } from "@/lib/authApi";
import { formatPhoneBR } from "@/lib/utils";

Font.register({
  family: "Inter",
  fonts: [
    { src: "/fonts/Inter-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Inter-Bold.ttf", fontWeight: 700 },
  ],
});
// Desativa hifenização para evitar quebras como "pagamen-to".
Font.registerHyphenationCallback((word) => [word]);

// Paleta pensada para imprimir bem em PRETO E BRANCO: a hierarquia é dada
// por peso, tamanho e bordas — a cor é só reforço. Tons escolhidos para
// virarem cinzas bem distintos na conversão para escala de cinza.
const TEAL = "#0F766E";   // acento (regra do topo, rótulos de seção)
const INK = "#1F2937";    // fundo do total — quase preto, contrasta em P&B
const DARK = "#111827";   // texto principal
const GRAY = "#6B7280";   // texto secundário
const LIGHT_GRAY = "#F5F6F7"; // fundo de card (cinza bem claro, imprime limpo)
const WHITE = "#FFFFFF";
const BORDER = "#D8DDE2"; // borda um pouco mais escura: some menos na impressão
const SLATE = "#4B5563";  // rótulos — escurecido para legibilidade em P&B

const styles = StyleSheet.create({
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

  ruleTeal: { height: 2.5, backgroundColor: TEAL, marginTop: 8 },
  ruleLight: { height: 1, backgroundColor: BORDER, marginTop: 2, marginBottom: 12 },

  // Titulo
  docMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  docTitle: { fontSize: 20, fontWeight: 700, color: TEAL, letterSpacing: 1 },
  docType: { fontSize: 9, color: SLATE, marginTop: 3 },
  docRef: { fontSize: 8.5, color: SLATE, textAlign: "right" },
  docDate: { fontSize: 8.5, color: SLATE, marginTop: 2, textAlign: "right" },

  // Cards de tutor e paciente — compactos: o nome em destaque e os demais
  // dados como "rótulo: valor" na mesma linha, para não empurrar os itens
  // do orçamento para o meio da página.
  infoRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  infoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: LIGHT_GRAY,
  },
  infoLabel: { fontSize: 6.5, color: SLATE, fontWeight: 700, letterSpacing: 0.5 },
  infoValue: { fontSize: 10, color: DARK, fontWeight: 700, marginTop: 1 },
  infoMeta: { fontSize: 7.5, color: DARK, marginTop: 2, lineHeight: 1.35 },
  infoMetaLabel: { fontWeight: 700, color: SLATE },

  // Tabela de itens
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
  thQty: { width: 34, textAlign: "center", fontSize: 7.5, fontWeight: 700, color: SLATE },
  thUnit: { width: 74, textAlign: "right", fontSize: 7.5, fontWeight: 700, color: SLATE },
  thSub: { width: 80, textAlign: "right", fontSize: 7.5, fontWeight: 700, color: SLATE },

  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tdItem: { flex: 1, fontSize: 9.5, color: DARK },
  tdQty: { width: 34, textAlign: "center", fontSize: 9.5, color: DARK },
  tdUnit: { width: 74, textAlign: "right", fontSize: 9.5, color: DARK },
  tdSub: { width: 80, textAlign: "right", fontSize: 9.5, color: DARK, fontWeight: 700 },

  // Totais. O card do TOTAL usa fundo escuro (INK) em vez do teal: numa
  // impressora preto e branco o teal vira um cinza médio que compete com o
  // texto branco; o escuro mantém o contraste em cor E em P&B.
  totalsOuter: { alignItems: "flex-end", marginTop: 8, marginBottom: 14 },
  totalsInner: { width: 230 },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  tlLabel: { fontSize: 8.5, color: SLATE },
  tlValue: { fontSize: 8.5, color: DARK, fontWeight: 700 },
  totalLineHighlight: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: INK,
    marginTop: 4,
  },
  tlLabelHL: { fontSize: 9, fontWeight: 700, color: WHITE, letterSpacing: 1 },
  tlValueHL: { fontSize: 13, fontWeight: 700, color: WHITE },

  // Condicoes
  obsBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 9,
    marginBottom: 10,
    backgroundColor: LIGHT_GRAY,
  },
  obsLabel: { fontSize: 7, fontWeight: 700, color: SLATE, marginBottom: 2, letterSpacing: 0.5 },
  obsText: { fontSize: 8, color: DARK, marginTop: 1, lineHeight: 1.35 },

  // Assinaturas
  sigRow: { flexDirection: "row", justifyContent: "space-between", gap: 24, marginTop: 2 },
  sigArea: { flex: 1, alignItems: "center" },
  // #9AA3AE em vez de cinza claro: linha de assinatura precisa aparecer na
  // impressão P&B, onde tons claros somem.
  sigLine: { height: 1, backgroundColor: "#9AA3AE", width: "100%", marginTop: 26, marginBottom: 5 },
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

interface BudgetReportPdfContentProps {
  budget: Budget;
  userProfile?: UserProfile | null;
  /** Dados do cadastro atual; caem para o snapshot do orçamento se ausentes. */
  tutorAddress?: string;
  tutorPhone?: string;
  petSpecies?: string;
  petBreed?: string;
  petAge?: string;
  petWeight?: string;
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatDateBR = (iso?: string) => {
  if (!iso) return "-";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
};

const BudgetReportPdfContent: React.FC<BudgetReportPdfContentProps> = ({
  budget,
  userProfile,
  tutorAddress,
  tutorPhone,
  petSpecies,
  petBreed,
  petAge,
  petWeight,
}) => {
  const company = mockCompanySettings;
  const itemsSubtotal = budget.items.reduce((sum, it) => sum + it.qty * it.price, 0);
  const discountAmount = budget.discountAmount ?? 0;
  const surchargeAmount = budget.surchargeAmount ?? 0;
  const hasNegotiation = discountAmount > 0 || surchargeAmount > 0;
  const total = Math.max(0, itemsSubtotal - discountAmount + surchargeAmount);
  const vetName =
    userProfile?.signature_text?.trim() || userProfile?.full_name?.trim() || "Não informado";
  const validityDays = (budget as Budget & { validityDays?: number }).validityDays ?? 15;
  const rawPhone = tutorPhone || budget.clientPhone;
  const phone = rawPhone ? formatPhoneBR(rawPhone) || rawPhone : "";
  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabecalho */}
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

        {/* Titulo */}
        <View style={styles.docMeta}>
          <View>
            <Text style={styles.docTitle}>ORÇAMENTO</Text>
            <Text style={styles.docType}>
              Emitido por {vetName}  ·  CRMV {company.crmv}
            </Text>
          </View>
          <View>
            <Text style={styles.docRef}>Ref. {budget.id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.docDate}>{formatDateBR(budget.date)}</Text>
          </View>
        </View>

        {/* Tutor e paciente lado a lado, igual aos demais documentos */}
        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>TUTOR / RESPONSAVEL</Text>
            <Text style={styles.infoValue}>{budget.clientName || "Não informado"}</Text>
            {phone && (
              <Text style={styles.infoMeta}>
                <Text style={styles.infoMetaLabel}>Tel: </Text>{phone}
              </Text>
            )}
            {tutorAddress && (
              <Text style={styles.infoMeta}>
                <Text style={styles.infoMetaLabel}>End: </Text>{tutorAddress}
              </Text>
            )}
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>PACIENTE</Text>
            <Text style={styles.infoValue}>{budget.animalName || "Não informado"}</Text>
            {(petSpecies || petBreed) && (
              <Text style={styles.infoMeta}>
                {[petSpecies, petBreed].filter(Boolean).join(" · ")}
              </Text>
            )}
            {(petAge || petWeight) && (
              <Text style={styles.infoMeta}>
                {[petAge, petWeight].filter(Boolean).join(" · ")}
              </Text>
            )}
          </View>
        </View>

        {/* Itens — sem a coluna Tipo: para o tutor, produto ou servico e irrelevante */}
        <View style={{ marginBottom: 6 }}>
          <Text style={styles.sectionLabel}>ITENS DO ORÇAMENTO</Text>
          <View style={styles.tableHead}>
            <Text style={styles.thItem}>Procedimento / Produto</Text>
            <Text style={styles.thQty}>Qtd</Text>
            <Text style={styles.thUnit}>Unit.</Text>
            <Text style={styles.thSub}>Subtotal</Text>
          </View>
          {budget.items.map((it, idx) => (
            <View
              key={`${it.itemId}-${idx}`}
              style={[styles.tableRow, idx % 2 === 1 ? { backgroundColor: LIGHT_GRAY } : {}]}
              wrap={false}
            >
              <Text style={styles.tdItem}>{it.name}</Text>
              <Text style={styles.tdQty}>{it.qty}</Text>
              <Text style={styles.tdUnit}>{formatBRL(it.price)}</Text>
              <Text style={styles.tdSub}>{formatBRL(it.qty * it.price)}</Text>
            </View>
          ))}
        </View>

        {/* Totais — só mostra a composição quando houve negociação */}
        <View style={styles.totalsOuter}>
          <View style={styles.totalsInner}>
            {hasNegotiation && (
              <>
                <View style={styles.totalLine}>
                  <Text style={styles.tlLabel}>Subtotal dos itens</Text>
                  <Text style={styles.tlValue}>{formatBRL(itemsSubtotal)}</Text>
                </View>
                {discountAmount > 0 && (
                  <View style={styles.totalLine}>
                    <Text style={styles.tlLabel}>Desconto</Text>
                    <Text style={styles.tlValue}>- {formatBRL(discountAmount)}</Text>
                  </View>
                )}
                {surchargeAmount > 0 && (
                  <View style={styles.totalLine}>
                    <Text style={styles.tlLabel}>Acrescimo</Text>
                    <Text style={styles.tlValue}>+ {formatBRL(surchargeAmount)}</Text>
                  </View>
                )}
              </>
            )}
            <View style={styles.totalLineHighlight}>
              <Text style={styles.tlLabelHL}>TOTAL</Text>
              <Text style={styles.tlValueHL}>{formatBRL(total)}</Text>
            </View>
          </View>
        </View>

        {/* Observacoes do orcamento (negociacao, combinados com o tutor) */}
        {budget.notes?.trim() && (
          <View style={styles.obsBox}>
            <Text style={styles.obsLabel}>OBSERVAÇÕES</Text>
            <Text style={styles.obsText}>{budget.notes.trim()}</Text>
          </View>
        )}

        {/* Condições */}
        <View style={styles.obsBox}>
          <Text style={styles.obsLabel}>CONDIÇÕES</Text>
          <Text style={styles.obsText}>
            - Validade deste orçamento: {validityDays} dia(s) a partir da data de emissão.
          </Text>
          <Text style={styles.obsText}>
            - Valores sujeitos a alteração após o prazo de validade.
          </Text>
          <Text style={styles.obsText}>
            - Este documento não tem validade fiscal. Dúvidas: {formatPhoneBR(company.phone) || company.phone} - {company.email}
          </Text>
        </View>

        {/* Assinaturas */}
        <View style={styles.sigRow}>
          <View style={styles.sigArea}>
            <View style={styles.sigLine} />
            <Text style={styles.sigName}>{vetName}</Text>
            <Text style={styles.sigSub}>CRMV {company.crmv}</Text>
          </View>
          <View style={styles.sigArea}>
            <View style={styles.sigLine} />
            <Text style={styles.sigName}>{budget.clientName || "Tutor / Responsável"}</Text>
            <Text style={styles.sigSub}>Ciente do orçamento</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{company.companyName}</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages} — Emitido em ${today}`}
          />
        </View>
      </Page>
    </Document>
  );
};

export default BudgetReportPdfContent;
