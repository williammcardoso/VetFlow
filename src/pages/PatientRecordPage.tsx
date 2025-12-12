"use client";

import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  FaArrowLeft, FaUsers, FaPaw, FaPlus, FaEye, FaStethoscope, FaCalendarAlt, FaDollarSign, FaSyringe, FaWeightHanging, FaFileAlt, FaClipboardList, FaCommentAlt, FaHeart, FaMale, FaUser, FaPrint, FaDownload, FaTimes, FaSave, FaBalanceScale, FaFileMedical, FaExclamationTriangle, FaFlask, FaTag, FaBox, FaClock, FaMoneyBillWave, FaArrowUp, FaArrowDown, FaTrashAlt, FaPrescriptionBottleAlt, FaEdit
} from "react-icons/fa"; // Importar ícones de react-icons
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { PrescriptionEntry } from "@/types/medication";
import { mockPrescriptions } from "@/mockData/prescriptions";
import { cn, formatDateTime } from "@/lib/utils"; // Importar formatDateTime
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Importar DropdownMenu
import { pdf } from "@react-pdf/renderer"; // Importar pdf para impressão
import { PrescriptionPdfContent } from "@/components/PrescriptionPdfContent"; // Importar o componente de conteúdo do PDF
// ADDED: Import do conteúdo de PDF do exame
import { ExamReportPdfContent } from "@/components/ExamReportPdfContent";
import { FinancialTransaction, mockFinancialTransactions } from "@/mockData/financial"; // Importar mock data financeiro
import { AppointmentEntry, BaseAppointmentDetails, ConsultationDetails } from "@/types/appointment"; // Importar a nova interface de atendimento
import { mockClients, updateAnimalDetails } from "@/mockData/clients"; // Importar o mock de clientes centralizado e updateAnimalDetails
import { Client, Animal, WeightEntry } from "@/types/client"; // Importar as interfaces Client, Animal e WeightEntry
import { mockAppointments } from "@/pages/AddAppointmentPage"; // Importar mockAppointments do AddAppointmentPage
import { ExamEntry, ExamReportData, HemogramReference, HemogramReferenceValue } from "@/types/exam"; // Importar a interface ExamEntry e ExamReportData, e as interfaces de referência
import { mockExams } from "@/mockData/exams";
import { hemogramReferences } from "@/constants/examReferences";

// Mock data para tipos de exame e veterinários
const mockExamTypes = [
  { id: "1", name: "Hemograma Completo" },
  { id: "2", name: "Exame de Fezes" },
  { id: "3", name: "Urinálise" },
  { id: "4", name: "Raio-X" },
];

const mockVets = [
  { id: "1", name: "Dr. Silva" },
  { id: "2", name: "Dra. Costa" },
  { id: "3", "name": "Dr. Souza" },
];

// Mock data para vacinas (apenas para exibição, não para gerenciamento completo)
const mockVaccines = [
  { id: "vac1", date: "2024-03-10", time: "11:00", type: "V8", nextDue: "2025-03-10", vet: "Dra. Costa" },
];

// Interface para eventos da linha do tempo
interface TimelineEvent {
  id: string;
  date: string;
  time: string; // Adicionado campo de hora
  type: 'Atendimento' | 'Exame' | 'Receita' | 'Peso' | 'Observação' | 'Venda' | 'Vacina' | 'Documento';
  description: string;
  icon: React.ElementType;
  link?: string; // Opcional, para navegar para detalhes
  badgeColor?: string; // Opcional, para customizar a cor do badge
}

// Helper function to calculate age
const calculateAge = (birthday: string) => {
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age > 0 ? `${age} ano(s)` : 'Menos de 1 ano';
};

