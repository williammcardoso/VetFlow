import { Client, Animal, DynamicContact, WeightEntry } from "@/types/client";

export let mockClients: Client[] = [
  {
    id: "1",
    name: "William",
    clientType: "physical",
    nationality: "brazilian",
    gender: "male",
    identificationNumber: "111.111.111-11",
    secondaryIdentification: "11.111.111-1",
    birthday: "1985-01-15",
    profession: "Veterinário",
    acceptEmail: "yes",
    acceptWhatsapp: "yes",
    acceptSMS: "yes",
    mainEmailContact: "(19) 99363-1981",
    mainPhoneContact: "(19) 99363-1981",
    dynamicContacts: [],
    address: {
      cep: "13970-170",
      street: "Rua Exemplo",
      number: "123",
      complement: "",
      neighborhood: "Centro",
      city: "Itapira",
      state: "SP",
    },
    notes: "Cliente antigo e confiável.",
    animals: [
      {
        id: "a1",
        name: "Totó",
        species: "Canino", // Updated
        breed: "Labrador Retriever", // Updated
        gender: "Macho",
        birthday: "2020-01-15",
        coatColor: "Caramelo (Dourado/Fulvo)", // Updated
        weight: 25.0,
        microchip: "123456789",
        notes: "Animal muito dócil e brincalhão.",
        status: 'Ativo',
        lastConsultationDate: "2024-07-20",
        totalProcedures: 5,
        totalValue: 435.00,
        lastWeightSource: "Cadastro Inicial",
        weightHistory: [
          { id: "wh1", date: "2020-01-15", time: "10:00", weight: 5.0, source: "Cadastro Inicial" },
          { id: "wh2", date: "2021-01-15", time: "10:00", weight: 15.0, source: "Consulta Anual" },
          { id: "wh3", date: "2022-01-15", time: "10:00", weight: 20.0, source: "Consulta Anual" },
          { id: "wh4", date: "2023-01-15", time: "10:00", weight: 23.5, source: "Consulta Anual" },
          { id: "wh5", date: "2024-07-20", time: "10:30", weight: 25.0, source: "Atendimento Clínico" },
        ],
      },
      {
        id: "a2",
        name: "Bolinha",
        species: "Canino", // Updated
        breed: "Poodle", // Updated
        gender: "Fêmea",
        birthday: "2021-05-20",
        coatColor: "Branco", // Updated
        weight: 5.0,
        microchip: "987654321",
        notes: "Adora passear no parque.",
        status: 'Ativo',
        lastConsultationDate: "2024-06-10",
        totalProcedures: 2,
        totalValue: 150.00,
        lastWeightSource: "Cadastro Inicial",
        weightHistory: [
          { id: "wh6", date: "2021-05-20", time: "10:00", weight: 1.5, source: "Cadastro Inicial" },
          { id: "wh7", date: "2022-05-20", time: "10:00", weight: 4.0, source: "Consulta Anual" },
          { id: "wh8", date: "2023-05-20", time: "10:00", weight: 4.8, source: "Consulta Anual" },
          { id: "wh9", date: "2024-06-10", time: "10:00", weight: 5.0, source: "Atendimento Clínico" },
        ],
      },
    ],
  },
  {
    id: "2",
    name: "Maria",
    clientType: "physical",
    nationality: "brazilian",
    gender: "female",
    identificationNumber: "222.222.222-22",
    secondaryIdentification: "22.222.222-2",
    birthday: "1990-03-20",
    profession: "Professora",
    acceptEmail: "yes",
    acceptWhatsapp: "yes",
    acceptSMS: "no",
    mainEmailContact: "maria@example.com",
    mainPhoneContact: "(11) 98765-4321",
    dynamicContacts: [],
    address: {
      cep: "01001-000",
      street: "Avenida Teste",
      number: "456",
      complement: "",
      neighborhood: "Centro",
      city: "São Paulo",
      state: "SP",
    },
    notes: "Nova cliente, muito atenciosa com os pets.",
    animals: [
      {
        id: "a3",
        name: "Fido",
        species: "Canino", // Updated
        breed: "SRD / Vira-lata", // Updated
        gender: "Macho",
        birthday: "2019-03-10",
        coatColor: "Caramelo (Dourado/Fulvo)", // Updated
        weight: 18.0,
        microchip: "",
        notes: "Resgatado, um pouco tímido.",
        status: 'Ativo',
        lastConsultationDate: "2024-05-01",
        totalProcedures: 3,
        totalValue: 280.00,
        lastWeightSource: "Cadastro Inicial",
        weightHistory: [
          { id: "wh10", date: "2019-03-10", time: "10:00", weight: 10.0, source: "Cadastro Inicial" },
          { id: "wh11", date: "2020-03-10", time: "10:00", weight: 15.0, source: "Consulta Anual" },
          { id: "wh12", date: "2021-03-10", time: "10:00", weight: 17.0, source: "Consulta Anual" },
          { id: "wh13", date: "2024-05-01", time: "10:00", weight: 18.0, source: "Atendimento Clínico" },
        ],
      },
      {
        id: "a4",
        name: "Miau",
        species: "Felino", // Updated
        breed: "Siamês", // Still Siamês
        gender: "Fêmea",
        birthday: "2022-07-01",
        coatColor: "Creme (Bege)", // Updated
        weight: 3.5,
        microchip: "112233445",
        notes: "Gosta de dormir no sol.",
        status: 'Inativo',
        lastConsultationDate: "2023-12-15",
        totalProcedures: 1,
        totalValue: 80.00,
        lastWeightSource: "Cadastro Inicial",
        weightHistory: [
          { id: "wh14", date: "2022-07-01", time: "10:00", weight: 1.0, source: "Cadastro Inicial" },
          { id: "wh15", date: "2023-12-15", time: "10:00", weight: 3.5, source: "Atendimento Clínico" },
        ],
      },
    ],
  },
  {
    id: "3",
    name: "João",
    clientType: "physical",
    nationality: "brazilian",
    gender: "male",
    identificationNumber: "333.333.333-33",
    secondaryIdentification: "33.333.333-3",
    birthday: "1978-07-05",
    profession: "Engenheiro",
    acceptEmail: "yes",
    acceptWhatsapp: "yes",
    acceptSMS: "yes",
    mainEmailContact: "joao@example.com",
    mainPhoneContact: "(21) 91234-5678",
    dynamicContacts: [],
    address: {
      cep: "20010-000",
      street: "Rua da Paz",
      number: "789",
      complement: "",
      neighborhood: "Centro",
      city: "Rio de Janeiro",
      state: "RJ",
    },
    notes: "Cliente com vários animais.",
    animals: [
      {
        id: "a5",
        name: "Rex",
        species: "Canino", // Updated
        breed: "Pastor Alemão", // Still Pastor Alemão
        gender: "Macho",
        birthday: "2018-11-22",
        coatColor: "Preto", // Updated
        weight: 30.0,
        microchip: "556677889",
        notes: "Animal de guarda, muito leal.",
        status: 'Ativo',
        lastConsultationDate: "2024-04-05",
        totalProcedures: 7,
        totalValue: 600.00,
        lastWeightSource: "Cadastro Inicial",
        weightHistory: [
          { id: "wh16", date: "2018-11-22", time: "10:00", weight: 10.0, source: "Cadastro Inicial" },
          { id: "wh17", date: "2020-01-01", time: "10:00", weight: 25.0, source: "Consulta Anual" },
          { id: "wh18", date: "2022-01-01", time: "10:00", weight: 28.0, source: "Consulta Anual" },
          { id: "wh19", date: "2024-04-05", time: "10:00", weight: 30.0, source: "Atendimento Clínico" },
        ],
      },
    ],
  },
  {
    id: "4",
    name: "Ana",
    clientType: "physical",
    nationality: "brazilian",
    gender: "female",
    identificationNumber: "444.444.444-44",
    secondaryIdentification: "44.444.444-4",
    birthday: "1995-12-01",
    profession: "Designer",
    acceptEmail: "no",
    acceptWhatsapp: "yes",
    acceptSMS: "no",
    mainEmailContact: "ana@example.com",
    mainPhoneContact: "(31) 99876-5432",
    dynamicContacts: [],
    address: {
      cep: "30110-000",
      street: "Rua das Flores",
      number: "10",
      complement: "",
      neighborhood: "Bairro Jardim",
      city: "Belo Horizonte",
      state: "MG",
    },
    notes: "Cliente com interesse em adoção.",
    animals: [],
  },
];

