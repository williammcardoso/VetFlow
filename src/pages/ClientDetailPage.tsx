import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ExternalLink,
  Fingerprint,
  Mail,
  MapPin,
  PawPrint,
  Pencil,
  Phone,
  Plus,
  StickyNote,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { DataTableFrame } from "@/components/saas/DataTableFrame";
import { ClientAvatar, SexIcon, formatAgeShort, speciesVisual } from "@/components/clients/clientVisuals";
import { cn, formatPhoneBR } from "@/lib/utils";
import { openWhatsAppChat } from "@/lib/whatsappShare";
import { useClientWithAnimals } from "@/hooks/useSupabaseClients";
import { getPatientRecordPath } from "@/utils/patientDisplayId";
import type { Animal, Client } from "@/types/client";

const formatGender = (rawGender: string) => {
  const normalized = rawGender.toLowerCase().trim();
  if (!normalized) return "";
  if (["male", "macho", "masculino"].includes(normalized)) return "Masculino";
  if (["female", "femea", "fêmea", "feminino"].includes(normalized)) return "Feminino";
  return "Outro";
};

/** "1992-11-12" → "12/11/1992" (data sem hora: sem conversão de fuso). */
const formatDateBR = (dateString: string) => {
  const [year, month, day] = (dateString || "").slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
};

