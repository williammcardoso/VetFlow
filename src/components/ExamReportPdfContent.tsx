import React from "react";
import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import { mockCompanySettings } from "@/mockData/settings";
import { ExamEntry, HemogramReference, HemogramReferenceValue, ExamReportData } from "@/types/exam";
import { hemogramReferences } from "@/constants/examReferences";

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
  // Substitui vírgula por ponto para parseFloat e remove pontos de milhar
  return parseFloat(raw.replace(/\./g, '').replace(',', '.'));
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
    width: 120, // NOME DO PARÂMETRO
  },
  headerCellResult: {
    width: 100, // RESULTADO
    textAlign: "right",
  },
  headerCellReference: {
    width: 120, // REFERÊNCIA
    textAlign: "right",
  },
  headerCellIndicator: {
    width: 130, // INDICADOR
    textAlign: "center",
  },

  // Custom header for Leukogram to match image
  leukogramHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 5,
    marginBottom: 5,
    backgroundColor: "#f5f5f5",
  },
  leukogramHeaderName: {
    width: 120,
    fontSize: 9,
    fontWeight: "bold",
    color: "#333",
    textAlign: "left",
    paddingLeft: 5,
  },
  leukogramHeaderResults: {
    width: 100, // Combined width for relative and absolute results
    flexDirection: 'column', // Changed to column
    alignItems: 'flex-end', // Align sub-headers to the right
    justifyContent: 'center',
  },
  leukogramHeaderReferences: {
    width: 120, // Combined width for relative and absolute references
    flexDirection: 'column', // Changed to column
    alignItems: 'flex-end', // Align sub-headers to the right
    justifyContent: 'center',
  },
  leukogramHeaderSub: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#333",
    textAlign: 'right',
    lineHeight: 1.2, // Adjust line height for better spacing
  },
  leukogramHeaderIndicator: {
    width: 130, // INDICADOR
    fontSize: 9,
    fontWeight: "bold",
    color: "#333",
    textAlign: "right", // Alinhado à direita
  },

  paramRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    minHeight: 18,
  },
  paramName: {
    width: 120,
    fontSize: 9,
    color: "#333",
    paddingLeft: 5,
  },
  // For single-value results (Eritrograma, Plaquetas)
  paramResultContainer: {
    width: 100,
    flexDirection: 'column', // Changed to column to allow multiple lines if needed
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  paramResultText: {
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "right",
  },
  // For multi-value results (Leukogram)
  leukocyteResultContainer: {
    width: 100,
    flexDirection: 'row', // Alterado para row
    alignItems: 'center', // Centraliza verticalmente
    justifyContent: 'flex-end', // Alinha à direita
  },
  leukocyteResultText: {
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "right",
    width: '45%', // Largura para o valor relativo
  },
  leukocyteResultTextAbsolute: {
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "right",
    width: '55%', // Largura para o valor absoluto
  },

  // New styles for granular reference columns (9 columns)
  referenceContainer: {
    width: 120,
    flexDirection: 'row',
    alignItems: 'center',
  },
  refCell: {
    fontSize: 7,
    color: "#666",
  },
  // Column 1: Relative Value 1
  refVal1: {
    width: 14, 
    textAlign: 'right',
  },
  // Column 2: Relative Separator
  refSep: {
    width: 8, 
    textAlign: 'right', // Alterado para 'right'
  },
  // Column 3: Relative Value 2
  refVal2: {
    width: 14, 
    textAlign: 'right',
  },
  // Column 4: Relative Unit
  refUnit: {
    width: 12, 
    textAlign: 'left',
  },
  // Column 5: Spacer between relative and absolute
  refSpacer: {
    width: 8, 
  },
  // Column 6: Absolute Value 1
  refVal1Abs: {
    width: 19, 
    textAlign: 'right',
  },
  // Column 7: Absolute Separator
  refSepAbs: { // Specific style for absolute separator if needed, or reuse refSep
    width: 8, 
    textAlign: 'right', // Alterado para 'right'
  },
  // Column 8: Absolute Value 2
  refVal2Abs: {
    width: 21, // Aumentado de 19 para 21
    textAlign: 'right',
  },
  // Column 9: Absolute Unit
  refUnitAbs: {
    width: 16, // Diminuído de 18 para 16
    textAlign: 'left',
  },
  indicatorColumn: {
    width: 130, // Fixed width for the column
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end', // Align the bar to the right within this column
    flexGrow: 1, // Make it grow to fill remaining space
  },
  indicatorBarBackground: {
    width: 100, // Fixed width for the bar itself (e.g., 100px, less than 130px)
    height: 8,
    backgroundColor: '#ffe0e0',
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  indicatorBarNormalRange: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#ccffcc',
    borderRadius: 2,
  },
  indicatorMarker: {
    position: 'absolute',
    fontSize: 12,
    top: -2,
    width: 8,
    textAlign: 'center',
  },
  resultNormal: {
    color: "#000000",
  },
  resultHigh: {
    color: "#dc3545",
  },
  resultLow: {
    color: "#007bff",
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
  const BAR_WIDTH = 100; // Matches the width of indicatorBarBackground
  const BAR_HEIGHT = 8;

  const numValue = normalizeNumber(value);

  // Determine marker color based on valueStatus
  let markerColor = styles.resultNormal.color;
  if (valueStatus === 'high') markerColor = styles.resultHigh.color;
  if (valueStatus === 'low') markerColor = styles.resultLow.color;

  // --- Cálculo das posições para a faixa verde e o marcador ---
  let visualMin = minRef;
  let visualMax = maxRef;

  // Ajuste para casos onde minRef === maxRef para evitar divisão por zero e ter uma visualização mínima
  if (visualMax === visualMin) {
    const delta = Math.max(1, Math.abs(visualMin) * 0.1 || 1);
    visualMin = visualMin - delta;
    visualMax = visualMax + delta;
  }

  // Expandir o range visual para acomodar valores fora da referência
  const rangeBuffer = (visualMax - visualMin) * 0.2; // 20% de buffer em cada lado
  const effectiveVisualMin = visualMin - rangeBuffer;
  const effectiveVisualMax = visualMax + rangeBuffer;
  const totalEffectiveRange = effectiveVisualMax - effectiveVisualMin;

  let greenBarLeft = 0;
  let greenBarWidth = 0;
  let markerPosition = 0;

  // Use a dynamic width for calculations based on the parent's actual width
  // For PDF, we can assume BAR_WIDTH is the effective width of the container
  const effectiveBarWidth = BAR_WIDTH; // Placeholder, actual width will be '100%'

  if (totalEffectiveRange > 0) {
    greenBarLeft = ((minRef - effectiveVisualMin) / totalEffectiveRange) * effectiveBarWidth;
    greenBarWidth = ((maxRef - minRef) / totalEffectiveRange) * effectiveBarWidth;
    markerPosition = ((numValue - effectiveVisualMin) / totalEffectiveRange) * effectiveBarWidth;
  } else { // Fallback para ranges inválidos ou zero, centraliza tudo
    greenBarLeft = effectiveBarWidth / 2 - 5; // Pequeno segmento central
    greenBarWidth = 10;
    markerPosition = effectiveBarWidth / 2;
  }

  // Clampar posições para garantir que estejam dentro dos limites da barra
  greenBarLeft = Math.max(0, Math.min(effectiveBarWidth - greenBarWidth, greenBarLeft));
  greenBarWidth = Math.max(0, greenBarWidth);
  markerPosition = Math.max(0, Math.min(effectiveBarWidth, markerPosition));

  return (
    <View style={styles.indicatorBarBackground}>
      {greenBarWidth > 0 && (
        <View style={[styles.indicatorBarNormalRange, { left: greenBarLeft, width: greenBarWidth }]} />
      )}
      {!isNaN(numValue) && (
        <Text style={[styles.indicatorMarker, { left: markerPosition - (styles.indicatorMarker.fontSize as number / 2), color: markerColor }]}>●</Text>
      )}
    </View>
  );
};

// Helper function to parse leukocyte reference strings
const parseLeukocyteReference = (refString: string | undefined) => {
  if (!refString || refString === 'N/A') {
    return { val1: '', sep: '', val2: '', unit: '' };
  }

  // Case 1: "VALUE1 - VALUE2 UNIT" (e.g., "60 - 77 %", "3.000 - 11.500 /µL")
  const rangeWithUnitMatch = refString.match(/^(\S+)\s*-\s*(\S+)\s*(\S*)$/);
  if (rangeWithUnitMatch) {
    return {
      val1: rangeWithUnitMatch[1],
      sep: '-',
      val2: rangeWithUnitMatch[2],
      unit: rangeWithUnitMatch[3] || ''
    };
  }

  // Case 2: "VALUE UNIT" (e.g., "0 %")
  const valueWithUnitMatch = refString.match(/^(\S+)\s*(\S*)$/);
  if (valueWithUnitMatch) {
    return {
      val1: valueWithUnitMatch[1],
      sep: '',
      val2: '',
      unit: valueWithUnitMatch[2] || ''
    };
  }

  // Case 3: "/ raros"
  if (refString.includes('/ raros')) {
    return { val1: '', sep: '/', val2: 'raros', unit: '' };
  }

  // Fallback: just the string as val1
  return { val1: refString, sep: '', val2: '', unit: '' };
};


export const ExamReportPdfContent = ({
  animalName, animalId, animalSpecies, tutorName, tutorAddress, exam,
}: ExamReportData) => {
  const currentDate = new Date();
  const speciesKey = animalSpecies === "Canino" ? "dog" : animalSpecies === "Felino" ? "cat" : undefined;

  const getReferenceRange = (param: string): HemogramReferenceValue | undefined => {
    if (!speciesKey || !hemogramReferences[param]) return undefined;
    return hemogramReferences[param][speciesKey];
  };

  const getValueStatus = (value: string | undefined, ref: HemogramReferenceValue | undefined): 'normal' | 'high' | 'low' | 'invalid' => {
    if (!value || !ref || ref.min === undefined || ref.max === undefined) return 'invalid';
    const numValue = normalizeNumber(value);
    if (isNaN(numValue)) return 'invalid';

    if (numValue < ref.min) return 'low';
    if (numValue > ref.max) return 'high';
    return 'normal'; // If not low and not high, it's normal
  };

  // Renderiza um parâmetro de hemograma de valor único
  const renderHemogramParam = (
    label: string,
    value: string | undefined,
    unit: string,
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

    return (
      <View style={styles.paramRow}>
        <Text style={styles.paramName}>{label}</Text>
        <View style={styles.paramResultContainer}>
          <Text style={[styles.paramResultText, resultStyle]}>{value} {unit}</Text>
        </View>
        <View style={styles.referenceContainer}> {/* Usando o novo container de referência */}
          <Text style={styles.refCell}>{ref?.full || 'N/A'}</Text>
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

    const relValueStatus = getValueStatus(relativeValue, relRef);
    const absValueStatus = getValueStatus(absoluteValue, absRef);

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
    const indicatorMin = absRef?.min;
    const indicatorMax = absRef?.max;
    const indicatorValueStatus = absValueStatus;

    const parsedRelRef = parseLeukocyteReference(relRef?.relative);
    const parsedAbsRef = parseLeukocyteReference(absRef?.absolute);

    return (
      <View style={styles.paramRow}>
        <Text style={styles.paramName}>{label}</Text>
        <View style={styles.leukocyteResultContainer}>
          <Text style={[styles.leukocyteResultText, relResultStyle]}>{relativeValue}%</Text>
          <Text style={[styles.leukocyteResultTextAbsolute, absResultStyle]}>{absoluteValue}/µL</Text>
        </View>
        <View style={styles.referenceContainer}>
          {/* Relative Part - 4 columns */}
          <Text style={[styles.refCell, styles.refVal1]}>{parsedRelRef.val1}</Text>
          <Text style={[styles.refCell, styles.refSep]}>{parsedRelRef.sep}</Text>
          <Text style={[styles.refCell, styles.refVal2]}>{parsedRelRef.val2}</Text>
          <Text style={[styles.refCell, styles.refUnit]}> {parsedRelRef.unit}</Text> {/* Added space */}
          {/* Spacer - 1 column */}
          <Text style={styles.refSpacer}></Text> 
          {/* Absolute Part - 4 columns */}
          <Text style={[styles.refCell, styles.refVal1Abs]}>{parsedAbsRef.val1}</Text>
          <Text style={[styles.refCell, styles.refSepAbs]}>{parsedAbsRef.sep}</Text> {/* Using refSepAbs for clarity */}
          <Text style={[styles.refCell, styles.refVal2Abs]}>{parsedAbsRef.val2}</Text>
          <Text style={[styles.refCell, styles.refUnitAbs]}> {parsedAbsRef.unit}</Text> {/* Added space */}
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

        {/* Informações do Animal e Tutor (Restored) */}
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
          </View>
        </View>

        {/* General Exam Info (Restored) */}
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
            {renderHemogramParam("Eritrócitos", exam.eritrocitos, "M/mm3", "eritrocitos")}
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
            <Text style={styles.sectionTitle}>LEUCOGRAMA</Text>
            {/* Custom header for Leukogram */}
            <View style={styles.leukogramHeader}>
              <Text style={styles.leukogramHeaderName}>NOME DO PARÂMETRO</Text>
              <View style={styles.leukogramHeaderResults}>
                <Text style={styles.leukogramHeaderSub}>Relativo:</Text>
                <Text style={styles.leukogramHeaderSub}>Absoluto:</Text>
              </View>
              <View style={styles.leukogramHeaderReferences}>
                <Text style={styles.leukogramHeaderSub}>Relativo:</Text>
                <Text style={styles.leukogramHeaderSub}>Absoluto:</Text>
              </View>
              <Text style={styles.leukogramHeaderIndicator}>Indicador:</Text>
            </View>

            {renderHemogramParam("Leucócitos totais", exam.leucocitosTotais, "mil/µL", "leucocitosTotais")}
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