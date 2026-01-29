"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  FaArrowLeft, FaUsers, FaPaw, FaPlus, FaEye, FaStethoscope, FaCalendarAlt, FaDollarSign, FaSyringe, FaWeightHanging, FaFileAlt, FaClipboardList, FaCommentAlt, FaHeart, FaMale, FaUser, FaPrint, FaDownload, FaTimes, FaSave, FaBalanceScale, FaFileMedical, FaExclamationTriangle, FaFlask, FaTag, FaBox, FaClock, FaMoneyBillWave, FaArrowUp, FaArrowDown, FaTrashAlt, FaPrescriptionBottleAlt, FaEdit, FaIdCard, FaPhone
} from "react-icons/fa";
import { FaMapMarkerAlt } from "react-icons/fa";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { PrescriptionEntry } from "@/types/medication";
import { mockPrescriptions } from "@/mockData/prescriptions";
import { cn, formatDateTime } from "@/lib/utils";
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
import { pdf } from "@react-pdf/renderer";
import { PrescriptionPdfContent } from "@/components/PrescriptionPdfContent";
import { ExamReportPdfContent } from "@/components/ExamReportPdfContent";
import { mockFinancialTransactions, addMockFinancialTransaction } from "@/mockData/financial";
import { AppointmentEntry, BaseAppointmentDetails } from "@/types/appointment";
import { mockClients, updateAnimalDetails } from "@/mockData/clients";
import { Client, Animal, WeightEntry } from "@/types/client";
import { mockAppointments } from "@/mockData/appointments";
import { ExamEntry } from "@/types/exam";
import { mockExams } from "@/mockData/exams";
import { hemogramReferences } from "@/constants/examReferences";
import { mockUserSettings } from "@/mockData/settings";
import { useHorizontalScroll } from "@/hooks/use-horizontal-scroll";
import AutocompleteSelect from "@/components/AutocompleteSelect";
import CurrencyInput from "@/components/CurrencyInput";
import { getCatalog, findCatalogItem, adjustStock } from "@/mockData/catalog";
import { getRegistryList } from "@/mockData/registry";
import BudgetReportPdfContent from "@/components/BudgetReportPdfContent";
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

