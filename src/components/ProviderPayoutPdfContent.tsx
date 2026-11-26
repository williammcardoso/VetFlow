/* PDF de repasse a prestadores (Financeiro › Relatórios › Serviços externos):
   vai para a Agrocentro agendar o pagamento. Um prestador ou todos (cada um
   com subtotal), com a observação de cada um (ex.: chave PIX). Item já pago
   antes do fechamento sai marcado "PAGO" e fora do "a pagar". */
import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { mockCompanySettings } from "@/mockData/settings";

Font.register({
  family: "Inter",
  fonts: [
    { src: "/fonts/Inter-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Inter-Bold.ttf", fontWeight: 700 },
  ],
});

const TEAL = "#0F766E";
const ORANGE = "#C2410C";
const GREEN = "#047857";
const GRAY = "#6B7280";
const LINE = "#E5E7EB";

const styles = StyleSheet.create({
  page: { padding: 32, paddingBottom: 44, fontFamily: "Inter", fontSize: 9, color: "#1F2937" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: TEAL, paddingBottom: 8, marginBottom: 12 },
  company: { fontSize: 12, fontWeight: 700, color: "#111827" },
  companySub: { fontSize: 7.5, color: GRAY },
  headerRight: { textAlign: "right", fontSize: 7.5, color: GRAY },
  title: { fontSize: 14, fontWeight: 700, color: ORANGE, textAlign: "center" },
  subtitle: { fontSize: 9, color: GRAY, textAlign: "center", marginTop: 2, marginBottom: 12 },
  provider: { marginBottom: 14 },
  providerHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 4,
  },
  providerName: { fontSize: 11, fontWeight: 700, color: ORANGE },
  providerTotal: { fontSize: 11, fontWeight: 700, color: ORANGE },
  note: {
    borderLeftWidth: 2.5,
    borderLeftColor: TEAL,
    backgroundColor: "#F0FDFA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  noteLabel: { fontSize: 7, fontWeight: 700, color: TEAL, textTransform: "uppercase", marginBottom: 1 },
  noteText: { fontSize: 9, color: "#111827", lineHeight: 1.3 },
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#9CA3AF", paddingBottom: 3, marginBottom: 1 },
  thText: { fontSize: 7.5, fontWeight: 700, color: GRAY, textTransform: "uppercase" },
  row: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: LINE },
  cDate: { width: "13%" },
  cPatient: { width: "33%" },
  cService: { width: "39%" },
  cValue: { width: "15%", textAlign: "right" },
  cellMain: { fontSize: 8.6, color: "#111827" },
  cellSub: { fontSize: 7.4, color: GRAY },
  value: { fontSize: 8.8, fontWeight: 700, textAlign: "right" },
  valuePaid: { color: GRAY },
  paidTag: { fontSize: 7, fontWeight: 700, color: GREEN, textAlign: "right", marginTop: 1 },
  paidSummary: { flexDirection: "row", justifyContent: "flex-end", gap: 10, fontSize: 8, color: GRAY, marginTop: 3 },
  paidSummaryValue: { fontWeight: 700, color: "#111827" },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 2,
    borderTopColor: ORANGE,
    paddingTop: 6,
    marginTop: 4,
  },
  grandLabel: { fontSize: 11, fontWeight: 700 },
  grandValue: { fontSize: 13, fontWeight: 700, color: ORANGE },
  footer: { position: "absolute", bottom: 18, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#9CA3AF" },
});

export interface ProviderPayoutLine {
  date: string;
  patient: string;
  tutor: string;
  service: string;
  quantity: number;
  amount: number;
  /** Quando o repasse junta prestadores (ex.: Unopato + Laboratório externo). */
  provider?: string;
  /** Já pago antes do fechamento (data ISO) — sai do "a pagar". */
  paidAt?: string;
}

