import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Calculator,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Clock,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import CurrencyInput from "@/components/CurrencyInput";
import AutocompleteSelect from "@/components/AutocompleteSelect";
import ClientCombobox from "@/components/ClientCombobox";
import { SentBadge } from "@/components/SentBadge";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { KpiStrip } from "@/components/saas/KpiStrip";
import { IconChip, Panel, PaymentMethodBadge } from "@/components/finance/FinanceUI";
import { TONES, categoryVisual, type Tone } from "@/components/finance/financeTheme";
import { ClientAvatar, speciesIcon, speciesTone } from "@/components/clients/clientVisuals";
import { ConvertBudgetDialog } from "@/components/sales/ConvertBudgetDialog";
import { AdjustmentLines, PriceAdjustmentFields, usePriceAdjustments } from "@/components/sales/PriceAdjustments";
import { getCatalog as getCatalogApi } from "@/lib/catalogApi";
import type { CatalogItem } from "@/mockData/catalog";
import { getBudgets, addBudget, updateBudget, updateBudgetStatus, removeBudget } from "@/lib/budgetsApi";
import { budgetTotal } from "@/lib/budgetConversion";
import type { Budget, BudgetStatus } from "@/mockData/budgets";
import { useRegistryList } from "@/hooks/useRegistryList";
import { getPatientRecordPath } from "@/utils/patientDisplayId";
import { cn, formatAgeLong, formatCurrencyBRL, formatDateBRForFileName, formatDateTime, slugifyFileName } from "@/lib/utils";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { renderPdf, openPdf } from "@/lib/pdfExport";
import { sendPdfViaWhatsApp } from "@/lib/whatsappShare";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";

// Rótulos em PT-BR para os status persistidos em inglês no banco — selo com
// ícone e a cor do conceito (convertido verde, cancelado vermelho...).
const BUDGET_STATUS: Record<BudgetStatus, { label: string; icon: LucideIcon; tone: Tone }> = {
  draft: { label: "Rascunho", icon: CircleDashed, tone: "slate" },
  approved: { label: "Aprovado", icon: BadgeCheck, tone: "sky" },
  converted: { label: "Convertido", icon: CheckCircle2, tone: "emerald" },
  cancelled: { label: "Cancelado", icon: Ban, tone: "rose" },
};

const isOpenBudget = (b: Pick<Budget, "status">) => b.status === "draft" || b.status === "approved";

type StatusFilter = "all" | "open" | "converted" | "cancelled";

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string; tone?: Tone }> = [
  { key: "all", label: "Todos" },
  { key: "open", label: "Em aberto", tone: "amber" },
  { key: "converted", label: "Convertidos", tone: "emerald" },
  { key: "cancelled", label: "Cancelados", tone: "rose" },
];

const matchesStatus = (b: Budget, filter: StatusFilter) =>
  filter === "all" || (filter === "open" ? isOpenBudget(b) : b.status === filter);

// Mesmas colunas no cabeçalho e nas linhas (cliente | itens | data | valor |
// situação), com as ações numa coluna fixa à direita. Antes era uma tabela
// esticada na largura toda: num monitor grande cada coluna ficava a ~300px da
// outra e o valor se perdia no meio da linha. xl: com o menu lateral aberto,
// abaixo disso fica o formato de lista do celular (como em Vendas).
const COLUMNS =
  "xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_7.5rem_8rem_8rem] xl:items-center xl:gap-4";

