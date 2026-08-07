import { supabase } from "@/integrations/supabase/client";
import type { Client, Animal, WeightEntry } from "@/types/client";

type DbClient = {
  id: string;
  name: string;
  client_type?: string | null;
  nationality?: string | null;
  gender?: string | null;
  identification_number?: string | null;
  secondary_identification?: string | null;
  birthday?: string | null;
  profession?: string | null;
  accept_email?: boolean | null;
  accept_whatsapp?: boolean | null;
  accept_sms?: boolean | null;
  main_email_contact?: string | null;
  main_phone_contact?: string | null;
  notes?: string | null;
  cep?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
};

type DbAnimal = {
  id: string;
  patient_code?: number | null;
  client_id: string;
  name: string;
  species?: string | null;
  breed?: string | null;
  gender?: string | null;
  birthday?: string | null;
  coat_color?: string | null;
  weight?: number | null;
  microchip?: string | null;
  notes?: string | null;
  status?: string | null;
  last_consultation_date?: string | null;
  total_procedures?: number | null;
  total_value?: number | null;
  last_weight_source?: string | null;
};

function mapDbAnimalToAnimal(a: DbAnimal): Animal {
  return {
    id: a.id,
    patientCode: a.patient_code ?? undefined,
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

export async function readClients(): Promise<Client[]> {
  const { data: clientsData, error: clientsError } = await supabase
    .from("clients")
    .select("id, name, client_type, nationality, gender, identification_number, secondary_identification, birthday, profession, accept_email, accept_whatsapp, accept_sms, main_email_contact, main_phone_contact, notes, cep, street, number, complement, neighborhood, city, state")
    .order("name", { ascending: true });
  if (clientsError) {
    console.error("[readClients] error", clientsError);
    return [];
  }

  const { data: animalsData, error: animalsError } = await supabase
    .from("animals")
    .select("id, patient_code, client_id, name, species, breed, gender, birthday, coat_color, weight, microchip, notes, status, last_consultation_date, total_procedures, total_value, last_weight_source");
  if (animalsError) {
    console.error("[readClients] animals fetch error", animalsError);
  }

  const animalsByClient = new Map<string, Animal[]>();
  (animalsData || []).forEach((row: DbAnimal) => {
    const a = mapDbAnimalToAnimal(row);
    const list = animalsByClient.get(row.client_id) || [];
    list.push(a);
    animalsByClient.set(row.client_id, list);
  });

  return (clientsData || []).map((row: DbClient) => {
    const animals = animalsByClient.get(row.id) || [];
    return mapDbClientToClient(row, animals);
  });
}

export async function getClientById(clientId: string): Promise<Client | null> {
  const { data: clientRows, error: clientError } = await supabase
    .from("clients")
    .select("id, name, client_type, nationality, gender, identification_number, secondary_identification, birthday, profession, accept_email, accept_whatsapp, accept_sms, main_email_contact, main_phone_contact, notes, cep, street, number, complement, neighborhood, city, state")
    .eq("id", clientId)
    .limit(1);
  if (clientError) {
    console.error("[getClientById] error", clientError);
    return null;
  }
  const client = (clientRows || [])[0] as DbClient | undefined;
  if (!client) return null;

  const { data: animalsRows, error: animalsError } = await supabase
    .from("animals")
    .select("id, patient_code, client_id, name, species, breed, gender, birthday, coat_color, weight, microchip, notes, status, last_consultation_date, total_procedures, total_value, last_weight_source")
    .eq("client_id", clientId);
  if (animalsError) {
    console.error("[getClientById] animals fetch error", animalsError);
  }
  const animals = (animalsRows || []).map((r: DbAnimal) => mapDbAnimalToAnimal(r));

  return mapDbClientToClient(client, animals);
}

export type AddClientResult =
  | { success: true; client: Client }
  | { success: false; message: string };

export async function addClient(newClient: Partial<Client>): Promise<AddClientResult> {
  const insertObj: Record<string, unknown> = {
    name: newClient.name,
    client_type: newClient.clientType,
    nationality: newClient.nationality,
    gender: newClient.gender,
    identification_number: newClient.identificationNumber,
    secondary_identification: newClient.secondaryIdentification,
    birthday: newClient.birthday,
    profession: newClient.profession,
    accept_email: newClient.acceptEmail === "yes",
    accept_whatsapp: newClient.acceptWhatsapp === "yes",
    accept_sms: newClient.acceptSMS === "yes",
    main_email_contact: newClient.mainEmailContact,
    main_phone_contact: newClient.mainPhoneContact,
    notes: newClient.notes,
    cep: newClient.address?.cep,
    street: newClient.address?.street,
    number: newClient.address?.number,
    complement: newClient.address?.complement,
    neighborhood: newClient.address?.neighborhood,
    city: newClient.address?.city,
    state: newClient.address?.state,
  };
  const { data, error } = await supabase.from("clients").insert(insertObj).select().single();
  if (error) {
    if (error.code === "23505") {
      return { success: false, message: "Já existe um cliente com este CPF/CNPJ." };
    }
    console.error("[addClient] error", error);
    return { success: false, message: error.message || "Erro ao salvar cliente." };
  }
  return { success: true, client: mapDbClientToClient(data as DbClient, []) };
}

export async function updateClient(updatedClient: Client): Promise<boolean> {
  const updateObj: any = {
    name: updatedClient.name,
    client_type: updatedClient.clientType,
    nationality: updatedClient.nationality,
    gender: updatedClient.gender,
    identification_number: updatedClient.identificationNumber,
    secondary_identification: updatedClient.secondaryIdentification,
    birthday: updatedClient.birthday,
    profession: updatedClient.profession,
    accept_email: updatedClient.acceptEmail === "yes",
    accept_whatsapp: updatedClient.acceptWhatsapp === "yes",
    accept_sms: updatedClient.acceptSMS === "yes",
    main_email_contact: updatedClient.mainEmailContact,
    main_phone_contact: updatedClient.mainPhoneContact,
    notes: updatedClient.notes,
    cep: updatedClient.address?.cep,
    street: updatedClient.address?.street,
    number: updatedClient.address?.number,
    complement: updatedClient.address?.complement,
    neighborhood: updatedClient.address?.neighborhood,
    city: updatedClient.address?.city,
    state: updatedClient.address?.state,
  };
  const { error } = await supabase.from("clients").update(updateObj).match({ id: updatedClient.id });
  if (error) {
    console.error("[updateClient] error", error);
    return false;
  }
  return true;
}

export async function addAnimalToClient(clientId: string, newAnimal: Partial<Animal>): Promise<Animal | null> {
  const insertObj: any = {
    client_id: clientId,
    name: newAnimal.name,
    species: newAnimal.species,
    breed: newAnimal.breed,
    gender: newAnimal.gender,
    birthday: newAnimal.birthday,
    coat_color: newAnimal.coatColor,
    weight: newAnimal.weight,
    microchip: newAnimal.microchip,
    notes: newAnimal.notes,
    status: newAnimal.status,
    last_consultation_date: newAnimal.lastConsultationDate,
    total_procedures: newAnimal.totalProcedures,
    total_value: newAnimal.totalValue,
    last_weight_source: newAnimal.lastWeightSource,
  };
  const { data, error } = await supabase.from("animals").insert(insertObj).select().single();
  if (error) {
    console.error("[addAnimalToClient] error", error);
    return null;
  }
  return mapDbAnimalToAnimal(data as DbAnimal);
}

export async function updateAnimalDetails(clientId: string, animalId: string, updates: Partial<Animal>, meta?: { date?: string; time?: string }): Promise<boolean> {
  const dbUpdates: any = {};
  if (updates.name != null) dbUpdates.name = updates.name;
  if (updates.species != null) dbUpdates.species = updates.species;
  if (updates.breed != null) dbUpdates.breed = updates.breed;
  if (updates.gender != null) dbUpdates.gender = updates.gender;
  if (updates.birthday != null) dbUpdates.birthday = updates.birthday;
  if (updates.coatColor != null) dbUpdates.coat_color = updates.coatColor;
  if (updates.weight != null) dbUpdates.weight = updates.weight;
  if (updates.microchip != null) dbUpdates.microchip = updates.microchip;
  if (updates.notes != null) dbUpdates.notes = updates.notes;
  if (updates.status != null) dbUpdates.status = updates.status;
  if (updates.lastConsultationDate != null) dbUpdates.last_consultation_date = updates.lastConsultationDate;
  if (updates.totalProcedures != null) dbUpdates.total_procedures = updates.totalProcedures;
  if (updates.totalValue != null) dbUpdates.total_value = updates.totalValue;
  if (updates.lastWeightSource != null) dbUpdates.last_weight_source = updates.lastWeightSource;

  const { error } = await supabase.from("animals").update(dbUpdates).match({ id: animalId, client_id: clientId });
  if (error) {
    console.error("[updateAnimalDetails] error", error);
    return false;
  }

  // Peso mudou -> grava uma linha no histórico (antes só o campo "atual" do
  // animal era salvo; o histórico da aba Peso do prontuário nunca era
  // persistido em lugar nenhum, mesmo aparecendo preenchido na tela).
  // Cobre os dois pontos que atualizam peso: o botão "Adicionar Peso" do
  // prontuário e o AppointmentForm (peso registrado junto de um atendimento).
  if (updates.weight != null) {
    const { error: weightError } = await supabase.from("patient_weight_entries").insert({
      animal_id: animalId,
      weight: updates.weight,
      source: updates.lastWeightSource || null,
      recorded_date: meta?.date || new Date().toISOString().split("T")[0],
      recorded_time: meta?.time || null,
    });
    if (weightError) {
      console.error("[updateAnimalDetails] weight history insert error", weightError);
    }
  }

  return true;
}

export async function getWeightHistory(animalId: string): Promise<WeightEntry[]> {
  const { data, error } = await supabase
    .from("patient_weight_entries")
    .select("id, weight, source, recorded_date, recorded_time")
    .eq("animal_id", animalId)
    .order("recorded_date", { ascending: false })
    .order("recorded_time", { ascending: false });
  if (error) {
    console.error("[getWeightHistory] error", error);
    return [];
  }
  return (data || []).map((r: any) => ({
    id: r.id,
    date: r.recorded_date,
    time: r.recorded_time || "",
    weight: Number(r.weight),
    source: r.source || "",
  }));
}

