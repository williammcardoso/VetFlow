import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpDown, Cat, Dog, MapPin, PawPrint, Phone, Plus, Search, UserPlus, Users, X } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/saas/PageHeader";
import { PageShell } from "@/components/saas/PageShell";
import { DataTableFrame } from "@/components/saas/DataTableFrame";
import { ClientAvatar, PetChip, speciesKind, type SpeciesKind } from "@/components/clients/clientVisuals";
import { cn, formatPhoneBR } from "@/lib/utils";
import { openWhatsAppChat } from "@/lib/whatsappShare";
import { getPatientRecordPath } from "@/utils/patientDisplayId";
import { useClientsList } from "@/hooks/useSupabaseClients";
import type { Client } from "@/types/client";

type SpeciesFilter = "all" | SpeciesKind;
type SortOrder = "newest" | "oldest" | "name-asc" | "name-desc";

// Lista em cards, 24 por vez: a tabela antiga ocupava uma linha alta por
// cliente e a página ficava enorme. Busca, filtro e ordem ficam na URL —
// ao abrir um cliente e voltar, a lista continua do mesmo jeito.
const PAGE_SIZE = 24;

const SORT_LABEL: Record<SortOrder, string> = {
  newest: "Mais recentes",
  oldest: "Mais antigos",
  "name-asc": "Nome A–Z",
  "name-desc": "Nome Z–A",
};