const PAGE_SIZE = 30;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const norm = (s: string | undefined) =>
  (s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();

function summarizeItems(items: Budget["items"], max = 3): string {
  const names = items.map((it) => (it.qty > 1 ? `${it.name} (${it.qty}x)` : it.name));
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} +${names.length - max}`;
}

function BudgetStatusBadge({ status }: { status: BudgetStatus }) {
  const visual = BUDGET_STATUS[status];
  if (!visual) return <span className="text-xs text-muted-foreground">{status}</span>;
  const Icon = visual.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
        TONES[visual.tone].badge
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {visual.label}
    </span>
  );
}

const BudgetsPage: React.FC = () => {
  const { data: dbClients, isError: isClientsError } = useClientsList();
  const clients = React.useMemo(() => dbClients || [], [dbClients]);
  const [clientId, setClientId] = React.useState<string | undefined>(undefined);
  const [animalId, setAnimalId] = React.useState<string | undefined>(undefined);
  const [productId, setProductId] = React.useState<string>("");
  const [qty, setQty] = React.useState<number>(1);
  const [unitPrice, setUnitPrice] = React.useState<number>(0);
  const [items, setItems] = React.useState<{ itemId: string; name: string; qty: number; price: number }[]>([]);
  const [customItemEnabled, setCustomItemEnabled] = React.useState<boolean>(false);
  const [customItemName, setCustomItemName] = React.useState<string>("");
  const [customItemPrice, setCustomItemPrice] = React.useState<number>(0);
  const [notes, setNotes] = React.useState<string>("");
  const [editingBudgetId, setEditingBudgetId] = React.useState<string | null>(null);

  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  const [loadingBudgets, setLoadingBudgets] = React.useState(true);
  const { profile: currentUserProfile } = useCurrentUserProfile();
  const [catalogItems, setCatalogItems] = React.useState<CatalogItem[]>([]);
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { getCatalogApi().then(setCatalogItems); }, []);

  const composerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLElement>(null);

  // Catálogo e formas de pagamento vêm do banco (antes eram cópias locais).
  const options = React.useMemo(
    () => catalogItems.filter(p => p.active).map(p => ({ value: p.id, label: p.name })),
    [catalogItems]
  );
  const { list: paymentMethods } = useRegistryList("paymentMethods");
  const findCatalogItem = React.useCallback(
    (id: string) => catalogItems.find(it => it.id === id),
    [catalogItems]
  );

  const refreshBudgets = React.useCallback(async () => {
    setBudgets(await getBudgets());
    setLoadingBudgets(false);
  }, []);
  React.useEffect(() => { void refreshBudgets(); }, [refreshBudgets]);

  const animals = React.useMemo(() => {
    if (!clientId) return [];
    const client = clients.find(c => c.id === clientId);
    return client?.animals || [];
  }, [clientId, clients]);

  React.useEffect(() => {
    if (!productId) {
      setUnitPrice(0);
      return;
    }
    const item = findCatalogItem(productId);
    setUnitPrice(item?.price || 0);
  }, [productId]);

  const subtotal = items.reduce((sum, it) => sum + it.qty * it.price, 0);
  // Desconto/acréscimo: o mesmo componente do PDV (% e R$ andam juntos).
  const adj = usePriceAdjustments(subtotal);
  const totalFinal = Math.max(0, subtotal - adj.discountAmount + adj.surchargeAmount);

  const addItemToBudget = () => {
    if (customItemEnabled) {
      if (!customItemName.trim() || customItemPrice <= 0 || qty <= 0) {
        toast.error("Preencha nome, preço e quantidade válidos para o item personalizado.");
        return;
      }
      setItems(prev => [...prev, { itemId: `custom-${Date.now()}`, name: customItemName.trim(), qty, price: customItemPrice }]);
      setCustomItemName(""); setCustomItemPrice(0); setQty(1);
      return;
    }

    if (!productId) {
      toast.error("Selecione um item do catálogo.");
      return;
    }
    const item = findCatalogItem(productId);
    if (!item) {
      toast.error("Item não encontrado no catálogo.");
      return;
    }
    if (qty <= 0) {
      toast.error("Quantidade deve ser maior que zero.");
      return;
    }
    setItems(prev => [...prev, { itemId: item.id, name: item.name, qty, price: unitPrice }]);
    setProductId(""); setQty(1); setUnitPrice(0);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const resetBudgetForm = () => {
    setItems([]);
    setClientId(undefined);
    setAnimalId(undefined);
    adj.reset();
    setNotes("");
    setEditingBudgetId(null);
  };

  const startEditBudget = (b: Budget) => {
    setEditingBudgetId(b.id);
    setClientId(b.clientId);
    setAnimalId(b.animalId);
    setItems(b.items.map((it) => ({ ...it })));
    setNotes(b.notes || "");
    const itemsSubtotal = b.items.reduce((sum, it) => sum + it.qty * it.price, 0);
    adj.load(b.discountAmount || 0, b.surchargeAmount || 0, itemsSubtotal);
    // A página rola dentro do <main>, não da janela — window.scrollTo não
    // fazia nada e o formulário de edição ficava fora da tela.
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const saveBudget = async () => {
    if (items.length === 0) {
      toast.error("Adicione itens ao orçamento.");
      return;
    }
    const selectedClient = clientId ? clients.find((c) => c.id === clientId) : undefined;
    const selectedAnimal = animalId ? selectedClient?.animals.find((a) => a.id === animalId) : undefined;
    const discount = adj.discountAmount;
    const surcharge = adj.surchargeAmount;
    setSaving(true);
    try {
      if (editingBudgetId) {
        const existing = budgets.find((b) => b.id === editingBudgetId);
        if (!existing) {
          toast.error("Orçamento não encontrado.");
          return;
        }
        const ok = await updateBudget({
          ...existing,
          clientId,
          animalId,
          clientName: selectedClient?.name ?? existing.clientName,
          animalName: selectedAnimal?.name ?? existing.animalName,
          clientPhone: selectedClient?.mainPhoneContact ?? existing.clientPhone,
          items,
          notes: notes.trim() || undefined,
          discountAmount: discount > 0 ? discount : undefined,
          surchargeAmount: surcharge > 0 ? surcharge : undefined,
        });
        if (!ok) {
          toast.error("Falha ao atualizar o orçamento.");
          return;
        }
        toast.success("Orçamento atualizado.");
      } else {
        const created = await addBudget({
          clientId,
          animalId,
          clientName: selectedClient?.name,
          animalName: selectedAnimal?.name,
          clientPhone: selectedClient?.mainPhoneContact,
          items,
          notes: notes.trim() || undefined,
          discountAmount: discount > 0 ? discount : undefined,
          surchargeAmount: surcharge > 0 ? surcharge : undefined,
        });
        if (!created) {
          toast.error("Falha ao salvar o orçamento.");
          return;
        }
        toast.success("Orçamento salvo.");
      }
      resetBudgetForm();
      await refreshBudgets();
    } finally {
      setSaving(false);
    }
  };

  // Converter: janela única (ConvertBudgetDialog) que pergunta o pagamento
  // uma vez só — recebido agora (a venda já nasce paga) ou fica a receber.
  // Antes a forma era escolhida num seletor na linha e a venda nascia
  // "pendente", pedindo a forma de pagamento de novo na baixa.
  const [budgetToConvert, setBudgetToConvert] = React.useState<Budget | null>(null);
  const [budgetToRemove, setBudgetToRemove] = React.useState<Budget | null>(null);

  const cancelBudget = async (budgetId: string) => {
    await updateBudgetStatus(budgetId, "cancelled");
    await refreshBudgets();
    toast.success("Orçamento cancelado.");
  };

  const removeBudgetAction = async (budgetId: string) => {
    await removeBudget(budgetId);
    await refreshBudgets();
    toast.success("Orçamento removido.");
  };

  // Dados ricos (espécie, raça, idade, peso, endereço, telefone) vêm do
  // cadastro atual; o snapshot gravado no orçamento é o fallback se o cliente
  // foi removido — compartilhado entre imprimir e enviar por WhatsApp.
  const buildBudgetPdfBlob = async (b: Budget) => {
    const pdfClient = b.clientId ? clients.find(c => c.id === b.clientId) : undefined;
    const pdfAnimal = b.animalId ? pdfClient?.animals.find(a => a.id === b.animalId) : undefined;
    const addr = pdfClient?.address;
    const addressLine = addr && typeof addr !== "string"
      ? [
          addr.street && addr.number ? `${addr.street}, ${addr.number}` : addr.street,
          addr.neighborhood,
        ].filter(Boolean).join(" - ")
      : (typeof addr === "string" ? addr : undefined);

    const blob = await renderPdf((K) =>
      <K.BudgetReportPdfContent
        budget={b}
        userProfile={currentUserProfile}
        tutorAddress={addressLine}
        tutorPhone={pdfClient?.mainPhoneContact || b.clientPhone}
        petSpecies={pdfAnimal?.species}
        petBreed={pdfAnimal?.breed}
        petAge={formatAgeLong(pdfAnimal?.birthday)}
        petWeight={pdfAnimal?.weight != null ? `${pdfAnimal.weight} kg` : undefined}
      />
    );
    return { blob, phone: pdfClient?.mainPhoneContact || b.clientPhone };
  };

  const handleOpenBudgetPdf = async (b: Budget) => {
    const { blob } = await buildBudgetPdfBlob(b);
    await openPdf({
      blob,
      fileName: `${slugifyFileName("orcamento", b.animalName, formatDateBRForFileName(b.date))}.pdf`,
      persistOptions: { folder: "budgets" },
    });
  };

  const handleSendBudgetWhatsApp = async (b: Budget) => {
    try {
      const { blob, phone } = await buildBudgetPdfBlob(b);
      await sendPdfViaWhatsApp({
        phone,
        blob,
        fileName: `${slugifyFileName("orcamento", b.animalName, formatDateBRForFileName(b.date))}.pdf`,
        folder: "budgets",
        track: { type: "budget", id: b.id, animalId: b.animalId },
        title: "Orçamento",
        intro: `Olá! Segue o orçamento de *${b.animalName || "seu pet"}*.`,
        dateLabel: formatDateTime(b.date),
        preview: {
          title: [`Orçamento`, b.animalName].filter(Boolean).join(" — "),
          description: `Orçamento · ${formatDateTime(b.date)}`,
        },
      });
    } catch (err) {
      console.error("[Enviar orçamento por WhatsApp] falhou ao gerar o PDF", err);
      toast.error("Não consegui gerar o PDF deste orçamento para enviar por WhatsApp.");
    }
  };

  // Indicadores do funil: quanto está esperando resposta do tutor, quanto
  // virou venda e quanto foi perdido.
  const kpis = React.useMemo(() => {
    const acc = { open: 0, openCount: 0, converted: 0, convertedCount: 0, cancelled: 0, cancelledCount: 0 };
    for (const b of budgets) {
      const total = budgetTotal(b);
      if (b.status === "converted") {
        acc.converted += total;
        acc.convertedCount += 1;
      } else if (b.status === "cancelled") {
        acc.cancelled += total;
        acc.cancelledCount += 1;
      } else {
        acc.open += total;
        acc.openCount += 1;
      }
    }
    return acc;
  }, [budgets]);
  const conversionRate = budgets.length > 0 ? Math.round((kpis.convertedCount / budgets.length) * 100) : 0;

  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [search, setSearch] = React.useState("");
  const [visible, setVisible] = React.useState(PAGE_SIZE);
  React.useEffect(() => setVisible(PAGE_SIZE), [status, search]);

  const showStatus = (next: StatusFilter) => {
    setStatus(next);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const counts: Record<StatusFilter, number> = {
    all: budgets.length,
    open: kpis.openCount,
    converted: kpis.convertedCount,
    cancelled: kpis.cancelledCount,
  };

  const clientOf = React.useCallback(
    (b: Budget) => (b.clientId ? clients.find((c) => c.id === b.clientId) : undefined),
    [clients]
  );

  const rows = React.useMemo(() => {
    const q = norm(search);
    return budgets.filter((b) => {
      if (!matchesStatus(b, status)) return false;
      if (!q) return true;
      const client = clientOf(b);
      const animal = b.animalId ? client?.animals.find((a) => a.id === b.animalId) : undefined;
      const haystack = norm(
        [client?.name || b.clientName, animal?.name || b.animalName, ...b.items.map((it) => it.name)].join(" ")
      );
      return haystack.includes(q);
    });
  }, [budgets, status, search, clientOf]);
  const shown = rows.slice(0, visible);
  const remaining = rows.length - shown.length;
  const isFiltering = status !== "all" || search.trim() !== "";

  return (
    <PageShell className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Orçamentos"
        description="Monte propostas comerciais com itens de catálogo e converta em venda com rastreio de pagamento."
        icon={FileText}
        module="sales"
        breadcrumb={<>Painel &gt; Comercial &gt; Orçamentos</>}
        className="mb-0 sm:mb-0"
        actions={
          <Button asChild variant="outline">
            <Link to="/sales/my-sales">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para vendas
            </Link>
          </Button>
        }
      />

      <KpiStrip
        loading={loadingBudgets}
        items={[
          {
            label: "Em aberto",
            icon: Clock,
            tone: "amber",
            value: formatCurrencyBRL(kpis.open),
            hint: kpis.openCount > 0 ? `${plural(kpis.openCount, "orçamento", "orçamentos")} aguardando o tutor` : "Nada aguardando resposta",
            colorValue: kpis.open > 0,
            onClick: kpis.openCount > 0 ? () => showStatus("open") : undefined,
          },
          {
            label: "Convertidos em venda",
            icon: CheckCircle2,
            tone: "emerald",
            value: formatCurrencyBRL(kpis.converted),
            hint: plural(kpis.convertedCount, "orçamento", "orçamentos"),
            colorValue: kpis.converted > 0,
            onClick: kpis.convertedCount > 0 ? () => showStatus("converted") : undefined,
          },
          {
            label: "Taxa de conversão",
            icon: TrendingUp,
            tone: "violet",
            value: `${conversionRate}%`,
            hint: budgets.length > 0 ? `${kpis.convertedCount} de ${plural(budgets.length, "orçamento", "orçamentos")}` : "—",
          },
          {
            label: "Cancelados",
            icon: Ban,
            tone: "rose",
            value: formatCurrencyBRL(kpis.cancelled),
            hint: plural(kpis.cancelledCount, "orçamento", "orçamentos"),
            onClick: kpis.cancelledCount > 0 ? () => showStatus("cancelled") : undefined,
          },
        ]}
      />

      {/* Montagem: itens à esquerda, cliente/ajustes/total fixos à direita
          (mesmo desenho do PDV). xl, não lg: o breakpoint ignora o menu
          lateral — com ele aberto, em ~1024px as duas colunas espremiam. */}
      <div ref={composerRef} className="grid scroll-mt-4 gap-4 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <Panel
          title={editingBudgetId ? "Editando orçamento" : "Itens do orçamento"}
          description={items.length > 0 ? plural(items.length, "item", "itens") : "Serviços e produtos do catálogo ou itens avulsos"}
          icon={editingBudgetId ? Pencil : ClipboardList}
          tone={editingBudgetId ? "amber" : "violet"}
          // self-start: sem isso o cartão esticava até a altura do resumo,
          // deixando um vazio embaixo dos itens.
          className="xl:self-start"
          actions={
            editingBudgetId ? (
              <Button variant="outline" size="sm" className="h-8" onClick={resetBudgetForm}>
                <X className="mr-1.5 h-3.5 w-3.5" /> Cancelar edição
              </Button>
            ) : undefined
          }
        >
          {editingBudgetId && (
            <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              Os itens abaixo substituem os atuais do orçamento ao salvar.
            </p>
          )}

          <div className="flex flex-wrap items-end gap-2 border-b border-border/70 p-3 sm:gap-3 sm:p-4">
            {/* Celular: o item ocupa a linha toda; qtd, preço e Adicionar descem. */}
            <div className="w-full sm:w-auto sm:min-w-[12rem] sm:flex-1">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-medium">{customItemEnabled ? "Item fora do catálogo" : "Produto ou serviço"}</Label>
                <button
                  type="button"
                  onClick={() => setCustomItemEnabled((v) => !v)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {customItemEnabled ? "Buscar no catálogo" : "Item fora do catálogo"}
                </button>
              </div>
              {!customItemEnabled ? (
                <AutocompleteSelect
                  value={productId}
                  onChange={setProductId}
                  options={options}
                  placeholder="Digite o nome do produto ou serviço"
                  className="mt-1.5"
                />
              ) : (
                <Input
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addItemToBudget(); }}
                  className="mt-1.5 h-10 rounded-lg bg-input"
                  placeholder="Ex.: Cirurgia ortopédica"
                />
              )}
            </div>
            <div className="w-16 shrink-0 sm:w-20">
              <Label htmlFor="budgetQty" className="text-sm font-medium">Qtd.</Label>
              <Input
                id="budgetQty"
                type="number"
                inputMode="numeric"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 0))}
                onKeyDown={(e) => { if (e.key === "Enter") addItemToBudget(); }}
                className="mt-1.5 h-10 w-full rounded-lg bg-input"
              />
            </div>
            <div className="w-32 shrink-0 sm:w-36">
              <Label htmlFor="budgetPrice" className="text-sm font-medium">Preço unit.</Label>
              <CurrencyInput
                id="budgetPrice"
                value={customItemEnabled ? customItemPrice : unitPrice}
                onValueChange={customItemEnabled ? setCustomItemPrice : setUnitPrice}
                className="mt-1.5 h-10 w-full rounded-lg tabular-nums"
              />
            </div>
            <Button onClick={addItemToBudget} className="h-10 flex-1 px-4 font-semibold sm:flex-none">
              <Plus className="mr-1.5 h-4 w-4" /> Adicionar
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-500 ring-1 ring-violet-100">
                <ClipboardList className="h-6 w-6" aria-hidden />
              </span>
              <p className="mt-3 text-sm font-semibold text-foreground">Nenhum item no orçamento</p>
              <p className="mt-1 text-sm text-muted-foreground">Busque um produto ou serviço acima para começar.</p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-border/70">
                {items.map((it, idx) => {
                  const custom = it.itemId.startsWith("custom-");
                  const cat = categoryVisual(custom ? undefined : findCatalogItem(it.itemId)?.category);
                  return (
                    <li key={`${it.itemId}-${idx}`} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                      <IconChip icon={cat.icon} tone={cat.tone} />
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold leading-snug text-foreground">{it.name}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {it.qty} × {formatCurrencyBRL(it.price)}
                          {custom && " · fora do catálogo"}
                        </p>
                      </div>
                      <p className="shrink-0 font-bold tabular-nums text-foreground">{formatCurrencyBRL(it.qty * it.price)}</p>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remover ${it.name}`}
                        title="Remover item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-between gap-3 border-t border-border/70 bg-muted/30 px-4 py-3 pr-[3.75rem] text-sm">
                <span className="font-medium text-muted-foreground">Subtotal dos itens</span>
                <span className="font-bold tabular-nums text-foreground">{formatCurrencyBRL(subtotal)}</span>
              </div>
            </>
          )}
        </Panel>

        <aside className="min-w-0">
          <Panel title="Resumo" icon={Calculator} tone="teal" className="xl:sticky xl:top-4">
            <div className="space-y-4 p-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Cliente</Label>
                <ClientCombobox
                  clients={clients}
                  value={clientId}
                  onChange={(id) => { setClientId(id); setAnimalId(undefined); }}
                  placeholder="Selecione"
                  className="h-10"
                />
                {isClientsError && <p className="text-xs text-destructive">Falha ao carregar clientes.</p>}
              </div>

              {clientId && animals.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Animal <span className="font-normal text-muted-foreground">(opcional)</span>
                  </Label>
                  <Select value={animalId ?? "__none__"} onValueChange={(v) => setAnimalId(v === "__none__" ? undefined : v)}>
                    <SelectTrigger className="h-10 rounded-lg bg-input">
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {animals.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Negociação: cirurgia/procedimento caro costuma sair com
                  desconto combinado na hora — precisa constar no orçamento impresso. */}
              {items.length > 0 && (
                // Na coluna lateral (xl+) um embaixo do outro — lado a lado o
                // valor em R$ ficava cortado (ex.: R$ 1.234,56).
                <PriceAdjustmentFields adj={adj} idPrefix="budget" className="xl:grid-cols-1" />
              )}

              <div className="space-y-1.5">
                <Label htmlFor="budgetNotes" className="text-sm font-medium">
                  Observações <span className="font-normal text-muted-foreground">(saem no orçamento impresso)</span>
                </Label>
                <Textarea
                  id="budgetNotes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex.: inclui retorno em 10 dias; anestesia cobrada à parte..."
                  rows={3}
                  className="rounded-lg text-sm"
                />
              </div>

              <div className="space-y-1 rounded-xl bg-muted/40 px-3 py-3">
                <AdjustmentLines subtotal={subtotal} discount={adj.discountAmount} surcharge={adj.surchargeAmount} discountPct={adj.discountPct} />
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Total</span>
                  <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">{formatCurrencyBRL(totalFinal)}</span>
                </div>
              </div>

              <Button
                onClick={() => void saveBudget()}
                disabled={saving || items.length === 0}
                className="h-11 w-full text-base font-semibold"
              >
                {saving ? "Salvando..." : editingBudgetId ? "Salvar alterações" : "Salvar orçamento"}
              </Button>
            </div>
          </Panel>
        </aside>
      </div>

      <Panel
        sectionRef={listRef}
        title="Orçamentos salvos"
        description="Converta em venda quando o tutor aprovar"
        icon={FileText}
        tone="violet"
        className="scroll-mt-4"
      >
        {/* Busca e situação */}
        <div className="flex flex-col gap-3 border-b border-border/70 p-3 sm:p-4 xl:flex-row xl:items-center xl:justify-between">
          <div role="radiogroup" aria-label="Situação" className="inline-flex w-full overflow-x-auto rounded-xl bg-muted p-1 xl:w-auto">
            {STATUS_FILTERS.map(({ key, label, tone }) => {
              const active = status === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setStatus(key)}
                  className={cn(
                    "flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors xl:flex-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                    active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                  <span
                    className={cn(
                      "ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums",
                      tone && counts[key] > 0 ? cn("ring-1 ring-inset", TONES[tone].badge) : "text-muted-foreground"
                    )}
                  >
                    {counts[key]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative min-w-0 xl:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por tutor, pet ou item"
              aria-label="Buscar orçamentos"
              enterKeyHint="search"
              autoComplete="off"
              className="h-10 rounded-xl bg-input pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Cabeçalho das colunas (computador) */}
        <div className="hidden items-center gap-3 border-b border-border/70 bg-muted/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground xl:flex">
          <span className="w-10 shrink-0" aria-hidden />
          <div className={cn("flex-1", COLUMNS)}>
            <span>Cliente</span>
            <span>Itens</span>
            <span>Data</span>
            <span className="text-right">Valor</span>
            <span className="text-right">Situação</span>
          </div>
          <span className="w-[16rem] shrink-0 text-right">Ações</span>
        </div>

        {loadingBudgets ? (
          <ul className="divide-y divide-border/70" aria-hidden>
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="space-y-2 px-4 py-3.5">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium text-foreground">
              {budgets.length === 0 ? "Nenhum orçamento salvo ainda" : "Nenhum orçamento encontrado"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {budgets.length === 0
                ? "Monte o primeiro orçamento acima — ele aparece aqui para enviar ao tutor e converter em venda."
                : "Mude a situação ou a busca para ver outros orçamentos."}
            </p>
            {isFiltering && budgets.length > 0 && (
              <Button variant="outline" className="mt-4" onClick={() => { setStatus("all"); setSearch(""); }}>
                <X className="mr-2 h-4 w-4" /> Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border/70">
              {shown.map((b) => {
                const total = budgetTotal(b);
                const client = clientOf(b);
                const animal = b.animalId ? client?.animals.find((a) => a.id === b.animalId) : undefined;
                const tutorLabel = client?.name || b.clientName || "Sem cliente";
                const petLabel = animal?.name || b.animalName;
                const SpeciesIcon = speciesIcon(animal?.species);
                const open = isOpenBudget(b);
                const cancelled = b.status === "cancelled";
                return (
                  <li key={b.id} className="flex items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/40 sm:px-4 xl:items-center">
                    <ClientAvatar name={tutorLabel} className={cn(!open && "opacity-60")} />
                    <div className="min-w-0 flex-1 xl:flex xl:items-center xl:gap-3">
                      <div className={cn("min-w-0 xl:flex-1", COLUMNS)}>
                        {/* Cliente + pet */}
                        <div className="min-w-0">
                          {b.clientId && client ? (
                            <Link
                              to={`/clients/${b.clientId}`}
                              className="font-semibold leading-snug text-foreground [overflow-wrap:anywhere] hover:text-primary hover:underline"
                            >
                              {tutorLabel}
                            </Link>
                          ) : (
                            <p className="font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">{tutorLabel}</p>
                          )}
                          {petLabel && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                              <SpeciesIcon className={cn("h-3.5 w-3.5 shrink-0", speciesTone(animal?.species).icon)} aria-hidden />
                              {b.clientId && b.animalId && animal ? (
                                <Link
                                  to={getPatientRecordPath(b.clientId, b.animalId, animal.patientCode)}
                                  className="hover:text-primary hover:underline"
                                >
                                  {petLabel}
                                </Link>
                              ) : (
                                petLabel
                              )}
                            </p>
                          )}
                        </div>
                        {/* Itens */}
                        <div className="mt-1 min-w-0 xl:mt-0">
                          <p className={cn("text-sm leading-snug text-foreground/85 [overflow-wrap:anywhere]", cancelled && "text-muted-foreground")}>
                            {summarizeItems(b.items)}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span className="tabular-nums xl:hidden">{formatDateTime(b.date)}</span>
                            {b.status === "converted" && b.paymentMethod && <PaymentMethodBadge method={b.paymentMethod} />}
                            <SentBadge type="budget" id={b.id} className="whitespace-nowrap" />
                          </div>
                        </div>
                        {/* Data (computador) */}
                        <p className="hidden text-sm tabular-nums text-muted-foreground xl:block">{formatDateTime(b.date)}</p>
                        {/* Valor + situação */}
                        <div className="mt-2 flex items-center justify-between gap-3 xl:contents">
                          <div className="xl:text-right">
                            <p className={cn("text-base font-bold tabular-nums text-foreground", cancelled && "text-muted-foreground line-through")}>
                              {formatCurrencyBRL(total)}
                            </p>
                            {(b.discountAmount ?? 0) > 0 && (
                              <p className="text-xs font-medium tabular-nums text-emerald-700">
                                desconto {formatCurrencyBRL(b.discountAmount ?? 0)}
                              </p>
                            )}
                          </div>
                          <div className="flex xl:justify-end">
                            <BudgetStatusBadge status={b.status} />
                          </div>
                        </div>
                      </div>

                      {/* Ações: converter em destaque; o resto em ícones e no menu "⋯" */}
                      <div className="mt-2 flex items-center justify-end gap-1 border-t border-border/60 pt-2 xl:mt-0 xl:w-[16rem] xl:shrink-0 xl:border-0 xl:pt-0">
                        {open && (
                          <Button
                            size="sm"
                            className="mr-auto h-8 gap-1.5 rounded-lg bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-700 xl:mr-1"
                            onClick={() => setBudgetToConvert(b)}
                            disabled={saving}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Converter
                          </Button>
                        )}
                        {open && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 rounded-lg"
                            onClick={() => startEditBudget(b)}
                            disabled={saving}
                            title="Editar orçamento"
                            aria-label="Editar orçamento"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 rounded-lg"
                          onClick={() => void handleOpenBudgetPdf(b)}
                          title="Abrir PDF do orçamento"
                          aria-label="Abrir PDF do orçamento"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 rounded-lg"
                          onClick={() => void handleSendBudgetWhatsApp(b)}
                          title="Enviar orçamento por WhatsApp (com link do PDF, sem precisar anexar)"
                          aria-label="Enviar orçamento por WhatsApp"
                        >
                          <SiWhatsapp className="h-4 w-4 text-[#25D366]" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-lg" aria-label="Mais ações" title="Mais ações">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {open && (
                              <>
                                <DropdownMenuItem onSelect={() => void cancelBudget(b.id)} disabled={saving}>
                                  <Ban className="mr-2 h-4 w-4 text-amber-600" /> Cancelar orçamento
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem
                              onSelect={() => setBudgetToRemove(b)}
                              className="text-red-700 focus:bg-red-50 focus:text-red-700"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-4 py-2.5 text-xs text-muted-foreground">
              <span aria-live="polite">
                {remaining > 0
                  ? `Mostrando ${shown.length} de ${plural(rows.length, "orçamento", "orçamentos")}`
                  : plural(rows.length, "orçamento", "orçamentos")}
              </span>
              {remaining > 0 && (
                <Button variant="ghost" size="sm" className="h-8" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  Mostrar mais ({remaining})
                </Button>
              )}
            </div>
          </>
        )}
      </Panel>

      <ConvertBudgetDialog
        open={!!budgetToConvert}
        onOpenChange={(open) => { if (!open) setBudgetToConvert(null); }}
        budget={budgetToConvert}
        catalogItems={catalogItems}
        methods={paymentMethods}
        clientName={budgetToConvert ? (clients.find((c) => c.id === budgetToConvert.clientId)?.name ?? budgetToConvert.clientName) : undefined}
        animalName={
          budgetToConvert
            ? (clients.find((c) => c.id === budgetToConvert.clientId)?.animals.find((a) => a.id === budgetToConvert.animalId)?.name ??
              budgetToConvert.animalName)
            : undefined
        }
        onDone={refreshBudgets}
      />

      <AlertDialog open={!!budgetToRemove} onOpenChange={(open) => { if (!open) setBudgetToRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {budgetToRemove
                ? `Orçamento de ${clientOf(budgetToRemove)?.name || budgetToRemove.clientName || "cliente não informado"} (${formatCurrencyBRL(budgetTotal(budgetToRemove))}). `
                : ""}
              Ele sai da lista de vez. Para só marcar que o tutor não aprovou, use "Cancelar orçamento".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (budgetToRemove) void removeBudgetAction(budgetToRemove.id);
                setBudgetToRemove(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
};

export default BudgetsPage;
