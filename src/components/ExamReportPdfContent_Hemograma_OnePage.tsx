/* Cópia do modelo original otimizada para caber em 1 página A4.
   NÃO altera o arquivo original. Mantém toda a lógica e campos (relativos/absolutos).
   Ajustes apenas de estilos e espaçamentos para compactação.
*/
import React from "react";
import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import { mockCompanySettings } from "@/mockData/settings";
import { ExamEntry, HemogramReference, HemogramReferenceValue, ExamReportData, BiochemicalEntry } from "@/types/exam";

// Registrar fonte Exo (mesma família)
// Usaremos fonte padrão Helvetica para visual mais técnico/minimalista.

// Helpers (copiados do original para garantir mesma lógica)
const formatDateToPortuguese = (date: Date) => {
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
  const formattedDate = date.toLocaleDateString('pt-BR', options);
  return formattedDate.toUpperCase();
};

const normalizeNumber = (raw: string | undefined) => {
  if (!raw) return NaN;
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/[^0-9.,]/g, '');
  const lastDotIndex = cleaned.lastIndexOf('.');
  const lastCommaIndex = cleaned.lastIndexOf(',');
  if (lastCommaIndex > lastDotIndex) {
    cleaned = cleaned.replace(/\./g, '');
    cleaned = cleaned.replace(/,/g, '.');
  } else {
    cleaned = cleaned.replace(/,/g, '');
    cleaned = cleaned.replace(/\.(?=[^.]*\.)/g, '');
  }
  return parseFloat(cleaned);
};

const parseLeukocyteReferenceParts = (refString: string | undefined) => {
  if (!refString || refString === 'N/A' || refString.trim() === '') {
    return { val1: '', sep: '', val2: '', unit: '' };
  }
  const trimmedRefString = refString.trim();
  const rangeWithUnitMatch = trimmedRefString.match(/^(\S+)\s*-\s*(\S+)\s*(\S*)$/);
  if (rangeWithUnitMatch) {
    return {
      val1: rangeWithUnitMatch[1],
      sep: '-',
      val2: rangeWithUnitMatch[2],
      unit: rangeWithUnitMatch[3] || ''
    };
  }
  const valueWithUnitMatch = trimmedRefString.match(/^(\S+)\s*(\S*)$/);
  if (valueWithUnitMatch) {
    return {
      val1: valueWithUnitMatch[1],
      sep: '',
      val2: '',
      unit: valueWithUnitMatch[2] || ''
    };
  }
  if (trimmedRefString.includes('/ raros')) {
    return { val1: '', sep: '/', val2: 'raros', unit: '' };
  }
  return { val1: trimmedRefString, sep: '', val2: '', unit: '' };
};

const parseMinMaxFromReferenceString = (refString: string | undefined): { min: number; max: number } | undefined => {
  if (!refString) return undefined;
  const trimmedRefString = refString.trim();
  const match = trimmedRefString.match(/^(\S+)\s*-\s*(\S+)/);
  if (match) {
    const min = normalizeNumber(match[1]);
    const max = normalizeNumber(match[2]);
    if (!isNaN(min) && !isNaN(max)) {
      return { min, max };
    }
  }
  const singleValue = normalizeNumber(trimmedRefString);
  if (!isNaN(singleValue)) {
    return { min: singleValue, max: singleValue };
  }
  return undefined;
};

const INDICATOR_WIDTH = 0.6;