const norm = (s: string | undefined) =>
  (s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
const digitsOf = (s: string | undefined) => (s || "").replace(/\D/g, "");

interface ClientMatch {
  client: Client;
  /** Pets que bateram com a busca (ganham destaque no card). */
  petIds: string[];
}

/** Busca por nome do tutor, nome do pet, telefone, CPF/CNPJ ou nº da ficha do pet. */
function matchClient(client: Client, q: string, digits: string, species: SpeciesFilter): ClientMatch | null {
  const pets = client.animals ?? [];
  if (species !== "all" && !pets.some((a) => speciesKind(a.species) === species)) return null;
  if (!q && digits.length < 3) return { client, petIds: [] };

  const nameHit = Boolean(q) && norm(client.name).includes(q);
  const petIds = pets
    .filter(
      (a) =>
        (Boolean(q) && norm(a.name).includes(q)) ||
        (digits.length >= 3 && Boolean(a.patientCode) && String(a.patientCode).padStart(4, "0").includes(digits))
    )
    .map((a) => a.id);
  const docHit =
    digits.length >= 3 &&
    (digitsOf(client.mainPhoneContact).includes(digits) || digitsOf(client.identificationNumber).includes(digits));

  return nameHit || petIds.length || docHit ? { client, petIds } : null;
}

const createdTime = (c: Client) => (c.createdAt ? new Date(c.createdAt).getTime() : 0);

function sortMatches(list: ClientMatch[], order: SortOrder): ClientMatch[] {
  const sorted = [...list];
  switch (order) {
    case "oldest":
      return sorted.sort((a, b) => createdTime(a.client) - createdTime(b.client));
    case "name-asc":
      return sorted.sort((a, b) => a.client.name.localeCompare(b.client.name, "pt-BR"));
    case "name-desc":
      return sorted.sort((a, b) => b.client.name.localeCompare(a.client.name, "pt-BR"));
    default:
      return sorted.sort((a, b) => createdTime(b.client) - createdTime(a.client));
  }
}

function ClientCard({ client, highlightedPetIds }: { client: Client; highlightedPetIds: string[] }) {
  const pets = client.animals ?? [];
  const phone = client.mainPhoneContact?.trim();
  // Bairro diz mais que a cidade (quase todo mundo é da mesma cidade).
  const place = client.address?.neighborhood?.trim() || client.address?.city?.trim();

  return (
    <li className="relative flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-3.5 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-md sm:p-4">
      <div className="flex items-start gap-3">
        <ClientAvatar name={client.name} />
        <div className="min-w-0 flex-1">
          {/* Link "esticado": o card inteiro abre a ficha; chips e WhatsApp ficam por cima (z-10). */}
          <Link
            to={`/clients/${client.id}`}
            className="block break-words text-[15px] font-semibold leading-snug text-foreground after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary/60"
          >
            {client.name}
          </Link>
          {(phone || place) && (
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {phone && (
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <Phone className="h-3 w-3" aria-hidden />
                  {formatPhoneBR(phone)}
                </span>
              )}
              {place && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">{place}</span>
                </span>
              )}
            </p>
          )}
        </div>
        {phone && (
          <button
            type="button"
            onClick={() => openWhatsAppChat(phone)}
            className="relative z-10 -mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-emerald-600 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
            aria-label={`Conversar com ${client.name} no WhatsApp`}
            title="Conversar no WhatsApp"
          >
            <FaWhatsapp className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {pets.length > 0 ? (
          pets.map((animal) => (
            <PetChip
              key={animal.id}
              animal={animal}
              to={getPatientRecordPath(client.id, animal.id, animal.patientCode)}
              highlighted={highlightedPetIds.includes(animal.id)}
            />
          ))
        ) : (
          <Link
            to={`/animals/add?clientId=${client.id}`}
            className="relative z-10 inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Plus className="h-3 w-3" aria-hidden /> Adicionar animal
          </Link>
        )}
      </div>
    </li>
  );
}

const ClientsPage = () => {
  const { data: dbClients, isLoading, isError, error } = useClientsList();
  const clients: Client[] = useMemo(() => dbClients ?? [], [dbClients]);

  const [params, setParams] = useSearchParams();
  const speciesFilter = (params.get("especie") as SpeciesFilter) || "all";
  const sortOrder = (params.get("ordem") as SortOrder) || "newest";
  // Campo com estado próprio (o cursor não pula ao digitar no meio do texto);
  // a URL acompanha pra busca sobreviver ao "voltar".
  const [search, setSearch] = useState(() => params.get("q") ?? "");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const setParam = (key: string, value: string, fallback: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!value || value === fallback) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true }
    );

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [search, speciesFilter, sortOrder]);

  const counts = useMemo(() => {
    const c = { all: 0, dog: 0, cat: 0, other: 0 };
    for (const client of clients)
      for (const a of client.animals ?? []) {
        c.all++;
        c[speciesKind(a.species)]++;
      }
    return c;
  }, [clients]);

  const matches = useMemo(() => {
    const q = norm(search);
    const digits = digitsOf(search);
    const found = clients
      .map((c) => matchClient(c, q, digits, speciesFilter))
      .filter((m): m is ClientMatch => m !== null);
    return sortMatches(found, sortOrder);
  }, [clients, search, speciesFilter, sortOrder]);

  const isFiltering = Boolean(search.trim()) || speciesFilter !== "all";
  const shown = matches.slice(0, visible);
  const remaining = matches.length - shown.length;

  const clearFilters = () => {
    setSearch("");
    setParams(new URLSearchParams(sortOrder === "newest" ? {} : { ordem: sortOrder }), { replace: true });
  };

  const speciesChips: Array<{ key: SpeciesFilter; label: string; count: number; Icon?: typeof Dog }> = [
    { key: "all", label: "Todos", count: clients.length },
    { key: "dog", label: "Cães", count: counts.dog, Icon: Dog },
    { key: "cat", label: "Gatos", count: counts.cat, Icon: Cat },
    ...(counts.other > 0 ? [{ key: "other" as const, label: "Outros", count: counts.other, Icon: PawPrint }] : []),
  ];

  return (
    <PageShell className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Clientes"
        description="Tutores e seus animais. Toque no nome do pet para abrir o prontuário."
        icon={Users}
        module="clinical"
        breadcrumb={<>Painel &gt; Clientes</>}
        className="mb-0 sm:mb-0"
        actions={
          <>
            <Button asChild variant="outline" className="flex-1 border-primary/25 shadow-sm sm:flex-none">
              <Link to="/animals/add">
                <Plus className="mr-2 h-4 w-4" /> Novo animal
              </Link>
            </Button>
            <Button asChild className="flex-1 font-semibold shadow-sm sm:flex-none">
              <Link to="/clients/add">
                <UserPlus className="mr-2 h-4 w-4" /> Novo responsável
              </Link>
            </Button>
          </>
        }
      />

      <div className="space-y-3 rounded-2xl border border-border/80 bg-card p-3 shadow-sm sm:p-4">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setParam("q", e.target.value, "");
              }}
              placeholder="Buscar tutor, pet, telefone ou CPF"
              aria-label="Buscar clientes"
              enterKeyHint="search"
              autoComplete="off"
              className="h-10 rounded-xl bg-input pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setParam("q", "", "");
                }}
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={sortOrder} onValueChange={(v) => setParam("ordem", v, "newest")}>
            <SelectTrigger
              className="h-10 w-auto shrink-0 gap-2 rounded-xl bg-input px-3"
              aria-label={`Ordenar lista: ${SORT_LABEL[sortOrder]}`}
              title="Ordenar lista"
            >
              <ArrowUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              {/* No celular fica só o ícone: o campo de busca precisa do espaço.
                  "!": o SelectTrigger força display nos <span> filhos (line-clamp). */}
              <span className="max-sm:!hidden">
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent align="end">
              {(Object.keys(SORT_LABEL) as SortOrder[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {SORT_LABEL[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {speciesChips.map(({ key, label, count, Icon }) => {
            const active = speciesFilter === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => setParam("especie", key, "all")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  active ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-foreground ring-border hover:bg-muted"
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
                {label}
                <span className={cn("tabular-nums", active ? "text-primary-foreground/80" : "text-muted-foreground")}>{count}</span>
              </button>
            );
          })}
          <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">
            {isLoading
              ? "Carregando…"
              : isFiltering
                ? `${matches.length} de ${clients.length} ${clients.length === 1 ? "cliente" : "clientes"}`
                : `${clients.length} ${clients.length === 1 ? "cliente" : "clientes"} · ${counts.all} ${counts.all === 1 ? "animal" : "animais"}`}
          </span>
        </div>
      </div>

      {isError ? (
        <Alert variant="destructive">
          <AlertTitle>Falha ao carregar clientes</AlertTitle>
          <AlertDescription>{error instanceof Error ? error.message : "Erro desconhecido ao consultar o Supabase."}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[7.5rem] rounded-2xl" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <DataTableFrame
          empty
          emptyTitle={clients.length === 0 ? "Nenhum cliente cadastrado ainda" : "Nenhum cliente encontrado"}
          emptyDescription={
            clients.length === 0
              ? "Cadastre o primeiro responsável para começar."
              : "Confira a grafia ou busque pelo nome do pet, telefone ou CPF."
          }
          emptyCta={
            clients.length === 0 ? (
              <Button asChild>
                <Link to="/clients/add">
                  <UserPlus className="mr-2 h-4 w-4" /> Novo responsável
                </Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" /> Limpar busca e filtros
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Colunas pela largura que sobra (menu lateral aberto/fechado), não pela tela. */}
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
            {shown.map(({ client, petIds }) => (
              <ClientCard key={client.id} client={client} highlightedPetIds={petIds} />
            ))}
          </ul>
          {remaining > 0 && (
            <div className="flex justify-center">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Mostrar mais ({remaining} {remaining === 1 ? "restante" : "restantes"})
              </Button>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
};

export default ClientsPage;
