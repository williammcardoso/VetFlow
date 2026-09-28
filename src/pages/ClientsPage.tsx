import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpDown, ChevronRight, Plus, Search, UserPlus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/saas/PageHeader";
import { PageShell } from "@/components/saas/PageShell";
import {
  ClientAvatar,
  PetChip,
  formatDateBR,
  speciesKind,
  type SpeciesKind,
} from "@/components/clients/clientVisuals";
import { cn, formatPhoneBR } from "@/lib/utils";
import { getPatientRecordPath } from "@/utils/patientDisplayId";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { useLastAppointmentDates } from "@/hooks/useLastAppointmentDates";
import type { Client } from "@/types/client";

type SpeciesFilter = "all" | SpeciesKind;
type SortOrder = "newest" | "name" | "last-visit";

// Lista única com linhas (padrão Stripe/Linear; NN/g: lista é mais fácil de
// percorrer com o olho do que grade de cartões). No computador vira tabela
// com colunas alinhadas; no celular, linha com nome, telefone e os pets.
// Busca, filtro e ordem ficam na URL: ao abrir um cliente e voltar, a lista
// continua do mesmo jeito.
const PAGE_SIZE = 30;

const SORT_LABEL: Record<SortOrder, string> = {
  newest: "Cadastro mais recente",
  name: "Nome (A–Z)",
  "last-visit": "Última visita",
};

// Chaves válidas do filtro de espécie (o valor vem da URL).
const SPECIES_KEYS: Record<SpeciesFilter, true> = { all: true, dog: true, cat: true, other: true };

const SPECIES_FILTERS: Array<{ key: SpeciesFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "dog", label: "Cães" },
  { key: "cat", label: "Gatos" },
  { key: "other", label: "Outros" },
];

// Mesmas colunas no cabeçalho e nas linhas (cliente | animais | última visita).
// lg, não md: no tablet em pé com o menu aberto sobram ~540px e as colunas
// espremiam o nome em 3–4 linhas — ali fica o formato de lista do celular.
const COLUMNS = "lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_7.5rem] lg:items-center lg:gap-4";

