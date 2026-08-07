/* Laudo compacto de Bioquímico — mesmo padrão visual do laudo compacto de
   hemograma (ExamReportPdfContent_Hemograma_OnePage.tsx): cabeçalho da
   clínica, blocos de paciente/tutor e dados do exame lado a lado, barras
   indicadoras nos resultados. Arquivo auto-contido (estilos/helpers
   duplicados de propósito) seguindo a mesma convenção do arquivo do
   hemograma — não compartilha módulo com o laudo genérico.
*/
import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { mockCompanySettings } from "@/mockData/settings";
import { ExamEntry, BiochemicalEntry } from "@/types/exam";

const formatDateToPortuguese = (date: Date) => {
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('pt-BR', options).toUpperCase();
};

// Mesma lógica de normalização de número usada no laudo de hemograma —
// trata "1.250" (milhar) vs "6,5" (decimal) corretamente.
const normalizeNumber = (raw: string | undefined) => {
  if (!raw) return NaN;
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/[^0-9.,]/g, '');
  const lastDotIndex = cleaned.lastIndexOf('.');
  const lastCommaIndex = cleaned.lastIndexOf(',');
  if (lastCommaIndex > lastDotIndex) {
    cleaned = cleaned.replace(/\./g, '');
    cleaned = cleaned.replace(/,/g, '.');
  } else if (lastDotIndex !== -1) {
    const dotCount = (cleaned.match(/\./g) || []).length;
    const decimalsAfterLastDot = cleaned.length - lastDotIndex - 1;
    if (dotCount > 1 || decimalsAfterLastDot === 3) {
      cleaned = cleaned.replace(/\./g, '');
    }
  } else {
    cleaned = cleaned.replace(/,/g, '');
  }
  return parseFloat(cleaned);
};

const INDICATOR_WIDTH = 0.6;
const TEAL = "#0F766E";

const styles = StyleSheet.create({
  page: {
    padding: 34,
    fontFamily: "Helvetica",
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
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.28,
    marginTop: 2,
    marginBottom: 12,
    color: TEAL,
    letterSpacing: 0.5,
  },
  topBlocksRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 12 },
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
  identityRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 2.6 },
  identityLabel: { width: 52, fontSize: 7.2, color: "#6b7280", fontWeight: "700" },
  identityValue: { flex: 1, fontSize: 8.2, color: "#111827", fontWeight: "700" },
  examInfoItem: { width: "100%", flexDirection: "row", alignItems: "baseline", marginBottom: 2.6 },
  examInfoLabel: { width: 86, fontSize: 7.2, color: "#6b7280", fontWeight: "700" },
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
  headerCellSpacer: { width: 6 },
  bioHeaderLine: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 4,
    marginBottom: 7,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: TEAL,
  },
  bioHeaderName: { width: 150, fontSize: 8, fontWeight: "700", color: "#333", paddingLeft: 4 },
  bioHeaderResult: { width: 88, fontSize: 8, fontWeight: "700", color: "#333", textAlign: "right", paddingRight: 6 },
  bioHeaderRef: { width: 165, fontSize: 8, fontWeight: "700", color: "#333", textAlign: "center" },
  leukogramHeaderIndicatorLabel: { width: 86, fontSize: 7.2, fontWeight: "700", textAlign: "center" },
  // Cada enzima é um "grupo" de 2 linhas (resultado + material/metodologia/
  // equipamento) — a borda fica no grupo inteiro, não em cada linha, pra não
  // voltar a parecer "quadrados" separados.
  bioEntryGroup: {
    borderBottomWidth: 0.6,
    borderBottomColor: "#eef0f3",
    paddingTop: 1,
    paddingBottom: 4,
    marginBottom: 3,
  },
  bioRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 16,
  },
  bioNameWrap: { width: 150, paddingLeft: 4, alignItems: "flex-start" },
  bioName: {
    fontSize: 9,
    color: "#0F172A",
    fontWeight: 700,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#EEF2F6",
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  bioResultWrap: { width: 88, flexDirection: "row", alignItems: "baseline", justifyContent: "flex-end", paddingRight: 6 },
  bioResultValue: { fontSize: 9.4, fontWeight: 700, textAlign: "right" },
  bioResultUnit: { fontSize: 7.6, color: "#666", marginLeft: 3 },
  bioRefWrap: { width: 165, alignItems: "center" },
  bioRefText: { fontSize: 8.2, color: "#666", textAlign: "center" },
  bioDetailRow: { flexDirection: "row", paddingLeft: 4, paddingTop: 1.5 },
  bioDetailText: { fontSize: 7.3, color: "#6b7280" },
  indicatorColumn: { width: 86, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  modernIndicatorContainer: { width: 78, height: 14.2, position: 'relative' },
  modernIndicatorTrack: {
    position: 'absolute', left: 0, top: 6, width: 78, height: 5.2, borderRadius: 2.8,
    backgroundColor: '#d8dde6', borderWidth: 0.7, borderColor: '#c4ccd9',
  },
  modernIndicatorSegment: { position: 'absolute', left: 0, top: 6, height: 5.2 },
  modernIndicatorTick: { position: 'absolute', top: 5.2, width: INDICATOR_WIDTH, height: 6.5, backgroundColor: 'rgba(0,0,0,0.25)' },
  modernIndicatorMarker: { position: 'absolute', top: 5.6, width: 6, height: 6, borderRadius: 3, borderWidth: 0.9, borderColor: '#ffffff' },
  resultNormal: { color: "#000000" },
  resultHigh: { color: "#2563eb" },
  resultLow: { color: "#dc3545" },
  strongText: { fontWeight: "bold", fontFamily: "Helvetica-Bold" },
  observationText: { fontSize: 8.8, lineHeight: 1.18, marginBottom: 1 },
  signatureSmall: { fontSize: 7.6, color: "#333", fontStyle: "italic", marginTop: 1, marginBottom: 2 },
  observationBlock: {
    marginTop: 8,
    backgroundColor: "#f5f7fb",
    borderWidth: 1,
    borderColor: "#e2e7f0",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
  },
});

