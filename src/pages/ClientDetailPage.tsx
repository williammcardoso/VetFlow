import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, ExternalLink, Pencil, Phone, Plus, StickyNote, Users } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import {
  ClientAvatar,
  formatAgeShort,
  formatDateBR,
  formatWeightKg,
  sexLabel,
  speciesIcon,
  speciesTone,
} from "@/components/clients/clientVisuals";
import { cn, formatPhoneBR } from "@/lib/utils";
import { openWhatsAppChat } from "@/lib/whatsappShare";
import { useClientWithAnimals } from "@/hooks/useSupabaseClients";
import { useLastVisits } from "@/hooks/useLastAppointmentDates";
import type { LastVisit } from "@/lib/lastVisits";
import { getPatientRecordPath } from "@/utils/patientDisplayId";
import type { Animal, Client } from "@/types/client";

// Ficha do cliente no padrão dos sistemas veterinários de referência
// (Provet Cloud): cabeçalho com quem é e as ações, observação importante em
// destaque, os animais como assunto principal e os dados cadastrais num
// cartão só, ao lado. Sem campos vazios.

const formatGender = (rawGender: string) => {
  const normalized = rawGender.toLowerCase().trim();
  if (!normalized) return "";
  if (["male", "macho", "masculino"].includes(normalized)) return "Masculino";
  if (["female", "femea", "fêmea", "feminino"].includes(normalized)) return "Feminino";
  return "Outro";
};

function PetRow({ clientId, animal, lastVisit }: { clientId: string; animal: Animal; lastVisit?: LastVisit }) {
  const Icon = speciesIcon(animal.species);
  const details = [animal.breed || animal.species, sexLabel(animal.gender), formatAgeShort(animal.birthday), formatWeightKg(animal.weight)]
    .filter(Boolean)
    .join(" · ");
  const code = animal.patientCode ? `Ficha ${String(animal.patientCode).padStart(4, "0")}` : "";
  // Atendimento ou venda (ex.: só uma injeção lançada no financeiro).
  const visit = lastVisit
    ? `Última visita ${formatDateBR(lastVisit.date)}${lastVisit.source === "venda" ? " (venda)" : ""}`
    : "Nenhuma visita ainda";
  const inactive = animal.status === "Inativo";

  return (
    <li className={cn("relative flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40", inactive && "opacity-70")}>
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", speciesTone(animal.species).soft)} aria-hidden>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {/* Link "esticado": a linha toda abre o prontuário; o lápis fica por cima (z-10). */}
          <Link
            to={getPatientRecordPath(clientId, animal.id, animal.patientCode)}
            className="break-words font-medium text-foreground after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-primary/60"
          >
            {animal.name}
          </Link>
          {inactive && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Inativo</span>}
        </div>
        {details && <p className="break-words text-sm text-muted-foreground">{details}</p>}
        <p className="mt-0.5 text-xs text-muted-foreground/80">{[code, visit].filter(Boolean).join(" · ")}</p>
      </div>
      <Link
        to={`/clients/${clientId}/animals/${animal.id}/edit`}
        className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label={`Editar cadastro de ${animal.name}`}
        title="Editar cadastro do animal"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
    </li>
  );
}

