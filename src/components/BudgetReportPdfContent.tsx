"use client";

import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { Budget } from "@/mockData/budgets";
import { mockCompanySettings, mockUserSettings } from "@/mockData/settings";
import { mockClients } from "@/mockData/clients";

Font.register({
  family: "Roboto",
  fonts: [
    { src: "/fonts/Roboto-Regular.ttf", fontWeight: "normal" },
    { src: "/fonts/Roboto-Bold.ttf", fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: "Roboto", fontSize: 11 },
  header: { marginBottom: 12 },
  clinicName: { fontSize: 16, fontWeight: "bold" },
  clinicInfo: { fontSize: 10, marginTop: 2 },
  title: { fontSize: 14, marginTop: 12, marginBottom: 8, fontWeight: "bold" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#ddd", paddingBottom: 4, marginTop: 8 },
  th: { flex: 1, fontWeight: "bold" },
  thQty: { width: 60, textAlign: "right", fontWeight: "bold" },
  thPrice: { width: 100, textAlign: "right", fontWeight: "bold" },
  thSubtotal: { width: 100, textAlign: "right", fontWeight: "bold" },
  tableRow: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderColor: "#eee" },
  tdName: { flex: 1 },
  tdQty: { width: 60, textAlign: "right" },
  tdPrice: { width: 100, textAlign: "right" },
  tdSubtotal: { width: 100, textAlign: "right" },
  footer: { marginTop: 12 },
  notes: { fontSize: 10, marginTop: 6 },
  signature: { marginTop: 24, fontSize: 10 },
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.clinicName}>{company.companyName}</Text>
          <Text style={styles.clinicInfo}>
            CRMV {company.crmv} • MAPA {company.mapaRegistration}
          </Text>
          <Text style={styles.clinicInfo}>
            {company.address} • {company.city} • CEP {company.zipCode}
          </Text>
          <Text style={styles.clinicInfo}>
            {company.phone} • {company.email}
          </Text>
        </View>

        <Text style={styles.title}>Orçamento</Text>

        <View style={styles.row}>
          <Text>Data: {budget.date}</Text>
          <Text>Status: {budget.status}</Text>
        </View>
        <View>
          <Text>Cliente: {client?.name || "-"}</Text>
          {animal && <Text>Animal: {animal.name}</Text>}
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.th}>Item</Text>
          <Text style={styles.thQty}>Qtd</Text>
          <Text style={styles.thPrice}>Preço</Text>
          <Text style={styles.thSubtotal}>Subtotal</Text>
        </View>
        {budget.items.map((it, idx) => (
          <View key={`${it.itemId}-${idx}`} style={styles.tableRow}>
            <Text style={styles.tdName}>{it.name}</Text>
            <Text style={styles.tdQty}>{it.qty}</Text>
            <Text style={styles.tdPrice}>{formatBRL(it.price)}</Text>
            <Text style={styles.tdSubtotal}>{formatBRL(it.qty * it.price)}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <View style={styles.row}>
            <Text>Total</Text>
            <Text>{formatBRL(total)}</Text>
          </View>
          {budget.notes && (
            <Text style={styles.notes}>Observações: {budget.notes}</Text>
          )}
          <Text style={styles.signature}>
            Responsável: {user.signatureText || user.userName}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default BudgetReportPdfContent;