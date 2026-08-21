import React from "react";
import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import { MedicationData, ManipulatedPrescriptionData } from "@/types/medication";
import { mockCompanySettings } from "@/mockData/settings";
import type { UserProfile } from "@/lib/authApi";

// Registrando a fonte Inter com pesos regular, bold, italic e bold-italic
// Usando os arquivos .ttf disponíveis na pasta public/fonts
Font.register({
  family: "Inter",
  fonts: [
    { src: '/fonts/Inter-Regular.ttf', fontWeight: 400, format: 'truetype' },
    { src: '/fonts/Inter-Bold.ttf', fontWeight: 700, format: 'truetype' },
    { src: '/fonts/Inter-Italic.ttf', fontStyle: 'italic', fontWeight: 400, format: 'truetype' },
    { src: '/fonts/Inter-BoldItalic.ttf', fontStyle: 'italic', fontWeight: 700, format: 'truetype' },
  ],
});

// Helper function to format date
const formatDateToPortuguese = (date: Date) => {
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
  const formattedDate = date.toLocaleDateString('pt-BR', options);
  return formattedDate.toUpperCase();
};

// Idade a partir da data de nascimento ("YYYY-MM-DD"). Usa T00:00:00 pra
// evitar o bug de fuso (new Date("YYYY-MM-DD") parseia como UTC meia-noite,
// que no Brasil, UTC-3, vira o dia anterior).
const formatAgeFromBirthday = (birthday?: string): string => {
  if (!birthday) return "Não informada";
  const birth = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return "Não informada";
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  if (years < 0) return "Não informada";
  if (years === 0) return `${months} ${months === 1 ? "mês" : "meses"}`;
  if (months === 0) return `${years} ${years === 1 ? "ano" : "anos"}`;
  return `${years} ${years === 1 ? "ano" : "anos"} e ${months} ${months === 1 ? "mês" : "meses"}`;
};

// Helper para formatar unidades para o PDF (formato abreviado)
const getLongUnitAbbreviation = (unit: string): string => {
  switch (unit) {
    case "Grama (g)": return "g";
    case "Miligrama (mg)": return "mg";
    case "Mililitro (mL)": return "mL";
    case "Micrograma (mcg)": return "mcg";
    case "Unidade(s)": return "un";
    case "%": return "%";
    case "UFC": return "UFC";
    case "UFC/g": return "UFC/g";
    case "UFC/kg": return "UFC/kg";
    default: return unit;
  }
};

interface PrescriptionPdfContentProps {
  animalName: string;
  animalId: string;
  /** ID de exibição em 4 dígitos (ex.: 0001). Se não informado, usa animalId. */
  displayId?: string;
  animalSpecies: string;
  animalBreed?: string;
  animalSex?: string;
  animalBirthday?: string;
  animalWeight?: number;
  animalMicrochip?: string;
  tutorName: string;
  tutorAddress: string;
  tutorDocument?: string;
  tutorPhone?: string;
  medications: MedicationData[]; // Para receitas simples/controladas
  generalObservations: string;
  showElectronicSignatureText: boolean;
  prescriptionType: 'simple' | 'controlled' | 'manipulated';
  pharmacistName?: string;
  pharmacistCpf?: string;
  pharmacistCfr?: string;
  pharmacistAddress?: string;
  pharmacistPhone?: string;
  manipulatedPrescription?: ManipulatedPrescriptionData; // Novo campo para dados da receita manipulada
  userProfile?: UserProfile | null;
}

// Define a threshold for when to apply compact styles for simple prescriptions
const MEDICATION_COUNT_THRESHOLD = 6; // Adjust this number as needed