// Mesma barra indicadora (visual/matemática) do laudo de hemograma — só
// reaproveitada aqui, sem alterações.
interface IndicatorBarProps { value: string | undefined; minRef: number; maxRef: number; valueStatus: 'normal' | 'high' | 'low' | 'invalid'; }
const IndicatorBar: React.FC<IndicatorBarProps> = ({ value, minRef, maxRef, valueStatus }) => {
  const BAR_WIDTH = 78;
  const ACTIVE_RANGE_START_PERCENT = 0.25;
  const ACTIVE_RANGE_END_PERCENT = 0.75;
  const numValue = normalizeNumber(value);
  let markerColor = '#64748b';
  if (valueStatus === 'low') markerColor = '#dc3545';
  if (valueStatus === 'normal') markerColor = '#16a34a';
  if (valueStatus === 'high') markerColor = '#2563eb';
  if (isNaN(numValue)) {
    return (
      <View style={styles.modernIndicatorContainer}>
        <View style={styles.modernIndicatorTrack} />
        <View style={[styles.modernIndicatorSegment, { left: 0, width: '25%', backgroundColor: '#f8d3d6', borderTopLeftRadius: 2.6, borderBottomLeftRadius: 2.6 }]} />
        <View style={[styles.modernIndicatorSegment, { left: '25%', width: '50%', backgroundColor: '#d8f1df' }]} />
        <View style={[styles.modernIndicatorSegment, { left: '75%', width: '25%', backgroundColor: '#d8e7ff', borderTopRightRadius: 2.6, borderBottomRightRadius: 2.6 }]} />
        <View style={[styles.modernIndicatorTick, { left: (ACTIVE_RANGE_START_PERCENT * BAR_WIDTH) - (INDICATOR_WIDTH / 2) }]} />
        <View style={[styles.modernIndicatorTick, { left: (ACTIVE_RANGE_END_PERCENT * BAR_WIDTH) - (INDICATOR_WIDTH / 2) }]} />
      </View>
    );
  }
  const activeStartPx = ACTIVE_RANGE_START_PERCENT * BAR_WIDTH;
  const activeEndPx = ACTIVE_RANGE_END_PERCENT * BAR_WIDTH;
  const activeRangeWidthPx = activeEndPx - activeStartPx;
  let ballLeftPosition: number;
  if (minRef === maxRef) {
    if (numValue < minRef) ballLeftPosition = activeStartPx;
    else if (numValue > maxRef) ballLeftPosition = activeEndPx;
    else ballLeftPosition = activeStartPx + (activeRangeWidthPx / 2);
  } else {
    const rangeSpan = maxRef - minRef;
    const proportionalPosition = (numValue - minRef) / rangeSpan;
    ballLeftPosition = activeStartPx + (proportionalPosition * activeRangeWidthPx);
  }
  ballLeftPosition = Math.max(0, Math.min(BAR_WIDTH - 1, ballLeftPosition));

  return (
    <View style={styles.modernIndicatorContainer}>
      <View style={styles.modernIndicatorTrack} />
      <View style={[styles.modernIndicatorSegment, { left: 0, width: '25%', backgroundColor: '#f8d3d6', borderTopLeftRadius: 2.6, borderBottomLeftRadius: 2.6 }]} />
      <View style={[styles.modernIndicatorSegment, { left: '25%', width: '50%', backgroundColor: '#d8f1df' }]} />
      <View style={[styles.modernIndicatorSegment, { left: '75%', width: '25%', backgroundColor: '#d8e7ff', borderTopRightRadius: 2.6, borderBottomRightRadius: 2.6 }]} />
      <View style={[styles.modernIndicatorTick, { left: (ACTIVE_RANGE_START_PERCENT * BAR_WIDTH) - (INDICATOR_WIDTH / 2) }]} />
      <View style={[styles.modernIndicatorTick, { left: (ACTIVE_RANGE_END_PERCENT * BAR_WIDTH) - (INDICATOR_WIDTH / 2) }]} />
      <View style={[styles.modernIndicatorMarker, { left: ballLeftPosition - 3, backgroundColor: markerColor }]} />
    </View>
  );
};

