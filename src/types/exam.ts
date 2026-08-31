export interface ExamEntry {
  id: string;
  /** Paciente dono do exame. `examsApi.examToRow` mapeia para a coluna
   *  `animal_id`, usada por `getExams(animalId)` para montar o prontuário. */
  animalId?: string;
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

  // Campos específicos para Bioquímico (várias entradas por enzima)
  biochemicalEntries?: BiochemicalEntry[];

  // Campos específicos para Citologia (CAAF) — dados da coleta; `material`
  // (nº de lâminas) já é genérico, reaproveitado.
  metodoColeta?: string; // Ex: "CAAF"
  fixador?: string; // Ex: "Metanol"
  coloracao?: string; // Ex: "Panótico", "Romanowsky rápido"
  cytologyEntries?: CytologyEntry[]; // Uma ou mais lesões/nódulos avaliados
  // Patologista do laboratório externo que examinou a amostra — diferente de
  // `liberadoPor` (o veterinário da clínica que libera o laudo no sistema).
  patologistaResponsavel?: string;

  // Campos específicos para Teste Rápido (SNAP/imunocromatográfico — ex.:
  // FIV/FeLV, cinomose, erliquiose, parvovirose, giárdia, leishmaniose,
  // dirofilariose). Um exame pode reunir mais de um teste feito na mesma
  // visita (ex.: SNAP FIV/FeLV + teste de giárdia no mesmo atendimento).
  rapidTestEntries?: RapidTestEntry[];

  // Campos adicionais do exame
  nota?: string;
  laboratory?: string;
  laboratoryDate?: string;
  observacoesGeraisExame?: string;
  liberadoPor?: string;

  // Campo de resultado genérico (para exames que não são hemograma)
  result?: string;
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

export interface CytologyEntry {
  id: string;
  localLesao: string; // Ex: "Nódulo pedunculado em face"
  achadosMicroscopicos: string; // Descrição citomorfológica
  achadoCitologico: string; // Conclusão/diagnóstico (ex: "Tumor benigno de origem folicular")
  comentarios?: string; // Nota interpretativa/educativa opcional
  fotoUrl?: string; // Foto da lâmina (data URL), opcional
}

export type RapidTestResult = "Positivo" | "Negativo" | "Inconclusivo";

export interface RapidTestEntry {
  id: string;
  testName: string; // Ex: "FIV/FeLV Combo", "Cinomose", "Erliquiose", "Parvovirose"...
  brand?: string; // Marca/fabricante do kit — ex.: "IDEXX SNAP", "Alere"
  lot?: string; // Nº do lote
  expirationDate?: string; // Validade do kit (ISO yyyy-MM-dd)
  sampleMaterial?: string; // Amostra usada — ex.: "Soro", "Sangue total", "Fezes"
  result: RapidTestResult;
  comentarios?: string;
  fotoUrl?: string; // Foto do dispositivo/teste (data URL), opcional
}

export interface BiochemicalEntry {
  id: string;
  enzyme: string; // Nome da enzima (ou outro analito)
  material: string; // Ex: "Soro ou plasma"
  methodology: string; // Ex: "Colorimétrico enzimático"
  equipment: string; // Ex: "Bioclin 2200"
  result: string; // Resultado informado
  minReference?: string; // Novo: Valor de referência mínimo
  maxReference?: string; // Novo: Valor de referência máximo
  referenceUnit?: string; // Novo: Unidade de referência
}