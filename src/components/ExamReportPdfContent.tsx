"use client";

import React from "react";
import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import { mockCompanySettings } from "@/mockData/settings";
import { ExamEntry, HemogramReference, HemogramReferenceValue, ExamReportData } from "@/types/exam";
// import { hemogramReferences } from "@/constants/examReferences"; // Removido: agora vem via props

// Registrando a fonte Exo com pesos regular, bold, italic e bold-italic
Font.register({
  family: "Exo",
  fonts: [
    { src: '/fonts/Exo-Regular.ttf', fontWeight: 400, format: 'truetype' },
    { src: '/fonts/Exo-Bold.ttf', fontWeight: 700, format: 'truetype' },
    { src: '/fonts/Exo-Italic.ttf', fontStyle: 'italic', fontWeight: 400, format: 'truetype' },
    { src: '/fonts/Exo-BoldItalic.ttf', fontStyle: 'italic', fontWeight: 700, format: 'truetype' },
  ],
});

// Helper function to format date
const formatDateToPortuguese = (date: Date) => {
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
  const formattedDate = date.toLocaleDateString('pt-BR', options);
  return formattedDate.toUpperCase();
};

// Normalizador de números (remove separador de milhar e troca vírgula por ponto)
const normalizeNumber = (raw: string | undefined) => {
  if (!raw) return NaN;
  let cleaned = raw.trim();

  // Remove todos os caracteres que não são dígitos, pontos ou vírgulas
  cleaned = cleaned.replace(/[^0-9.,]/g, '');

  // Encontra a última ocorrência de um ponto e de uma vírgula
  const lastDotIndex = cleaned.lastIndexOf('.');
  const lastCommaIndex = cleaned.lastIndexOf(',');

  // Se a vírgula for o último separador (formato brasileiro: 1.234,56)
  if (lastCommaIndex > lastDotIndex) {
    cleaned = cleaned.replace(/\./g, ''); // Remove todos os pontos (separadores de milhares)
    cleaned = cleaned.replace(/,/g, '.'); // Substitui a vírgula por ponto (separador decimal)
  } else {
    // Caso contrário, assume que o ponto é o separador decimal (formato inglês: 1,234.56 ou 14.5)
    // Ou que não há separador decimal (inteiro: 280000)
    cleaned = cleaned.replace(/,/g, ''); // Remove todas as vírgulas (separadores de milhares)
    // Remove todos os pontos, EXCETO o último (se houver mais de um)
    // Ex: "280.000" -> "280000." (o parseFloat lida com o ponto final)
    // Ex: "14.5" -> "14.5"
    cleaned = cleaned.replace(/\.(?=[^.]*\.)/g, ''); 
  }

  return parseFloat(cleaned);
};