export interface ProviderPayoutGroup {
  provider: string;
  note?: string;
  lines: ProviderPayoutLine[];
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const cents = (v: number) => Math.round(v * 100);
/** Total, já pago e a pagar (em centavos para não somar 0,1 + 0,2 errado). */
const sums = (lines: ProviderPayoutLine[]) => {
  const total = lines.reduce((s, l) => s + cents(l.amount), 0);
  const paid = lines.reduce((s, l) => s + (l.paidAt ? cents(l.amount) : 0), 0);
  return { total: total / 100, paid: paid / 100, toPay: (total - paid) / 100 };
};
const dateBR = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

export function ProviderPayoutPdfContent({ groups, periodLabel }: { groups: ProviderPayoutGroup[]; periodLabel: string }) {
  const company = mockCompanySettings;
  const single = groups.length === 1;
  const all = sums(groups.flatMap((g) => g.lines));
  const count = groups.reduce((s, g) => s + g.lines.length, 0);
  const today = new Date().toLocaleDateString("pt-BR");
  const title = single ? `REPASSE — ${groups[0].provider.toUpperCase()}` : "REPASSES A PRESTADORES";

  return (
    <Document title={single ? `Repasse ${groups[0].provider} — ${periodLabel}` : `Repasses a prestadores — ${periodLabel}`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.company}>{company.companyName}</Text>
            {company.crmv ? <Text style={styles.companySub}>CRMV {company.crmv}</Text> : null}
          </View>
          <View style={styles.headerRight}>
            {company.address ? <Text>{company.address}</Text> : null}
            {company.phone ? <Text>Telefone: {company.phone}</Text> : null}
          </View>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          Período: {periodLabel} · {count} {count === 1 ? "serviço" : "serviços"} · para agendamento do pagamento
        </Text>

        {groups.map((g) => {
          const sub = sums(g.lines);
          return (
            <View key={g.provider} style={styles.provider}>
              <View style={styles.providerHead} wrap={false}>
                <Text style={styles.providerName}>{g.provider}</Text>
                <Text style={[styles.providerTotal, sub.toPay === 0 && sub.paid > 0 ? { color: GREEN } : {}]}>
                  {sub.toPay === 0 && sub.paid > 0 ? "PAGO" : brl(sub.toPay)}
                </Text>
              </View>
              {g.note ? (
                <View style={styles.note} wrap={false}>
                  <Text style={styles.noteLabel}>Observação</Text>
                  <Text style={styles.noteText}>{g.note}</Text>
                </View>
              ) : null}
              <View style={styles.th}>
                <Text style={[styles.thText, styles.cDate]}>Data</Text>
                <Text style={[styles.thText, styles.cPatient]}>Paciente · tutor</Text>
                <Text style={[styles.thText, styles.cService]}>Serviço</Text>
                <Text style={[styles.thText, styles.cValue]}>Valor</Text>
              </View>
              {g.lines.map((l, i) => (
                <View key={i} style={styles.row} wrap={false}>
                  <Text style={[styles.cellMain, styles.cDate]}>{dateBR(l.date)}</Text>
                  <View style={styles.cPatient}>
                    <Text style={styles.cellMain}>{l.patient}</Text>
                    <Text style={styles.cellSub}>{l.tutor}</Text>
                  </View>
                  <View style={styles.cService}>
                    <Text style={styles.cellMain}>
                      {l.service}
                      {l.quantity > 1 ? ` × ${l.quantity}` : ""}
                    </Text>
                    {l.provider ? <Text style={styles.cellSub}>{l.provider}</Text> : null}
                  </View>
                  <View style={styles.cValue}>
                    <Text style={[styles.value, l.paidAt ? styles.valuePaid : {}]}>{brl(l.amount)}</Text>
                    {l.paidAt ? <Text style={styles.paidTag}>PAGO em {dateBR(l.paidAt)}</Text> : null}
                  </View>
                </View>
              ))}
              {sub.paid > 0 ? (
                <View style={styles.paidSummary} wrap={false}>
                  <Text>
                    Total <Text style={styles.paidSummaryValue}>{brl(sub.total)}</Text>
                  </Text>
                  <Text>
                    Já pago <Text style={[styles.paidSummaryValue, { color: GREEN }]}>{brl(sub.paid)}</Text>
                  </Text>
                  <Text>
                    A pagar <Text style={[styles.paidSummaryValue, { color: ORANGE }]}>{brl(sub.toPay)}</Text>
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}

        {all.paid > 0 ? (
          <View style={[styles.paidSummary, { marginTop: 6 }]} wrap={false}>
            <Text>
              Total dos serviços <Text style={styles.paidSummaryValue}>{brl(all.total)}</Text>
            </Text>
            <Text>
              Já pago antes do fechamento <Text style={[styles.paidSummaryValue, { color: GREEN }]}>− {brl(all.paid)}</Text>
            </Text>
          </View>
        ) : null}
        <View style={styles.grand} wrap={false}>
          <Text style={styles.grandLabel}>
            {all.paid > 0 ? (single ? "Total a pagar" : "Total a pagar (todos os prestadores)") : single ? "Total a repassar" : "Total a repassar (todos os prestadores)"}
          </Text>
          <Text style={styles.grandValue}>{brl(all.toPay)}</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            {company.companyName} · Gerado em {today}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export default ProviderPayoutPdfContent;
