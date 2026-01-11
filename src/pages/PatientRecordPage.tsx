"use client";

import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  FaArrowLeft, FaUsers, FaPaw, FaPlus, FaEye, FaStethoscope, FaCalendarAlt, FaDollarSign, FaSyringe, FaWeightHanging, FaFileAlt, FaClipboardList, FaCommentAlt, FaHeart, FaMale, FaUser, FaPrint, FaDownload, FaTimes, FaSave, FaBalanceScale, FaFileMedical, FaExclamationTriangle, FaFlask, FaTag, FaBox, FaClock, FaMoneyBillWave, FaArrowUp, FaArrowDown, FaTrashAlt, FaPrescriptionBottleAlt, FaEdit, FaIdCard, FaPhone
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
// NEW: importar Alert e Checkbox
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
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
import { FinancialTransaction, mockFinancialTransactions, addMockFinancialTransaction } from "@/mockData/financial"; // Importar mock data financeiro
import { AppointmentEntry, BaseAppointmentDetails, ConsultationDetails } from "@/types/appointment"; // Importar a nova interface de atendimento
import { mockClients, updateAnimalDetails } from "@/mockData/clients"; // Importar o mock de clientes centralizado e updateAnimalDetails
import { Client, Animal, WeightEntry } from "@/types/client"; // Importar as interfaces Client, Animal e WeightEntry
import { mockAppointments } from "@/pages/AddAppointmentPage"; // Importar mockAppointments do AddAppointmentPage
import { ExamEntry, ExamReportData, HemogramReference, HemogramReferenceValue } from "@/types/exam"; // Importar a interface ExamEntry e ExamReportData, e as interfaces de referência
import { mockExams } from "@/mockData/exams";
import { hemogramReferences } from "@/constants/examReferences";
import { mockUserSettings } from "@/mockData/settings";
// NOVO: hook de scroll horizontal para TabViewer
import { useHorizontalScroll } from "@/hooks/use-horizontal-scroll";

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

// Mock data para vacinas (base inicial; gerida via estado)
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
  // NEW:
  summary?: string;
  author?: string;
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

// Tipagens locais e storage para vendas e pagamentos no prontuário
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

// NOVO: orçamento no prontuário (sem atendimento na criação)
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

// Mock data para catalogo de produtos e serviços
import AutocompleteSelect from "@/components/AutocompleteSelect";
import CurrencyInput from "@/components/CurrencyInput";
import { getCatalog, findCatalogItem, adjustStock } from "@/mockData/catalog";
import { getRegistryList } from "@/mockData/registry";

// ADDED: importar o conteúdo de PDF de orçamento
import BudgetReportPdfContent from "@/components/BudgetReportPdfContent";

// Helper para identidade visual por tipo de evento (dot + badge suaves)
const EVENT_STYLES: Record<string, { dot: string; badge: string }> = {
  'Atendimento': { dot: 'timeline-dot-blue', badge: 'badge-soft-blue' },
  'Exame': { dot: 'timeline-dot-purple', badge: 'badge-soft-purple' },
  'Receita': { dot: 'timeline-dot-green', badge: 'badge-soft-green' },
  'Peso': { dot: 'timeline-dot-amber', badge: 'badge-soft-amber' },
  'Venda': { dot: 'timeline-dot-teal', badge: 'badge-soft-teal' },
  'Financeiro': { dot: 'timeline-dot-teal', badge: 'badge-soft-teal' },
  'Documento': { dot: 'timeline-dot-orange', badge: 'badge-soft-orange' },
  'Observação': { dot: 'timeline-dot-gray', badge: 'badge-soft-gray' },
};
const getEventStyle = (type: string) => EVENT_STYLES[type] || { dot: 'timeline-dot-gray', badge: 'badge-soft-gray' };

// Helper para cor da bolinha baseado na cor do badge da timeline
const getNodeColorClass = (badge?: string) => {
  const c = (badge || "").toLowerCase();
  if (c.includes("green")) return "bg-green-500";
  if (c.includes("red")) return "bg-red-500";
  if (c.includes("purple")) return "bg-purple-500";
  if (c.includes("yellow")) return "bg-yellow-500";
  if (c.includes("blue")) return "bg-blue-500";
  if (c.includes("teal")) return "bg-teal-500";
  if (c.includes("orange")) return "bg-orange-500";
  if (c.includes("gray")) return "bg-gray-400";
  return "bg-[#0F4C5C]";
};

