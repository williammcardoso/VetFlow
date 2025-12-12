import React from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUsers, FaPaw, FaPlus, FaEye, FaEdit, FaEnvelope, FaPhone, FaMapMarkerAlt, FaIdCard, FaBirthdayCake, FaBriefcase, FaWhatsapp, FaSms, FaStickyNote } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Client } from "@/types/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useClientWithAnimals } from "@/hooks/useSupabaseClients";
import { mockClients as fallbackMockClients } from "@/mockData/clients";

const ClientDetailPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const { data: dbClient, isLoading, isError } = useClientWithAnimals(clientId);
  const client: Client | undefined = isError || !dbClient ? fallbackMockClients.find(c => c.id === clientId) : dbClient;

  if (isLoading && !client) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">Carregando...</h1>
        <p className="text-muted-foreground">Buscando dados do cliente.</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">Cliente não encontrado.</h1>
        <Link to="/clients">
          <Button variant="outline" className="bg-card border border-border text-foreground hover:bg-muted rounded-md transition-all duration-200 shadow-sm hover:shadow-md">
            <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Clientes
          </Button>
        </Link>
      </div>
    );
  }

  const handleViewRecord = (animalId: string) => {
    navigate(`/clients/${clientId}/animals/${animalId}/record`);
  };

  const handleEditClient = () => {
    navigate(`/clients/${clientId}/edit`);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header da Página com Gradiente e Breadcrumb */}
      <div className="bg-gradient-to-r from-background via-card to-background p-6 pb-4 border-b border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-4 sm:gap-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground group">
                <FaUsers className="h-5 w-5 text-muted-foreground" /> Detalhes do Cliente: {client.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Visualize as informações do responsável e seus animais.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleEditClient} className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground transition-colors duration-200">
              <FaEdit className="mr-2 h-4 w-4" /> Editar Cliente
            </Button>
            <Link to="/clients">
              <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground transition-colors duration-200">
                <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Clientes
              </Button>
            </Link>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Painel &gt; <Link to="/clients" className="hover:text-primary">Clientes</Link> &gt; {client.name}
        </p>
      </div>

      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4 max-w-5xl mx-auto">
          {/* Coluna da Esquerda: Informações do Tutor */}
          <div className="col-span-1 lg:col-span-2 space-y-4">
            {/* Informações Gerais */}
            <Card className="bg-card shadow-sm border border-border rounded-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaUsers className="h-5 w-5 text-primary" /> Informações Gerais
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-y-3 pt-0 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Tipo:</span> {client.clientType === "physical" ? "Pessoa Física" : "Pessoa Jurídica"}</p>
                <p><span className="font-medium text-foreground">Nacionalidade:</span> {client.nationality === "brazilian" ? "Brasileira" : client.nationality}</p>
                {client.gender && <p><span className="font-medium text-foreground">Sexo:</span> {client.gender}</p>}
                <p><span className="font-medium text-foreground">{client.clientType === "physical" ? "CPF" : "CNPJ"}:</span> {client.identificationNumber}</p>
                <p><span className="font-medium text-foreground">{client.clientType === "physical" ? "RG" : "Inscrição Estadual"}:</span> {client.secondaryIdentification}</p>
                {client.birthday && <p><span className="font-medium text-foreground">Aniversário:</span> {formatDate(client.birthday)}</p>}
                {client.profession && <p><span className="font-medium text-foreground">Profissão:</span> {client.profession}</p>}
              </CardContent>
            </Card>

            {/* Contatos */}
            <Card className="bg-card shadow-sm border border-border rounded-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaPhone className="h-5 w-5 text-primary" /> Contatos
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
            <Card className="bg-card shadow-sm border border-border rounded-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaMapMarkerAlt className="h-5 w-5 text-primary" /> Endereço
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
              <Card className="bg-card shadow-sm border border-border rounded-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <FaStickyNote className="h-5 w-5 text-primary" /> Observações
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
            <Card className="bg-card shadow-sm border border-border rounded-md">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaPaw className="h-5 w-5 text-primary" /> Animais de {client.name}
                </CardTitle>
                <Link to={`/animals/add?clientId=${client.id}`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
                        <FaPlus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Adicionar Animal</p>
                    </TooltipContent>
                  </Tooltip>
                </Link>
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
                                  <Button variant="ghost" size="icon" onClick={() => handleViewRecord(animal.id)} className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200">
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
    </div>
  );
};

export default ClientDetailPage;