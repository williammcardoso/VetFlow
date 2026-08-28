export interface WeightEntry {
  id: string;
  date: string;
  time: string; // Adicionado campo de hora
  weight: number;
  source: string; // Ex: "Atendimento Clínico", "Cadastro Inicial", "Manual"
}

export interface Animal {
  id: string;
  patientCode?: number;
  name: string;
  species: string;
  breed: string;
  gender: "Macho" | "Fêmea" | "Outro" | string;
  birthday: string;
  coatColor: string;
  weight: number;
  microchip: string;
  notes: string;
  status: 'Ativo' | 'Inativo';
  lastConsultationDate?: string;
  totalProcedures?: number;
  totalValue?: number;
  lastWeightSource?: string; // Novo campo para a origem da última atualização de peso
  weightHistory?: WeightEntry[]; // Histórico de pesos
}

export interface DynamicContact {
  id: string;
  label: string;
  value: string;
}

export interface Client {
  id: string;
  name: string;
  clientType: "physical" | "legal";
  nationality: string;
  gender?: string;
  identificationNumber: string; // CPF ou CNPJ
  secondaryIdentification: string; // RG ou IE
  birthday: string;
  profession: string;
  acceptEmail: "yes" | "no";
  acceptWhatsapp: "yes" | "no";
  acceptSMS: "yes" | "no";
  mainEmailContact: string;
  mainPhoneContact: string;
  dynamicContacts: DynamicContact[];
  address: {
    cep: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state?: string;
  };
  notes: string;
  animals: Animal[];
  createdAt?: string;
}