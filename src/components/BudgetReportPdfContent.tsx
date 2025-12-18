"use client";

import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { Budget } from "@/mockData/budgets";
import { mockCompanySettings, mockUserSettings } from "@/mockData/settings";
import { mockClients } from "@/mockData/clients";
import { findCatalogItem } from "@/mockData/catalog";

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
    marginBottom: 12,
  },
  logo: {
    width: 64,
    height: 64,
  },
  clinicInfoBlock: {
    flexDirection: "column",
    alignItems: "flex-end",
    flexGrow: 1,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  clinicInfo: {
    fontSize: 10,
    color: "#374151",
    marginTop: 2,
    textAlign: "right",
  },
  divider: {
    height: 2,
    backgroundColor: "#E5E7EB",
    marginTop: 12,
    marginBottom: 16,
  },

  // Identificação do orçamento e dados do cliente/paciente
  docTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
  },
  docTitle: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#111827",
  },
  docNumber: {
    fontSize: 10,
    color: "#6B7280",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 9,
    color: "#6B7280",
  },
  metaValue: {
    fontSize: 11,
    color: "#111827",
    fontWeight: "bold",
    marginTop: 2,
  },

  // Tabela de itens
  tableWrapper: {
    marginTop: 6,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  thName: { flex: 1, fontSize: 10, fontWeight: "bold", color: "#374151" },
  thTag: { width: 90, fontSize: 10, fontWeight: "bold", color: "#374151" },
  thQty: { width: 60, textAlign: "right", fontSize: 10, fontWeight: "bold", color: "#374151" },
  thPrice: { width: 90, textAlign: "right", fontSize: 10, fontWeight: "bold", color: "#374151" },
  thSubtotal: { width: 100, textAlign: "right", fontSize: 10, fontWeight: "bold", color: "#374151" },

  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  tdName: { flex: 1, fontSize: 11, color: "#111827" },
  tdTag: {
    width: 90,
    fontSize: 9,
    color: "#0F766E",
    backgroundColor: "#D1FAE5",
    borderRadius: 4,
    textAlign: "center",
    paddingVertical: 2,
  },
  tdTagProduct: {
    color: "#1D4ED8",
    backgroundColor: "#DBEAFE",
  },
  tdQty: { width: 60, textAlign: "right", fontSize: 11, color: "#111827" },
  tdPrice: { width: 90, textAlign: "right", fontSize: 11, color: "#111827" },
  tdSubtotal: { width: 100, textAlign: "right", fontSize: 11, color: "#111827", fontWeight: "bold" },

  // Totais e validade
  totalsBlock: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  totalsRight: {
    minWidth: 220,
    alignItems: "flex-end",
  },
  totalLabel: {
    fontSize: 10,
    color: "#6B7280",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 4,
  },
  validityPayment: {
    fontSize: 10,
    color: "#374151",
    marginTop: 6,
    textAlign: "right",
  },

  // Observações e assinaturas
  notes: {
    fontSize: 10,
    color: "#374151",
    marginTop: 14,
  },
  signatureBlock: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureArea: {
    width: "48%",
  },
  signatureLine: {
    height: 1,
    backgroundColor: "#9CA3AF",
    marginTop: 24,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "center",
  },
});

interface BudgetReportPdfContentProps {
  budget: Budget;
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const BudgetReportPdfContent: React.FC<BudgetReportPdfContentProps> = ({ budget }) => {
  const company = mockCompanySettings;
  const user = mockUserSettings;
  const client = budget.clientId ? mockClients.find(c => c.id === budget.clientId) : undefined;
  const animal = budget.animalId ? client?.animals.find(a => a.id === budget.animalId) : undefined;
  const total = budget.items.reduce((sum, it) => sum + it.qty * it.price, 0);

  const displayCnpj =
    (company as any).cnpj ||
    (company as any).taxId ||
    "";

  const validityDays = (budget as any).validityDays ?? 15;
  const paymentTerms = (budget as any).paymentTerms ?? "Condições de pagamento: A combinar";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho profissional */}
        <View style={styles.header}>
          <Image src="/favicon.ico" style={styles.logo} />
          <View style={styles.clinicInfoBlock}>
            <Text style={styles.clinicName}>{company.companyName}</Text>
            <Text style={styles.clinicInfo}>
              CNPJ {displayCnpj ? displayCnpj : "-"} • CRMV {company.crmv} • MAPA {company.mapaRegistration}
            </Text>
            <Text style={styles.clinicInfo}>
              {company.address} • {company.city} • CEP {company.zipCode}
            </Text>
            <Text style={styles.clinicInfo}>
              {company.phone} • {company.email}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />

        {/* Identificação do orçamento */}
        <View style={styles.docTitleRow}>
          <Text style={styles.docTitle}>ORÇAMENTO</Text>
          <Text style={styles.docNumber}>Documento Nº {budget.id}</Text>
        </View>

        {/* Dados do Cliente/Paciente */}
        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Tutor</Text>
            <Text style={styles.metaValue}>{client?.name || "-"}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Pet</Text>
            <Text style={styles.metaValue}>{animal?.name || "-"}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Espécie/Raça</Text>
            <Text style={styles.metaValue}>
              {animal ? `${animal.species} / ${animal.breed}` : "-"}
            </Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Veterinário Responsável</Text>
            <Text style={styles.metaValue}>{user.userName}</Text>
          </View>
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
            const tagStyle = [
              styles.tdTag,
              isProduct ? styles.tdTagProduct : undefined,
            ];
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

        {/* Totais e validade */}
        <View style={styles.totalsBlock}>
          <View />
          <View style={styles.totalsRight}>
            <Text style={styles.totalLabel}>Valor Total</Text>
            <Text style={styles.totalValue}>{formatBRL(total)}</Text>
            <Text style={styles.validityPayment}>
              Validade do Orçamento: {validityDays} dia(s)
            </Text>
            <Text style={styles.validityPayment}>{paymentTerms}</Text>
          </View>
        </View>

        {/* Observações */}
        {budget.notes && (
          <Text style={styles.notes}>Observações: {budget.notes}</Text>
        )}

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