export const addMockClient = (newClient: Omit<Client, 'id' | 'animals'>) => {
  const newId = String(mockClients.length > 0 ? Math.max(...mockClients.map(c => Number(c.id))) + 1 : 1);
  const clientWithId: Client = { ...newClient, id: newId, animals: [] };
  mockClients.push(clientWithId);
  return clientWithId;
};

export const updateMockClient = (updatedClient: Client) => {
  const index = mockClients.findIndex(c => c.id === updatedClient.id);
  if (index !== -1) {
    mockClients[index] = { ...updatedClient, animals: mockClients[index].animals }; // Preserve existing animals
    return true;
  }
  return false;
};

export const addMockAnimalToClient = (clientId: string, newAnimal: Omit<Animal, 'id'>) => {
  const clientIndex = mockClients.findIndex(c => c.id === clientId);
  if (clientIndex !== -1) {
    const newAnimalId = String(mockClients[clientIndex].animals.length > 0 ? Math.max(...mockClients[clientIndex].animals.map(a => Number(a.id.replace('a', '')))) + 1 : 1);
    const animalWithId: Animal = { ...newAnimal, id: `a${newAnimalId}`, weightHistory: newAnimal.weightHistory || [] };
    // Add initial weight to history if not present
    if (animalWithId.weight !== undefined && animalWithId.weightHistory.length === 0) {
      animalWithId.weightHistory.push({
        id: `wh-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), // Adicionado time
        weight: animalWithId.weight,
        source: "Cadastro Inicial",
      });
    }
    mockClients[clientIndex].animals.push(animalWithId);
    return animalWithId;
  }
  return null;
};

export const updateAnimalDetails = (clientId: string, animalId: string, updates: Partial<Animal>, meta?: { date?: string; time?: string }) => {
  const clientIndex = mockClients.findIndex(c => c.id === clientId);
  if (clientIndex !== -1) {
    const animalIndex = mockClients[clientIndex].animals.findIndex(a => a.id === animalId);
    if (animalIndex !== -1) {
      const currentAnimal = mockClients[clientIndex].animals[animalIndex];
      const updatedAnimal = {
        ...currentAnimal,
        ...updates
      };

      // If weight is updated, add to history
      if (updates.weight !== undefined && updates.weight !== currentAnimal.weight) {
        const now = new Date();
        const newWeightEntry: WeightEntry = {
          id: `wh-${Date.now()}`,
          date: meta?.date || now.toISOString().split('T')[0],
          time: meta?.time || now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          weight: updates.weight,
          source: updates.lastWeightSource || "Atualização Manual", // Default source
        };
        updatedAnimal.weightHistory = [...(currentAnimal.weightHistory || []), newWeightEntry];
      }
      
      // Create new references for immutability
      const newAnimals = [...mockClients[clientIndex].animals];
      newAnimals[animalIndex] = updatedAnimal;
      
      const newClient = {
        ...mockClients[clientIndex],
        animals: newAnimals,
      };

      mockClients = mockClients.map((client, idx) => 
        idx === clientIndex ? newClient : client
      );
      
      return true;
    }
  }
  return false;
};