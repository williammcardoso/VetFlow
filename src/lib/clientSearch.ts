import type { Animal, Client } from "@/types/client";

/** Cliente com só o que a busca usa (a lista de clientes e o PDV passam o Client inteiro). */
export type SearchableClient = Pick<Client, "id" | "name" | "mainPhoneContact" | "identificationNumber"> &
  Partial<Pick<Client, "secondaryPhoneContact">> & {
    animals?: Array<Pick<Animal, "id" | "name"> & Partial<Pick<Animal, "patientCode">>>;
  };

/** Minúsculas, sem acento e sem espaço nas pontas. */
export const normalizeSearch = (s: string | undefined) =>
  (s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();

export const digitsOf = (s: string | undefined) => (s || "").replace(/\D/g, "");

/**
 * Busca por nome do tutor, nome do pet, telefone (os dois), CPF/CNPJ ou nº da
 * ficha do pet (números contam a partir de 3 dígitos). `q` já normalizado.
 * Retorna os pets que bateram (para destacar), [] se só o tutor bateu (ou a
 * busca está vazia) e null se o cliente não bate.
 */
export function matchClientSearch(client: SearchableClient, q: string, digits: string): string[] | null {
  const pets = client.animals ?? [];
  if (!q && digits.length < 3) return [];

  const nameHit = Boolean(q) && normalizeSearch(client.name).includes(q);
  const petIds = pets
    .filter(
      (a) =>
        (Boolean(q) && normalizeSearch(a.name).includes(q)) ||
        (digits.length >= 3 && Boolean(a.patientCode) && String(a.patientCode).padStart(4, "0").includes(digits))
    )
    .map((a) => a.id);
  const docHit =
    digits.length >= 3 &&
    (digitsOf(client.mainPhoneContact).includes(digits) ||
      digitsOf(client.secondaryPhoneContact).includes(digits) ||
      digitsOf(client.identificationNumber).includes(digits));

  return nameHit || petIds.length || docHit ? petIds : null;
}

export interface ClientSearchHit<C extends SearchableClient> {
  client: C;
  /** Pets que bateram com a busca. */
  petIds: string[];
}

/** 0 = começa com o texto, 1 = alguma palavra começa com ele, 2 = contém no meio. */
function textRank(text: string, q: string): number {
  const t = normalizeSearch(text);
  if (t.startsWith(q)) return 0;
  if (t.split(/\s+/).some((w) => w.startsWith(q))) return 1;
  return t.includes(q) ? 2 : 9;
}

/**
 * Busca para escolher um cliente (PDV): só devolve algo com texto digitado, e
 * ordena pelo que o usuário mais provavelmente quis — nome do tutor ou do pet
 * começando com o texto antes de "contém no meio", telefone/CPF por último.
 */
export function searchClients<C extends SearchableClient>(clients: C[], query: string): ClientSearchHit<C>[] {
  const q = normalizeSearch(query);
  const digits = digitsOf(query);
  if (!q) return [];
  const ranked: Array<ClientSearchHit<C> & { rank: number; byPet: number }> = [];
  for (const client of clients) {
    const petIds = matchClientSearch(client, q, digits);
    if (!petIds) continue;
    const pets = (client.animals ?? []).filter((a) => petIds.includes(a.id));
    const nameRank = textRank(client.name, q);
    const rank = Math.min(nameRank, ...pets.map((a) => textRank(a.name, q)), 5);
    // Empate: quem bateu pelo nome do tutor vem antes de quem bateu só pelo pet.
    ranked.push({ client, petIds, rank, byPet: nameRank <= rank ? 0 : 1 });
  }
  return ranked
    .sort((a, b) => a.rank - b.rank || a.byPet - b.byPet || a.client.name.localeCompare(b.client.name, "pt-BR"))
    .map(({ client, petIds }) => ({ client, petIds }));
}

/** Cliente genérico de balcão ("Consumidor", "Consumidor final", "Consumidor - balcão"...). */
export function findCounterClient<C extends Pick<Client, "name">>(clients: C[]): C | undefined {
  return clients.find((c) => normalizeSearch(c.name).startsWith("consumidor"));
}
