"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft, FaPaw, FaPlus, FaEye, FaStethoscope, FaCalendarAlt, 
  FaSyringe, FaWeightHanging, FaFileAlt, FaCommentAlt, FaMale, 
  FaPrint, FaTrashAlt, FaPrescriptionBottleAlt, FaEdit, FaIdCard, FaPhone,
  FaMapMarkerAlt, FaFlask, FaTag, FaClock, FaMoneyBillWave, FaDollarSign,
  FaExclamationTriangle,
  FaArrowUp, FaArrowDown
} from "react-icons/fa";
import { FaChevronDown, FaChevronUp, FaEllipsisV } from "react-icons/fa";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { cn, formatDateTime } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { mockClients, updateAnimalDetails } from "@/mockData/clients";
import { Client, Animal, WeightEntry } from "@/types/client";
import { mockAppointments } from "@/mockData/appointments";
import { mockUserSettings } from "@/mockData/settings";
import { Calendar, UserRound, AlertCircle, BadgeDollarSign } from "lucide-react";
import PatientAppointmentsTab from "@/components/patient/appointments/PatientAppointmentsTab";
import PatientVaccinesTab from "@/components/patient/vaccines/PatientVaccinesTab";

// Interfaces
interface ObservationEntry {
  id: string;
  date: string;
  time: string;
  observation: string;
  displayAsAlert?: boolean;
}

interface DocumentEntry {
  id: string;
  date: string;
  time: string;
  name: string;
  fileUrl: string;
}