// Tipos locais para documentos e observações
interface DocumentEntry {
  id: string;
  date: string;
  time: string;
  name: string;
  fileUrl: string;
}
interface ObservationEntry {
  id: string;
  date: string;
  time: string;
  observation: string;
  displayAsAlert?: boolean;
}

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
type SaleStatusLocal = "open" | "finalized";
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
  'Atendimento': { dot: 'timeline-dot-blue', badge: 'badge-soft-blue' },        // Azul forte
  'Exame': { dot: 'timeline-dot-purple', badge: 'badge-soft-purple' },          // Roxo
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
    case 'Atendimento': return 'icon-soft-blue';
    case 'Exame': return 'icon-soft-purple';
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
const PatientRecordPage = () => {
  const { clientId, animalId } = useParams<{ clientId: string; animalId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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
  }, [mockClients, clientId, animalId]);

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

  const tabScrollRef = useHorizontalScroll<HTMLDivElement>();

  const [animalAppointments, setAnimalAppointments] = useState<AppointmentEntry[]>(
    mockAppointments.filter(app => app.animalId === animalId)
  );
  useEffect(() => {
    setAnimalAppointments(mockAppointments.filter(app => app.animalId === animalId));
  }, [mockAppointments, animalId]);

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

  const [documents, setDocuments] = useState<DocumentEntry[]>([
    { id: "d1", date: "2023-05-01", time: "10:00", name: "Termo de Adoção", fileUrl: "#" },
    { id: "d2", date: "2024-02-10", time: "14:30", name: "Autorização Cirúrgica", fileUrl: "#" },
  ]);
  const [newDocumentName, setNewDocumentName] = useState<string>("");
  const [newDocumentFile, setNewDocumentFile] = useState<File | null>(null);

  const [prescriptions, setPrescriptions] = useState<PrescriptionEntry[]>(mockPrescriptions);
  useEffect(() => {
    setPrescriptions([...mockPrescriptions]);
  }, [location.pathname]);

  const [observations, setObservations] = useState<ObservationEntry[]>([
    { id: "o1", date: "2023-09-20", time: "10:00", observation: "Animal apresentou melhora significativa após tratamento." },
    { id: "o2", date: "2024-01-05", time: "15:00", observation: "Recomendado check-up anual em 6 meses." },
  ]);
  const [newObservation, setNewObservation] = useState<string>("");
  const [newObservationAlert, setNewObservationAlert] = useState<boolean>(false);
  const isObservationEmpty = !newObservation || newObservation.trim().length === 0;

  const [examsList, setExamsList] = useState<ExamEntry[]>(mockExams.filter(exam => exam.id.startsWith('exam')));
  useEffect(() => {
    setExamsList([...mockExams]);
  }, [mockExams, animalId]);

  const [observationModalOpen, setObservationModalOpen] = useState(false);
  const [selectedObservation, setSelectedObservation] = useState<ObservationEntry | null>(null);

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

  const [patientPayments, setPatientPayments] = useState<PatientPaymentMeta[]>(readPatientPayments(animalId));
  useEffect(() => { setPatientPayments(readPatientPayments(animalId)); }, [animalId]);

  const [patientBudgets, setPatientBudgets] = useState<PatientBudgetMeta[]>(readPatientBudgets(animalId));
  useEffect(() => { setPatientBudgets(readPatientBudgets(animalId)); }, [animalId]);

  const catalogItems = getCatalog().filter(i => i.active);

  const [saleModalOpen, setSaleModalOpen] = useState(false);
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
    const item = findCatalogItem(saleSelectedItemId);
    setSaleUnitPrice(item?.price || 0);
  }, [saleSelectedItemId]);

  const saleTotal = saleItems.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);

  const addItemToSale = () => {
    if (!saleSelectedItemId) { toast.error("Selecione um item."); return; }
    if (saleQty <= 0 || saleUnitPrice <= 0) { toast.error("Qtd e preço devem ser válidos."); return; }
    const catItem = findCatalogItem(saleSelectedItemId);
    if (!catItem) { toast.error("Item não encontrado."); return; }
    setSaleItems(prev => [...prev, { itemId: catItem.id, name: catItem.name, type: catItem.type, qty: saleQty, unitPrice: saleUnitPrice }]);
    setSaleSelectedItemId(""); setSaleQty(1); setSaleUnitPrice(0);
  };

  const removeSaleItem = (itemId: string, index: number) => {
    setSaleItems(prev => prev.filter((_, i) => !(i === index && _.itemId === itemId)));
  };

  const handleSaveSale = () => {
    if (!saleAppointmentId) { toast.error("Selecione o atendimento vinculado."); return; }
    if (saleItems.length === 0) { toast.error("Adicione itens à venda."); return; }
    if (!currentClient || !currentAnimal) { toast.error("Cliente/animal não encontrados."); return; }

    const nextId = `ft${mockFinancialTransactions.length + 1}`;
    addMockFinancialTransaction({
      date: saleDate,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      description: `Venda atendimento ${saleAppointmentId}: ${saleItems.map(i => `${i.name} x${i.qty}`).join(", ")}`,
      type: "income",
      amount: saleTotal,
      category: "Venda de Produtos",
      relatedAnimalId: currentAnimal.id,
      relatedClientId: currentClient.id,
    });

    saleItems.forEach(it => {
      const cat = findCatalogItem(it.itemId);
      if (cat && cat.type === "product") adjustStock(it.itemId, -it.qty);
    });

    const newSaleMeta: PatientSaleMeta = {
      id: nextId,
      date: saleDate,
      appointmentId: saleAppointmentId,
      items: saleItems,
      total: saleTotal,
      saleStatus: saleStatusLocal,
      origin: "manual",
      responsible: saleResponsible || animalAppointments.find(a => a.id === saleAppointmentId)?.vet || undefined,
      observations: saleObservations || undefined,
    };
    const updated = [...patientSales, newSaleMeta];
    setPatientSales(updated); writePatientSales(animalId, updated);

    setSaleModalOpen(false);
    setSaleDate(new Date().toISOString().split("T")[0]);
    setSaleAppointmentId(""); setSaleResponsible(""); setSaleObservations(""); setSaleStatusLocal("open"); setSaleItems([]);
    toast.success("Venda registrada com sucesso!");
  };

  const updateSaleStatus = (saleId: string, status: SaleStatusLocal) => {
    const updated = patientSales.map(s => (s.id === saleId ? { ...s, saleStatus: status } : s));
    setPatientSales(updated); writePatientSales(animalId, updated);
  };

  const getPaidForSale = (saleId: string): number => patientPayments.filter(p => p.saleId === saleId).reduce((sum, p) => sum + p.amount, 0);
  const getFinancialStatusForSale = (saleId: string, saleAmount: number): "paid" | "partial" | "pending" => {
    const paid = getPaidForSale(saleId);
    if (paid >= saleAmount) return "paid";
    if (paid > 0) return "partial";
    return "pending";
  };

  const pmRegistry = getRegistryList("paymentMethods");
  const [paymentSaleId, setPaymentSaleId] = useState<string | undefined>(undefined);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentTime, setPaymentTime] = useState<string>(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethodId, setPaymentMethodId] = useState<string | undefined>(undefined);
  const [paymentObservations, setPaymentObservations] = useState<string>("");

  const canRegisterPayment = (saleId: string): boolean => {
    const sale = patientSales.find(s => s.id === saleId);
    if (!sale) return false;
    return getFinancialStatusForSale(saleId, sale.total) !== "paid";
  };

  const handleAddPayment = () => {
    if (!paymentSaleId) {
      toast.error("Selecione a venda vinculada.");
      return;
    }
    const saleMeta = patientSales.find(s => s.id === paymentSaleId);
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

    const pmName = paymentMethodId ? (pmRegistry.find(pm => pm.id === paymentMethodId)?.name || undefined) : undefined;

    const nextReceiptId = `ft${mockFinancialTransactions.length + 1}`;
    addMockFinancialTransaction({
      date: paymentDate,
      time: paymentTime,
      description: `Recebimento da venda ${paymentSaleId}`,
      type: "income",
      amount: paymentAmount,
      category: "Recebimento",
      relatedAnimalId: currentAnimal.id,
      relatedClientId: currentClient.id,
      paymentMethod: pmName,
    });

    const newPayment: PatientPaymentMeta = {
      id: nextReceiptId,
      saleId: paymentSaleId,
      date: paymentDate,
      time: paymentTime,
      amount: paymentAmount,
      paymentMethod: pmName,
      observations: paymentObservations || undefined,
    };
    const updatedPayments = [...patientPayments, newPayment];
    setPatientPayments(updatedPayments); writePatientPayments(animalId, updatedPayments);

    setPaymentSaleId(undefined);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentTime(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    setPaymentAmount(0);
    setPaymentMethodId(undefined);
    setPaymentObservations("");
    toast.success("Pagamento registrado!");
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
    const it = findCatalogItem(budgetSelectedItemId);
    setBudgetUnitPrice(it?.price || 0);
  }, [budgetSelectedItemId]);

  const budgetTotal = budgetItems.reduce((s, it) => s + it.qty * it.unitPrice, 0);

  const addItemToBudget = () => {
    if (!budgetSelectedItemId) { toast.error("Selecione um item."); return; }
    if (budgetQty <= 0 || budgetUnitPrice <= 0) { toast.error("Qtd e preço devem ser válidos."); return; }
    const cat = findCatalogItem(budgetSelectedItemId);
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
    const budgetForPdf: any = {
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

    const newWin = window.open("", "_blank");
    const blob = await pdf(<BudgetReportPdfContent budget={budgetForPdf} />).toBlob();
    const url = URL.createObjectURL(blob);
    if (newWin) {
      newWin.location.href = url;
    } else {
      window.open(url, "_blank");
    }
  };

  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertTargetBudgetId, setConvertTargetBudgetId] = useState<string | null>(null);
  const [convertAppointmentId, setConvertAppointmentId] = useState<string>("");

  const openConvertModal = (id: string) => {
    setConvertTargetBudgetId(id);
    setConvertAppointmentId("");
    setConvertModalOpen(true);
  };
  const confirmConvert = () => {
    if (!convertTargetBudgetId) return;
    if (!convertAppointmentId) { toast.error("Selecione um atendimento para converter em venda."); return; }
    const ok = convertBudgetToSale(convertTargetBudgetId, convertAppointmentId);
    if (ok) {
      setConvertModalOpen(false);
      setConvertTargetBudgetId(null);
      setConvertAppointmentId("");
    }
  };

  const convertBudgetToSale = (id: string, appointmentId: string): boolean => {
    const b = patientBudgets.find(x => x.id === id);
    if (!b) return false;
    if (isBudgetExpired(b)) { toast.error("Orçamento expirado. Não é possível converter."); return false; }
    if (!currentClient || !currentAnimal) { toast.error("Cliente/animal não encontrados."); return false; }

    const nextId = `ft${mockFinancialTransactions.length + 1}`;
    addMockFinancialTransaction({
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      description: `Orçamento convertido (atend. ${appointmentId}): ${b.items.map(i => `${i.name} x${i.qty}`).join(", ")}`,
      type: "income",
      amount: b.total,
      category: "Venda de Produtos",
      relatedAnimalId: currentAnimal.id,
      relatedClientId: currentClient.id,
    });

    b.items.forEach(it => {
      const cat = findCatalogItem(it.itemId);
      if (cat && cat.type === "product") adjustStock(it.itemId, -it.qty);
    });

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

  // ADDED: Navegar para a edição do animal
  const handleEditAnimal = () => {
    navigate(`/clients/${clientId}/animals/${animalId}/edit`);
  };

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
      badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      author: app.vet || mockUserSettings.userName,
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
      badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      author: exam.vet || mockUserSettings.userName,
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
      author: mockUserSettings.userName,
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
      author: mockUserSettings.userName,
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
      author: mockUserSettings.userName,
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
      author: mockUserSettings.userName,
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
      author: mockUserSettings.userName,
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
    if (dotClass.includes("timeline-dot-blue")) return "#93c5fd";
    if (dotClass.includes("timeline-dot-purple")) return "#c4b5fd";
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
                    <h2 className="text-2xl sm:text-[1.9rem] leading-tight font-semibold tracking-tight truncate">
                      {currentAnimal.name}
                    </h2>
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
                            <FaIdCard className="h-3.5 w-3.5 text-sky-600" />
                            <span>
                              <span className="text-foreground/70 font-medium">
                                {currentClient.clientType === "physical" ? "CPF" : "CNPJ"}:
                              </span>{" "}
                              <span className="font-semibold text-foreground/90">{currentClient.identificationNumber || "-"}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FaIdCard className="h-3.5 w-3.5 text-sky-600" />
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
                        patientPayments.reduce((sum, p) => sum + p.amount, 0)
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
          <div ref={tabScrollRef} className="relative w-full overflow-x-auto overflow-y-hidden no-scrollbar scroll-smooth select-none">
            <TabsList className="inline-flex w-max items-center whitespace-nowrap border-b border-border/40 bg-transparent p-0 rounded-none gap-1">
              <TabsTrigger
                value="timeline"
                style={{ ["--tab-accent" as any]: "#d97706" }}
                className="tab-active-line relative -mb-px pb-2 px-2.5 md:px-3.5 shrink-0 text-sm md:text-[0.95rem] text-slate-600 dark:text-slate-300 hover:text-foreground hover:bg-muted/30 rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaClock className="h-4 w-4 mr-1.5 md:mr-2 text-amber-600" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Linha do Tempo</span>
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">{sortedTimelineEvents.length}</span>
              </TabsTrigger>
              <TabsTrigger
                value="appointments"
                style={{ ["--tab-accent" as any]: "#0d9488" }}
                className="tab-active-line relative -mb-px pb-2 px-2.5 md:px-3.5 shrink-0 text-sm md:text-[0.95rem] text-slate-600 dark:text-slate-300 hover:text-foreground hover:bg-muted/30 rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaStethoscope className="h-4 w-4 mr-1.5 md:mr-2 text-teal-600" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Atendimento</span>
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">{animalAppointments.length}</span>
              </TabsTrigger>
              <TabsTrigger
                value="exams"
                style={{ ["--tab-accent" as any]: "#7c3aed" }}
                className="tab-active-line relative -mb-px pb-2 px-2.5 md:px-3.5 shrink-0 text-sm md:text-[0.95rem] text-slate-600 dark:text-slate-300 hover:text-foreground hover:bg-muted/30 rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaFlask className="h-4 w-4 mr-1.5 md:mr-2 text-violet-600" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Exames</span>
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">{examsList.length}</span>
              </TabsTrigger>
              <TabsTrigger
                value="vaccines"
                style={{ ["--tab-accent" as any]: "#0284c7" }}
                className="tab-active-line relative -mb-px pb-2 px-2.5 md:px-3.5 shrink-0 text-sm md:text-[0.95rem] text-slate-600 dark:text-slate-300 hover:text-foreground hover:bg-muted/30 rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaSyringe className="h-4 w-4 mr-1.5 md:mr-2 text-sky-600" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Vacinas</span>
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">{vaccineAppointmentsCount}</span>
              </TabsTrigger>
              <TabsTrigger
                value="weight"
                style={{ ["--tab-accent" as any]: "#059669" }}
                className="tab-active-line relative -mb-px pb-2 px-2.5 md:px-3.5 shrink-0 text-sm md:text-[0.95rem] text-slate-600 dark:text-slate-300 hover:text-foreground hover:bg-muted/30 rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaWeightHanging className="h-4 w-4 mr-1.5 md:mr-2 text-emerald-600" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Peso</span>
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">{weightHistory.length}</span>
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                style={{ ["--tab-accent" as any]: "#475569" }}
                className="tab-active-line relative -mb-px pb-2 px-2.5 md:px-3.5 shrink-0 text-sm md:text-[0.95rem] text-slate-600 dark:text-slate-300 hover:text-foreground hover:bg-muted/30 rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaFileAlt className="h-4 w-4 mr-1.5 md:mr-2 text-slate-600 dark:text-slate-200" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Documentos</span>
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">{documents.length}</span>
              </TabsTrigger>
              <TabsTrigger
                value="prescriptions"
                style={{ ["--tab-accent" as any]: "#047857" }}
                className="tab-active-line relative -mb-px pb-2 px-2.5 md:px-3.5 shrink-0 text-sm md:text-[0.95rem] text-slate-600 dark:text-slate-300 hover:text-foreground hover:bg-muted/30 rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaPrescriptionBottleAlt className="h-4 w-4 mr-1.5 md:mr-2 text-emerald-700" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Receitas</span>
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">{prescriptions.length}</span>
              </TabsTrigger>
              <TabsTrigger
                value="observations"
                style={{ ["--tab-accent" as any]: "#e11d48" }}
                className="tab-active-line relative -mb-px pb-2 px-2.5 md:px-3.5 shrink-0 text-sm md:text-[0.95rem] text-slate-600 dark:text-slate-300 hover:text-foreground hover:bg-muted/30 rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaCommentAlt className="h-4 w-4 mr-1.5 md:mr-2 text-rose-600" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Observações</span>
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">{observations.length}</span>
              </TabsTrigger>
              <TabsTrigger
                value="financial"
                style={{ ["--tab-accent" as any]: "#F79009" }}
                className="tab-active-line relative -mb-px pb-2 px-2.5 md:px-3.5 shrink-0 text-sm md:text-[0.95rem] text-slate-600 dark:text-slate-300 hover:text-foreground hover:bg-muted/30 rounded-md transition-colors data-[state=active]:text-foreground data-[state=active]:font-semibold"
              >
                <FaMoneyBillWave className="h-4 w-4 mr-1.5 md:mr-2 text-[#F79009]" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Financeiro</span>
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">{patientSales.length}</span>
              </TabsTrigger>
            </TabsList>
          </div>

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
              setAnimalAppointments={setAnimalAppointments}
            />
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
                            <Button variant="ghost" size="icon" onClick={() => {
                              const tutorAddress = `${currentClient.address.street}, ${currentClient.address.number} - ${currentClient.address.city} - ${currentClient.address.state}`;
                              pdf(
                                <ExamReportPdfContent
                                  animalName={currentAnimal.name}
                                  animalId={currentAnimal.id}
                                  animalSpecies={currentAnimal.species}
                                  tutorName={currentClient.name}
                                  tutorAddress={tutorAddress}
                                  exam={exam}
                                  hemogramReferences={hemogramReferences}
                                />
                              ).toBlob().then((blob) => {
                                const url = URL.createObjectURL(blob);
                                window.open(url, '_blank');
                                URL.revokeObjectURL(url);
                                toast.success("Laudo de exame enviado para impressão!");
                              });
                            }} className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200">
                              <FaPrint className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/clients/${clientId}/animals/${animalId}/edit-exam/${exam.id}`)} className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200">
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

          <TabsContent value="vaccines" className="mt-4">
            <PatientVaccinesTab
              clientId={clientId!}
              animalId={animalId!}
              animalAppointments={animalAppointments}
            />
          </TabsContent>

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
                  <Button size="sm" onClick={() => {
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
                  }} disabled={!newWeight.trim()} className="w-full sm:w-auto rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
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
                  <Button size="sm" onClick={() => {
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
                  }} disabled={!newDocumentName || !newDocumentFile} className="w-full sm:w-auto rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
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

          <TabsContent value="prescriptions" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Link to={`/clients/${clientId}/animals/${animalId}/add-prescription?type=simple`}>
                <Card className="flex flex-col items-center justify-center p-6 text-center bg-card shadow-sm border border-border rounded-md h-full">
                  <FaFileMedical className="h-12 w-12 text-primary mb-3" />
                  <CardTitle className="text-lg font-semibold text-foreground">Receita Simples</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Medicamentos de uso comum</p>
                </Card>
              </Link>
              <Link to={`/clients/${clientId}/animals/${animalId}/add-prescription?type=controlled`}>
                <Card className="flex flex-col items-center justify-center p-6 text-center bg-card shadow-sm border border-border rounded-md h-full">
                  <FaExclamationTriangle className="h-12 w-12 text-destructive mb-3" />
                  <CardTitle className="text-lg font-semibold text-foreground">Receita Controlada</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Medicamentos controlados</p>
                </Card>
              </Link>
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
                            <Button variant="ghost" size="icon" onClick={() => {
                              if (!currentClient || !currentAnimal) {
                                toast.error("Erro: Dados do cliente ou animal não disponíveis para impressão.");
                                return;
                              }
                              pdf(
                                PrescriptionPdfContent({
                                  animalName: currentAnimal.name,
                                  animalId: currentAnimal.id,
                                  animalSpecies: currentAnimal.species,
                                  tutorName: currentClient.name,
                                  tutorAddress: currentClient.address.street + ", " + currentClient.address.number + " - " + currentClient.address.city + " - " + currentClient.address.state,
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
                                })
                              ).toBlob().then((blob) => {
                                const url = URL.createObjectURL(blob);
                                window.open(url, '_blank');
                                URL.revokeObjectURL(url);
                                toast.success("Receita enviada para impressão!");
                              });
                            }} className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200">
                              <FaPrint className="h-4 w-4" />
                            </Button>
                            <Link to={`/clients/${clientId}/animals/${animalId}/edit-prescription/${rx.id}?type=${rx.type}`}>
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
                            <FaStethoscope className="h-3 w-3" /> Dr. William Cardoso
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

          <TabsContent value="observations" className="mt-4">
            <Card className="bg-card shadow-sm border border-border rounded-md">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaCommentAlt className="h-5 w-5 text-primary" /> Observações Gerais
                </CardTitle>
                <Button size="sm" onClick={() => {
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
                }} disabled={isObservationEmpty} className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setSelectedObservation(obs); setObservationModalOpen(true); }}
                            className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                          >
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

          <TabsContent value="financial" className="mt-4">
            <Card className="bg-white rounded-[12px] shadow-sm border-0">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaMoneyBillWave className="h-5 w-5 text-primary" /> Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Tabs value={financeTab} onValueChange={(v) => setFinanceTab(v as any)} className="w-full">
                  <TabsList className="grid grid-cols-3 w-full mb-4">
                    <TabsTrigger value="orcamentos">Orçamentos</TabsTrigger>
                    <TabsTrigger value="vendas">Vendas</TabsTrigger>
                    <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
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
                                  statusDisplay === "convertido" ? "bg-indigo-600 text-white" :
                                  statusDisplay === "aprovado" ? "bg-emerald-600 text-white" :
                                  statusDisplay === "expirado" ? "bg-red-600 text-white" :
                                  statusDisplay === "cancelado" ? "bg-gray-300 text-gray-900" :
                                  "bg-blue-600 text-white";
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
                      {patientSales.length > 0 ? (
                        <div className="space-y-4">
                          {patientSales.map((sale) => {
                            const paid = getPaidForSale(sale.id);
                            const saldo = Math.max(0, sale.total - paid);
                            const finStatus = getFinancialStatusForSale(sale.id, sale.total);
                            const app = animalAppointments.find(a => a.id === sale.appointmentId);
                            return (
                              <Card key={sale.id} className="p-4 bg-white rounded-[12px] shadow-sm border border-[#E2E8F0]">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-3">
                                  <div className="flex items-center gap-3">
                                    <Badge className={cn(
                                      "px-3 py-1 text-sm font-bold rounded-full",
                                      sale.saleStatus === "open" ? "bg-orange-600 text-white" : "bg-green-600 text-white"
                                    )}>
                                      {sale.saleStatus === "open" ? "Venda Aberta" : "Venda Finalizada"} {sale.origin === "orcamento" ? "• (de orçamento)" : ""}
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
                                    <FaCalendarAlt className="h-3 w-3" /> {formatDateTime(sale.date)}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <FaTag className="h-3 w-3" /> Status financeiro: {finStatus === "paid" ? "Pago" : finStatus === "partial" ? "Parcial" : "Pendente"}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <FaStethoscope className="h-3 w-3" /> Atendimento: {sale.appointmentId}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mt-3">
                                  <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => updateSaleStatus(sale.id, sale.saleStatus === "open" ? "finalized" : "open")}>
                                      {sale.saleStatus === "open" ? "Finalizar venda" : "Reabrir venda"}
                                    </Button>
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
                      ) : (
                        <p className="text-muted-foreground">Nenhuma venda registrada para este paciente.</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="financeiro">
                    <div className="bg-[#F5F7FA] p-4 rounded-[12px]">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card className="bg-white rounded-[12px] shadow-sm border border-[#E2E8F0]">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Registrar pagamento</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <Label>Venda</Label>
                              <Select value={paymentSaleId || ""} onValueChange={(v) => setPaymentSaleId(v)}>
                                <SelectTrigger className="bg-input border border-border rounded-md h-9"><SelectValue placeholder="Selecione a venda" /></SelectTrigger>
                                <SelectContent>
                                  {patientSales
                                    .filter(s => getPaidForSale(s.id) < s.total)
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
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label>Data</Label>
                                <Input type="date" value={paymentDate} onChange={(e)=>setPaymentDate(e.target.value)} className="h-9 bg-input border border-border rounded-md" />
                              </div>
                              <div>
                                <Label>Hora</Label>
                                <Input value={paymentTime} onChange={(e)=>setPaymentTime(e.target.value)} className="h-9 bg-input border border-border rounded-md" />
                              </div>
                            </div>
                            <div>
                              <Label>Valor</Label>
                              <CurrencyInput value={paymentAmount} onValueChange={setPaymentAmount} className="h-9 w-full border border-border rounded-md" />
                            </div>
                            <div>
                              <Label>Método de pagamento</Label>
                              <Select value={paymentMethodId || ""} onValueChange={setPaymentMethodId}>
                                <SelectTrigger className="bg-input border border-border rounded-md h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                  {pmRegistry.map(pm => (
                                    <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Observações</Label>
                              <Textarea value={paymentObservations} onChange={(e)=>setPaymentObservations(e.target.value)} className="bg-input border border-border rounded-md" />
                            </div>
                            <div className="flex justify-end">
                              <Button onClick={handleAddPayment} className="rounded-md bg-[#0F4C5C] text-white hover:bg-[#0d3f4b] font-semibold transition-colors shadow-sm hover:shadow-md">
                                Registrar pagamento
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-white rounded-[12px] shadow-sm border border-[#E2E8F0]">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Pagamentos registrados</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {patientPayments.length === 0 ? (
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
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {patientPayments.map((p, index) => {
                                      const app = patientSales.find(s => s.id === p.saleId)?.appointmentId;
                                      return (
                                        <TableRow key={p.id} className={cn(index % 2 === 1 && "bg-[#F9FAFB]")}>
                                          <TableCell className="font-medium">{p.saleId}{app ? ` • Atend. ${app}` : ""}</TableCell>
                                          <TableCell>{formatDateTime(p.date)}</TableCell>
                                          <TableCell className="text-right font-bold">{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(p.amount)}</TableCell>
                                          <TableCell>{p.paymentMethod || "-"}</TableCell>
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
                  <Button onClick={confirmConvert}>Converter</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>

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

      <Dialog open={saleModalOpen} onOpenChange={setSaleModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Adicionar Venda</DialogTitle>
            <DialogDescription>Registre tudo que foi cobrado neste atendimento.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="h-9 bg-input border border-border rounded-md" />
            </div>
            <div>
              <Label>Atendimento vinculado</Label>
              <Select value={saleAppointmentId} onValueChange={setSaleAppointmentId}>
                <SelectTrigger className="bg-input border border-border rounded-md h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
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
            <Button onClick={handleSaveSale}>Salvar Venda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientRecordPage;