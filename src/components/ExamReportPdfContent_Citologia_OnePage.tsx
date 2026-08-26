/* Laudo compacto de Citologia (CAAF) — mesmo padrão visual dos laudos
   compactos de hemograma/bioquímico (ExamReportPdfContent_Hemograma_OnePage.tsx
   / ExamReportPdfContent_Bioquimico_OnePage.tsx): cabeçalho da clínica, blocos
   de paciente/tutor e dados do exame lado a lado. Arquivo auto-contido
   (estilos/helpers duplicados de propósito) seguindo a mesma convenção dos
   outros dois — não compartilha módulo com o laudo genérico.
*/
import React from "react";
import { Document, Page, View, Text, StyleSheet, Font, Image } from "@react-pdf/renderer";
import { mockCompanySettings } from "@/mockData/settings";
import { ExamEntry, CytologyEntry } from "@/types/exam";

// Fonte Inter, igual ao resto do sistema.
Font.register({
  family: "Inter",
  fonts: [
    { src: '/fonts/Inter-Regular.ttf', fontWeight: 400, format: 'truetype' },
    { src: '/fonts/Inter-Bold.ttf', fontWeight: 700, format: 'truetype' },
  ],
});

const TEAL = "#0F766E";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Inter",
    fontSize: 9,
    color: "#333",
    lineHeight: 1.05,
  },
  clinicHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
    paddingBottom: 3,
  },
  ruleTeal: { height: 1.4, backgroundColor: TEAL, marginBottom: 6 },
  clinicInfoLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  clinicName: { fontSize: 12, fontWeight: "bold" },
  clinicDetails: { fontSize: 7.2, color: "#666" },
  clinicAddressPhone: { textAlign: "right", fontSize: 7.2, color: "#666" },
  mainTitle: {
    fontSize: 13,
    textAlign: "center",
    fontWeight: "bold",
    lineHeight: 1.28,
    marginTop: 2,
    marginBottom: 12,
    color: TEAL,
    letterSpacing: 0.5,
  },
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
  identityRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 4 },
  identityLabel: { width: 52, fontSize: 7.2, color: "#6b7280", fontWeight: "700" },
  identityValue: { flex: 1, fontSize: 8.2, color: "#111827", fontWeight: "700" },
  examInfoItem: { width: "100%", flexDirection: "row", alignItems: "baseline", marginBottom: 4 },
  examInfoLabel: { width: 100, fontSize: 7.2, color: "#6b7280", fontWeight: "700" },
  examInfoValue: { flex: 1, fontSize: 8.1, color: "#1f2937", fontWeight: "700" },
  sectionTitle: {
    fontSize: 9.3,
    fontWeight: "bold",
    color: TEAL,
    marginTop: 6,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: TEAL,
    paddingBottom: 3,
  },
  subsectionTitle: { fontSize: 8.6, fontWeight: "bold", marginTop: 2, marginBottom: 2 },
  lesionBlock: {
    marginBottom: 14,
    backgroundColor: "#f7f9fc",
    borderWidth: 1,
    borderColor: "#e5eaf2",
    borderRadius: 4,
    padding: 9,
  },
  lesionTitle: {
    fontSize: 9.4,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 6,
  },
  lesionRow: { flexDirection: "row", gap: 8 },
  lesionTextCol: { flex: 1 },
  lesionImage: { width: 110, height: 88, borderRadius: 3, objectFit: "cover", marginLeft: 8 },
  fieldLabel: { fontSize: 7.4, fontWeight: "700", color: "#6b7280", marginTop: 6, marginBottom: 2, textTransform: "uppercase" },
  fieldValue: { fontSize: 8.6, color: "#1f2937", lineHeight: 1.5 },
  conclusionBox: {
    marginTop: 9,
    marginBottom: 2,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 3,
    paddingHorizontal: 7,
    paddingVertical: 6,
  },
  conclusionLabel: { fontSize: 7.2, fontWeight: "700", color: "#047857", textTransform: "uppercase", marginBottom: 2 },
  conclusionValue: { fontSize: 9.2, fontWeight: "bold", color: "#065f46", lineHeight: 1.4 },
  observationText: { fontSize: 8.8, lineHeight: 1.4, marginBottom: 1 },
  signatureSmall: { fontSize: 7.6, color: "#333", fontStyle: "italic", marginTop: 3, marginBottom: 2 },
  observationBlock: {
    marginTop: 5,
    backgroundColor: "#f5f7fb",
    borderWidth: 1,
    borderColor: "#e2e7f0",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
  },
  strongText: { fontWeight: "bold" },
});