function DetailGroup({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function DetailRows({ rows }: { rows: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    // Rótulo em coluna fixa e o valor logo ao lado (padrão "Details" do
    // Stripe) — com o valor encostado na direita, no tablet os dois ficavam
    // a meio cartão de distância.
    <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
      {rows.map((row) => (
        <React.Fragment key={row.label}>
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="min-w-0 break-words font-medium text-foreground">{row.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

/** "WhatsApp, e-mail e SMS" / "Só WhatsApp" / "Não aceita mensagens". */
function messagePreference(client: Client): string {
  const accepted = [
    client.acceptWhatsapp === "yes" && "WhatsApp",
    client.acceptEmail === "yes" && "e-mail",
    client.acceptSMS === "yes" && "SMS",
  ].filter(Boolean) as string[];
  if (!accepted.length) return "Não aceita";
  if (accepted.length === 1) return accepted[0].charAt(0).toUpperCase() + accepted[0].slice(1);
  return `${accepted.slice(0, -1).join(", ")} e ${accepted[accepted.length - 1]}`;
}

const ClientDetailPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const { data: dbClient, isLoading, isError, error } = useClientWithAnimals(clientId);
  const { data: lastVisits } = useLastVisits();
  const client: Client | undefined = dbClient ?? undefined;

  if (isLoading && !client) {
    return (
      <PageShell className="space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Skeleton className="h-48 rounded-2xl xl:col-span-2" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  if (!client) {
    return (
      <PageShell>
        <PageHeader title="Cliente não encontrado" icon={Users} module="clinical" />
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>{isError ? "Erro ao carregar cliente" : "Cliente não encontrado"}</AlertTitle>
          <AlertDescription>
            {isError ? `Falha ao consultar o Supabase: ${error instanceof Error ? error.message : "erro desconhecido"}.` : "Este cliente não existe ou foi removido."}
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link to="/clients">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Clientes
          </Link>
        </Button>
      </PageShell>
    );
  }

  const pets = client.animals ?? [];
  const phone = client.mainPhoneContact?.trim() || "";
  const phoneDigits = phone.replace(/\D/g, "");
  const email = client.mainEmailContact?.trim() || "";
  const isPerson = client.clientType !== "legal";
  const since = client.createdAt ? new Date(client.createdAt).toLocaleDateString("pt-BR") : "";

  const { street, number, complement, neighborhood, city, state, cep } = client.address;
  const addressLine1 = [street && number ? `${street}, ${number}` : street || number, complement].filter(Boolean).join(" — ");
  const addressLine2 = [neighborhood, [city, state].filter(Boolean).join(" - ")].filter(Boolean).join(" · ");
  const hasAddress = Boolean(addressLine1 || addressLine2 || cep);
  const mapsUrl = hasAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([street, number, neighborhood, city, state, cep].filter(Boolean).join(", "))}`
    : "";

  const phone2 = client.secondaryPhoneContact?.trim() || "";
  const phone2Label = client.secondaryPhoneLabel?.trim() || "";
  const contactRows = [
    phone && { label: "Telefone", value: formatPhoneBR(phone) },
    phone2 && {
      label: "Outro telefone",
      value: (
        <span className="inline-flex flex-wrap items-center gap-x-2">
          <span>
            {formatPhoneBR(phone2)}
            {phone2Label && <span className="font-normal text-muted-foreground"> · {phone2Label}</span>}
          </span>
          <button
            type="button"
            onClick={() => openWhatsAppChat(phone2)}
            className="inline-flex items-center rounded text-emerald-600 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
            aria-label={`Conversar no WhatsApp com ${phone2Label || "o outro telefone"}`}
            title="Conversar no WhatsApp"
          >
            <FaWhatsapp className="h-4 w-4" />
          </button>
        </span>
      ),
    },
    email && { label: "E-mail", value: <a href={`mailto:${email}`} className="break-all hover:text-primary hover:underline">{email}</a> },
    { label: "Mensagens", value: messagePreference(client) },
  ].filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;

  const documentRows = [
    { label: isPerson ? "CPF" : "CNPJ", value: client.identificationNumber },
    { label: isPerson ? "RG" : "Inscrição estadual", value: client.secondaryIdentification },
  ].filter((row) => row.value?.trim());

  const personalRows = [
    { label: isPerson ? "Nascimento" : "Fundação", value: formatDateBR(client.birthday) },
    { label: "Sexo", value: isPerson && client.gender ? formatGender(client.gender) : "" },
    { label: "Profissão", value: client.profession },
    { label: "Nacionalidade", value: client.nationality === "brazilian" ? "Brasileira" : client.nationality === "other" ? "Outra" : client.nationality },
  ].filter((row) => row.value?.trim());

  // Veio da lista? Volta pra ela (com a busca/filtro que estava); senão abre a lista.
  const handleBack = (e: React.MouseEvent) => {
    if ((window.history.state?.idx ?? 0) > 0) {
      e.preventDefault();
      navigate(-1);
    }
  };

  return (
    <PageShell className="space-y-4 sm:space-y-5">
      <section className="vf-page-hero p-4 sm:p-6">
        <Link
          to="/clients"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Clientes
        </Link>

        {/* Quebra por espaço disponível (igual ao PageHeader): com o menu lateral
            aberto no tablet os botões descem em vez de espremer o nome. */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-4">
          <div className="flex min-w-0 flex-[1_1_18rem] items-center gap-4">
            <ClientAvatar name={client.name} className="h-14 w-14 text-lg" />
            <div className="min-w-0">
              <h1 className="break-words text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{client.name}</h1>
              {/* Cada informação inteira numa linha: quebra só entre elas, nunca no meio da data. */}
              <p className="mt-0.5 flex flex-col text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-2">
                {[phone && formatPhoneBR(phone), since && `Cliente desde ${since}`].filter(Boolean).map((item, i) => (
                  <span key={i} className="whitespace-nowrap">
                    {i > 0 && (
                      <span aria-hidden className="mr-2 hidden sm:inline">
                        ·
                      </span>
                    )}
                    {item}
                  </span>
                ))}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 max-sm:w-full">
            {phone && (
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => openWhatsAppChat(phone)}>
                <FaWhatsapp className="mr-2 h-4 w-4 text-emerald-600" /> WhatsApp
              </Button>
            )}
            {/* Ligar só no celular — no computador o tel: abre um "escolha um app". */}
            {phoneDigits && (
              <Button asChild variant="outline" className="flex-1 md:hidden">
                <a href={`tel:${phoneDigits}`}>
                  <Phone className="mr-2 h-4 w-4" /> Ligar
                </a>
              </Button>
            )}
            <Button asChild variant="outline" className="flex-1 sm:flex-none">
              <Link to={`/clients/${client.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" /> Editar
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {client.notes?.trim() && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="note">
          <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <div className="min-w-0">
            <p className="font-semibold">Observações</p>
            <p className="mt-0.5 whitespace-pre-line break-words">{client.notes}</p>
          </div>
        </div>
      )}

      {/* xl, não lg: entre 1024 e 1280 com o menu aberto a coluna da direita ficaria estreita demais. */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3 xl:gap-5">
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm xl:col-span-2" aria-labelledby="client-pets-title">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
            <div className="min-w-0">
              <h2 id="client-pets-title" className="text-base font-semibold text-foreground">
                Animais <span className="font-normal text-muted-foreground">({pets.length})</span>
              </h2>
              {pets.length > 0 && <p className="text-xs text-muted-foreground">Toque no animal para abrir o prontuário.</p>}
            </div>
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link to={`/animals/add?clientId=${client.id}`}>
                <Plus className="mr-1.5 h-4 w-4" /> Adicionar
              </Link>
            </Button>
          </div>
          {pets.length > 0 ? (
            <ul className="divide-y divide-border/70">
              {pets.map((animal) => (
                <PetRow key={animal.id} clientId={client.id} animal={animal} lastVisit={lastVisits?.byAnimal[animal.id]} />
              ))}
            </ul>
          ) : (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">Nenhum animal cadastrado</p>
              <p className="mt-1 text-sm text-muted-foreground">Cadastre o primeiro animal deste cliente.</p>
              <Button asChild className="mt-4">
                <Link to={`/animals/add?clientId=${client.id}`}>
                  <Plus className="mr-2 h-4 w-4" /> Adicionar animal
                </Link>
              </Button>
            </div>
          )}
        </section>

        <aside className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm" aria-labelledby="client-data-title">
          <div className="border-b border-border/70 px-4 py-3">
            <h2 id="client-data-title" className="text-base font-semibold text-foreground">
              Dados do cliente
            </h2>
            <p className="text-xs text-muted-foreground">{isPerson ? "Pessoa física" : "Pessoa jurídica"}</p>
          </div>
          {/* Tablet: grupos em 2 colunas; tela grande (coluna estreita à direita): 1 coluna. */}
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 p-4 md:grid-cols-2 xl:grid-cols-1">
            <DetailGroup title="Contato">
              <DetailRows rows={contactRows} />
            </DetailGroup>
            <DetailGroup
              title="Endereço"
              action={
                mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Ver no mapa <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : null
              }
            >
              {hasAddress ? (
                <div className="space-y-0.5 text-sm">
                  {addressLine1 && <p className="break-words font-medium text-foreground">{addressLine1}</p>}
                  {addressLine2 && <p className="break-words text-muted-foreground">{addressLine2}</p>}
                  {cep && <p className="text-muted-foreground">CEP {cep}</p>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Não cadastrado.</p>
              )}
            </DetailGroup>
            {documentRows.length > 0 && (
              <DetailGroup title="Documentos">
                <DetailRows rows={documentRows} />
              </DetailGroup>
            )}
            {personalRows.length > 0 && (
              <DetailGroup title={isPerson ? "Pessoal" : "Empresa"}>
                <DetailRows rows={personalRows} />
              </DetailGroup>
            )}
          </div>
        </aside>
      </div>
    </PageShell>
  );
};

export default ClientDetailPage;
