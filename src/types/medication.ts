export interface MedicationData {
  id: string;
  useType: string;
  pharmacyType: string;
  medicationName: string;
  concentration: string;
  pharmaceuticalForm: string;
  customPharmaceuticalForm?: string;
  dosePerAdministration: string;
  frequency: string;
  customFrequency?: string;
  period: string;
  customPeriod?: string;
  useCustomInstructions: boolean;
  generatedInstructions: string; // This will store the final instruction (auto or custom)
  generalObservations: string; // This is for the separate 'Observações Gerais' at the bottom
  totalQuantity: string; // Numeric string for calculation
  totalQuantityDisplay?: string; // Formatted string for display in PDF
  isCollapsed?: boolean; // To control collapse state in the form
}

// Novas interfaces para Receita Manipulada
export interface ManipulatedFormulaComponent {
  id: string;
  name: string;
  dosageQuantity: string;
  dosageUnit: string; // Ex: Grama (g), Miligrama (mg), Mililitro (mL), %, UI
  customDosageUnit?: string; // Preenchido quando dosageUnit === "Outro"
}

export interface ManipulatedVehicleExcipient {
  type: string; // Ex: Comprimido, Cápsula, Líquido
  customType?: string; // Novo campo para o tipo personalizado
  quantity: string; // Ex: "30"
  unit: string; // Ex: %, Grama (g), Mililitro (mL), Micrograma (mcg)
  customUnit?: string; // Preenchido quando unit === "outro(s)"
}

export interface ManipulatedPosologyAutomatic {
  dosage: string;
  measure: string; // Ex: Comprimido, Cápsula
  customMeasure?: string; // Novo campo para a medida personalizada
  frequencyValue: string; // Ex: "1"
  customFrequencyValue?: string; // Novo campo para o valor da frequência personalizada
  frequencyUnit: string; // Ex: "Dia"
  customFrequencyUnit?: string; // Novo campo para a unidade da frequência personalizada
  durationValue: string; // Ex: "5"
  customDurationValue?: string; // Novo campo para o valor da duração personalizada
  durationUnit: string; // Ex: "Dia"
  customDurationUnit?: string; // Novo campo para a unidade da duração personalizada
  finalDescription: string; // Auto-gerada
}

export interface ManipulatedPosologyFreeText {
  finalDescription: string; // Texto livre
}

export type ManipulatedPosology = { type: 'automatic', data: ManipulatedPosologyAutomatic } | { type: 'freeText', data: ManipulatedPosologyFreeText };

export interface ManipulatedProductDetails {
  productType: string; // Ex: "Simples" (do sistema de origem da imagem)
  quantity: string; // Ex: "1 unidade"
  pharmacy: string; // Ex: "Veterinária"
  route: string; // Ex: "Oral"
  customRoute?: string; // Novo campo para a via personalizada
}

export interface ManipulatedPrescriptionData {
  formulaComponents: ManipulatedFormulaComponent[];
  vehicleExcipient?: ManipulatedVehicleExcipient;
  posology: ManipulatedPosology;
  productDetails: ManipulatedProductDetails;
  generalObservations: string; // Observações gerais para a receita manipulada
}

// Atualização da PrescriptionEntry para ser um tipo de união
export interface PrescriptionEntry {
  id: string;
  date: string;
  time: string; // Adicionado campo de hora
  medicationName: string; // Resumo para a tabela
  treatmentDescription?: string; // Novo campo para descrição do tratamento
  instructions: string; // Observações gerais da receita (para simples/controlada)
  type: 'simple' | 'controlled' | 'manipulated'; // Novo campo para o tipo de receita
  medications?: MedicationData[]; // Detalhes completos dos medicamentos (apenas para simples/controlada)
  manipulatedPrescription?: ManipulatedPrescriptionData; // Detalhes da receita manipulada (apenas para manipulada)
}