"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import {
  FaArrowLeft, FaUsers, FaPaw, FaPlus, FaEye, FaStethoscope, FaCalendarAlt, FaDollarSign, FaSyringe, FaWeightHanging, FaFileAlt, FaClipboardList, FaCommentAlt, FaHeart, FaMale, FaUser, FaPrint, FaDownload, FaTimes, FaSave, FaBalanceScale, FaFileMedical, FaExclamationTriangle, FaFlask, FaTag, FaBox, FaClock, FaMoneyBillWave, FaArrowUp, FaArrowDown, FaTrashAlt, FaPrescriptionBottleAlt, FaEdit, FaIdCard, FaPhone, FaFileSignature, FaCopy
} from "react-icons/fa";
import { SiWhatsapp } from "react-icons/si";
import { FaMapMarkerAlt } from "react-icons/fa";
import { FaChevronDown, FaChevronUp, FaEllipsisV } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import WeightInput from "@/components/inputs/WeightInput";
import DocumentTimeline from "@/components/DocumentTimeline";
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
import { toast } from "sonner";
import { PrescriptionEntry } from "@/types/medication";
import { cn, formatAgeLong, formatCurrencyBRL, formatDateBRForFileName, formatDateTime, formatItemQty, getTodayLocalISO, parseLocalDate, slugifyFileName } from "@/lib/utils";
import { DeceasedBadge, isDeceased } from "@/components/clients/clientVisuals";
import { displayAppointmentType } from "@/lib/appointmentDisplay";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { FinancialTransaction } from "@/mockData/financial";
import { AppointmentEntry, BaseAppointmentDetails } from "@/types/appointment";
import { updateAnimalDetails, getWeightHistory } from "@/lib/clientsApi";
import { Client, Animal, WeightEntry } from "@/types/client";
import { ExamEntry } from "@/types/exam";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { useAppointments } from "@/hooks/useAppointments";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { useExams } from "@/hooks/useExams";
// Gráfico de evolução: a biblioteca de gráficos só desce se o card aparecer.
const ExamTrendCard = React.lazy(() => import("@/components/patient/exams/ExamTrendCard"));
import { useCatalog } from "@/hooks/useCatalog";
import { useRegistryList } from "@/hooks/useRegistryList";
import * as financialApi from "@/lib/financialApi";
import { fulfillSaleLines } from "@/lib/saleFulfillment";
import { fetchHemogramReferences } from "@/constants/examReferences";
import { customExamSummary, examDisplayName } from "@/lib/customExam";
import { SentBadge } from "@/components/SentBadge";

// Selo "Enviado N×": no celular vai na linha da data (à direita); do sm em
// diante fica no canto inferior direito do cartão, na altura dessa linha —
// sem criar linha extra.
const SENT_BADGE_POS = "ml-auto sm:absolute sm:bottom-[18px] sm:right-4 sm:ml-0";
import type { SendTrack } from "@/lib/sendLog";
import { mockCompanySettings } from "@/mockData/settings";
import AutocompleteSelect from "@/components/AutocompleteSelect";
import CurrencyInput from "@/components/CurrencyInput";
import type { ExamRequestPdfData } from "@/components/ExamRequestPdfContent";
import PatientDocumentSignDialog from "@/components/PatientDocumentSignDialog";
import { getPatientDocumentSignatures } from "@/lib/patientDocumentSignatureApi";
import { EXAM_REQUEST_MARKER } from "@/lib/examRequestMarker";
import { replaceTemplateVariables } from "@/utils/templateReplacements";
import { getPatientDisplayId, getPatientSubPath } from "@/utils/patientDisplayId";
import PatientAppointmentsTab from "@/components/patient/appointments/PatientAppointmentsTab";
import PatientVaccinesTab from "@/components/patient/vaccines/PatientVaccinesTab";
import AISuggestionsView from "@/components/AISuggestionsView";
import { buildContextFromExams, fetchExamInterpretation, stripMarkdownForPlainText, type ChatMessage } from "@/lib/examInterpretation";
import { useAnimalSchedules } from "@/hooks/useSchedules";
import {
  Circle as CircleIcon,
  FileText as FileTextIcon,
  FlaskConical as FlaskConicalIcon,
  Stethoscope as StethoscopeIcon,
  Syringe as SyringeIcon,
  AlertTriangle as AlertTriangleIcon,
  CalendarClock as CalendarClockIcon,
  CheckCircle2,
  AlertCircle,
  BadgeDollarSign,
  UserRound,
  Sparkles,
  Loader2,
  MoreHorizontal,
  Plus,
  Undo2,
} from "lucide-react";
import { Calendar } from "lucide-react";
import SaleDetailModal from "@/components/SaleDetailModal";
import CancelSaleDialog from "@/components/CancelSaleDialog";
import DeleteSaleDialog from "@/components/DeleteSaleDialog";
import { PaymentChoice } from "@/components/sales/PaymentChoice";
import { ReceivePaymentDialog } from "@/components/sales/ReceivePaymentDialog";
import { ConvertBudgetDialog } from "@/components/sales/ConvertBudgetDialog";
import { SaleStatusBadge } from "@/components/sales/SaleStatusBadge";
import { budgetTotal as budgetNegotiatedTotal } from "@/lib/budgetConversion";
import {
  buildSaleObservations,
  isReceiptOfSale,
  nowTimeHHMM,
  parseSaleObservations,
  receiptMethodsBySale,
  receiveSalePayment,
  saleBalance,
  saleStatus,
  summarizeSaleItems,
  toCents,
  type PayMode,
} from "@/lib/salePayment";
import { AdjustmentLines, PriceAdjustmentFields, usePriceAdjustments } from "@/components/sales/PriceAdjustments";
import { IconChip, PaymentMethodBadge } from "@/components/finance/FinanceUI";
import { CONCEPTS, SALE_STATUS_VISUAL, TONES, categoryVisual, type Concept, type Tone } from "@/components/finance/financeTheme";

import {
  readPatientDocuments,
  // writePatientDocuments is not used in the Supabase-backed implementation
  removePatientDocument,
  type PatientDocumentEntry,
} from "@/lib/documentsApi";
import { useClientWithAnimals, useAnimalRefByPatientCode } from "@/hooks/useSupabaseClients";
import { useQueryClient } from "@tanstack/react-query";
import { renderPdf, downloadPdf, openPdf } from "@/lib/pdfExport";
import { sendPdfViaWhatsApp as sendPdfViaWhatsAppShared, openWhatsAppChat } from "@/lib/whatsappShare";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useObservations } from "@/hooks/useObservations";
import * as observationsApi from "@/lib/observationsApi";
import type { ObservationEntry } from "@/lib/observationsApi";
import * as budgetsApi from "@/lib/budgetsApi";
import type { Budget } from "@/mockData/budgets";

// Interface para eventos da linha do tempo
interface TimelineEvent {
  id: string;
  date: string;
  time: string;
  type: 'Atendimento' | 'Agendamento' | 'Exame' | 'Receita' | 'Peso' | 'Observação' | 'Venda' | 'Vacina' | 'Documento';
  description: string;
  icon: React.ElementType;
  link?: string;
  badgeColor?: string;
  summary?: string;
  author?: string;
  isAlert?: boolean;
  /** Só em eventos 'Agendamento' — status atual (schedules.status), pra
   *  destacar visualmente um agendamento cancelado na timeline. */
  scheduleStatus?: string;
}

// Helper function to calculate age
const calculateAge = (birthday: string) => {
  const birthDate = parseLocalDate(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age > 0 ? `${age} ano(s)` : 'Menos de 1 ano';
};

// Item em edição nos formulários de venda/orçamento (carrinho antes de salvar).
type SaleItemMeta = { itemId: string; name: string; type: "product" | "service"; qty: number; unitPrice: number };

// Vínculo venda ↔ atendimento: buildSaleObservations/parseSaleObservations (lib/salePayment).

// Helper para identidade visual por tipo de evento
const EVENT_STYLES: Record<string, { dot: string; badge: string }> = {
  'Atendimento': { dot: 'timeline-dot-clinical', badge: 'badge-soft-clinical' },
  'Agendamento': { dot: 'timeline-dot-blue', badge: 'badge-soft-blue' },        // Azul — diferente do Atendimento (clínico)
  'Exame': { dot: 'timeline-dot-clinical-strong', badge: 'badge-soft-clinical-strong' },
  'Receita': { dot: 'timeline-dot-green', badge: 'badge-soft-green' },          // Verde base
  'Peso': { dot: 'timeline-dot-amber', badge: 'badge-soft-amber' },             // Mantém como está
  'Vacina': { dot: 'timeline-dot-teal', badge: 'badge-soft-teal' },             // Azul/ciano (diferente de Atendimento)
  'Venda': { dot: 'timeline-dot-teal', badge: 'badge-soft-teal' },              // Verde-água/azul-petróleo
  'Financeiro': { dot: 'timeline-dot-teal', badge: 'badge-soft-teal' },
  'Documento': { dot: 'timeline-dot-slate', badge: 'badge-soft-slate' },        // Cinza neutro
  'Observação': { dot: 'timeline-dot-gray', badge: 'badge-soft-gray' },         // Cinza discreto
};
const getEventStyle = (type: string) => EVENT_STYLES[type] || { dot: 'timeline-dot-gray', badge: 'badge-soft-gray' };

// Classe do ícone por tipo
const getEventIconClass = (type: string) => {
  switch (type) {
    case 'Atendimento': return 'icon-soft-teal';
    case 'Agendamento': return 'icon-soft-blue';
    case 'Exame': return 'icon-soft-teal';
    case 'Receita': return 'icon-soft-green';
    case 'Peso': return 'icon-soft-amber';
    case 'Vacina': return 'icon-soft-teal';
    case 'Venda':
    case 'Financeiro': return 'icon-soft-teal';
    case 'Documento': return 'icon-soft-slate';
    case 'Observação': return 'icon-soft-gray';
    default: return 'icon-soft-gray';
  }
};

// Rótulo em pt-BR pro status do agendamento (schedules.status) — mesmos
// rótulos usados em StatusBadge.tsx (Agenda/Dashboard), pra ficar consistente
// em toda a tela quando o vet muda o status por lá e volta pro prontuário.
const SCHEDULE_STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendado",
  in_progress: "Em atendimento",
  attended: "Atendido",
  no_show: "Não atendido",
  cancelled: "Cancelado",
};


/**
 * Documentos "Pedido de Exame" carregam os dados estruturados num comentário
 * HTML no início do content (ver AddExamRequestPage) — se achar, usamos o PDF
 * dedicado (visual premium) em vez do conversor HTML->PDF genérico.
 */
function extractExamRequestData(content: string): ExamRequestPdfData | null {
  const match = content.match(new RegExp(`^<!--${EXAM_REQUEST_MARKER}:([\\s\\S]*?)-->`));
  if (!match) return null;
  try {
    return JSON.parse(match[1].replace(/--\\>/g, "-->")) as ExamRequestPdfData;
  } catch {
    return null;
  }
}

