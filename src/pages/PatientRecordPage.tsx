"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  FaArrowLeft, FaUsers, FaPaw, FaPlus, FaEye, FaStethoscope, FaCalendarAlt, FaDollarSign, FaSyringe, FaWeightHanging, FaFileAlt, FaClipboardList, FaCommentAlt, FaHeart, FaMale, FaUser, FaPrint, FaDownload, FaTimes, FaSave, FaBalanceScale, FaFileMedical, FaExclamationTriangle, FaFlask, FaTag, FaBox, FaClock, FaMoneyBillWave, FaArrowUp, FaArrowDown, FaTrashAlt, FaPrescriptionBottleAlt, FaEdit, FaIdCard, FaPhone, FaUndo, FaShoppingCart, FaHandHoldingUsd
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { PrescriptionEntry } from "@/types/medication";
import { cn, formatDateTime, formatItemQty } from "@/lib/utils";
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
import { PrescriptionPdfContent } from "@/components/PrescriptionPdfContent";
import { ExamReportPdfContent } from "@/components/ExamReportPdfContent";
import ExamReportPdfContentHemogramaOnePage from "@/components/ExamReportPdfContent_Hemograma_OnePage";
import ExamReportPdfContentBioquimicoOnePage from "@/components/ExamReportPdfContent_Bioquimico_OnePage";
import type { FinancialTransaction } from "@/mockData/financial";
import { AppointmentEntry, BaseAppointmentDetails } from "@/types/appointment";
import { updateAnimalDetails, getWeightHistory } from "@/lib/clientsApi";
import { Client, Animal, WeightEntry } from "@/types/client";
import { ExamEntry } from "@/types/exam";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { useAppointments } from "@/hooks/useAppointments";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { useExams } from "@/hooks/useExams";
import ExamTrendCard from "@/components/patient/exams/ExamTrendCard";
import { useCatalog } from "@/hooks/useCatalog";
import { useRegistryList } from "@/hooks/useRegistryList";
import * as financialApi from "@/lib/financialApi";
import { fulfillSaleLines } from "@/lib/saleFulfillment";
import { fetchHemogramReferences } from "@/constants/examReferences";
import { mockCompanySettings } from "@/mockData/settings";
import AutocompleteSelect from "@/components/AutocompleteSelect";
import CurrencyInput from "@/components/CurrencyInput";
import BudgetReportPdfContent from "@/components/BudgetReportPdfContent";
import DocumentPdfContent from "@/components/DocumentPdfContent";
import ExamRequestPdfContent, { type ExamRequestPdfData } from "@/components/ExamRequestPdfContent";
import { EXAM_REQUEST_MARKER } from "@/lib/examRequestMarker";
import { replaceTemplateVariables } from "@/utils/templateReplacements";
import { getPatientDisplayId } from "@/utils/patientDisplayId";
import PatientAppointmentsTab from "@/components/patient/appointments/PatientAppointmentsTab";
import PatientVaccinesTab from "@/components/patient/vaccines/PatientVaccinesTab";
import {
  Circle as CircleIcon,
  FileText as FileTextIcon,
  FlaskConical as FlaskConicalIcon,
  Stethoscope as StethoscopeIcon,
  Syringe as SyringeIcon,
  AlertTriangle as AlertTriangleIcon,
  CheckCircle2,
  AlertCircle,
  BadgeDollarSign,
  UserRound
} from "lucide-react";
import { Calendar } from "lucide-react";
import SaleDetailModal from "@/components/SaleDetailModal";
import CancelSaleDialog from "@/components/CancelSaleDialog";
import DeleteSaleDialog from "@/components/DeleteSaleDialog";

import {
  readPatientDocuments,
  // writePatientDocuments is not used in the Supabase-backed implementation
  removePatientDocument,
  type PatientDocumentEntry,
} from "@/lib/documentsApi";
import { useClientWithAnimals } from "@/hooks/useSupabaseClients";
import { useQueryClient } from "@tanstack/react-query";
import { createPdfBlob, downloadPdf, openPdf, persistPdf } from "@/lib/pdfExport";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useObservations } from "@/hooks/useObservations";
import * as observationsApi from "@/lib/observationsApi";
import type { ObservationEntry } from "@/lib/observationsApi";

// Helpers de storage ausentes
const salesStorageKey = (aid?: string) => `patient:sales:${aid || "unknown"}`;
const paymentsStorageKey = (aid?: string) => `patient:payments:${aid || "unknown"}`;

// Interface para eventos da linha do tempo
interface TimelineEvent {
  id: string;
  date: string;
  time: string;
  type: 'Atendimento' | 'Exame' | 'Receita' | 'Peso' | 'Observação' | 'Venda' | 'Vacina' | 'Documento';
  description: string;
  icon: React.ElementType;
  link?: string;
  badgeColor?: string;
  summary?: string;
  author?: string;
  isAlert?: boolean;
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

// Tipagens locais e storage para vendas e pagamentos
type SaleStatusLocal = "open" | "finalized" | "cancelled";
type SaleItemMeta = { itemId: string; name: string; type: "product" | "service"; qty: number; unitPrice: number };
type PatientSaleMeta = {
  id: string;
  date: string;
  appointmentId: string;
  items: SaleItemMeta[];
  total: number;
  saleStatus: SaleStatusLocal;
  origin?: "manual" | "orcamento";
  responsible?: string;
  observations?: string;
};
type PatientPaymentMeta = {
  id: string;
  saleId: string;
  date: string;
  time: string;
  amount: number;
  paymentMethod?: string;
  observations?: string;
};

// Orçamentos locais
type BudgetStatusLocal = "aberto" | "aprovado" | "convertido" | "expirado" | "cancelado";
type PatientBudgetMeta = {
  id: string;
  date: string;
  appointmentId?: string;
  items: SaleItemMeta[];
  total: number;
  validityDays: number;
  status: BudgetStatusLocal;
  observations?: string;
};

const budgetsStorageKey = (aid?: string) => `patient:budgets:${aid || "unknown"}`;
const readPatientBudgets = (aid?: string): PatientBudgetMeta[] => {
  try {
    const raw = localStorage.getItem(budgetsStorageKey(aid));
    return raw ? (JSON.parse(raw) as PatientBudgetMeta[]) : [];
  } catch {
    return [];
  }
};
const writePatientBudgets = (aid: string | undefined, list: PatientBudgetMeta[]) => {
  localStorage.setItem(budgetsStorageKey(aid), JSON.stringify(list));
};

const readPatientSales = (aid?: string): PatientSaleMeta[] => {
  try {
    const raw = localStorage.getItem(salesStorageKey(aid));
    return raw ? (JSON.parse(raw) as PatientSaleMeta[]) : [];
  } catch {
    return [];
  }
};
const writePatientSales = (aid: string | undefined, list: PatientSaleMeta[]) => {
  localStorage.setItem(salesStorageKey(aid), JSON.stringify(list));
};
const readPatientPayments = (aid?: string): PatientPaymentMeta[] => {
  try {
    const raw = localStorage.getItem(paymentsStorageKey(aid));
    return raw ? (JSON.parse(raw) as PatientPaymentMeta[]) : [];
  } catch {
    return [];
  }
};
const writePatientPayments = (aid: string | undefined, list: PatientPaymentMeta[]) => {
  localStorage.setItem(paymentsStorageKey(aid), JSON.stringify(list));
};

// Helper para identidade visual por tipo de evento
const EVENT_STYLES: Record<string, { dot: string; badge: string }> = {
  'Atendimento': { dot: 'timeline-dot-clinical', badge: 'badge-soft-clinical' },
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

// PatientRecordPage
const sumReceiptsForSaleLocal = (list: FinancialTransaction[], saleId: string) =>
  list
    .filter(
      (t) =>
        t.type === "income" &&
        t.category === "Recebimento" &&
        (t.saleId === saleId || (t.description || "").includes(saleId))
    )
    .reduce((s, r) => s + r.amount, 0);

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
  const { clientId, animalId } = useParams<{ clientId: string; animalId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const { transactions: mockFinancialTransactions, refetch: refetchFinancial } = useFinancialTransactions();
  const { appointments: animalAppointmentsFromHook, refetch: refetchAppointments } = useAppointments(animalId);
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

  useEffect(() => {
    (async () => {
      const list = await readPatientDocuments(animalId);
      setDocuments(list);
    })();
  }, [animalId]);

  const [documentDeleteId, setDocumentDeleteId] = useState<string | null>(null);

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

  const [observationModalOpen, setObservationModalOpen] = useState(false);
  const [selectedObservation, setSelectedObservation] = useState<ObservationEntry | null>(null);

  const [observationEditOpen, setObservationEditOpen] = useState(false);
  const [observationEditText, setObservationEditText] = useState<string>("");
  const [observationEditAlert, setObservationEditAlert] = useState<boolean>(false);
  const [observationDeleteId, setObservationDeleteId] = useState<string | null>(null);

  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState<WeightEntry | null>(null);

  const [isTutorExpanded, setIsTutorExpanded] = useState(false);

  const animalFinancialTransactions = mockFinancialTransactions.filter(
    (t) =>
      t.relatedAnimalId === animalId &&
      !(t.type === 'income' && t.category === 'Venda de Produtos')
  );

  const animalSalesTransactions = mockFinancialTransactions.filter(
    (t) => t.relatedAnimalId === animalId && t.type === 'income' && t.category === 'Venda de Produtos'
  );

  const [financeModalOpen, setFinanceModalOpen] = useState(false);
  const [financeForm, setFinanceForm] = useState({ description: "", amount: "", type: "income" as "income" | "expense", category: "", paymentMethod: "" });

  const [patientSales, setPatientSales] = useState<PatientSaleMeta[]>(readPatientSales(animalId));
  useEffect(() => { setPatientSales(readPatientSales(animalId)); }, [animalId]);

  // Vendas do PDV vinculadas a este animal que não estão no
  // localStorage do prontuário (evita duplicatas)
  const pdvSalesForAnimal = useMemo(() => {
    const localIds = new Set(patientSales.map(s => s.id));
    return animalSalesTransactions.filter(t => !localIds.has(t.id));
  }, [animalSalesTransactions, patientSales]);

  const [patientPayments, setPatientPayments] = useState<PatientPaymentMeta[]>(readPatientPayments(animalId));
  useEffect(() => { setPatientPayments(readPatientPayments(animalId)); }, [animalId]);

  const animalReceipts = useMemo(() => {
    return mockFinancialTransactions
      .filter((t) => t.relatedAnimalId === animalId && t.type === "income" && t.category === "Recebimento")
      .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());
  }, [mockFinancialTransactions, animalId]);

  const [confirmOverpayProntuario, setConfirmOverpayProntuario] = useState<{ saleId: string; remaining: number; payAmount: number } | null>(null);
  const [receiptIdToRefund, setReceiptIdToRefund] = useState<string | null>(null);

  const [patientBudgets, setPatientBudgets] = useState<PatientBudgetMeta[]>(readPatientBudgets(animalId));
  useEffect(() => { setPatientBudgets(readPatientBudgets(animalId)); }, [animalId]);

  const catalogItems = catalogItemsFromHook.filter(i => i.active);

  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [selectedPdvSale, setSelectedPdvSale] = useState<import("@/mockData/financial").FinancialTransaction | null>(null);
  const [pdvSaleToCancel, setPdvSaleToCancel] = useState<import("@/mockData/financial").FinancialTransaction | null>(null);
  const [pdvSaleToDelete, setPdvSaleToDelete] = useState<import("@/mockData/financial").FinancialTransaction | null>(null);
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [saleAppointmentId, setSaleAppointmentId] = useState<string>("");
  const [saleResponsible, setSaleResponsible] = useState<string>("");
  const [saleObservations, setSaleObservations] = useState<string>("");
  const [saleStatusLocal, setSaleStatusLocal] = useState<SaleStatusLocal>("open");

  const [saleSelectedItemId, setSaleSelectedItemId] = useState<string>("");
  const [saleQty, setSaleQty] = useState<number>(1);
  const [saleUnitPrice, setSaleUnitPrice] = useState<number>(0);
  const [saleItems, setSaleItems] = useState<SaleItemMeta[]>([]);

  useEffect(() => {
    if (!saleSelectedItemId) { setSaleUnitPrice(0); return; }
    const item = catalogItemsFromHook.find(i => i.id === saleSelectedItemId);
    setSaleUnitPrice(item?.price || 0);
  }, [saleSelectedItemId, catalogItemsFromHook]);

  const saleTotal = saleItems.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);

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
  const handleSaveSale = async () => {
    if (savingSale) return;
    if (saleItems.length === 0) { toast.error("Adicione itens à venda."); return; }
    if (!currentClient || !currentAnimal) { toast.error("Cliente/animal não encontrados."); return; }
    setSavingSale(true);
    try {

    // Nome do tutor/pet em vez do ID cru do atendimento — o ID continua
    // salvo em appointmentId (abaixo) para fins de vínculo, só não aparece
    // mais no texto que o Financeiro exibe pro usuário.
    const description = `Venda: ${currentClient.name} (${currentAnimal.name}) — ${saleItems.map(i => formatItemQty(i.name, i.qty)).join(", ")}`;

    const tx = await financialApi.addFinancialTransaction({
      date: saleDate,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      description,
      type: "income",
      amount: saleTotal,
      category: "Venda de Produtos",
      relatedAnimalId: currentAnimal.id,
      relatedClientId: currentClient.id,
      status: "pending",
    });
    const nextId = tx?.id;
    if (!nextId) { toast.error("Erro ao registrar venda."); return; }

    // Grava os itens de verdade (sale_items) e baixa estoque de produtos +
    // insumos de composição — mesmo fluxo do PDV. Antes essa venda só gravava
    // a transação e mexia no estoque na mão, sem sale_items: ficava invisível
    // pro relatório de repasses e pro Fechamento 50/50 (que leem sale_items).
    await fulfillSaleLines({
      saleId: nextId,
      catalog: catalogItemsFromHook,
      lines: saleItems.map((it) => ({
        catalogItemId: it.itemId,
        name: it.name,
        type: it.type,
        quantity: it.qty,
        unitPrice: it.unitPrice,
      })),
    });
    await refetchCatalog();
    await refetchFinancial();

    const newSaleMeta: PatientSaleMeta = {
      id: nextId,
      date: saleDate,
      appointmentId: saleAppointmentId || undefined,
      items: saleItems,
      total: saleTotal,
      saleStatus: saleStatusLocal,
      origin: "manual",
      responsible: saleResponsible || (saleAppointmentId ? animalAppointments.find(a => a.id === saleAppointmentId)?.vet : undefined) || undefined,
      observations: saleObservations || undefined,
    };
    const updated = [...patientSales, newSaleMeta];
    setPatientSales(updated); writePatientSales(animalId, updated);

    setSaleModalOpen(false);
    setSaleDate(new Date().toISOString().split("T")[0]);
    setSaleAppointmentId(""); setSaleResponsible(""); setSaleObservations(""); setSaleStatusLocal("open"); setSaleItems([]);
    toast.success("Venda registrada com sucesso!");
    } finally {
      setSavingSale(false);
    }
  };