function InfoCard({ icon: Icon, title, action, children }: { icon: LucideIcon; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="h-4 w-4 text-vf-clinical" aria-hidden /> {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function PetCard({ clientId, animal }: { clientId: string; animal: Animal }) {
  const { Icon, badge } = speciesVisual(animal.species);
  const age = formatAgeShort(animal.birthday);
  const weight = animal.weight > 0 ? `${animal.weight.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg` : "";
  const details = [animal.breed || animal.species, age, weight].filter(Boolean).join(" · ");
  const inactive = animal.status === "Inativo";

  return (
    <li
      className={cn(
        "relative flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-md",
        inactive && "opacity-70"
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", badge)} aria-hidden>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            {/* Link "esticado": o card todo abre o prontuário; o lápis fica por cima (z-10). */}
            <Link
              to={getPatientRecordPath(clientId, animal.id, animal.patientCode)}
              className="min-w-0 break-words text-base font-semibold leading-snug text-foreground after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary/60"
            >
              {animal.name}
            </Link>
            <SexIcon gender={animal.gender} className="h-3.5 w-3.5 shrink-0" />
            {inactive && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Inativo</span>
            )}
          </div>
          {details && <p className="mt-0.5 break-words text-sm text-muted-foreground">{details}</p>}
        </div>
        <Link
          to={`/clients/${clientId}/animals/${animal.id}/edit`}
          className="relative z-10 -mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={`Editar cadastro de ${animal.name}`}
          title="Editar animal"
        >
          <Pencil className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs">
        <span className="text-muted-foreground">
          {animal.patientCode ? `Ficha nº ${String(animal.patientCode).padStart(4, "0")}` : animal.species}
        </span>
        <span className="inline-flex items-center gap-0.5 font-medium text-primary">
          Abrir prontuário <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
    </li>
  );
}

function ContactPreferences({ client }: { client: Client }) {
  const prefs = [
    { label: "WhatsApp", on: client.acceptWhatsapp === "yes" },
    { label: "E-mail", on: client.acceptEmail === "yes" },
    { label: "SMS", on: client.acceptSMS === "yes" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-xs text-muted-foreground">Aceita receber:</span>
      {prefs.map((p) => (
        <span
          key={p.label}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
            p.on ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-muted text-muted-foreground ring-border"
          )}
        >
          {p.on ? <Check className="h-3 w-3" aria-hidden /> : <X className="h-3 w-3" aria-hidden />}
          <span className={cn(!p.on && "line-through decoration-muted-foreground/60")}>{p.label}</span>
          <span className="sr-only">{p.on ? "(sim)" : "(não)"}</span>
        </span>
      ))}
    </div>
  );
}

const ClientDetailPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const { data: dbClient, isLoading, isError, error } = useClientWithAnimals(clientId);
  const client: Client | undefined = dbClient ?? undefined;

  if (isLoading && !client) {
    return (
      <PageShell className="space-y-4">
        <Skeleton className="h-36 rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:col-span-2">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
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

  const personal = [
    { label: isPerson ? "CPF" : "CNPJ", value: client.identificationNumber },
    { label: isPerson ? "RG" : "Inscrição estadual", value: client.secondaryIdentification },
    { label: isPerson ? "Nascimento" : "Fundação", value: formatDateBR(client.birthday) },
    { label: "Sexo", value: isPerson && client.gender ? formatGender(client.gender) : "" },
    { label: "Profissão", value: client.profession },
    { label: "Nacionalidade", value: client.nationality === "brazilian" ? "Brasileira" : client.nationality },
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
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:text-sm">
          <Link
            to="/clients"
            onClick={handleBack}
            className="inline-flex items-center gap-1 rounded-md font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Clientes
          </Link>
          <span aria-hidden>/</span>
          <span className="min-w-0 truncate">{client.name}</span>
        </div>

        {/* Quebra por espaço disponível (igual ao PageHeader): com o menu lateral
            aberto no tablet os botões descem em vez de espremer o nome. */}
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-4">
          <div className="flex min-w-0 flex-[1_1_18rem] items-center gap-3 sm:gap-4">
            <ClientAvatar name={client.name} className="h-14 w-14 text-lg sm:h-16 sm:w-16 sm:text-xl" />
            <div className="min-w-0">
              <h1 className="break-words text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{client.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="rounded-full bg-muted px-2.5 py-0.5 font-medium text-muted-foreground">
                  {isPerson ? "Pessoa física" : "Pessoa jurídica"}
                </span>
                <span className="rounded-full bg-[hsl(var(--vf-clinical)/0.12)] px-2.5 py-0.5 font-medium text-vf-clinical">
                  {pets.length} {pets.length === 1 ? "animal" : "animais"}
                </span>
                {since && <span className="rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">Cliente desde {since}</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 max-sm:w-full">
            {phone && (
              <Button
                variant="outline"
                className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 sm:flex-none"
                onClick={() => openWhatsAppChat(phone)}
              >
                <FaWhatsapp className="mr-2 h-4 w-4" /> WhatsApp
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

        {client.notes?.trim() && (
          <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <p className="min-w-0 whitespace-pre-line break-words">
              <span className="font-semibold">Observações: </span>
              {client.notes}
            </p>
          </div>
        )}
      </section>

      {/* xl, não lg: entre 1024 e 1280 com o menu aberto a coluna da direita ficaria com ~230px. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-5">
        <section className="space-y-3 xl:col-span-2" aria-labelledby="client-pets-title">
          <div className="flex items-center justify-between gap-2">
            <h2 id="client-pets-title" className="flex items-center gap-2 text-base font-semibold text-foreground">
              <PawPrint className="h-5 w-5 text-vf-clinical" aria-hidden /> Animais
              <span className="font-normal text-muted-foreground">({pets.length})</span>
            </h2>
            <Button asChild size="sm" variant="outline" className="border-primary/25">
              <Link to={`/animals/add?clientId=${client.id}`}>
                <Plus className="mr-1.5 h-4 w-4" /> Adicionar animal
              </Link>
            </Button>
          </div>
          {pets.length > 0 ? (
            // Até 2 colunas (cada uma com no mínimo 16rem): com 2 pets eles
            // dividem a largura em vez de sobrar uma coluna vazia.
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(max(16rem,calc(50%_-_0.375rem)),1fr))] gap-3">
              {pets.map((animal) => (
                <PetCard key={animal.id} clientId={client.id} animal={animal} />
              ))}
            </ul>
          ) : (
            <DataTableFrame
              empty
              emptyTitle="Nenhum animal cadastrado"
              emptyDescription="Cadastre o primeiro animal deste responsável."
              emptyCta={
                <Button asChild>
                  <Link to={`/animals/add?clientId=${client.id}`}>
                    <Plus className="mr-2 h-4 w-4" /> Adicionar animal
                  </Link>
                </Button>
              }
            />
          )}
        </section>

        {/* Tablet: cartões em 2 colunas; tela grande: coluna à direita. */}
        <aside className="grid grid-cols-1 content-start gap-4 md:grid-cols-2 xl:grid-cols-1">
          <InfoCard icon={Phone} title="Contato">
            <div className="space-y-2.5 text-sm">
              {phone ? (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="font-medium text-foreground">{formatPhoneBR(phone)}</span>
                </div>
              ) : null}
              {email ? (
                <a href={`mailto:${email}`} className="flex min-w-0 items-center gap-2 text-foreground hover:text-primary">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 break-all">{email}</span>
                </a>
              ) : null}
              {!phone && !email && <p className="text-muted-foreground">Nenhum contato cadastrado.</p>}
              <ContactPreferences client={client} />
            </div>
          </InfoCard>

          <InfoCard
            icon={MapPin}
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
              <p className="text-sm text-muted-foreground">Endereço não cadastrado.</p>
            )}
          </InfoCard>

          <InfoCard icon={Fingerprint} title={isPerson ? "Dados pessoais" : "Dados da empresa"}>
            {personal.length > 0 ? (
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
                {personal.map((row) => (
                  <React.Fragment key={row.label}>
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="break-words font-medium text-foreground">{row.value}</dd>
                  </React.Fragment>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum dado cadastrado.</p>
            )}
          </InfoCard>
        </aside>
      </div>
    </PageShell>
  );
};

export default ClientDetailPage;