const PatientRecordPage = () => {
  const { clientId, animalId } = useParams<{ clientId: string; animalId: string }>();
  const navigate = useNavigate();

  // Usar um estado para o cliente e animal para que possam ser atualizados
  const [currentClient, setCurrentClient] = useState<Client | undefined>(
    mockClients.find(c => c.id === clientId)
  );
  const [currentAnimal, setCurrentAnimal] = useState<Animal | undefined>(
    currentClient?.animals.find(a => a.id === animalId)
  );

  // Efeito para atualizar currentClient e currentAnimal quando mockClients muda
  useEffect(() => {
    const updatedClient = mockClients.find(c => c.id === clientId);
    setCurrentClient(updatedClient);
    setCurrentAnimal(updatedClient?.animals.find(a => a.id === animalId));
  }, [mockClients, clientId, animalId]); // Dependência em mockClients para re-renderizar quando ele é alterado

  // State para a aba ativa, com valor inicial do localStorage ou 'appointments'
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`patientRecordActiveTab-${animalId}`) || 'timeline'; // Default para timeline
    }
    return 'timeline';
  });

  // Efeito para salvar a aba ativa no localStorage sempre que ela mudar
  useEffect(() => {
    if (typeof window !== 'undefined' && animalId) {
      localStorage.setItem(`patientRecordActiveTab-${animalId}`, activeTab);
    }
  }, [activeTab, animalId]);

  // State para os atendimentos do animal
  const [animalAppointments, setAnimalAppointments] = useState<AppointmentEntry[]>(
    mockAppointments.filter(app => app.animalId === animalId)
  );
  
  // Use useEffect to update the state if mockAppointments changes (e.e., after a save)
  // This is a simple way to "refresh" the list when returning to the page.
  useEffect(() => {
    setAnimalAppointments(mockAppointments.filter(app => app.animalId === animalId));
  }, [mockAppointments, animalId]);


  // State para as novas abas
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>(currentAnimal?.weightHistory || []);
  const [newWeight, setNewWeight] = useState<string>("");
  const [newWeightDate, setNewWeightDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Atualizar weightHistory quando o animal mudar (ex: após edição ou adição de peso via atendimento)
  useEffect(() => {
    if (currentAnimal?.weightHistory) {
      setWeightHistory(currentAnimal.weightHistory);
    }
  }, [currentAnimal?.weightHistory]);


  const [documents, setDocuments] = useState<DocumentEntry[]>([
    { id: "d1", date: "2023-05-01", time: "10:00", name: "Termo de Adoção", fileUrl: "#" },
    { id: "d2", date: "2024-02-10", time: "14:30", name: "Autorização Cirúrgica", fileUrl: "#" },
  ]);
  const [newDocumentName, setNewDocumentName] = useState<string>("");
  const [newDocumentFile, setNewDocumentFile] = useState<File | null>(null);

  // A lista de prescrições aqui representa as receitas FINALIZADAS
  const [prescriptions, setPrescriptions] = useState<PrescriptionEntry[]>(mockPrescriptions);

  // Use useEffect to update the state if mockPrescriptions changes (e.e., after a save)
  // This is a simple way to "refresh" the list when returning to the page.
  useEffect(() => {
    setPrescriptions([...mockPrescriptions]); // Create a new array reference to trigger re-render
  }, [location.pathname]); // Re-run when the path changes (e.g., returning from add/edit page)


  const [observations, setObservations] = useState<ObservationEntry[]>([
    { id: "o1", date: "2023-09-20", time: "10:00", observation: "Animal apresentou melhora significativa após tratamento." },
    { id: "o2", date: "2024-01-05", time: "15:00", observation: "Recomendado check-up anual em 6 meses." },
  ]);
  const [newObservation, setNewObservation] = useState<string>("");

  // State para a lista de exames e o modal de adição
  const [examsList, setExamsList] = useState<ExamEntry[]>(mockExams.filter(exam => exam.id.startsWith('exam'))); // Inicialmente vazio, pois a adição é feita em outra página
  
  // Use useEffect to update the state if mockExams changes (e.e., after a save)
  useEffect(() => {
    setExamsList([...mockExams]); // Create a new array reference to trigger re-render
  }, [mockExams, animalId]); // Dependência em mockExams para re-renderizar quando ele é alterado


  // Filtrar transações financeiras relacionadas a este animal
  const animalFinancialTransactions = mockFinancialTransactions.filter(
    (t) =>
      t.relatedAnimalId === animalId &&
      !(t.type === 'income' && t.category === 'Venda de Produtos') // EXCLUI vendas para não duplicar com a aba Vendas
  );

  // Filtrar transações de vendas relacionadas a este animal
  const animalSalesTransactions = mockFinancialTransactions.filter(
    (t) => t.relatedAnimalId === animalId && t.type === 'income' && t.category === 'Venda de Produtos'
  );


  if (!currentClient || !currentAnimal) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">Animal ou Cliente não encontrado.</h1>
        <Link to="/clients">
          <Button variant="outline" className="bg-card border border-border text-foreground hover:bg-muted rounded-md transition-all duration-200 shadow-sm hover:shadow-md">
            <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Clientes
          </Button>
        </Link>
      </div>
    );
  }

  // Handlers para as novas funcionalidades
  const handleAddWeight = () => {
    if (newWeight.trim() && newWeightDate) {
      const now = new Date();
      const newEntry: WeightEntry = {
        id: `wh-${Date.now()}`,
        date: newWeightDate,
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        weight: parseFloat(newWeight),
        source: "Manual", // Origem manual
      };
      // Usar a função updateAnimalDetails para adicionar ao histórico e atualizar o peso atual
      const success = updateAnimalDetails(clientId, animalId, {
        weight: parseFloat(newWeight),
        lastWeightSource: "Manual",
      });

      if (success) {
        setNewWeight("");
        setNewWeightDate(new Date().toISOString().split('T')[0]);
        toast.success("Peso adicionado ao histórico!");
        // O useEffect que observa mockClients se encarregará de atualizar currentAnimal e weightHistory
      } else {
        toast.error("Erro ao adicionar peso.");
      }
    }
  };

  const handleAddDocument = () => {
    if (newDocumentName.trim() && newDocumentFile) {
      const now = new Date();
      // In a real application, you would upload the file and get a URL
      const newEntry: DocumentEntry = {
        id: String(documents.length + 1),
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        name: newDocumentName.trim(),
        fileUrl: URL.createObjectURL(newDocumentFile), // Placeholder URL
      };
      setDocuments([...documents, newEntry]);
      setNewDocumentName("");
      setNewDocumentFile(null);
      toast.success("Anexo adicionado!");
    }
  };

  const handleAddObservation = () => {
    if (newObservation.trim()) {
      const now = new Date();
      const newEntry: ObservationEntry = {
        id: String(observations.length + 1),
        date: now.toISOString().split('T')[0], // Usar a data atual para a observação
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        observation: newObservation.trim(),
      };
      setObservations([...observations, newEntry]);
      setNewObservation("");
    }
  };

  // Handlers para Atendimentos (atualizados para a nova página)
  const handleAddAppointmentClick = () => {
    navigate(`/clients/${clientId}/animals/${animalId}/add-appointment`);
  };

  const handleViewAppointmentClick = (appointment: AppointmentEntry) => {
    navigate(`/clients/${clientId}/animals/${animalId}/view-appointment/${appointment.id}`);
  };

  const handleDeleteAppointment = (id: string) => {
    // Remove from mockAppointments directly
    const index = mockAppointments.findIndex(app => app.id === id);
    if (index > -1) {
      mockAppointments.splice(index, 1);
      setAnimalAppointments(mockAppointments.filter(app => app.animalId === animalId)); // Update local state
      toast.info("Atendimento excluído.");
    }
  };

  const handleEditAnimal = () => {
    navigate(`/clients/${clientId}/animals/${animalId}/edit`);
  };

  const handlePrintSinglePrescription = async (rx: PrescriptionEntry) => {
    if (!currentClient || !currentAnimal) {
      toast.error("Erro: Dados do cliente ou animal não disponíveis para impressão.");
      return;
    }

    const blob = await pdf(
      PrescriptionPdfContent({
        animalName: currentAnimal.name,
        animalId: currentAnimal.id,
        animalSpecies: currentAnimal.species,
        tutorName: currentClient.name,
        tutorAddress: currentClient.address.street + ", " + currentClient.address.number + " - " + currentClient.address.city + " - " + currentClient.address.state,
        medications: rx.medications || [], // Passar array vazio se for manipulada
        generalObservations: rx.instructions,
        showElectronicSignatureText: false,
        prescriptionType: rx.type,
        pharmacistName: "Farmacêutico(a) Responsável", // Mock data for pharmacist
        pharmacistCpf: "CPF: 000.000.000-00",
        pharmacistCfr: "CRF: 00000",
        pharmacistAddress: "Endereço da Farmácia, 000 - Cidade - UF",
        pharmacistPhone: "Telefone: (00) 00000-0000",
        manipulatedPrescription: rx.manipulatedPrescription, // Passar dados da manipulada
      })
    ).toBlob();

    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    URL.revokeObjectURL(url);
    toast.success("Receita enviada para impressão!");
  };

  const handlePrintExam = async (exam: ExamEntry) => {
    if (!currentClient || !currentAnimal) {
      toast.error("Erro: Dados do cliente ou animal não disponíveis para impressão.");
      return;
    }

    const tutorAddress = `${currentClient.address.street}, ${currentClient.address.number} - ${currentClient.address.city} - ${currentClient.address.state}`;

    const blob = await pdf(
      <ExamReportPdfContent
        animalName={currentAnimal.name}
        animalId={currentAnimal.id}
        animalSpecies={currentAnimal.species}
        tutorName={currentClient.name}
        tutorAddress={tutorAddress}
        exam={exam}
        hemogramReferences={hemogramReferences}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    URL.revokeObjectURL(url);
    toast.success("Laudo de exame enviado para impressão!");
  };

  const handleEditExam = (examId: string) => {
    // UPDATED: Navegar para a página de edição de exame
    navigate(`/clients/${clientId}/animals/${animalId}/edit-exam/${examId}`);
  };


  // Lógica para a Linha do Tempo
  const allTimelineEvents: TimelineEvent[] = [];

  // Adicionar Atendimentos
  animalAppointments.forEach(app => {
    const appDetails = app.details as BaseAppointmentDetails;
    const description = appDetails.suspeitaDiagnostica || appDetails.condutaTratamento || app.observacoesGerais || `Atendimento de ${app.type}`;
    allTimelineEvents.push({
      id: `app-${app.id}`,
      date: app.date,
      time: app.time,
      type: 'Atendimento',
      description: `${app.type}: ${description}`,
      icon: FaStethoscope,
      link: `/clients/${clientId}/animals/${animalId}/view-appointment/${app.id}`,
      badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    });
  });

  // Adicionar Exames
  examsList.forEach(exam => {
    allTimelineEvents.push({
      id: `exam-${exam.id}`,
      date: exam.date,
      time: exam.time,
      type: 'Exame',
      description: `${exam.type}: ${exam.result || 'Ver detalhes'}`,
      icon: FaFlask,
      // link: `/clients/${clientId}/animals/${animalId}/view-exam/${exam.id}`, // Se houver uma página de visualização de exame
      badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    });
  });

  // Adicionar Receitas
  prescriptions.forEach(rx => {
    const description = rx.treatmentDescription || rx.medicationName || "Receita sem descrição";
    let badgeColor = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (rx.type === 'controlled') badgeColor = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    if (rx.type === 'manipulated') badgeColor = "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";

    allTimelineEvents.push({
      id: `rx-${rx.id}`,
      date: rx.date,
      time: rx.time,
      type: 'Receita',
      description: `${rx.type === 'simple' ? 'Receita Simples' : rx.type === 'controlled' ? 'Receita Controlada' : 'Receita Manipulada'}: ${description}`,
      icon: FaPrescriptionBottleAlt,
      link: `/clients/${clientId}/animals/${animalId}/edit-prescription/${rx.id}?type=${rx.type}`,
      badgeColor: badgeColor,
    });
  });

  // Adicionar Pesos
  weightHistory.forEach(entry => {
    allTimelineEvents.push({
      id: `weight-${entry.id}`,
      date: entry.date,
      time: entry.time,
      type: 'Peso',
      description: `Peso registrado: ${entry.weight.toFixed(1)} kg (${entry.source})`,
      icon: FaWeightHanging,
      badgeColor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    });
  });

  // Adicionar Observações
  observations.forEach(obs => {
    allTimelineEvents.push({
      id: `obs-${obs.id}`,
      date: obs.date,
      time: obs.time,
      type: 'Observação',
      description: `Observação: ${obs.observation}`,
      icon: FaCommentAlt,
      badgeColor: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    });
  });

  // Adicionar Vendas
  animalSalesTransactions.forEach(sale => {
    allTimelineEvents.push({
      id: `sale-${sale.id}`,
      date: sale.date,
      time: sale.time,
      type: 'Venda',
      description: `Venda: ${sale.description} (R$ ${sale.amount.toFixed(2).replace('.', ',')})`,
      icon: FaDollarSign,
      badgeColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    });
  });

  // Adicionar Vacinas (mockadas)
  mockVaccines.forEach(vaccine => {
    allTimelineEvents.push({
      id: `vaccine-${vaccine.id}`,
      date: vaccine.date,
      time: vaccine.time,
      type: 'Vacina',
      description: `Vacina ${vaccine.type} aplicada. Próxima dose: ${formatDateTime(vaccine.nextDue)}`,
      icon: FaSyringe,
      badgeColor: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
    });
  });

  // Adicionar Documentos
  documents.forEach(doc => {
    allTimelineEvents.push({
      id: `doc-${doc.id}`,
      date: doc.date,
      time: doc.time,
      type: 'Documento',
      description: `Documento: ${doc.name}`,
      icon: FaFileAlt,
      link: doc.fileUrl,
      badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    });
  });


  // Ordenar todos os eventos por data (mais recente primeiro)
  const sortedTimelineEvents = allTimelineEvents.sort((a, b) => {
    const dateTimeA = new Date(`${a.date}T${a.time}`);
    const dateTimeB = new Date(`${b.date}T${b.time}`);
    return dateTimeB.getTime() - dateTimeA.getTime();
  });


  // Totais dinâmicos para o resumo no cabeçalho
  const totalAppointments = animalAppointments.length;
  const totalIncome = mockFinancialTransactions
    .filter((t) => t.relatedAnimalId === animalId && t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header da Página com Gradiente e Breadcrumb */}
      <div className="bg-gradient-to-r from-background via-card to-background p-6 pb-4 border-b border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-4 sm:gap-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground group">
                <FaUser className="h-5 w-5 text-muted-foreground" /> Prontuário Consolidado
              </h1>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Visão completa do histórico médico
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground transition-colors duration-200">
              <FaPrint className="mr-2 h-4 w-4" /> Imprimir
            </Button>
            <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground transition-colors duration-200">
              <FaDownload className="mr-2 h-4 w-4" /> Exportar PDF
            </Button>
            <Link to={`/clients/${currentClient.id}`}>
              <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground transition-colors duration-200">
                <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para {currentClient.name}
              </Button>
            </Link>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Painel &gt; <Link to="/clients" className="hover:text-primary">Clientes</Link> &gt; <Link to={`/clients/${currentClient.id}`} className="hover:text-primary">{currentClient.name}</Link> &gt; {currentAnimal.name}
        </p>
      </div>

      <div className="flex-1 p-6">
        <div className="mb-6">
          <Card className="bg-card shadow-sm border border-border rounded-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <FaHeart className="h-5 w-5 text-primary" /> Informações do Paciente
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleEditAnimal} className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground transition-colors duration-200">
                <FaEdit className="mr-2 h-4 w-4" /> Editar Animal
              </Button>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-0">
              {/* Coluna 1: Animal Info & Details */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    {/* Usar FaPaw como fallback para o avatar do animal */}
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                      <FaPaw className="h-6 w-6 text-white" /> {/* Adicionado text-white explicitamente */}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xl font-bold text-foreground">{currentAnimal.name}</p>
                    <p className="text-sm text-muted-foreground">{currentAnimal.species} • {currentAnimal.breed}</p>
                  </div>
                </div>
                <Badge className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium w-fit",
                  currentAnimal.status === 'Ativo' ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                )}>
                  {currentAnimal.status}
                </Badge>
                <div className="grid grid-cols-2 gap-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="h-4 w-4 text-muted-foreground" />
                    <p>Idade: <span className="font-normal text-foreground">{calculateAge(currentAnimal.birthday)}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaBalanceScale className="h-4 w-4 text-muted-foreground" />
                    <p>Peso: <span className="font-normal text-foreground">{currentAnimal.weight.toFixed(1)} kg</span> {currentAnimal.lastWeightSource && <span className="text-xs italic">({currentAnimal.lastWeightSource})</span>}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentAnimal.gender === "Macho" ? <FaMale className="h-4 w-4 text-muted-foreground" /> : <FaUser className="h-4 w-4 text-muted-foreground" />}
                    <p>Sexo: <span className="font-normal text-foreground">{currentAnimal.gender}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="h-4 w-4 text-muted-foreground" />
                    <p>Última consulta: <span className="font-normal text-foreground">{formatDateTime(currentAnimal.lastConsultationDate || '')}</span></p>
                  </div>
                </div>
              </div>

              {/* Coluna 2: Tutor e Financeiro */}
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-base font-semibold text-foreground mb-1">Tutor Responsável</p>
                  <p className="text-sm text-muted-foreground">Nome: <span className="font-normal text-foreground">{currentClient.name}</span></p>
                  <p className="text-sm text-muted-foreground">Telefone: <span className="font-normal text-foreground">{currentClient.mainPhoneContact}</span></p>
                </div>
                <div className="bg-muted/50 dark:bg-muted/30 p-3 rounded-md border border-border">
                  <p className="text-base font-semibold text-foreground mb-1">Resumo Financeiro</p>
                  <p className="text-sm text-muted-foreground">Total de atendimentos: <span className="font-normal text-foreground">{totalAppointments}</span></p>
                  <p className="text-sm text-muted-foreground">Receitas: <span className="font-normal text-foreground">R$ {totalIncome.toFixed(2).replace('.', ',')}</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 h-auto flex-wrap bg-card shadow-sm border border-border rounded-md p-2">
            <TabsTrigger value="timeline" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors duration-200 text-muted-foreground data-[state=active]:dark:bg-primary flex items-center">
              <FaClock className="h-4 w-4 mr-2" /> <span className="whitespace-nowrap">Linha do Tempo</span>
            </TabsTrigger>
            <TabsTrigger value="appointments" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors duration-200 text-muted-foreground data-[state=active]:dark:bg-primary flex items-center">
              <FaStethoscope className="h-4 w-4 mr-2" /> <span className="whitespace-nowrap">Atendimento</span>
            </TabsTrigger>
            <TabsTrigger value="exams" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors duration-200 text-muted-foreground data-[state=active]:dark:bg-primary flex items-center">
              <FaFlask className="h-4 w-4 mr-2" /> <span className="whitespace-nowrap">Exames</span>
            </TabsTrigger>
            <TabsTrigger value="sales" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors duration-200 text-muted-foreground data-[state=active]:dark:bg-primary flex items-center">
              <FaDollarSign className="h-4 w-4 mr-2" /> <span className="whitespace-nowrap">Vendas</span>
            </TabsTrigger>
            <TabsTrigger value="vaccines" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors duration-200 text-muted-foreground data-[state=active]:dark:bg-primary flex items-center">
              <FaSyringe className="h-4 w-4 mr-2" /> <span className="whitespace-nowrap">Vacinas</span>
            </TabsTrigger>
            <TabsTrigger value="weight" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors duration-200 text-muted-foreground data-[state=active]:dark:bg-primary flex items-center">
              <FaWeightHanging className="h-4 w-4 mr-2" /> <span className="whitespace-nowrap">Peso</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors duration-200 text-muted-foreground data-[state=active]:dark:bg-primary flex items-center">
              <FaFileAlt className="h-4 w-4 mr-2" /> <span className="whitespace-nowrap">Documentos</span>
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors duration-200 text-muted-foreground data-[state=active]:dark:bg-primary flex items-center">
              <FaPrescriptionBottleAlt className="h-4 w-4 mr-2" /> <span className="whitespace-nowrap">Receitas</span>
            </TabsTrigger>
            <TabsTrigger value="observations" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors duration-200 text-muted-foreground data-[state=active]:dark:bg-primary flex items-center">
              <FaCommentAlt className="h-4 w-4 mr-2" /> <span className="whitespace-nowrap">Observações</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors duration-200 text-muted-foreground data-[state=active]:dark:bg-primary flex items-center">
              <FaMoneyBillWave className="h-4 w-4 mr-2" /> <span className="whitespace-nowrap">Financeiro</span>
            </TabsTrigger>
          </TabsList>

          {/* Nova Aba: Linha do Tempo */}
          <TabsContent value="timeline" className="mt-4">
            <Card className="bg-card shadow-sm border border-border rounded-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaClock className="h-5 w-5 text-primary" /> Linha do Tempo do Paciente
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {sortedTimelineEvents.length > 0 ? (
                  <div className="space-y-4">
                    {sortedTimelineEvents.map((event) => (
                      <Card key={event.id} className="p-4 bg-input shadow-sm border border-border">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2">
                            {React.createElement(event.icon, { className: "h-4 w-4 text-muted-foreground" })}
                            <Badge className={cn(
                              "px-2 py-0.5 text-xs font-medium rounded-full",
                              event.badgeColor || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                            )}>
                              {event.type}
                            </Badge>
                            <p className="text-lg font-semibold text-foreground">
                              {event.description}
                            </p>
                          </div>
                          {event.link && (
                            <Link to={event.link}>
                              <Button variant="ghost" size="icon" className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200">
                                <FaEye className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <FaCalendarAlt className="h-3 w-3" /> {formatDateTime(event.date, event.time)}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4">Nenhum evento registrado para este paciente.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="mt-4">
            <Card className="bg-card shadow-sm border border-border rounded-md">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaStethoscope className="h-5 w-5 text-primary" /> Histórico de Atendimentos
                </CardTitle>
                <Button size="sm" onClick={handleAddAppointmentClick} className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
                  <FaPlus className="h-4 w-4 mr-2" /> Adicionar Atendimento
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {animalAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {animalAppointments.map((app) => {
                      const appDetails = app.details as BaseAppointmentDetails; // Cast para BaseAppointmentDetails
                      const displaySummary = appDetails.suspeitaDiagnostica || appDetails.condutaTratamento || app.observacoesGerais || "Sem descrição detalhada.";
                      const retornoInfo = appDetails.retornoRecomendadoEmDias ? `Retorno em ${appDetails.retornoRecomendadoEmDias} dias.` : '';

                      return (
                        <Card key={app.id} className="p-4 bg-input shadow-sm border border-border">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                            <div className="flex items-center gap-2">
                              <Badge className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                {app.type}
                              </Badge>
                              <p className="text-lg font-semibold text-foreground">
                                {displaySummary}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleViewAppointmentClick(app)} className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200">
                                <FaEye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteAppointment(app.id)} className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200">
                                <FaTrashAlt className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <FaCalendarAlt className="h-3 w-3" /> {formatDateTime(app.date, app.time)}
                            </div>
                            <div className="flex items-center gap-1">
                              <FaStethoscope className="h-3 w-3" /> {app.vet}
                            </div>
                            {retornoInfo && (
                              <div className="flex items-center gap-1 col-span-full">
                                <FaClock className="h-3 w-3" /> {retornoInfo}
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4">Nenhum atendimento registrado.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exams" className="mt-4">
            <Card className="bg-card shadow-sm border border-border rounded-md">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaFlask className="h-5 w-5 text-primary" /> Histórico de Exames
                </CardTitle>
                <Link to={`/clients/${clientId}/animals/${animalId}/add-exam`}>
                  <Button size="sm" className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
                    <FaPlus className="h-4 w-4 mr-2" /> Adicionar Exame
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="pt-0">
                {examsList.length > 0 ? (
                  <div className="space-y-4">
                    {examsList.map((exam) => (
                      <Card key={exam.id} className="p-4 bg-input shadow-sm border border-border">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2">
                            <Badge className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                              {exam.type}
                            </Badge>
                            <p className="text-lg font-semibold text-foreground">
                              {exam.type === "Hemograma Completo" ? "Hemograma Completo" : exam.result || "Ver detalhes"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handlePrintExam(exam)} className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200">
                              <FaPrint className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEditExam(exam.id)} className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200">
                              <FaEdit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <FaCalendarAlt className="h-3 w-3" /> {formatDateTime(exam.date, exam.time)}
                          </div>
                          <div className="flex items-center gap-1">
                            <FaStethoscope className="h-3 w-3" /> {exam.vet}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4">Nenhum exame registrado.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="mt-4">
            <Card className="bg-card shadow-sm border border-border rounded-md">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaDollarSign className="h-5 w-5 text-primary" /> Histórico de Vendas
                </CardTitle>
                <Button size="sm" className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
                  <FaPlus className="h-4 w-4 mr-2" /> Adicionar Venda
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {animalSalesTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {animalSalesTransactions.map((sale) => (
                      <Card key={sale.id} className="p-4 bg-input shadow-sm border border-border">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2">
                            <Badge className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {sale.category}
                            </Badge>
                            <p className="text-lg font-semibold text-foreground">
                              {sale.description}
                            </p>
                          </div>
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">
                            R$ {sale.amount.toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <FaCalendarAlt className="h-3 w-3" /> {formatDateTime(sale.date, sale.time)}
                          </div>
                          {/* <div className="flex items-center gap-1">
                            <FaBox className="h-3 w-3" /> Quantidade: {sale.quantity}
                          </div> */}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4">Nenhuma venda registrada.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vaccines" className="mt-4">
            <Card className="bg-card shadow-sm border border-border rounded-md">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaSyringe className="h-5 w-5 text-primary" /> Histórico de Vacinas
                </CardTitle>
                <Button size="sm" className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
                  <FaPlus className="h-4 w-4 mr-2" /> Adicionar Vacina
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {mockVaccines.length > 0 ? (
                  <div className="space-y-4">
                    {mockVaccines.map((vaccine) => (
                      <Card key={vaccine.id} className="p-4 bg-input shadow-sm border border-border">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2">
                            <Badge className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              {vaccine.type}
                            </Badge>
                            <p className="text-lg font-semibold text-foreground">
                              Próxima Dose: {formatDateTime(vaccine.nextDue)}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200">
                            <FaEye className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <FaCalendarAlt className="h-3 w-3" /> {formatDateTime(vaccine.date, vaccine.time)}
                          </div>
                          <div className="flex items-center gap-1">
                            <FaStethoscope className="h-3 w-3" /> {vaccine.vet}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4">Nenhuma vacina registrada.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nova aba: Peso */}
          <TabsContent value="weight" className="mt-4">
            <Card className="bg-card shadow-sm border border-border rounded-md">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaWeightHanging className="h-5 w-5 text-primary" /> Histórico de Peso
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <Input
                    type="date"
                    value={newWeightDate}
                    onChange={(e) => setNewWeightDate(e.target.value)}
                    className="w-full sm:w-[150px] bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                  />
                  <Input
                    type="number"
                    placeholder="Peso (kg)"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="w-full sm:w-[120px] bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                  />
                  <Button size="sm" onClick={handleAddWeight} disabled={!newWeight.trim()} className="w-full sm:w-auto rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
                    <FaPlus className="h-4 w-4 mr-2" /> Adicionar Peso
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {weightHistory.length > 0 ? (
                  <div className="space-y-4">
                    {weightHistory.map((entry) => (
                      <Card key={entry.id} className="p-4 bg-input shadow-sm border border-border">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2">
                            <FaWeightHanging className="h-4 w-4 text-muted-foreground" />
                            <p className="text-lg font-semibold text-foreground">
                              {entry.weight.toFixed(2)} kg
                            </p>
                          </div>
                          {/* Ações para peso, se houver */}
                          <Button variant="ghost" size="icon" className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200">
                            <FaEye className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <FaCalendarAlt className="h-3 w-3" /> {formatDateTime(entry.date, entry.time)} {entry.source && <span className="text-xs italic">({entry.source})</span>}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4">Nenhum registro de peso.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nova aba: Documentos */}
          <TabsContent value="documents" className="mt-4">
            <Card className="bg-card shadow-sm border border-border rounded-md">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaFileAlt className="h-5 w-5 text-primary" /> Documentos
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center flex-wrap">
                  <Input
                    type="text"
                    placeholder="Nome do Documento"
                    value={newDocumentName}
                    onChange={(e) => setNewDocumentName(e.target.value)}
                    className="w-full sm:w-[200px] bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                  />
                  <Input
                    type="file"
                    onChange={(e) => setNewDocumentFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full sm:w-[200px] bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                  />
                  <Button size="sm" onClick={handleAddDocument} disabled={!newDocumentName || !newDocumentFile} className="w-full sm:w-auto rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
                    <FaPlus className="h-4 w-4 mr-2" /> Adicionar Documento
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {documents.length > 0 ? (
                  <div className="space-y-4">
                    {documents.map((doc) => (
                      <Card key={doc.id} className="p-4 bg-input shadow-sm border border-border">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2">
                            <FaFileAlt className="h-4 w-4 text-muted-foreground" />
                            <p className="text-lg font-semibold text-foreground">
                              {doc.name}
                            </p>
                          </div>
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200">
                              <FaEye className="h-4 w-4" />
                            </Button>
                          </a>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <FaCalendarAlt className="h-3 w-3" /> {formatDateTime(doc.date, doc.time)}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4">Nenhum documento registrado.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nova aba: Receitas */}
          <TabsContent value="prescriptions" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Card para Receita Simples */}
              <Link to={`/clients/${clientId}/animals/${animalId}/add-prescription?type=simple`}>
                <Card className="flex flex-col items-center justify-center p-6 text-center bg-card shadow-sm border border-border rounded-md h-full">
                  <FaFileMedical className="h-12 w-12 text-primary mb-3" />
                  <CardTitle className="text-lg font-semibold text-foreground">Receita Simples</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Medicamentos de uso comum</p>
                </Card>
              </Link>

              {/* Card para Receita Controlada */}
              <Link to={`/clients/${clientId}/animals/${animalId}/add-prescription?type=controlled`}>
                <Card className="flex flex-col items-center justify-center p-6 text-center bg-card shadow-sm border border-border rounded-md h-full">
                  <FaExclamationTriangle className="h-12 w-12 text-destructive mb-3" />
                  <CardTitle className="text-lg font-semibold text-foreground">Receita Controlada</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Medicamentos controlados</p>
                </Card>
              </Link>

              {/* Card para Receita Manipulada */}
              <Link to={`/clients/${clientId}/animals/${animalId}/add-prescription?type=manipulated`}>
                <Card className="flex flex-col items-center justify-center p-6 text-center bg-card shadow-sm border border-border rounded-md h-full">
                  <FaFlask className="h-12 w-12 text-accent mb-3" />
                  <CardTitle className="text-lg font-semibold text-foreground">Receita Manipulada</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Medicamentos manipulados</p>
                </Card>
              </Link>
            </div>

            <Card className="bg-card shadow-sm border border-border rounded-md">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaPrescriptionBottleAlt className="h-5 w-5 text-primary" /> Prescrições Recentes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {prescriptions.length > 0 ? (
                  <div className="space-y-4">
                    {prescriptions.map((rx) => (
                      <Card key={rx.id} className="p-4 bg-input shadow-sm border border-border">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2">
                            <Badge className={cn(
                              "px-2 py-0.5 text-xs font-medium rounded-full",
                              rx.type === 'simple' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                              rx.type === 'controlled' && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                              rx.type === 'manipulated' && "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                            )}>
                              {rx.type === 'simple' ? 'Receita Simples' : rx.type === 'controlled' ? 'Controlada' : 'Manipulada'}
                            </Badge>
                            <p className="text-lg font-semibold text-foreground">
                              {rx.treatmentDescription || "Receita sem descrição"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handlePrintSinglePrescription(rx)} className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200">
                              <FaPrint className="h-4 w-4" />
                            </Button>
                            <Link to={`/clients/${clientId}/animals/${animalId}/edit-prescription/${rx.id}?type=${rx.type}`}> {/* Adicionado ?type=${rx.type} */}
                              <Button variant="ghost" size="icon" className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200">
                                <FaEye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <FaCalendarAlt className="h-3 w-3" /> {formatDateTime(rx.date, rx.time)}
                          </div>
                          <div className="flex items-center gap-1">
                            <FaStethoscope className="h-3 w-3" /> Dr. William Cardoso {/* Placeholder para o veterinário */}
                          </div>
                          <div className="flex items-center gap-1 col-span-full">
                            <FaClipboardList className="h-3 w-3" /> {rx.type === 'manipulated' ? (rx.manipulatedPrescription?.formulaComponents?.length || 0) : (rx.medications?.length || 0)} medicamento(s)
                          </div>
                        </div>
                        {rx.medicationName && (
                          <p className="text-sm text-foreground bg-muted/50 dark:bg-muted/30 p-3 rounded-md border border-border">
                            Medicamentos: {rx.medicationName}
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-4 py-4">Nenhuma receita registrada.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nova aba: Observações */}
          <TabsContent value="observations" className="mt-4">
            <Card className="bg-card shadow-sm border border-border rounded-md">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaCommentAlt className="h-5 w-5 text-primary" /> Observações Gerais
                </CardTitle>
                <Button size="sm" onClick={handleAddObservation} disabled={!newObservation.trim()} className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
                    <FaPlus className="h-4 w-4 mr-2" /> Adicionar Observação
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mb-4">
                  <Textarea
                    placeholder="Adicione uma nova observação..."
                    value={newObservation}
                    onChange={(e) => setNewObservation(e.target.value)}
                    className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                  />
                </div>
                {observations.length > 0 ? (
                  <div className="space-y-4">
                    {observations.map((obs) => (
                      <Card key={obs.id} className="p-4 bg-input shadow-sm border border-border">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2">
                            <FaCommentAlt className="h-4 w-4 text-muted-foreground" />
                            <p className="text-lg font-semibold text-foreground">
                              {obs.observation}
                            </p>
                          </div>
                          {/* Ações para observação, se houver */}
                          <Button variant="ghost" size="icon" className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200">
                            <FaEye className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <FaCalendarAlt className="h-3 w-3" /> {formatDateTime(obs.date, obs.time)}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4">Nenhuma observação registrada.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nova aba: Financeiro */}
          <TabsContent value="financial" className="mt-4">
            <Card className="bg-card shadow-sm border border-border rounded-md">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaMoneyBillWave className="h-5 w-5 text-primary" /> Histórico Financeiro
                </CardTitle>
                <Button size="sm" className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
                  <FaPlus className="h-4 w-4 mr-2" /> Adicionar Lançamento
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {animalFinancialTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {animalFinancialTransactions.map((transaction) => (
                      <Card key={transaction.id} className="p-4 bg-input shadow-sm border border-border">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2">
                            <Badge className={cn(
                              "px-2 py-0.5 text-xs font-medium rounded-full",
                              transaction.type === 'income' ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            )}>
                              {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                            </Badge>
                            <p className="text-lg font-semibold text-foreground">
                              {transaction.description}
                            </p>
                          </div>
                          <div className={cn(
                            "flex items-center gap-1 text-lg font-bold",
                            transaction.type === 'income' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          )}>
                            {transaction.type === 'income' ? <FaArrowUp className="h-4 w-4" /> : <FaArrowDown className="h-4 w-4" />}
                            R$ {transaction.amount.toFixed(2).replace('.', ',')}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <FaCalendarAlt className="h-3 w-3" /> {formatDateTime(transaction.date, transaction.time)}
                          </div>
                          <div className="flex items-center gap-1">
                            <FaTag className="h-3 w-3" /> Categoria: {transaction.category}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4">Nenhum lançamento financeiro registrado para este animal.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PatientRecordPage;