  const updateSaleStatus = async (saleId: string, status: SaleStatusLocal) => {
    const updated = patientSales.map(s => (s.id === saleId ? { ...s, saleStatus: status } : s));
    setPatientSales(updated);
    writePatientSales(animalId, updated);
    if (status === "cancelled") {
      await financialApi.updateFinancialTransaction(saleId, { status: "cancelled" });
      await refetchFinancial();
    }
  };

  const getPaidForSale = (saleId: string): number => sumReceiptsForSaleLocal(mockFinancialTransactions, saleId);
  const getFinancialStatusForSale = (saleId: string, saleAmount: number): "paid" | "partial" | "pending" => {
    const paid = getPaidForSale(saleId);
    if (paid >= saleAmount) return "paid";
    if (paid > 0) return "partial";
    return "pending";
  };

  const [paymentSaleId, setPaymentSaleId] = useState<string | undefined>(undefined);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentTime, setPaymentTime] = useState<string>(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethodId, setPaymentMethodId] = useState<string | undefined>(undefined);
  const [paymentObservations, setPaymentObservations] = useState<string>("");

  const canRegisterPayment = (saleId: string): boolean => {
    const sale = patientSales.find(s => s.id === saleId);
    if (!sale) return false;
    if (sale.saleStatus === "cancelled") return false;
    return getFinancialStatusForSale(saleId, sale.total) !== "paid";
  };

  // Preencher valor com saldo ao selecionar a venda
  useEffect(() => {
    if (!paymentSaleId) return;
    const sale = patientSales.find((s) => s.id === paymentSaleId);
    if (sale) {
      const paid = getPaidForSale(sale.id);
      setPaymentAmount(Math.max(0, sale.total - paid));
    }
  }, [paymentSaleId, patientSales, mockFinancialTransactions]);

  const [savingPayment, setSavingPayment] = useState(false);
  const doRegisterPaymentProntuario = async (saleId: string, amount: number) => {
    if (savingPayment) return;
    setSavingPayment(true);
    try {
      const pmName = paymentMethodId ? (pmRegistry.find((pm) => pm.id === paymentMethodId)?.name || undefined) : undefined;
      const description = currentClient && currentAnimal
        ? `Recebimento: ${currentClient.name} (${currentAnimal.name})`
        : undefined;
      await financialApi.registerReceiptWithSale({
        saleId,
        amount,
        date: paymentDate,
        time: paymentTime,
        paymentMethod: pmName,
        description,
        relatedClientId: currentClient?.id,
        relatedAnimalId: currentAnimal?.id,
      });
      await refetchFinancial();
    } finally {
      setSavingPayment(false);
    }
    setPaymentSaleId(undefined);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentTime(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    setPaymentAmount(0);
    setPaymentMethodId(undefined);
    setPaymentObservations("");
    toast.success("Pagamento registrado!");
  };

  const handleAddPayment = () => {
    if (!paymentSaleId) {
      toast.error("Selecione a venda vinculada.");
      return;
    }
    const saleMeta = patientSales.find((s) => s.id === paymentSaleId);
    if (!saleMeta) {
      toast.error("Venda não encontrada.");
      return;
    }
    if (!canRegisterPayment(paymentSaleId)) {
      toast.error("Esta venda já está PAGA. Não é possível registrar novas baixas.");
      return;
    }
    if (paymentAmount <= 0) {
      toast.error("Informe um valor de pagamento válido.");
      return;
    }
    if (!paymentMethodId) {
      toast.error("Selecione a forma de pagamento.");
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    if (paymentDate > today) {
      toast.error("Data do pagamento não pode ser futura.");
      return;
    }

    const paid = getPaidForSale(paymentSaleId);
    const remaining = Math.max(0, saleMeta.total - paid);
    if (paymentAmount > remaining) {
      setConfirmOverpayProntuario({ saleId: paymentSaleId, remaining, payAmount: paymentAmount });
      return;
    }

    doRegisterPaymentProntuario(paymentSaleId, paymentAmount);
  };

  const handleConfirmOverpayProntuario = () => {
    if (!confirmOverpayProntuario) return;
    doRegisterPaymentProntuario(confirmOverpayProntuario.saleId, confirmOverpayProntuario.remaining);
    setConfirmOverpayProntuario(null);
  };

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

  const [expandedSales, setExpandedSales] = useState<Record<string, boolean>>({});
  const toggleExpanded = (saleId: string) => setExpandedSales(prev => ({ ...prev, [saleId]: !prev[saleId] }));

  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetDate, setBudgetDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [budgetSelectedItemId, setBudgetSelectedItemId] = useState<string>("");
  const [budgetQty, setBudgetQty] = useState<number>(1);
  const [budgetUnitPrice, setBudgetUnitPrice] = useState<number>(0);
  const [budgetItems, setBudgetItems] = useState<SaleItemMeta[]>([]);
  const [budgetValidityDays, setBudgetValidityDays] = useState<number>(15);
  const [budgetObservations, setBudgetObservations] = useState<string>("");

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
  const isBudgetExpired = (b: PatientBudgetMeta) => {
    const exp = new Date(b.date);
    exp.setDate(exp.getDate() + b.validityDays);
    const today = new Date();
    return today > exp && b.status !== "convertido" && b.status !== "cancelado";
  };
  const saveBudget = () => {
    if (budgetItems.length === 0) { toast.error("Adicione itens ao orçamento."); return; }
    if (!currentClient || !currentAnimal) { toast.error("Cliente/animal não encontrados."); return; }
    const newBudget: PatientBudgetMeta = {
      id: `bud-${Date.now()}`,
      date: budgetDate,
      items: budgetItems,
      total: budgetTotal,
      validityDays: budgetValidityDays,
      status: "aberto",
      observations: budgetObservations || undefined,
    };
    const next = [...patientBudgets, newBudget];
    setPatientBudgets(next); writePatientBudgets(animalId, next);
    setBudgetDate(new Date().toISOString().split("T")[0]);
    setBudgetItems([]); setBudgetQty(1); setBudgetUnitPrice(0); setBudgetValidityDays(15); setBudgetObservations("");
    setBudgetModalOpen(false);
    toast.success("Orçamento salvo.");
  };
  const approveBudget = (id: string) => {
    const next = patientBudgets.map(b => b.id === id ? { ...b, status: "aprovado" as BudgetStatusLocal } : b);
    setPatientBudgets(next); writePatientBudgets(animalId, next);
  };
  const cancelBudget = (id: string) => {
    const next = patientBudgets.map(b => b.id === id ? { ...b, status: "cancelado" as BudgetStatusLocal } : b);
    setPatientBudgets(next); writePatientBudgets(animalId, next);
  };
  const printBudget = async (b: PatientBudgetMeta) => {
    if (!currentClient || !currentAnimal) {
      toast.error("Cliente/animal não encontrados para impressão.");
      return;
    }
    const budgetForPdf = {
      id: b.id,
      date: b.date,
      status: b.status,
      clientId: currentClient.id,
      animalId: currentAnimal.id,
      items: b.items.map(it => ({
        itemId: it.itemId,
        name: it.name,
        qty: it.qty,
        price: it.unitPrice,
      })),
      notes: b.observations,
      validityDays: b.validityDays,
    };

    const blob = await createPdfBlob(<BudgetReportPdfContent budget={budgetForPdf} userProfile={currentUserProfile} catalogItems={catalogItems} />);
    await openPdf({
      blob,
      fileName: `orcamento_${b.id}.pdf`,
      persistOptions: { folder: "budgets" },
    });
  };

  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertTargetBudgetId, setConvertTargetBudgetId] = useState<string | null>(null);
  const [convertAppointmentId, setConvertAppointmentId] = useState<string>("");

  const openConvertModal = (id: string) => {
    setConvertTargetBudgetId(id);
    setConvertAppointmentId("");
    setConvertModalOpen(true);
  };
  const [convertingBudget, setConvertingBudget] = useState(false);
  const confirmConvert = async () => {
    if (convertingBudget) return;
    if (!convertTargetBudgetId) return;
    if (!convertAppointmentId) { toast.error("Selecione um atendimento para converter em venda."); return; }
    setConvertingBudget(true);
    try {
      const ok = await convertBudgetToSale(convertTargetBudgetId, convertAppointmentId);
      if (ok) {
        setConvertModalOpen(false);
        setConvertTargetBudgetId(null);
        setConvertAppointmentId("");
      }
    } finally {
      setConvertingBudget(false);
    }
  };

  const convertBudgetToSale = async (id: string, appointmentId: string): Promise<boolean> => {
    const b = patientBudgets.find(x => x.id === id);
    if (!b) return false;
    if (isBudgetExpired(b)) { toast.error("Orçamento expirado. Não é possível converter."); return false; }
    if (!currentClient || !currentAnimal) { toast.error("Cliente/animal não encontrados."); return false; }

    const tx = await financialApi.addFinancialTransaction({
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      description: `Orçamento convertido (atend. ${appointmentId}): ${b.items.map(i => formatItemQty(i.name, i.qty)).join(", ")}`,
      type: "income",
      amount: b.total,
      category: "Venda de Produtos",
      relatedAnimalId: currentAnimal.id,
      relatedClientId: currentClient.id,
      status: "pending",
    });
    const nextId = tx?.id;
    if (!nextId) return false;

    await fulfillSaleLines({
      saleId: nextId,
      catalog: catalogItemsFromHook,
      lines: b.items.map((it) => ({
        catalogItemId: it.itemId,
        name: it.name,
        type: it.type,
        quantity: it.qty,
        unitPrice: it.unitPrice,
      })),
    });
    await refetchCatalog();
    await refetchFinancial();

    const newSale: PatientSaleMeta = {
      id: nextId,
      date: new Date().toISOString().split("T")[0],
      appointmentId,
      items: b.items,
      total: b.total,
      saleStatus: "open",
      origin: "orcamento",
      observations: b.observations,
    };
    const updatedSales = [...patientSales, newSale];
    setPatientSales(updatedSales); writePatientSales(animalId, updatedSales);

    const updatedBudgets = patientBudgets.map(x => x.id === id ? { ...x, status: "convertido" as BudgetStatusLocal, appointmentId } : x);
    setPatientBudgets(updatedBudgets); writePatientBudgets(animalId, updatedBudgets);

    toast.success("Orçamento convertido em venda.");
    return true;
  };

  const [financeTab, setFinanceTab] = useState<'orcamentos'|'vendas'|'financeiro'>('orcamentos');

  useEffect(() => {
    const paySaleId = searchParams.get('paySaleId');
    if (paySaleId) {
      setActiveTab('financial');
      setFinanceTab('financeiro');
      setPaymentSaleId(paySaleId);
    }
  }, [searchParams]);

  const handlePayShortcut = (saleId: string) => {
    setActiveTab('financial');
    setFinanceTab('financeiro');
    setPaymentSaleId(saleId);
    setSearchParams({ paySaleId: saleId });
  };

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

  // Envia um PDF (receita, laudo de exame etc.) por WhatsApp: sobe o arquivo
  // e manda o link direto na mensagem (WhatsApp não aceita anexo via link,
  // só texto) — compartilhado entre Receitas e Exames pra não duplicar a
  // validação de telefone/formatação de mensagem em cada botão.
  const sendPdfViaWhatsApp = async (opts: {
    blob: Blob;
    fileName: string;
    folder: string;
    title: string;
    intro: string;
    dateLabel: string;
  }) => {
    if (!currentClient) return;
    const raw = (currentClient.mainPhoneContact ?? "").replace(/\D/g, "");
    if (raw.length < 10) {
      toast.error("Este cliente não tem um telefone válido cadastrado. Atualize o telefone no cadastro do cliente para enviar por WhatsApp.");
      return;
    }
    const num = raw.length <= 10 ? "55" + raw : raw.startsWith("55") ? raw : "55" + raw;

    const buildMsg = (link?: string) => {
      const parts = [
        `🐾 *${opts.title}*`,
        "",
        opts.intro,
        `🗓️ ${opts.dateLabel}`,
        "",
        link ? `📎 Abra o PDF aqui:\n${link}` : "📎 O PDF foi baixado — por favor anexe o arquivo e envie.",
        "",
        "Qualquer dúvida, é só chamar! 💬",
      ];
      return encodeURIComponent(parts.join("\n"));
    };

    // api.whatsapp.com/send direto, em vez de wa.me — wa.me é um redirect da
    // própria Meta que, ao converter pra api.whatsapp.com/send, corrompe
    // emoji de 4 bytes no meio do caminho (confirmado testando o link real:
    // %F0%9F%90%BE certo em wa.me virava %EF%BF%BD no api.whatsapp.com/send
    // gerado por eles ~1s depois). Indo direto no endpoint final, pula essa
    // conversão que estava mastigando os emoji.
    const pdfUrl = await persistPdf(opts.blob, { folder: opts.folder, fileName: opts.fileName });
    if (pdfUrl) {
      window.open(`https://api.whatsapp.com/send?phone=${num}&text=${buildMsg(pdfUrl)}`, "_blank");
      toast.success("WhatsApp aberto com o link do documento.");
    } else {
      await downloadPdf({ blob: opts.blob, fileName: opts.fileName, persist: false });
      window.open(`https://api.whatsapp.com/send?phone=${num}&text=${buildMsg()}`, "_blank");
      toast.success("PDF baixado. Abra o WhatsApp e anexe o arquivo para enviar ao tutor.");
    }
  };

  // ADDED: Navegar para a edição do animal
  const handleEditAnimal = () => {
    navigate(`/clients/${clientId}/animals/${animalId}/edit`);
  };

  if (isClientLoading) {
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
          {isClientError
            ? `Erro ao carregar prontuário do Supabase: ${clientError instanceof Error ? clientError.message : "erro desconhecido"}.`
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
    const description = appDetails.suspeitaDiagnostica || appDetails.condutaTratamento || app.observacoesGerais || `Atendimento de ${app.type}`;
    allTimelineEvents.push({
      id: `app-${app.id}`,
      date: app.date,
      time: app.time,
      type: 'Atendimento',
      description: `${app.type}: ${description}`,
      summary: app.observacoesGerais || description,
      icon: FaStethoscope,
      link: `/clients/${clientId}/animals/${animalId}/view-appointment/${app.id}`,
      badgeColor: "bg-[hsl(var(--vf-clinical))]/15 text-vf-clinical",
      author: app.vet || currentVetName,
    });
  });

  examsList.forEach(exam => {
    allTimelineEvents.push({
      id: `exam-${exam.id}`,
      date: exam.date,
      time: exam.time,
      type: 'Exame',
      description: `${exam.type}: ${exam.result || 'Ver detalhes'}`,
      summary: exam.nota || exam.result || undefined,
      icon: FaFlask,
      badgeColor: "bg-[hsl(var(--vf-clinical))]/15 text-vf-clinical",
      author: exam.vet || currentVetName,
    });
  });

  prescriptions.forEach(rx => {
    const description = rx.treatmentDescription || rx.medicationName || "Receita sem descrição";
    let badgeColor = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"; // simples
    if (rx.type === 'manipulated') badgeColor = "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200";
    if (rx.type === 'controlled') badgeColor = "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";

    const rxIcon = rx.type === 'manipulated' ? FaFlask : rx.type === 'controlled' ? FaExclamationTriangle : FaPrescriptionBottleAlt;

    allTimelineEvents.push({
      id: `rx-${rx.id}`,
      date: rx.date,
      time: rx.time,
      type: 'Receita',
      description: `${rx.type === 'simple' ? 'Receita Simples' : rx.type === 'controlled' ? 'Receita Controlada' : 'Receita Manipulada'}: ${description}`,
      summary: rx.instructions || rx.treatmentDescription || rx.medicationName || undefined,
      icon: rxIcon,
      link: `/clients/${clientId}/animals/${animalId}/edit-prescription/${rx.id}?type=${rx.type}`,
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
      badgeColor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
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
      badgeColor: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
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
      badgeColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
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
      badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
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

    const birth = new Date(birthday);
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
    if (event.type === "Exame") return FlaskConicalIcon;
    if (event.type === "Vacina") return SyringeIcon;
    if (event.type === "Receita") return FileTextIcon;
    if (event.type === "Observação" && event.isAlert) return AlertTriangleIcon;
    return CircleIcon;
  };

  return (
    <div className="flex flex-col min-h-screen layered-bg-warm overflow-x-hidden font-exo">
      {/* CABEÇALHO DO PRONTUÁRIO */}
      <div className="mx-auto w-full max-w-7xl px-5 pt-4 pb-3">
        <div className="premium-card rounded-xl border border-border/60 bg-white px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 flex items-center justify-center">
                  <FileTextIcon className="h-4.5 w-4.5" strokeWidth={1.8} />
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

      <div className="flex-1 p-6 mx-auto w-full max-w-7xl">
        {/* CARD DO PACIENTE */}
        <div className="mb-6">
          <Card className="premium-card ring-1 ring-border/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  {/* Avatar */}
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
                  className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40"
                >
                  <FaEdit className="h-4 w-4" />
                  <span className="sr-only">Editar paciente</span>
                </Button>
              </div>

              {/* CHIPS DO PACIENTE */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-[12px] leading-5">
                  <FaIdCard className="h-3 w-3 text-primary" />
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-semibold text-foreground">{currentClient ? getPatientDisplayId(currentAnimal.id, currentClient.animals) : currentAnimal.id}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-[12px] leading-5">
                  <FaPaw className="h-3 w-3 text-teal-600" />
                  <span className="text-muted-foreground">Espécie:</span>
                  <span className="font-semibold text-foreground">{currentAnimal.species || "-"}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-[12px] leading-5">
                  <FaTag className="h-3 w-3 text-vf-clinical" />
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
                  <span className="font-semibold text-foreground">{formatAgeYearsMonths(currentAnimal.birthday)}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-[12px] leading-5">
                  <FaWeightHanging className="h-3 w-3 text-emerald-600" />
                  <span className="text-muted-foreground">Peso:</span>
                  <span className="font-semibold text-foreground">{formatWeightLabel(latestWeight)}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-[12px] leading-5">
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
                    <div className="p-3 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-[hsl(var(--vf-clinical))]/12 text-vf-clinical ring-1 ring-[hsl(var(--vf-clinical))]/25 flex items-center justify-center shrink-0">
                          <UserRound className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="text-[15px] font-semibold text-foreground">Tutor</div>
                          <div className="mt-0.5 text-[15px] text-foreground/90 font-medium truncate">
                            {currentClient.name}
                          </div>

                          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <FaPhone className="h-3.5 w-3.5 text-vf-clinical" />
                              <span className="truncate">
                                <span className="text-foreground/70 font-medium">Telefone:</span>{" "}
                                <span className="text-foreground/90">{currentClient.mainPhoneContact || "-"}</span>
                              </span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <FaMapMarkerAlt className="mt-0.5 h-3.5 w-3.5 text-vf-clinical" />
                              <span className="line-clamp-1">
                                <span className="text-foreground/70 font-medium">Endereço:</span>{" "}
                                <span className="text-foreground/90">
                                  {currentClient.address?.street ? `${currentClient.address.street}, ${currentClient.address.number}` : "-"}
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
                          className="h-8 px-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        >
                          <span className="text-xs">{isTutorExpanded ? "Menos" : "Mais"}</span>
                          {isTutorExpanded ? (
                            <FaChevronUp className="ml-2 h-3.5 w-3.5" />
                          ) : (
                            <FaChevronDown className="ml-2 h-3.5 w-3.5" />
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
                            {currentClient.nationality ? (
                              <span>
                                <span className="text-foreground/70 font-medium">Nacionalidade:</span>{" "}
                                <span className="font-semibold text-foreground/90">{currentClient.nationality}</span>
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
                    const income = mockFinancialTransactions
                      .filter((t) => t.relatedAnimalId === animalId && t.type === 'income')
                      .reduce((s, t) => s + t.amount, 0);
                    const expense = mockFinancialTransactions
                      .filter((t) => t.relatedAnimalId === animalId && t.type === 'expense')
                      .reduce((s, t) => s + t.amount, 0);
                    const net = income - expense;
                    const pending = Math.max(
                      0,
                      patientSales.reduce((sum, s) => sum + s.total, 0) -
                        animalReceipts.reduce((sum, r) => sum + r.amount, 0)
                    );

                    const fmt = (v: number) =>
                      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

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
                          <div className="rounded-xl border border-border bg-white px-3 py-2.5">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <AlertCircle className="h-4 w-4 text-rose-600" strokeWidth={1.6} />
                              <span className="font-medium text-foreground/70">Pendências</span>
                            </div>
                            <div className="mt-1 text-base font-semibold text-rose-600">{fmt(pending)}</div>
                          </div>

                          <div className="rounded-xl border border-border bg-white px-3 py-2.5">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <BadgeDollarSign className="h-4 w-4 text-emerald-600" strokeWidth={1.6} />
                              <span className="font-medium text-foreground/70">Saldo financeiro</span>
                            </div>
                            <div className="mt-1 text-base font-semibold text-emerald-700">{fmt(net)}</div>
                          </div>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
          <TabsList className="flex flex-wrap items-center border-b border-border/40 bg-transparent p-0 rounded-none gap-x-1 gap-y-1.5 w-full h-auto min-h-9 pb-2">
              <TabsTrigger
                value="timeline"
                title="Linha do Tempo"
                style={{ ["--tab-accent" as any]: "#d97706" }}
                className="tab-prontuario-trigger tab-active-line relative -mb-px pb-1.5 px-2 md:px-2.5 shrink-0 text-xs md:text-sm text-slate-600 dark:text-slate-300 hover:text-foreground rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaClock className="h-3.5 w-3.5 mr-1 md:mr-1.5 text-amber-600" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Timeline</span>
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1.5 rounded-full text-[9px] bg-muted text-foreground/70">{sortedTimelineEvents.length}</span>
              </TabsTrigger>
              <TabsTrigger
                value="appointments"
                title="Atendimento"
                style={{ ["--tab-accent" as any]: "#0d9488" }}
                className="tab-prontuario-trigger tab-active-line relative -mb-px pb-1.5 px-2 md:px-2.5 shrink-0 text-xs md:text-sm text-slate-600 dark:text-slate-300 hover:text-foreground rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaStethoscope className="h-3.5 w-3.5 mr-1 md:mr-1.5 text-teal-600" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Atend.</span>
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1.5 rounded-full text-[9px] bg-muted text-foreground/70">{animalAppointments.length}</span>
              </TabsTrigger>
            <TabsTrigger
              value="prescriptions"
              title="Receitas"
              style={{ ["--tab-accent" as any]: "#047857" }}
              className="tab-prontuario-trigger tab-active-line relative -mb-px pb-1.5 px-2 md:px-2.5 shrink-0 text-xs md:text-sm text-slate-600 dark:text-slate-300 hover:text-foreground rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
            >
              <FaPrescriptionBottleAlt className="h-3.5 w-3.5 mr-1 md:mr-1.5 text-emerald-700" />
              <span className="max-w-[9.5rem] md:max-w-none truncate">Receitas</span>
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1.5 rounded-full text-[9px] bg-muted text-foreground/70">{prescriptions.length}</span>
            </TabsTrigger>
              <TabsTrigger
                value="exams"
                title="Exames"
                style={{ ["--tab-accent" as any]: "hsl(var(--vf-clinical))" }}
                className="tab-prontuario-trigger tab-active-line relative -mb-px pb-1.5 px-2 md:px-2.5 shrink-0 text-xs md:text-sm text-slate-600 dark:text-slate-300 hover:text-foreground rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaFlask className="h-3.5 w-3.5 mr-1 md:mr-1.5 text-vf-clinical" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Exames</span>
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1.5 rounded-full text-[9px] bg-muted text-foreground/70">{examsList.length}</span>
              </TabsTrigger>
              <TabsTrigger
                value="vaccines"
                title="Vacinas"
                style={{ ["--tab-accent" as any]: "hsl(var(--vf-clinical))" }}
                className="tab-prontuario-trigger tab-active-line relative -mb-px pb-1.5 px-2 md:px-2.5 shrink-0 text-xs md:text-sm text-slate-600 dark:text-slate-300 hover:text-foreground rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaSyringe className="h-3.5 w-3.5 mr-1 md:mr-1.5 text-vf-clinical" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Vacinas</span>
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1.5 rounded-full text-[9px] bg-muted text-foreground/70">{vaccineAppointmentsCount}</span>
              </TabsTrigger>
              <TabsTrigger
                value="weight"
                title="Peso"
                style={{ ["--tab-accent" as any]: "#059669" }}
                className="tab-prontuario-trigger tab-active-line relative -mb-px pb-1.5 px-2 md:px-2.5 shrink-0 text-xs md:text-sm text-slate-600 dark:text-slate-300 hover:text-foreground rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaWeightHanging className="h-3.5 w-3.5 mr-1 md:mr-1.5 text-emerald-600" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Peso</span>
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1.5 rounded-full text-[9px] bg-muted text-foreground/70">{weightHistory.length}</span>
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                title="Documentos"
                style={{ ["--tab-accent" as any]: "#475569" }}
                className="tab-prontuario-trigger tab-active-line relative -mb-px pb-1.5 px-2 md:px-2.5 shrink-0 text-xs md:text-sm text-slate-600 dark:text-slate-300 hover:text-foreground rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaFileAlt className="h-3.5 w-3.5 mr-1 md:mr-1.5 text-slate-600 dark:text-slate-200" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Docs</span>
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1.5 rounded-full text-[9px] bg-muted text-foreground/70">{documents.length}</span>
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
                className="tab-prontuario-trigger tab-active-line relative -mb-px pb-1.5 px-2 md:px-2.5 shrink-0 text-xs md:text-sm text-slate-600 dark:text-slate-300 hover:text-foreground rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaCommentAlt className="h-3.5 w-3.5 mr-1 md:mr-1.5 text-rose-600" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Observ.</span>
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1.5 rounded-full text-[9px] bg-muted text-foreground/70">{observations.length}</span>
              </TabsTrigger>
              <TabsTrigger
                value="financial"
                title="Financeiro"
                style={{ ["--tab-accent" as any]: "#F79009" }}
                className="tab-prontuario-trigger tab-active-line relative -mb-px pb-1.5 px-2 md:px-2.5 shrink-0 text-xs md:text-sm text-slate-600 dark:text-slate-300 hover:text-foreground rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaMoneyBillWave className="h-3.5 w-3.5 mr-1 md:mr-1.5 text-[#F79009]" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Financeiro</span>
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1.5 rounded-full text-[9px] bg-muted text-foreground/70">{patientSales.length + pdvSalesForAnimal.length}</span>
              </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4">
            <Card className="premium-card">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <FaClock className="h-4 w-4 text-muted-foreground" /> Linha do Tempo
                </CardTitle>
                <p className="text-sm text-muted-foreground">Eventos clínicos em ordem cronológica (escaneável)</p>
              </CardHeader>
              <CardContent className="pt-0">
                {sortedTimelineEvents.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-4 sm:left-5 top-0 bottom-0 w-px bg-border/70" />
                    <div className="space-y-5">
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
                          if (event.type === 'Exame') return (event.summary || "").trim();
                          if (event.type === 'Receita') return (event.summary || "").trim();
                          if (event.type === 'Vacina') {
                            const next = (event.description || "").match(/Próxima dose:\s*(.*)$/i)?.[1];
                            return next ? `Próxima dose: ${next}` : (event.summary || "").trim();
                          }
                          return "";
                        };

                        const dotClass = isAlertObs
                          ? "bg-red-300"
                          : (event.type === 'Receita' ? getRecipeDotClass() : styles.dot);

                        const badgeClass = isAlertObs
                          ? "bg-red-100 text-red-800"
                          : (event.type === 'Receita' ? getRecipeVariantClass() : styles.badge);

                        const iconColorClass = isAlertObs
                          ? "text-red-700"
                          : (event.type === 'Receita' ? getRecipeIconClass() : iconClass);

                        const meta = `${formatDateTime(event.date, event.time)}${event.author ? ` • ${event.author}` : ""}`;

                        const showView = !!event.link || event.type === 'Exame' || event.type === 'Atendimento' || event.type === 'Documento';
                        const onView = () => {
                          if (event.type === 'Exame') {
                            const examId = (event.id || "").replace(/^exam-/, "");
                            if (examId) navigate(`/clients/${clientId}/animals/${animalId}/edit-exam/${examId}`);
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
                          <div key={event.id} className="relative pl-9 sm:pl-11">
                            {/* Container maior, ícone no mesmo tamanho */}
                            <span className="absolute left-2.5 sm:left-3.5 top-4 h-10 w-10 rounded-full bg-white ring-1 ring-border flex items-center justify-center">
                              <MarkerIcon className="h-4 w-4" strokeWidth={1.6} style={{ color: markerColor }} />
                            </span>

                            <Card className="premium-card p-4 sm:p-5">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={cn("chip-soft", badgeClass)}>
                                      {isAlertObs
                                        ? "Alerta"
                                        : event.type === 'Receita'
                                          ? ((event.description || "").toLowerCase().includes('controlada') ? 'Receita Controlada'
                                            : (event.description || "").toLowerCase().includes('manipulada') ? 'Receita Manipulada'
                                            : 'Receita Simples')
                                          : event.type}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate">{meta}</span>
                                  </div>

                                  <div className="mt-2 flex items-start gap-3">
                                    <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center bg-muted/30", iconColorClass)}>
                                      {React.createElement(event.icon, { className: "h-4 w-4" })}
                                    </div>

                                    <div className="min-w-0">
                                      <div className="text-[15px] sm:text-base font-semibold text-foreground leading-snug truncate">
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
                                    className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40"
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
              animalAppointments={animalAppointments}
              setAnimalAppointments={async () => { await refetchAppointments(); }}
            />
          </TabsContent>

          <TabsContent value="exams" className="mt-4 space-y-4">
            <ExamTrendCard exams={examsList} species={currentAnimal.species} />
            <Card className="vf-surface-card vf-tone-clinical card-hover rounded-md border border-border/80">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaFlask className="h-5 w-5 text-primary" /> Histórico de Exames
                </CardTitle>
                <Link to={`/clients/${clientId}/animals/${animalId}/add-exam`}>
                  <Button size="sm" className="rounded-md bg-[hsl(var(--vf-clinical))] font-semibold text-white transition-all duration-200 shadow-md hover:bg-[hsl(var(--vf-clinical)/0.9)] hover:shadow-lg">
                    <FaPlus className="h-4 w-4 mr-2" /> Adicionar Exame
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="pt-0">
                {examsList.length > 0 ? (
                  <div className="space-y-3">
                    {examsList.map((exam) => {
                      const title = exam.type || "Exame";
                      const subtitle = exam.type === "Hemograma Completo"
                        ? "Hemograma Completo"
                        : (exam.result || exam.nota || "Ver detalhes");

                      return (
                        <div
                          key={exam.id}
                          className={cn(
                            "rounded-xl border bg-white p-4 transition-all duration-200",
                            "hover:shadow-lg hover:-translate-y-0.5",
                            "border-[hsl(var(--vf-clinical))]/35 hover:shadow-[hsl(var(--vf-clinical))]/20"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="h-12 w-12 shrink-0 rounded-2xl bg-[hsl(var(--vf-clinical))]/12 flex items-center justify-center">
                                <FaFlask className="h-6 w-6 text-vf-clinical" />
                              </div>

                              <div className="min-w-0">
                                <div className="text-base font-bold text-vf-clinical truncate">{title}</div>
                                <div className="mt-1 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                  {subtitle}
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                  <span className="inline-flex items-center gap-1.5 text-foreground/80 font-medium">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    {formatDateTime(exam.date, exam.time)}
                                  </span>
                                  <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                                    <FaStethoscope className="h-4 w-4" />
                                    {exam.vet}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {/* Botão: Laudo padrão (modelo atual) */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  const tutorAddress = `${currentClient.address.street}, ${currentClient.address.number} - ${currentClient.address.city} - ${currentClient.address.state}`;
                                  const hemogramRefs = await fetchHemogramReferences();
                                  createPdfBlob(
                                    <ExamReportPdfContent
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
                                    fileName: `laudo_${exam.id || exam.date}.pdf`,
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
                                    createPdfBlob(
                                      <ExamReportPdfContentHemogramaOnePage
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
                                      fileName: `laudo_compacto_${exam.id || exam.date}.pdf`,
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
                                    createPdfBlob(
                                      <ExamReportPdfContentBioquimicoOnePage
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
                                      fileName: `laudo_compacto_${exam.id || exam.date}.pdf`,
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
                                  const tutorAddress = `${currentClient.address.street}, ${currentClient.address.number} - ${currentClient.address.city} - ${currentClient.address.state}`;
                                  const displayId = getPatientDisplayId(currentAnimal.id, currentClient.animals);
                                  const blob = exam.type === "Hemograma Completo"
                                    ? await createPdfBlob(
                                        <ExamReportPdfContentHemogramaOnePage
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
                                      ? await createPdfBlob(
                                          <ExamReportPdfContentBioquimicoOnePage
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
                                      : await createPdfBlob(
                                          <ExamReportPdfContent
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
                                    fileName: `laudo_${exam.type || "exame"}_${exam.id || exam.date}.pdf`,
                                    folder: "exams",
                                    title: `Resultado de Exame — ${exam.type || "Exame"}`,
                                    intro: `Olá! Segue o resultado do exame *${exam.type || "Exame"}* de *${currentAnimal.name}*.`,
                                    dateLabel: formatDateTime(exam.date, exam.time),
                                  });
                                }}
                                className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                              >
                                <SiWhatsapp className="h-5 w-5 text-[#25D366]" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/clients/${clientId}/animals/${animalId}/edit-exam/${exam.id}`)}
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
              animalAppointments={animalAppointments}
              setAnimalAppointments={async () => { await refetchAppointments(); }}
            />
          </TabsContent>

          <TabsContent value="weight" className="mt-4">
            <Card className="vf-surface-card vf-tone-clinical card-hover rounded-md border border-border/80">
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
                  <WeightInput
                    placeholder="Peso (kg)"
                    value={newWeight}
                    onChange={(v) => setNewWeight(v)}
                    className="w-full sm:w-[120px] bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
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
                  }} disabled={newWeight === ""} className="w-full sm:w-auto rounded-md bg-[hsl(var(--vf-clinical))] font-semibold text-white transition-all duration-200 shadow-md hover:bg-[hsl(var(--vf-clinical)/0.9)] hover:shadow-lg">
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
                        <div
                          key={entry.id}
                          className="premium-card rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border-emerald-200 hover:shadow-emerald-200/60"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="h-12 w-12 shrink-0 rounded-2xl bg-emerald-50/70 flex items-center justify-center">
                                <FaWeightHanging className="h-6 w-6 text-emerald-600" />
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
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaFileAlt className="h-5 w-5 text-primary" /> Documentos
                </CardTitle>
                {canEditPrescriptions ? (
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    <Button size="sm" asChild className="rounded-md bg-[hsl(var(--vf-clinical))] font-semibold text-white transition-all duration-200 shadow-md hover:bg-[hsl(var(--vf-clinical)/0.9)] hover:shadow-lg">
                      <Link to={`/clients/${clientId}/animals/${animalId}/add-document`}>
                        <FaPlus className="h-4 w-4 mr-2" /> Cadastrar novo documento
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild className="rounded-md border-[hsl(var(--vf-clinical)/0.4)] font-semibold text-[hsl(var(--vf-clinical))] hover:bg-[hsl(var(--vf-clinical)/0.08)]">
                      <Link to={`/clients/${clientId}/animals/${animalId}/add-exam-request`}>
                        <FaPlus className="h-4 w-4 mr-2" /> Pedido de exame
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild className="rounded-md border-[hsl(var(--vf-clinical)/0.4)] font-semibold text-[hsl(var(--vf-clinical))] hover:bg-[hsl(var(--vf-clinical)/0.08)]">
                      <Link to={`/clients/${clientId}/animals/${animalId}/emit-document`}>
                        <FaFileAlt className="h-4 w-4 mr-2" /> Emitir termo/atestado (modelo oficial)
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </CardHeader>
              <CardContent className="pt-0">
                {documents.length > 0 ? (
                  <div className="space-y-3">
                    {documents.map((doc) => {
                      const examRequestData = doc.source === "editor" && doc.content ? extractExamRequestData(doc.content) : null;
                      const onView = async () => {
                        if (doc.source === "editor" && doc.content) {
                          try {
                            const blob = examRequestData
                              ? await createPdfBlob(<ExamRequestPdfContent data={examRequestData} />)
                              : await createPdfBlob(
                                  <DocumentPdfContent
                                    documentName={doc.name}
                                    content={replaceTemplateVariables(doc.content || "", currentAnimal, currentClient, currentUserProfile)}
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
                              ? await createPdfBlob(<ExamRequestPdfContent data={examRequestData} />)
                              : await createPdfBlob(
                                  <DocumentPdfContent
                                    documentName={doc.name}
                                    content={replaceTemplateVariables(doc.content || "", currentAnimal, currentClient, currentUserProfile)}
                                  />
                                );
                            await downloadPdf({
                              blob,
                              fileName: `${doc.name}.pdf`,
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
                      return (
                        <div
                          key={doc.id}
                          className={cn(
                            "rounded-xl border bg-white p-4 transition-all duration-200",
                            "hover:shadow-lg hover:-translate-y-0.5",
                            "border-slate-200 hover:shadow-slate-200/60"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="h-12 w-12 shrink-0 rounded-2xl bg-slate-50/70 flex items-center justify-center">
                                <FaFileAlt className="h-6 w-6 text-slate-600" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                                  <span className="truncate">{doc.name}</span>
                                  {doc.source === "editor" && (
                                    <span className="text-xs font-normal text-muted-foreground">(editor)</span>
                                  )}
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
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={onView}
                                className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                                title={doc.source === "editor" ? "Imprimir / PDF" : "Visualizar"}
                              >
                                {doc.source === "editor" ? <FaPrint className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                              </Button>
                              {doc.source === "editor" && canEditPrescriptions && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  asChild
                                  className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                                  title="Editar"
                                >
                                  <Link to={`/clients/${clientId}/animals/${animalId}/add-document?edit=${encodeURIComponent(doc.id)}`}>
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
                  <p className="text-muted-foreground py-4">Nenhum documento registrado. Use &quot;Cadastrar novo documento&quot; para enviar um arquivo ou criar um documento a partir de um template.</p>
                )}
              </CardContent>
            </Card>

            {clientId && animalId && (
              <DocumentTimeline pacienteId={animalId} clientId={clientId} animalId={animalId} />
            )}
          </TabsContent>

          <TabsContent value="prescriptions" className="mt-4">
            {canEditPrescriptions ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Link to={`/clients/${clientId}/animals/${animalId}/add-prescription?type=simple`}>
                  <Card className="vf-surface-card vf-tone-clinical card-hover flex h-full flex-col items-center justify-center rounded-md border border-border/80 p-6 text-center">
                    <FaFileMedical className="h-12 w-12 text-primary mb-3" />
                    <CardTitle className="text-lg font-semibold text-foreground">Receita Simples</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Medicamentos de uso comum</p>
                  </Card>
                </Link>
                <Link to={`/clients/${clientId}/animals/${animalId}/add-prescription?type=controlled`}>
                  <Card className="vf-surface-card vf-tone-clinical card-hover flex h-full flex-col items-center justify-center rounded-md border border-border/80 p-6 text-center">
                    <FaExclamationTriangle className="h-12 w-12 text-destructive mb-3" />
                    <CardTitle className="text-lg font-semibold text-foreground">Receita Controlada</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Medicamentos controlados</p>
                  </Card>
                </Link>
                <Link to={`/clients/${clientId}/animals/${animalId}/add-prescription?type=manipulated`}>
                  <Card className="vf-surface-card vf-tone-clinical card-hover flex h-full flex-col items-center justify-center rounded-md border border-border/80 p-6 text-center">
                    <FaFlask className="h-12 w-12 text-vf-clinical mb-3" />
                    <CardTitle className="text-lg font-semibold text-foreground">Receita Manipulada</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Medicamentos manipulados</p>
                  </Card>
                </Link>
              </div>
            ) : (
              <p className="mb-6 text-sm text-muted-foreground">
                Seu perfil possui acesso somente de visualização para receitas e documentos.
              </p>
            )}

            <Card className="vf-surface-card vf-tone-clinical card-hover rounded-md border border-border/80">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaPrescriptionBottleAlt className="h-5 w-5 text-primary" /> Prescrições Recentes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {prescriptions.length > 0 ? (
                  <div className="space-y-3">
                    {sortedPrescriptions.map((rx) => {
                      const isSimple = rx.type === 'simple';
                      const isControlled = rx.type === 'controlled';
                      const isManipulated = rx.type === 'manipulated';

                      const borderClass = isControlled
                        ? "border-rose-300 hover:shadow-rose-200/60"
                        : isManipulated
                          ? "border-[hsl(var(--vf-clinical))]/35 hover:shadow-[hsl(var(--vf-clinical))]/20"
                          : "border-emerald-300 hover:shadow-emerald-200/60";

                      const iconWrapClass = isControlled
                        ? "bg-rose-50/70"
                        : isManipulated
                          ? "bg-[hsl(var(--vf-clinical))]/12"
                          : "bg-emerald-50/70";

                      const iconClass = isControlled
                        ? "text-rose-600"
                        : isManipulated
                          ? "text-vf-clinical"
                          : "text-emerald-600";

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
                            "rounded-xl border bg-white p-4 transition-all duration-200",
                            "hover:shadow-lg hover:-translate-y-0.5",
                            borderClass
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className={cn("h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center", iconWrapClass)}>
                                <FaPrescriptionBottleAlt className={cn("h-6 w-6", iconClass)} />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-widest",
                                    isControlled
                                      ? "bg-rose-100 text-rose-800"
                                      : isManipulated
                                        ? "bg-[hsl(var(--vf-clinical))]/15 text-vf-clinical"
                                        : "bg-emerald-100 text-emerald-800"
                                  )}>
                                    {label}
                                  </span>
                                  <span className="text-xs text-muted-foreground">{formatDateTime(rx.date, rx.time)}</span>
                                </div>

                                <div className={cn("mt-2 text-[15px] sm:text-base font-semibold leading-snug", iconClass)}>
                                  {title}
                                </div>
                                {subtitle ? (
                                  <div className="mt-1 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                    {subtitle}
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (!currentClient || !currentAnimal) {
                                    toast.error("Erro: Dados do cliente ou animal não disponíveis para impressão.");
                                    return;
                                  }
                                  createPdfBlob(
                                    PrescriptionPdfContent({
                                      animalName: currentAnimal.name,
                                      animalId: currentAnimal.id,
                                      displayId: getPatientDisplayId(currentAnimal.id, currentClient.animals),
                                      animalSpecies: currentAnimal.species,
                                      tutorName: currentClient.name,
                                      tutorAddress: (currentClient.address?.street ?? "") + ", " + (currentClient.address?.number ?? "") + " - " + (currentClient.address?.city ?? "") + " - " + (currentClient.address?.state ?? ""),
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
                                    fileName: `receita_${currentAnimal.name}_${currentClient.name}_${rx.date || "sem-data"}.pdf`,
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
                                  createPdfBlob(
                                    PrescriptionPdfContent({
                                      animalName: currentAnimal.name,
                                      animalId: currentAnimal.id,
                                      displayId: getPatientDisplayId(currentAnimal.id, currentClient.animals),
                                      animalSpecies: currentAnimal.species,
                                      tutorName: currentClient.name,
                                      tutorAddress: (currentClient.address?.street ?? "") + ", " + (currentClient.address?.number ?? "") + " - " + (currentClient.address?.city ?? "") + " - " + (currentClient.address?.state ?? ""),
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
                                    fileName: `receita_${currentAnimal.name}_${currentClient.name}_${rx.date || "sem-data"}.pdf`,
                                    persistOptions: { folder: "prescriptions" },
                                  })).then(() => {
                                    toast.success("PDF baixado.");
                                  });
                                }}
                                className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                                title="Baixar PDF"
                              >
                                <FaDownload className="h-4 w-4 text-emerald-600" />
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
                                  const blob = await createPdfBlob(
                                    PrescriptionPdfContent({
                                      animalName: currentAnimal.name,
                                      animalId: currentAnimal.id,
                                      displayId: getPatientDisplayId(currentAnimal.id, currentClient.animals),
                                      animalSpecies: currentAnimal.species,
                                      tutorName: currentClient.name,
                                      tutorAddress: (currentClient.address?.street ?? "") + ", " + (currentClient.address?.number ?? "") + " - " + (currentClient.address?.city ?? "") + " - " + (currentClient.address?.state ?? ""),
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
                                    fileName: `receita_${currentAnimal.name}_${currentClient.name}_${rx.date || "sem-data"}.pdf`,
                                    folder: "prescriptions",
                                    title: "Receita Veterinária",
                                    intro: `Olá! Segue a receita de *${currentAnimal.name}*.`,
                                    dateLabel: formatDateTime(rx.date, rx.time),
                                  });
                                }}
                              >
                                <SiWhatsapp className="h-5 w-5 text-[#25D366]" />
                              </Button>
                              {canEditPrescriptions ? (
                                <Link to={`/clients/${clientId}/animals/${animalId}/edit-prescription/${rx.id}?type=${rx.type}`}>
                                  <Button variant="ghost" size="icon" className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200" title="Editar">
                                    <FaEdit className="h-4 w-4 text-vf-clinical" />
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
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 gap-2">
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
                }} disabled={isObservationEmpty} className="rounded-md bg-[hsl(var(--vf-clinical))] font-semibold text-white transition-all duration-200 shadow-md hover:bg-[hsl(var(--vf-clinical)/0.9)] hover:shadow-lg">
                  <FaPlus className="h-4 w-4 mr-2" /> Adicionar Observação
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
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
                            "rounded-xl border bg-white p-4 transition-all duration-200",
                            "hover:shadow-lg hover:-translate-y-0.5",
                            isAlert
                              ? "border-red-200 hover:shadow-red-200/60"
                              : "border-slate-200 hover:shadow-slate-200/60"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div
                                className={cn(
                                  "h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center",
                                  isAlert ? "bg-red-50/70" : "bg-slate-50/70"
                                )}
                              >
                                <FaCommentAlt className={cn("h-6 w-6", isAlert ? "text-red-600" : "text-slate-600")} />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  {isAlert ? (
                                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-extrabold tracking-widest text-red-800">
                                      ALERTA
                                    </span>
                                  ) : null}
                                  <span className="text-xs text-muted-foreground">{formatDateTime(obs.date, obs.time)}</span>
                                </div>

                                <div className={cn("mt-2 text-[15px] sm:text-base font-semibold leading-snug", isAlert ? "text-red-900" : "text-foreground")}>
                                  {obs.observation}
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2">
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
            <Card className="bg-white rounded-[12px] shadow-sm border-0">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaMoneyBillWave className="h-5 w-5 text-primary" /> Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Tabs value={financeTab} onValueChange={(v) => setFinanceTab(v as any)} className="w-full">
                  <TabsList className="inline-flex h-9 rounded-lg bg-muted/60 p-1 mb-4">
                    <TabsTrigger value="orcamentos" className="flex items-center gap-1.5 px-4 text-sm font-medium rounded-md">
                      📋 Orçamentos
                      {patientBudgets.length > 0 && (
                        <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold">
                          {patientBudgets.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="vendas" className="flex items-center gap-1.5 px-4 text-sm font-medium rounded-md">
                      🛒 Vendas
                      {(patientSales.length + pdvSalesForAnimal.length) > 0 && (
                        <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold">
                          {patientSales.length + pdvSalesForAnimal.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="financeiro" className="flex items-center gap-1.5 px-4 text-sm font-medium rounded-md">
                      💰 Financeiro
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="orcamentos">
                    <div className="bg-[#F5F7FA] p-4 rounded-[12px]">
                      <div className="flex justify-end mb-3">
                        <Button
                          size="sm"
                          onClick={() => setBudgetModalOpen(true)}
                          className="rounded-md bg-[#0F4C5C] text-white hover:bg-[#0d3f4b] font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <FaPlus className="h-4 w-4 mr-2" /> Novo Orçamento
                        </Button>
                      </div>
                      <Card className="bg-white rounded-[12px] shadow-sm border border-[#E2E8F0]">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Orçamentos</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {patientBudgets.length === 0 ? (
                            <p className="text-muted-foreground">Nenhum orçamento registrado.</p>
                          ) : (
                            <div className="space-y-3">
                              {patientBudgets.map(b => {
                                const expired = isBudgetExpired(b);
                                const statusDisplay = expired && b.status !== "convertido" && b.status !== "cancelado" ? "expirado" : b.status;
                                const canConvert = !expired && b.status !== "cancelado" && b.status !== "convertido";
                                const badgeClass =
                                  statusDisplay === "convertido" ? "bg-[hsl(var(--vf-clinical))] text-white" :
                                  statusDisplay === "aprovado" ? "bg-emerald-600 text-white" :
                                  statusDisplay === "expirado" ? "bg-red-600 text-white" :
                                  statusDisplay === "cancelado" ? "bg-gray-300 text-gray-900" :
                                  "bg-[hsl(var(--vf-clinical))] text-white";
                                return (
                                  <Card key={b.id} className="p-4 bg-white rounded-[12px] shadow-sm border border-[#E2E8F0]">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Badge className={`px-2 py-0.5 text-xs rounded-full ${badgeClass}`}>
                                          {statusDisplay}
                                        </Badge>
                                      </div>
                                      <div className="text-sm font-semibold text-green-700">
                                        {new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(b.total)}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm text-muted-foreground">
                                      <div className="flex items-center gap-1"><FaCalendarAlt className="h-3 w-3" /> {formatDateTime(b.date)}</div>
                                      <div className="flex items-center gap-1"><FaTag className="h-3 w-3" /> Validade: {b.validityDays} dia(s)</div>
                                      {b.observations && <div className="flex items-center gap-1"><FaTag className="h-3 w-3" /> Obs.: {b.observations}</div>}
                                    </div>
                                    <div className="flex justify-end gap-2 mt-2">
                                      <Button variant="outline" size="sm" onClick={()=>approveBudget(b.id)} disabled={statusDisplay==="convertido" || statusDisplay==="cancelado"}>Aprovar</Button>
                                      <Button variant="outline" size="sm" onClick={()=>cancelBudget(b.id)} disabled={statusDisplay==="convertido" || statusDisplay==="cancelado"}>Cancelar</Button>
                                      <Button variant="outline" size="sm" onClick={()=>printBudget(b)}>Imprimir</Button>
                                      <Button size="sm" onClick={()=>openConvertModal(b.id)} disabled={!canConvert} className="rounded-md bg-[#0F4C5C] text-white hover:bg-[#0d3f4b]">
                                        Converter em venda
                                      </Button>
                                    </div>
                                  </Card>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="vendas">
                    <div className="bg-[#F5F7FA] p-4 rounded-[12px]">
                      <div className="flex justify-end mb-3">
                        <Button
                          size="sm"
                          onClick={() => { setSaleResponsible(""); setSaleModalOpen(true); }}
                          className="rounded-md bg-[#0F4C5C] text-white hover:bg-[#0d3f4b] font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <FaPlus className="h-4 w-4 mr-2" /> Adicionar Venda
                        </Button>
                      </div>
                      {pdvSalesForAnimal.length > 0 && (
                        <div className="mb-4 space-y-2">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Vendas via PDV
                            </span>
                            <span className="rounded-full bg-[hsl(var(--vf-sales)/0.12)] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--vf-sales))]">
                              {pdvSalesForAnimal.length}
                            </span>
                          </div>
                          {pdvSalesForAnimal.map(t => {
                            const statusConfig: Record<string, { label: string; className: string }> = {
                              paid:      { label: 'Pago',      className: 'bg-emerald-100 text-emerald-700' },
                              partial:   { label: 'Parcial',   className: 'bg-blue-100 text-blue-700' },
                              pending:   { label: 'Pendente',  className: 'bg-amber-100 text-amber-700' },
                              cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-700' },
                            };
                            const st = statusConfig[t.status || 'pending'] || statusConfig.pending;
                            const saldo = Math.max(0, t.amount - (t.paidAmount || 0));
                            return (
                              <Card key={t.id} className="p-4 bg-white rounded-xl shadow-sm border border-[#E2E8F0]">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex flex-col gap-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.className}`}>
                                        {st.label}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        PDV · {formatDateTime(t.date, t.time)}
                                      </span>
                                      {t.paymentMethod && (
                                        <span className="text-xs text-muted-foreground">
                                          💳 {t.paymentMethod}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                      <span className="inline-flex items-center rounded-md bg-[hsl(var(--vf-sales)/0.1)] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--vf-sales))]">
                                        PDV
                                      </span>
                                      <p className="text-sm font-semibold text-foreground truncate max-w-[340px]">
                                        {(() => {
                                          const colonIdx = t.description.indexOf(": ");
                                          if (colonIdx === -1) return t.description;
                                          const items = t.description
                                            .slice(colonIdx + 2)
                                            .split(", ")
                                            .map(item => item.replace(/\s+x\d+$/, "").trim());
                                          if (items.length <= 2) return items.join(" · ");
                                          return `${items.slice(0, 2).join(" · ")} +${items.length - 2} item${items.length - 2 > 1 ? "s" : ""}`;
                                        })()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 shrink-0 text-right">
                                    <div>
                                      <div className="text-xs text-muted-foreground">Total</div>
                                      <div className="text-base font-bold text-green-600">
                                        {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(t.amount)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground">Pago</div>
                                      <div className="text-base font-bold">
                                        {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(t.paidAmount || 0)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground">Saldo</div>
                                      <div className={`text-base font-bold ${saldo > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                                        {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(saldo)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex justify-end mt-2 pt-2 border-t border-border/50">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs rounded-lg hover:bg-muted"
                                    onClick={() => setSelectedPdvSale(t)}
                                  >
                                    🔍 Ver detalhes
                                  </Button>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      )}

                      {patientSales.length > 0 && (
                        <div className="space-y-4 mt-3">
                          {patientSales.map((sale) => {
                            const paid = getPaidForSale(sale.id);
                            const saldo = Math.max(0, sale.total - paid);
                            const finStatus = getFinancialStatusForSale(sale.id, sale.total);
                            const app = animalAppointments.find(a => a.id === sale.appointmentId);
                            const isCancelled = sale.saleStatus === "cancelled";
                            return (
                              <Card key={sale.id} className={cn(
                                "p-4 bg-white rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md",
                                isCancelled ? "border-slate-300 bg-slate-50/50" : "border-[#E2E8F0]"
                              )}>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-3">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <Badge className={cn(
                                      "px-3 py-1 text-sm font-bold rounded-full",
                                      isCancelled && "bg-slate-500 text-white",
                                      sale.saleStatus === "open" && !isCancelled && "bg-orange-600 text-white",
                                      sale.saleStatus === "finalized" && !isCancelled && "bg-green-600 text-white"
                                    )}>
                                      {isCancelled ? "Cancelada" : sale.saleStatus === "open" ? "Venda Aberta" : "Venda Finalizada"} {sale.origin === "orcamento" ? "• (de orçamento)" : ""}
                                    </Badge>
                                    <p className="text-lg font-semibold text-foreground">
                                      {app ? `${app.type} • ${app.vet}` : `Atendimento ${sale.appointmentId}`}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-6">
                                    <div className="text-right">
                                      <div className="text-xs text-muted-foreground">Total</div>
                                      <div className="text-xl font-bold text-green-600 dark:text-green-400">
                                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(sale.total)}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-muted-foreground">Pago</div>
                                      <div className="text-xl font-bold">
                                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(paid)}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-muted-foreground">Saldo</div>
                                      <div className="text-xl font-bold">
                                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(saldo)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <FaCalendarAlt className="h-3 w-3 text-vf-clinical" /> {formatDateTime(sale.date)}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <FaTag className="h-3 w-3 text-amber-500" /> Status financeiro: {finStatus === "paid" ? "Pago" : finStatus === "partial" ? "Parcial" : "Pendente"}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <FaStethoscope className="h-3 w-3 text-teal-500" /> Atendimento: {sale.appointmentId}
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
                                  <div className="flex flex-wrap gap-2">
                                    {!isCancelled && (
                                      <>
                                        <Button variant="outline" size="sm" className="transition-all" onClick={() => updateSaleStatus(sale.id, sale.saleStatus === "open" ? "finalized" : "open")}>
                                          {sale.saleStatus === "open" ? "Finalizar venda" : "Reabrir venda"}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-amber-700 border-amber-300 hover:bg-amber-50"
                                          title="Cancelar / Devolução"
                                          onClick={() => {
                                            const realTx = mockFinancialTransactions.find((t) => t.id === sale.id);
                                            if (!realTx) {
                                              toast.error("Venda não encontrada no financeiro.");
                                              return;
                                            }
                                            setPdvSaleToCancel(realTx);
                                          }}
                                        >
                                          Cancelar venda
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={() => toggleExpanded(sale.id)}>
                                    {expandedSales[sale.id] ? "Ocultar detalhes" : "Ver detalhes"}
                                  </Button>
                                </div>
                                {expandedSales[sale.id] && (
                                  <div className="mt-3 overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Item</TableHead>
                                          <TableHead>Tipo</TableHead>
                                          <TableHead>Qtd</TableHead>
                                          <TableHead>Preço</TableHead>
                                          <TableHead className="text-right">Subtotal</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {sale.items.map((it, idx) => (
                                          <TableRow key={`${sale.id}-${it.itemId}-${idx}`}>
                                            <TableCell className="font-medium">{it.name}</TableCell>
                                            <TableCell className="capitalize">{it.type}</TableCell>
                                            <TableCell>{it.qty}</TableCell>
                                            <TableCell>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(it.unitPrice)}</TableCell>
                                            <TableCell className="text-right">
                                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(it.qty * it.unitPrice)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="financeiro">
                    <div className="bg-[#F5F7FA] p-4 rounded-[12px] space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] transition-all duration-200 hover:shadow-md">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <FaHandHoldingUsd className="h-4 w-4 text-emerald-600" /> Registrar pagamento
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <Label className="flex items-center gap-1"><FaShoppingCart className="h-3 w-3 text-muted-foreground" /> Venda</Label>
                              <Select value={paymentSaleId || ""} onValueChange={(v) => setPaymentSaleId(v)}>
                                <SelectTrigger className="bg-input border border-border rounded-md h-9 mt-1"><SelectValue placeholder="Selecione a venda" /></SelectTrigger>
                                <SelectContent>
                                  {patientSales
                                    .filter(s => s.saleStatus !== "cancelled" && getPaidForSale(s.id) < s.total)
                                    .map(s => {
                                      const paid = getPaidForSale(s.id);
                                      const saldo = Math.max(0, s.total - paid);
                                      const app = animalAppointments.find(a => a.id === s.appointmentId);
                                      return (
                                        <SelectItem key={s.id} value={s.id}>
                                          {app ? `${app.type} • ${app.vet}` : `Atendimento ${s.appointmentId}`} — Total {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(s.total)} • Saldo {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(saldo)}
                                        </SelectItem>
                                      );
                                    })}
                                </SelectContent>
                              </Select>
                            </div>
                            {paymentSaleId && (() => {
                              const s = patientSales.find((x) => x.id === paymentSaleId);
                              const saldo = s ? Math.max(0, s.total - getPaidForSale(s.id)) : 0;
                              return (
                                <p className="text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                                  Saldo pendente: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(saldo)}
                                </p>
                              );
                            })()}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label><FaCalendarAlt className="h-3 w-3 inline mr-1 text-muted-foreground" /> Data</Label>
                                <Input type="date" value={paymentDate} onChange={(e)=>setPaymentDate(e.target.value)} className="h-9 bg-input border border-border rounded-md mt-1" />
                              </div>
                              <div>
                                <Label><FaClock className="h-3 w-3 inline mr-1 text-muted-foreground" /> Hora</Label>
                                <Input value={paymentTime} onChange={(e)=>setPaymentTime(e.target.value)} className="h-9 bg-input border border-border rounded-md mt-1" />
                              </div>
                            </div>
                            <div>
                              <Label>Valor</Label>
                              <CurrencyInput value={paymentAmount} onValueChange={setPaymentAmount} className="h-9 w-full border border-border rounded-md mt-1" />
                            </div>
                            <div>
                              <Label className="flex items-center gap-1">Método de pagamento</Label>
                              <Select value={paymentMethodId || ""} onValueChange={setPaymentMethodId}>
                                <SelectTrigger className="bg-input border border-border rounded-md h-9 mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                  {pmRegistry.map(pm => (
                                    <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Observações</Label>
                              <Textarea value={paymentObservations} onChange={(e)=>setPaymentObservations(e.target.value)} className="bg-input border border-border rounded-md mt-1" />
                            </div>
                            <div className="flex justify-end pt-1">
                              <Button onClick={handleAddPayment} disabled={savingPayment} className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold transition-all duration-200 shadow-sm hover:shadow-md">
                                <FaHandHoldingUsd className="h-4 w-4 mr-2" />
                                {savingPayment ? "Salvando..." : "Registrar pagamento"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        <AlertDialog open={!!confirmOverpayProntuario} onOpenChange={(open) => !open && setConfirmOverpayProntuario(null)}>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
                                <FaExclamationTriangle className="h-5 w-5" />
                                Valor maior que o saldo
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                O valor informado (R$ {confirmOverpayProntuario ? new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2 }).format(confirmOverpayProntuario.payAmount) : "0,00"}) é maior que o saldo pendente (R$ {confirmOverpayProntuario ? new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2 }).format(confirmOverpayProntuario.remaining) : "0,00"}). Deseja registrar apenas o saldo desta venda?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={handleConfirmOverpayProntuario} disabled={savingPayment} className="bg-emerald-600 hover:bg-emerald-700">
                                {savingPayment ? "Salvando..." : "Registrar apenas o saldo"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <Card className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] transition-all duration-200 hover:shadow-md">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <FaMoneyBillWave className="h-4 w-4 text-emerald-600" /> Pagamentos registrados
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {animalReceipts.length === 0 ? (
                              <p className="text-muted-foreground">Nenhum pagamento registrado.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Venda</TableHead>
                                      <TableHead>Data</TableHead>
                                      <TableHead className="text-right">Valor</TableHead>
                                      <TableHead>Método</TableHead>
                                      <TableHead className="text-right w-24">Ações</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {animalReceipts.map((r, index) => {
                                      const app = patientSales.find((s) => s.id === r.saleId)?.appointmentId;
                                      return (
                                        <TableRow key={r.id} className={cn(index % 2 === 1 && "bg-[#F9FAFB]", "transition-colors")}>
                                          <TableCell className="font-medium">{r.saleId || r.description}{app ? ` • Atend. ${app}` : ""}</TableCell>
                                          <TableCell>{formatDateTime(r.date, r.time)}</TableCell>
                                          <TableCell className="text-right font-bold text-emerald-600">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(r.amount)}</TableCell>
                                          <TableCell>{r.paymentMethod || "-"}</TableCell>
                                          <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="text-amber-700 hover:text-amber-800 hover:bg-amber-50" onClick={() => setReceiptIdToRefund(r.id)} title="Estornar pagamento">
                                              <FaUndo className="h-4 w-4 mr-1" /> Estornar
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      <AlertDialog open={!!receiptIdToRefund} onOpenChange={(open) => !open && setReceiptIdToRefund(null)}>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
                              <FaUndo className="h-5 w-5" /> Estornar pagamento
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              O valor deste recebimento voltará a aparecer como saldo pendente na venda. Confirma o estorno?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmEstorno} className="bg-amber-600 hover:bg-amber-700">
                              Estornar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Dialog open={budgetModalOpen} onOpenChange={setBudgetModalOpen}>
              <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Novo Orçamento</DialogTitle>
                  <DialogDescription>Crie uma proposta de cobrança (não gera movimentação financeira).</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-2">
                      <Label>Data</Label>
                      <Input type="date" value={budgetDate} onChange={(e)=>setBudgetDate(e.target.value)} className="h-9 bg-input border border-border rounded-md" />
                    </div>
                    <div className="col-span-6">
                      <Label>Item</Label>
                      <AutocompleteSelect
                        value={budgetSelectedItemId}
                        onChange={setBudgetSelectedItemId}
                        options={catalogItems.map(ci => ({ value: ci.id, label: `${ci.name} — ${new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(ci.price)}` }))}
                        placeholder="Selecione um item"
                        className="bg-input border border-border rounded-md"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Qtd</Label>
                      <Input type="number" value={budgetQty} onChange={(e)=>setBudgetQty(Number(e.target.value)||0)} className="h-9 bg-input border border-border rounded-md" />
                    </div>
                    <div className="col-span-2">
                      <Label>Preço Unitário</Label>
                      <CurrencyInput value={budgetUnitPrice} onValueChange={setBudgetUnitPrice} className="h-9 w-full border border-border rounded-md" />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={addItemToBudget} className="h-9 px-4">Adicionar</Button>
                  </div>

                  {budgetItems.length > 0 && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Qtd</TableHead>
                            <TableHead>Preço</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {budgetItems.map((it, idx)=>(
                            <TableRow key={`${it.itemId}-${idx}`}>
                              <TableCell className="font-medium">{it.name}</TableCell>
                              <TableCell className="capitalize">{it.type}</TableCell>
                              <TableCell>{it.qty}</TableCell>
                              <TableCell>{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(it.unitPrice)}</TableCell>
                              <TableCell className="text-right">{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(it.qty*it.unitPrice)}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={()=>removeBudgetItem(it.itemId, idx)}>
                                  <FaTrashAlt className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="flex justify-between mt-2 text-sm font-semibold">
                        <span>Total:</span>
                        <span>{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(budgetTotal)}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Observações</Label>
                    <Textarea value={budgetObservations} onChange={(e)=>setBudgetObservations(e.target.value)} className="bg-input border border-border rounded-md" />
                  </div>
                </div>

                <DialogFooter className="flex items-end justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div>
                      <Label>Validade (dias)</Label>
                      <Input type="number" value={budgetValidityDays} onChange={(e)=>setBudgetValidityDays(parseInt(e.target.value)||0)} className="h-9 bg-input border border-border rounded-md w-28" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={()=>setBudgetModalOpen(false)}>Cancelar</Button>
                    <Button onClick={saveBudget}>Salvar Orçamento</Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={convertModalOpen} onOpenChange={setConvertModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Converter Orçamento em Venda</DialogTitle>
                  <DialogDescription>Selecione o atendimento para criar a venda.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Atendimento</Label>
                    <Select value={convertAppointmentId} onValueChange={setConvertAppointmentId}>
                      <SelectTrigger className="bg-input border border-border rounded-md h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {animalAppointments.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.type} • {formatDateTime(a.date, a.time)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={()=>setConvertModalOpen(false)}>Cancelar</Button>
                  <Button onClick={confirmConvert} disabled={convertingBudget}>{convertingBudget ? "Convertendo..." : "Converter"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <SaleDetailModal
              open={!!selectedPdvSale}
              transaction={selectedPdvSale}
              onClose={() => setSelectedPdvSale(null)}
              onRequestCancel={(sale) => { setSelectedPdvSale(null); setPdvSaleToCancel(sale); }}
              onRequestDelete={(sale) => { setSelectedPdvSale(null); setPdvSaleToDelete(sale); }}
              clientName={currentClient?.name}
              clientPhone={currentClient?.phone || undefined}
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
              animalAge={
                (() => {
                  if (!currentAnimal) return undefined;
                  if (currentAnimal.birthday) {
                    const birth = new Date(currentAnimal.birthday);
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
        onCancelled={() => {
          void refetchFinancial();
          // Sincroniza o espelho local da aba "Vendas" (manual) com o status
          // real — sem isso o badge "Cancelada" não aparecia lá mesmo com o
          // estorno já revertendo estoque/recebimentos de verdade.
          if (pdvSaleToCancel) {
            const updated = patientSales.map((s) =>
              s.id === pdvSaleToCancel.id ? { ...s, saleStatus: "cancelled" as SaleStatusLocal } : s
            );
            setPatientSales(updated);
            writePatientSales(animalId, updated);
          }
        }}
        clientName={currentClient?.name}
        clientPhone={currentClient?.phone || undefined}
        animalName={currentAnimal?.name}
      />

      <DeleteSaleDialog
        open={!!pdvSaleToDelete}
        sale={pdvSaleToDelete}
        onClose={() => setPdvSaleToDelete(null)}
        onDeleted={() => { void refetchFinancial(); }}
      />

      <Dialog open={observationModalOpen} onOpenChange={setObservationModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observação</DialogTitle>
            <DialogDescription>Detalhes da observação registrada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-foreground">{selectedObservation?.observation}</p>
            {selectedObservation && (
              <p className="text-xs text-muted-foreground">Data: {formatDateTime(selectedObservation.date, selectedObservation.time)}</p>
            )}
          </div>
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

      <Dialog open={saleModalOpen} onOpenChange={setSaleModalOpen}>
        <DialogContent className="sm:max-w-3xl transition-all duration-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FaShoppingCart className="h-5 w-5 text-primary" /> Adicionar Venda
            </DialogTitle>
            <DialogDescription>Registre tudo que foi cobrado neste atendimento. A venda ficará vinculada ao atendimento e ao paciente.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="h-9 bg-input border border-border rounded-md" />
            </div>
            <div>
              <Label>Atendimento vinculado (opcional)</Label>
              <Select value={saleAppointmentId || "__none__"} onValueChange={(v) => setSaleAppointmentId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="bg-input border border-border rounded-md h-9"><SelectValue placeholder="Nenhum (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {animalAppointments.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.type} • {formatDateTime(a.date, a.time)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
              <div className="sm:col-span-2">
                <Label>Item</Label>
                <AutocompleteSelect
                  value={saleSelectedItemId}
                  onChange={setSaleSelectedItemId}
                  options={catalogItems.map(ci => ({ value: ci.id, label: `${ci.name} — ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(ci.price)}` }))}
                  placeholder="Selecione um item"
                  className="bg-input border border-border rounded-md"
                />
              </div>
              <div>
                <Label>Qtd</Label>
                <Input type="number" value={saleQty} onChange={(e) => setSaleQty(Number(e.target.value) || 0)} className="h-9 bg-input border border-border rounded-md" />
              </div>
              <div>
                <Label>Preço Unitário</Label>
                <CurrencyInput value={saleUnitPrice} onValueChange={setSaleUnitPrice} className="h-9 w-full border border-border rounded-md" />
              </div>
              <div>
                <Button onClick={addItemToSale} className="h-9 px-4">Adicionar</Button>
              </div>
            </div>
            {saleItems.length > 0 && (
              <div className="sm:col-span-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleItems.map((it, idx) => (
                      <TableRow key={`${it.itemId}-${idx}`}>
                        <TableCell className="font-medium">{it.name}</TableCell>
                        <TableCell className="capitalize">{it.type}</TableCell>
                        <TableCell>{it.qty}</TableCell>
                        <TableCell>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(it.unitPrice)}</TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(it.qty * it.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => removeSaleItem(it.itemId, idx)}>
                            <FaTrashAlt className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-between mt-2 text-sm font-semibold">
                  <span>Total:</span>
                  <span>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(saleTotal)}</span>
                </div>
              </div>
            )}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              <div>
                <Label>Responsável</Label>
                <Input
                  value={saleResponsible}
                  onChange={(e) => setSaleResponsible(e.target.value)}
                  className="h-9 bg-input border border-border rounded-md"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Observações</Label>
                <Textarea
                  value={saleObservations}
                  onChange={(e) => setSaleObservations(e.target.value)}
                  className="bg-input border border-border rounded-md"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaleModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSale} disabled={savingSale}>{savingSale ? "Salvando..." : "Salvar Venda"}</Button>
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