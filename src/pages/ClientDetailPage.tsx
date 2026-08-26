import React from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUsers, FaPaw, FaPlus, FaEye, FaEdit, FaEnvelope, FaPhone, FaMapMarkerAlt, FaIdCard, FaBirthdayCake, FaBriefcase, FaWhatsapp, FaSms, FaStickyNote } from "@/components/icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Client } from "@/types/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useClientWithAnimals } from "@/hooks/useSupabaseClients";
import { getPatientRecordPath } from "@/utils/patientDisplayId";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users } from "lucide-react";

const ClientDetailPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const { data: dbClient, isLoading, isError, error } = useClientWithAnimals(clientId);
  const client: Client | undefined = dbClient ?? undefined;

  if (isLoading && !client) {
    return (
      <PageShell>
        <PageHeader title="Carregando cliente..." description="Buscando dados do responsável e dos animais vinculados." icon={Users} module="clinical" />
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
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
        <Button asChild variant="outline" className="bg-card border border-border text-foreground hover:bg-muted rounded-md transition-all duration-200 shadow-sm hover:shadow-md">
          <Link to="/clients">
            <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Clientes
          </Link>
        </Button>
      </PageShell>
    );
  }

  const handleViewRecord = (animalId: string, patientCode?: number) => {
    if (!clientId) return;
    navigate(getPatientRecordPath(clientId, animalId, patientCode));
  };

  const handleEditClient = () => {
    navigate(`/clients/${clientId}/edit`);
  };

  const formatGender = (rawGender: string) => {
    const normalized = rawGender.toLowerCase().trim();
    if (!normalized) return "";
    if (["male", "macho", "masculino"].includes(normalized)) return "Masculino";
    if (["female", "femea", "fêmea", "feminino"].includes(normalized)) return "Feminino";
    return "Outro";
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <PageShell>
      <PageHeader
        title={`Cliente: ${client.name}`}
        description="Visualize as informações do responsável, contatos e animais vinculados."
        icon={Users}
        module="clinical"
        breadcrumb={
          <>
            Painel &gt; <Link to="/clients" className="hover:text-primary">Clientes</Link> &gt; {client.name}
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={handleEditClient}
              className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground transition-colors duration-200"
            >
              <FaEdit className="mr-2 h-4 w-4" /> Editar Cliente
            </Button>
            <Button asChild variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground transition-colors duration-200">
              <Link to="/clients">
                <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Clientes
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex-1">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Coluna da Esquerda: Informações do Tutor */}
          <div className="col-span-1 lg:col-span-2 space-y-4">
            {/* Informações Gerais */}
            <Card className="vf-surface-card vf-tone-clinical card-hover rounded-2xl border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaUsers className="h-5 w-5 text-vf-clinical" /> Informações Gerais
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-y-3 pt-0 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Tipo:</span> {client.clientType === "physical" ? "Pessoa Física" : "Pessoa Jurídica"}</p>
                <p><span className="font-medium text-foreground">Nacionalidade:</span> {client.nationality === "brazilian" ? "Brasileira" : client.nationality}</p>
                {client.gender && <p><span className="font-medium text-foreground">Sexo:</span> {formatGender(client.gender)}</p>}
                <p><span className="font-medium text-foreground">{client.clientType === "physical" ? "CPF" : "CNPJ"}:</span> {client.identificationNumber}</p>
                <p><span className="font-medium text-foreground">{client.clientType === "physical" ? "RG" : "Inscrição Estadual"}:</span> {client.secondaryIdentification}</p>
                {client.birthday && <p><span className="font-medium text-foreground">Aniversário:</span> {formatDate(client.birthday)}</p>}
                {client.profession && <p><span className="font-medium text-foreground">Profissão:</span> {client.profession}</p>}
              </CardContent>
            </Card>

            {/* Contatos */}
            <Card className="vf-surface-card vf-tone-clinical card-hover rounded-2xl border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaPhone className="h-5 w-5 text-vf-clinical" /> Contatos
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-y-2 pt-0 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <FaEnvelope className="h-4 w-4 mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-foreground">Email Principal:</span> {client.mainEmailContact}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FaPhone className="h-4 w-4 mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-foreground">Telefone Principal:</span> {client.mainPhoneContact}
                  </div>
                </div>
                <p><span className="font-medium text-foreground">Aceita Email:</span> {client.acceptEmail === "yes" ? "Sim" : "Não"}</p>
                <p><span className="font-medium text-foreground">Aceita WhatsApp:</span> {client.acceptWhatsapp === "yes" ? "Sim" : "Não"}</p>
                <p><span className="font-medium text-foreground">Aceita SMS:</span> {client.acceptSMS === "yes" ? "Sim" : "Não"}</p>
              </CardContent>
            </Card>

            {/* Endereço */}
            <Card className="vf-surface-card vf-tone-clinical card-hover rounded-2xl border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaMapMarkerAlt className="h-5 w-5 text-vf-clinical" /> Endereço
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-y-2 pt-0 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">CEP:</span> {client.address.cep}</p>
                <p><span className="font-medium text-foreground">Rua:</span> {client.address.street}, {client.address.number}</p>
                {client.address.complement && <p><span className="font-medium text-foreground">Complemento:</span> {client.address.complement}</p>}
                <p><span className="font-medium text-foreground">Bairro:</span> {client.address.neighborhood}</p>
                <p><span className="font-medium text-foreground">Cidade/Estado:</span> {client.address.city} - {client.address.state}</p>
              </CardContent>
            </Card>

            {/* Outras Informações */}
            {client.notes && (
              <Card className="vf-surface-card vf-tone-clinical card-hover rounded-2xl border-border/80">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <FaStickyNote className="h-5 w-5 text-vf-clinical" /> Observações
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  <p>{client.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Coluna da Direita: Animais do Cliente */}
          <div className="col-span-1 lg:col-span-1">
            <Card className="vf-surface-card vf-tone-clinical card-hover rounded-2xl border-border/80">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaPaw className="h-5 w-5 text-vf-clinical" /> Animais de {client.name}
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      asChild
                      size="icon"
                      aria-label="Adicionar animal"
                      title="Adicionar animal"
                      className="rounded-md bg-[hsl(var(--vf-clinical))] font-semibold text-white transition-all duration-200 shadow-md hover:bg-[hsl(var(--vf-clinical)/0.9)] hover:shadow-lg"
                    >
                      <Link to={`/animals/add?clientId=${client.id}`}>
                        <FaPlus className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Adicionar Animal</p>
                  </TooltipContent>
                </Tooltip>
              </CardHeader>
              <CardContent className="pt-0">
                {client.animals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Espécie</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {client.animals.map((animal, index) => (
                          <TableRow key={animal.id} className={cn(index % 2 === 1 && "bg-muted/50")}>
                            <TableCell className="font-medium text-foreground">{animal.name}</TableCell>
                            <TableCell className="text-muted-foreground">{animal.species}</TableCell>
                            <TableCell className="text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Ver prontuário de ${animal.name}`}
                                    title={`Ver prontuário de ${animal.name}`}
                                    onClick={() => handleViewRecord(animal.id, animal.patientCode)}
                                    className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                                  >
                                    <FaEye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Ver Prontuário</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4">Nenhum animal cadastrado para este cliente.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default ClientDetailPage;