// Nova função para formatar números para exibição (com separador de milhar e decimal correto)
const formatNumberForDisplay = (num: number) => {
  if (isNaN(num)) return 'N/A';
  
  // Use Intl.NumberFormat para formatação precisa em pt-BR
  const formatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0, // Começa com 0 casas decimais
    maximumFractionDigits: 3, // Permite até 3 casas decimais
    useGrouping: true, // Habilita o separador de milhar
  });

  // Verifica se o número tem casas decimais significativas
  if (num % 1 !== 0) {
    // Se tiver decimais, formata com as casas decimais necessárias (até 3)
    return formatter.format(num);
  } else {
    // Se for um número inteiro, formata sem casas decimais
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true,
    }).format(num);
  }
};

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Exo",
    fontSize: 10,
    color: "#333",
  },
  // Clinic Header (restored)
  clinicHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  clinicInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  clinicDetails: {
    fontSize: 9,
    color: "#666",
  },
  clinicAddressPhone: {
    textAlign: "right",
    fontSize: 9,
    color: "#666",
  },
  mainTitle: {
    fontSize: 20,
    textAlign: "center",
    fontFamily: "Exo",
    fontWeight: "bold",
    marginBottom: 20,
  },
  infoSectionContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
  },
  infoTitle: {
    fontSize: 11,
    fontWeight: "bold",
  },
  infoText: {
    fontSize: 10,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 4,
  },
  subsectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
  },
  // --- Layout de colunas para o corpo do laudo ---
  // General table header for Eritrograma and Plaquetas
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 5,
    marginBottom: 5,
    backgroundColor: "#f5f5f5",
  },
  headerCell: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#333",
    textAlign: "left",
    paddingLeft: 5,
  },
  headerCellName: {
    width: 100, // NOME DO PARÂMETRO
  },
  headerCellResult: {
    width: 100, // RESULTADO - AJUSTADO
    textAlign: "right",
  },
  headerCellReference: {
    width: 230, // REFERÊNCIA - AJUSTADO
    textAlign: "right",
  },
  headerCellIndicator: {
    width: 105, // INDICADOR - AJUSTADO
    textAlign: "left", // ALTERADO para left
  },

  // NEW: Combined Leukogram Header Line (as per image)
  leukogramHeaderLine: {
    flexDirection: "row",
    alignItems: "flex-end", // Align items to the bottom
    marginTop: 20, // ADICIONADO ESPAÇAMENTO
    marginBottom: 5, // Space below this header
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  leukogramHeaderTitle: {
    width: 200, // NOME DO PARÂMETRO (100) + RESULTADO (100)
    fontSize: 13, // Larger font for the main title
    fontWeight: "bold",
    color: "#333",
    textTransform: "uppercase",
    paddingLeft: 5,
  },
  leukogramHeaderReferenceLabels: {
    width: 230, // Same width as referenceContainer
    flexDirection: 'row',
    alignItems: 'flex-end', // Align sub-labels to the bottom
  },
  leukogramRefLabelWrapper: { // New wrapper for each label
    width: '50%', // Each takes half the space
  },
  leukogramHeaderLabelTextRightWithPadding: {
    fontSize: 8, // Smaller font for sub-labels
    fontWeight: "bold",
    color: "#333",
    textAlign: 'right', // Right-aligned
    paddingRight: 15, // Roughly 4 spaces
  },
  leukogramHeaderLabelTextCentered: {
    fontSize: 8, // Smaller font for sub-labels
    fontWeight: "bold",
    color: "#333",
    textAlign: 'center', // Centered
  },
  leukogramHeaderIndicatorLabel: {
    width: 105, // Same width as indicatorColumn
    fontSize: 8, // Smaller font
    fontWeight: "bold",
    color: "#333",
    textAlign: "left", // Aligned left
    paddingRight: 5, // Add some padding
  },

  paramRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
    minHeight: 18,
  },
  paramName: {
    width: 100,
    fontSize: 9,
    color: "#333",
    paddingLeft: 5,
  },
  // For single-value results (Eritrograma, Plaquetas)
  paramResultContainer: {
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end', // Alinhado à direita
  },
  paramResultValueWrapper: {
    width: 70, // Fixed width for value
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  paramResultUnitWrapper: {
    width: 30, // Fixed width for unit
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  paramResultValue: {
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "right",
  },
  paramResultUnit: {
    fontSize: 9,
    color: "#666",
    textAlign: 'left',
  },
  // For multi-value results (Leukogram)
  leukocyteResultContainer: {
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leukocyteResultSubContainer: {
    width: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  leukocyteResultValue: {
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "right",
    marginRight: 5,
  },
  leukocyteResultUnit: {
    fontSize: 9,
    color: "#666",
    textAlign: 'left',
  },

  // New styles for granular reference columns (9 columns)
  referenceContainer: {
    width: 230,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end', // Alinhado à direita
  },
  paramReferenceValueWrapper: {
    width: 180, // Fixed width for reference value
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  paramReferenceUnitWrapper: {
    width: 50, // Fixed width for reference unit
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  leukocyteReferenceSubContainer: {
    width: 115,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  refPartText: {
    fontSize: 9,
    color: "#666",
    lineHeight: 1.2,
    flexShrink: 0,
    flexGrow: 0,
  },
  refVal1Wrapper: {
    width: 30,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  refPartSepText: {
    width: 15, // VOLTOU PARA 15px
    textAlign: 'center',
  },
  refVal2Wrapper: {
    width: 30, // MANTIDO em 30px (base para o relativo)
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  refUnitWrapper: {
    width: 20, // ALTERADO para 20px (default)
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  indicatorColumn: {
    width: 105,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // ALTERADO para flex-start
    flexGrow: 1,
  },
  // NEW: Fixed background bar style
  fixedBackgroundBar: {
    width: 100,
    height: 8,
    backgroundColor: '#ccffcc',
    borderRadius: 4,
    position: 'relative',
    justifyContent: 'center',
  },
  // NEW: Style for the ball marker
  ballMarker: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: 0,
  },
  // NEW: Styles for fixed indicators at 15% and 85%
  fixedIndicator: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: '#999999',
    top: 0,
  },

  resultNormal: {
    color: "#000000", // Black for normal
  },
  resultHigh: {
    color: "#dc3545", // Red for high
  },
  resultLow: {
    color: "#007bff", // Blue for low
  },
  observationText: {
    fontSize: 10,
    lineHeight: 1.4,
    marginBottom: 5,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  signatureBlock: {
    textAlign: 'center',
    width: 180,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    marginBottom: 3,
    marginTop: 10,
  },
  signatureLabel: {
    fontSize: 9,
    color: "#333",
  },
  signatureDetails: {
    fontSize: 9,
    color: "#666",
  },
  dateText: {
    fontSize: 10,
    color: "#333",
  },
});

// Componente para o Indicador (Barra com faixa verde e marcador de ponto)
interface IndicatorBarProps {
  value: string | undefined;
  minRef: number;
  maxRef: number;
  valueStatus: 'normal' | 'high' | 'low' | 'invalid';
}

const IndicatorBar: React.FC<IndicatorBarProps> = ({ value, minRef, maxRef, valueStatus }) => {
  const BAR_WIDTH = 100;
  const BALL_SIZE = 8; // Smaller ball size
  const ACTIVE_RANGE_START_PERCENT = 0.15; // Revertido para 15%
  const ACTIVE_RANGE_END_PERCENT = 0.85;   // Revertido para 85%

  const numValue = normalizeNumber(value);

  let ballColor = styles.resultNormal.color;
  if (valueStatus === 'high') ballColor = styles.resultHigh.color;
  if (valueStatus === 'low') ballColor = styles.resultLow.color;

  // Only render ball if value is a valid number
  if (isNaN(numValue)) {
    return (
      <View style={styles.fixedBackgroundBar}>
        <View style={[styles.fixedIndicator, { left: ACTIVE_RANGE_START_PERCENT * BAR_WIDTH }]} />
        <View style={[styles.fixedIndicator, { left: ACTIVE_RANGE_END_PERCENT * BAR_WIDTH }]} />
      </View>
    );
  }

  // Calculate the pixel range for the active movement of the ball
  const activeStartPx = ACTIVE_RANGE_START_PERCENT * BAR_WIDTH;
  const activeEndPx = ACTIVE_RANGE_END_PERCENT * BAR_WIDTH;
  const activeRangeWidthPx = activeEndPx - activeStartPx;

  let ballLeftPosition: number;

  if (minRef === maxRef) {
    // Special case for single-point reference (e.g., 0-0)
    if (numValue < minRef) {
      ballLeftPosition = activeStartPx; // Value is below, place at start of active range
    } else if (numValue > maxRef) {
      ballLeftPosition = activeEndPx; // Value is above, place at end of active range
    } else { // numValue === minRef === maxRef
      ballLeftPosition = activeStartPx + (activeRangeWidthPx / 2); // Center within active range
    }
  } else {
    // Standard case for a range reference
    const rangeSpan = maxRef - minRef;
    // Calculate the proportional position of numValue within the minRef-maxRef range (0 to 1)
    const proportionalPosition = (numValue - minRef) / rangeSpan;

    // Map this proportional position to the active pixel range (activeStartPx to activeEndPx)
    ballLeftPosition = activeStartPx + (proportionalPosition * activeRangeWidthPx);
  }

  // Adjust position to center the ball marker
  ballLeftPosition -= (BALL_SIZE / 2);

  // Clamp ball position to ensure it stays within the overall bar boundaries (0 to BAR_WIDTH - BALL_SIZE)
  ballLeftPosition = Math.max(0, Math.min(BAR_WIDTH - BALL_SIZE, ballLeftPosition));

  return (
    <View style={styles.fixedBackgroundBar}>
      <View style={[styles.fixedIndicator, { left: ACTIVE_RANGE_START_PERCENT * BAR_WIDTH }]} />
      <View style={[styles.fixedIndicator, { left: ACTIVE_RANGE_END_PERCENT * BAR_WIDTH }]} />
      <View style={[styles.ballMarker, { left: ballLeftPosition, backgroundColor: ballColor }]} />
    </View>
  );
};

// Helper function to parse leukocyte reference strings
const parseLeukocyteReferenceParts = (refString: string | undefined) => {
  if (!refString || refString === 'N/A' || refString.trim() === '') {
    return { val1: '', sep: '', val2: '', unit: '' };
  }

  const trimmedRefString = refString.trim();

  // Case 1: "VALUE1 - VALUE2 UNIT" (e.g., "60 - 77 %", "3.000 - 11.500 /µL")
  const rangeWithUnitMatch = trimmedRefString.match(/^(\S+)\s*-\s*(\S+)\s*(\S*)$/);
  if (rangeWithUnitMatch) {
    return {
      val1: rangeWithUnitMatch[1],
      sep: '-',
      val2: rangeWithUnitMatch[2],
      unit: rangeWithUnitMatch[3] || ''
    };
  }

  // Case 2: "VALUE UNIT" (e.g., "0 %")
  const valueWithUnitMatch = trimmedRefString.match(/^(\S+)\s*(\S*)$/);
  if (valueWithUnitMatch) {
    return {
      val1: valueWithUnitMatch[1],
      sep: '', // No separator
      val2: '', // No second value
      unit: valueWithUnitMatch[2] || ''
    };
  }

  // Case 3: "/ raros"
  if (trimmedRefString.includes('/ raros')) {
    return { val1: '', sep: '/', val2: 'raros', unit: '' };
  }

  // Fallback: just the string as val1
  return { val1: trimmedRefString, sep: '', val2: '', unit: '' };
};

// Helper function to parse min/max from a reference string like "3.000 - 11.500 /µL"
const parseMinMaxFromReferenceString = (refString: string | undefined): { min: number; max: number } | undefined => {
  if (!refString) return undefined;
  const trimmedRefString = refString.trim(); // Adicionado .trim()
  const match = trimmedRefString.match(/^(\S+)\s*-\s*(\S+)/); // Matches "VALUE1 - VALUE2"
  if (match) {
    const min = normalizeNumber(match[1]);
    const max = normalizeNumber(match[2]);
    if (!isNaN(min) && !isNaN(max)) {
      return { min, max };
    }
  }
  // Handle single value cases like "0" or "0 %" if min/max are not explicitly a range
  const singleValue = normalizeNumber(trimmedRefString); // Adicionado .trim()
  if (!isNaN(singleValue)) {
    return { min: singleValue, max: singleValue };
  }
  return undefined;
};

// NEW: Helper function to parse full reference string into value and unit parts
const parseFullReferenceParts = (refString: string | undefined) => {
  if (!refString || refString === 'N/A' || refString.trim() === '') {
    return { value: '', unit: '' };
  }
  const trimmedRefString = refString.trim();
  // Regex to capture common units at the end of the string
  const unitMatch = trimmedRefString.match(/(\s*(?:%|g\/dL|M\/mm3|fL|pg|\/µL|milhões\/mm3|mil\/µL|raros|un|g|mg|mL|mcg|UFC|UFC\/g|UFC\/g|UFC\/kg))$/);

  if (unitMatch) {
    const unit = unitMatch[1].trim();
    const value = trimmedRefString.substring(0, unitMatch.index).trim();
    return { value, unit };
  }
  // If no specific unit found, assume the whole string is the value or there's no unit
  return { value: trimmedRefString, unit: '' };
};


export const ExamReportPdfContent = ({
  animalName, animalId, animalSpecies, tutorName, tutorAddress, exam, hemogramReferences, // hemogramReferences agora vem via props
}: ExamReportData) => {
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

  // Renderiza um parâmetro de hemograma de valor único
  const renderHemogramParam = (
    label: string,
    value: string | undefined,
    unit: string, // This unit is now just a fallback/hint, the actual unit comes from parsing ref.full
    referenceKey: string,
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

    const parsedFullRef = parseFullReferenceParts(ref?.full);

    return (
      <View style={styles.paramRow}>
        <Text style={styles.paramName}>{label}</Text>
        <View style={styles.paramResultContainer}>
          <View style={styles.paramResultValueWrapper}>
            <Text style={[styles.paramResultValue, resultStyle]}>{value}</Text>
          </View>
          <View style={styles.paramResultUnitWrapper}>
            <Text style={styles.paramResultUnit}>{unit}</Text>
          </View>
        </View>
        <View style={styles.referenceContainer}>
          <View style={styles.paramReferenceValueWrapper}>
            <Text style={styles.refPartText}>{parsedFullRef.value}</Text>
          </View>
          <View style={styles.paramReferenceUnitWrapper}>
            <Text style={styles.refPartText}>{parsedFullRef.unit}</Text>
          </View>
        </View>
        <View style={styles.indicatorColumn}>
          {ref && ref.min !== undefined && ref.max !== undefined && !isNaN(normalizeNumber(value)) ? (
            <IndicatorBar value={value} minRef={ref.min} maxRef={ref.max} valueStatus={valueStatus} />
          ) : null}
        </View>
      </View>
    );
  };

  // Renderiza um parâmetro de leucograma com valores relativo e absoluto
  const renderLeukocyteParam = (
    label: string,
    relativeValue: string | undefined,
    absoluteValue: string | undefined,
    referenceKey: string, // Use a single key for both relative and absolute references
  ) => {
    if (!relativeValue && !absoluteValue) return null;

    const ref = getReferenceRange(referenceKey); // Get the full reference object
    const relRef = ref; // For relative values
    const absRef = ref; // For absolute values

    // Para o status do valor relativo, usamos os min/max do objeto de referência
    // EXCEÇÃO: Para 'leucocitosTotais', o valor relativo (100%) é sempre normal.
    const relValueStatus = (referenceKey === "leucocitosTotais") ? 'normal' : getValueStatus(relativeValue, relRef);
    
    // Para o status do valor absoluto, precisamos parsear min/max da string 'absolute'
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
    const indicatorMin = absRangeParsed?.min; // Usar min/max parseados da string absoluta
    const indicatorMax = absRangeParsed?.max; // Usar min/max parseados da string absoluta
    const indicatorValueStatus = absValueStatus;

    const parsedRelRef = parseLeukocyteReferenceParts(relRef?.relative);
    const parsedAbsRef = parseLeukocyteReferenceParts(absRef?.absolute);

    return (
      <View style={styles.paramRow}>
        <Text style={styles.paramName}>{label}</Text>
        
        {/* Results Section */}
        <View style={styles.leukocyteResultContainer}>
          {/* Relative Result */}
          <View style={styles.leukocyteResultSubContainer}>
            <Text style={[styles.leukocyteResultValue, relResultStyle]}>{relativeValue}</Text>
            <Text style={styles.leukocyteResultUnit}>%</Text>
          </View>
          {/* Absolute Result */}
          <View style={styles.leukocyteResultSubContainer}>
            <Text style={[styles.leukocyteResultValue, absResultStyle]}>{absoluteValue}</Text>
            <Text style={styles.leukocyteResultUnit}>/µL</Text>
          </View>
        </View>

        {/* References Section */}
        <View style={styles.referenceContainer}>
          {/* Relative Reference */}
          <View style={styles.leukocyteReferenceSubContainer}>
            <View style={styles.refVal1Wrapper}>
              <Text style={styles.refPartText}>{parsedRelRef.val1}</Text>
            </View>
            {parsedRelRef.sep && <Text style={[styles.refPartText, styles.refPartSepText]}>{parsedRelRef.sep}</Text>}
            <View style={[styles.refVal2Wrapper, { width: 30 }]}> {/* Override width for relative part */}
              {parsedRelRef.val2 && <Text style={styles.refPartText}>{parsedRelRef.val2}</Text>}
            </View>
            <View style={[styles.refUnitWrapper, { width: 20 }]}> {/* Override for relative unit */}
              {parsedRelRef.unit && <Text style={styles.refPartText}>{parsedRelRef.unit}</Text>}
            </View>
          </View>
          {/* Absolute Reference */}
          <View style={styles.leukocyteReferenceSubContainer}>
            <View style={styles.refVal1Wrapper}>
              <Text style={styles.refPartText}>{parsedAbsRef.val1}</Text>
            </View>
            {parsedAbsRef.sep && <Text style={[styles.refPartText, styles.refPartSepText]}>{parsedAbsRef.sep}</Text>}
            <View style={[styles.refVal2Wrapper, { width: 30 }]}> {/* Override width for absolute part */}
              {parsedAbsRef.val2 && <Text style={styles.refPartText}>{parsedAbsRef.val2}</Text>}
            </View>
            <View style={[styles.refUnitWrapper, { width: 20 }]}> {/* Override for absolute unit */}
              {parsedAbsRef.unit && <Text style={styles.refPartText}>{parsedAbsRef.unit}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.indicatorColumn}>
          {indicatorMin !== undefined && indicatorMax !== undefined && !isNaN(normalizeNumber(indicatorValue)) ? (
            <IndicatorBar value={indicatorValue} minRef={indicatorMin} maxRef={indicatorMax} valueStatus={indicatorValueStatus} />
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header da Clínica (Restored) */}
        <View style={styles.clinicHeader} fixed>
          <View style={styles.clinicInfoLeft}>
            {/* <Image src={mockCompanySettings.logoUrl} style={styles.clinicLogo} /> */}
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

        <Text style={styles.mainTitle}>LAUDO DE EXAME</Text>

        {/* Informações do Animal e Tutor (Comentado para testes) */}
        {/*
        <View style={styles.infoSectionContainer}>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Animal</Text>
            <Text style={styles.infoText}>ID: {animalId}</Text>
            <Text style={styles.infoText}>Nome: {animalName}</Text>
            <Text style={styles.infoText}>Espécie: {animalSpecies}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Tutor</Text>
            <Text style={styles.infoText}>Nome: {tutorName}</Text>
            <Text style={styles.infoText}>Endereço: {tutorAddress || "Não informado"}</Text>
          </Text>
        </View>
        */}

        {/* General Exam Info (Comentado para testes) */}
        {/*
        <Text style={styles.sectionTitle}>INFORMAÇÕES GERAIS DO EXAME</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
          <Text style={[styles.infoText, { width: '50%' }]}>Data do Exame: {exam.date}</Text>
          <Text style={[styles.infoText, { width: '50%' }]}>Tipo de Exame: {exam.type}</Text>
          <Text style={[styles.infoText, { width: '50%' }]}>Veterinário Solicitante: {exam.vet}</Text>
          {exam.material && <Text style={[styles.infoText, { width: '50%' }]}>Material: {exam.material}</Text>}
          {exam.equipamento && <Text style={[styles.infoText, { width: '50%' }]}>Equipamento: {exam.equipamento}</Text>}
          {exam.laboratory && <Text style={[styles.infoText, { width: '50%' }]}>Laboratório: {exam.laboratory}</Text>}
          {exam.laboratoryDate && <Text style={[styles.infoText, { width: '50%' }]}>Data do Resultado: {exam.laboratoryDate}</Text>}
        </View>
        */}

        {exam.type === "Hemograma Completo" ? (
          <>
            {/* Tabela de Cabeçalho para Eritrograma e Plaquetas */}
            <Text style={styles.sectionTitle}>ERITROGRAMA</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.headerCellName]}>NOME DO PARÂMETRO</Text>
              <Text style={[styles.headerCell, styles.headerCellResult]}>RESULTADO</Text>
              <Text style={[styles.headerCell, styles.headerCellReference]}>REFERÊNCIA</Text>
              <Text style={[styles.headerCell, styles.headerCellIndicator]}>INDICADOR</Text>
            </View>
            {renderHemogramParam("Eritrócitos", exam.eritrocitos, "M/µL", "eritrocitos")}
            {renderHemogramParam("Hemoglobina", exam.hemoglobina, "g/dL", "hemoglobina")}
            {renderHemogramParam("Hematócrito", exam.hematocrito, "%", "hematocrito")}
            {renderHemogramParam("VCM", exam.vcm, "fL", "vcm")}
            {renderHemogramParam("HCM", exam.hcm, "pg", "hcm")}
            {renderHemogramParam("CHCM", exam.chcm, "g/dL", "chcm")}
            {/* RDW não está no mock, mas se estivesse, seria aqui */}
            {exam.proteinaTotal && renderHemogramParam("Proteína total", exam.proteinaTotal, "g/dL", "proteinaTotal")}
            {exam.hemaciasNucleadas && renderHemogramParam("Hemácias nucleadas", exam.hemaciasNucleadas, "", "hemaciasNucleadas")}
            {exam.observacoesSerieVermelha && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.subsectionTitle}>Observações da Série Vermelha:</Text>
                <Text style={styles.observationText}>{exam.observacoesSerieVermelha}</Text>
              </View>
            )}

            {/* Leucograma */}
            <View style={styles.leukogramHeaderLine}>
              <Text style={styles.leukogramHeaderTitle}>LEUCOGRAMA</Text>
              <View style={styles.leukogramHeaderReferenceLabels}>
                <View style={styles.leukogramRefLabelWrapper}>
                  <Text style={styles.leukogramHeaderLabelTextRightWithPadding}>Relativo:    </Text>
                </View>
                <View style={styles.leukogramRefLabelWrapper}>
                  <Text style={styles.leukogramHeaderLabelTextCentered}>Absoluto:</Text>
                </View>
              </View>
              <Text style={styles.leukogramHeaderIndicatorLabel}>Indicador:</Text>
            </View>

            {/* Alterado para renderizar Leucócitos totais com renderLeukocyteParam */}
            {renderLeukocyteParam("Leucócitos totais", "100", exam.leucocitosTotais, "leucocitosTotais")}
            {exam.mielocitosRelativo && renderLeukocyteParam("Mielócitos", exam.mielocitosRelativo, exam.mielocitosAbsoluto, "mielocitos")}
            {exam.metamielocitosRelativo && renderLeukocyteParam("Metamielócitos", exam.metamielocitosRelativo, exam.metamielocitosAbsoluto, "metamielocitos")}
            {exam.bastonetesRelativo && renderLeukocyteParam("Bastonetes", exam.bastonetesRelativo, exam.bastonetesAbsoluto, "bastonetes")}
            {exam.segmentadosRelativo && renderLeukocyteParam("Segmentados", exam.segmentadosRelativo, exam.segmentadosAbsoluto, "segmentados")}
            {exam.eosinofilosRelativo && renderLeukocyteParam("Eosinófilos", exam.eosinofilosRelativo, exam.eosinofilosAbsoluto, "eosinofilos")}
            {exam.basofilosRelativo && renderLeukocyteParam("Basófilos", exam.basofilosRelativo, exam.basofilosAbsoluto, "basofilos")}
            {exam.linfocitosRelativo && renderLeukocyteParam("Linfócitos", exam.linfocitosRelativo, exam.linfocitosAbsoluto, "linfocitos")}
            {exam.monocitosRelativo && renderLeukocyteParam("Monócitos", exam.monocitosRelativo, exam.monocitosAbsoluto, "monocitos")}
            {exam.observacoesSerieBranca && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.subsectionTitle}>Observações da Série Branca:</Text>
                <Text style={styles.observationText}>{exam.observacoesSerieBranca}</Text>
              </View>
            )}

            {/* Plaquetas */}
            <Text style={styles.sectionTitle}>PLAQUETOGRAMA</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.headerCellName]}>NOME DO PARÂMETRO</Text>
              <Text style={[styles.headerCell, styles.headerCellResult]}>RESULTADO</Text>
              <Text style={[styles.headerCell, styles.headerCellReference]}>REFERÊNCIA</Text>
              <Text style={[styles.headerCell, styles.headerCellIndicator]}>INDICADOR</Text>
            </View>
            {renderHemogramParam("Plaquetas totais", exam.contagemPlaquetaria, "/µL", "contagemPlaquetaria")}
            {exam.avaliacaoPlaquetaria && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.subsectionTitle}>Avaliação Plaquetária:</Text>
                <Text style={styles.observationText}>{exam.avaliacaoPlaquetaria}</Text>
              </View>
            )}

            {/* Nota */}
            {exam.nota && (
              <View style={{ marginTop: 15 }}>
                <Text style={styles.subsectionTitle}>Nota:</Text>
                <Text style={styles.observationText}>{exam.nota}</Text>
              </View>
            )}
          </>
        ) : (
          exam.result && (
            <View style={{ marginTop: 15 }}>
              <Text style={styles.sectionTitle}>Resultado</Text>
              <Text style={styles.observationText}>{exam.result}</Text>
            </View>
          )
        )}

        {exam.observacoesGeraisExame && (
          <View style={{ marginTop: 15 }}>
            <Text style={styles.sectionTitle}>Observações Gerais do Exame</Text>
            <Text style={styles.observationText}>{exam.observacoesGeraisExame}</Text>
          </View>
        )}

        {/* Rodapé */}
        <View style={styles.footerContainer} fixed>
          <Text style={styles.dateText}>
            Data de Emissão: {formatDateToPortuguese(currentDate)}
          </Text>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine}/>
            <Text style={styles.signatureLabel}>Assinatura do Veterinário</Text>
            <Text style={styles.signatureDetails}>{exam.vet}</Text>
            {/* Adicionar CRMV e MAPA do veterinário se disponível */}
          </View>
        </View>
      </Page>
    </Document>
  );
};