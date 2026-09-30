/* Laudo do exame montado em blocos (tipo "Outro" — ex.: contagem de
   reticulócitos — e tipos genéricos como Urinálise/Fezes). Mesmo padrão
   visual do laudo compacto de bioquímico: cabeçalho da clínica, blocos de
   paciente e exame, resultados com cor/seta (azul ↑ acima, vermelho ↓
   abaixo, como nos outros laudos). Arquivo auto-contido, na convenção dos
   demais PDFs de exame. */
import React from "react";
import { Document, Page, View, Text, StyleSheet, Font, Image } from "@react-pdf/renderer";
import { mockCompanySettings } from "@/mockData/settings";
import type { ExamEntry } from "@/types/exam";
import { analitoReference, analitoStatus, examDisplayName, reportBlocks } from "@/lib/customExam";

Font.register({
  family: "Inter",
  fonts: [
    { src: "/fonts/Inter-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Inter-Bold.ttf", fontWeight: 700 },
  ],
});

const WATERMARK_PET_STYLE = { position: "absolute" as const, left: 97.6, top: 276.6, width: 400, opacity: 0.16 };
const TEAL = "#0F766E";
const HIGH = "#2563eb";
const LOW = "#dc3545";

const MONTHS_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const formatDateShortBR = (iso?: string) => {
  const [y, m, d] = (iso || "").split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso || "-";
};
const formatDateLongBR = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")} DE ${MONTHS_PT[m - 1]?.toUpperCase() ?? m} DE ${y}`;
};

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: "Inter", fontSize: 9, color: "#333", lineHeight: 1.1 },
  clinicHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3, paddingBottom: 3 },
  clinicName: { fontSize: 12, fontWeight: "bold" },
  clinicDetails: { fontSize: 7.2, color: "#666" },
  clinicAddressPhone: { textAlign: "right", fontSize: 7.2, color: "#666" },
  ruleTeal: { height: 1.4, backgroundColor: TEAL, marginBottom: 6 },
  mainTitle: { fontSize: 13, textAlign: "center", fontWeight: "bold", lineHeight: 1.28, marginTop: 2, marginBottom: 10, color: TEAL, letterSpacing: 0.5 },
  topBlocksRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  topBlock: {
    width: "49%",
    backgroundColor: "#f7f9fc",
    borderWidth: 1,
    borderColor: "#e5eaf2",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingTop: 5,
    paddingBottom: 4,
  },
  row: { flexDirection: "row", alignItems: "baseline", marginBottom: 2.6 },
  label: { width: 64, fontSize: 7.2, color: "#6b7280", fontWeight: 700 },
  value: { flex: 1, fontSize: 8.2, color: "#111827", fontWeight: 700 },
  methodLine: { fontSize: 8, color: "#374151", marginBottom: 6 },
  tableHead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: TEAL, paddingBottom: 3, marginTop: 2, marginBottom: 2 },
  th: { fontSize: 7.8, fontWeight: 700, color: "#333" },
  colName: { width: "36%", paddingLeft: 4 },
  colResult: { width: "22%", textAlign: "right", paddingRight: 10 },
  colRef: { width: "42%" },
  analitoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4, borderBottomWidth: 0.6, borderBottomColor: "#eef0f3" },
  analitoName: { fontSize: 9, color: "#0F172A", fontWeight: 700 },
  analitoResult: { fontSize: 9.6, fontWeight: 700, textAlign: "right" },
  analitoUnit: { fontSize: 7.6, color: "#666", fontWeight: 400 },
  analitoRef: { fontSize: 8, color: "#555" },
  sectionTitle: {
    fontSize: 9.3,
    fontWeight: "bold",
    color: TEAL,
    marginTop: 8,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: TEAL,
    paddingBottom: 3,
  },
  // Texto do resultado (conclusão...) com faixa verde à esquerda: é o que o tutor procura.
  textBlock: { marginTop: 8, paddingLeft: 8, paddingVertical: 2, borderLeftWidth: 2.2, borderLeftColor: TEAL },
  textTitle: { fontSize: 8, fontWeight: 700, color: TEAL, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.4 },
  textBody: { fontSize: 9.6, color: "#111827", lineHeight: 1.3, fontWeight: 700 },
  refBlock: {
    marginTop: 8,
    backgroundColor: "#f5f7fb",
    borderWidth: 1,
    borderColor: "#e2e7f0",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  refTitle: { fontSize: 8, fontWeight: 700, color: "#374151", marginBottom: 2 },
  refBody: { fontSize: 8, color: "#4b5563", lineHeight: 1.35 },
  observationBlock: {
    marginTop: 8,
    backgroundColor: "#f5f7fb",
    borderWidth: 1,
    borderColor: "#e2e7f0",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
  },
  obsTitle: { fontSize: 8.6, fontWeight: 700, marginBottom: 2 },
  obsText: { fontSize: 8.8, lineHeight: 1.18 },
  signatureSmall: { fontSize: 7.6, color: "#555", marginTop: 1, marginBottom: 2 },
});

export interface OutrosOnePageData {
  animalName: string;
  animalId: string;
  displayId?: string;
  animalSpecies: string;
  animalBreed?: string;
  tutorName: string;
  tutorAddress?: string;
  exam: ExamEntry;
}

export const ExamReportPdfContentOutrosOnePage = ({ animalName, animalId, displayId, animalSpecies, animalBreed, tutorName, exam }: OutrosOnePageData) => {
  const blocks = reportBlocks(exam.customBlocks);
  const name = examDisplayName(exam);
  // Cabeçalho da tabela antes de cada grupo de analitos seguidos.
  const firstOfGroup = new Set(
    blocks.filter((b, i) => b.kind === "analito" && (i === 0 || blocks[i - 1].kind !== "analito")).map((b) => b.id)
  );
  const methodLine = [exam.metodo ? `Método: ${exam.metodo}` : null, exam.material ? `Amostra: ${exam.material}` : null].filter(Boolean).join("   ·   ");

  return (
    <Document title={`${name} — ${animalName}`}>
      <Page size="A4" style={styles.page} wrap>
        <Image src="/watermark-pet.png" style={WATERMARK_PET_STYLE} fixed />
        <View style={styles.clinicHeader} fixed>
          <View>
            <Text style={styles.clinicName}>{mockCompanySettings.companyName}</Text>
            <Text style={styles.clinicDetails}>CRMV {mockCompanySettings.crmv}</Text>
            <Text style={styles.clinicDetails}>Registro no MAPA {mockCompanySettings.mapaRegistration}</Text>
          </View>
          <View style={styles.clinicAddressPhone}>
            <Text>{mockCompanySettings.address}</Text>
            <Text>
              {mockCompanySettings.city} - CEP: {mockCompanySettings.zipCode}
            </Text>
            <Text>Telefone: {mockCompanySettings.phone}</Text>
          </View>
        </View>
        <View style={styles.ruleTeal} fixed />

        <Text style={styles.mainTitle}>{name.toUpperCase()}</Text>

        <View style={styles.topBlocksRow}>
          <View style={styles.topBlock}>
            <View style={styles.row}>
              <Text style={styles.label}>ID:</Text>
              <Text style={styles.value}>{displayId ?? animalId}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Nome:</Text>
              <Text style={styles.value}>{animalName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Espécie:</Text>
              <Text style={styles.value}>{animalSpecies}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Raça:</Text>
              <Text style={styles.value}>{animalBreed || "-"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tutor:</Text>
              <Text style={styles.value}>{tutorName}</Text>
            </View>
          </View>
          <View style={styles.topBlock}>
            <View style={styles.row}>
              <Text style={styles.label}>Exame:</Text>
              <Text style={styles.value}>{name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Veterinário:</Text>
              <Text style={styles.value}>{exam.vet || "-"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Laboratório:</Text>
              <Text style={styles.value}>{exam.laboratory || "-"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Coleta:</Text>
              <Text style={styles.value}>{formatDateShortBR(exam.date)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Resultado:</Text>
              <Text style={styles.value}>{exam.laboratoryDate ? formatDateShortBR(exam.laboratoryDate) : "-"}</Text>
            </View>
          </View>
        </View>

        {methodLine ? <Text style={styles.methodLine}>{methodLine}</Text> : null}

        {blocks.map((b) => {
          if (b.kind === "secao") {
            return (
              <Text key={b.id} style={styles.sectionTitle}>
                {b.title}
              </Text>
            );
          }
          if (b.kind === "texto") {
            return (
              <View key={b.id} style={styles.textBlock} wrap={false}>
                {b.title ? <Text style={styles.textTitle}>{b.title}</Text> : null}
                <Text style={styles.textBody}>{b.text}</Text>
              </View>
            );
          }
          if (b.kind === "referencia") {
            return (
              <View key={b.id} style={styles.refBlock} wrap={false}>
                {b.title ? <Text style={styles.refTitle}>{b.title}</Text> : null}
                <Text style={styles.refBody}>{b.text}</Text>
              </View>
            );
          }
          const s = analitoStatus(b);
          const color = s === "high" ? HIGH : s === "low" ? LOW : "#000000";
          return (
            <View key={b.id} wrap={false}>
              {firstOfGroup.has(b.id) && (
                <View style={styles.tableHead}>
                  <Text style={[styles.th, styles.colName]}>ANALITO</Text>
                  <Text style={[styles.th, styles.colResult]}>Resultado</Text>
                  <Text style={[styles.th, styles.colRef]}>Referência</Text>
                </View>
              )}
              <View style={styles.analitoRow}>
                <View style={styles.colName}>
                  <Text style={styles.analitoName}>{b.name}</Text>
                </View>
                <View style={styles.colResult}>
                  <Text style={[styles.analitoResult, { color }]}>
                    {b.result}
                    {s === "high" ? " ↑" : s === "low" ? " ↓" : ""}
                    {b.unit ? <Text style={styles.analitoUnit}> {b.unit}</Text> : null}
                  </Text>
                </View>
                <View style={styles.colRef}>
                  <Text style={styles.analitoRef}>{analitoReference(b) || "-"}</Text>
                </View>
              </View>
            </View>
          );
        })}

        {exam.nota ? (
          <View style={styles.observationBlock} wrap={false}>
            <Text style={styles.obsTitle}>Nota:</Text>
            <Text style={styles.obsText}>{exam.nota}</Text>
          </View>
        ) : null}

        {exam.observacoesGeraisExame ? (
          <View style={styles.observationBlock} wrap={false}>
            <Text style={styles.obsTitle}>Observações:</Text>
            <Text style={styles.obsText}>{exam.observacoesGeraisExame}</Text>
          </View>
        ) : null}

        {exam.liberadoPor ? (
          <View style={{ marginTop: 28, alignItems: "center" }} wrap={false}>
            <View style={{ height: 0.7, width: 200, backgroundColor: "#9AA3AE", marginBottom: 8 }} />
            <Text style={[styles.signatureSmall, { fontWeight: 700, color: "#111827", fontSize: 9, marginTop: 0 }]}>
              {exam.liberadoPor}
            </Text>
            <Text style={[styles.signatureSmall, { marginTop: 3 }]}>
              CRMV {mockCompanySettings.crmv}
              {exam.laboratoryDate ? ` · Liberado em ${formatDateLongBR(exam.laboratoryDate)}` : ""}
            </Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
};

export default ExamReportPdfContentOutrosOnePage;