// Estilos compactados (diferenças intencionais para caber em 1 página)
const styles = StyleSheet.create({
  page: {
    // Margens de impressão ajustadas (~1,2 cm)
    padding: 34,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#333",
    lineHeight: 1.05,
  },
  clinicHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  clinicInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clinicName: {
    fontSize: 12,
    fontWeight: "bold",
  },
  clinicDetails: {
    fontSize: 7.2,
    color: "#666",
  },
  clinicAddressPhone: {
    textAlign: "right",
    fontSize: 7.2,
    color: "#666",
  },
  mainTitle: {
    fontSize: 13,
    textAlign: "center",
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.28,
    marginTop: 2,
    marginBottom: 12,
  },
  identityPanel: {
    marginBottom: 0,
  },
  identityColumn: {
    width: "100%",
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 2.6,
  },
  identityLabel: {
    width: 52,
    fontSize: 7.2,
    color: "#6b7280",
    fontWeight: "700",
  },
  identityValue: {
    flex: 1,
    fontSize: 8.2,
    color: "#111827",
    fontWeight: "700",
  },
  examInfoPanel: {
    marginBottom: 0,
  },
  examInfoItem: {
    width: "100%",
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 2.6,
    paddingRight: 0,
  },
  examInfoLabel: {
    width: 86,
    fontSize: 7.2,
    color: "#6b7280",
    fontWeight: "700",
  },
  examInfoValue: {
    flex: 1,
    fontSize: 8.1,
    color: "#1f2937",
    fontWeight: "700",
  },
  infoSectionContainer: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  infoCard: {
    flex: 1,
    borderWidth: 0, // Removidas bordas para layout clean
    borderColor: "#fff",
    borderRadius: 0,
    padding: 2,
  },
  infoTitle: {
    fontSize: 10,
    fontWeight: "bold",
  },
  infoText: {
    fontSize: 8.1,
    marginBottom: 0.5,
  },
  sectionTitle: {
    fontSize: 9.3,
    fontWeight: "bold",
    marginTop: 6,
    marginBottom: 4,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 3,
  },
  subsectionTitle: {
    fontSize: 8.6,
    fontWeight: "bold",
    marginTop: 2,
    marginBottom: 2,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 3,
    marginBottom: 3,
    backgroundColor: "#f8f8f8",
  },
  headerCell: {
    fontSize: 8,
    fontWeight: "700",
    color: "#333",
    textAlign: "left",
    paddingLeft: 4,
  },
  // Grade fixa principal (nome / resultado / referência / indicador)
  headerCellName: { width: 108 },
  headerCellResult: { width: 94, textAlign: "right" },
  headerCellReference: { width: 222, textAlign: "center" },
  headerCellSpacer: { width: 6 },
  headerCellIndicator: { width: 86, textAlign: "center" },
  leukogramHeaderLine: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 12,
    marginBottom: 7,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  leukogramHeaderTitle: { width: 108, fontSize: 10.2, fontWeight: "700", paddingLeft: 4 },
  leukogramHeaderResultLabels: { width: 94, flexDirection: 'row', alignItems: 'flex-end' },
  leukogramHeaderResultLabelText: { width: '50%', fontSize: 7, fontWeight: "700", textAlign: 'center' },
  leukogramHeaderReferenceLabels: { width: 222, flexDirection: 'row', alignItems: 'flex-end' },
  leukogramRefLabelWrapper: { width: '50%' },
  leukogramHeaderLabelTextRightWithPadding: { fontSize: 7.2, fontWeight: "700", textAlign: 'right', paddingRight: 18 },
  leukogramHeaderLabelTextCentered: { fontSize: 7.2, fontWeight: "700", textAlign: 'center' },
  leukogramHeaderIndicatorLabel: { width: 86, fontSize: 7.2, fontWeight: "700", textAlign: "center" },
  eritrogramPlaquetogramHeaderLine: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 12,
    marginBottom: 7,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  eritrogramPlaquetogramHeaderTitle: { width: 122, fontSize: 10.2, fontWeight: "700", paddingLeft: 4 },
  eritrogramPlaquetogramHeaderResultLabel: { width: 94, fontSize: 8.2, fontWeight: "700", textAlign: 'left' },
  eritrogramPlaquetogramHeaderReferenceLabel: { width: 210, fontSize: 8.2, fontWeight: "700", textAlign: 'center' },
  paramRow: { flexDirection: "row", alignItems: "center", marginBottom: 0, minHeight: 16 },
  paramName: { width: 108, fontSize: 8.4, color: "#333", paddingLeft: 4 },
  paramResultContainer: { width: 94, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  paramResultValueWrapper: { width: 72, flexDirection: 'row', justifyContent: 'flex-end', paddingLeft: 8 },
  paramResultUnitWrapper: { width: 22, flexDirection: 'row', justifyContent: 'flex-start' },
  paramResultValue: { fontSize: 9.2, fontWeight: "700", textAlign: "right" },
  paramResultUnit: { fontSize: 8.3, color: "#666", textAlign: 'left' },
  leukocyteResultContainer: { width: 94, flexDirection: 'row', alignItems: 'center' },
  leukocyteResultValueCell: { flex: 1, justifyContent: 'flex-end', paddingRight: 2, minHeight: 15 },
  leukocyteResultUnitCell: { width: 14, justifyContent: 'center', minHeight: 15 },
  leukocyteResultUnitCellAbs: { width: 20, justifyContent: 'center', minHeight: 15 },
  leukocyteResultValue: { fontSize: 9.2, fontWeight: "700", textAlign: "right" },
  leukocyteResultUnit: { fontSize: 8.3, color: "#666", textAlign: 'center' },
  referenceContainer: { width: 222, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  leukocyteReferenceSubContainer: { width: 110, flexDirection: 'row', alignItems: 'center' },
  leukocyteReferenceSubContainerRelative: { justifyContent: 'flex-end' },
  leukocyteReferenceSeparator: { width: 6, minHeight: 15, justifyContent: 'center', alignItems: 'center' },
  leukocyteRefValCellRelative: { width: 26, justifyContent: 'flex-end', paddingRight: 4, minHeight: 15 },
  leukocyteRefSepCell: { width: 12, justifyContent: 'center', minHeight: 15 },
  leukocyteRefValCellAbsolute: { width: 30, justifyContent: 'flex-end', paddingRight: 4, minHeight: 15 },
  leukocyteRefUnitCellRelative: { width: 22, justifyContent: 'center', paddingLeft: 2, minHeight: 15 },
  leukocyteRefUnitCellAbsolute: { width: 22, justifyContent: 'center', paddingLeft: 2, minHeight: 15 },
  refPartText: { fontSize: 9, color: "#666", lineHeight: 1, flexShrink: 0, flexGrow: 0 },
  refTextRight: { textAlign: 'right' },
  refTextCenter: { textAlign: 'center' },
  hemogramRefValWrapper: { width: 26, flexDirection: 'row', justifyContent: 'flex-end' },
  hemogramRefValWrapperPlaquetogram: { width: 34 },
  hemogramRefPartSepText: { width: 12, textAlign: 'center', fontSize: 9, color: "#666", lineHeight: 1 },
  hemogramRefUnitWrapper: { width: 24, flexDirection: 'row', justifyContent: 'flex-start' },
  hemogramRefSpacer: { width: 4 },
  indicatorColumn: { width: 86, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  modernIndicatorContainer: { width: 78, height: 14.2, position: 'relative' },
  modernIndicatorTrack: {
    position: 'absolute',
    left: 0,
    top: 6,
    width: 78,
    height: 5.2,
    borderRadius: 2.8,
    backgroundColor: '#d8dde6',
    borderWidth: 0.7,
    borderColor: '#c4ccd9',
  },
  modernIndicatorSegment: {
    position: 'absolute',
    left: 0,
    top: 6,
    height: 5.2,
  },
  modernIndicatorFill: {
    position: 'absolute',
    left: 0,
    top: 6,
    height: 5.2,
    borderRadius: 2.8,
    opacity: 0.42,
  },
  modernIndicatorTick: {
    position: 'absolute',
    top: 5.2,
    width: INDICATOR_WIDTH,
    height: 6.5,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  modernIndicatorPointer: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 3.6,
    borderRightWidth: 3.6,
    borderBottomWidth: 5.3,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    top: 0.3,
  },
  modernIndicatorDot: {
    position: 'absolute',
    top: 5.1,
    width: 3.7,
    height: 3.7,
    borderRadius: 1.85,
    backgroundColor: '#fff',
    borderWidth: 0.8,
    borderColor: '#6b7280',
  },
  fixedIndicator: { position: 'absolute', width: INDICATOR_WIDTH, height: '100%', backgroundColor: '#000000', top: 0 },
  resultNormal: { color: "#000000" },
  resultHigh: { color: "#2563eb" },
  resultLow: { color: "#dc3545" },
  strongText: { fontWeight: "bold", fontFamily: "Helvetica-Bold" },
  observationText: { fontSize: 8.8, lineHeight: 1.18, marginBottom: 1 },
  signatureSmall: { fontSize: 7.6, color: "#333", fontStyle: "italic", marginTop: 1, marginBottom: 2 },
  biochemicalEnzymeHeader: { backgroundColor: '#f6f6f6', paddingVertical: 2, marginBottom: 4, marginTop: 10 },
  biochemicalEnzymeName: { fontSize: 10, fontWeight: '700', color: '#333', paddingLeft: 8 },
  biochemicalResultLine: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 2, paddingLeft: 8 },
  biochemicalResultLabel: { fontSize: 9, fontWeight: '700', width: 56, color: '#333' },
  biochemicalResultValue: { fontSize: 9, fontWeight: '700', color: '#000', width: 48 },
  biochemicalResultUnit: { fontSize: 8.5, color: '#444', width: 28 },
  biochemicalReferenceLabel: { fontSize: 8.5, color: '#666', marginLeft: 4, width: 28 },
  biochemicalReferenceRange: { fontSize: 8.5, color: '#666', flex: 1 },
  biochemicalDetailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 1, paddingLeft: 8 },
  biochemicalDetailLabel: { fontSize: 8.5, fontWeight: '700', width: 76, color: '#333' },
  biochemicalDetailValue: { fontSize: 8.5, color: '#444', flex: 1 },
  observationBlock: {
    marginTop: 5,
    backgroundColor: "#f5f7fb",
    borderWidth: 1,
    borderColor: "#e2e7f0",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
  },
  noteBlock: {
    marginTop: 6,
    backgroundColor: "#eef4ff",
    borderWidth: 1,
    borderColor: "#d3e1ff",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
  },
  dualNotesRow: {
    marginTop: 4,
    flexDirection: "row",
    gap: 6,
  },
  topBlocksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
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
});

// IndicatorBar (mesma lógica, tamanhos reduzidos) — atualizado visual 3D/mais moderno
interface IndicatorBarProps { value: string | undefined; minRef: number; maxRef: number; valueStatus: 'normal' | 'high' | 'low' | 'invalid'; }
const IndicatorBar: React.FC<IndicatorBarProps> = ({ value, minRef, maxRef, valueStatus }) => {
  const BAR_WIDTH = 78;
  const ACTIVE_RANGE_START_PERCENT = 0.25;
  const ACTIVE_RANGE_END_PERCENT = 0.75;
  const numValue = normalizeNumber(value);
  let pointerColor = '#64748b';
  if (valueStatus === 'low') pointerColor = '#dc3545';
  if (valueStatus === 'normal') pointerColor = '#16a34a';
  if (valueStatus === 'high') pointerColor = '#2563eb';
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

  let fillColor = '#94a3b8';
  if (valueStatus === 'low') fillColor = '#ef4444';
  if (valueStatus === 'normal') fillColor = '#22c55e';
  if (valueStatus === 'high') fillColor = '#2563eb';

  return (
    <View style={styles.modernIndicatorContainer}>
      <View style={styles.modernIndicatorTrack} />
      <View style={[styles.modernIndicatorSegment, { left: 0, width: '25%', backgroundColor: '#f8d3d6', borderTopLeftRadius: 2.6, borderBottomLeftRadius: 2.6 }]} />
      <View style={[styles.modernIndicatorSegment, { left: '25%', width: '50%', backgroundColor: '#d8f1df' }]} />
      <View style={[styles.modernIndicatorSegment, { left: '75%', width: '25%', backgroundColor: '#d8e7ff', borderTopRightRadius: 2.6, borderBottomRightRadius: 2.6 }]} />
      <View style={[styles.modernIndicatorFill, { width: ballLeftPosition + 1, backgroundColor: fillColor }]} />
      <View style={[styles.modernIndicatorTick, { left: (ACTIVE_RANGE_START_PERCENT * BAR_WIDTH) - (INDICATOR_WIDTH / 2) }]} />
      <View style={[styles.modernIndicatorTick, { left: (ACTIVE_RANGE_END_PERCENT * BAR_WIDTH) - (INDICATOR_WIDTH / 2) }]} />
      <View style={[styles.modernIndicatorPointer, { left: ballLeftPosition - 4, borderBottomColor: pointerColor }]} />
      <View style={[styles.modernIndicatorDot, { left: ballLeftPosition - 2.1 }]} />
    </View>
  );
};

interface LocalExamReportData extends ExamReportData {
  animalBreed?: string;
}

export const ExamReportPdfContentHemogramaOnePage = ({
  animalName, animalId, displayId, animalSpecies, tutorName, tutorAddress, exam, hemogramReferences, animalBreed,
}: LocalExamReportData) => {
  const patientId = displayId ?? animalId;
  const currentDate = new Date();
  const speciesKey = animalSpecies === "Canino" ? "dog" : animalSpecies === "Felino" ? "cat" : undefined;
  const getReferenceRange = (param: string): HemogramReferenceValue | undefined => {
    if (!speciesKey || !hemogramReferences[param]) return undefined;
    return hemogramReferences[param][speciesKey];
  };
  const getValueStatus = (value: string | undefined, ref: { min: number | undefined; max: number | undefined } | undefined): 'normal' | 'high' | 'low' | 'invalid' => {
    if (!value || !ref || ref.min === undefined || ref.max === undefined) return 'invalid';
    const numValue = normalizeNumber(value);
    if (isNaN(numValue)) return 'invalid';
    const min = ref.min;
    const max = ref.max;
    if (numValue < min) return 'low';
    if (numValue > max) return 'high';
    return 'normal';
  };

  const renderHemogramParam = (
    label: string,
    value: string | undefined,
    unit: string,
    referenceKey: string,
    applyPlaquetogramBorders: boolean = false,
    forceBoldValue: boolean = false,
  ) => {
    if (!value) return null;
    const ref = getReferenceRange(referenceKey);
    const valueStatus = getValueStatus(value, ref);
    let resultStyle;
    switch (valueStatus) {
      case 'normal': resultStyle = styles.resultNormal; break;
      case 'high': resultStyle = styles.resultHigh; break;
      case 'low': resultStyle = styles.resultLow; break;
      default: resultStyle = styles.resultNormal;
    }
    const parsedFullRefParts = parseLeukocyteReferenceParts(ref?.full);
    return (
      <View style={[styles.paramRow, applyPlaquetogramBorders && { borderBottomWidth: 0 }]}>
        <Text style={[styles.paramName, applyPlaquetogramBorders && { borderRightWidth: 0 }]}>{label}</Text>
        <View style={[styles.paramResultContainer, applyPlaquetogramBorders && { borderRightWidth: 0 }]}>
          <View style={styles.paramResultValueWrapper}>
            <Text style={[styles.paramResultValue, resultStyle, forceBoldValue && styles.strongText]}>{value}</Text>
          </View>
          <View style={styles.hemogramRefSpacer} />
          <View style={styles.paramResultUnitWrapper}>
            <Text style={styles.paramResultUnit}>{unit}</Text>
          </View>
          <View style={styles.hemogramRefSpacer} />
        </View>
        <View style={[styles.referenceContainer, { justifyContent: 'center' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <View style={[
              styles.hemogramRefValWrapper,
              applyPlaquetogramBorders && styles.hemogramRefValWrapperPlaquetogram,
              applyPlaquetogramBorders && { borderWidth: 0 }
            ]}>
              <Text style={styles.refPartText}>{parsedFullRefParts.val1}</Text>
            </View>
            <View style={styles.hemogramRefSpacer} />
            {parsedFullRefParts.sep && (
              <>
                <Text style={[styles.refPartText, styles.hemogramRefPartSepText, applyPlaquetogramBorders && { borderWidth: 0 }]}>{parsedFullRefParts.sep}</Text>
                <View style={styles.hemogramRefSpacer} />
              </>
            )}
            {parsedFullRefParts.val2 && (
              <View style={[
                styles.hemogramRefValWrapper,
                applyPlaquetogramBorders && styles.hemogramRefValWrapperPlaquetogram,
                applyPlaquetogramBorders && { borderWidth: 0 }
              ]}>
                <Text style={styles.refPartText}>{parsedFullRefParts.val2}</Text>
              </View>
            )}
            {parsedFullRefParts.val2 && <View style={styles.hemogramRefSpacer} />}
            {parsedFullRefParts.unit && (
              <>
                <View style={[styles.hemogramRefUnitWrapper, applyPlaquetogramBorders && { borderWidth: 0 }]}>
                  <Text style={styles.refPartText}>{parsedFullRefParts.unit}</Text>
                </View>
                <View style={styles.hemogramRefSpacer} />
              </>
            )}
          </View>
        </View>
        <View style={[styles.headerCellSpacer, applyPlaquetogramBorders && { borderRightWidth: 0 }]} />
        <View style={styles.indicatorColumn}>
          {ref && ref.min !== undefined && ref.max !== undefined && !isNaN(normalizeNumber(value)) ? (
            <IndicatorBar value={value} minRef={ref.min} maxRef={ref.max} valueStatus={valueStatus} />
          ) : null}
        </View>
      </View>
    );
  };

  const renderLeukocyteParam = (label: string, relativeValue: string | undefined, absoluteValue: string | undefined, referenceKey: string) => {
    if (!relativeValue && !absoluteValue) return null;
    const ref = getReferenceRange(referenceKey);
    const relRef = ref;
    const absRef = ref;
    const relValueStatus = (referenceKey === "leucocitosTotais") ? 'normal' : getValueStatus(relativeValue, relRef);
    const absRangeParsed = parseMinMaxFromReferenceString(absRef?.absolute);
    const absValueStatus = getValueStatus(absoluteValue, absRangeParsed);
    let relResultStyle;
    switch (relValueStatus) {
      case 'normal': relResultStyle = styles.resultNormal; break;
      case 'high': relResultStyle = styles.resultHigh; break;
      case 'low': relResultStyle = styles.resultLow; break;
      default: relResultStyle = styles.resultNormal;
    }
    let absResultStyle;
    switch (absValueStatus) {
      case 'normal': absResultStyle = styles.resultNormal; break;
      case 'high': absResultStyle = styles.resultHigh; break;
      case 'low': absResultStyle = styles.resultLow; break;
      default: absResultStyle = styles.resultNormal;
    }
    const indicatorValue = absoluteValue;
    const indicatorMin = absRangeParsed?.min;
    const indicatorMax = absRangeParsed?.max;
    const indicatorValueStatus = absValueStatus;
    const parsedRelRef = parseLeukocyteReferenceParts(relRef?.relative);
    const parsedAbsRef = parseLeukocyteReferenceParts(absRef?.absolute);
    return (
      <View style={styles.paramRow}>
        <Text style={styles.paramName}>{label}</Text>
        <View style={styles.leukocyteResultContainer}>
          <View style={styles.leukocyteResultValueCell}><Text style={[styles.leukocyteResultValue, relResultStyle]}>{relativeValue}</Text></View>
          <View style={styles.leukocyteResultUnitCell}><Text style={styles.leukocyteResultUnit}>%</Text></View>
          <View style={styles.leukocyteResultValueCell}><Text style={[styles.leukocyteResultValue, absResultStyle]}>{absoluteValue}</Text></View>
          <View style={styles.leukocyteResultUnitCellAbs}><Text style={styles.leukocyteResultUnit}>/µL</Text></View>
        </View>
        <View style={styles.referenceContainer}>
          <View style={[styles.leukocyteReferenceSubContainer, styles.leukocyteReferenceSubContainerRelative]}>
            <View style={styles.leukocyteRefValCellRelative}><Text style={[styles.refPartText, styles.refTextRight]}>{parsedRelRef.val1}</Text></View>
            {parsedRelRef.sep && <View style={styles.leukocyteRefSepCell}><Text style={[styles.refPartText, styles.refTextCenter]}>{parsedRelRef.sep}</Text></View>}
            <View style={styles.leukocyteRefValCellRelative}>{parsedRelRef.val2 && <Text style={[styles.refPartText, styles.refTextRight]}>{parsedRelRef.val2}</Text>}</View>
            <View style={styles.leukocyteRefUnitCellRelative}>{parsedRelRef.unit && <Text style={[styles.refPartText, styles.refTextCenter]}>{parsedRelRef.unit}</Text>}</View>
          </View>
          <View style={styles.leukocyteReferenceSeparator} />
          <View style={styles.leukocyteReferenceSubContainer}>
            <View style={styles.leukocyteRefValCellAbsolute}><Text style={[styles.refPartText, styles.refTextRight]}>{parsedAbsRef.val1}</Text></View>
            {parsedAbsRef.sep && <View style={styles.leukocyteRefSepCell}><Text style={[styles.refPartText, styles.refTextCenter]}>{parsedAbsRef.sep}</Text></View>}
            <View style={styles.leukocyteRefValCellAbsolute}>{parsedAbsRef.val2 && <Text style={[styles.refPartText, styles.refTextRight]}>{parsedAbsRef.val2}</Text>}</View>
            <View style={styles.leukocyteRefUnitCellAbsolute}>{parsedAbsRef.unit && <Text style={[styles.refPartText, styles.refTextCenter]}>{parsedAbsRef.unit}</Text>}</View>
          </View>
        </View>
        <View style={styles.headerCellSpacer} />
        <View style={styles.indicatorColumn}>
          {indicatorMin !== undefined && indicatorMax !== undefined && !isNaN(normalizeNumber(indicatorValue)) ? (
            <IndicatorBar value={indicatorValue} minRef={indicatorMin} maxRef={indicatorMax} valueStatus={indicatorValueStatus} />
          ) : null}
        </View>
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
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

        <Text style={styles.mainTitle}>HEMOGRAMA COMPLETO</Text>

        {/* Blocos lado a lado (50/50), cada um com 1 coluna e 5 linhas */}
        <View style={styles.topBlocksRow}>
          <View style={styles.topBlock}>
            <View style={styles.identityPanel}>
              <View style={styles.identityColumn}>
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
            </View>
          </View>

          <View style={styles.topBlock}>
            <View style={styles.examInfoPanel}>
              <View style={styles.examInfoItem}>
                <Text style={styles.examInfoLabel}>Tipo do exame:</Text>
                <Text style={styles.examInfoValue}>{exam.type || "Hemograma Completo"}</Text>
              </View>
              <View style={styles.examInfoItem}>
                <Text style={styles.examInfoLabel}>Material:</Text>
                <Text style={styles.examInfoValue}>{exam.material || "-"}</Text>
              </View>
              <View style={styles.examInfoItem}>
                <Text style={styles.examInfoLabel}>Equipamento:</Text>
                <Text style={styles.examInfoValue}>{exam.equipamento || "-"}</Text>
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
        </View>

        {exam.type === "Hemograma Completo" ? (
          <>
            <View style={styles.eritrogramPlaquetogramHeaderLine}>
              <Text style={[styles.eritrogramPlaquetogramHeaderTitle, styles.strongText]}>ERITROGRAMA</Text>
              <Text style={[styles.eritrogramPlaquetogramHeaderResultLabel, styles.strongText]}>Resultado</Text>
              <Text style={[styles.eritrogramPlaquetogramHeaderReferenceLabel, styles.strongText]}>Referência</Text>
              <View style={[styles.headerCellSpacer, { width: 6 }]} />
              <Text style={[styles.leukogramHeaderIndicatorLabel, styles.strongText]}>Indicador</Text>
            </View>
            {renderHemogramParam("Eritrócitos", exam.eritrocitos, "M/µL", "eritrocitos")}
            {renderHemogramParam("Hemoglobina", exam.hemoglobina, "g/dL", "hemoglobina")}
            {renderHemogramParam("Hematócrito", exam.hematocrito, "%", "hematocrito")}
            {renderHemogramParam("VCM", exam.vcm, "fL", "vcm")}
            {renderHemogramParam("HCM", exam.hcm, "pg", "hcm")}
            {renderHemogramParam("CHCM", exam.chcm, "g/dL", "chcm")}
            {exam.proteinaTotal && renderHemogramParam("Proteína total", exam.proteinaTotal, "g/dL", "proteinaTotal")}
            {exam.hemaciasNucleadas && renderHemogramParam("Hemácias nucleadas", exam.hemaciasNucleadas, "", "hemaciasNucleadas")}
            {exam.observacoesSerieVermelha && (
              <View style={styles.observationBlock}>
                <Text style={[styles.subsectionTitle, styles.strongText]}>Observações da Série Vermelha:</Text>
                <Text style={styles.observationText}>{exam.observacoesSerieVermelha}</Text>
              </View>
            )}

            <View style={styles.leukogramHeaderLine}>
              <Text style={[styles.leukogramHeaderTitle, styles.strongText]}>LEUCOGRAMA</Text>
              <View style={styles.leukogramHeaderResultLabels}>
                <Text style={[styles.leukogramHeaderResultLabelText, styles.strongText]}>Relativo</Text>
                <Text style={[styles.leukogramHeaderResultLabelText, styles.strongText]}>Absoluto</Text>
              </View>
              <View style={styles.leukogramHeaderReferenceLabels}>
                <View style={styles.leukogramRefLabelWrapper}>
                  <Text style={[styles.leukogramHeaderLabelTextRightWithPadding, styles.strongText]}>Relativo:</Text>
                </View>
                <View style={styles.leukogramRefLabelWrapper}>
                  <Text style={[styles.leukogramHeaderLabelTextCentered, styles.strongText]}>Absoluto:</Text>
                </View>
              </View>
              <View style={[styles.headerCellSpacer, { width: 6 }]} />
              <Text style={[styles.leukogramHeaderIndicatorLabel, styles.strongText]}>Indicador:</Text>
            </View>

            {renderLeukocyteParam("Leucócitos totais", "100", exam.leucocitosTotais, "leucocitosTotais")}
            {exam.mielocitosRelativo && renderLeukocyteParam("Mielócitos", exam.mielocitosRelativo, exam.mielocitosAbsoluto, "mielocitos")}
            {exam.metamielocitosRelativo && renderLeukocyteParam("Metamielocitos", exam.metamielocitosRelativo, exam.metamielocitosAbsoluto, "metamielocitos")}
            {exam.bastonetesRelativo && renderLeukocyteParam("Bastonetes", exam.bastonetesRelativo, exam.bastonetesAbsoluto, "bastonetes")}
            {exam.segmentadosRelativo && renderLeukocyteParam("Segmentados", exam.segmentadosRelativo, exam.segmentadosAbsoluto, "segmentados")}
            {exam.eosinofilosRelativo && renderLeukocyteParam("Eosinófilos", exam.eosinofilosRelativo, exam.eosinofilosAbsoluto, "eosinofilos")}
            {exam.basofilosRelativo && renderLeukocyteParam("Basófilos", exam.basofilosRelativo, exam.basofilosAbsoluto, "basofilos")}
            {exam.linfocitosRelativo && renderLeukocyteParam("Linfócitos", exam.linfocitosRelativo, exam.linfocitosAbsoluto, "linfocitos")}
            {exam.monocitosRelativo && renderLeukocyteParam("Monócitos", exam.monocitosRelativo, exam.monocitosAbsoluto, "monocitos")}
            {exam.observacoesSerieBranca && (
              <View style={styles.observationBlock}>
                <Text style={[styles.subsectionTitle, styles.strongText]}>Observações da Série Branca:</Text>
                <Text style={styles.observationText}>{exam.observacoesSerieBranca}</Text>
              </View>
            )}

            <View style={styles.eritrogramPlaquetogramHeaderLine}>
              <Text style={[styles.eritrogramPlaquetogramHeaderTitle, styles.strongText]}>PLAQUETOGRAMA</Text>
              <Text style={[styles.eritrogramPlaquetogramHeaderResultLabel, styles.strongText]}>Resultado</Text>
              <Text style={[styles.eritrogramPlaquetogramHeaderReferenceLabel, styles.strongText]}>Referência</Text>
              <View style={[styles.headerCellSpacer, { width: 6 }]} />
              <Text style={[styles.leukogramHeaderIndicatorLabel, styles.strongText]}>Indicador</Text>
            </View>
            {renderHemogramParam("Plaquetas totais", exam.contagemPlaquetaria, "/µL", "contagemPlaquetaria", true, true)}
            {exam.avaliacaoPlaquetaria && (
              <View style={styles.observationBlock}>
                <Text style={[styles.subsectionTitle, styles.strongText]}>Avaliação Plaquetária:</Text>
                <Text style={styles.observationText}>{exam.avaliacaoPlaquetaria}</Text>
              </View>
            )}

            {(exam.nota || exam.observacoesGeraisExame) && (
              <View style={styles.dualNotesRow}>
                {exam.nota && (
                  <View style={[styles.noteBlock, { width: exam.observacoesGeraisExame ? "49%" : "100%", marginTop: 0 }]}>
                    <Text style={[styles.subsectionTitle, styles.strongText]}>Nota:</Text>
                    <Text style={styles.observationText}>{exam.nota}</Text>
                  </View>
                )}
                {exam.observacoesGeraisExame && (
                  <View style={[styles.observationBlock, { width: exam.nota ? "49%" : "100%", marginTop: 0 }]}>
                    <Text style={[styles.subsectionTitle, styles.strongText]}>Observações Gerais do Exame:</Text>
                    <Text style={styles.observationText}>{exam.observacoesGeraisExame}</Text>
                  </View>
                )}
              </View>
            )}
          </>
        ) : exam.type === "Bioquímico" && exam.biochemicalEntries && exam.biochemicalEntries.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>BIOQUÍMICO</Text>
            {exam.biochemicalEntries.map((b: BiochemicalEntry, idx) => {
              const valueStatus = getBiochemicalValueStatus(b.result, b.minReference, b.maxReference);
              let resultStyle;
              switch (valueStatus) {
                case 'normal': resultStyle = styles.resultNormal; break;
                case 'high': resultStyle = styles.resultHigh; break;
                case 'low': resultStyle = styles.resultLow; break;
                default: resultStyle = styles.resultNormal;
              }
              return (
                <View key={b.id || idx} style={{ marginBottom: 6 }}>
                  <View style={styles.biochemicalEnzymeHeader}>
                    <Text style={styles.biochemicalEnzymeName}>{b.enzyme}</Text>
                  </View>
                  <View style={styles.biochemicalResultLine}>
                    <Text style={styles.biochemicalResultLabel}>Resultado:</Text>
                    <Text style={[styles.biochemicalResultValue, resultStyle]}>{b.result}</Text>
                    {b.referenceUnit && <Text style={styles.biochemicalResultUnit}>{b.referenceUnit}</Text>}
                    {b.minReference && b.maxReference && b.referenceUnit && (
                      <>
                        <Text style={styles.biochemicalReferenceLabel}>Ref.:</Text>
                        <Text style={styles.biochemicalReferenceRange}>
                          {b.minReference} - {b.maxReference} {b.referenceUnit}
                        </Text>
                      </>
                    )}
                  </View>
                  <View style={{ marginLeft: 8 }}>
                    {b.material ? <View style={styles.biochemicalDetailRow}><Text style={styles.biochemicalDetailLabel}>Material:</Text><Text style={styles.biochemicalDetailValue}>{b.material}</Text></View> : null}
                    {b.methodology ? <View style={styles.biochemicalDetailRow}><Text style={styles.biochemicalDetailLabel}>Metodologia:</Text><Text style={styles.biochemicalDetailValue}>{b.methodology}</Text></View> : null}
                    {b.equipment ? <View style={styles.biochemicalDetailRow}><Text style={styles.biochemicalDetailLabel}>Equipamento:</Text><Text style={styles.biochemicalDetailValue}>{b.equipment}</Text></View> : null}
                  </View>
                </View>
              );
            })}
            {exam.observacoesGeraisExame && (
              <View style={styles.observationBlock}>
                <Text style={styles.sectionTitle}>Observações Gerais do Exame</Text>
                <Text style={styles.observationText}>{exam.observacoesGeraisExame}</Text>
              </View>
            )}
          </>
        ) : (
          exam.result && (
            <View style={{ marginTop: 6 }}>
              <Text style={styles.sectionTitle}>Resultado</Text>
              <Text style={styles.observationText}>{exam.result}</Text>
            </View>
          )
        )}

        {exam.observacoesGeraisExame && exam.type !== "Bioquímico" && exam.type !== "Hemograma Completo" && (
          <View style={styles.observationBlock}>
            <Text style={styles.sectionTitle}>Observações Gerais do Exame</Text>
            <Text style={styles.observationText}>{exam.observacoesGeraisExame}</Text>
          </View>
        )}

        {exam.liberadoPor && (
          <View style={{ marginTop: 8, textAlign: 'center' }}>
            <Text style={styles.signatureSmall}>Liberado por: {exam.liberadoPor}</Text>
            <Text style={styles.signatureSmall}>Data de Liberação: {exam.laboratoryDate ? formatDateToPortuguese(new Date(exam.laboratoryDate)) : formatDateToPortuguese(currentDate)}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default ExamReportPdfContentHemogramaOnePage;