const PatientRecordPage = () => {
  const { clientId, animalId } = useParams<{ clientId: string; animalId: string }>();
  const navigate = useNavigate();

  const [currentClient, setCurrentClient] = useState<Client | undefined>(
    mockClients.find(c => c.id === clientId)
  );
  const [currentAnimal, setCurrentAnimal] = useState<Animal | undefined>(
    currentClient?.animals.find(a => a.id === animalId)
  );

  useEffect(() => {
    const updatedClient = mockClients.find(c => c.id === clientId);
    setCurrentClient(updatedClient);
    setCurrentAnimal(updatedClient?.animals.find(a => a.id === animalId));
  }, [clientId, animalId]);

  const [activeTab, setActiveTab] = useState<string>('timeline');

  const [animalAppointments, setAnimalAppointments] = useState(
    mockAppointments.filter(app => app.animalId === animalId)
  );

  const vaccineAppointmentsCount = useMemo(
    () => animalAppointments.filter((a) => a.type === "Vacina").length,
    [animalAppointments]
  );

  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>(currentAnimal?.weightHistory || []);
  const [newWeight, setNewWeight] = useState<string>("");
  const [newWeightDate, setNewWeightDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (currentAnimal?.weightHistory) {
      setWeightHistory(currentAnimal.weightHistory);
    }
  }, [currentAnimal?.weightHistory]);

  const sortedWeightHistory = useMemo(() => {
    return [...weightHistory].sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
      const db = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
      return db - da;
    });
  }, [weightHistory]);

  // Documentos
  const [documents, setDocuments] = useState<DocumentEntry[]>([
    { id: "d1", date: "2023-05-01", time: "10:00", name: "Termo de Adoção", fileUrl: "#" },
    { id: "d2", date: "2024-02-10", time: "14:30", name: "Autorização Cirúrgica", fileUrl: "#" },
  ]);
  const [newDocumentName, setNewDocumentName] = useState<string>("");
  const [newDocumentFile, setNewDocumentFile] = useState<File | null>(null);

  // Observações
  const [observations, setObservations] = useState<ObservationEntry[]>([
    { id: "o1", date: "2023-09-20", time: "10:00", observation: "Animal apresentou melhora significativa após tratamento." },
    { id: "o2", date: "2024-01-05", time: "15:00", observation: "Recomendado check-up anual em 6 meses." },
  ]);
  const [newObservation, setNewObservation] = useState<string>("");
  const [newObservationAlert, setNewObservationAlert] = useState<boolean>(false);
  const isObservationEmpty = !newObservation || newObservation.trim().length === 0;

  const sortedObservations = useMemo(() => {
    return [...observations].sort(
      (a, b) =>
        new Date(`${b.date}T${b.time || "00:00"}`).getTime() -
        new Date(`${a.date}T${a.time || "00:00"}`).getTime()
    );
  }, [observations]);

  const alertObservations = useMemo(
    () => sortedObservations.filter((o) => !!o.displayAsAlert),
    [sortedObservations]
  );

  // Modal states
  const [isTutorExpanded, setIsTutorExpanded] = useState(false);
  const [documentEditOpen, setDocumentEditOpen] = useState(false);
  const [documentEditing, setDocumentEditing] = useState<DocumentEntry | null>(null);
  const [documentEditName, setDocumentEditName] = useState<string>("");
  const [documentDeleteId, setDocumentDeleteId] = useState<string | null>(null);
  const [observationModalOpen, setObservationModalOpen] = useState(false);
  const [selectedObservation, setSelectedObservation] = useState<ObservationEntry | null>(null);
  const [observationEditOpen, setObservationEditOpen] = useState(false);
  const [observationEditText, setObservationEditText] = useState<string>("");
  const [observationEditAlert, setObservationEditAlert] = useState<boolean>(false);
  const [observationDeleteId, setObservationDeleteId] = useState<string | null>(null);

  // Venda sem estado
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [saleAppointmentId, setSaleAppointmentId] = useState<string>("");
  const [saleResponsible, setSaleResponsible] = useState<string>("");
  const [saleStatusLocal, setSaleStatusLocal] = useState<"open" | "finalized">("open");

  // Navegar para edição do animal
  const handleEditAnimal = () => {
    navigate(`/clients/${clientId}/animals/${animalId}/edit`);
  };

  if (!currentClient || !currentAnimal) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">Animal ou Cliente não encontrado.</h1>
        <Link to="/clients">
          <Button variant="outline">
            <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Clientes
          </Button>
        </Link>
      </div>
    );
  }

  const formatAgeLabel = (birthday?: string) => {
    if (!birthday) return "-";
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    if (age <= 0) return "Menos de 1 ano";
    return age === 1 ? "1 ano" : `${age} anos`;
  };

  const formatWeightLabel = (weight?: number) => {
    if (weight === undefined || weight === null || isNaN(Number(weight))) return "-";
    const text = Number(weight).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
    return `${text} kg`;
  };

  return (
    <div className="flex flex-col min-h-screen layered-bg-warm overflow-x-hidden">
      {/* CABEÇALHO DO PRONTUÁRIO */}
      <div className="mx-auto w-full max-w-7xl px-5 pt-4 pb-3">
        <Card className="rounded-xl border border-border/60 bg-white px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 flex items-center justify-center">
                  <FaFileAlt className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl leading-tight font-semibold text-foreground">
                    Prontuário Consolidado
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Visão completa do histórico clínico
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg">
                    <FaEllipsisV className="h-4 w-4" />
                    <span className="sr-only">Ações</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => window.print()}>
                    <FaPrint className="mr-2 h-4 w-4" /> Imprimir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link to={`/clients/${currentClient.id}`}>
                <Button variant="ghost" className="h-8 rounded-lg px-2">
                  <FaArrowLeft className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Voltar</span>
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex-1 p-6 mx-auto w-full max-w-7xl">
        {/* CARD DO PACIENTE */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="h-12 w-12 rounded-2xl bg-[rgb(240,253,248)] text-[rgb(5,150,105)] ring-1 ring-[rgba(5,150,105,0.12)] flex items-center justify-center">
                  <FaPaw className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl sm:text-[1.9rem] leading-tight font-semibold tracking-tight">
                      {currentAnimal.name}
                    </h2>
                    {alertObservations.map((o) => (
                      <span
                        key={o.id}
                        className="inline-flex items-center rounded-full border border-red-300 bg-red-50 px-3 py-1 text-[11px] font-extrabold tracking-widest text-red-700 uppercase"
                        title={o.observation}
                      >
                        • {o.observation.trim().toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEditAnimal}
                className="h-9 w-9 rounded-lg"
              >
                <FaEdit className="h-4 w-4" />
                <span className="sr-only">Editar paciente</span>
              </Button>
            </div>

            {/* CHIPS DO PACIENTE */}
            <div className="mt-4 flex flex-wrap gap-2 max-h-[3.4rem] overflow-hidden">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-[12px] leading-5">
                <FaPaw className="h-3 w-3 text-teal-600" />
                <span className="text-muted-foreground">Espécie:</span>
                <span className="font-semibold text-foreground">{currentAnimal.species || "-"}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-[12px] leading-5">
                <FaTag className="h-3 w-3 text-violet-600" />
                <span className="text-muted-foreground">Raça:</span>
                <span className="font-semibold text-foreground">{currentAnimal.breed || "-"}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-[12px] leading-5">
                <FaMale className="h-3 w-3 text-amber-600" />
                <span className="text-muted-foreground">Sexo:</span>
                <span className="font-semibold text-foreground">{currentAnimal.gender || "-"}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-[12px] leading-5">
                <FaClock className="h-3 w-3 text-emerald-600" />
                <span className="text-muted-foreground">Idade:</span>
                <span className="font-semibold text-foreground">{formatAgeLabel(currentAnimal.birthday)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-[12px] leading-5">
                <FaWeightHanging className="h-3 w-3 text-emerald-600" />
                <span className="text-muted-foreground">Peso:</span>
                <span className="font-semibold text-foreground">{formatWeightLabel(currentAnimal.weight)}</span>
              </span>
            </div>

            {/* Tutor */}
            <div className="mt-4 rounded-xl border border-border bg-white">
              <Collapsible open={isTutorExpanded} onOpenChange={setIsTutorExpanded}>
                <div className="p-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-200/60 flex items-center justify-center shrink-0">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold text-foreground">Tutor</div>
                      <div className="mt-0.5 text-[15px] text-foreground/90 font-medium truncate">
                        {currentClient.name}
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <FaPhone className="h-3.5 w-3.5 text-sky-600" />
                          <span className="truncate">
                            <span className="text-foreground/70 font-medium">Telefone:</span>{" "}
                            <span className="text-foreground/90">{currentClient.mainPhoneContact || "-"}</span>
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <FaMapMarkerAlt className="mt-0.5 h-3.5 w-3.5 text-sky-600" />
                          <span className="line-clamp-1">
                            <span className="text-foreground/70 font-medium">Endereço:</span>{" "}
                            <span className="text-foreground/90">
                              {currentClient.address?.street ? `${currentClient.address.street}, ${currentClient.address.number}` : "-"}
                              {currentClient.address?.city ? ` • ${currentClient.address.city}` : ""}
                              {currentClient.address?.state ? ` - ${currentClient.address.state}` : ""}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="h-8 px-2 rounded-lg">
                      <span className="text-xs">{isTutorExpanded ? "Menos" : "Mais"}</span>
                      {isTutorExpanded ? (
                        <FaChevronUp className="ml-2 h-3.5 w-3.5" />
                      ) : (
                        <FaChevronDown className="ml-2 h-3.5 w-3.5" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </Collapsible>
            </div>
          </CardContent>
        </Card>

        {/* ABAS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full gap-1.5 rounded-xl border border-border/60 bg-white p-1.5">
            <TabsTrigger value="timeline" className="sm:col-span-1 w-full justify-between gap-2 rounded-lg px-3 py-2 text-[13px] md:text-sm font-medium">
              <span className="flex items-center gap-2 min-w-0">
                <FaClock className="h-4 w-4 text-amber-600" />
                <span className="truncate">Linha do Tempo</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="appointments" className="sm:col-span-1 w-full justify-between gap-2 rounded-lg px-3 py-2 text-[13px] md:text-sm font-medium">
              <span className="flex items-center gap-2 min-w-0">
                <FaStethoscope className="h-4 w-4 text-teal-600" />
                <span className="truncate">Atendimento</span>
              </span>
              <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">
                {animalAppointments.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="weight" className="sm:col-span-1 w-full justify-between gap-2 rounded-lg px-3 py-2 text-[13px] md:text-sm font-medium">
              <span className="flex items-center gap-2 min-w-0">
                <FaWeightHanging className="h-4 w-4 text-emerald-600" />
                <span className="truncate">Peso</span>
              </span>
              <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">
                {weightHistory.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="sm:col-span-1 w-full justify-between gap-2 rounded-lg px-3 py-2 text-[13px] md:text-sm font-medium">
              <span className="flex items-center gap-2 min-w-0">
                <FaFileAlt className="h-4 w-4 text-slate-600" />
                <span className="truncate">Documentos</span>
              </span>
              <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">
                {documents.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="observations" className="sm:col-span-2 w-full justify-between gap-2 rounded-lg px-3 py-2 text-[13px] md:text-sm font-medium">
              <span className="flex items-center gap-2 min-w-0">
                <FaCommentAlt className="h-4 w-4 text-rose-600" />
                <span className="truncate">Observações</span>
              </span>
              <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">
                {observations.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <FaClock className="h-4 w-4 text-muted-foreground" /> Linha do Tempo
                </CardTitle>
                <p className="text-sm text-muted-foreground">Eventos clínicos em ordem cronológica</p>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground py-4">Funcionalidade em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="mt-4">
            <PatientAppointmentsTab
              clientId={clientId!}
              animalId={animalId!}
              animalAppointments={animalAppointments}
              setAnimalAppointments={setAnimalAppointments}
            />
          </TabsContent>

          <TabsContent value="weight" className="mt-4">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <FaWeightHanging className="h-5 w-5 text-primary" /> Histórico de Peso
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <Input
                    type="date"
                    value={newWeightDate}
                    onChange={(e) => setNewWeightDate(e.target.value)}
                    className="w-full sm:w-[150px]"
                  />
                  <Input
                    type="number"
                    placeholder="Peso (kg)"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="w-full sm:w-[120px]"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newWeight.trim() && newWeightDate) {
                        const success = updateAnimalDetails(clientId!, animalId!, {
                          weight: parseFloat(newWeight),
                          lastWeightSource: "Manual",
                        }, { date: newWeightDate, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) });
                        if (success) {
                          setNewWeight("");
                          setNewWeightDate(new Date().toISOString().split('T')[0]);
                          toast.success("Peso adicionado ao histórico!");
                        } else {
                          toast.error("Erro ao adicionar peso.");
                        }
                      }
                    }}
                    disabled={!newWeight.trim()}
                  >
                    <FaPlus className="h-4 w-4 mr-2" /> Adicionar Peso
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {sortedWeightHistory.length > 0 ? (
                  <div className="space-y-3">
                    {sortedWeightHistory.map((entry, idx) => {
                      const prevEntry = sortedWeightHistory[idx + 1];
                      const weightDiff = prevEntry ? entry.weight - prevEntry.weight : 0;
                      const isIncrease = weightDiff > 0;
                      const isDecrease = weightDiff < 0;
                      const diffPercent = prevEntry ? ((weightDiff / prevEntry.weight) * 100).toFixed(1) : "0";

                      return (
                        <div key={entry.id} className="rounded-xl border bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="h-12 w-12 shrink-0 rounded-2xl bg-emerald-50/70 flex items-center justify-center">
                                <FaWeightHanging className="h-6 w-6 text-emerald-600" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-base font-bold text-emerald-900">
                                  <span>{entry.weight.toFixed(2)} kg</span>
                                  {prevEntry && (
                                    <div className="flex items-center gap-1 text-xs font-medium">
                                      {isIncrease ? (
                                        <div className="flex items-center gap-0.5 text-emerald-600">
                                          <FaArrowUp className="h-3 w-3" />
                                          <span>+{diffPercent}%</span>
                                        </div>
                                      ) : isDecrease ? (
                                        <div className="flex items-center gap-0.5 text-rose-600">
                                          <FaArrowDown className="h-3 w-3" />
                                          <span>{diffPercent}%</span>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">0%</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="mt-1 text-sm text-muted-foreground leading-relaxed">
                                  {entry.source || "-"}
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                  <span className="inline-flex items-center gap-1.5 text-foreground/80 font-medium">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    {formatDateTime(entry.date, entry.time)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4">Nenhum registro de peso.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <FaFileAlt className="h-5 w-5 text-primary" /> Documentos
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center flex-wrap">
                  <Input
                    type="text"
                    placeholder="Nome do Documento"
                    value={newDocumentName}
                    onChange={(e) => setNewDocumentName(e.target.value)}
                    className="w-full sm:w-[200px]"
                  />
                  <Input
                    type="file"
                    onChange={(e) => setNewDocumentFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full sm:w-[200px]"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newDocumentName.trim() && newDocumentFile) {
                        const now = new Date();
                        const newEntry: DocumentEntry = {
                          id: String(documents.length + 1),
                          date: now.toISOString().split('T')[0],
                          time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                          name: newDocumentName.trim(),
                          fileUrl: URL.createObjectURL(newDocumentFile),
                        };
                        setDocuments([...documents, newEntry]);
                        setNewDocumentName("");
                        setNewDocumentFile(null);
                        toast.success("Anexo adicionado!");
                      }
                    }}
                    disabled={!newDocumentName || !newDocumentFile}
                  >
                    <FaPlus className="h-4 w-4 mr-2" /> Adicionar Documento
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {documents.length > 0 ? (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="rounded-xl border bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="h-12 w-12 shrink-0 rounded-2xl bg-slate-50/70 flex items-center justify-center">
                              <FaFileAlt className="h-6 w-6 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                                <span className="truncate">{doc.name}</span>
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                <span className="inline-flex items-center gap-1.5 text-foreground/80 font-medium">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {formatDateTime(doc.date, doc.time)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon">
                              <FaEye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <FaEdit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDocumentDeleteId(doc.id)}>
                              <FaTrashAlt className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4">Nenhum documento registrado.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="observations" className="mt-4">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <FaCommentAlt className="h-5 w-5 text-primary" /> Observações Gerais
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => {
                    if (newObservation.trim()) {
                      const now = new Date();
                      const newEntry: ObservationEntry = {
                        id: String(observations.length + 1),
                        date: now.toISOString().split('T')[0],
                        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                        observation: newObservation.trim(),
                        displayAsAlert: newObservationAlert,
                      };
                      setObservations([...observations, newEntry]);
                      setNewObservation("");
                      setNewObservationAlert(false);
                    }
                  }}
                  disabled={isObservationEmpty}
                >
                  <FaPlus className="h-4 w-4 mr-2" /> Adicionar Observação
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mb-4 space-y-3">
                  <Textarea
                    placeholder="Adicione uma nova observação..."
                    value={newObservation ?? ""}
                    onChange={(e) => setNewObservation(e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-sm text-[#374151]">
                    <Checkbox checked={newObservationAlert} onCheckedChange={(v) => setNewObservationAlert(!!v)} />
                    Exibir como Alerta no Prontuário
                  </label>
                </div>

                {sortedObservations.length > 0 ? (
                  <div className="space-y-3">
                    {sortedObservations.map((obs) => (
                      <div key={obs.id} className="rounded-xl border bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="h-12 w-12 shrink-0 rounded-2xl bg-slate-50/70 flex items-center justify-center">
                              <FaCommentAlt className="h-6 w-6 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {obs.displayAsAlert && (
                                  <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-extrabold tracking-widest text-red-800">
                                    ALERTA
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">{formatDateTime(obs.date, obs.time)}</span>
                              </div>
                              <div className="mt-2 text-[15px] sm:text-base font-semibold leading-snug">
                                {obs.observation}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon">
                              <FaEye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <FaEdit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setObservationDeleteId(obs.id)}>
                              <FaTrashAlt className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4">Nenhuma observação registrada.</p>
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