const getBiochemicalValueStatus = (value: string | undefined, minRef: string | undefined, maxRef: string | undefined): 'normal' | 'high' | 'low' | 'invalid' => {
  if (!value || !minRef || !maxRef) return 'invalid';
  const numValue = normalizeNumber(value);
  const numMinRef = normalizeNumber(minRef);
  const numMaxRef = normalizeNumber(maxRef);
  if (isNaN(numValue) || isNaN(numMinRef) || isNaN(numMaxRef)) return 'invalid';
  if (numValue < numMinRef) return 'low';
  if (numValue > numMaxRef) return 'high';
  return 'normal';
};

export interface BioquimicoOnePageData {
  animalName: string;
  animalId: string;
  displayId?: string;
  animalSpecies: string;
  animalBreed?: string;
  tutorName: string;
  tutorAddress: string;
  exam: ExamEntry;
}

export const ExamReportPdfContentBioquimicoOnePage = ({
  animalName, animalId, displayId, animalSpecies, animalBreed, tutorName, tutorAddress, exam,
}: BioquimicoOnePageData) => {
  const patientId = displayId ?? animalId;
  const currentDate = new Date();
  const entries = exam.biochemicalEntries || [];

  const renderBiochemicalParam = (entry: BiochemicalEntry) => {
    const minNum = normalizeNumber(entry.minReference);
    const maxNum = normalizeNumber(entry.maxReference);
    const hasRef = !!(entry.minReference && entry.maxReference && !isNaN(minNum) && !isNaN(maxNum));
    const valueStatus = hasRef ? getBiochemicalValueStatus(entry.result, entry.minReference, entry.maxReference) : 'invalid';
    let resultStyle;
    switch (valueStatus) {
      case 'normal': resultStyle = styles.resultNormal; break;
      case 'high': resultStyle = styles.resultHigh; break;
      case 'low': resultStyle = styles.resultLow; break;
      default: resultStyle = styles.resultNormal;
    }
    const details = [
      entry.material ? `Material: ${entry.material}` : null,
      entry.methodology ? `Metodologia: ${entry.methodology}` : null,
      entry.equipment ? `Equipamento: ${entry.equipment}` : null,
    ].filter(Boolean).join("   ·   ");
    return (
      <View key={entry.id} style={styles.bioEntryGroup} wrap={false}>
        <View style={styles.bioRow}>
          <View style={styles.bioNameWrap}>
            <Text style={styles.bioName}>{entry.enzyme}</Text>
          </View>
          <View style={styles.bioResultWrap}>
            <Text style={[styles.bioResultValue, resultStyle]}>{entry.result}</Text>
            {entry.referenceUnit ? <Text style={styles.bioResultUnit}>{entry.referenceUnit}</Text> : null}
          </View>
          <View style={styles.bioRefWrap}>
            <Text style={styles.bioRefText}>
              {entry.minReference && entry.maxReference
                ? `${entry.minReference} - ${entry.maxReference}${entry.referenceUnit ? ` ${entry.referenceUnit}` : ""}`
                : "-"}
            </Text>
          </View>
          <View style={styles.headerCellSpacer} />
          <View style={styles.indicatorColumn}>
            {hasRef && !isNaN(normalizeNumber(entry.result)) ? (
              <IndicatorBar value={entry.result} minRef={minNum} maxRef={maxNum} valueStatus={valueStatus} />
            ) : null}
          </View>
        </View>
        {details ? (
          <View style={styles.bioDetailRow}>
            <Text style={styles.bioDetailText}>{details}</Text>
          </View>
        ) : null}
      </View>
    );
  };

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

        <Text style={styles.mainTitle}>PERFIL BIOQUÍMICO</Text>

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
              <Text style={styles.identityLabel}>Raça:</Text>
              <Text style={styles.identityValue}>{animalBreed || "-"}</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>Espécie:</Text>
              <Text style={styles.identityValue}>{animalSpecies}</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>Tutor:</Text>
              <Text style={styles.identityValue}>{tutorName}</Text>
            </View>
          </View>

          <View style={styles.topBlock}>
            <View style={styles.examInfoItem}>
              <Text style={styles.examInfoLabel}>Tipo do exame:</Text>
              <Text style={styles.examInfoValue}>{exam.type || "Bioquímico"}</Text>
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
              <Text style={styles.examInfoValue}>{exam.laboratoryDate || "-"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.bioHeaderLine}>
          <Text style={[styles.bioHeaderName, styles.strongText]}>ENZIMA</Text>
          <Text style={[styles.bioHeaderResult, styles.strongText]}>Resultado</Text>
          <Text style={[styles.bioHeaderRef, styles.strongText]}>Referência</Text>
          <View style={styles.headerCellSpacer} />
          <Text style={[styles.leukogramHeaderIndicatorLabel, styles.strongText]}>Indicador</Text>
        </View>

        {entries.length > 0 ? (
          entries.map((entry) => renderBiochemicalParam(entry))
        ) : (
          <Text style={styles.observationText}>Nenhuma enzima registrada.</Text>
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
          <View style={{ marginTop: 36, alignItems: 'center' }}>
            <View style={{ height: 0.7, width: 200, backgroundColor: '#CBD5E1', marginBottom: 5 }} />
            <Text style={[styles.signatureSmall, { fontStyle: 'normal', fontWeight: '700', color: '#111827', fontSize: 9 }]}>{exam.liberadoPor}</Text>
            <Text style={[styles.signatureSmall, { marginTop: 1 }]}>CRMV {mockCompanySettings.crmv} · Liberado em {exam.laboratoryDate ? formatDateToPortuguese(new Date(exam.laboratoryDate)) : formatDateToPortuguese(currentDate)}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default ExamReportPdfContentBioquimicoOnePage;