// PatientRecordPage
const PatientRecordPage = () => {
  const { clientId, animalId } = useParams<{ clientId: string; animalId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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

  // NOVO: ref para scroll horizontal da barra de abas
  const tabScrollRef = useHorizontalScroll<HTMLDivElement>();

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
  const [newObservationAlert, setNewObservationAlert] = useState<boolean>(false);

  // Guardas seguros para uso em JSX
  const isObservationEmpty = !newObservation || newObservation.trim().length === 0;

  // State para a lista de exames e o modal de adição
  const [examsList, setExamsList] = useState<ExamEntry[]>(mockExams.filter(exam => exam.id.startsWith('exam'))); // Inicialmente vazio, pois a adição é feita em outra página
  
  // Use useEffect to update the state if mockExams changes (e.e., after a save)
  useEffect(() => {
    setExamsList([...mockExams]); // Create a new array reference to trigger re-render
  }, [mockExams, animalId]); // Dependência em mockExams para re-renderizar quando ele é alterado

  // Estado de Vacinas e diálogos
  const [vaccines, setVaccines] = useState(mockVaccines);
  const [vaccineAddOpen, setVaccineAddOpen] = useState(false);
  const [vaccineViewOpen, setVaccineViewOpen] = useState(false);
  const [selectedVaccine, setSelectedVaccine] = useState<(typeof mockVaccines)[number] | null>(null);
  const [vaccineForm, setVaccineForm] = useState({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    type: "",
    nextDue: "",
    vet: "",
  });

  // Modal: Observação
  const [observationModalOpen, setObservationModalOpen] = useState(false);
  const [selectedObservation, setSelectedObservation] = useState<ObservationEntry | null>(null);

  // Modal: Peso
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState<WeightEntry | null>(null);

  // Filtrar transações financeiras relacionadas a este animal
  const animalFinancialTransactions = mockFinancialTransactions.filter(
    (t) =>
      t.relatedAnimalId === animalId &&
      !(t.type === 'income' && t.category === 'Venda de Produtos') // EXCLUI vendas para não duplicar com a aba Vendas
  );

  // Filtrar transações de vendas relacionadas a este animal (para linha do tempo e exibição)
  const animalSalesTransactions = mockFinancialTransactions.filter(
    (t) => t.relatedAnimalId === animalId && t.type === 'income' && t.category === 'Venda de Produtos'
  );

  // Estado e form para lançamento financeiro
  const [financeModalOpen, setFinanceModalOpen] = useState(false);
  const [financeForm, setFinanceForm] = useState({ description: "", amount: "", type: "income" as "income" | "expense", category: "", paymentMethod: "" });

  // Estado para gerenciamento de vendas locais (único; consolidado)
  const [patientSales, setPatientSales] = useState<PatientSaleMeta[]>(readPatientSales(animalId));
  useEffect(() => { setPatientSales(readPatientSales(animalId)); }, [animalId]);

  // Estado para pagamentos locais
  const [patientPayments, setPatientPayments] = useState<PatientPaymentMeta[]>(readPatientPayments(animalId));
  useEffect(() => { setPatientPayments(readPatientPayments(animalId)); }, [animalId]);

  // NOVO: estado para orçamentos do prontuário
  const [patientBudgets, setPatientBudgets] = useState<PatientBudgetMeta[]>(readPatientBudgets(animalId));
  useEffect(() => { setPatientBudgets(readPatientBudgets(animalId)); }, [animalId]);

  // Catálogo para itens (orçamentos e vendas)
  const catalogItems = getCatalog().filter(i => i.active);

  // Substituir conteúdo da aba Vendas para aplicar bordas, máscara, itens e modal mais largo
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [saleAppointmentId, setSaleAppointmentId] = useState<string>("");
  const [saleResponsible, setSaleResponsible] = useState<string>("");
  const [saleObservations, setSaleObservations] = useState<string>("");
  const [saleStatusLocal, setSaleStatusLocal] = useState<SaleStatusLocal>("open");

  // Itens da venda
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
      origin: "manual", // NOVO
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

  // Cálculo financeiro por venda
  const getPaidForSale = (saleId: string): number => patientPayments.filter(p => p.saleId === saleId).reduce((sum, p) => sum + p.amount, 0);
  const getFinancialStatusForSale = (saleId: string, saleAmount: number): "paid" | "partial" | "pending" => {
    const paid = getPaidForSale(saleId);
    if (paid >= saleAmount) return "paid";
    if (paid > 0) return "partial";
    return "pending";
  };

  // Pagamentos (aba Financeiro)
  const pmRegistry = getRegistryList("paymentMethods");
  const [paymentSaleId, setPaymentSaleId] = useState<string | undefined>(undefined);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentTime, setPaymentTime] = useState<string>(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethodId, setPaymentMethodId] = useState<string | undefined>(undefined);
  const [paymentObservations, setPaymentObservations] = useState<string>("");

  // BLOQUEIO: não permitir baixar se já estiver pago
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

  // EXPANSÍVEL: controlar exibição de itens por venda
  const [expandedSales, setExpandedSales] = useState<Record<string, boolean>>({});
  const toggleExpanded = (saleId: string) => setExpandedSales(prev => ({ ...prev, [saleId]: !prev[saleId] }));

  // -------- Orçamentos: modal e lógica --------
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetDate, setBudgetDate] = useState<string>(new Date().toISOString().split("T")[0]);
  // orçamento sem atendimento na criação
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
    // reset
    setBudgetDate(new Date().toISOString().split("T")[0]);
    setBudgetItems([]); setBudgetQty(1); setBudgetUnitPrice(0); setBudgetValidityDays(15); setBudgetObservations("");
    setBudgetModalOpen(false);
    toast.success("Orçamento salvo.");
  };
  const approveBudget = (id: string) => {
    const next = patientBudgets.map(b => b.id === id ? { ...b, status: "aprovado" } : b);
    setPatientBudgets(next); writePatientBudgets(animalId, next);
  };
  const cancelBudget = (id: string) => {
    const next = patientBudgets.map(b => b.id === id ? { ...b, status: "cancelado" } : b);
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

  // Conversão: pedir atendimento na hora de converter
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

    const updatedBudgets = patientBudgets.map(x => x.id === id ? { ...x, status: "convertido", appointmentId } : x);
    setPatientBudgets(updatedBudgets); writePatientBudgets(animalId, updatedBudgets);

    toast.success("Orçamento convertido em venda.");
    return true;
  };

  // NOVO: estado controlado para sub-abas de Financeiro
  const [financeTab, setFinanceTab] = useState<'orcamentos'|'vendas'|'financeiro'>('orcamentos');

  // NOVO: ler parâmetros para pré-seleção de pagamento
  useEffect(() => {
    const paySaleId = searchParams.get('paySaleId');
    if (paySaleId) {
      setActiveTab('financial');
      setFinanceTab('financeiro');
      setPaymentSaleId(paySaleId);
    }
  }, [searchParams]);

  // NOVO: atalho "Pagar" vindo do card de venda
  const handlePayShortcut = (saleId: string) => {
    setActiveTab('financial');
    setFinanceTab('financeiro');
    setPaymentSaleId(saleId);
    setSearchParams({ paySaleId: saleId });
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
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        observation: newObservation.trim(),
        // NEW: exibir alerta no prontuário
        displayAsAlert: newObservationAlert as any,
      } as any;
      setObservations([...observations, newEntry]);
      setNewObservation("");
      setNewObservationAlert(false);
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
      summary: app.observacoesGerais || description,
      icon: FaStethoscope,
      link: `/clients/${clientId}/animals/${animalId}/view-appointment/${app.id}`,
      badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      author: app.vet || mockUserSettings.userName,
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
      summary: exam.note || exam.result || undefined,
      icon: FaFlask,
      badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      author: exam.vet || mockUserSettings.userName,
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
      summary: rx.instructions || rx.treatmentDescription || rx.medicationName || undefined,
      icon: FaPrescriptionBottleAlt,
      link: `/clients/${clientId}/animals/${animalId}/edit-prescription/${rx.id}?type=${rx.type}`,
      badgeColor,
      author: mockUserSettings.userName,
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
      summary: `Origem: ${entry.source || "-"}`,
      icon: FaWeightHanging,
      badgeColor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      author: mockUserSettings.userName,
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
      summary: obs.observation,
      icon: FaCommentAlt,
      badgeColor: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
      author: mockUserSettings.userName,
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
      summary: sale.description,
      icon: FaDollarSign,
      badgeColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      author: mockUserSettings.userName,
    });
  });

  // Adicionar Vacinas
  vaccines.forEach(vaccine => {
    allTimelineEvents.push({
      id: `vaccine-${vaccine.id}`,
      date: vaccine.date,
      time: vaccine.time,
      type: 'Vacina',
      description: `Vacina ${vaccine.type} aplicada. Próxima dose: ${formatDateTime(vaccine.nextDue)}`,
      summary: `Aplicada por ${vaccine.vet}`,
      icon: FaSyringe,
      badgeColor: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
      author: vaccine.vet || mockUserSettings.userName,
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
      summary: doc.name,
      icon: FaFileAlt,
      link: doc.fileUrl,
      badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      author: mockUserSettings.userName,
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
    // Fundo geral com contraste de camadas mais evidente
    <div className="flex flex-col min-h-screen layered-bg-cool overflow-x-hidden font-exo">
      {/* Header premium com contraste reforçado */}
      <div className="premium-top p-6 pb-4 mx-auto w-full max-w-7xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-4 sm:gap-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-[1.85rem] leading-tight font-semibold flex items-center gap-3 text-foreground">
                <FaUser className="h-5 w-5 text-muted-foreground" /> Prontuário Consolidado
              </h1>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Visão completa do histórico médico</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="rounded-md border-border/40 text-foreground hover:bg-muted/50 transition-colors duration-200">
              <FaPrint className="mr-2 h-4 w-4" /> Imprimir
            </Button>
            <Button variant="outline" className="rounded-md border-border/40 text-foreground hover:bg-muted/50 transition-colors duration-200">
              <FaDownload className="mr-2 h-4 w-4" /> Exportar PDF
            </Button>
            <Link to={`/clients/${currentClient.id}`}>
              <Button variant="outline" className="rounded-md border-border/40 text-foreground hover:bg-muted/50 transition-colors duration-200">
                <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para {currentClient.name}
              </Button>
            </Link>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Painel &gt; <Link to="/clients" className="hover:text-primary">Clientes</Link> &gt; <Link to={`/clients/${currentClient.id}`} className="hover:text-primary">{currentClient.name}</Link> &gt; {currentAnimal.name}
        </p>
      </div>

      {/* Topo: Paciente/Tutor/Financeiro com card herói e avatar com brilho */}
      <div className="flex-1 p-6 mx-auto w-full max-w-7xl">
        <div className="mb-6">
          {/* Card do paciente como HERÓI */}
          <Card className="premium-card premium-card--hero card-hover">
            <CardHeader className="pb-0 surface-offwhite rounded-t-[1rem]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-7">
                <div className="flex items-start gap-5 md:col-span-1">
                  {/* Avatar com leve destaque extra */}
                  <Avatar className="h-28 w-28 rounded-full hero-avatar-ring hero-glow ring-2 ring-white/70">
                    <AvatarImage src={undefined} />
                    <AvatarFallback className="text-[#0F4C5C] text-2xl font-bold">
                      <FaPaw className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    {/* Nome do paciente com mais impacto */}
                    <h2 className="text-[2.5rem] leading-tight font-extrabold tracking-tight text-[#0F4C5C] mb-6">
                      {currentAnimal.name}
                    </h2>
                    {/* Chips: duas linhas claras, cores menos saturadas e mais respiro */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-4">
                      <span className="chip-soft bg-teal-50/45 text-teal-900/75">Espécie: <span className="font-semibold">{currentAnimal.species}</span></span>
                      <span className="chip-soft bg-sky-50/45 text-sky-900/75">Raça: <span className="font-semibold">{currentAnimal.breed}</span></span>
                      <span className="chip-soft bg-indigo-50/45 text-indigo-900/75">Idade: <span className="font-semibold">{calculateAge(currentAnimal.birthday)}</span></span>
                      <span className="chip-soft bg-purple-50/45 text-purple-900/75">Peso: <span className="font-semibold">{currentAnimal.weight.toFixed(1)} kg</span></span>
                      <span className="chip-soft bg-pink-50/45 text-pink-900/75">Sexo: <span className="font-semibold">{currentAnimal.gender}</span></span>
                      <span className="chip-soft bg-amber-50/45 text-amber-900/75">Nasc.: <span className="font-semibold">{formatDateTime(currentAnimal.birthday || '')}</span></span>
                    </div>
                  </div>
                </div>

                {/* Tutor: perfil com respiro e metadados discretos */}
                <div className="md:col-span-1">
                  <div className="premium-card premium-card--soft p-6">
                    <p className="text-sm uppercase tracking-wide metadata-subtle">Tutor Responsável</p>
                    <p className="text-base font-semibold text-foreground mt-1">{currentClient.name}</p>
                    <div className="mt-2 space-y-2.5">
                      <p className="text-sm flex items-center gap-2 metadata-subtle">
                        <FaIdCard className="h-3.5 w-3.5" />
                        <span className="font-medium text-foreground/70">{currentClient.clientType === "physical" ? "CPF" : "CNPJ"}:</span> {currentClient.identificationNumber}
                      </p>
                      <p className="text-sm flex items-center gap-2 metadata-subtle">
                        <FaPhone className="h-3.5 w-3.5" />
                        <span className="font-medium text-foreground/70">Telefone:</span> {currentClient.mainPhoneContact}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Financeiro: status elegante (mais espaço interno e valores medianos) */}
                <div className="md:col-span-1">
                  {(() => {
                    const income = mockFinancialTransactions.filter(t => t.relatedAnimalId === animalId && t.type === 'income').reduce((s, t) => s + t.amount, 0);
                    const expense = mockFinancialTransactions.filter(t => t.relatedAnimalId === animalId && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
                    const net = income - expense;
                    const pending = Math.max(0, patientSales.reduce((sum, s) => sum + s.total, 0) - patientPayments.reduce((sum, p) => sum + p.amount, 0));
                    return (
                      <div className="grid grid-cols-1 gap-3">
                        <Card className="premium-card premium-card--soft card-hover">
                          <CardContent className="pt-5 pb-5">
                            <div className="metadata-subtle">Pago</div>
                            <div className="text-[1.5rem] leading-tight font-semibold text-emerald-800">
                              {new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(income)}
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="premium-card premium-card--soft card-hover">
                          <CardContent className="pt-5 pb-5">
                            <div className="metadata-subtle">Pendências</div>
                            <div className="text-[1.5rem] leading-tight font-semibold text-rose-800">
                              {new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(pending)}
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="premium-card premium-card--soft card-hover">
                          <CardContent className="pt-5 pb-5">
                            <div className="metadata-subtle">Saldo</div>
                            <div className={cn("text-[1.5rem] leading-tight font-semibold", net >= 0 ? "text-blue-800" : "text-amber-800")}>
                              {new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(net)}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </CardHeader>
            {/* Espaçamento interno ligeiramente maior no conteúdo do herói */}
            <CardContent className="pt-0 px-7 pb-6">
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleEditAnimal} className="rounded-lg border-border/40 text-foreground hover:bg-muted/50">
                  <FaEdit className="mr-2 h-4 w-4" /> Editar Paciente
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs modernas com scroll horizontal invisível */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
          <div ref={tabScrollRef} className="relative w-full overflow-x-auto overflow-y-hidden no-scrollbar scroll-smooth select-none">
            <TabsList className="inline-flex w-max items-center whitespace-nowrap border-b border-border/40 bg-transparent p-0 rounded-none gap-1">
              {/* Estilo segmented control: tipografia leve + linha ativa sutil */}
              <TabsTrigger value="timeline" className="tab-active-line relative -mb-px pb-2 px-2.5 md:px-3.5 shrink-0 text-sm md:text-[0.95rem] text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-md transition-colors data-[state=active]:text-[#0F4C5C] data-[state=active]:font-semibold">
                <FaClock className="h-4 w-4 mr-1.5 md:mr-2 text-muted-foreground" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Linha do Tempo</span>
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">{sortedTimelineEvents.length}</span>
              </TabsTrigger>
              <TabsTrigger value="appointments" className="tab-active-line relative -mb-px pb-2 px-2.5 md:px-3.5 shrink-0 text-sm md:text-[0.95rem] text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-md transition-colors data-[state=active]:text-[#0F4C5C] data-[state=active]:font-semibold">
                <FaStethoscope className="h-4 w-4 mr-1.5 md:mr-2 text-muted-foreground" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Atendimento</span>
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">{animalAppointments.length}</span>
              </TabsTrigger>
              <TabsTrigger value="exams" className="tab-active-line relative -mb-px pb-2 px-2.5 md:px-3.5 shrink-0 text-sm md:text-[0.95rem] text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-md transition-colors data-[state=active]:text-[#0F4C5C] data-[state=active]:font-semibold">
                <FaFlask className="h-4 w-4 mr-1.5 md:mr-2 text-muted-foreground" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Exames</span>
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">{examsList.length}</span>
              </TabsTrigger>
              <TabsTrigger value="vaccines" className="tab-active-line relative -mb-px pb-2 px-2.5 md:px-3.5 shrink-0 text-sm md:text-[0.95rem] text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-md transition-colors data-[state=active]:text-[#0F4C5C] data-[state=active]:font-semibold">
                <FaSyringe className="h-4 w-4 mr-1.5 md:mr-2 text-muted-foreground" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Vacinas</span>
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">{vaccines.length}</span>
              </TabsTrigger>
              <TabsTrigger value="weight" className="tab-active-line relative -mb-px pb-2 px-2.5 md:px-3.5 shrink-0 text-sm md:text-[0.95rem] text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-md transition-colors data-[state=active]:text-[#0F4C5C] data-[state=active]:font-semibold">
                <FaWeightHanging className="h-4 w-4 mr-1.5 md:mr-2 text-muted-foreground" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Peso</span>
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">{weightHistory.length}</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="tab-active-line relative -mb-px pb-2 px-2.5 md:px-3.5 shrink-0 text-sm md:text-[0.95rem] text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-md transition-colors data-[state=active]:text-[#0F4C5C] data-[state=active]:font-semibold">
                <FaFileAlt className="h-4 w-4 mr-1.5 md:mr-2 text-muted-foreground" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Documentos</span>
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">{documents.length}</span>
              </TabsTrigger>
              <TabsTrigger value="prescriptions" className="tab-active-line relative -mb-px pb-2 px-2.5 md:px-3.5 shrink-0 text-sm md:text-[0.95rem] text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-md transition-colors data-[state=active]:text-[#0F4C5C] data-[state=active]:font-semibold">
                <FaPrescriptionBottleAlt className="h-4 w-4 mr-1.5 md:mr-2 text-muted-foreground" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Receitas</span>
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">{prescriptions.length}</span>
              </TabsTrigger>
              <TabsTrigger value="observations" className="tab-active-line relative -mb-px pb-2 px-2.5 md:px-3.5 shrink-0 text-sm md:text-[0.95rem] text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-md transition-colors data-[state=active]:text-[#0F4C5C] data-[state=active]:font-semibold">
                <FaCommentAlt className="h-4 w-4 mr-1.5 md:mr-2 text-muted-foreground" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Observações</span>
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">{observations.length}</span>
              </TabsTrigger>
              <TabsTrigger value="financial" className="tab-active-line relative -mb-px pb-2 px-2.5 md:px-3.5 shrink-0 text-sm md:text-[0.95rem] text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-md transition-colors data-[state=active]:text-[#0F4C5C] data-[state=active]:font-semibold">
                <FaMoneyBillWave className="h-4 w-4 mr-1.5 md:mr-2 text-muted-foreground" />
                <span className="max-w-[9.5rem] md:max-w-none truncate">Financeiro</span>
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-[10px] bg-muted text-foreground/70">{patientSales.length}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Timeline moderna: cards mais altos, espaçados e metadados discretos */}
          <TabsContent value="timeline" className="mt-4">
            <Card className="premium-card card-hover">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[#0F4C5C]">
                  <FaClock className="h-5 w-5 text-muted-foreground" /> Linha do Tempo do Paciente
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {sortedTimelineEvents.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-2 sm:left-3 top-0 bottom-0 w-[2px] timeline-line" />
                    <div className="space-y-8">
                      {sortedTimelineEvents.map((event) => {
                        const styles = getEventStyle(event.type);
                        return (
                          <div key={event.id} className="relative pl-6 sm:pl-8">
                            <span className={cn("absolute left-1.5 sm:left-2.5 top-5 timeline-dot", styles.dot)} />
                            <Card className="premium-card p-7">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3.5 gap-2">
                                <div className="flex items-center gap-2">
                                  {/* Ícone levemente mais destacado */}
                                  {React.createElement(event.icon, { className: "h-4 w-4 text-primary/70" })}
                                  <Badge className={cn("px-2 py-0.5 text-xs font-medium rounded-full", styles.badge)}>
                                    {event.type}
                                  </Badge>
                                  {/* Título com maior destaque que descrição */}
                                  <p className="text-[1.1rem] font-semibold text-foreground break-words">
                                    {event.description}
                                  </p>
                                </div>
                                {event.link && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      if (event.link && (event.link.startsWith("http") || event.link.startsWith("blob:"))) {
                                        window.open(event.link, "_blank");
                                      } else if (event.link) {
                                        navigate(event.link);
                                      }
                                    }}
                                    className="rounded-md border-border/40 text-foreground hover:bg-muted/50"
                                  >
                                    <FaEye className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              {event.summary && (
                                <p className="text-sm metadata-subtle mb-3 break-words">{event.summary}</p>
                              )}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 metadata-subtle">
                                  <FaCalendarAlt className="h-3 w-3" /> {formatDateTime(event.date, event.time)}
                                </div>
                                <div className="metadata-subtle">
                                  {event.author ? `Profissional: ${event.author}` : ""}
                                </div>
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
                {vaccines.length > 0 ? (
                  <div className="space-y-4">
                    {vaccines.map((vaccine) => (
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setSelectedVaccine(vaccine); setVaccineViewOpen(true); }}
                            className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                          >
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
                          {/* Ver registro de Peso */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setSelectedWeight(entry); setWeightModalOpen(true); }}
                            className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200"
                          >
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
                <Button size="sm" onClick={handleAddObservation} disabled={isObservationEmpty} className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
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
                          {/* Ver Observação */}
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
            {/* SUB-ABAS: Orçamentos, Vendas e Financeiro dentro do Financeiro do prontuário */}
            <Card className="bg-white rounded-[12px] shadow-sm border-0">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaMoneyBillWave className="h-5 w-5 text-primary" /> Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Controla as sub-abas */}
                <Tabs value={financeTab} onValueChange={setFinanceTab} className="w-full">
                  <TabsList className="grid grid-cols-3 w-full mb-4">
                    <TabsTrigger value="orcamentos">Orçamentos</TabsTrigger>
                    <TabsTrigger value="vendas">Vendas</TabsTrigger>
                    <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                  </TabsList>

                  {/* Aba Orçamentos - lista e ações */}
                  <TabsContent value="orcamentos">
                    {/* Área principal com fundo cinza para destacar cards brancos */}
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
                      {/* Lista de orçamentos com card branco, borda fina e sombra suave */}
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
                                  // Cards de cada orçamento com borda e sombra
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

                  {/* Aba Vendas - lista de vendas do paciente com botão de adicionar */}
                  <TabsContent value="vendas">
                    {/* NOVO: área principal com fundo cinza para destacar cards brancos */}
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
                              // AJUSTE: card branco com borda fina e sombra suave
                              <Card key={sale.id} className="p-4 bg-white rounded-[12px] shadow-sm border border-[#E2E8F0]">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-3">
                                  <div className="flex items-center gap-3">
                                    {/* AJUSTE: badges de status com alto contraste */}
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
                                  {/* Coluna de valores à direita com fonte maior e bold */}
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
                                    {/* Mantém Finalizar como ação secundária */}
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

                  {/* Aba Financeiro - formulário de pagamento e listagem */}
                  <TabsContent value="financeiro">
                    {/* NOVO: área principal com fundo cinza e cards brancos destacados */}
                    <div className="bg-[#F5F7FA] p-4 rounded-[12px]">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Card do formulário com borda fina e sombra suave */}
                        <Card className="bg-white rounded-[12px] shadow-sm border border-[#E2E8F0]">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Registrar pagamento</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <Label>Venda</Label>
                              {/* AJUSTE: ocultar vendas com saldo zero no seletor */}
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

                        {/* Card da lista com borda fina, sombra e tabela moderna com zebra stripes */}
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

            {/* Modal: Novo Orçamento */}
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

            {/* Modal: Converter Orçamento em Venda */}
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

      {/* Dialog: Ver Observação */}
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

      {/* Dialog: Ver Peso */}
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

      {/* Dialog: Adicionar Vacina */}
      <Dialog open={vaccineAddOpen} onOpenChange={setVaccineAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Vacina</DialogTitle>
            <DialogDescription>Cadastre uma vacina aplicada para este paciente.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={vaccineForm.date} onChange={(e) => setVaccineForm(v => ({ ...v, date: e.target.value }))} />
            </div>
            <div>
              <Label>Hora</Label>
              <Input value={vaccineForm.time} onChange={(e) => setVaccineForm(v => ({ ...v, time: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Tipo</Label>
              <Input value={vaccineForm.type} onChange={(e) => setVaccineForm(v => ({ ...v, type: e.target.value }))} placeholder="Ex.: V8, Antirrábica" />
            </div>
            <div>
              <Label>Próxima Dose</Label>
              <Input type="date" value={vaccineForm.nextDue} onChange={(e) => setVaccineForm(v => ({ ...v, nextDue: e.target.value }))} />
            </div>
            <div>
              <Label>Veterinário</Label>
              <Input value={vaccineForm.vet} onChange={(e) => setVaccineForm(v => ({ ...v, vet: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVaccineAddOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!vaccineForm.type || !vaccineForm.date) {
                  toast.error("Preencha ao menos o tipo e a data.");
                  return;
                }
                const newVac = { id: `vac-${Date.now()}`, ...vaccineForm };
                setVaccines(prev => [...prev, newVac]);
                setVaccineAddOpen(false);
                toast.success("Vacina adicionada!");
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ver Vacina */}
      <Dialog open={vaccineViewOpen} onOpenChange={setVaccineViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Vacina</DialogTitle>
            <DialogDescription>Informações da aplicação selecionada.</DialogDescription>
          </DialogHeader>
          {selectedVaccine && (
            <div className="space-y-2">
              <p className="text-sm"><span className="font-semibold">Tipo:</span> {selectedVaccine.type}</p>
              <p className="text-sm"><span className="font-semibold">Aplicada em:</span> {formatDateTime(selectedVaccine.date, selectedVaccine.time)}</p>
              <p className="text-sm"><span className="font-semibold">Próxima dose:</span> {formatDateTime(selectedVaccine.nextDue)}</p>
              <p className="text-sm"><span className="font-semibold">Veterinário:</span> {selectedVaccine.vet}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Adicionar Venda */}
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
                        <TableCell className="text-right">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(it.qty * it.unitPrice)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => removeSaleItem(it.itemId, idx)}>
                            <FaTrashAlt className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end mt-2 text-sm font-semibold">
                  Total: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(saleTotal)}
                </div>
              </div>
            )}
            <div>
              <Label>Responsável</Label>
              <Input value={saleResponsible} onChange={(e) => setSaleResponsible(e.target.value)} placeholder="Ex.: Dr(a). Nome" className="h-9 bg-input border border-border rounded-md" />
            </div>
            <div>
              <Label>Status da venda</Label>
              <Select value={saleStatusLocal} onValueChange={(v) => setSaleStatusLocal(v as SaleStatusLocal)}>
                <SelectTrigger className="bg-input border border-border rounded-md h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Aberta</SelectItem>
                  <SelectItem value="finalized">Finalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Observações</Label>
              <Textarea value={saleObservations} onChange={(e) => setSaleObservations(e.target.value)} placeholder="Observações da venda" className="bg-input border border-border rounded-md" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaleModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSale}>Salvar Venda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Adicionar Lançamento Financeiro */}
      {/* REMOVED: formulário genérico de lançamentos financeiros soltos para evitar duplicação e respeitar vínculo com venda. */}
    </div>
  );
};

export default PatientRecordPage;