const PatientRecordPage = () => {
  const {
    clientId: clientIdParam,
    animalId: animalIdParam,
    patientCode: patientCodeParam,
  } = useParams<{ clientId?: string; animalId?: string; patientCode?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Rota curta /prontuario/:patientCode — resolve clientId/animalId a partir
  // do código do paciente para não depender dos dois UUIDs na URL.
  const parsedPatientCode = patientCodeParam ? Number(patientCodeParam) : undefined;
  const {
    data: animalRef,
    isLoading: isAnimalRefLoading,
    isError: isAnimalRefError,
    error: animalRefError,
  } = useAnimalRefByPatientCode(parsedPatientCode);
  const clientId = clientIdParam || animalRef?.clientId;
  const animalId = animalIdParam || animalRef?.animalId;

  const { transactions: mockFinancialTransactions, refetch: refetchFinancial } = useFinancialTransactions();
  // `skipWhenNoAnimalId`: na rota curta /prontuario/:patientCode, animalId
  // fica undefined por pelo menos 1 render enquanto useAnimalRefByPatientCode
  // resolve — sem essa opção, o hook caía no fallback de "todos os
  // atendimentos da clínica" (bug real: prontuário mostrando dados de outros
  // pacientes até a busca certa voltar).
  const { appointments: animalAppointmentsFromHook, refetch: refetchAppointments } = useAppointments(animalId, { skipWhenNoAnimalId: true });
  const { schedules: animalSchedules, refetch: refetchSchedules } = useAnimalSchedules(animalId);
  const { prescriptions: prescriptionsFromHook, refetch: refetchPrescriptions } = usePrescriptions(animalId);
  const { exams: examsFromHook, refetch: refetchExams } = useExams(animalId);
  const { items: catalogItemsFromHook, refetch: refetchCatalog } = useCatalog();
  const { list: pmRegistry } = useRegistryList("paymentMethods");

  const { data: clientData, isLoading: isClientLoading, isError: isClientError, error: clientError } = useClientWithAnimals(clientId);
  const { profile: currentUserProfile } = useCurrentUserProfile();
  const { canAccessModule } = useAuth();
  const currentClient: Client | undefined = clientData ?? undefined;
  const currentAnimal: Animal | undefined = useMemo(
    () => clientData?.animals.find((a) => a.id === animalId),
    [clientData, animalId]
  );
  // Gera link curto (/prontuario/:patientCode/...) sempre que o animal já
  // tem patient_code, senão cai pra rota longa — mesmo padrão de
  // getPatientRecordPath, só que pras telas "de baixo" do prontuário.
  const subPath = useCallback(
    (suffix: string) => getPatientSubPath(clientId ?? "", animalId ?? "", currentAnimal?.patientCode, suffix),
    [clientId, animalId, currentAnimal?.patientCode]
  );
  const currentVetName =
    currentUserProfile?.signature_text?.trim() ||
    currentUserProfile?.full_name?.trim() ||
    currentUserProfile?.email?.trim() ||
    "Profissional não informado";
  const canEditPrescriptions = canAccessModule("prescriptions", "edit");

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`patientRecordActiveTab-${animalId}`) || 'timeline';
    }
    return 'timeline';
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && animalId) {
      localStorage.setItem(`patientRecordActiveTab-${animalId}`, activeTab);
    }
  }, [activeTab, animalId]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "documents") {
      setActiveTab("documents");
      (async () => {
        const list = await readPatientDocuments(animalId);
        setDocuments(list);
      })();
    }
  }, [searchParams, animalId]);

  const animalAppointments = animalAppointmentsFromHook;

  const vaccineAppointmentsCount = useMemo(
    () => animalAppointments.filter((a) => a.type === "Vacina").length,
    [animalAppointments]
  );

  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [newWeight, setNewWeight] = useState<number | "">("");
  const [newWeightDate, setNewWeightDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Histórico real (patient_weight_entries) — antes vinha sempre vazio de
  // currentAnimal.weightHistory (nunca era persistido, só a tela fingia
  // que tinha sido salvo até o próximo reload).
  const refetchWeightHistory = useCallback(async () => {
    if (!animalId) return;
    setWeightHistory(await getWeightHistory(animalId));
  }, [animalId]);

  // Limpa assim que o animalId muda — sem isso, o peso do prontuário
  // anterior ficava visível até a busca nova voltar (SPA não remonta o
  // componente ao trocar de paciente).
  useEffect(() => {
    setWeightHistory([]);
  }, [animalId]);

  useEffect(() => {
    void refetchWeightHistory();
  }, [refetchWeightHistory]);

  const sortedWeightHistory = useMemo(() => {
    return [...weightHistory].sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
      const db = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
      return db - da;
    });
  }, [weightHistory]);

  const [documents, setDocuments] = useState<PatientDocumentEntry[]>([]);

  // Limpa assim que o animalId muda, antes da busca nova — sem isso,
  // documentos do prontuário anterior ficavam visíveis até a busca nova
  // voltar (SPA não remonta o componente ao trocar de paciente).
  useEffect(() => {
    setDocuments([]);
  }, [animalId]);

  useEffect(() => {
    (async () => {
      const list = await readPatientDocuments(animalId);
      setDocuments(list);
    })();
  }, [animalId]);

  const [documentDeleteId, setDocumentDeleteId] = useState<string | null>(null);
  const [signDocTarget, setSignDocTarget] = useState<PatientDocumentEntry | null>(null);

  const prescriptions = prescriptionsFromHook;

  const sortedPrescriptions = useMemo(() => {
    return [...prescriptions].sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
      const db = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
      return db - da;
    });
  }, [prescriptions]);

  const { observations, refetch: refetchObservations } = useObservations(animalId);
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

  const examsList = examsFromHook;

  // --- Interpretação de IA sobre exames já lançados (aba Exames) — pega
  // atendimento relacionado + exames escolhidos + observação, monta o
  // contexto e manda pro assistente. Diferente do assistente do atendimento
  // (AppointmentForm.tsx), que trabalha com anamnese/exame físico.
  const [examInterpOpen, setExamInterpOpen] = useState(false);
  const [examInterpAppointmentId, setExamInterpAppointmentId] = useState<string>("none");
  const [examInterpExamIds, setExamInterpExamIds] = useState<Set<string>>(new Set());
  const [examInterpObservation, setExamInterpObservation] = useState("");
  const [examInterpLoading, setExamInterpLoading] = useState(false);
  // Mensagem [0] é o contexto montado automaticamente (dados dos exames),
  // nunca renderizada como "pergunta" — a partir daí alterna resposta da IA
  // e pergunta de acompanhamento, pra dar pra tirar dúvida sobre a
  // interpretação já gerada em vez de cada geração ficar isolada.
  const [examInterpMessages, setExamInterpMessages] = useState<ChatMessage[]>([]);
  const [examInterpFollowUp, setExamInterpFollowUp] = useState("");
  const [examInterpError, setExamInterpError] = useState<string | null>(null);
  const [examInterpSaving, setExamInterpSaving] = useState(false);

  const openExamInterpretation = () => {
    setExamInterpAppointmentId("none");
    setExamInterpExamIds(new Set());
    setExamInterpObservation("");
    setExamInterpMessages([]);
    setExamInterpFollowUp("");
    setExamInterpError(null);
    setExamInterpOpen(true);
  };

  const toggleExamInterpExam = (examId: string) => {
    setExamInterpExamIds((prev) => {
      const next = new Set(prev);
      if (next.has(examId)) next.delete(examId);
      else next.add(examId);
      return next;
    });
  };

  const handleGenerateExamInterpretation = async () => {
    const chosenExams = examsList.filter((e) => examInterpExamIds.has(e.id));
    if (chosenExams.length === 0) {
      toast.error("Escolha pelo menos um exame.");
      return;
    }
    setExamInterpLoading(true);
    setExamInterpError(null);
    try {
      const appointment = examInterpAppointmentId !== "none"
        ? animalAppointments.find((a) => a.id === examInterpAppointmentId)
        : undefined;
      const hemogramRefs = await fetchHemogramReferences();
      const context = buildContextFromExams(
        chosenExams,
        appointment,
        examInterpObservation,
        { name: currentAnimal?.name, species: currentAnimal?.species },
        hemogramRefs
      );
      const initialMessages: ChatMessage[] = [{ role: "user", content: context }];
      const result = await fetchExamInterpretation(initialMessages);
      if (result.ok) {
        setExamInterpMessages([...initialMessages, { role: "assistant", content: result.text }]);
      } else {
        setExamInterpError(result.error);
      }
    } finally {
      setExamInterpLoading(false);
    }
  };

  const handleExamInterpFollowUp = async () => {
    const question = examInterpFollowUp.trim();
    if (!question || examInterpLoading) return;
    setExamInterpError(null);
    setExamInterpLoading(true);
    const nextMessages: ChatMessage[] = [...examInterpMessages, { role: "user", content: question }];
    setExamInterpMessages(nextMessages);
    setExamInterpFollowUp("");
    try {
      const result = await fetchExamInterpretation(nextMessages);
      if (result.ok) {
        setExamInterpMessages([...nextMessages, { role: "assistant", content: result.text }]);
      } else {
        setExamInterpError(result.error);
      }
    } finally {
      setExamInterpLoading(false);
    }
  };

  const handleSaveExamInterpretationAsObservation = async () => {
    const conversation = examInterpMessages.slice(1);
    if (conversation.length === 0 || !animalId) return;
    setExamInterpSaving(true);
    try {
      const chosenExams = examsList.filter((e) => examInterpExamIds.has(e.id));
      const header = `Interpretação de IA (exames: ${chosenExams.map((e) => e.type).join(", ")}):\n\n`;
      // Primeira resposta entra direto; qualquer pergunta de acompanhamento
      // feita depois entra como "Pergunta:"/"Resposta:" — só acontece se o
      // usuário realmente continuou a conversa.
      const body = conversation
        .map((m, i) => {
          const text = stripMarkdownForPlainText(m.content);
          return i === 0 ? text : m.role === "user" ? `Pergunta: ${text}` : `Resposta: ${text}`;
        })
        .join("\n\n");
      const created = await observationsApi.addObservation(animalId, {
        observation: header + body,
        displayAsAlert: false,
        createdBy: currentVetName,
      });
      if (!created) {
        toast.error("Falha ao salvar a interpretação como observação.");
        return;
      }
      await refetchObservations();
      toast.success("Interpretação salva na aba Observações.");
      setExamInterpOpen(false);
    } finally {
      setExamInterpSaving(false);
    }
  };

  const [observationModalOpen, setObservationModalOpen] = useState(false);
  const [selectedObservation, setSelectedObservation] = useState<ObservationEntry | null>(null);

  const [observationEditOpen, setObservationEditOpen] = useState(false);
  const [observationEditText, setObservationEditText] = useState<string>("");
  const [observationEditAlert, setObservationEditAlert] = useState<boolean>(false);
  const [observationDeleteId, setObservationDeleteId] = useState<string | null>(null);

  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState<WeightEntry | null>(null);

  const [isTutorExpanded, setIsTutorExpanded] = useState(false);

  // Vendas deste paciente (as mais recentes primeiro) e os pagamentos delas.
  const animalSalesTransactions = useMemo(
    () =>
      mockFinancialTransactions.filter(
        (t) => t.relatedAnimalId === animalId && t.type === "income" && t.category === "Venda de Produtos"
      ),
    [mockFinancialTransactions, animalId]
  );

  const animalReceipts = useMemo(() => {
    return mockFinancialTransactions
      .filter((t) => t.relatedAnimalId === animalId && t.type === "income" && t.category === "Recebimento")
      .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  }, [mockFinancialTransactions, animalId]);

  // Forma de pagamento de cada venda: a venda do prontuário não guardava a
  // forma (ela só existia no recebimento).
  const receiptMethods = useMemo(() => receiptMethodsBySale(mockFinancialTransactions), [mockFinancialTransactions]);

  const salesTotals = useMemo(() => {
    const active = animalSalesTransactions.filter((s) => s.status !== "cancelled");
    return {
      total: active.reduce((sum, s) => sum + s.amount, 0),
      received: active.reduce((sum, s) => sum + Math.min(s.amount, s.paidAmount || 0), 0),
      open: active.reduce((sum, s) => sum + saleBalance(s), 0),
    };
  }, [animalSalesTransactions]);

  const [receiptIdToRefund, setReceiptIdToRefund] = useState<string | null>(null);

  // Orçamentos deste paciente — mesma tabela/API real usada em /sales/budgets
  // (antes o prontuário tinha um sistema paralelo em localStorage,
  // desconectado: um orçamento feito aqui nunca aparecia lá, e vice-versa).
  const [allBudgets, setAllBudgets] = useState<Budget[]>([]);
  const refetchBudgets = useCallback(async () => {
    setAllBudgets(await budgetsApi.getBudgets());
  }, []);
  useEffect(() => { void refetchBudgets(); }, [refetchBudgets]);
  const patientBudgets = useMemo(
    () => allBudgets.filter((b) => b.animalId === animalId),
    [allBudgets, animalId]
  );

  const catalogItems = catalogItemsFromHook.filter(i => i.active);

  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [selectedPdvSale, setSelectedPdvSale] = useState<import("@/mockData/financial").FinancialTransaction | null>(null);
  const [pdvSaleToCancel, setPdvSaleToCancel] = useState<import("@/mockData/financial").FinancialTransaction | null>(null);
  const [pdvSaleToDelete, setPdvSaleToDelete] = useState<import("@/mockData/financial").FinancialTransaction | null>(null);
  const [saleDate, setSaleDate] = useState<string>(getTodayLocalISO());
  // Pagamento na própria venda: quase toda venda é paga na hora.
  const [salePayMode, setSalePayMode] = useState<PayMode>("now");
  const [salePaymentMethod, setSalePaymentMethod] = useState<string | undefined>(undefined);
  const [saleAppointmentId, setSaleAppointmentId] = useState<string>("");
  const [saleResponsible, setSaleResponsible] = useState<string>("");
  const [saleObservations, setSaleObservations] = useState<string>("");

  const [saleSelectedItemId, setSaleSelectedItemId] = useState<string>("");
  const [saleQty, setSaleQty] = useState<number>(1);
  const [saleUnitPrice, setSaleUnitPrice] = useState<number>(0);
  const [saleItems, setSaleItems] = useState<SaleItemMeta[]>([]);

  useEffect(() => {
    if (!saleSelectedItemId) { setSaleUnitPrice(0); return; }
    const item = catalogItemsFromHook.find(i => i.id === saleSelectedItemId);
    setSaleUnitPrice(item?.price || 0);
  }, [saleSelectedItemId, catalogItemsFromHook]);

  const saleSubtotal = saleItems.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
  // Desconto/acréscimo — o mesmo do PDV (% e R$ andam juntos).
  const saleAdj = usePriceAdjustments(saleSubtotal);
  const saleTotal = Math.max(0, toCents(saleSubtotal - saleAdj.discountAmount + saleAdj.surchargeAmount));

  const addItemToSale = () => {
    if (!saleSelectedItemId) { toast.error("Selecione um item."); return; }
    if (saleQty <= 0 || saleUnitPrice <= 0) { toast.error("Qtd e preço devem ser válidos."); return; }
    const catItem = catalogItemsFromHook.find(i => i.id === saleSelectedItemId);
    if (!catItem) { toast.error("Item não encontrado."); return; }
    setSaleItems(prev => [...prev, { itemId: catItem.id, name: catItem.name, type: catItem.type, qty: saleQty, unitPrice: saleUnitPrice }]);
    setSaleSelectedItemId(""); setSaleQty(1); setSaleUnitPrice(0);
  };

  const removeSaleItem = (itemId: string, index: number) => {
    setSaleItems(prev => prev.filter((_, i) => !(i === index && _.itemId === itemId)));
  };

  const [savingSale, setSavingSale] = useState(false);

  // "Nova venda" já vem vinculada ao atendimento de hoje (se houver) e com
  // "Recebido agora" marcado.
  const openNewSale = () => {
    const today = getTodayLocalISO();
    setSaleDate(today);
    setSaleAppointmentId(animalAppointments.find((a) => a.date === today)?.id ?? "");
    setSaleResponsible("");
    setSaleObservations("");
    setSaleItems([]);
    setSaleSelectedItemId("");
    setSaleQty(1);
    setSaleUnitPrice(0);
    setSalePayMode("now");
    setSalePaymentMethod(undefined);
    saleAdj.reset();
    setSaleModalOpen(true);
  };

  const handleSaveSale = async () => {
    if (savingSale) return;
    if (saleItems.length === 0) { toast.error("Adicione itens à venda."); return; }
    if (!currentClient || !currentAnimal) { toast.error("Cliente/animal não encontrados."); return; }
    if (salePayMode === "now" && !salePaymentMethod) { toast.error("Escolha a forma de pagamento."); return; }
    if (saleDate > getTodayLocalISO()) { toast.error("A data da venda não pode ser futura."); return; }
    setSavingSale(true);
    try {
      // Nome do tutor/pet em vez do ID cru do atendimento — o vínculo com o
      // atendimento fica na tag de observations (buildSaleObservations).
      const description = `Venda: ${currentClient.name} (${currentAnimal.name}) — ${saleItems.map(i => formatItemQty(i.name, i.qty)).join(", ")}`;
      const responsible = saleResponsible.trim() || (saleAppointmentId ? animalAppointments.find(a => a.id === saleAppointmentId)?.vet : undefined) || undefined;
      const time = nowTimeHHMM();

      const tx = await financialApi.addFinancialTransaction({
        date: saleDate,
        time,
        description,
        type: "income",
        amount: saleTotal,
        category: "Venda de Produtos",
        relatedAnimalId: currentAnimal.id,
        relatedClientId: currentClient.id,
        paymentMethod: salePaymentMethod,
        status: "pending",
        discountAmount: saleAdj.discountAmount > 0 ? saleAdj.discountAmount : undefined,
        surchargeAmount: saleAdj.surchargeAmount > 0 ? saleAdj.surchargeAmount : undefined,
        responsible,
        observations: buildSaleObservations(saleAppointmentId || undefined, saleObservations),
      });
      if (!tx) { toast.error("Erro ao registrar a venda. Nada foi gravado — tente de novo."); return; }

      // Itens de verdade (sale_items) + baixa de estoque — mesmo fluxo do PDV
      // (é o que o relatório de repasses e o Fechamento 50/50 leem).
      await fulfillSaleLines({
        saleId: tx.id,
        catalog: catalogItemsFromHook,
        lines: saleItems.map((it) => ({
          catalogItemId: it.itemId,
          name: it.name,
          type: it.type,
          quantity: it.qty,
          unitPrice: it.unitPrice,
        })),
      });

      // "Recebido agora": a baixa sai junto, na data da venda. Antes era outra
      // sub-aba, escolhendo a venda e a forma de pagamento de novo.
      let received = false;
      if (salePayMode === "now" && saleTotal > 0) {
        received = await receiveSalePayment({
          sale: tx,
          paymentMethod: salePaymentMethod,
          date: saleDate,
          time,
          clientName: currentClient.name,
          animalName: currentAnimal.name,
        });
      }
      await Promise.all([refetchCatalog(), refetchFinancial()]);
      setSaleModalOpen(false);
      setSaleItems([]);
      saleAdj.reset();
      if (salePayMode === "now" && saleTotal > 0) {
        if (received) toast.success(`Venda registrada e recebida (${salePaymentMethod}).`);
        else toast.warning("Venda registrada, mas o recebimento não foi gravado. Use “Receber” na venda.");
      } else {
        toast.success(`Venda registrada — fica a receber ${formatCurrencyBRL(saleTotal)}.`);
      }
    } finally {
      setSavingSale(false);
    }
  };


  // "Receber": uma janela só (ReceivePaymentDialog), já com saldo e forma de
  // pagamento preenchidos — a mesma de Vendas e Recebimentos.
  const [saleToReceive, setSaleToReceive] = useState<FinancialTransaction | null>(null);

  const handleConfirmEstorno = async () => {
    if (!receiptIdToRefund) return;
    const ok = await financialApi.removeReceipt(receiptIdToRefund);
    if (ok) {
      await refetchFinancial();
      toast.success("Pagamento estornado.");
    } else {
      toast.error("Não foi possível estornar.");
    }
    setReceiptIdToRefund(null);
  };

  // Validade fixa (dias) — o sistema real de orçamentos (sales/BudgetsPage.tsx,
  // tabela `budgets`) não tem coluna de validade; o prontuário tinha essa
  // customização só localmente. Unificado nesse valor fixo por enquanto —
  // dá pra virar campo de verdade depois, se precisar.
  const BUDGET_VALIDITY_DAYS = 15;

  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetDate, setBudgetDate] = useState<string>(getTodayLocalISO());
  const [budgetSelectedItemId, setBudgetSelectedItemId] = useState<string>("");
  const [budgetQty, setBudgetQty] = useState<number>(1);
  const [budgetUnitPrice, setBudgetUnitPrice] = useState<number>(0);
  const [budgetItems, setBudgetItems] = useState<SaleItemMeta[]>([]);
  const [budgetObservations, setBudgetObservations] = useState<string>("");
  const [savingBudget, setSavingBudget] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);

  useEffect(() => {
    if (!budgetSelectedItemId) { setBudgetUnitPrice(0); return; }
    const it = catalogItemsFromHook.find(i => i.id === budgetSelectedItemId);
    setBudgetUnitPrice(it?.price || 0);
  }, [budgetSelectedItemId, catalogItemsFromHook]);

  const budgetTotal = budgetItems.reduce((s, it) => s + it.qty * it.unitPrice, 0);

  const addItemToBudget = () => {
    if (!budgetSelectedItemId) { toast.error("Selecione um item."); return; }
    if (budgetQty <= 0 || budgetUnitPrice <= 0) { toast.error("Qtd e preço devem ser válidos."); return; }
    const cat = catalogItemsFromHook.find(i => i.id === budgetSelectedItemId);
    if (!cat) { toast.error("Item não encontrado."); return; }
    setBudgetItems(prev => [...prev, { itemId: cat.id, name: cat.name, type: cat.type, qty: budgetQty, unitPrice: budgetUnitPrice }]);
    setBudgetSelectedItemId(""); setBudgetQty(1); setBudgetUnitPrice(0);
  };
  const removeBudgetItem = (itemId: string, index: number) => {
    setBudgetItems(prev => prev.filter((_, i) => !(i === index && _.itemId === itemId)));
  };
  const isBudgetExpired = (b: Budget) => {
    const exp = new Date(b.date);
    exp.setDate(exp.getDate() + BUDGET_VALIDITY_DAYS);
    const today = new Date();
    return today > exp && b.status !== "converted" && b.status !== "cancelled";
  };
  const resetBudgetForm = () => {
    setBudgetDate(getTodayLocalISO());
    setBudgetItems([]); setBudgetQty(1); setBudgetUnitPrice(0); setBudgetObservations("");
    setEditingBudgetId(null);
  };
  const startEditBudget = (b: Budget) => {
    setEditingBudgetId(b.id);
    setBudgetDate(b.date);
    setBudgetItems(
      b.items.map((it) => ({
        itemId: it.itemId,
        name: it.name,
        type: catalogItemsFromHook.find((c) => c.id === it.itemId)?.type || "product",
        qty: it.qty,
        unitPrice: it.price,
      }))
    );
    setBudgetObservations(b.notes || "");
    setBudgetModalOpen(true);
  };
  const saveBudget = async () => {
    if (savingBudget) return;
    if (budgetItems.length === 0) { toast.error("Adicione itens ao orçamento."); return; }
    if (!currentClient || !currentAnimal) { toast.error("Cliente/animal não encontrados."); return; }
    setSavingBudget(true);
    try {
      const itemsPayload = budgetItems.map((it) => ({ itemId: it.itemId, name: it.name, qty: it.qty, price: it.unitPrice }));
      if (editingBudgetId) {
        const existing = patientBudgets.find((b) => b.id === editingBudgetId);
        if (!existing) { toast.error("Orçamento não encontrado."); return; }
        const ok = await budgetsApi.updateBudget({
          ...existing,
          date: budgetDate,
          items: itemsPayload,
          notes: budgetObservations || undefined,
        });
        if (!ok) { toast.error("Falha ao atualizar orçamento."); return; }
        toast.success("Orçamento atualizado.");
      } else {
        const created = await budgetsApi.addBudget({
          clientId: currentClient.id,
          animalId: currentAnimal.id,
          clientName: currentClient.name,
          animalName: currentAnimal.name,
          clientPhone: currentClient.mainPhoneContact || undefined,
          date: budgetDate,
          items: itemsPayload,
          notes: budgetObservations || undefined,
        });
        if (!created) { toast.error("Falha ao salvar orçamento."); return; }
        toast.success("Orçamento salvo.");
      }
      await refetchBudgets();
      resetBudgetForm();
      setBudgetModalOpen(false);
    } finally {
      setSavingBudget(false);
    }
  };
  const approveBudget = async (id: string) => {
    const ok = await budgetsApi.updateBudgetStatus(id, "approved");
    if (!ok) { toast.error("Falha ao aprovar orçamento."); return; }
    await refetchBudgets();
  };
  const cancelBudget = async (id: string) => {
    const ok = await budgetsApi.updateBudgetStatus(id, "cancelled");
    if (!ok) { toast.error("Falha ao cancelar orçamento."); return; }
    await refetchBudgets();
  };
  const printBudget = async (b: Budget) => {
    const blob = await renderPdf((K) => <K.BudgetReportPdfContent budget={b} userProfile={currentUserProfile} catalogItems={catalogItems} />);
    await openPdf({
      blob,
      fileName: `${slugifyFileName("orcamento", b.animalName || currentAnimal?.name, formatDateBRForFileName(b.date))}.pdf`,
      persistOptions: { folder: "budgets" },
    });
  };

  const sendBudgetViaWhatsApp = async (b: Budget) => {
    try {
      const blob = await renderPdf((K) => <K.BudgetReportPdfContent budget={b} userProfile={currentUserProfile} catalogItems={catalogItems} />);
      await sendPdfViaWhatsApp({
        blob,
        fileName: `${slugifyFileName("orcamento", b.animalName || currentAnimal?.name, formatDateBRForFileName(b.date))}.pdf`,
        folder: "budgets",
        track: { type: "budget", id: b.id, animalId: currentAnimal?.id },
        title: "Orçamento",
        intro: `Olá! Segue o orçamento de *${b.animalName || currentAnimal?.name || "seu pet"}*.`,
        dateLabel: formatDateTime(b.date),
        preview: {
          title: [`Orçamento`, b.animalName || currentAnimal?.name].filter(Boolean).join(" — "),
          description: `Orçamento · ${formatDateTime(b.date)}`,
        },
      });
    } catch (err) {
      console.error("[Enviar orçamento por WhatsApp] falhou ao gerar o PDF", err);
      toast.error("Não consegui gerar o PDF deste orçamento para enviar por WhatsApp.");
    }
  };

  // Converter: mesma janela (e mesma regra de valor/custo) da tela de
  // Orçamentos — antes o prontuário ignorava desconto/acréscimo negociados.
  const [budgetToConvert, setBudgetToConvert] = useState<Budget | null>(null);
  const openConvertModal = (b: Budget) => {
    if (isBudgetExpired(b)) {
      toast.error(`Orçamento vencido (validade de ${BUDGET_VALIDITY_DAYS} dias). Edite a data para converter.`);
      return;
    }
    setBudgetToConvert(b);
  };

  const [financeTab, setFinanceTab] = useState<"vendas" | "orcamentos">("vendas");

  // Link direto "?paySaleId=<venda>": abre o Financeiro já no "Receber" dela.
  useEffect(() => {
    const paySaleId = searchParams.get("paySaleId");
    if (!paySaleId) return;
    const sale = animalSalesTransactions.find((s) => s.id === paySaleId);
    if (!sale) return; // espera as vendas carregarem
    setActiveTab("financial");
    setFinanceTab("vendas");
    if (saleBalance(sale) > 0) setSaleToReceive(sale);
    const next = new URLSearchParams(searchParams);
    next.delete("paySaleId");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, animalSalesTransactions]);

  const formatAgeLabel = (birthday?: string) => {
    if (!birthday) return "-";
    const birthDate = parseLocalDate(birthday);
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

  // Envia um PDF (receita, laudo de exame, orçamento etc.) por WhatsApp usando
  // o telefone do cliente atual — lógica compartilhada em lib/whatsappShare.ts
  // (também usada pela tela dedicada de Orçamentos) pra não duplicar a
  // validação de telefone/formatação de mensagem em cada botão.
  const sendPdfViaWhatsApp = (opts: {
    blob: Blob;
    fileName: string;
    folder: string;
    title: string;
    intro: string;
    dateLabel: string;
    preview?: { title?: string; description?: string };
    track?: SendTrack;
  }) => sendPdfViaWhatsAppShared({ ...opts, phone: currentClient?.mainPhoneContact });

  // ADDED: Navegar para a edição do animal
  const handleEditAnimal = () => {
    navigate(subPath("/edit"));
  };

  if (isClientLoading || isAnimalRefLoading) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">Carregando prontuário...</h1>
        <p className="text-muted-foreground">Buscando cliente e animal no Supabase.</p>
      </div>
    );
  }

  if (!currentClient || !currentAnimal) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">
          {isClientError || isAnimalRefError
            ? `Erro ao carregar prontuário do Supabase: ${
                clientError instanceof Error
                  ? clientError.message
                  : animalRefError instanceof Error
                    ? animalRefError.message
                    : "erro desconhecido"
              }.`
            : "Animal ou Cliente não encontrado."}
        </h1>
        <Link to="/clients">
          <Button variant="outline" className="bg-card border border-border text-foreground hover:bg-muted rounded-md transition-all duration-200 shadow-sm hover:shadow-md">
            <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Clientes
          </Button>
        </Link>
      </div>
    );
  }

  const allTimelineEvents: TimelineEvent[] = [];

  animalAppointments.forEach(app => {
    const appDetails = app.details as BaseAppointmentDetails;
    const description = appDetails.suspeitaDiagnostica || appDetails.condutaTratamento || app.observacoesGerais || `Atendimento de ${displayAppointmentType(app.type)}`;
    allTimelineEvents.push({
      id: `app-${app.id}`,
      date: app.date,
      time: app.time,
      type: 'Atendimento',
      description: `${displayAppointmentType(app.type)}: ${description}`,
      summary: app.observacoesGerais || description,
      icon: FaStethoscope,
      link: subPath(`/view-appointment/${app.id}`),
      badgeColor: "bg-[hsl(var(--vf-clinical))]/15 text-vf-clinical",
      author: app.vet || currentVetName,
    });
  });

  // Agendamentos (Agenda interna e página pública) — entidade separada do
  // "Atendimento" clínico acima (uma é o horário marcado, a outra é o
  // registro do que foi feito na consulta). Mostra o status atual sempre
  // que o prontuário é aberto, então mudar o status na Agenda (ex.: cancelar)
  // já reflete aqui na próxima vez que a timeline for carregada.
  animalSchedules.forEach(sched => {
    const statusLabel = SCHEDULE_STATUS_LABEL[sched.status] || sched.status;
    allTimelineEvents.push({
      id: `sched-${sched.id}`,
      date: format(sched.date, "yyyy-MM-dd"),
      time: sched.time,
      type: 'Agendamento',
      description: `${sched.title || "Agendamento"}: ${statusLabel}`,
      summary: statusLabel,
      icon: FaCalendarAlt,
      badgeColor: "bg-blue-100 text-blue-800",
      author: currentVetName,
      scheduleStatus: sched.status,
    });
  });

  examsList.forEach(exam => {
    allTimelineEvents.push({
      id: `exam-${exam.id}`,
      date: exam.date,
      time: exam.time,
      type: 'Exame',
      description: `${examDisplayName(exam)}: ${(exam.customBlocks?.length ? customExamSummary(exam) : exam.result) || 'Ver detalhes'}`,
      summary: exam.nota || exam.result || undefined,
      icon: FaFlask,
      badgeColor: "bg-[hsl(var(--vf-clinical))]/15 text-vf-clinical",
      author: exam.vet || currentVetName,
    });
  });

  prescriptions.forEach(rx => {
    const description = rx.treatmentDescription || rx.medicationName || "Receita sem descrição";
    let badgeColor = "bg-green-100 text-green-800"; // simples
    if (rx.type === 'manipulated') badgeColor = "bg-teal-100 text-teal-800";
    if (rx.type === 'controlled') badgeColor = "bg-amber-100 text-amber-800";

    const rxIcon = rx.type === 'manipulated' ? FaFlask : rx.type === 'controlled' ? FaExclamationTriangle : FaPrescriptionBottleAlt;

    allTimelineEvents.push({
      id: `rx-${rx.id}`,
      date: rx.date,
      time: rx.time,
      type: 'Receita',
      description: `${rx.type === 'simple' ? 'Receita Simples' : rx.type === 'controlled' ? 'Receita Controlada' : 'Receita Manipulada'}: ${description}`,
      summary: rx.instructions || rx.treatmentDescription || rx.medicationName || undefined,
      icon: rxIcon,
      link: subPath(`/edit-prescription/${rx.id}?type=${rx.type}`),
      badgeColor,
      author: currentVetName,
    });
  });

  weightHistory.forEach(entry => {
    allTimelineEvents.push({
      id: `weight-${entry.id}`,
      date: entry.date,
      time: entry.time,
      type: 'Peso',
      description: `Peso registrado: ${entry.weight.toFixed(1)} kg (${entry.source})`,
      summary: `Origem: ${entry.source || "-"}`,
      icon: FaWeightHanging,
      badgeColor: "bg-yellow-100 text-yellow-800",
      author: currentVetName,
    });
  });

  observations.forEach(obs => {
    allTimelineEvents.push({
      id: `obs-${obs.id}`,
      date: obs.date,
      time: obs.time,
      type: 'Observação',
      description: `Observação: ${obs.observation}`,
      summary: obs.observation,
      icon: FaCommentAlt,
      badgeColor: "bg-gray-100 text-gray-800",
      author: currentVetName,
      isAlert: !!obs.displayAsAlert,
    });
  });

  animalSalesTransactions.forEach(sale => {
    allTimelineEvents.push({
      id: `sale-${sale.id}`,
      date: sale.date,
      time: sale.time,
      type: 'Venda',
      description: `Venda: ${sale.description} (R$ ${sale.amount.toFixed(2).replace('.', ',')})`,
      summary: sale.description,
      icon: FaDollarSign,
      badgeColor: "bg-green-100 text-green-800",
      author: currentVetName,
    });
  });

  documents.forEach(doc => {
    allTimelineEvents.push({
      id: `doc-${doc.id}`,
      date: doc.date,
      time: doc.time,
      type: 'Documento',
      description: `Documento: ${doc.name}`,
      summary: doc.name,
      icon: FaFileAlt,
      link: doc.fileUrl,
      badgeColor: "bg-orange-100 text-orange-800",
      author: currentVetName,
    });
  });

  const sortedTimelineEvents = allTimelineEvents.sort((a, b) => {
    const dateTimeA = new Date(`${a.date}T${a.time}`);
    const dateTimeB = new Date(`${b.date}T${b.time}`);
    return dateTimeB.getTime() - dateTimeA.getTime();
  });

  const totalAppointments = animalAppointments.length;
  const totalIncome = mockFinancialTransactions
    .filter((t) => t.relatedAnimalId === animalId && t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const lastAppointment = [...animalAppointments]
    .sort((a, b) => new Date(`${b.date}T${b.time || "00:00"}`).getTime() - new Date(`${a.date}T${a.time || "00:00"}`).getTime())[0];

  const latestWeight = (() => {
    if (weightHistory.length === 0) return currentAnimal.weight;
    const sorted = [...weightHistory].sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
      const db = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
      return db - da;
    });
    return sorted[0]?.weight ?? currentAnimal.weight;
  })();

  const formatAgeYearsMonths = (birthday?: string) => {
    if (!birthday) return "-";

    const birth = parseLocalDate(birthday);
    const now = new Date();

    let totalMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (now.getDate() < birth.getDate()) totalMonths -= 1;
    if (totalMonths < 0) totalMonths = 0;

    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    const yearsLabel = years === 1 ? "1 ano" : `${years} anos`;
    const monthsLabel = months === 1 ? "1 mês" : `${months} meses`;

    // Sempre exibir anos e meses (ex.: "6 anos e 4 meses")
    return `${yearsLabel} e ${monthsLabel}`;
  };

  const getTimelineMarkerColor = (dotClass: string) => {
    if (dotClass.includes("timeline-dot-clinical")) return "#7fc8b5";
    if (dotClass.includes("timeline-dot-clinical-strong")) return "#4fa38f";
    if (dotClass.includes("timeline-dot-green")) return "#86efac";
    if (dotClass.includes("timeline-dot-amber")) return "#fcd34d";
    if (dotClass.includes("timeline-dot-teal")) return "#99f6e4";
    if (dotClass.includes("timeline-dot-orange")) return "#fdba74";
    if (dotClass.includes("timeline-dot-slate")) return "#cbd5e1";
    if (dotClass.includes("timeline-dot-gray")) return "#cbd5e1";
    if (dotClass.includes("bg-red-300")) return "#fca5a5";
    return "#cbd5e1";
  };

  const getTimelineMarkerIcon = (event: TimelineEvent) => {
    if (event.type === "Atendimento") return StethoscopeIcon;
    if (event.type === "Agendamento") return CalendarClockIcon;
    if (event.type === "Exame") return FlaskConicalIcon;
    if (event.type === "Vacina") return SyringeIcon;
    if (event.type === "Receita") return FileTextIcon;
    if (event.type === "Observação" && event.isAlert) return AlertTriangleIcon;
    return CircleIcon;
  };

  return (
    // Sem min-h-screen/overflow-x-hidden próprios: o Layout já rola a página
    // e corta o que passar da largura. Os paddings px-5/p-6 daqui somavam com
    // o padding do Layout — no celular sobravam ~310px de largura útil (texto
    // e telefone cortados, botões por cima do texto). Abaixo de lg o
    // prontuário usa só o padding do Layout; em tela larga fica como antes.
    <div className="flex flex-col layered-bg-warm">
      {/* CABEÇALHO DO PRONTUÁRIO */}
      <div className="mx-auto w-full max-w-7xl pb-3 lg:px-5 lg:pt-4">
        <div className="premium-card rounded-xl border border-border/60 bg-white px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between gap-3 sm:items-start sm:gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 flex items-center justify-center">
                  <FileTextIcon className="h-4.5 w-4.5" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-xl leading-tight font-semibold text-foreground">
                    Prontuário Consolidado
                  </h1>
                  <p className="hidden sm:block text-xs text-muted-foreground mt-0.5">
                    Visão completa do histórico clínico
                  </p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  >
                    <FaEllipsisV className="h-4 w-4" />
                    <span className="sr-only">Ações</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => window.print()}>
                    <FaPrint className="mr-2 h-4 w-4" /> Imprimir
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => window.print()}>
                    <FaDownload className="mr-2 h-4 w-4" /> Exportar PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link to={`/clients/${currentClient.id}`}>
                <Button
                  variant="ghost"
                  className="h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 px-2"
                >
                  <FaArrowLeft className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Voltar</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 mx-auto w-full max-w-7xl lg:p-6">
        {/* CARD DO PACIENTE */}
        <div className="mb-4 sm:mb-6">
          <Card className="premium-card ring-1 ring-border/50">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                  {/* Avatar */}
                  <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-2xl bg-[rgb(240,253,248)] text-[rgb(5,150,105)] ring-1 ring-[rgba(5,150,105,0.12)] flex items-center justify-center">
                    <FaPaw className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        className={cn(
                          "min-w-0 break-words text-2xl sm:text-[1.9rem] leading-tight font-semibold tracking-tight",
                          isDeceased(currentAnimal) && "text-zinc-500"
                        )}
                      >
                        {currentAnimal.name}
                      </h2>
                      {isDeceased(currentAnimal) && <DeceasedBadge animal={currentAnimal} className="px-2.5 py-1 text-xs" />}
                      {alertObservations.map((o) => (
                        <span
                          key={o.id}
                          className="inline-flex max-w-full items-center break-words rounded-full border border-red-300 bg-red-50 px-3 py-1 text-[11px] font-extrabold tracking-wider sm:tracking-widest text-red-700 uppercase"
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
                  className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40"
                >
                  <FaEdit className="h-4 w-4" />
                  <span className="sr-only">Editar paciente</span>
                </Button>
              </div>

              {/* CHIPS DO PACIENTE */}
              <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-[12px] leading-5 sm:px-3">
                  <FaIdCard className="h-3 w-3 text-primary" />
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-semibold text-foreground">{currentClient ? getPatientDisplayId(currentAnimal.id, currentClient.animals) : currentAnimal.id}</span>
                </span>
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-[12px] leading-5 sm:px-3">
                  <FaPaw className="h-3 w-3 text-teal-600" />
                  <span className="text-muted-foreground">Espécie:</span>
                  <span className="font-semibold text-foreground">{currentAnimal.species || "-"}</span>
                </span>
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-[12px] leading-5 sm:px-3">
                  <FaTag className="h-3 w-3 text-vf-clinical" />
                  <span className="text-muted-foreground">Raça:</span>
                  <span className="font-semibold text-foreground">{currentAnimal.breed || "-"}</span>
                </span>
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-[12px] leading-5 sm:px-3">
                  <FaMale className="h-3 w-3 text-amber-600" />
                  <span className="text-muted-foreground">Sexo:</span>
                  <span className="font-semibold text-foreground">{currentAnimal.gender || "-"}</span>
                </span>
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-[12px] leading-5 sm:px-3">
                  <FaClock className="h-3 w-3 text-emerald-600" />
                  <span className="text-muted-foreground">Idade:</span>
                  <span className="font-semibold text-foreground">{formatAgeYearsMonths(currentAnimal.birthday)}</span>
                </span>
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-[12px] leading-5 sm:px-3">
                  <FaWeightHanging className="h-3 w-3 text-emerald-600" />
                  <span className="text-muted-foreground">Peso:</span>
                  <span className="font-semibold text-foreground">{formatWeightLabel(latestWeight)}</span>
                </span>
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-[12px] leading-5 sm:px-3">
                  <FaCalendarAlt className="h-3 w-3 text-[#F79009]" />
                  <span className="text-muted-foreground">Nascimento:</span>
                  <span className="font-semibold text-foreground">
                    {currentAnimal.birthday ? formatDateTime(currentAnimal.birthday) : "-"}
                  </span>
                </span>
              </div>

              {/* Tutor + Financeiro */}
              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
                {/* TUTOR */}
                <div className="rounded-xl border border-border bg-white h-full">
                  <Collapsible
                    open={isTutorExpanded}
                    onOpenChange={setIsTutorExpanded}
                    className="h-full flex flex-col"
                  >
                    <div className="p-3 flex items-start justify-between gap-2 sm:gap-3">
                      <div className="flex flex-1 items-start gap-3 min-w-0">
                        <div className="hidden sm:flex h-9 w-9 rounded-xl bg-[hsl(var(--vf-clinical))]/12 text-vf-clinical ring-1 ring-[hsl(var(--vf-clinical))]/25 items-center justify-center shrink-0">
                          <UserRound className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] font-semibold text-foreground">Tutor</div>
                          <div className="mt-0.5 text-[15px] text-foreground/90 font-medium break-words">
                            {currentClient.name}
                          </div>

                          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                            {/* Sem truncate: no celular o número do telefone
                                saía cortado ("(19) 9..."). O número em si
                                nunca quebra no meio (whitespace-nowrap). */}
                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                              <FaPhone className="h-3.5 w-3.5 shrink-0 text-vf-clinical" />
                              <span className="text-foreground/70 font-medium">Telefone:</span>
                              <span className="whitespace-nowrap text-foreground/90">{currentClient.mainPhoneContact || "-"}</span>
                              {currentClient.mainPhoneContact && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openWhatsAppChat(currentClient.mainPhoneContact);
                                  }}
                                  title="Conversar no WhatsApp"
                                  aria-label="Conversar no WhatsApp"
                                  className="shrink-0 rounded-md p-1.5 -my-1 text-green-600 hover:bg-green-50 hover:text-green-700"
                                >
                                  <SiWhatsapp className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                            <div className="flex items-start gap-1.5">
                              <FaMapMarkerAlt className="mt-1 h-3.5 w-3.5 shrink-0 text-vf-clinical" />
                              <span className={cn("min-w-0 break-words", isTutorExpanded ? "" : "line-clamp-2 sm:line-clamp-1")}>
                                <span className="text-foreground/70 font-medium">Endereço:</span>{" "}
                                <span className="text-foreground/90">
                                  {currentClient.address?.street ? `${currentClient.address.street}, ${currentClient.address.number}` : "-"}
                                  {currentClient.address?.complement ? ` - ${currentClient.address.complement}` : ""}
                                  {currentClient.address?.neighborhood ? ` • ${currentClient.address.neighborhood}` : ""}
                                  {currentClient.address?.city ? ` • ${currentClient.address.city}` : ""}
                                  {currentClient.address?.state ? ` - ${currentClient.address.state}` : ""}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 shrink-0 px-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          aria-label={isTutorExpanded ? "Mostrar menos dados do tutor" : "Mostrar mais dados do tutor"}
                        >
                          <span className="hidden sm:inline text-xs">{isTutorExpanded ? "Menos" : "Mais"}</span>
                          {isTutorExpanded ? (
                            <FaChevronUp className="sm:ml-2 h-3.5 w-3.5" />
                          ) : (
                            <FaChevronDown className="sm:ml-2 h-3.5 w-3.5" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent>
                      <div className="px-3 pb-3 text-sm text-muted-foreground space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                          <div className="flex items-center gap-1.5">
                            <FaIdCard className="h-3.5 w-3.5 text-vf-clinical" />
                            <span>
                              <span className="text-foreground/70 font-medium">
                                {currentClient.clientType === "physical" ? "CPF" : "CNPJ"}:
                              </span>{" "}
                              <span className="font-semibold text-foreground/90">{currentClient.identificationNumber || "-"}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FaIdCard className="h-3.5 w-3.5 text-vf-clinical" />
                            <span>
                              <span className="text-foreground/70 font-medium">
                                {currentClient.clientType === "physical" ? "RG" : "IE"}:
                              </span>{" "}
                              <span className="font-semibold text-foreground/90">{currentClient.secondaryIdentification || "-"}</span>
                            </span>
                          </div>
                        </div>

                        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {currentClient.mainEmailContact ? (
                              <span>
                                <span className="text-foreground/70 font-medium">E-mail:</span>{" "}
                                <span className="font-semibold text-foreground/90">{currentClient.mainEmailContact}</span>
                              </span>
                            ) : null}
                            {currentClient.birthday ? (
                              <span>
                                <span className="text-foreground/70 font-medium">Nascimento:</span>{" "}
                                <span className="font-semibold text-foreground/90">{formatDateTime(currentClient.birthday)}</span>
                              </span>
                            ) : null}
                            {currentClient.profession ? (
                              <span>
                                <span className="text-foreground/70 font-medium">Profissão:</span>{" "}
                                <span className="font-semibold text-foreground/90">{currentClient.profession}</span>
                              </span>
                            ) : null}
                            {currentClient.dynamicContacts?.length ? (
                              <span>
                                <span className="text-foreground/70 font-medium">Contatos:</span>{" "}
                                <span className="font-semibold text-foreground/90">
                                  {currentClient.dynamicContacts
                                    .filter((c) => c.value)
                                    .slice(0, 3)
                                    .map((c) => `${c.label}: ${c.value}`)
                                    .join(" • ")}
                                </span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                {/* FINANCEIRO */}
                <div className="rounded-xl border border-border bg-white p-3 h-full">
                  {(() => {
                    // Mesmos números da aba Financeiro (salesTotals): o que falta
                    // receber e o total vendido para o paciente. Clicar abre a aba.
                    const openFinancial = () => {
                      setActiveTab("financial");
                      setFinanceTab("vendas");
                      requestAnimationFrame(() =>
                        document.querySelector('[aria-label="Financeiro do paciente"]')?.scrollIntoView({ behavior: "smooth", block: "start" })
                      );
                    };
                    const hasOpen = salesTotals.open > 0;

                    return (
                      <div className="h-full">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 flex items-center justify-center">
                            <BadgeDollarSign className="h-4 w-4" strokeWidth={1.8} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[15px] font-semibold text-foreground">Financeiro</div>
                            <div className="text-sm text-muted-foreground">Resumo do prontuário</div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={openFinancial}
                            className="min-w-0 rounded-xl border border-border bg-white px-2.5 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:px-3 sm:py-2.5"
                          >
                            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                              <AlertCircle className={cn("h-4 w-4 shrink-0", hasOpen ? "text-amber-600" : "text-muted-foreground")} strokeWidth={1.6} />
                              <span className="font-medium text-foreground/70">A receber</span>
                            </div>
                            <div className={cn("mt-1 break-words text-base font-semibold tabular-nums", hasOpen ? "text-amber-700" : "text-foreground")}>
                              {formatCurrencyBRL(salesTotals.open)}
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={openFinancial}
                            className="min-w-0 rounded-xl border border-border bg-white px-2.5 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:px-3 sm:py-2.5"
                          >
                            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                              <BadgeDollarSign className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={1.6} />
                              <span className="font-medium text-foreground/70">Total em vendas</span>
                            </div>
                            <div className="mt-1 break-words text-base font-semibold tabular-nums text-foreground">{formatCurrencyBRL(salesTotals.total)}</div>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ABAS (hierarquia melhor: ativo evidente e inativos discretos) */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4 sm:mt-6">
          <TabsList className="grid grid-cols-3 gap-1 sm:flex sm:flex-wrap sm:items-center sm:gap-x-1 sm:gap-y-1.5 border-b border-border/40 bg-transparent p-0 rounded-none w-full h-auto min-h-9 pb-2">
              <TabsTrigger
                value="timeline"
                title="Linha do Tempo"
                style={{ ["--tab-accent" as any]: "#d97706" }}
                className="tab-prontuario-trigger tab-active-line relative -mb-px min-w-0 py-2 sm:py-1.5 px-1.5 sm:px-2 md:px-2.5 shrink-0 text-xs md:text-sm text-slate-600 hover:text-foreground rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaClock className="h-3.5 w-3.5 mr-1 md:mr-1.5 text-amber-600" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Timeline</span>
                <span className="ml-1 sm:ml-1.5 shrink-0 inline-flex items-center justify-center h-4 min-w-4 px-1 sm:px-1.5 rounded-full text-[9px] bg-muted text-foreground/70">{sortedTimelineEvents.length}</span>
              </TabsTrigger>
              <TabsTrigger
                value="appointments"
                title="Atendimento"
                style={{ ["--tab-accent" as any]: "#0d9488" }}
                className="tab-prontuario-trigger tab-active-line relative -mb-px min-w-0 py-2 sm:py-1.5 px-1.5 sm:px-2 md:px-2.5 shrink-0 text-xs md:text-sm text-slate-600 hover:text-foreground rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaStethoscope className="h-3.5 w-3.5 mr-1 md:mr-1.5 text-teal-600" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Atend.</span>
                <span className="ml-1 sm:ml-1.5 shrink-0 inline-flex items-center justify-center h-4 min-w-4 px-1 sm:px-1.5 rounded-full text-[9px] bg-muted text-foreground/70">{animalAppointments.length}</span>
              </TabsTrigger>
            <TabsTrigger
              value="prescriptions"
              title="Receitas"
              style={{ ["--tab-accent" as any]: "#047857" }}
              className="tab-prontuario-trigger tab-active-line relative -mb-px min-w-0 py-2 sm:py-1.5 px-1.5 sm:px-2 md:px-2.5 shrink-0 text-xs md:text-sm text-slate-600 hover:text-foreground rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
            >
              <FaPrescriptionBottleAlt className="h-3.5 w-3.5 mr-1 md:mr-1.5 text-emerald-700" />
              <span className="max-w-[9.5rem] md:max-w-none truncate">Receitas</span>
              <span className="ml-1 sm:ml-1.5 shrink-0 inline-flex items-center justify-center h-4 min-w-4 px-1 sm:px-1.5 rounded-full text-[9px] bg-muted text-foreground/70">{prescriptions.length}</span>
            </TabsTrigger>
              <TabsTrigger
                value="exams"
                title="Exames"
                style={{ ["--tab-accent" as any]: "hsl(var(--vf-clinical))" }}
                className="tab-prontuario-trigger tab-active-line relative -mb-px min-w-0 py-2 sm:py-1.5 px-1.5 sm:px-2 md:px-2.5 shrink-0 text-xs md:text-sm text-slate-600 hover:text-foreground rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaFlask className="h-3.5 w-3.5 mr-1 md:mr-1.5 text-vf-clinical" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Exames</span>
                <span className="ml-1 sm:ml-1.5 shrink-0 inline-flex items-center justify-center h-4 min-w-4 px-1 sm:px-1.5 rounded-full text-[9px] bg-muted text-foreground/70">{examsList.length}</span>
              </TabsTrigger>
              <TabsTrigger
                value="vaccines"
                title="Vacinas"
                style={{ ["--tab-accent" as any]: "hsl(var(--vf-clinical))" }}
                className="tab-prontuario-trigger tab-active-line relative -mb-px min-w-0 py-2 sm:py-1.5 px-1.5 sm:px-2 md:px-2.5 shrink-0 text-xs md:text-sm text-slate-600 hover:text-foreground rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaSyringe className="h-3.5 w-3.5 mr-1 md:mr-1.5 text-vf-clinical" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Vacinas</span>
                <span className="ml-1 sm:ml-1.5 shrink-0 inline-flex items-center justify-center h-4 min-w-4 px-1 sm:px-1.5 rounded-full text-[9px] bg-muted text-foreground/70">{vaccineAppointmentsCount}</span>
              </TabsTrigger>
              <TabsTrigger
                value="weight"
                title="Peso"
                style={{ ["--tab-accent" as any]: "#059669" }}
                className="tab-prontuario-trigger tab-active-line relative -mb-px min-w-0 py-2 sm:py-1.5 px-1.5 sm:px-2 md:px-2.5 shrink-0 text-xs md:text-sm text-slate-600 hover:text-foreground rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaWeightHanging className="h-3.5 w-3.5 mr-1 md:mr-1.5 text-emerald-600" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Peso</span>
                <span className="ml-1 sm:ml-1.5 shrink-0 inline-flex items-center justify-center h-4 min-w-4 px-1 sm:px-1.5 rounded-full text-[9px] bg-muted text-foreground/70">{weightHistory.length}</span>
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                title="Documentos"
                style={{ ["--tab-accent" as any]: "#475569" }}
                className="tab-prontuario-trigger tab-active-line relative -mb-px min-w-0 py-2 sm:py-1.5 px-1.5 sm:px-2 md:px-2.5 shrink-0 text-xs md:text-sm text-slate-600 hover:text-foreground rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaFileAlt className="h-3.5 w-3.5 mr-1 md:mr-1.5 text-slate-600" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Docs</span>
                <span className="ml-1 sm:ml-1.5 shrink-0 inline-flex items-center justify-center h-4 min-w-4 px-1 sm:px-1.5 rounded-full text-[9px] bg-muted text-foreground/70">{documents.length}</span>
              </TabsTrigger>

              {/* Separador visual: Clínico | Comercial */}
              <div className="hidden md:flex items-center mx-1.5 self-stretch">
                <div className="w-px h-5 bg-border/60" />
              </div>
              <span className="hidden md:inline-flex items-center text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium mr-1">Mais</span>

              <TabsTrigger
                value="observations"
                title="Observações"
                style={{ ["--tab-accent" as any]: "#e11d48" }}
                className="tab-prontuario-trigger tab-active-line relative -mb-px min-w-0 py-2 sm:py-1.5 px-1.5 sm:px-2 md:px-2.5 shrink-0 text-xs md:text-sm text-slate-600 hover:text-foreground rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaCommentAlt className="h-3.5 w-3.5 mr-1 md:mr-1.5 text-rose-600" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Observ.</span>
                <span className="ml-1 sm:ml-1.5 shrink-0 inline-flex items-center justify-center h-4 min-w-4 px-1 sm:px-1.5 rounded-full text-[9px] bg-muted text-foreground/70">{observations.length}</span>
              </TabsTrigger>
              <TabsTrigger
                value="financial"
                title="Financeiro"
                style={{ ["--tab-accent" as any]: "#F79009" }}
                className="tab-prontuario-trigger tab-active-line relative -mb-px min-w-0 py-2 sm:py-1.5 px-1.5 sm:px-2 md:px-2.5 shrink-0 text-xs md:text-sm text-slate-600 hover:text-foreground rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaMoneyBillWave className="h-3.5 w-3.5 mr-1 md:mr-1.5 text-[#F79009]" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Financeiro</span>
                <span className="ml-1 sm:ml-1.5 shrink-0 inline-flex items-center justify-center h-4 min-w-4 px-1 sm:px-1.5 rounded-full text-[9px] bg-muted text-foreground/70">{animalSalesTransactions.length}</span>
              </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4">
            <Card className="premium-card">
              <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <FaClock className="h-4 w-4 text-muted-foreground" /> Linha do Tempo
                </CardTitle>
                <p className="text-sm text-muted-foreground">Eventos clínicos em ordem cronológica (escaneável)</p>
              </CardHeader>
              <CardContent className="px-3 pb-4 pt-0 sm:px-6 sm:pb-6">
                {sortedTimelineEvents.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-4 sm:left-5 top-0 bottom-0 w-px bg-border/70" />
                    <div className="space-y-3 sm:space-y-5">
                      {sortedTimelineEvents.map((event) => {
                        const styles = getEventStyle(event.type);
                        const iconClass = getEventIconClass(event.type);
                        const isAlertObs = event.type === 'Observação' && !!event.isAlert;

                        const getRecipeVariantClass = () => {
                          const desc = (event.description || "").toLowerCase();
                          if (desc.includes("controlada")) return "badge-soft-amber";
                          if (desc.includes("manipulada")) return "badge-soft-teal";
                          return "badge-soft-green";
                        };
                        const getRecipeDotClass = () => {
                          const desc = (event.description || "").toLowerCase();
                          if (desc.includes("controlada")) return "timeline-dot-amber";
                          if (desc.includes("manipulada")) return "timeline-dot-teal";
                          return "timeline-dot-green";
                        };
                        const getRecipeIconClass = () => {
                          const desc = (event.description || "").toLowerCase();
                          if (desc.includes("controlada")) return "icon-soft-amber";
                          if (desc.includes("manipulada")) return "icon-soft-teal";
                          return "icon-soft-green";
                        };

                        const getTitle = () => {
                          if (event.type === 'Atendimento') {
                            return (event.description || "").split(":")[0]?.trim() || "Atendimento";
                          }
                          if (event.type === 'Agendamento') {
                            return (event.description || "").split(":")[0]?.trim() || "Agendamento";
                          }
                          if (event.type === 'Exame') {
                            return (event.description || "").split(":")[0]?.trim() || "Exame";
                          }
                          if (event.type === 'Vacina') {
                            return (event.description || "").split(".")[0]?.trim() || "Vacina";
                          }
                          if (event.type === 'Receita') {
                            const after = (event.description || "").split(":").slice(1).join(":").trim();
                            return after || "Receita";
                          }
                          if (event.type === 'Documento') {
                            return (event.description || "").replace(/^Documento\s*(:)?\s*/i, '').trim() || "Documento";
                          }
                          if (event.type === 'Observação') {
                            return (event.summary || "").trim() || "Observação";
                          }
                          return event.type;
                        };

                        const getSubtitle = () => {
                          if (event.type === 'Atendimento') return (event.summary || "").trim();
                          if (event.type === 'Agendamento') return (event.summary || "").trim();
                          if (event.type === 'Exame') return (event.summary || "").trim();
                          if (event.type === 'Receita') return (event.summary || "").trim();
                          if (event.type === 'Vacina') {
                            const next = (event.description || "").match(/Próxima dose:\s*(.*)$/i)?.[1];
                            return next ? `Próxima dose: ${next}` : (event.summary || "").trim();
                          }
                          return "";
                        };

                        // Agendamento cancelado ganha o mesmo destaque em vermelho do
                        // Alerta em Observação — precisa saltar aos olhos na timeline
                        // que aquele horário não aconteceu.
                        const isCancelledAgenda = event.type === 'Agendamento' && event.scheduleStatus === 'cancelled';

                        const dotClass = isAlertObs || isCancelledAgenda
                          ? "bg-red-300"
                          : (event.type === 'Receita' ? getRecipeDotClass() : styles.dot);

                        const badgeClass = isAlertObs || isCancelledAgenda
                          ? "bg-red-100 text-red-800"
                          : (event.type === 'Receita' ? getRecipeVariantClass() : styles.badge);

                        const iconColorClass = isAlertObs || isCancelledAgenda
                          ? "text-red-700"
                          : (event.type === 'Receita' ? getRecipeIconClass() : iconClass);

                        const meta = `${formatDateTime(event.date, event.time)}${event.author ? ` • ${event.author}` : ""}`;

                        const showView = !!event.link || event.type === 'Exame' || event.type === 'Atendimento' || event.type === 'Documento';
                        const onView = () => {
                          if (event.type === 'Exame') {
                            const examId = (event.id || "").replace(/^exam-/, "");
                            if (examId) navigate(subPath(`/edit-exam/${examId}`));
                            return;
                          }
                          if (event.link) {
                            if (event.link.startsWith("http") || event.link.startsWith("blob:")) window.open(event.link, "_blank");
                            else navigate(event.link);
                          }
                        };

                        const title = getTitle();
                        const subtitle = getSubtitle();

                        const MarkerIcon = getTimelineMarkerIcon(event);
                        const markerColor = getTimelineMarkerColor(dotClass);

                        return (
                          <div key={event.id} className="relative pl-10 sm:pl-11">
                            {/* Container maior, ícone no mesmo tamanho. No celular
                                o marcador encolhe e fica centrado na linha, fora do
                                card (antes ficava por cima da borda do card). */}
                            <span className="absolute left-0 top-3 h-8 w-8 sm:left-3.5 sm:top-4 sm:h-10 sm:w-10 rounded-full bg-white ring-1 ring-border flex items-center justify-center">
                              <MarkerIcon className="h-4 w-4" strokeWidth={1.6} style={{ color: markerColor }} />
                            </span>

                            <Card className="premium-card p-3 sm:p-5">
                              <div className="flex items-start justify-between gap-2 sm:gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className={cn("chip-soft shrink-0", badgeClass)}>
                                      {isAlertObs
                                        ? "Alerta"
                                        : isCancelledAgenda
                                        ? "Agendamento cancelado"
                                        : event.type === 'Receita'
                                          ? ((event.description || "").toLowerCase().includes('controlada') ? 'Receita Controlada'
                                            : (event.description || "").toLowerCase().includes('manipulada') ? 'Receita Manipulada'
                                            : 'Receita Simples')
                                          : event.type}
                                    </span>
                                    <span className="min-w-0 max-w-full break-words text-xs text-muted-foreground lg:truncate">{meta}</span>
                                  </div>

                                  <div className="mt-2 flex items-start gap-3">
                                    {/* No celular o marcador da linha já mostra o ícone —
                                        esconder este devolve ~50px pro título. */}
                                    <div className={cn("hidden sm:flex h-9 w-9 shrink-0 rounded-xl items-center justify-center bg-muted/30", iconColorClass)}>
                                      {React.createElement(event.icon, { className: "h-4 w-4" })}
                                    </div>

                                    <div className="min-w-0">
                                      <div className="text-[15px] sm:text-base font-semibold text-foreground leading-snug break-words lg:truncate">
                                        {title}
                                      </div>
                                      {subtitle && (
                                        <div className="mt-0.5 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                          {subtitle}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {showView && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onView}
                                    className="h-9 w-9 shrink-0 -mr-1 -mt-1 sm:m-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                  >
                                    <FaEye className="h-4 w-4" />
                                    <span className="sr-only">Ver</span>
                                  </Button>
                                )}
                              </div>
                            </Card>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4">Nenhum evento registrado para este paciente.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="mt-4">
            <PatientAppointmentsTab
              clientId={clientId!}
              animalId={animalId!}
              patientCode={currentAnimal?.patientCode}
              animalAppointments={animalAppointments}
              setAnimalAppointments={async () => { await refetchAppointments(); }}
            />
          </TabsContent>

          <TabsContent value="exams" className="mt-4 space-y-4">
            <React.Suspense fallback={null}>
              <ExamTrendCard
                exams={examsList}
                species={currentAnimal.species}
                onExport={async (trends, mode) => {
                  // PDF de evolução: um analito ou todos, para o tutor.
                  try {
                    const blob = await renderPdf((K) => (
                      <K.ExamEvolutionPdfContent
                        animalName={currentAnimal.name}
                        displayId={getPatientDisplayId(currentAnimal.id, currentClient?.animals)}
                        animalSpecies={currentAnimal.species}
                        animalBreed={currentAnimal.breed}
                        tutorName={currentClient?.name}
                        trends={trends}
                      />
                    ));
                    const single = trends.length === 1 ? trends[0].name : undefined;
                    const fileName = `${slugifyFileName("evolucao", single || "exames", currentAnimal.name, formatDateBRForFileName(getTodayLocalISO()))}.pdf`;
                    if (mode === "open") {
                      await openPdf({ blob, fileName, persistOptions: { folder: "exams" } });
                      return;
                    }
                    const what = single ? `de *${single}*` : "dos exames";
                    await sendPdfViaWhatsApp({
                      blob,
                      fileName,
                      folder: "exams",
                      title: single ? `Evolução — ${single}` : "Evolução dos exames",
                      intro: `Olá! Segue a evolução ${what} de *${currentAnimal.name}*, com os resultados ao longo do tempo.`,
                      dateLabel: formatDateTime(getTodayLocalISO()),
                      preview: {
                        title: `${single ? `Evolução ${single}` : "Evolução dos exames"} — ${currentAnimal.name}`,
                        description: single ? `Resultados de ${single} ao longo do tempo` : `${trends.length} exames ao longo do tempo`,
                      },
                    });
                  } catch (err) {
                    console.error("[Evolução dos exames] falhou ao gerar o PDF", err);
                    toast.error("Não consegui gerar o PDF da evolução.");
                  }
                }}
              />
            </React.Suspense>
            <Card className="vf-surface-card vf-tone-clinical card-hover rounded-md border border-border/80">
              {/* flex-col no celular: título + 2 botões numa linha só passavam
                  da largura da tela (arrasto lateral / botão por cima do título). */}
              <CardHeader className="flex flex-col gap-3 space-y-0 p-4 pb-3 sm:flex-row sm:items-center sm:justify-between sm:p-6 sm:pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaFlask className="h-5 w-5 text-primary" /> Histórico de Exames
                </CardTitle>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                  {examsList.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openExamInterpretation}
                      className="flex-1 sm:flex-none rounded-md border-primary/25 shadow-sm transition-colors hover:border-primary/40"
                    >
                      <Sparkles className="h-4 w-4 mr-2 text-primary" /> Pedir interpretação de IA
                    </Button>
                  )}
                  <Button asChild size="sm" className="flex-1 sm:flex-none rounded-md bg-[hsl(var(--vf-clinical))] font-semibold text-white transition-all duration-200 shadow-md hover:bg-[hsl(var(--vf-clinical)/0.9)] hover:shadow-lg">
                    <Link to={subPath("/add-exam")}>
                      <FaPlus className="h-4 w-4 mr-2" /> Adicionar Exame
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-4 pt-0 sm:px-6 sm:pb-6">
                {examsList.length > 0 ? (
                  <div className="space-y-3">
                    {examsList.map((exam) => {
                      const title = examDisplayName(exam);
                      const subtitle = exam.type === "Hemograma Completo"
                        ? "Hemograma Completo"
                        : exam.type === "Citologia"
                          ? (exam.cytologyEntries?.[0]?.achadoCitologico || exam.nota || "Ver detalhes")
                          : exam.type === "Teste Rápido"
                            ? (exam.rapidTestEntries?.length
                                ? exam.rapidTestEntries.map((t) => `${t.testName}: ${t.result}`).join(" · ")
                                : exam.nota || "Ver detalhes")
                            : ((exam.customBlocks?.length ? customExamSummary(exam) : exam.result) || exam.nota || "Ver detalhes");

                      return (
                        <div
                          key={exam.id}
                          className={cn(
                            "relative rounded-xl border bg-white p-3 sm:p-4 transition-all duration-200",
                            "hover:shadow-lg hover:-translate-y-0.5",
                            "border-[hsl(var(--vf-clinical))]/35 hover:shadow-[hsl(var(--vf-clinical))]/20"
                          )}
                        >
                          {/* Celular: botões numa faixa embaixo do conteúdo (antes
                              4 ícones de 40px ao lado espremiam o título pra ~100px). */}
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-2xl bg-[hsl(var(--vf-clinical))]/12 flex items-center justify-center">
                                <FaFlask className="h-5 w-5 sm:h-6 sm:w-6 text-vf-clinical" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="text-base font-bold text-vf-clinical break-words lg:truncate">{title}</div>
                                <div className="mt-1 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                  {subtitle}
                                </div>

                                <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                  <span className="inline-flex items-center gap-1.5 text-foreground/80 font-medium">
                                    <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    {formatDateTime(exam.date, exam.time)}
                                  </span>
                                  <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground font-medium">
                                    <FaStethoscope className="h-4 w-4 shrink-0" />
                                    <span className="min-w-0 break-words">{exam.vet}</span>
                                  </span>
                                  <SentBadge type="exam" id={exam.id} className={SENT_BADGE_POS} />
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-1 border-t border-border/60 pt-2 sm:shrink-0 sm:flex-nowrap sm:gap-2 sm:border-0 sm:pt-0">
                              {/* Botão: Laudo padrão (modelo atual) */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  const tutorAddress = `${currentClient.address.street}, ${currentClient.address.number} - ${currentClient.address.city} - ${currentClient.address.state}`;
                                  // Citologia não tem uma versão "completa" separada do genérico
                                  // (que ficava em branco pra esse tipo — não tem seção própria pra
                                  // cytologyEntries) — usa o mesmo laudo compacto nos dois botões.
                                  if (exam.type === "Citologia") {
                                    renderPdf((K) =>
                                      <K.ExamReportPdfContentCitologiaOnePage
                                        animalName={currentAnimal.name}
                                        animalId={currentAnimal.id}
                                        displayId={getPatientDisplayId(currentAnimal.id, currentClient.animals)}
                                        animalSpecies={currentAnimal.species}
                                        animalBreed={currentAnimal.breed}
                                        animalGender={currentAnimal.gender}
                                        animalAge={formatAgeLong(currentAnimal.birthday)}
                                        tutorName={currentClient.name}
                                        tutorAddress={tutorAddress}
                                        exam={exam}
                                      />
                                    ).then((blob) => openPdf({
                                      blob,
                                      fileName: `${slugifyFileName("laudo", exam.type, currentAnimal.name, formatDateBRForFileName(exam.date))}.pdf`,
                                      persistOptions: { folder: "exams" },
                                    })).then(() => {
                                      toast.success("Laudo de exame enviado para impressão!");
                                    }).catch((err) => {
                                      console.error(err);
                                      toast.error("Erro ao gerar o PDF.");
                                    });
                                    return;
                                  }
                                  // Teste Rápido também só tem o laudo compacto (não tem seção
                                  // própria pra rapidTestEntries no genérico) — mesmo padrão da Citologia.
                                  if (exam.type === "Teste Rápido") {
                                    renderPdf((K) =>
                                      <K.ExamReportPdfContentTesteRapidoOnePage
                                        animalName={currentAnimal.name}
                                        animalId={currentAnimal.id}
                                        displayId={getPatientDisplayId(currentAnimal.id, currentClient.animals)}
                                        animalSpecies={currentAnimal.species}
                                        animalBreed={currentAnimal.breed}
                                        animalGender={currentAnimal.gender}
                                        animalAge={formatAgeLong(currentAnimal.birthday)}
                                        tutorName={currentClient.name}
                                        tutorAddress={tutorAddress}
                                        exam={exam}
                                      />
                                    ).then((blob) => openPdf({
                                      blob,
                                      fileName: `${slugifyFileName("laudo", exam.type, currentAnimal.name, formatDateBRForFileName(exam.date))}.pdf`,
                                      persistOptions: { folder: "exams" },
                                    })).then(() => {
                                      toast.success("Laudo de exame enviado para impressão!");
                                    }).catch((err) => {
                                      console.error(err);
                                      toast.error("Erro ao gerar o PDF.");
                                    });
                                    return;
                                  }
                                  // Exame montado em blocos ("Outro", Urinálise...) tem laudo próprio.
                                  if (exam.customBlocks?.length) {
                                    renderPdf((K) =>
                                      <K.ExamReportPdfContentOutrosOnePage
                                        animalName={currentAnimal.name}
                                        animalId={currentAnimal.id}
                                        displayId={getPatientDisplayId(currentAnimal.id, currentClient.animals)}
                                        animalSpecies={currentAnimal.species}
                                        animalBreed={currentAnimal.breed}
                                        tutorName={currentClient.name}
                                        tutorAddress={tutorAddress}
                                        exam={exam}
                                      />
                                    ).then((blob) => openPdf({
                                      blob,
                                      fileName: `${slugifyFileName("laudo", examDisplayName(exam), currentAnimal.name, formatDateBRForFileName(exam.date))}.pdf`,
                                      persistOptions: { folder: "exams" },
                                    })).then(() => {
                                      toast.success("Laudo de exame enviado para impressão!");
                                    }).catch((err) => {
                                      console.error(err);
                                      toast.error("Erro ao gerar o PDF.");
                                    });
                                    return;
                                  }
                                  const hemogramRefs = await fetchHemogramReferences();
                                  renderPdf((K) =>
                                    <K.ExamReportPdfContent
                                      animalName={currentAnimal.name}
                                      animalId={currentAnimal.id}
                                      displayId={getPatientDisplayId(currentAnimal.id, currentClient.animals)}
                                      animalSpecies={currentAnimal.species}
                                      tutorName={currentClient.name}
                                      tutorAddress={tutorAddress}
                                      exam={exam}
                                      hemogramReferences={hemogramRefs}
                                    />
                                  ).then((blob) => openPdf({
                                    blob,
                                    fileName: `${slugifyFileName("laudo", exam.type, currentAnimal.name, formatDateBRForFileName(exam.date))}.pdf`,
                                    persistOptions: { folder: "exams" },
                                  })).then(() => {
                                    toast.success("Laudo de exame enviado para impressão!");
                                  }).catch((err) => {
                                    console.error(err);
                                    toast.error("Erro ao gerar o PDF.");
                                  });
                                }}
                                className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                                title="Imprimir (Modelo atual)"
                              >
                                <FaPrint className="h-4 w-4" />
                              </Button>

                              {/* Botão: Laudo compacto — versão de teste */}
                              {exam.type === "Hemograma Completo" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={async () => {
                                    const tutorAddress = `${currentClient.address.street}, ${currentClient.address.number} - ${currentClient.address.city} - ${currentClient.address.state}`;
                                    const hemogramRefs = await fetchHemogramReferences();
                                    renderPdf((K) =>
                                      <K.ExamReportPdfContentHemogramaOnePage
                                        animalName={currentAnimal.name}
                                        animalId={currentAnimal.id}
                                        displayId={getPatientDisplayId(currentAnimal.id, currentClient.animals)}
                                        animalSpecies={currentAnimal.species}
                                        animalBreed={currentAnimal.breed}
                                        tutorName={currentClient.name}
                                        tutorAddress={tutorAddress}
                                        exam={exam}
                                        hemogramReferences={hemogramRefs}
                                      />
                                    ).then((blob) => openPdf({
                                      blob,
                                      fileName: `${slugifyFileName("laudo-compacto", exam.type, currentAnimal.name, formatDateBRForFileName(exam.date))}.pdf`,
                                      persistOptions: { folder: "exams" },
                                    })).then(() => {
                                      toast.success("Laudo compacto (hemograma) gerado!");
                                    }).catch((err) => {
                                      console.error(err);
                                      toast.error("Erro ao gerar o PDF compacto.");
                                    });
                                  }}
                                  className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                                  title="Imprimir (Compacto)"
                                >
                                  <FaFileAlt className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Botão: Laudo compacto — bioquímico (mesmo padrão do compacto de hemograma) */}
                              {exam.type === "Bioquímico" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const tutorAddress = `${currentClient.address.street}, ${currentClient.address.number} - ${currentClient.address.city} - ${currentClient.address.state}`;
                                    renderPdf((K) =>
                                      <K.ExamReportPdfContentBioquimicoOnePage
                                        animalName={currentAnimal.name}
                                        animalId={currentAnimal.id}
                                        displayId={getPatientDisplayId(currentAnimal.id, currentClient.animals)}
                                        animalSpecies={currentAnimal.species}
                                        animalBreed={currentAnimal.breed}
                                        tutorName={currentClient.name}
                                        tutorAddress={tutorAddress}
                                        exam={exam}
                                      />
                                    ).then((blob) => openPdf({
                                      blob,
                                      fileName: `${slugifyFileName("laudo-compacto", exam.type, currentAnimal.name, formatDateBRForFileName(exam.date))}.pdf`,
                                      persistOptions: { folder: "exams" },
                                    })).then(() => {
                                      toast.success("Laudo compacto (bioquímico) gerado!");
                                    }).catch((err) => {
                                      console.error(err);
                                      toast.error("Erro ao gerar o PDF compacto.");
                                    });
                                  }}
                                  className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                                  title="Imprimir (Compacto)"
                                >
                                  <FaFileAlt className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Botão: Enviar exame por WhatsApp (com link do PDF) */}
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                title="Enviar exame por WhatsApp (com link do PDF, sem precisar anexar)"
                                onClick={async () => {
                                  if (!currentClient || !currentAnimal) {
                                    toast.error("Erro: Dados do cliente ou animal não disponíveis.");
                                    return;
                                  }
                                  try {
                                    const tutorAddress = `${currentClient.address.street}, ${currentClient.address.number} - ${currentClient.address.city} - ${currentClient.address.state}`;
                                    const displayId = getPatientDisplayId(currentAnimal.id, currentClient.animals);
                                    const blob = exam.type === "Hemograma Completo"
                                      ? await renderPdf(async (K) =>
                                          <K.ExamReportPdfContentHemogramaOnePage
                                            animalName={currentAnimal.name}
                                            animalId={currentAnimal.id}
                                            displayId={displayId}
                                            animalSpecies={currentAnimal.species}
                                            animalBreed={currentAnimal.breed}
                                            tutorName={currentClient.name}
                                            tutorAddress={tutorAddress}
                                            exam={exam}
                                            hemogramReferences={await fetchHemogramReferences()}
                                          />
                                        )
                                      : exam.type === "Bioquímico"
                                        ? await renderPdf((K) =>
                                            <K.ExamReportPdfContentBioquimicoOnePage
                                              animalName={currentAnimal.name}
                                              animalId={currentAnimal.id}
                                              displayId={displayId}
                                              animalSpecies={currentAnimal.species}
                                              animalBreed={currentAnimal.breed}
                                              tutorName={currentClient.name}
                                              tutorAddress={tutorAddress}
                                              exam={exam}
                                            />
                                          )
                                        : exam.type === "Citologia"
                                          ? await renderPdf((K) =>
                                              <K.ExamReportPdfContentCitologiaOnePage
                                                animalName={currentAnimal.name}
                                                animalId={currentAnimal.id}
                                                displayId={displayId}
                                                animalSpecies={currentAnimal.species}
                                                animalBreed={currentAnimal.breed}
                                                animalGender={currentAnimal.gender}
                                                animalAge={formatAgeLong(currentAnimal.birthday)}
                                                tutorName={currentClient.name}
                                                tutorAddress={tutorAddress}
                                                exam={exam}
                                              />
                                            )
                                          : exam.type === "Teste Rápido"
                                            ? await renderPdf((K) =>
                                                <K.ExamReportPdfContentTesteRapidoOnePage
                                                  animalName={currentAnimal.name}
                                                  animalId={currentAnimal.id}
                                                  displayId={displayId}
                                                  animalSpecies={currentAnimal.species}
                                                  animalBreed={currentAnimal.breed}
                                                  animalGender={currentAnimal.gender}
                                                  animalAge={formatAgeLong(currentAnimal.birthday)}
                                                  tutorName={currentClient.name}
                                                  tutorAddress={tutorAddress}
                                                  exam={exam}
                                                />
                                              )
                                          : exam.customBlocks?.length
                                            ? await renderPdf((K) =>
                                                <K.ExamReportPdfContentOutrosOnePage
                                                  animalName={currentAnimal.name}
                                                  animalId={currentAnimal.id}
                                                  displayId={displayId}
                                                  animalSpecies={currentAnimal.species}
                                                  animalBreed={currentAnimal.breed}
                                                  tutorName={currentClient.name}
                                                  tutorAddress={tutorAddress}
                                                  exam={exam}
                                                />
                                              )
                                          : await renderPdf(async (K) =>
                                            <K.ExamReportPdfContent
                                              animalName={currentAnimal.name}
                                              animalId={currentAnimal.id}
                                              displayId={displayId}
                                              animalSpecies={currentAnimal.species}
                                              tutorName={currentClient.name}
                                              tutorAddress={tutorAddress}
                                              exam={exam}
                                              hemogramReferences={await fetchHemogramReferences()}
                                            />
                                          );
                                    await sendPdfViaWhatsApp({
                                      blob,
                                      fileName: `${slugifyFileName("laudo", examDisplayName(exam), currentAnimal.name, formatDateBRForFileName(exam.date))}.pdf`,
                                      folder: "exams",
                                      track: { type: "exam", id: exam.id, animalId: currentAnimal.id },
                                      title: `Resultado de Exame — ${examDisplayName(exam)}`,
                                      intro: `Olá! Segue o resultado do exame *${examDisplayName(exam)}* de *${currentAnimal.name}*.`,
                                      dateLabel: formatDateTime(exam.date, exam.time),
                                      preview: {
                                        title: `${examDisplayName(exam)} — ${currentAnimal.name}`,
                                        description: `Resultado de exame · ${formatDateTime(exam.date, exam.time)}`,
                                      },
                                    });
                                  } catch (err) {
                                    console.error("[Enviar exame por WhatsApp] falhou ao gerar o PDF", err);
                                    toast.error("Não consegui gerar o PDF deste exame para enviar por WhatsApp.");
                                  }
                                }}
                                className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                              >
                                <SiWhatsapp className="h-5 w-5 text-[#25D366]" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(subPath(`/edit-exam/${exam.id}`))}
                                className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                                title="Editar"
                              >
                                <FaEdit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4">Nenhum exame registrado.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vaccines" className="mt-4">
            <PatientVaccinesTab
              clientId={clientId!}
              animalId={animalId!}
              patientCode={currentAnimal?.patientCode}
              animalAppointments={animalAppointments}
              setAnimalAppointments={async () => { await refetchAppointments(); }}
            />
          </TabsContent>

          <TabsContent value="weight" className="mt-4">
            <Card className="vf-surface-card vf-tone-clinical card-hover rounded-md border border-border/80">
              <CardHeader className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between space-y-0 p-4 pb-3 sm:p-6 sm:pb-3 gap-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaWeightHanging className="h-5 w-5 text-primary" /> Histórico de Peso
                </CardTitle>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:items-center">
                  <Input
                    type="date"
                    value={newWeightDate}
                    onChange={(e) => setNewWeightDate(e.target.value)}
                    className="min-w-0 w-full sm:w-[150px] bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                  />
                  <WeightInput
                    placeholder="Peso (kg)"
                    value={newWeight}
                    onChange={(v) => setNewWeight(v)}
                    className="min-w-0 w-full sm:w-[120px] bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                  />
                  <Button size="sm" onClick={async () => {
                    if (newWeight !== "" && newWeightDate) {
                      const entryTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                      const success = await updateAnimalDetails(clientId!, animalId!, {
                        weight: Number(newWeight),
                        lastWeightSource: "Manual",
                      }, { date: newWeightDate, time: entryTime });
                      if (success) {
                        await queryClient.invalidateQueries({ queryKey: ["clients-with-animals"] });
                        await queryClient.invalidateQueries({ queryKey: ["client-with-animals", clientId] });
                        await refetchWeightHistory();
                        setNewWeight("");
                        setNewWeightDate(new Date().toISOString().split('T')[0]);
                        toast.success("Peso adicionado ao histórico!");
                      } else {
                        toast.error("Erro ao adicionar peso.");
                      }
                    }
                  }} disabled={newWeight === ""} className="col-span-2 w-full sm:w-auto rounded-md bg-[hsl(var(--vf-clinical))] font-semibold text-white transition-all duration-200 shadow-md hover:bg-[hsl(var(--vf-clinical)/0.9)] hover:shadow-lg">
                    <FaPlus className="h-4 w-4 mr-2" /> Adicionar Peso
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-4 pt-0 sm:px-6 sm:pb-6">
                {sortedWeightHistory.length > 0 ? (
                  <div className="space-y-3">
                    {sortedWeightHistory.map((entry, idx) => {
                      const prevEntry = sortedWeightHistory[idx + 1];
                      const weightDiff = prevEntry ? entry.weight - prevEntry.weight : 0;
                      const isIncrease = weightDiff > 0;
                      const isDecrease = weightDiff < 0;
                      const diffPercent = prevEntry ? ((weightDiff / prevEntry.weight) * 100).toFixed(1) : "0";

                      return (
                        <div
                          key={entry.id}
                          className="premium-card rounded-xl p-3 sm:p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border-emerald-200 hover:shadow-emerald-200/60"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-2xl bg-emerald-50/70 flex items-center justify-center">
                                <FaWeightHanging className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 text-base font-bold text-emerald-900">
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

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setSelectedWeight(entry); setWeightModalOpen(true); }}
                              className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                            >
                              <FaEye className="h-4 w-4" />
                            </Button>
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
            <Card className="vf-surface-card vf-tone-clinical card-hover rounded-md border border-border/80">
              <CardHeader className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between space-y-0 p-4 pb-3 sm:p-6 sm:pb-3 gap-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaFileAlt className="h-5 w-5 text-primary" /> Documentos
                </CardTitle>
                {canEditPrescriptions ? (
                  <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
                    <Button size="sm" asChild className="rounded-md bg-[hsl(var(--vf-clinical))] font-semibold text-white transition-all duration-200 shadow-md hover:bg-[hsl(var(--vf-clinical)/0.9)] hover:shadow-lg">
                      <Link to={subPath("/emit-document")}>
                        <FaFileAlt className="h-4 w-4 mr-2" /> Emitir termo/atestado
                        <span className="ml-2 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">Modelo oficial</span>
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild className="rounded-md border-[hsl(var(--vf-clinical)/0.4)] font-semibold text-[hsl(var(--vf-clinical))] hover:bg-[hsl(var(--vf-clinical)/0.08)]">
                      <Link to={subPath("/add-exam-request")}>
                        <FaPlus className="h-4 w-4 mr-2" /> Pedido de exame
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild className="rounded-md border-[hsl(var(--vf-clinical)/0.4)] font-semibold text-[hsl(var(--vf-clinical))] hover:bg-[hsl(var(--vf-clinical)/0.08)]">
                      <Link to={subPath("/add-document")}>
                        <FaPlus className="h-4 w-4 mr-2" /> Cadastrar documento livre
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </CardHeader>
              <CardContent className="px-3 pb-4 pt-0 sm:px-6 sm:pb-6">
                {documents.length > 0 ? (
                  <div className="space-y-3">
                    {documents.map((doc) => {
                      const examRequestData = doc.source === "editor" && doc.content ? extractExamRequestData(doc.content) : null;
                      // Assinaturas já coletadas (ver "Assinar" abaixo) — esses documentos
                      // não têm PDF "final" persistido, então cada visualização/download/
                      // envio busca de novo e já sai com as assinaturas, se houver.
                      const getAssinaturasForPdf = async () => {
                        const rows = await getPatientDocumentSignatures(doc.id);
                        const vet = rows.find((r) => r.tipo === "veterinario");
                        const resp = rows.find((r) => r.tipo === "responsavel");
                        if (!vet && !resp) return undefined;
                        return {
                          veterinario: vet ? { nome: vet.nome, funcao: vet.funcao || undefined, imagemUrl: vet.imagemUrl } : undefined,
                          responsavel: resp ? { nome: resp.nome, funcao: resp.funcao || undefined, imagemUrl: resp.imagemUrl } : undefined,
                        };
                      };
                      const onView = async () => {
                        if (doc.source === "editor" && doc.content) {
                          try {
                            const blob = examRequestData
                              ? await renderPdf((K) => <K.ExamRequestPdfContent data={examRequestData} />)
                              : await renderPdf(async (K) =>
                                  <K.DocumentPdfContent
                                    documentName={doc.name}
                                    content={replaceTemplateVariables(doc.content || "", currentAnimal, currentClient, currentUserProfile)}
                                    assinaturas={await getAssinaturasForPdf()}
                                  />
                                );
                            await openPdf({
                              blob,
                              fileName: `${doc.name}.pdf`,
                              persistOptions: { folder: "documents/generated" },
                            });
                          } catch (err) {
                            // eslint-disable-next-line no-console
                            console.error("[pdf-error] Erro ao gerar PDF para document", doc.name, err);
                            toast.error("Erro ao gerar PDF.");
                          }
                        } else if (doc.fileUrl) {
                          if (doc.fileUrl.startsWith("data:")) {
                            try {
                              const [header, base64] = doc.fileUrl.split(",");
                              const mime = header.match(/:(.*?);/)?.[1] || "application/octet-stream";
                              const binary = atob(base64);
                              const arr = new Uint8Array(binary.length);
                              for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
                              const blob = new Blob([arr], { type: mime });
                              const url = URL.createObjectURL(blob);
                              window.open(url, "_blank");
                              setTimeout(() => URL.revokeObjectURL(url), 60000);
                            } catch {
                              window.open(doc.fileUrl, "_blank");
                            }
                          } else {
                            window.open(doc.fileUrl, "_blank");
                          }
                        }
                      };
                      const onDownload = async () => {
                        if (doc.source === "editor" && doc.content) {
                          try {
                            const blob = examRequestData
                              ? await renderPdf((K) => <K.ExamRequestPdfContent data={examRequestData} />)
                              : await renderPdf(async (K) =>
                                  <K.DocumentPdfContent
                                    documentName={doc.name}
                                    content={replaceTemplateVariables(doc.content || "", currentAnimal, currentClient, currentUserProfile)}
                                    assinaturas={await getAssinaturasForPdf()}
                                  />
                                );
                            await downloadPdf({
                              blob,
                              fileName: `${slugifyFileName(doc.name)}.pdf`,
                              persistOptions: { folder: "documents/generated" },
                            });
                          } catch (err) {
                            console.error("[pdf-error] Erro ao baixar PDF do documento", doc.name, err);
                            toast.error("Erro ao baixar o PDF.");
                          }
                        } else if (doc.fileUrl) {
                          const a = document.createElement("a");
                          a.href = doc.fileUrl;
                          a.download = doc.name;
                          a.target = "_blank";
                          a.click();
                        }
                      };
                      // Mesmo PDF do onView/onDownload; pro arquivo avulso (doc.fileUrl)
                      // decodifica o data: URI (upload local) ou busca a URL (já
                      // hospedado) pra virar Blob — sendPdfViaWhatsApp precisa de Blob,
                      // não de link, pra poder subir e gerar o link curto do WhatsApp.
                      const buildDocumentBlob = async (): Promise<Blob | null> => {
                        if (doc.source === "editor" && doc.content) {
                          return examRequestData
                            ? await renderPdf((K) => <K.ExamRequestPdfContent data={examRequestData} />)
                            : await renderPdf(async (K) =>
                                <K.DocumentPdfContent
                                  documentName={doc.name}
                                  content={replaceTemplateVariables(doc.content || "", currentAnimal, currentClient, currentUserProfile)}
                                  assinaturas={await getAssinaturasForPdf()}
                                />
                              );
                        }
                        if (doc.fileUrl) {
                          if (doc.fileUrl.startsWith("data:")) {
                            const [header, base64] = doc.fileUrl.split(",");
                            const mime = header.match(/:(.*?);/)?.[1] || "application/octet-stream";
                            const binary = atob(base64);
                            const arr = new Uint8Array(binary.length);
                            for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
                            return new Blob([arr], { type: mime });
                          }
                          const resp = await fetch(doc.fileUrl);
                          return await resp.blob();
                        }
                        return null;
                      };
                      const onSendWhatsApp = async () => {
                        try {
                          const blob = await buildDocumentBlob();
                          if (!blob) {
                            toast.error("Não consegui carregar este documento para enviar.");
                            return;
                          }
                          await sendPdfViaWhatsApp({
                            blob,
                            fileName: `${slugifyFileName(doc.name)}.pdf`,
                            track: { type: "document", id: doc.id, animalId: currentAnimal?.id },
                            folder: "documents/generated",
                            title: doc.name,
                            intro: `Olá! Segue o documento *${doc.name}* de *${currentAnimal.name}*.`,
                            dateLabel: formatDateTime(doc.date, doc.time),
                            preview: {
                              title: `${doc.name} — ${currentAnimal.name}`,
                              description: `Documento · ${formatDateTime(doc.date, doc.time)}`,
                            },
                          });
                        } catch (err) {
                          console.error("[Enviar documento por WhatsApp] falhou ao gerar o PDF", doc.name, err);
                          toast.error("Não consegui gerar o PDF deste documento para enviar por WhatsApp.");
                        }
                      };
                      return (
                        <div
                          key={doc.id}
                          className={cn(
                            "relative rounded-xl border bg-white p-3 sm:p-4 transition-all duration-200",
                            "hover:shadow-lg hover:-translate-y-0.5",
                            "border-slate-200 hover:shadow-slate-200/60"
                          )}
                        >
                          {/* Celular: até 6 botões numa faixa embaixo — ao lado do
                              nome eles ocupavam ~280px e o nome sumia. */}
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-2xl bg-slate-50/70 flex items-center justify-center">
                                <FaFileAlt className="h-5 w-5 sm:h-6 sm:w-6 text-slate-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 text-base font-bold text-slate-900">
                                  <span className="min-w-0 break-words lg:truncate">{doc.name}</span>
                                  {doc.source === "editor" && (
                                    <span className="text-xs font-normal text-muted-foreground">(editor)</span>
                                  )}
                                </div>
                                <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                  <span className="inline-flex items-center gap-1.5 text-foreground/80 font-medium">
                                    <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    {formatDateTime(doc.date, doc.time)}
                                  </span>
                                  <SentBadge type="document" id={doc.id} className={SENT_BADGE_POS} />
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-1 border-t border-border/60 pt-2 sm:shrink-0 sm:flex-nowrap sm:gap-2 sm:border-0 sm:pt-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={onView}
                                className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                                title={doc.source === "editor" ? "Imprimir / PDF" : "Visualizar"}
                              >
                                {doc.source === "editor" ? <FaPrint className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={onSendWhatsApp}
                                className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                                title="Enviar documento por WhatsApp (com link do PDF, sem precisar anexar)"
                              >
                                <SiWhatsapp className="h-5 w-5 text-[#25D366]" />
                              </Button>
                              {doc.source === "editor" && !examRequestData && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setSignDocTarget(doc)}
                                  className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                                  title="Revisar e assinar agora (veterinário e responsável, na tela)"
                                >
                                  <FaFileSignature className="h-4 w-4" />
                                </Button>
                              )}
                              {doc.source === "editor" && canEditPrescriptions && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  asChild
                                  className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                                  title="Editar"
                                >
                                  <Link to={subPath(`/add-document?edit=${encodeURIComponent(doc.id)}`)}>
                                    <FaEdit className="h-4 w-4" />
                                  </Link>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={onDownload}
                                className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                                title="Download"
                              >
                                <FaDownload className="h-4 w-4" />
                              </Button>
                              {canEditPrescriptions ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDocumentDeleteId(doc.id)}
                                  className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                                  title="Excluir"
                                >
                                  <FaTrashAlt className="h-4 w-4 text-destructive" />
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4">Nenhum documento registrado. Use &quot;Emitir termo/atestado&quot; para os 30 modelos oficiais (CFMV) ou &quot;Cadastrar documento livre&quot; para enviar um arquivo avulso.</p>
                )}
              </CardContent>
            </Card>

            {clientId && animalId && (
              <DocumentTimeline pacienteId={animalId} clientId={clientId} animalId={animalId} patientCode={currentAnimal?.patientCode} />
            )}

            {signDocTarget && currentAnimal && currentClient && (
              <PatientDocumentSignDialog
                doc={signDocTarget}
                previewHtml={replaceTemplateVariables(signDocTarget.content || "", currentAnimal, currentClient, currentUserProfile)}
                respNome={currentClient.name}
                respCpf={currentClient.identificationNumber}
                onClose={() => setSignDocTarget(null)}
                onSigned={() => {
                  toast.success("Assinaturas concluídas.");
                  setSignDocTarget(null);
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="prescriptions" className="mt-4">
            {canEditPrescriptions ? (
              // 3 colunas desde o celular: empilhados, os 3 cartões grandes
              // (p-6, ícone de 48px) ocupavam uma tela inteira antes da lista de
              // receitas. No celular viram botões compactos (ícone + nome).
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <Link to={subPath("/add-prescription?type=simple")} className="min-w-0">
                  <Card className="vf-surface-card vf-tone-clinical card-hover flex h-full flex-col items-center justify-center rounded-md border border-border/80 p-3 sm:p-6 text-center">
                    <FaFileMedical className="h-7 w-7 sm:h-12 sm:w-12 text-primary mb-2 sm:mb-3" />
                    <CardTitle className="text-sm sm:text-lg leading-tight font-semibold text-foreground">Receita Simples</CardTitle>
                    <p className="hidden sm:block text-sm text-muted-foreground mt-1">Medicamentos de uso comum</p>
                  </Card>
                </Link>
                <Link to={subPath("/add-prescription?type=controlled")} className="min-w-0">
                  <Card className="vf-surface-card vf-tone-clinical card-hover flex h-full flex-col items-center justify-center rounded-md border border-border/80 p-3 sm:p-6 text-center">
                    <FaExclamationTriangle className="h-7 w-7 sm:h-12 sm:w-12 text-destructive mb-2 sm:mb-3" />
                    <CardTitle className="text-sm sm:text-lg leading-tight font-semibold text-foreground">Receita Controlada</CardTitle>
                    <p className="hidden sm:block text-sm text-muted-foreground mt-1">Medicamentos controlados</p>
                  </Card>
                </Link>
                <Link to={subPath("/add-prescription?type=manipulated")} className="min-w-0">
                  <Card className="vf-surface-card vf-tone-clinical card-hover flex h-full flex-col items-center justify-center rounded-md border border-border/80 p-3 sm:p-6 text-center">
                    <FaFlask className="h-7 w-7 sm:h-12 sm:w-12 text-vf-clinical mb-2 sm:mb-3" />
                    <CardTitle className="text-sm sm:text-lg leading-tight font-semibold text-foreground">Receita Manipulada</CardTitle>
                    <p className="hidden sm:block text-sm text-muted-foreground mt-1">Medicamentos manipulados</p>
                  </Card>
                </Link>
              </div>
            ) : (
              <p className="mb-6 text-sm text-muted-foreground">
                Seu perfil possui acesso somente de visualização para receitas e documentos.
              </p>
            )}

            <Card className="vf-surface-card vf-tone-clinical card-hover rounded-md border border-border/80">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-3 sm:p-6 sm:pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaPrescriptionBottleAlt className="h-5 w-5 text-primary" /> Prescrições Recentes
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-4 pt-0 sm:px-6 sm:pb-6">
                {prescriptions.length > 0 ? (
                  <div className="space-y-3">
                    {sortedPrescriptions.map((rx) => {
                      const isSimple = rx.type === 'simple';
                      const isControlled = rx.type === 'controlled';
                      const isManipulated = rx.type === 'manipulated';

                      const borderClass = isControlled
                        ? "border-destructive/35 hover:shadow-destructive/20"
                        : isManipulated
                          ? "border-[hsl(var(--vf-clinical))]/35 hover:shadow-[hsl(var(--vf-clinical))]/20"
                          : "border-primary/35 hover:shadow-primary/20";

                      const iconWrapClass = isControlled
                        ? "bg-destructive/12"
                        : isManipulated
                          ? "bg-[hsl(var(--vf-clinical))]/12"
                          : "bg-primary/12";

                      const iconClass = isControlled
                        ? "text-destructive"
                        : isManipulated
                          ? "text-vf-clinical"
                          : "text-primary";

                      const label = isControlled
                        ? "Receita Controlada"
                        : isManipulated
                          ? "Receita Manipulada"
                          : "Receita Simples";

                      const title = rx.treatmentDescription || "Receita sem descrição";
                      const subtitle = rx.instructions || rx.medicationName || "";

                      return (
                        <div
                          key={rx.id}
                          className={cn(
                            "relative rounded-xl border bg-white p-3 sm:p-4 transition-all duration-200",
                            "hover:shadow-lg hover:-translate-y-0.5",
                            borderClass
                          )}
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <div className={cn("h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-2xl flex items-center justify-center", iconWrapClass)}>
                                <FaPrescriptionBottleAlt className={cn("h-5 w-5 sm:h-6 sm:w-6", iconClass)} />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className={cn(
                                    "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-wider sm:tracking-widest",
                                    isControlled
                                      ? "bg-destructive/15 text-destructive"
                                      : isManipulated
                                        ? "bg-[hsl(var(--vf-clinical))]/15 text-vf-clinical"
                                        : "bg-primary/15 text-primary"
                                  )}>
                                    {label}
                                  </span>
                                  <span className="text-xs text-muted-foreground">{formatDateTime(rx.date, rx.time)}</span>
                                  <SentBadge type="prescription" id={rx.id} className={SENT_BADGE_POS} />
                                </div>

                                <div className={cn("mt-2 break-words text-[15px] sm:text-base font-semibold leading-snug", iconClass)}>
                                  {title}
                                </div>
                                {subtitle ? (
                                  <div className="mt-1 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                    {subtitle}
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-1 border-t border-border/60 pt-2 sm:shrink-0 sm:flex-nowrap sm:gap-2 sm:border-0 sm:pt-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (!currentClient || !currentAnimal) {
                                    toast.error("Erro: Dados do cliente ou animal não disponíveis para impressão.");
                                    return;
                                  }
                                  renderPdf((K) =>
                                    K.PrescriptionPdfContent({
                                      animalName: currentAnimal.name,
                                      animalId: currentAnimal.id,
                                      displayId: getPatientDisplayId(currentAnimal.id, currentClient.animals),
                                      animalSpecies: currentAnimal.species,
                                      animalBreed: currentAnimal.breed,
                                      animalSex: currentAnimal.gender,
                                      animalBirthday: currentAnimal.birthday,
                                      animalWeight: currentAnimal.weight,
                                      animalMicrochip: currentAnimal.microchip,
                                      tutorName: currentClient.name,
                                      tutorAddress: (currentClient.address?.street ?? "") + ", " + (currentClient.address?.number ?? "") + " - " + (currentClient.address?.city ?? "") + " - " + (currentClient.address?.state ?? ""),
                                      tutorDocument: currentClient.identificationNumber,
                                      tutorPhone: currentClient.mainPhoneContact,
                                      medications: rx.medications || [],
                                      generalObservations: rx.instructions,
                                      showElectronicSignatureText: false,
                                      prescriptionType: rx.type,
                                      pharmacistName: "Farmacêutico(a) Responsável",
                                      pharmacistCpf: "CPF: 000.000.000-00",
                                      pharmacistCfr: "CRF: 00000",
                                      pharmacistAddress: "Endereço da Farmácia, 000 - Cidade - UF",
                                      pharmacistPhone: "Telefone: (00) 00000-0000",
                                      manipulatedPrescription: rx.manipulatedPrescription,
                                      userProfile: currentUserProfile,
                                    })
                                  ).then((blob) => openPdf({
                                    blob,
                                    fileName: `${slugifyFileName("receita", currentAnimal.name, rx.date ? formatDateBRForFileName(rx.date) : "sem-data")}.pdf`,
                                    persistOptions: { folder: "prescriptions" },
                                  })).then(() => {
                                    toast.success("Receita enviada para impressão!");
                                  });
                                }}
                                className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                                title="Imprimir"
                              >
                                <FaPrint className="h-4 w-4 text-slate-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (!currentClient || !currentAnimal) {
                                    toast.error("Erro: Dados do cliente ou animal não disponíveis.");
                                    return;
                                  }
                                  renderPdf((K) =>
                                    K.PrescriptionPdfContent({
                                      animalName: currentAnimal.name,
                                      animalId: currentAnimal.id,
                                      displayId: getPatientDisplayId(currentAnimal.id, currentClient.animals),
                                      animalSpecies: currentAnimal.species,
                                      animalBreed: currentAnimal.breed,
                                      animalSex: currentAnimal.gender,
                                      animalBirthday: currentAnimal.birthday,
                                      animalWeight: currentAnimal.weight,
                                      animalMicrochip: currentAnimal.microchip,
                                      tutorName: currentClient.name,
                                      tutorAddress: (currentClient.address?.street ?? "") + ", " + (currentClient.address?.number ?? "") + " - " + (currentClient.address?.city ?? "") + " - " + (currentClient.address?.state ?? ""),
                                      tutorDocument: currentClient.identificationNumber,
                                      tutorPhone: currentClient.mainPhoneContact,
                                      medications: rx.medications || [],
                                      generalObservations: rx.instructions,
                                      showElectronicSignatureText: true,
                                      prescriptionType: rx.type,
                                      pharmacistName: "Farmacêutico(a) Responsável",
                                      pharmacistCpf: "CPF: 000.000.000-00",
                                      pharmacistCfr: "CRF: 00000",
                                      pharmacistAddress: "Endereço da Farmácia, 000 - Cidade - UF",
                                      pharmacistPhone: "Telefone: (00) 00000-0000",
                                      manipulatedPrescription: rx.manipulatedPrescription,
                                      userProfile: currentUserProfile,
                                    })
                                  ).then((blob) => downloadPdf({
                                    blob,
                                    fileName: `${slugifyFileName("receita", currentAnimal.name, rx.date ? formatDateBRForFileName(rx.date) : "sem-data")}.pdf`,
                                    persistOptions: { folder: "prescriptions" },
                                  })).then(() => {
                                    toast.success("PDF baixado.");
                                  });
                                }}
                                className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                                title="Baixar PDF"
                              >
                                <FaDownload className="h-4 w-4 text-slate-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                                title="Enviar receita por WhatsApp (com link do PDF, sem precisar anexar)"
                                onClick={async () => {
                                  if (!currentClient || !currentAnimal) {
                                    toast.error("Erro: Dados do cliente ou animal não disponíveis.");
                                    return;
                                  }
                                  const blob = await renderPdf((K) =>
                                    K.PrescriptionPdfContent({
                                      animalName: currentAnimal.name,
                                      animalId: currentAnimal.id,
                                      displayId: getPatientDisplayId(currentAnimal.id, currentClient.animals),
                                      animalSpecies: currentAnimal.species,
                                      animalBreed: currentAnimal.breed,
                                      animalSex: currentAnimal.gender,
                                      animalBirthday: currentAnimal.birthday,
                                      animalWeight: currentAnimal.weight,
                                      animalMicrochip: currentAnimal.microchip,
                                      tutorName: currentClient.name,
                                      tutorAddress: (currentClient.address?.street ?? "") + ", " + (currentClient.address?.number ?? "") + " - " + (currentClient.address?.city ?? "") + " - " + (currentClient.address?.state ?? ""),
                                      tutorDocument: currentClient.identificationNumber,
                                      tutorPhone: currentClient.mainPhoneContact,
                                      medications: rx.medications || [],
                                      generalObservations: rx.instructions,
                                      showElectronicSignatureText: true,
                                      prescriptionType: rx.type,
                                      pharmacistName: "Farmacêutico(a) Responsável",
                                      pharmacistCpf: "CPF: 000.000.000-00",
                                      pharmacistCfr: "CRF: 00000",
                                      pharmacistAddress: "Endereço da Farmácia, 000 - Cidade - UF",
                                      pharmacistPhone: "Telefone: (00) 00000-0000",
                                      manipulatedPrescription: rx.manipulatedPrescription,
                                      userProfile: currentUserProfile,
                                    })
                                  );
                                  await sendPdfViaWhatsApp({
                                    blob,
                                    fileName: `${slugifyFileName("receita", currentAnimal.name, rx.date ? formatDateBRForFileName(rx.date) : "sem-data")}.pdf`,
                                    folder: "prescriptions",
                                    track: { type: "prescription", id: rx.id, animalId: currentAnimal.id },
                                    title: "Receita Veterinária",
                                    intro: `Olá! Segue a receita de *${currentAnimal.name}*.`,
                                    dateLabel: formatDateTime(rx.date, rx.time),
                                    preview: {
                                      title: `${rx.type === "controlled" ? "Receita controlada" : rx.type === "manipulated" ? "Receita manipulada" : "Receita"} — ${currentAnimal.name}`,
                                      description: `Receita veterinária · ${formatDateTime(rx.date, rx.time)}`,
                                    },
                                  });
                                }}
                              >
                                <SiWhatsapp className="h-5 w-5 text-[#25D366]" />
                              </Button>
                              {canEditPrescriptions ? (
                                // Repetir: abre uma receita NOVA já preenchida com estes
                                // medicamentos (renovação de uso contínuo sem redigitar).
                                <Button asChild variant="ghost" size="icon" className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200" title="Repetir receita (cria uma nova com estes medicamentos)">
                                  <Link to={subPath(`/add-prescription?type=${rx.type}&from=${rx.id}`)} aria-label="Repetir receita">
                                    <FaCopy className="h-4 w-4 text-slate-600" />
                                  </Link>
                                </Button>
                              ) : null}
                              {canEditPrescriptions ? (
                                <Link to={subPath(`/edit-prescription/${rx.id}?type=${rx.type}`)}>
                                  <Button variant="ghost" size="icon" className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200" title="Editar">
                                    <FaEdit className="h-4 w-4 text-slate-600" />
                                  </Button>
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-4 py-4">Nenhuma receita registrada.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="observations" className="mt-4">
            <Card className="vf-surface-card vf-tone-clinical card-hover rounded-md border border-border/80">
              <CardHeader className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between space-y-0 p-4 pb-3 sm:p-6 sm:pb-3 gap-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaCommentAlt className="h-5 w-5 text-primary" /> Observações Gerais
                </CardTitle>
                <Button size="sm" onClick={async () => {
                  if (newObservation.trim() && animalId) {
                    const created = await observationsApi.addObservation(animalId, {
                      observation: newObservation.trim(),
                      displayAsAlert: newObservationAlert,
                      createdBy: currentVetName,
                    });
                    if (!created) {
                      toast.error("Falha ao salvar observação.");
                      return;
                    }
                    await refetchObservations();
                    setNewObservation("");
                    setNewObservationAlert(false);
                  }
                }} disabled={isObservationEmpty} className="w-full sm:w-auto rounded-md bg-[hsl(var(--vf-clinical))] font-semibold text-white transition-all duration-200 shadow-md hover:bg-[hsl(var(--vf-clinical)/0.9)] hover:shadow-lg">
                  <FaPlus className="h-4 w-4 mr-2" /> Adicionar Observação
                </Button>
              </CardHeader>
              <CardContent className="px-3 pb-4 pt-0 sm:px-6 sm:pb-6">
                <div className="mb-4 space-y-3">
                  <Textarea
                    placeholder="Adicione uma nova observação..."
                    value={newObservation ?? ""}
                    onChange={(e) => setNewObservation(e.target.value)}
                    className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                  />
                  <label className="flex items-center gap-2 text-sm text-[#374151]">
                    <Checkbox checked={newObservationAlert} onCheckedChange={(v) => setNewObservationAlert(!!v)} />
                    Exibir como Alerta no Prontuário
                  </label>
                </div>

                {sortedObservations.length > 0 ? (
                  <div className="space-y-3">
                    {sortedObservations.map((obs) => {
                      const isAlert = !!obs.displayAsAlert;

                      const onEdit = () => {
                        setSelectedObservation(obs);
                        setObservationEditText(obs.observation);
                        setObservationEditAlert(!!obs.displayAsAlert);
                        setObservationEditOpen(true);
                      };

                      return (
                        <div
                          key={obs.id}
                          className={cn(
                            "relative rounded-xl border bg-white p-3 sm:p-4 transition-all duration-200",
                            "hover:shadow-lg hover:-translate-y-0.5",
                            isAlert
                              ? "border-red-200 hover:shadow-red-200/60"
                              : "border-slate-200 hover:shadow-slate-200/60"
                          )}
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <div
                                className={cn(
                                  "h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-2xl flex items-center justify-center",
                                  isAlert ? "bg-red-50/70" : "bg-slate-50/70"
                                )}
                              >
                                <FaCommentAlt className={cn("h-5 w-5 sm:h-6 sm:w-6", isAlert ? "text-red-600" : "text-slate-600")} />
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  {isAlert ? (
                                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-extrabold tracking-widest text-red-800">
                                      ALERTA
                                    </span>
                                  ) : null}
                                  <span className="text-xs text-muted-foreground">{formatDateTime(obs.date, obs.time)}</span>
                                </div>

                                <div className={cn("mt-2 whitespace-pre-wrap break-words text-[15px] sm:text-base font-semibold leading-snug", isAlert ? "text-red-900" : "text-foreground")}>
                                  {obs.observation}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-1 border-t border-border/60 pt-2 sm:shrink-0 sm:flex-nowrap sm:gap-2 sm:border-0 sm:pt-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setSelectedObservation(obs); setObservationModalOpen(true); }}
                                className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                                title="Ver"
                              >
                                <FaEye className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={onEdit}
                                className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                                title="Editar"
                              >
                                <FaEdit className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setObservationDeleteId(obs.id)}
                                className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                                title="Excluir"
                              >
                                <FaTrashAlt className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4">Nenhuma observação registrada.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="mt-4">
            {/* Cada venda mostra os próprios pagamentos embaixo dela. Antes havia
                uma segunda lista "Pagamentos recebidos" com os mesmos valores —
                parecia pagamento em dobro. O estorno fica no menu (⋯) da venda. */}
            <Tabs value={financeTab} onValueChange={(v) => setFinanceTab(v as "vendas" | "orcamentos")} className="w-full">
              <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm" aria-label="Financeiro do paciente">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 p-3 sm:p-4">
                  <TabsList className="h-auto rounded-xl bg-muted p-1">
                    <TabsTrigger value="vendas" className="gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold data-[state=active]:shadow-sm">
                      <CONCEPTS.faturado.icon className="h-4 w-4 text-sky-600" aria-hidden />
                      Vendas
                      <span className="rounded-full bg-sky-100 px-1.5 text-xs font-bold tabular-nums text-sky-700">{animalSalesTransactions.length}</span>
                    </TabsTrigger>
                    <TabsTrigger value="orcamentos" className="gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold data-[state=active]:shadow-sm">
                      <FileTextIcon className="h-4 w-4 text-violet-600" aria-hidden />
                      Orçamentos
                      <span className="rounded-full bg-violet-100 px-1.5 text-xs font-bold tabular-nums text-violet-700">{patientBudgets.length}</span>
                    </TabsTrigger>
                  </TabsList>
                  {financeTab === "vendas" ? (
                    <Button onClick={openNewSale} className="font-semibold max-sm:w-full">
                      <Plus className="mr-1.5 h-4 w-4" /> Nova venda
                    </Button>
                  ) : (
                    <Button onClick={() => { resetBudgetForm(); setBudgetModalOpen(true); }} className="font-semibold max-sm:w-full">
                      <Plus className="mr-1.5 h-4 w-4" /> Novo orçamento
                    </Button>
                  )}
                </div>

                <TabsContent value="vendas" className="m-0">
                  {animalSalesTransactions.length === 0 ? (
                    <div className="px-4 py-12 text-center">
                      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
                        <CONCEPTS.faturado.icon className="h-6 w-6" aria-hidden />
                      </span>
                      <p className="mt-3 text-sm font-semibold text-foreground">Nenhuma venda para este paciente</p>
                      <p className="mt-1 text-sm text-muted-foreground">Registre o que foi cobrado no atendimento em “Nova venda”.</p>
                    </div>
                  ) : (
                    <>
                      {/* Resumo do paciente */}
                      <div className="grid grid-cols-3 gap-2 border-b border-border/70 bg-muted/20 p-3 sm:p-4">
                        {(
                          [
                            { label: "Total", value: salesTotals.total, concept: CONCEPTS.faturado, strong: false },
                            { label: "Recebido", value: salesTotals.received, concept: CONCEPTS.recebido, strong: false },
                            { label: "A receber", value: salesTotals.open, concept: CONCEPTS.aReceber, strong: salesTotals.open > 0 },
                          ] as Array<{ label: string; value: number; concept: Concept; strong: boolean }>
                        ).map((s) => (
                          <div
                            key={s.label}
                            className={cn(
                              "flex min-w-0 items-center gap-2.5 rounded-xl border px-2.5 py-2 sm:px-3",
                              s.strong ? TONES.amber.card : "border-border/70 bg-card"
                            )}
                          >
                            <IconChip icon={s.concept.icon} tone={s.concept.tone} size="sm" className="max-sm:hidden" />
                            <div className="min-w-0">
                              <p className={cn("text-[11px] font-semibold uppercase tracking-wide", s.strong ? "text-amber-800" : "text-muted-foreground")}>
                                {s.label}
                              </p>
                              <p
                                className={cn(
                                  "truncate text-sm font-bold tabular-nums sm:text-base",
                                  s.label === "A receber" ? (s.value > 0 ? "text-amber-700" : "text-muted-foreground") : TONES[s.concept.tone].text
                                )}
                              >
                                {formatCurrencyBRL(s.value)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <ul className="divide-y divide-border/70">
                        {animalSalesTransactions.map((t) => {
                          const balance = saleBalance(t);
                          const status = saleStatus(t);
                          const statusVisual = SALE_STATUS_VISUAL[status.key];
                          const cancelled = status.key === "cancelled";
                          const { appointmentId: linkedAppointmentId } = parseSaleObservations(t.observations);
                          const app = linkedAppointmentId ? animalAppointments.find((a) => a.id === linkedAppointmentId) : undefined;
                          const saleReceipts = animalReceipts
                            .filter((r) => isReceiptOfSale(r, t.id))
                            .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
                          const refundable = cancelled ? [] : saleReceipts.filter((r) => r.amount > 0);
                          return (
                            <li key={t.id} className="relative flex items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/40 sm:px-4">
                              <IconChip icon={statusVisual.icon} tone={statusVisual.tone} className="mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                  <div className="min-w-0">
                                    {/* Botão "esticado": a linha toda abre o detalhe; Receber e ⋯ ficam por cima (z-10). */}
                                    <button
                                      type="button"
                                      onClick={() => setSelectedPdvSale(t)}
                                      className="block w-full text-left font-semibold leading-snug text-foreground after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-primary/60"
                                    >
                                      <span className={cn("[overflow-wrap:anywhere]", cancelled && "text-muted-foreground line-through")}>
                                        {summarizeSaleItems(t.description, 3)}
                                      </span>
                                    </button>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                      <span className="tabular-nums">{formatDateTime(t.date, t.time)}</span>
                                      {app && (
                                        <span className="inline-flex items-center gap-1">
                                          <StethoscopeIcon className="h-3 w-3 text-teal-600" aria-hidden />
                                          {[displayAppointmentType(app.type), app.vet].filter(Boolean).join(" · ")}
                                        </span>
                                      )}
                                      {(t.discountAmount ?? 0) > 0 && (
                                        <span className="font-medium text-emerald-700">desconto {formatCurrencyBRL(t.discountAmount ?? 0)}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between gap-2 sm:shrink-0 sm:justify-end">
                                    <p className={cn("text-base font-bold tabular-nums text-foreground", cancelled && "text-muted-foreground line-through")}>
                                      {formatCurrencyBRL(t.amount)}
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                      {/* No celular o ícone à esquerda já mostra a situação — o selo sai para caber Receber e ⋯. */}
                                      <SaleStatusBadge sale={t} className={cn(balance > 0 && "max-sm:hidden")} />
                                      {balance > 0 && (
                                        <Button size="sm" className="relative z-10 h-8 font-semibold" onClick={() => setSaleToReceive(t)}>
                                          Receber
                                        </Button>
                                      )}
                                      <DropdownMenu modal={false}>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="relative z-10 h-8 w-8" aria-label="Mais ações da venda">
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="min-w-[15rem]">
                                          <DropdownMenuItem onClick={() => setSelectedPdvSale(t)}>Ver detalhes e comprovante</DropdownMenuItem>
                                          {refundable.map((r) => (
                                            <DropdownMenuItem key={r.id} className="text-amber-800 focus:text-amber-800" onClick={() => setReceiptIdToRefund(r.id)}>
                                              <Undo2 className="mr-2 h-4 w-4" aria-hidden />
                                              Estornar {formatCurrencyBRL(r.amount)}
                                              {r.paymentMethod ? ` (${r.paymentMethod})` : ""}
                                            </DropdownMenuItem>
                                          ))}
                                          {!cancelled && (
                                            <DropdownMenuItem className="text-red-700 focus:text-red-700" onClick={() => setPdvSaleToCancel(t)}>
                                              Cancelar venda
                                            </DropdownMenuItem>
                                          )}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                </div>

                                {/* Pagamentos desta venda (não são outra cobrança) */}
                                {(saleReceipts.length > 0 || status.key === "partial") && (
                                  <ul className="mt-2 space-y-1 border-l-2 border-border/80 pl-2.5">
                                    {saleReceipts.map((r) => {
                                      const reversal = r.amount < 0;
                                      return (
                                        <li key={r.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                                          {reversal ? (
                                            <Undo2 className="h-3.5 w-3.5 text-rose-600" aria-hidden />
                                          ) : (
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                                          )}
                                          <span className={cn("font-semibold tabular-nums", reversal ? "text-rose-700" : "text-emerald-700")}>
                                            {reversal ? "Estornado" : "Pago"} {formatCurrencyBRL(Math.abs(r.amount))}
                                          </span>
                                          {!reversal && r.paymentMethod && <PaymentMethodBadge method={r.paymentMethod} />}
                                          <span className="tabular-nums text-muted-foreground">{formatDateTime(r.date, r.time)}</span>
                                        </li>
                                      );
                                    })}
                                    {status.key === "partial" && (
                                      <li className="flex items-center gap-2 text-xs font-semibold text-amber-700">
                                        <CONCEPTS.aReceber.icon className="h-3.5 w-3.5" aria-hidden />
                                        Falta {formatCurrencyBRL(balance)}
                                      </li>
                                    )}
                                  </ul>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="orcamentos" className="m-0">
                  {patientBudgets.length === 0 ? (
                    <div className="px-4 py-12 text-center">
                      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                        <FileTextIcon className="h-6 w-6" aria-hidden />
                      </span>
                      <p className="mt-3 text-sm font-semibold text-foreground">Nenhum orçamento para este paciente</p>
                      <p className="mt-1 text-sm text-muted-foreground">Monte uma proposta em “Novo orçamento” e envie pelo WhatsApp.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/70">
                      {patientBudgets.map((b) => {
                        const total = budgetNegotiatedTotal(b);
                        const expired = isBudgetExpired(b);
                        const closed = b.status === "converted" || b.status === "cancelled";
                        const canConvert = !expired && !closed;
                        const validUntil = parseLocalDate(b.date);
                        validUntil.setDate(validUntil.getDate() + BUDGET_VALIDITY_DAYS);
                        const validLabel = format(validUntil, "dd/MM/yyyy");
                        const badge: Record<string, { label: string; tone: Tone }> = {
                          draft: { label: "Rascunho", tone: "slate" },
                          approved: { label: "Aprovado", tone: "sky" },
                          converted: { label: "Virou venda", tone: "emerald" },
                          cancelled: { label: "Cancelado", tone: "slate" },
                          expired: { label: "Vencido", tone: "rose" },
                        };
                        const st = badge[expired ? "expired" : b.status] ?? badge.draft;
                        const names = b.items.map((it) => it.name);
                        return (
                          <li key={b.id} className="flex items-start gap-3 px-3 py-3 sm:px-4">
                            <IconChip icon={FileTextIcon} tone={b.status === "cancelled" ? "slate" : "violet"} className="mt-0.5" />
                            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                              <div className="min-w-0 flex-1">
                                <p className={cn("break-words font-semibold leading-snug text-foreground", b.status === "cancelled" && "text-muted-foreground line-through")}>
                                  {names.slice(0, 3).join(" · ")}
                                  {names.length > 3 && <span className="font-normal text-muted-foreground"> +{names.length - 3}</span>}
                                </p>
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                  <span className="tabular-nums">{formatDateTime(b.date)}</span>
                                  {!closed && (
                                    <span className={cn("font-medium", expired ? "text-rose-700" : "text-muted-foreground")}>
                                      {expired ? `venceu em ${validLabel}` : `válido até ${validLabel}`}
                                    </span>
                                  )}
                                  {(b.discountAmount ?? 0) > 0 && (
                                    <span className="font-medium text-emerald-700">desconto {formatCurrencyBRL(b.discountAmount ?? 0)}</span>
                                  )}
                                  {b.notes && <span className="italic">{b.notes}</span>}
                                  <SentBadge type="budget" id={b.id} />
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center justify-between gap-2 sm:shrink-0 sm:justify-end">
                                <p className="text-base font-bold tabular-nums text-foreground">{formatCurrencyBRL(total)}</p>
                                <div className="flex items-center gap-1.5">
                                  <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", TONES[st.tone].badge)}>
                                    {st.label}
                                  </span>
                                  {canConvert && (
                                    <Button size="sm" className="h-8 font-semibold" onClick={() => openConvertModal(b)}>
                                      Converter em venda
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Enviar orçamento por WhatsApp (com link do PDF, sem precisar anexar)"
                                    aria-label="Enviar orçamento por WhatsApp"
                                    onClick={() => void sendBudgetViaWhatsApp(b)}
                                  >
                                    <SiWhatsapp className="h-4 w-4 text-[#25D366]" />
                                  </Button>
                                  <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais ações do orçamento">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {!closed && <DropdownMenuItem onClick={() => startEditBudget(b)}>Editar</DropdownMenuItem>}
                                      {!closed && b.status !== "approved" && (
                                        <DropdownMenuItem onClick={() => void approveBudget(b.id)}>Marcar como aprovado</DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => void printBudget(b)}>Imprimir (PDF)</DropdownMenuItem>
                                      {!closed && (
                                        <DropdownMenuItem className="text-red-700 focus:text-red-700" onClick={() => void cancelBudget(b.id)}>
                                          Cancelar orçamento
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </TabsContent>
              </section>
            </Tabs>

            <AlertDialog open={!!receiptIdToRefund} onOpenChange={(open) => !open && setReceiptIdToRefund(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Estornar este pagamento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {(() => {
                      const r = animalReceipts.find((x) => x.id === receiptIdToRefund);
                      return r ? (
                        <>
                          <strong className="text-foreground">{formatCurrencyBRL(r.amount)}</strong>
                          {r.paymentMethod ? ` em ${r.paymentMethod}` : ""}, recebido em {formatDateTime(r.date, r.time)}.{" "}
                        </>
                      ) : null;
                    })()}
                    Use quando o pagamento foi lançado por engano: ele é apagado e o valor volta a ficar “a receber” na venda.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmEstorno} className="bg-amber-600 hover:bg-amber-700">
                    Estornar pagamento
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Dialog open={budgetModalOpen} onOpenChange={(open) => { setBudgetModalOpen(open); if (!open) resetBudgetForm(); }}>
              <DialogContent className="max-h-[92vh] min-w-0 overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingBudgetId ? "Editar orçamento" : "Novo orçamento"}</DialogTitle>
                  <DialogDescription>
                    {editingBudgetId
                      ? "Adicione ou remova itens e salve para atualizar a proposta existente."
                      : "Crie uma proposta de cobrança (não gera movimentação financeira)."}
                  </DialogDescription>
                </DialogHeader>

                <div className="min-w-0 space-y-4">
                  {/* Itens — mesmo formato do modal de venda */}
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[12rem] flex-[1_1_16rem] space-y-1.5">
                      <Label>Produto ou serviço</Label>
                      <AutocompleteSelect
                        value={budgetSelectedItemId}
                        onChange={setBudgetSelectedItemId}
                        options={catalogItems.map(ci => ({ value: ci.id, label: `${ci.name} — ${formatCurrencyBRL(ci.price)}` }))}
                        placeholder="Buscar no catálogo"
                      />
                    </div>
                    <div className="w-20 space-y-1.5">
                      <Label htmlFor="budgetQty">Qtd.</Label>
                      <Input
                        id="budgetQty"
                        type="number"
                        min={1}
                        value={budgetQty}
                        onChange={(e)=>setBudgetQty(Number(e.target.value)||0)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItemToBudget(); } }}
                        className="h-10 rounded-lg bg-input"
                      />
                    </div>
                    <div className="w-32 space-y-1.5">
                      <Label htmlFor="budgetPrice">Preço</Label>
                      <CurrencyInput id="budgetPrice" value={budgetUnitPrice} onValueChange={setBudgetUnitPrice} className="h-10 w-full rounded-lg" />
                    </div>
                    <Button type="button" variant="outline" onClick={addItemToBudget} className="h-10">
                      <Plus className="mr-1.5 h-4 w-4" /> Adicionar
                    </Button>
                  </div>

                  {budgetItems.length > 0 ? (
                    <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border">
                      {budgetItems.map((it, idx) => (
                        <li key={`${it.itemId}-${idx}`} className="flex items-center gap-3 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-medium text-foreground">{it.name}</p>
                            <p className="text-xs text-muted-foreground">{it.qty} × {formatCurrencyBRL(it.unitPrice)}</p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrencyBRL(it.qty * it.unitPrice)}</span>
                          <button
                            type="button"
                            onClick={() => removeBudgetItem(it.itemId, idx)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remover ${it.name}`}
                          >
                            <FaTrashAlt className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                      {(() => {
                        // Desconto/acréscimo negociados na tela de Orçamentos continuam valendo ao editar aqui.
                        const existing = editingBudgetId ? patientBudgets.find((b) => b.id === editingBudgetId) : undefined;
                        const discount = existing?.discountAmount ?? 0;
                        const surcharge = existing?.surchargeAmount ?? 0;
                        return (
                          <li className="space-y-0.5 bg-muted/30 px-3 py-2 text-sm">
                            {discount > 0 && (
                              <div className="flex justify-between text-muted-foreground">
                                <span>Desconto</span>
                                <span className="tabular-nums">− {formatCurrencyBRL(discount)}</span>
                              </div>
                            )}
                            {surcharge > 0 && (
                              <div className="flex justify-between text-muted-foreground">
                                <span>Acréscimo</span>
                                <span className="tabular-nums">+ {formatCurrencyBRL(surcharge)}</span>
                              </div>
                            )}
                            <div className="flex items-baseline justify-between">
                              <span className="font-medium text-foreground">Total</span>
                              <span className="text-lg font-semibold tabular-nums text-foreground">
                                {formatCurrencyBRL(Math.max(0, budgetTotal - discount + surcharge))}
                              </span>
                            </div>
                          </li>
                        );
                      })()}
                    </ul>
                  ) : (
                    <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                      Nenhum item adicionado ainda.
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1.5 sm:col-span-1">
                      <Label htmlFor="budgetDate">Data</Label>
                      <Input id="budgetDate" type="date" value={budgetDate} onChange={(e)=>setBudgetDate(e.target.value)} className="h-10 rounded-lg bg-input" />
                    </div>
                    <p className="col-span-2 self-end pb-2 text-xs text-muted-foreground sm:col-span-1">
                      Válido por {BUDGET_VALIDITY_DAYS} dias a partir da data.
                    </p>
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="budgetNotes">Observações <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                      <Textarea id="budgetNotes" rows={2} value={budgetObservations} onChange={(e)=>setBudgetObservations(e.target.value)} className="rounded-lg bg-input" />
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={()=>{ setBudgetModalOpen(false); resetBudgetForm(); }}>Cancelar</Button>
                  <Button onClick={() => void saveBudget()} disabled={savingBudget || budgetItems.length === 0} className="font-semibold">
                    {savingBudget ? "Salvando..." : editingBudgetId ? "Salvar alterações" : "Salvar orçamento"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <SaleDetailModal
              open={!!selectedPdvSale}
              transaction={selectedPdvSale}
              onClose={() => setSelectedPdvSale(null)}
              onRequestCancel={(sale) => { setSelectedPdvSale(null); setPdvSaleToCancel(sale); }}
              onRequestDelete={(sale) => { setSelectedPdvSale(null); setPdvSaleToDelete(sale); }}
              onRequestReceive={(sale) => { setSelectedPdvSale(null); setSaleToReceive(sale); }}
              clientName={currentClient?.name}
              clientPhone={currentClient?.mainPhoneContact || undefined}
              clientAddress={
                (() => {
                  const a = currentClient?.address;
                  if (!a) return undefined;
                  if (typeof a === "string") return a;
                  const parts = [
                    a.street && a.number ? `${a.street}, ${a.number}` : a.street,
                    a.complement,
                    a.neighborhood,
                    a.city,
                    a.cep ? `CEP ${a.cep}` : undefined,
                  ].filter(Boolean);
                  return parts.length > 0 ? parts.join(" · ") : undefined;
                })()
              }
              animalName={currentAnimal?.name}
              animalSpecies={currentAnimal?.species || undefined}
              animalBreed={currentAnimal?.breed || undefined}
              animalPatientCode={currentAnimal?.patientCode}
              animalAge={
                (() => {
                  if (!currentAnimal) return undefined;
                  if (currentAnimal.birthday) {
                    const birth = parseLocalDate(currentAnimal.birthday);
                    const now = new Date();
                    const totalMonths =
                      (now.getFullYear() - birth.getFullYear()) * 12 +
                      (now.getMonth() - birth.getMonth());
                    if (totalMonths < 12) {
                      return totalMonths === 1 ? "1 mes" : `${totalMonths} meses`;
                    }
                    const y = Math.floor(totalMonths / 12);
                    const m = totalMonths % 12;
                    const anoStr = y === 1 ? "1 ano" : `${y} anos`;
                    const mesStr = m === 1 ? "1 mes" : m > 1 ? `${m} meses` : "";
                    return mesStr ? `${anoStr} e ${mesStr}` : anoStr;
                  }
                  return undefined;
                })()
              }
            />
          </TabsContent>
        </Tabs>
      </div>

      <CancelSaleDialog
        open={!!pdvSaleToCancel}
        sale={pdvSaleToCancel}
        onClose={() => setPdvSaleToCancel(null)}
        onCancelled={() => { void refetchFinancial(); }}
        clientName={currentClient?.name}
        clientPhone={currentClient?.mainPhoneContact || undefined}
        animalName={currentAnimal?.name}
      />

      <DeleteSaleDialog
        open={!!pdvSaleToDelete}
        sale={pdvSaleToDelete}
        onClose={() => setPdvSaleToDelete(null)}
        onDeleted={() => { void refetchFinancial(); }}
      />

      <ReceivePaymentDialog
        open={!!saleToReceive}
        onOpenChange={(open) => { if (!open) setSaleToReceive(null); }}
        sale={saleToReceive}
        clientName={currentClient?.name}
        animalName={currentAnimal?.name}
        methods={pmRegistry}
        onDone={refetchFinancial}
      />

      <ConvertBudgetDialog
        open={!!budgetToConvert}
        onOpenChange={(open) => { if (!open) setBudgetToConvert(null); }}
        budget={budgetToConvert}
        catalogItems={catalogItemsFromHook}
        methods={pmRegistry}
        appointments={animalAppointments.map((a) => ({
          id: a.id,
          label: `${displayAppointmentType(a.type)} • ${formatDateTime(a.date, a.time)}`,
        }))}
        defaultAppointmentId={animalAppointments.find((a) => a.date === getTodayLocalISO())?.id}
        responsibleFor={(id) => (id ? animalAppointments.find((a) => a.id === id)?.vet || undefined : undefined)}
        clientName={currentClient?.name}
        animalName={currentAnimal?.name}
        onDone={async () => {
          await Promise.all([refetchBudgets(), refetchFinancial(), refetchCatalog()]);
          setFinanceTab("vendas");
        }}
      />

      <Dialog open={observationModalOpen} onOpenChange={setObservationModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observação</DialogTitle>
            <DialogDescription>Detalhes da observação registrada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="whitespace-pre-wrap text-sm text-foreground">{selectedObservation?.observation}</p>
            {selectedObservation && (
              <p className="text-xs text-muted-foreground">Data: {formatDateTime(selectedObservation.date, selectedObservation.time)}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={examInterpOpen} onOpenChange={setExamInterpOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Pedir interpretação de IA
            </DialogTitle>
            <DialogDescription>
              Escolha o atendimento relacionado (opcional), os exames que quer analisar e, se quiser, uma observação. Valide sempre as sugestões com seu julgamento clínico.
            </DialogDescription>
          </DialogHeader>

          {examInterpMessages.length === 0 ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Atendimento relacionado (opcional)</Label>
                <Select value={examInterpAppointmentId} onValueChange={setExamInterpAppointmentId}>
                  <SelectTrigger className="bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum / não informado</SelectItem>
                    {animalAppointments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {formatDateTime(a.date, a.time)} — {displayAppointmentType(a.type) || "Atendimento"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Exames a analisar</Label>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {examsList.map((exam) => (
                    <label
                      key={exam.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={examInterpExamIds.has(exam.id)}
                        onCheckedChange={() => toggleExamInterpExam(exam.id)}
                      />
                      <span className="truncate">
                        {exam.type || "Exame"} — {formatDateTime(exam.date, exam.time)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Observação (opcional)</Label>
                <Textarea
                  value={examInterpObservation}
                  onChange={(e) => setExamInterpObservation(e.target.value)}
                  placeholder="Ex.: paciente com histórico de..."
                  rows={3}
                  className="bg-input border border-border rounded-md"
                />
              </div>

              {examInterpError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {examInterpError}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Mensagem [0] é o contexto montado automaticamente, não uma
                  pergunta do veterinário — nunca renderizada. */}
              {examInterpMessages.slice(1).map((msg, i) =>
                msg.role === "assistant" ? (
                  <AISuggestionsView key={i} text={msg.content} />
                ) : (
                  <div key={i} className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                    <span className="font-semibold text-primary">Você perguntou: </span>
                    {msg.content}
                  </div>
                )
              )}

              {examInterpError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {examInterpError}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={examInterpFollowUp}
                  onChange={(e) => setExamInterpFollowUp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleExamInterpFollowUp();
                    }
                  }}
                  placeholder="Tirar uma dúvida sobre essa interpretação..."
                  disabled={examInterpLoading}
                  className="bg-input"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleExamInterpFollowUp}
                  disabled={examInterpLoading || !examInterpFollowUp.trim()}
                >
                  {examInterpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Perguntar"}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {examInterpMessages.length === 0 ? (
              <>
                <Button variant="outline" onClick={() => setExamInterpOpen(false)}>Cancelar</Button>
                <Button onClick={handleGenerateExamInterpretation} disabled={examInterpLoading}>
                  {examInterpLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" /> Gerar interpretação
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setExamInterpMessages([])}>Recomeçar</Button>
                <Button onClick={handleSaveExamInterpretationAsObservation} disabled={examInterpSaving}>
                  {examInterpSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...
                    </>
                  ) : (
                    "Salvar como observação"
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={observationEditOpen} onOpenChange={setObservationEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar observação</DialogTitle>
            <DialogDescription>Ajuste o texto e se deve aparecer como alerta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                value={observationEditText}
                onChange={(e) => setObservationEditText(e.target.value)}
                className="bg-input border border-border rounded-md"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-[#374151]">
              <Checkbox
                checked={observationEditAlert}
                onCheckedChange={(v) => setObservationEditAlert(!!v)}
              />
              Exibir como Alerta no Prontuário
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObservationEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!selectedObservation) return;
                const nextText = observationEditText.trim();
                if (!nextText) {
                  toast.error("A observação não pode ficar vazia.");
                  return;
                }
                const updated = await observationsApi.updateObservation(selectedObservation.id, {
                  observation: nextText,
                  displayAsAlert: observationEditAlert,
                });
                if (!updated) {
                  toast.error("Falha ao atualizar observação.");
                  return;
                }
                await refetchObservations();
                setObservationEditOpen(false);
                toast.success("Observação atualizada!");
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!observationDeleteId} onOpenChange={(o) => !o && setObservationDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta observação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!observationDeleteId) return;
                const ok = await observationsApi.removeObservation(observationDeleteId);
                if (!ok) {
                  toast.error("Falha ao excluir observação.");
                  return;
                }
                await refetchObservations();
                setObservationDeleteId(null);
                toast.info("Observação excluída.");
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!documentDeleteId} onOpenChange={(o) => !o && setDocumentDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!documentDeleteId) return;
                const ok = await removePatientDocument(animalId, documentDeleteId);
                if (ok) {
                  const list = await readPatientDocuments(animalId);
                  setDocuments(list);
                  setDocumentDeleteId(null);
                  toast.info("Documento excluído.");
                } else {
                  toast.error("Não foi possível excluir o documento.");
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={saleModalOpen} onOpenChange={(open) => { if (!savingSale) setSaleModalOpen(open); }}>
        <DialogContent className="max-h-[92vh] min-w-0 overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <IconChip icon={CONCEPTS.faturado.icon} tone="sky" size="sm" />
              Nova venda
            </DialogTitle>
            <DialogDescription>
              {currentAnimal && currentClient
                ? `${currentAnimal.name} · ${currentClient.name}`
                : "Registre o que foi cobrado no atendimento."}
            </DialogDescription>
          </DialogHeader>

          <div className="min-w-0 space-y-5">
            {/* Itens */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[12rem] flex-[1_1_16rem] space-y-1.5">
                  <Label>Produto ou serviço</Label>
                  <AutocompleteSelect
                    value={saleSelectedItemId}
                    onChange={setSaleSelectedItemId}
                    options={catalogItems.map(ci => ({ value: ci.id, label: `${ci.name} — ${formatCurrencyBRL(ci.price)}` }))}
                    placeholder="Buscar no catálogo"
                  />
                </div>
                <div className="w-20 space-y-1.5">
                  <Label htmlFor="saleQty">Qtd.</Label>
                  <Input
                    id="saleQty"
                    type="number"
                    min={1}
                    value={saleQty}
                    onChange={(e) => setSaleQty(Number(e.target.value) || 0)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItemToSale(); } }}
                    className="h-10 rounded-lg bg-input"
                  />
                </div>
                <div className="w-32 space-y-1.5">
                  <Label htmlFor="salePrice">Preço</Label>
                  <CurrencyInput id="salePrice" value={saleUnitPrice} onValueChange={setSaleUnitPrice} className="h-10 w-full rounded-lg" />
                </div>
                <Button type="button" variant="outline" onClick={addItemToSale} className="h-10">
                  <Plus className="mr-1.5 h-4 w-4" /> Adicionar
                </Button>
              </div>

              {saleItems.length > 0 ? (
                <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border">
                  {saleItems.map((it, idx) => {
                    const cat = categoryVisual(
                      catalogItemsFromHook.find((c) => c.id === it.itemId)?.category ?? (it.type === "product" ? "produto" : "servico")
                    );
                    return (
                    <li key={`${it.itemId}-${idx}`} className="flex items-center gap-3 px-3 py-2">
                      <IconChip icon={cat.icon} tone={cat.tone} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold text-foreground">{it.name}</p>
                        <p className="text-xs text-muted-foreground">{it.qty} × {formatCurrencyBRL(it.unitPrice)}</p>
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums">{formatCurrencyBRL(it.qty * it.unitPrice)}</span>
                      <button
                        type="button"
                        onClick={() => removeSaleItem(it.itemId, idx)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remover ${it.name}`}
                      >
                        <FaTrashAlt className="h-3.5 w-3.5" />
                      </button>
                    </li>
                    );
                  })}
                  <li className="space-y-1 bg-muted/30 px-3 py-2.5">
                    <AdjustmentLines
                      subtotal={saleSubtotal}
                      discount={saleAdj.discountAmount}
                      surcharge={saleAdj.surchargeAmount}
                      discountPct={saleAdj.discountPct}
                    />
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Total</span>
                      <span className="text-2xl font-bold tabular-nums text-foreground">{formatCurrencyBRL(saleTotal)}</span>
                    </div>
                  </li>
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                  Nenhum item adicionado ainda.
                </p>
              )}
            </div>

            {saleItems.length > 0 && <PriceAdjustmentFields adj={saleAdj} idPrefix="prontuarioSale" />}

            <PaymentChoice
              idPrefix="prontuarioSale"
              mode={salePayMode}
              onModeChange={setSalePayMode}
              method={salePaymentMethod}
              onMethodChange={setSalePaymentMethod}
              methods={pmRegistry}
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="relative col-span-2 space-y-1.5 sm:col-span-1">
                <Label>Atendimento <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                <Select value={saleAppointmentId || "__none__"} onValueChange={(v) => setSaleAppointmentId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-10 rounded-lg bg-input"><SelectValue placeholder="Sem vínculo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem vínculo</SelectItem>
                    {animalAppointments.map(a => (
                      <SelectItem key={a.id} value={a.id}>{displayAppointmentType(a.type)} • {formatDateTime(a.date, a.time)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5 sm:col-span-1">
                <Label htmlFor="saleDate">Data</Label>
                <Input id="saleDate" type="date" value={saleDate} max={getTodayLocalISO()} onChange={(e) => setSaleDate(e.target.value)} className="h-10 rounded-lg bg-input" />
              </div>
              <div className="col-span-2 space-y-1.5 sm:col-span-1">
                <Label htmlFor="saleResponsible">Responsável <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                <Input
                  id="saleResponsible"
                  value={saleResponsible}
                  placeholder={(saleAppointmentId && animalAppointments.find(a => a.id === saleAppointmentId)?.vet) || ""}
                  onChange={(e) => setSaleResponsible(e.target.value)}
                  className="h-10 rounded-lg bg-input"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="saleNotes">Observações <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                <Textarea id="saleNotes" rows={2} value={saleObservations} onChange={(e) => setSaleObservations(e.target.value)} className="rounded-lg bg-input" />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSaleModalOpen(false)} disabled={savingSale}>Cancelar</Button>
            <Button onClick={() => void handleSaveSale()} disabled={savingSale || saleItems.length === 0} className="font-semibold">
              {savingSale && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {savingSale
                ? "Salvando..."
                : salePayMode === "now" && saleTotal > 0
                  ? `Registrar e receber ${formatCurrencyBRL(saleTotal)}`
                  : "Registrar venda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={weightModalOpen} onOpenChange={setWeightModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registro de Peso</DialogTitle>
            <DialogDescription>Detalhes do registro de peso.</DialogDescription>
          </DialogHeader>
          {selectedWeight && (
            <div className="space-y-2">
              <p className="text-foreground font-semibold">{selectedWeight.weight.toFixed(2)} kg</p>
              <p className="text-sm text-muted-foreground">Origem: {selectedWeight.source || "-"}</p>
              <p className="text-xs text-muted-foreground">Data: {formatDateTime(selectedWeight.date, selectedWeight.time)}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientRecordPage;