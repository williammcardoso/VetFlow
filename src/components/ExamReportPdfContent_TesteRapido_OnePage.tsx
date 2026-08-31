/* Laudo compacto de Teste Rápido (SNAP/imunocromatográfico) — mesmo padrão
   visual dos outros laudos compactos (ExamReportPdfContent_Citologia_OnePage.tsx
   e companhia): cabeçalho da clínica, blocos de paciente/tutor e dados do
   exame lado a lado. Arquivo auto-contido (estilos/helpers duplicados de
   propósito), mesma convenção dos outros — não compartilha módulo com o
   laudo genérico. Diferencial: resultado em destaque (badge verde/vermelho/
   âmbar) — é a informação que mais importa bater o olho num teste rápido.
*/
import React from "react";
import { Document, Page, View, Text, StyleSheet, Font, Image } from "@react-pdf/renderer";
import { mockCompanySettings } from "@/mockData/settings";
import { ExamEntry, RapidTestEntry } from "@/types/exam";

Font.register({
  family: "Inter",
  fonts: [
    { src: '/fonts/Inter-Regular.ttf', fontWeight: 400, format: 'truetype' },
    { src: '/fonts/Inter-Bold.ttf', fontWeight: 700, format: 'truetype' },
  ],
});

const TEAL = "#0F766E";

const RESULT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Positivo: { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" },
  Negativo: { bg: "#ecfdf5", border: "#a7f3d0", text: "#047857" },
  Inconclusivo: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
};

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
  testBlock: {
    marginBottom: 14,
    backgroundColor: "#f7f9fc",
    borderWidth: 1,
    borderColor: "#e5eaf2",
    borderRadius: 4,
    padding: 9,
  },
  testHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  testTitle: { fontSize: 10.2, fontWeight: "bold", color: "#111827" },
  resultBadge: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3 },
  resultBadgeText: { fontSize: 9, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.3 },
  testRow: { flexDirection: "row", gap: 8 },
  testTextCol: { flex: 1 },
  testImage: { width: 110, height: 88, borderRadius: 3, objectFit: "cover", marginLeft: 8 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  detailItem: { minWidth: 110 },
  fieldLabel: { fontSize: 7.4, fontWeight: "700", color: "#6b7280", marginTop: 4, marginBottom: 2, textTransform: "uppercase" },
  fieldValue: { fontSize: 8.6, color: "#1f2937", lineHeight: 1.5 },
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

const formatDateShortBR = (isoDate: string) => {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
};

const MONTHS_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const formatDateLongBR = (isoDate: string) => {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return `${String(d).padStart(2, '0')} DE ${MONTHS_PT[m - 1]?.toUpperCase() ?? m} DE ${y}`;
};

export interface TesteRapidoOnePageData {
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

export const ExamReportPdfContentTesteRapidoOnePage = ({
  animalName, animalId, displayId, animalSpecies, animalBreed, animalGender, animalAge, tutorName, tutorAddress, exam,
}: TesteRapidoOnePageData) => {
  const patientId = displayId ?? animalId;
  const currentDate = new Date();
  const entries: RapidTestEntry[] = exam.rapidTestEntries || [];

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

        <Text style={styles.mainTitle}>LAUDO DE TESTE RÁPIDO</Text>

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
              <Text style={styles.examInfoLabel}>Data do exame:</Text>
              <Text style={styles.examInfoValue}>{exam.date ? formatDateShortBR(exam.date) : "-"}</Text>
            </View>
            <View style={styles.examInfoItem}>
              <Text style={styles.examInfoLabel}>Veterinário:</Text>
              <Text style={styles.examInfoValue}>{exam.vet || "-"}</Text>
            </View>
            <View style={styles.examInfoItem}>
              <Text style={styles.examInfoLabel}>Data resultado:</Text>
              <Text style={styles.examInfoValue}>{exam.laboratoryDate ? formatDateShortBR(exam.laboratoryDate) : "-"}</Text>
            </View>
            <View style={styles.examInfoItem}>
              <Text style={styles.examInfoLabel}>Testes feitos:</Text>
              <Text style={styles.examInfoValue}>{entries.length}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Resultados</Text>

        {entries.length > 0 ? (
          entries.map((entry, idx) => {
            const colors = RESULT_COLORS[entry.result] || RESULT_COLORS.Inconclusivo;
            return (
              <View key={entry.id} style={styles.testBlock} wrap={false}>
                <View style={styles.testHeaderRow}>
                  <Text style={styles.testTitle}>
                    {entries.length > 1 ? `${idx + 1}) ` : ""}{entry.testName}
                  </Text>
                  <View style={[styles.resultBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <Text style={[styles.resultBadgeText, { color: colors.text }]}>{entry.result}</Text>
                  </View>
                </View>
                <View style={styles.testRow}>
                  <View style={styles.testTextCol}>
                    <View style={styles.detailGrid}>
                      {entry.sampleMaterial ? (
                        <View style={styles.detailItem}>
                          <Text style={styles.fieldLabel}>Amostra</Text>
                          <Text style={styles.fieldValue}>{entry.sampleMaterial}</Text>
                        </View>
                      ) : null}
                      {entry.brand ? (
                        <View style={styles.detailItem}>
                          <Text style={styles.fieldLabel}>Marca/Fabricante</Text>
                          <Text style={styles.fieldValue}>{entry.brand}</Text>
                        </View>
                      ) : null}
                      {entry.lot ? (
                        <View style={styles.detailItem}>
                          <Text style={styles.fieldLabel}>Lote</Text>
                          <Text style={styles.fieldValue}>{entry.lot}</Text>
                        </View>
                      ) : null}
                      {entry.expirationDate ? (
                        <View style={styles.detailItem}>
                          <Text style={styles.fieldLabel}>Validade</Text>
                          <Text style={styles.fieldValue}>{formatDateShortBR(entry.expirationDate)}</Text>
                        </View>
                      ) : null}
                    </View>
                    {entry.comentarios ? (
                      <>
                        <Text style={styles.fieldLabel}>Observações</Text>
                        <Text style={styles.fieldValue}>{entry.comentarios}</Text>
                      </>
                    ) : null}
                  </View>
                  {entry.fotoUrl ? <Image src={entry.fotoUrl} style={styles.testImage} /> : null}
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.observationText}>Nenhum teste registrado.</Text>
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

export default ExamReportPdfContentTesteRapidoOnePage;