// Function to get dynamic styles based on whether it's a compact simple prescription
const getDynamicStyles = (isCompactSimplePrescription: boolean, prescriptionType: 'simple' | 'controlled' | 'manipulated') => StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Inter",
    fontSize: 10,
    color: "#333",
  },
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
    fontFamily: "Inter",
    fontWeight: "bold",
    marginBottom: 20,
  },
  viaTextContainer: {
    textAlign: 'right',
    fontSize: 9,
    color: '#333',
    marginBottom: 10,
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
  patientInfoControlled: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    marginBottom: 0,
    marginTop: 0,
  },
  patientInfoControlledTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  patientInfoControlledText: {
    fontSize: 10,
    marginBottom: 2,
    color: "#333",
  },
  groupTitle: {
    fontSize: isCompactSimplePrescription ? 12 : 13,
    fontWeight: "bold",
    marginTop: isCompactSimplePrescription ? 10 : 15,
    marginBottom: isCompactSimplePrescription ? 8 : 10,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 4,
  },
  medicationItem: {
    flexDirection: "column",
    marginBottom: isCompactSimplePrescription ? 8 : 10,
  },
  medicationHeaderLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  medicationNumber: {
    fontSize: isCompactSimplePrescription ? 8 : 9,
    marginRight: 5,
    width: 15,
  },
  medicationNameConcentration: {
    fontSize: isCompactSimplePrescription ? 8 : 11, // Aumentado para 11
    fontWeight: "bold",
    flexShrink: 1,
  },
  lineSeparator: {
    borderBottomWidth: 2,
    borderBottomColor: "#ccc",
    borderStyle: "dotted",
    flexGrow: 1,
    height: 2,
    marginHorizontal: 8,
  },
  badgeContainer: {
    flexDirection: "row",
    gap: 5,
    flexShrink: 0,
  },
  pharmacyBadge: {
    fontSize: 7, // Revertido para 7
    paddingHorizontal: isCompactSimplePrescription ? 5 : 6,
    paddingVertical: isCompactSimplePrescription ? 2 : 3,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    color: "#555",
    borderWidth: 1,
    borderColor: "#ccc",
    justifyContent: 'center', // Centraliza horizontalmente
    alignItems: 'center', // Centraliza verticalmente
  },
  quantityBadge: {
    fontSize: 8, // Revertido para 8
    paddingHorizontal: isCompactSimplePrescription ? 7 : 8,
    paddingVertical: isCompactSimplePrescription ? 3 : 4,
    borderRadius: 8,
    backgroundColor: "#e0e0ff",
    color: "#333",
    borderWidth: 1,
    borderColor: "#aaa",
    justifyContent: 'center', // Centraliza horizontalmente
    alignItems: 'center', // Centraliza verticalmente
  },
  medicationInstructions: {
    fontSize: isCompactSimplePrescription ? 8 : 10, // Aumentado para 10
    color: "#444",
    marginLeft: 20,
    lineHeight: isCompactSimplePrescription ? 1.3 : 1.4,
  },
  medicationObservations: {
    fontSize: isCompactSimplePrescription ? 7 : 9, // Aumentado para 9
    color: "#777",
    marginLeft: 20,
    marginTop: 3,
    fontStyle: "italic",
    fontFamily: "Inter",
  },
  generalObservationsSection: {
    marginTop: isCompactSimplePrescription ? 15 : 25,
    paddingTop: isCompactSimplePrescription ? 8 : 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  generalObservationsTitle: {
    fontSize: isCompactSimplePrescription ? 12 : 13,
    fontWeight: "bold",
    marginBottom: 8,
  },
  generalObservationsText: {
    fontSize: isCompactSimplePrescription ? 9 : 10,
    lineHeight: isCompactSimplePrescription ? 1.4 : 1.5,
  },
  vetSignatureBlock: {
    textAlign: 'center',
    width: 180,
  },
  vetSignatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    marginBottom: 3,
    marginTop: 10,
  },
  vetSignatureLabel: {
    fontSize: 9,
    color: "#333",
  },
  vetSignatureDetails: {
    fontSize: 9,
    color: "#666",
  },
  vetSignatureDateText: {
    fontSize: 10,
    color: "#333",
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
  controlledPrescriptionHeader: {
    marginBottom: 0,
    paddingBottom: 10,
    borderBottomWidth: 0,
    borderBottomColor: "#eee",
  },
  controlledPrescriptionTitle: {
    fontSize: 22,
    textAlign: "center",
    fontFamily: "Inter",
    fontWeight: "bold",
    color: "#333",
    marginBottom: 6,
  },
  identificationCardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  identificationCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    justifyContent: 'space-between',
  },
  identificationTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 5,
  },
  identificationField: {
    fontSize: 10,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  identificationLabel: {
    marginRight: 3,
  },
  identificationLine: {
    flexGrow: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  pharmacistSignatureBlock: {
    marginTop: 'auto',
    marginBottom: 5,
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
  pharmacistSignatureLine: {
    width: 180,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    marginBottom: 3,
    marginTop: 20,
  },
  pharmacistSignatureLabel: {
    fontSize: 9,
    color: "#333",
    textAlign: 'center',
  },
  identificationDateLine: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 5,
  },
  identificationDatePart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginRight: 5,
  },
  identificationDateSeparator: {
    marginHorizontal: 2,
  },
  buyerSignatureDateContainer: {
    position: 'absolute',
    bottom: 206,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: 'auto',
  },
  buyerDateText: {
    fontSize: 10,
    color: "#333",
  },
  buyerSignatureBlock: {
    textAlign: 'center',
    width: 180,
  },
  buyerSignatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    marginBottom: 0,
    marginTop: 5,
  },
  buyerSignatureLabel: {
    fontSize: 9,
    color: "#333",
  },
  contentWrapper: {
    marginBottom: prescriptionType === 'controlled' ? 226 : (isCompactSimplePrescription ? 100 : 120), 
  },
  // Estilos específicos para Receita Manipulada
  manipulatedSectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 4,
  },
  manipulatedComponentItem: {
    fontSize: 10,
    marginBottom: 5,
    marginLeft: 10,
  },
  manipulatedDetailItem: {
    fontSize: 10,
    marginBottom: 5,
  },
  // Novos estilos para o formato de receita manipulada
  manipulatedGroupTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 4,
    textAlign: 'left', // Revertido para left-aligned
  },
  centeringWrapper: {
    width: '100%',
    alignItems: 'center', // Centers children horizontally in a column flex container
    flexDirection: 'column', // Explicitly set for clarity
  },
  manipulatedListContainer: {
    width: '80%', // Define uma largura para o contêiner da lista
    // Removido paddingHorizontal para dar mais espaço à linha pontilhada
  },
  manipulatedListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    paddingLeft: 0, // Removido o recuo para centralizar melhor
    paddingRight: 0, // Removido o espaço em branco à direita
  },
  manipulatedBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
    marginRight: 5,
  },
  manipulatedItemName: {
    fontSize: 10,
    flexShrink: 1,
    fontWeight: "bold",
  },
  manipulatedDottedLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    borderStyle: "dotted",
    flexGrow: 1, // Alterado para 1 para preencher o espaço
    height: 1,
    marginHorizontal: 8,
  },
  manipulatedDosage: {
    fontSize: 10,
    flexShrink: 0,
    fontWeight: "bold",
    marginLeft: 5,
  },
  manipulatedInstructionsTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
    textAlign: 'left', // Revertido para left-aligned
  },
  manipulatedInstructionsText: {
    fontSize: 10,
    lineHeight: 1.4,
    textAlign: 'left', // Revertido para left-aligned
  },
});


