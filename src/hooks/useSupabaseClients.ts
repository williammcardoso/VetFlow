import { useQuery } from "@tanstack/react-query";
import { Client, Animal } from "@/types/client";
import { supabase } from "@/integrations/supabase/client";

type DbClient = {
  id: string;
  name: string;
  client_type: "physical" | "legal" | null;
  nationality: string | null;
  gender: string | null;
  identification_number: string | null;
  secondary_identification: string | null;
  birthday: string | null;
  profession: string | null;
  accept_email: boolean | null;
  accept_whatsapp: boolean | null;
  accept_sms: boolean | null;
  main_email_contact: string | null;
  main_phone_contact: string | null;
  notes: string | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
};

type DbAnimal = {
  id: string;
  client_id: string;
  name: string;
  species: string | null;
  breed: string | null;
  gender: string | null;
  birthday: string | null;
  coat_color: string | null;
  weight: number | null;
  microchip: string | null;
  notes: string | null;
  status: string | null;
  last_consultation_date: string | null;
  total_procedures: number | null;
  total_value: number | null;
  last_weight_source: string | null;
};

function mapDbAnimalToAnimal(a: DbAnimal): Animal {
  return {
    id: a.id,
    name: a.name,
    species: a.species || "",
    breed: a.breed || "",
    gender: (a.gender as Animal["gender"]) || "Outro",
    birthday: a.birthday || "",
    coatColor: a.coat_color || "",
    weight: a.weight ?? 0,
    microchip: a.microchip || "",
    notes: a.notes || "",
    status: (a.status as "Ativo" | "Inativo") || "Ativo",
    lastConsultationDate: a.last_consultation_date || "",
    totalProcedures: a.total_procedures ?? 0,
    totalValue: a.total_value ?? 0,
    lastWeightSource: a.last_weight_source || "",
    weightHistory: [],
  };
}

function mapDbClientToClient(c: DbClient, animals: Animal[]): Client {
  return {
    id: c.id,
    name: c.name,
    clientType: (c.client_type as Client["clientType"]) || "physical",
    nationality: (c.nationality as Client["nationality"]) || "brazilian",
    gender: c.gender || "",
    identificationNumber: c.identification_number || "",
    secondaryIdentification: c.secondary_identification || "",
    birthday: c.birthday || "",
    profession: c.profession || "",
    acceptEmail: c.accept_email ? "yes" : "no",
    acceptWhatsapp: c.accept_whatsapp ? "yes" : "no",
    acceptSMS: c.accept_sms ? "yes" : "no",
    mainEmailContact: c.main_email_contact || "",
    mainPhoneContact: c.main_phone_contact || "",
    dynamicContacts: [],
    address: {
      cep: c.cep || "",
      street: c.street || "",
      number: c.number || "",
      complement: c.complement || "",
      neighborhood: c.neighborhood || "",
      city: c.city || "",
      state: c.state || "",
    },
    notes: c.notes || "",
    animals,
  };
}

async function fetchClientsWithAnimals(): Promise<Client[]> {
  // NEW: não chama Supabase sem sessão
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return [];
  }

  const { data: clientsData, error: clientsError } = await supabase
    .from("clients")
    .select("id, name, client_type, nationality, gender, identification_number, secondary_identification, birthday, profession, accept_email, accept_whatsapp, accept_sms, main_email_contact, main_phone_contact, notes, cep, street, number, complement, neighborhood, city, state")
    .order("name", { ascending: true });

  if (clientsError) throw clientsError;

  const { data: animalsData, error: animalsError } = await supabase
    .from("animals")
    .select("id, client_id, name, species, breed, gender, birthday, coat_color, weight, microchip, notes, status, last_consultation_date, total_procedures, total_value, last_weight_source");

  if (animalsError) throw animalsError;

  const animalsByClient = new Map<string, Animal[]>();
  (animalsData as DbAnimal[]).forEach((row) => {
    const a = mapDbAnimalToAnimal(row);
    const list = animalsByClient.get(row.client_id) || [];
    list.push(a);
    animalsByClient.set(row.client_id, list);
  });

  return (clientsData as DbClient[]).map((row) => {
    const animals = animalsByClient.get(row.id) || [];
    return mapDbClientToClient(row, animals);
  });
}

async function fetchClientWithAnimals(clientId: string): Promise<Client | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return null;
  }

  const { data: clientRows, error: clientError } = await supabase
    .from("clients")
    .select("id, name, client_type, nationality, gender, identification_number, secondary_identification, birthday, profession, accept_email, accept_whatsapp, accept_sms, main_email_contact, main_phone_contact, notes, cep, street, number, complement, neighborhood, city, state")
    .eq("id", clientId)
    .limit(1);

  if (clientError) throw clientError;
  const client = (clientRows as DbClient[])[0];
  if (!client) return null;

  const { data: animalsRows, error: animalsError } = await supabase
    .from("animals")
    .select("id, client_id, name, species, breed, gender, birthday, coat_color, weight, microchip, notes, status, last_consultation_date, total_procedures, total_value, last_weight_source")
    .eq("client_id", clientId);

  if (animalsError) throw animalsError;
  const animals = (animalsRows as DbAnimal[]).map(mapDbAnimalToAnimal);

  return mapDbClientToClient(client, animals);
}

export function useClientsList() {
  return useQuery({
    queryKey: ["clients-with-animals"],
    queryFn: fetchClientsWithAnimals,
    staleTime: 1000 * 60,
  });
}

export function useClientWithAnimals(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client-with-animals", clientId],
    queryFn: () => (clientId ? fetchClientWithAnimals(clientId) : Promise.resolve(null)),
    enabled: !!clientId,
    staleTime: 1000 * 60,
  });
}