const norm = (s: string | undefined) =>
  (s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
const digitsOf = (s: string | undefined) => (s || "").replace(/\D/g, "");

interface ClientRowData {
  client: Client;
  /** Pets que bateram com a busca (ganham destaque). */
  petIds: string[];
  /** Último atendimento entre os pets do cliente ("aaaa-mm-dd" ou ""). */
  lastVisit: string;
}

/** Busca por nome do tutor, nome do pet, telefone, CPF/CNPJ ou nº da ficha do pet. */
function matchClient(client: Client, q: string, digits: string, species: SpeciesFilter): string[] | null {
  const pets = client.animals ?? [];
  if (species !== "all" && !pets.some((a) => speciesKind(a.species) === species)) return null;
  if (!q && digits.length < 3) return [];

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

  return nameHit || petIds.length || docHit ? petIds : null;
}

const createdTime = (c: Client) => (c.createdAt ? new Date(c.createdAt).getTime() : 0);

function sortRows(rows: ClientRowData[], order: SortOrder): ClientRowData[] {
  const sorted = [...rows];
  const byName = (a: ClientRowData, b: ClientRowData) => a.client.name.localeCompare(b.client.name, "pt-BR");
  switch (order) {
    case "name":
      return sorted.sort(byName);
    case "last-visit":
      return sorted.sort((a, b) => b.lastVisit.localeCompare(a.lastVisit) || byName(a, b));
    default:
      return sorted.sort((a, b) => createdTime(b.client) - createdTime(a.client));
  }
}

function ClientRow({ row }: { row: ClientRowData }) {
  const { client, petIds, lastVisit } = row;
  const pets = client.animals ?? [];
  const phone = client.mainPhoneContact?.trim();

  return (
    <li className="relative flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40 sm:px-4">
      <ClientAvatar name={client.name} />
      <div className={cn("min-w-0 flex-1", COLUMNS)}>
        <div className="min-w-0">
          {/* Link "esticado": a linha toda abre a ficha; as etiquetas dos pets ficam por cima (z-10). */}
          <Link
            to={`/clients/${client.id}`}
            title={client.name}
            className="block break-words font-medium leading-snug text-foreground after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-primary/60 xl:truncate"
          >
            {client.name}
          </Link>
          <p className="truncate text-sm text-muted-foreground">{phone ? formatPhoneBR(phone) : "Sem telefone"}</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 lg:mt-0">
          {pets.length > 0 ? (
            pets.map((animal) => (
              <PetChip
                key={animal.id}
                animal={animal}
                to={getPatientRecordPath(client.id, animal.id, animal.patientCode)}
                highlighted={petIds.includes(animal.id)}
              />
            ))
          ) : (
            <span className="text-sm text-muted-foreground">Nenhum animal</span>
          )}
        </div>
        <p className="hidden text-right text-sm tabular-nums text-muted-foreground lg:block">
          {lastVisit ? formatDateBR(lastVisit) : "—"}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
    </li>
  );
}

const ClientsPage = () => {
  const { data: dbClients, isLoading, isError, error } = useClientsList();
  const { data: lastVisits = {} } = useLastAppointmentDates();
  const clients: Client[] = useMemo(() => dbClients ?? [], [dbClients]);

  const [params, setParams] = useSearchParams();
  const speciesParam = params.get("especie") as SpeciesFilter | null;
  const speciesFilter: SpeciesFilter = speciesParam && speciesParam in SPECIES_KEYS ? speciesParam : "all";
  const sortParam = params.get("ordem") as SortOrder | null;
  const sortOrder: SortOrder = sortParam && sortParam in SORT_LABEL ? sortParam : "newest";
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
    const c: Record<SpeciesFilter, number> = { all: 0, dog: 0, cat: 0, other: 0 };
    for (const client of clients)
      for (const a of client.animals ?? []) {
        c.all++;
        c[speciesKind(a.species)]++;
      }
    return c;
  }, [clients]);

  const rows = useMemo(() => {
    const q = norm(search);
    const digits = digitsOf(search);
    const found: ClientRowData[] = [];
    for (const client of clients) {
      const petIds = matchClient(client, q, digits, speciesFilter);
      if (!petIds) continue;
      const lastVisit = (client.animals ?? []).reduce((acc, a) => {
        const d = lastVisits[a.id] || "";
        return d > acc ? d : acc;
      }, "");
      found.push({ client, petIds, lastVisit });
    }
    return sortRows(found, sortOrder);
  }, [clients, search, speciesFilter, sortOrder, lastVisits]);

  const isFiltering = Boolean(search.trim()) || speciesFilter !== "all";
  const shown = rows.slice(0, visible);
  const remaining = rows.length - shown.length;

  const clearFilters = () => {
    setSearch("");
    setParams(new URLSearchParams(sortOrder === "newest" ? {} : { ordem: sortOrder }), { replace: true });
  };

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  return (
    <PageShell className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Clientes"
        description={
          isLoading
            ? "Tutores e seus animais."
            : `${plural(clients.length, "cliente", "clientes")} · ${plural(counts.all, "animal", "animais")}`
        }
        icon={Users}
        module="clinical"
        breadcrumb={<>Painel &gt; Clientes</>}
        className="mb-0 sm:mb-0"
        actions={
          <>
            <Button asChild variant="outline" className="flex-1 sm:flex-none">
              <Link to="/animals/add">
                <Plus className="mr-2 h-4 w-4" /> Novo animal
              </Link>
            </Button>
            <Button asChild className="flex-1 font-semibold sm:flex-none">
              <Link to="/clients/add">
                <UserPlus className="mr-2 h-4 w-4" /> Novo cliente
              </Link>
            </Button>
          </>
        }
      />

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm" aria-label="Lista de clientes">
        {/* Busca, filtro e ordem */}
        <div className="flex flex-col gap-3 border-b border-border/70 p-3 sm:p-4 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setParam("q", e.target.value, "");
                }}
                placeholder="Buscar por tutor, pet, telefone ou CPF"
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
                {/* Abaixo de 1280px fica só o ícone (a busca precisa do espaço). "!": o SelectTrigger força display nos <span> filhos (line-clamp). */}
                <span className="max-xl:!hidden">
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

          {/* Filtro por espécie: controle segmentado (uma escolha, sempre visível). */}
          <div role="radiogroup" aria-label="Filtrar por espécie" className="inline-flex w-full rounded-xl bg-muted p-1 sm:w-auto sm:self-start lg:self-auto">
            {SPECIES_FILTERS.filter((f) => f.key !== "other" || counts.other > 0).map(({ key, label }) => {
              const active = speciesFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setParam("especie", key, "all")}
                  className={cn(
                    "flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                    active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                  <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">{counts[key]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cabeçalho das colunas (computador) */}
        <div className="hidden items-center gap-3 border-b border-border/70 bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground lg:flex">
          <span className="w-10 shrink-0" aria-hidden />
          <div className={cn("flex-1", COLUMNS)}>
            <span>Cliente</span>
            <span>Animais</span>
            <span className="text-right">Última visita</span>
          </div>
          <span className="w-4 shrink-0" aria-hidden />
        </div>

        {isError ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertTitle>Falha ao carregar clientes</AlertTitle>
              <AlertDescription>{error instanceof Error ? error.message : "Erro desconhecido ao consultar o Supabase."}</AlertDescription>
            </Alert>
          </div>
        ) : isLoading ? (
          <ul className="divide-y divide-border/70" aria-hidden>
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-3.5 sm:px-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium text-foreground">
              {clients.length === 0 ? "Nenhum cliente cadastrado ainda" : "Nenhum cliente encontrado"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {clients.length === 0
                ? "Cadastre o primeiro cliente para começar."
                : "Confira a grafia ou busque pelo nome do pet, telefone ou CPF."}
            </p>
            <div className="mt-4">
              {clients.length === 0 ? (
                <Button asChild>
                  <Link to="/clients/add">
                    <UserPlus className="mr-2 h-4 w-4" /> Novo cliente
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" /> Limpar busca e filtro
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border/70">
              {shown.map((row) => (
                <ClientRow key={row.client.id} row={row} />
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-4 py-2.5 text-xs text-muted-foreground">
              <span aria-live="polite">
                {isFiltering
                  ? `${plural(rows.length, "resultado", "resultados")} de ${clients.length}`
                  : `Mostrando ${shown.length} de ${plural(rows.length, "cliente", "clientes")}`}
              </span>
              {remaining > 0 && (
                <Button variant="ghost" size="sm" className="h-8" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  Mostrar mais ({remaining})
                </Button>
              )}
            </div>
          </>
        )}
      </section>
    </PageShell>
  );
};

export default ClientsPage;