const formatDateToPortuguese = (date: Date) => {
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('pt-BR', options).toUpperCase();
};

// exam.laboratoryDate vem cru do <input type="date"> (formato ISO
// YYYY-MM-DD) — sem isso aparecia "no padrão americano" no laudo.
const formatDateShortBR = (isoDate: string) => {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
};

const MONTHS_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
// Mesma ideia do formatDateShortBR, só que por extenso — nunca passar
// isoDate por `new Date(...)`: em fuso negativo (Brasil, UTC-3) isso
// interpreta a data como meia-noite UTC e volta pro dia anterior (ex.:
// "2026-08-25" virava "24 DE AGOSTO" no "Liberado em").
const formatDateLongBR = (isoDate: string) => {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return `${String(d).padStart(2, '0')} DE ${MONTHS_PT[m - 1]?.toUpperCase() ?? m} DE ${y}`;
};

export interface CitologiaOnePageData {
  animalName: string;
  animalId: string;
  displayId?: string;
  animalSpecies: string;
  animalBreed?: string;
  animalGender?: string;
  animalAge?: string;
  tutorName: string;
  tutorAddress: string;
  exam: ExamEntry;
}

export const ExamReportPdfContentCitologiaOnePage = ({
  animalName, animalId, displayId, animalSpecies, animalBreed, animalGender, animalAge, tutorName, tutorAddress, exam,
}: CitologiaOnePageData) => {
  const patientId = displayId ?? animalId;
  const currentDate = new Date();
  const entries: CytologyEntry[] = exam.cytologyEntries || [];

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.clinicHeader} fixed>
          <View style={styles.clinicInfoLeft}>
            <View>
              <Text style={styles.clinicName}>{mockCompanySettings.companyName}</Text>
              <Text style={styles.clinicDetails}>CRMV {mockCompanySettings.crmv}</Text>
              <Text style={styles.clinicDetails}>Registro no MAPA {mockCompanySettings.mapaRegistration}</Text>
            </View>
          </View>
          <View style={styles.clinicAddressPhone}>
            <Text>{mockCompanySettings.address}</Text>
            <Text>{mockCompanySettings.city} - CEP: {mockCompanySettings.zipCode}</Text>
            <Text>Telefone: {mockCompanySettings.phone}</Text>
          </View>
        </View>
        <View style={styles.ruleTeal} fixed />

        <Text style={styles.mainTitle}>LAUDO CITOPATOLÓGICO (CAAF)</Text>

        <View style={styles.topBlocksRow}>
          <View style={styles.topBlock}>
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>ID:</Text>
              <Text style={styles.identityValue}>{patientId}</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>Nome:</Text>
              <Text style={styles.identityValue}>{animalName}</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>Espécie:</Text>
              <Text style={styles.identityValue}>{animalSpecies}</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>Raça:</Text>
              <Text style={styles.identityValue}>{animalBreed || "-"}</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>Sexo:</Text>
              <Text style={styles.identityValue}>{animalGender || "-"}</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>Idade:</Text>
              <Text style={styles.identityValue}>{animalAge || "-"}</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>Tutor:</Text>
              <Text style={styles.identityValue}>{tutorName}</Text>
            </View>
          </View>

          <View style={styles.topBlock}>
            <View style={styles.examInfoItem}>
              <Text style={styles.examInfoLabel}>Método de coleta:</Text>
              <Text style={styles.examInfoValue}>{exam.metodoColeta || "CAAF"}</Text>
            </View>
            <View style={styles.examInfoItem}>
              <Text style={styles.examInfoLabel}>Nº de lâminas:</Text>
              <Text style={styles.examInfoValue}>{exam.material || "-"}</Text>
            </View>
            {exam.fixador ? (
              <View style={styles.examInfoItem}>
                <Text style={styles.examInfoLabel}>Fixador:</Text>
                <Text style={styles.examInfoValue}>{exam.fixador}</Text>
              </View>
            ) : null}
            <View style={styles.examInfoItem}>
              <Text style={styles.examInfoLabel}>Coloração:</Text>
              <Text style={styles.examInfoValue}>{exam.coloracao || "-"}</Text>
            </View>
            <View style={styles.examInfoItem}>
              <Text style={styles.examInfoLabel}>Veterinário:</Text>
              <Text style={styles.examInfoValue}>{exam.vet || "-"}</Text>
            </View>
            <View style={styles.examInfoItem}>
              <Text style={styles.examInfoLabel}>Laboratório:</Text>
              <Text style={styles.examInfoValue}>{exam.laboratory || "-"}</Text>
            </View>
            <View style={styles.examInfoItem}>
              <Text style={styles.examInfoLabel}>Data resultado:</Text>
              <Text style={styles.examInfoValue}>{exam.laboratoryDate ? formatDateShortBR(exam.laboratoryDate) : "-"}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Achados Citológicos</Text>

        {entries.length > 0 ? (
          entries.map((entry, idx) => (
            <View key={entry.id} style={styles.lesionBlock} wrap={false}>
              <Text style={styles.lesionTitle}>
                {entries.length > 1 ? `${idx + 1}) ` : ""}{entry.localLesao}
              </Text>
              <View style={styles.lesionRow}>
                <View style={styles.lesionTextCol}>
                  <Text style={styles.fieldLabel}>Achados microscópicos</Text>
                  <Text style={styles.fieldValue}>{entry.achadosMicroscopicos}</Text>
                </View>
                {entry.fotoUrl ? <Image src={entry.fotoUrl} style={styles.lesionImage} /> : null}
              </View>
              <View style={styles.conclusionBox}>
                <Text style={styles.conclusionLabel}>Achado citológico</Text>
                <Text style={styles.conclusionValue}>{entry.achadoCitologico}</Text>
              </View>
              {entry.comentarios ? (
                <>
                  <Text style={styles.fieldLabel}>Comentários</Text>
                  <Text style={styles.fieldValue}>{entry.comentarios}</Text>
                </>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.observationText}>Nenhuma lesão registrada.</Text>
        )}

        {exam.nota && (
          <View style={styles.observationBlock}>
            <Text style={[styles.subsectionTitle, styles.strongText]}>Nota:</Text>
            <Text style={styles.observationText}>{exam.nota}</Text>
          </View>
        )}

        {exam.observacoesGeraisExame && (
          <View style={styles.observationBlock}>
            <Text style={[styles.subsectionTitle, styles.strongText]}>Observações Gerais do Exame:</Text>
            <Text style={styles.observationText}>{exam.observacoesGeraisExame}</Text>
          </View>
        )}

        {exam.patologistaResponsavel && (
          <Text style={{ marginTop: 8, fontSize: 8.6, color: "#1f2937", textAlign: "left" }}>
            <Text style={styles.strongText}>Patologista responsável:</Text> {exam.patologistaResponsavel}
          </Text>
        )}

        {exam.liberadoPor && (
          <View style={{ marginTop: 28, alignItems: 'center' }}>
            <View style={{ height: 0.7, width: 200, backgroundColor: '#9AA3AE', marginBottom: 8 }} />
            <Text style={[styles.signatureSmall, { fontStyle: 'normal', fontWeight: '700', color: '#111827', fontSize: 9, marginTop: 0 }]}>{exam.liberadoPor}</Text>
            <Text style={[styles.signatureSmall, { marginTop: 3 }]}>Liberado em {exam.laboratoryDate ? formatDateLongBR(exam.laboratoryDate) : formatDateToPortuguese(currentDate)}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default ExamReportPdfContentCitologiaOnePage;
