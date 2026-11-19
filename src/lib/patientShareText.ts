// Dados do paciente e do tutor para mandar a um especialista externo
// (cardiologista, ultrassonografista, laboratório...) que pede para
// cadastrar o atendimento no sistema dele — antes era digitado à mão no
// WhatsApp. Puro: a tela escolhe os campos e manda copiar/enviar.

export type ShareField =
  | "especie"
  | "sexo"
  | "nascimento"
  | "peso"
  | "pelagem"
  | "microchip"
  | "documento"
  | "rg"
  | "telefone"
  | "email"
  | "endereco";

export const SHARE_FIELD_LABEL: Record<ShareField, string> = {
  especie: "Espécie e raça",
  sexo: "Sexo e castração",
  nascimento: "Nascimento e idade",
  peso: "Peso",
  pelagem: "Pelagem",
  microchip: "Microchip",
  documento: "CPF/CNPJ",
  rg: "RG",
  telefone: "Telefone",
  email: "E-mail",
  endereco: "Endereço",
};

export const PET_FIELDS: ShareField[] = ["especie", "sexo", "nascimento", "peso", "pelagem", "microchip"];
export const TUTOR_FIELDS: ShareField[] = ["documento", "rg", "telefone", "email", "endereco"];
/** RG fica de fora até marcar: quase nenhum especialista pede. */
export const DEFAULT_SHARE_FIELDS: ShareField[] = [...PET_FIELDS, "documento", "telefone", "email", "endereco"];

export interface ShareAnimal {
  name: string;
  species?: string;
  breed?: string;
  gender?: string;
  neutered?: boolean | null;
  /** "aaaa-mm-dd" */
  birthday?: string;
  coatColor?: string;
  microchip?: string;
}

export interface ShareClient {
  name: string;
  clientType?: "physical" | "legal";
  identificationNumber?: string;
  secondaryIdentification?: string;
  mainPhoneContact?: string;
  secondaryPhoneContact?: string;
  secondaryPhoneLabel?: string;
  mainEmailContact?: string;
  address?: {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
}

const clean = (s?: string | null) => (s ?? "").trim();
const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** "8 anos e 9 meses" (data local, sem o deslize de fuso do new Date("aaaa-mm-dd")). */
export function ageText(birthday: string, now: Date = new Date()): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthday);
  if (!m) return "";
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - mo);
  if (now.getDate() < d) months--;
  if (months < 0) return "";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(years === 1 ? "1 ano" : `${years} anos`);
  if (rest > 0) parts.push(rest === 1 ? "1 mês" : `${rest} meses`);
  return parts.length ? parts.join(" e ") : "menos de 1 mês";
}

/** "Macho, castrado" / "Fêmea, não castrada" / "Macho". */
export function sexText(gender?: string, neutered?: boolean | null): string {
  const g = clean(gender);
  const female = /^f/i.test(g);
  if (typeof neutered !== "boolean") return g;
  const castr = neutered ? (female ? "castrada" : "castrado") : female ? "não castrada" : "não castrado";
  return g ? `${g}, ${castr}` : castr.charAt(0).toUpperCase() + castr.slice(1);
}

/** "Rua das Flores, 120, apto 2 — Centro, Campinas/SP — CEP 13010-000" */
export function addressText(address?: ShareClient["address"]): string {
  if (!address) return "";
  const street = [clean(address.street), clean(address.number), clean(address.complement)].filter(Boolean).join(", ");
  const city = clean(address.city) && clean(address.state) ? `${clean(address.city)}/${clean(address.state)}` : clean(address.city) || clean(address.state);
  const place = [clean(address.neighborhood), city].filter(Boolean).join(", ");
  const cep = clean(address.cep) ? `CEP ${clean(address.cep)}` : "";
  return [street, place, cep].filter(Boolean).join(" — ");
}

const weightText = (kg: number) => `${kg.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} kg`;

/** Texto pronto para o WhatsApp (negrito com *...*), só com os campos marcados que têm dado. */
export function buildPatientShareText(input: {
  animal: ShareAnimal;
  client: ShareClient;
  include: ShareField[];
  weight?: { kg: number; date?: string } | null;
  /** Ex.: "Ecocardiograma — sopro grau III". */
  note?: string;
  clinicName?: string;
  now?: Date;
}): string {
  const { animal, client } = input;
  const on = new Set(input.include);
  const lines: string[] = [];
  const add = (field: ShareField, label: string, value: string) => {
    if (on.has(field) && value) lines.push(`${label}: ${value}`);
  };

  const clinic = clean(input.clinicName);
  const head = [`*Dados do paciente${clinic ? ` — ${clinic}` : ""}*`];
  if (clean(input.note)) head.push("", `📋 *Solicitação:* ${clean(input.note)}`);

  lines.push(...head, "", "🐾 *Paciente*", `Nome: ${clean(animal.name)}`);
  add("especie", "Espécie", [clean(animal.species), clean(animal.breed)].filter(Boolean).join(" — "));
  add("sexo", "Sexo", sexText(animal.gender, animal.neutered));
  if (clean(animal.birthday)) {
    const age = ageText(clean(animal.birthday), input.now);
    add("nascimento", "Nascimento", `${dmy(clean(animal.birthday))}${age ? ` (${age})` : ""}`);
  }
  if (input.weight && input.weight.kg > 0) {
    add("peso", "Peso", `${weightText(input.weight.kg)}${input.weight.date ? ` (pesado em ${dmy(input.weight.date)})` : ""}`);
  }
  add("pelagem", "Pelagem", clean(animal.coatColor));
  add("microchip", "Microchip", clean(animal.microchip));

  lines.push("", "👤 *Tutor*", `Nome: ${clean(client.name)}`);
  add("documento", client.clientType === "legal" ? "CNPJ" : "CPF", clean(client.identificationNumber));
  add("rg", client.clientType === "legal" ? "IE" : "RG", clean(client.secondaryIdentification));
  add("telefone", "Telefone", clean(client.mainPhoneContact));
  if (clean(client.secondaryPhoneContact)) {
    const label = clean(client.secondaryPhoneLabel);
    add("telefone", "Outro telefone", `${clean(client.secondaryPhoneContact)}${label ? ` (${label})` : ""}`);
  }
  add("email", "E-mail", clean(client.mainEmailContact));
  add("endereco", "Endereço", addressText(client.address));

  return lines.join("\n");
}

/** Campos que têm dado para este paciente/tutor (os outros nem aparecem para marcar). */
export function availableShareFields(animal: ShareAnimal, client: ShareClient, weightKg?: number | null): ShareField[] {
  const has: Record<ShareField, boolean> = {
    especie: !!(clean(animal.species) || clean(animal.breed)),
    sexo: !!(clean(animal.gender) || typeof animal.neutered === "boolean"),
    nascimento: !!clean(animal.birthday),
    peso: !!weightKg && weightKg > 0,
    pelagem: !!clean(animal.coatColor),
    microchip: !!clean(animal.microchip),
    documento: !!clean(client.identificationNumber),
    rg: !!clean(client.secondaryIdentification),
    telefone: !!(clean(client.mainPhoneContact) || clean(client.secondaryPhoneContact)),
    email: !!clean(client.mainEmailContact),
    endereco: !!addressText(client.address),
  };
  return [...PET_FIELDS, ...TUTOR_FIELDS].filter((f) => has[f]);
}
