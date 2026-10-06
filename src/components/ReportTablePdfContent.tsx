/* PDF genérico dos cartões de Financeiro › Relatórios (vendas por item,
   itens por dia, vendas, recebimentos, compras e saídas): cabeçalho da
   clínica, título + período, seções com tabela e total no fim. Os dados já
   chegam prontos em texto (lib/reportPdfData.ts). */
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
const GRAY = "#6B7280";
const LINE = "#E5E7EB";

export interface ReportPdfColumn {
  label: string;
  /** Ex.: "14%". */
  width: string;
  align?: "left" | "right";
}

export interface ReportPdfRow {
  cells: string[];
  /** Linha menor embaixo da coluna principal (ex.: paciente · tutor). */
  sub?: string;
  tone?: "normal" | "muted" | "negative";
}

export interface ReportPdfSection {
  title?: string;
  /** Texto à direita do título da seção (ex.: "4× · R$ 520,00"). */
  right?: string;
  /** Linha logo abaixo do título (ex.: itens do dia). */
  note?: string;
  /** Colunas próprias desta seção (senão, as do relatório). */
  columns?: ReportPdfColumn[];
  rows: ReportPdfRow[];
}

export interface ReportTablePdfProps {
  title: string;
  periodLabel: string;
  /** Linha abaixo do título (ex.: "51 itens · 22 tipos"). */
  summary?: string;
  columns: ReportPdfColumn[];
  /** Índice da coluna que recebe o `sub` das linhas. */
  mainColumn?: number;
  sections: ReportPdfSection[];
  total?: { label: string; value: string };
  /** Cor do título e dos destaques. */
  accent?: string;
}

const styles = StyleSheet.create({
  page: { padding: 32, paddingBottom: 44, fontFamily: "Inter", fontSize: 9, color: "#1F2937" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: TEAL, paddingBottom: 8, marginBottom: 12 },
  company: { fontSize: 12, fontWeight: 700, color: "#111827" },
  companySub: { fontSize: 7.5, color: GRAY },
  headerRight: { textAlign: "right", fontSize: 7.5, color: GRAY },
  title: { fontSize: 14, fontWeight: 700, textAlign: "center" },
  subtitle: { fontSize: 9, color: GRAY, textAlign: "center", marginTop: 2, marginBottom: 12 },
  section: { marginBottom: 12 },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 3,
  },
  sectionTitle: { fontSize: 10, fontWeight: 700, color: "#111827", maxWidth: "70%" },
  sectionRight: { fontSize: 9.5, fontWeight: 700 },
  note: { fontSize: 8, color: "#374151", marginBottom: 3, paddingHorizontal: 8 },
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#9CA3AF", paddingBottom: 3, marginBottom: 1 },
  thText: { fontSize: 7.5, fontWeight: 700, color: GRAY, textTransform: "uppercase" },
  row: { flexDirection: "row", paddingVertical: 3.5, borderBottomWidth: 0.5, borderBottomColor: LINE },
  cell: { fontSize: 8.6, color: "#111827", paddingRight: 4 },
  sub: { fontSize: 7.4, color: GRAY },
  grand: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 2, paddingTop: 6, marginTop: 4 },
  grandLabel: { fontSize: 11, fontWeight: 700 },
  grandValue: { fontSize: 13, fontWeight: 700 },
  empty: { fontSize: 9, color: GRAY, textAlign: "center", marginTop: 20 },
  footer: { position: "absolute", bottom: 18, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#9CA3AF" },
});

function Table({ columns, rows, mainColumn }: { columns: ReportPdfColumn[]; rows: ReportPdfRow[]; mainColumn: number }) {
  return (
    <>
      <View style={styles.th} wrap={false}>
        {columns.map((c, i) => (
          <Text key={i} style={[styles.thText, { width: c.width, textAlign: c.align ?? "left" }]}>
            {c.label}
          </Text>
        ))}
      </View>
      {rows.map((r, i) => {
        const color = r.tone === "muted" ? "#9CA3AF" : r.tone === "negative" ? "#BE123C" : "#111827";
        return (
          <View key={i} style={styles.row} wrap={false}>
            {columns.map((c, j) => (
              <View key={j} style={{ width: c.width }}>
                <Text
                  style={[
                    styles.cell,
                    { textAlign: c.align ?? "left", color },
                    c.align === "right" ? { fontWeight: 700 } : {},
                    r.tone === "muted" ? { textDecoration: "line-through" } : {},
                  ]}
                >
                  {r.cells[j] ?? ""}
                </Text>
                {j === mainColumn && r.sub ? <Text style={styles.sub}>{r.sub}</Text> : null}
              </View>
            ))}
          </View>
        );
      })}
    </>
  );
}

export function ReportTablePdfContent({
  title,
  periodLabel,
  summary,
  columns,
  mainColumn = 1,
  sections,
  total,
  accent = TEAL,
}: ReportTablePdfProps) {
  const company = mockCompanySettings;
  const today = new Date().toLocaleDateString("pt-BR");
  const hasRows = sections.some((s) => s.rows.length > 0);

  return (
    <Document title={`${title} — ${periodLabel}`}>
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

        <Text style={[styles.title, { color: accent }]}>{title.toUpperCase()}</Text>
        <Text style={styles.subtitle}>
          Período: {periodLabel}
          {summary ? ` · ${summary}` : ""}
        </Text>

        {!hasRows ? (
          <Text style={styles.empty}>Nada no período.</Text>
        ) : (
          sections.map((s, i) => (
            <View key={i} style={styles.section}>
              {s.title ? (
                <View style={styles.sectionHead} wrap={false} minPresenceAhead={48}>
                  <Text style={styles.sectionTitle}>{s.title}</Text>
                  {s.right ? <Text style={[styles.sectionRight, { color: accent }]}>{s.right}</Text> : null}
                </View>
              ) : null}
              {s.note ? <Text style={styles.note}>{s.note}</Text> : null}
              <Table columns={s.columns ?? columns} rows={s.rows} mainColumn={s.columns ? 0 : mainColumn} />
            </View>
          ))
        )}

        {total ? (
          <View style={[styles.grand, { borderTopColor: accent }]} wrap={false}>
            <Text style={styles.grandLabel}>{total.label}</Text>
            <Text style={[styles.grandValue, { color: accent }]}>{total.value}</Text>
          </View>
        ) : null}

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

export default ReportTablePdfContent;
