export interface BiochemicalEntry {
  id: string;
  enzymeName: string;
  customEnzymeName?: string; // Para a opção "Outro"
  material: string;
  metodologia: string;
  equipamento: string;
  result: string;
}

export interface ExamEntry {
  id: string;
  date: string;
  time: string;
  type: string; // Ex: "Hemograma Completo", "Exame de Fezes", "Bioquímico"
  vet: string; // Veterinário solicitante

  // Campos gerais do exame
  material?: string;
  equipamento?: string;

  // Campos específicos para Eritrograma
  eritrocitos?: string;
  hemoglobina?: string;
  hematocrito?: string;
  vcm?: string;
  hcm?: string;
  chcm?: string;
  proteinaTotal?: string;
  hemaciasNucleadas?: string;
  observacoesSerieVermelha?: string;

  // Campos específicos para Leucograma
  leucocitosTotais?: string;
  mielocitosRelativo?: string;
  mielocitosAbsoluto?: string;
  metamielocitosRelativo?: string;
  metamielocitosAbsoluto?: string;
  bastonetesRelativo?: string;
  bastonetesAbsoluto?: string;
  segmentadosRelativo?: string;
  segmentadosAbsoluto?: string;
  eosinofilosRelativo?: string;
  eosinofilosAbsoluto?: string;
  basofilosRelativo?: string;
  basofilosAbsoluto?: string;
  linfocitosRelativo?: string;
  linfocitosAbsoluto?: string;
  monocitosRelativo?: string;
  monocitosAbsoluto?: string;
  observacoesSerieBranca?: string;

  // Campos específicos para Plaquetas
  contagemPlaquetaria?: string;
  avaliacaoPlaquetaria?: string;

  // Campos específicos para Bioquímico
  biochemicals?: BiochemicalEntry[]; // Novo campo para exames bioquímicos

  // Campo de resultado genérico (para exames que não são hemograma ou bioquímico)
  result?: string;

  // Campos adicionais do exame
  nota?: string;
  laboratory?: string;
  laboratoryDate?: string;
  observacoesGeraisExame?: string;
  liberadoPor?: string;
}

// Interfaces para os valores de referência do hemograma
export interface HemogramReferenceValue {
  relative?: string;
  absolute?: string;
  full?: string; // For non-leukocyte fields
  min?: number;
  max?: number;
}

export interface HemogramReference {
  dog: HemogramReferenceValue;
  cat: HemogramReferenceValue;
}

export interface ExamReportData {
  animalName: string;
  animalId: string;
  animalSpecies: string;
  tutorName: string;
  tutorAddress: string;
  exam: ExamEntry;
  hemogramReferences: Record<string, HemogramReference>;
}