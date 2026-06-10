"use client";

import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { Budget } from "@/mockData/budgets";
import { mockCompanySettings } from "@/mockData/settings";
import { findCatalogItem } from "@/mockData/catalog";
import type { UserProfile } from "@/lib/authApi";

// ADDED: desativa hifenização global para evitar quebras como "pagamen-to"
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#111827",
  },

  // Cabeçalho
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  logo: { width: 64, height: 64 },
  clinicInfoBlock: { flexDirection: "column", alignItems: "flex-end", flexGrow: 1 },
  clinicName: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  clinicInfo: { fontSize: 10, color: "#374151", marginTop: 2, textAlign: "right" },
  divider: { height: 2, backgroundColor: "#E5E7EB", marginTop: 10, marginBottom: 12 },

  // Título e identificação
  docTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8, // compactado
  },
  docTitle: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#111827",
  },
  docNumber: { fontSize: 10, color: "#6B7280" },

  // Grid de dados principais (duas colunas) - compacto
  dataGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },
  dataCol: { flex: 1 },
  metaLabel: { fontSize: 9, color: "#6B7280" },
  metaValue: {
    fontSize: 11,
    color: "#111827",
    fontWeight: "bold",
    marginTop: 2,
    marginBottom: 4,
  },

  // Linha dedicada para Veterinário
  vetRow: { marginBottom: 8 },
  vetLabel: { fontSize: 9, color: "#6B7280" },
  vetValue: { fontSize: 11, color: "#111827", fontWeight: "bold", marginTop: 2 },

  // Tabela de itens
  tableWrapper: { marginTop: 6 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9", // cinza muito sutil
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  thName: { flex: 1, fontSize: 9, fontWeight: "bold", color: "#374151", textTransform: "uppercase" },
  thTag: { width: 80, fontSize: 9, fontWeight: "bold", color: "#374151", textTransform: "uppercase" },
  thQty: { width: 50, textAlign: "center", fontSize: 9, fontWeight: "bold", color: "#374151", textTransform: "uppercase" },
  thPrice: { width: 90, textAlign: "right", fontSize: 9, fontWeight: "bold", color: "#374151", textTransform: "uppercase" },
  thSubtotal: { width: 100, textAlign: "right", fontSize: 9, fontWeight: "bold", color: "#374151", textTransform: "uppercase" },

  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  tdName: { flex: 1, fontSize: 11, color: "#111827" },
  tdTag: {
    width: 80,
    fontSize: 9,
    color: "#0F766E",
    backgroundColor: "#D1FAE5",
    borderRadius: 4,
    textAlign: "center",
    paddingVertical: 2,
  },
  tdTagProduct: { color: "#1D4ED8", backgroundColor: "#DBEAFE" },
  tdQty: { width: 50, textAlign: "center", fontSize: 11, color: "#111827" },
  tdPrice: { width: 90, textAlign: "right", fontSize: 11, color: "#111827" },
  tdSubtotal: { width: 100, textAlign: "right", fontSize: 11, color: "#111827", fontWeight: "bold" },

  // Totais alinhados ao Subtotal, com linhas separadas e sem quebra/overlap
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    paddingHorizontal: 10, // igual à tabela para alinhar
    marginTop: 8,
  },
  totalsSpacer: { flexGrow: 1 },
  totalsRight: {
    width: 220, // antes: 100 — mantém borda direita alinhada com a tabela e evita quebra
    alignItems: "flex-end",
  },
  totalLabel: { fontSize: 10, color: "#6B7280" },
  totalValue: { fontSize: 16, fontWeight: "bold", color: "#111827", marginTop: 2 },
  validityPayment: {
    fontSize: 9,
    color: "#374151",
    marginTop: 4,
    textAlign: "right",
    lineHeight: 1.0, // antes: 1.2 — compacta sem forçar quebra
  },

  // Assinaturas
  signatureBlock: {
    marginTop: 16, // compacto
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureArea: { width: "48%" },
  signatureLine: { height: 1, backgroundColor: "#9CA3AF", marginTop: 16, marginBottom: 4 },
  signatureLabel: { fontSize: 10, color: "#6B7280", textAlign: "center" },
});

interface BudgetReportPdfContentProps {
  budget: Budget;
  userProfile?: UserProfile | null;
}

const formatBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const BudgetReportPdfContent: React.FC<BudgetReportPdfContentProps> = ({ budget, userProfile }) => {
  const company = mockCompanySettings;
  const total = budget.items.reduce((sum, it) => sum + it.qty * it.price, 0);
  const vetName = userProfile?.signature_text?.trim() || userProfile?.full_name?.trim() || "Não informado";

  const displayCnpj = (company as { cnpj?: string; taxId?: string }).cnpj || (company as { cnpj?: string; taxId?: string }).taxId || "";
  const validityDays = (budget as Budget & { validityDays?: number }).validityDays ?? 15;
  const paymentTerms = (budget as Budget & { paymentTerms?: string }).paymentTerms ?? "Condições de pagamento: A combinar";
  const phone = budget.clientPhone || "-";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Image src="/favicon.ico" style={styles.logo} />
          <View style={styles.clinicInfoBlock}>
            <Text style={styles.clinicName}>{company.companyName}</Text>
            <Text style={styles.clinicInfo}>CNPJ {displayCnpj ? displayCnpj : "-"} • CRMV {company.crmv} • MAPA {company.mapaRegistration}</Text>
            <Text style={styles.clinicInfo}>{company.address} • {company.city} • CEP {company.zipCode}</Text>
            <Text style={styles.clinicInfo}>{company.phone} • {company.email}</Text>
          </View>
        </View>
        <View style={styles.divider} />

        {/* Título e identificação */}
        <View style={styles.docTitleRow}>
          <Text style={styles.docTitle}>ORÇAMENTO</Text>
          <Text style={styles.docNumber}>Documento Nº {budget.id}</Text>
        </View>

        {/* Grid de dados principais compacto */}
        <View style={styles.dataGrid}>
          <View style={styles.dataCol}>
            <Text style={styles.metaLabel}>Tutor</Text>
            <Text style={styles.metaValue}>{budget.clientName || "-"}</Text>
            <Text style={styles.metaLabel}>Telefone</Text>
            <Text style={styles.metaValue}>{phone}</Text>
          </View>
          <View style={styles.dataCol}>
            <Text style={styles.metaLabel}>Nome do Pet</Text>
            <Text style={styles.metaValue}>{budget.animalName || "-"}</Text>
            <Text style={styles.metaLabel}>Espécie/Raça</Text>
            <Text style={styles.metaValue}>-</Text>
          </View>
        </View>

        {/* Veterinário Responsável */}
        <View style={styles.vetRow}>
          <Text style={styles.vetLabel}>Veterinário Responsável</Text>
          <Text style={styles.vetValue}>{vetName}</Text>
        </View>

        {/* Tabela de itens */}
        <View style={styles.tableWrapper}>
          <View style={styles.tableHeader}>
            <Text style={styles.thName}>Item</Text>
            <Text style={styles.thTag}>Tipo</Text>
            <Text style={styles.thQty}>Qtd</Text>
            <Text style={styles.thPrice}>Preço</Text>
            <Text style={styles.thSubtotal}>Subtotal</Text>
          </View>
          {budget.items.map((it, idx) => {
            const cat = findCatalogItem(it.itemId);
            const isProduct = cat?.type === "product";
            const tagStyle = [styles.tdTag, isProduct ? styles.tdTagProduct : undefined];
            return (
              <View key={`${it.itemId}-${idx}`} style={styles.tableRow}>
                <Text style={styles.tdName}>{it.name}</Text>
                <Text style={tagStyle}>{isProduct ? "Produto" : "Serviço"}</Text>
                <Text style={styles.tdQty}>{it.qty}</Text>
                <Text style={styles.tdPrice}>{formatBRL(it.price)}</Text>
                <Text style={styles.tdSubtotal}>{formatBRL(it.qty * it.price)}</Text>
              </View>
            );
          })}
        </View>

        {/* Totais alinhados ao Subtotal, linhas separadas e estáveis */}
        <View style={styles.totalsRow}>
          <View style={styles.totalsSpacer} />
          <View style={styles.totalsRight}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatBRL(total)}</Text>
            <Text style={styles.validityPayment} wrap={false}>
              Validade do Orçamento: {validityDays} dia(s)
            </Text>
            <Text style={styles.validityPayment} wrap={false}>
              {paymentTerms}
            </Text>
          </View>
        </View>

        {/* REMOVIDO: Campo de Observações para evitar quebras e excesso de altura */}

        {/* Assinaturas */}
        <View style={styles.signatureBlock}>
          <View style={styles.signatureArea}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Assinatura do Veterinário</Text>
          </View>
          <View style={styles.signatureArea}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Assinatura do Tutor</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default BudgetReportPdfContent;