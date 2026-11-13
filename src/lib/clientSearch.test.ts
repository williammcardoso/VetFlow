import { describe, expect, it } from "vitest";
import { findCounterClient, searchClients, type SearchableClient } from "./clientSearch";

const client = (id: string, name: string, extra: Partial<SearchableClient> = {}): SearchableClient => ({
  id,
  name,
  mainPhoneContact: "",
  identificationNumber: "",
  animals: [],
  ...extra,
});

const clients = [
  client("1", "Maria Thomaz", { mainPhoneContact: "(11) 98888-1234" }),
  client("2", "João da Silva", { animals: [{ id: "p1", name: "Thor", patientCode: 25 }] }),
  client("3", "Thomas Souza", { identificationNumber: "123.456.789-00" }),
  client("4", "Consumidor", {}),
];

describe("searchClients", () => {
  it("sem texto não devolve nada", () => {
    expect(searchClients(clients, "  ")).toEqual([]);
  });

  it("acha pelo pet e diz qual pet bateu", () => {
    const hits = searchClients(clients, "thor");
    expect(hits[0]).toMatchObject({ client: { id: "2" }, petIds: ["p1"] });
  });

  it("nome que começa com o texto vem antes de nome que só contém", () => {
    expect(searchClients(clients, "thom").map((h) => h.client.id)).toEqual(["3", "1"]);
  });

  it("empate: tutor com o nome antes de tutor cujo pet tem o nome", () => {
    const list = [
      client("a", "Amilton Junior", { animals: [{ id: "x", name: "Maylon" }] }),
      client("b", "Maiara Barbosa"),
    ];
    expect(searchClients(list, "ma").map((h) => h.client.id)).toEqual(["b", "a"]);
  });

  it("ignora acento e maiúscula", () => {
    expect(searchClients(clients, "JOAO").map((h) => h.client.id)).toEqual(["2"]);
  });

  it("acha por telefone, CPF e nº da ficha", () => {
    expect(searchClients(clients, "98888").map((h) => h.client.id)).toEqual(["1"]);
    expect(searchClients(clients, "456.789").map((h) => h.client.id)).toEqual(["3"]);
    expect(searchClients(clients, "0025")).toMatchObject([{ client: { id: "2" }, petIds: ["p1"] }]);
  });
});

describe("findCounterClient", () => {
  it("acha o cliente de balcão pelo nome", () => {
    expect(findCounterClient(clients)?.id).toBe("4");
    expect(findCounterClient([client("9", "Consumidor final")])?.id).toBe("9");
    expect(findCounterClient([client("9", "Maria")])).toBeUndefined();
  });
});