export const PrescriptionPdfContent = ({
  animalName, animalId, displayId, animalSpecies, animalBreed, animalSex,
  animalBirthday, animalWeight, animalMicrochip, tutorName, tutorAddress,
  tutorDocument, tutorPhone,
  medications, generalObservations, showElectronicSignatureText,
  prescriptionType, pharmacistName, pharmacistCpf, pharmacistCfr,
  pharmacistAddress, pharmacistPhone, manipulatedPrescription,
  userProfile,
}: PrescriptionPdfContentProps) => {
  const patientId = displayId ?? animalId;
  const groupedMedications = medications.reduce((acc: Record<string, MedicationData[]>, med) => {
    const useType = med.useType || "Outros";
    if (!acc[useType]) { acc[useType] = []; }
    acc[useType].push(med);
    return acc;
  }, {});

  const currentDate = new Date();
  const vetName = userProfile?.signature_text?.trim() || userProfile?.full_name?.trim() || "________________________________";
  const vetCrmv = userProfile?.crmv?.trim() || "Não informado";
  const vetMapa = userProfile?.mapa_registration?.trim() || "Não informado";

  // Determine if compact styles should be applied for simple prescriptions
  const isCompactSimplePrescription = prescriptionType === 'simple' && medications.length >= MEDICATION_COUNT_THRESHOLD;
  const styles = getDynamicStyles(isCompactSimplePrescription, prescriptionType);

  // Altura estimada do identificationCardContainer (rodapé fixo)
  const IDENTIFICATION_FOOTER_HEIGHT = 166;
  const PAGE_BOTTOM_PADDING = 30;
  const GAP_ABOVE_FOOTER = 10; 

  const BUYER_SIGNATURE_BOTTOM_POSITION = PAGE_BOTTOM_PADDING + IDENTIFICATION_FOOTER_HEIGHT + GAP_ABOVE_FOOTER;


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

        {prescriptionType === 'controlled' ? (
          <View style={styles.controlledPrescriptionHeader}>
            <Text style={styles.controlledPrescriptionTitle}>RECEITUÁRIO DE CONTROLE ESPECIAL</Text>
            <View style={styles.viaTextContainer}>
              <Text>1.ª VIA - FARMÁCIA</Text>
              <Text>2.ª VIA - PACIENTE</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.mainTitle}>
            {prescriptionType === 'manipulated' ? 'Receita Manipulada' : 'Receita Simples'}
          </Text>
        )}

        {/* Informações do Emitente/Paciente/Proprietário (controlada, 3 colunas)
            ou Animal/Tutor (simples/manipulada, 2 colunas) — campos sem valor
            (sexo, idade, peso, microchip, CPF, telefone, endereço) somem em
            vez de imprimir "Não informado", pra não alongar o documento. */}
        {prescriptionType === 'controlled' ? (
          <View style={styles.infoSectionContainer}>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Emitente (Veterinário)</Text>
              <Text style={styles.infoText}>Nome: {vetName}</Text>
              <Text style={styles.infoText}>CRMV: {vetCrmv}</Text>
              <Text style={styles.infoText}>Registro MAPA: {vetMapa}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Paciente</Text>
              <Text style={styles.infoText}>ID: {patientId}</Text>
              <Text style={styles.infoText}>Nome: {animalName}</Text>
              <Text style={styles.infoText}>Espécie: {animalSpecies}{animalBreed ? ` — ${animalBreed}` : ""}</Text>
              {animalSex ? <Text style={styles.infoText}>Sexo: {animalSex}</Text> : null}
              {animalBirthday ? <Text style={styles.infoText}>Idade: {formatAgeFromBirthday(animalBirthday)}</Text> : null}
              {animalWeight ? <Text style={styles.infoText}>Peso: {animalWeight} kg</Text> : null}
              {animalMicrochip ? <Text style={styles.infoText}>Microchip: {animalMicrochip}</Text> : null}
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Proprietário</Text>
              <Text style={styles.infoText}>Nome: {tutorName}</Text>
              {tutorDocument ? <Text style={styles.infoText}>CPF/CNPJ: {tutorDocument}</Text> : null}
              {tutorPhone ? <Text style={styles.infoText}>Telefone: {tutorPhone}</Text> : null}
              {tutorAddress ? <Text style={styles.infoText}>Endereço: {tutorAddress}</Text> : null}
            </View>
          </View>
        ) : (
          // Informações do Animal e Tutor para receita simples/manipulada
          <View style={styles.infoSectionContainer}>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Animal</Text>
              <Text style={styles.infoText}>ID: {patientId}</Text>
              <Text style={styles.infoText}>Nome: {animalName}</Text>
              <Text style={styles.infoText}>Espécie: {animalSpecies}{animalBreed ? ` — ${animalBreed}` : ""}</Text>
              {animalSex ? <Text style={styles.infoText}>Sexo: {animalSex}</Text> : null}
              {animalBirthday ? <Text style={styles.infoText}>Idade: {formatAgeFromBirthday(animalBirthday)}</Text> : null}
              {animalWeight ? <Text style={styles.infoText}>Peso: {animalWeight} kg</Text> : null}
              {animalMicrochip ? <Text style={styles.infoText}>Microchip: {animalMicrochip}</Text> : null}
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Tutor</Text>
              <Text style={styles.infoText}>Nome: {tutorName}</Text>
              {tutorDocument ? <Text style={styles.infoText}>CPF/CNPJ: {tutorDocument}</Text> : null}
              {tutorPhone ? <Text style={styles.infoText}>Telefone: {tutorPhone}</Text> : null}
              {tutorAddress ? <Text style={styles.infoText}>Endereço: {tutorAddress}</Text> : null}
            </View>
          </View>
        )}

        <View style={styles.contentWrapper}>
          {prescriptionType === 'manipulated' && manipulatedPrescription ? (
            <>
              <Text style={styles.manipulatedGroupTitle}>VIA {manipulatedPrescription.productDetails.route.toUpperCase()}</Text>
              <View style={styles.centeringWrapper}>
                <View style={styles.manipulatedListContainer}>
                  {manipulatedPrescription.formulaComponents.map((comp) => (
                    <View key={comp.id} style={styles.manipulatedListItem}>
                      <View style={styles.manipulatedBullet} /> {/* Bullet point como View */}
                      <Text style={styles.manipulatedItemName}>{comp.name}</Text>
                      <View style={styles.manipulatedDottedLine} />
                      <Text style={styles.manipulatedDosage}>{comp.dosageQuantity} {getLongUnitAbbreviation(comp.dosageUnit)}</Text>
                    </View>
                  ))}
                  {manipulatedPrescription.vehicleExcipient && (
                    <View style={styles.manipulatedListItem}>
                      <View style={styles.manipulatedBullet} /> {/* Bullet point como View */}
                      <Text style={styles.manipulatedItemName}>{manipulatedPrescription.vehicleExcipient.type} q.s.p.</Text>
                      <View style={styles.manipulatedDottedLine} />
                      <Text style={styles.manipulatedDosage}>{manipulatedPrescription.vehicleExcipient.quantity} {getLongUnitAbbreviation(manipulatedPrescription.vehicleExcipient.unit)}</Text>
                    </View>
                  )}
                </View>
              </View>

              <Text style={styles.manipulatedInstructionsTitle}>Instruções de uso:</Text>
              {manipulatedPrescription.posology.type === 'automatic' ? (
                <Text style={styles.manipulatedInstructionsText}>
                  {manipulatedPrescription.posology.data.finalDescription || "Posologia automática não preenchida."}
                </Text>
              ) : (
                <Text style={styles.manipulatedInstructionsText}>
                  {manipulatedPrescription.posology.data.finalDescription || "Posologia em texto livre não preenchida."}
                </Text>
              )}

              {manipulatedPrescription.generalObservations && (
                <View style={styles.generalObservationsSection}>
                  <Text style={styles.generalObservationsTitle}>Observações Gerais da Receita</Text>
                  <Text style={styles.generalObservationsText}>{manipulatedPrescription.generalObservations}</Text>
                </View>
              )}
            </>
          ) : (
            // Conteúdo para receitas simples/controladas
            <>
              {Object.keys(groupedMedications).map((useType) => (
                <View key={useType}>
                  <Text style={styles.groupTitle}>{useType}</Text>
                  {groupedMedications[useType].map((med, index) => (
                    <View key={med.id} style={styles.medicationItem}>
                      <View style={styles.medicationHeaderLine}>
                        <Text style={styles.medicationNumber}>{index + 1})</Text>
                        <Text style={styles.medicationNameConcentration}>
                          {(() => {
                            const name = (med.medicationName && med.medicationName.trim()) || '';
                            const concentration = (med.concentration && med.concentration.trim()) || '';
                            if (name.length > 0 && concentration.length > 0) { return `${name} ${concentration}`; }
                            else if (name.length > 0) { return name; }
                            else if (concentration.length > 0) { return concentration; }
                            return 'Medicamento sem nome';
                          })()}
                        </Text>
                        <View style={styles.lineSeparator}/>
                        <View style={styles.badgeContainer}>
                          {med.pharmacyType ? (<Text style={styles.pharmacyBadge}>{med.pharmacyType === "Farmácia Veterinária" ? "VET" : "HUMANA"}</Text>) : null}
                          {med.totalQuantityDisplay ? (<Text style={styles.quantityBadge}>{med.totalQuantityDisplay}</Text>) : null}
                        </View>
                      </View>
                      <Text style={styles.medicationInstructions}>
                        {med.generatedInstructions || 'Sem instruções de uso.'}
                      </Text>
                      {med.generalObservations && med.generalObservations.trim().length > 0 ? (
                        <Text style={styles.medicationObservations}>
                          <Text style={{ fontFamily: "Inter", fontWeight: "bold" }}>Obs.:</Text>
                          <Text style={{ fontFamily: "Inter", fontWeight: "normal" }}> {med.generalObservations}</Text>
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ))}

              {generalObservations ? (
                <View style={styles.generalObservationsSection}>
                  <Text style={styles.generalObservationsTitle}>Observações Gerais da Receita</Text>
                  <Text style={styles.generalObservationsText}>{generalObservations}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>

        {/* NOVO BLOCO: Data e Assinatura do Comprador (para Receitas Controladas, fixo na parte inferior) */}
        {prescriptionType === 'controlled' && (
          <View style={[styles.buyerSignatureDateContainer, { bottom: BUYER_SIGNATURE_BOTTOM_POSITION }]} fixed>
            <Text style={styles.buyerDateText}>
              Data: {formatDateToPortuguese(currentDate)}
            </Text>
            <View style={styles.buyerSignatureBlock}>
              <View style={styles.buyerSignatureLine}/>
              <Text style={styles.buyerSignatureLabel}>Assinatura</Text>
            </View>
          </View>
        )}

        {/* Rodapé para Receitas Simples/Manipuladas (fixed) */}
        {prescriptionType !== 'controlled' && (
          <View style={styles.footerContainer} fixed>
            <Text style={styles.vetSignatureDateText}>
              Data: {formatDateToPortuguese(currentDate)}
            </Text>
            <View style={styles.vetSignatureBlock}>
              {showElectronicSignatureText ? (
                <Text style={styles.vetSignatureLabel}>Assinado eletronicamente por</Text>
              ) : null}
              <View style={styles.vetSignatureLine}/>
              <Text style={styles.vetSignatureLabel}>{vetName}</Text>
              <Text style={styles.vetSignatureDetails}>CRMV {vetCrmv}</Text>
              <Text style={styles.vetSignatureDetails}>Registro no MAPA {vetMapa}</Text>
            </View>
          </View>
        )}

        {/* Rodapé para Receitas Controladas (fixed) */}
        {prescriptionType === 'controlled' ? (
          <View style={styles.identificationCardContainer} fixed>
            <View style={styles.identificationCard}>
              <Text style={styles.identificationTitle}>IDENTIFICAÇÃO DO COMPRADOR</Text>
              <View style={styles.identificationField}>
                <Text style={styles.identificationLabel}>Nome completo</Text>
                <View style={styles.identificationLine}/>
              </View>
              <View style={styles.identificationField}>
                <Text style={styles.identificationLabel}>Ident.</Text>
                <View style={[styles.identificationLine, { width: 80 }]}/>
                <Text style={styles.identificationLabel}>Org Emissor</Text>
                <View style={[styles.identificationLine, { width: 40 }]}/>
              </View>
              <View style={styles.identificationField}>
                <Text style={styles.identificationLabel}>End. Completo</Text>
                <View style={styles.identificationLine}/>
              </View>
              <View style={styles.identificationField}>
                <Text style={styles.identificationLabel}>Cidade</Text>
                <View style={[styles.identificationLine, { width: 100 }]}/>
                <Text style={styles.identificationLabel}>UF</Text>
                <View style={[styles.identificationLine, { width: 20 }]}/>
              </View>
              <View style={styles.identificationField}>
                <Text style={styles.identificationLabel}>Telefone</Text>
                <View style={styles.identificationLine}/>
              </View>
            </View>

            <View style={styles.identificationCard}>
              <Text style={styles.identificationTitle}>IDENTIFICAÇÃO DO FORNECEDOR</Text>
              <View style={styles.pharmacistSignatureBlock}>
                <View style={styles.pharmacistSignatureLine}/>
                <Text style={styles.pharmacistSignatureLabel}>Assinatura do Farmacêutico</Text>
                <View style={styles.identificationDateLine}>
                  <Text style={styles.identificationLabel}>Data</Text>
                  <View style={styles.identificationDatePart}>
                    <View style={[styles.identificationLine, { width: 20 }]}/>
                    <Text style={styles.identificationDateSeparator}>/</Text>
                    <View style={[styles.identificationLine, { width: 20 }]}/>
                    <Text style={styles.identificationDateSeparator}>/</Text>
                    <View style={[styles.identificationLine, { width: 20 }]}/>
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : null}
      </Page>
    </Document>
  );
};