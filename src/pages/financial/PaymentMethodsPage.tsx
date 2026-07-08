import React, { useCallback, useEffect, useState } from "react";
import { Wallet, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getRegistryList,
  addRegistryItem,
  updateRegistryItem,
  removeRegistryItem,
} from "@/mockData/registry";
import type { RegistryItem } from "@/mockData/registry";

const INSTALLMENT_RATES_DEFAULT: Record<string, number> = {
  "1": 3.15, "2": 5.39, "3": 6.12, "4": 6.85,
  "5": 7.57, "6": 8.28, "7": 8.99, "8": 9.69,
  "9": 10.38, "10": 11.06, "11": 11.74, "12": 12.40,
};

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const FinancialPaymentMethodsPage = () => {
  const [items, setItems] = useState<RegistryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingFee, setEditingFee] = useState<Record<string, string>>({});
  const [editingTerm, setEditingTerm] = useState<Record<string, string>>({});

  // Form novo
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [newFee, setNewFee] = useState("");
  const [newTermDays, setNewTermDays] = useState("");
  const [newInstallments, setNewInstallments] = useState(false);
  const [newNotes, setNewNotes] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getRegistryList("paymentMethods");
      setItems(list);
    } catch {
      toast.error("Falha ao carregar formas de pagamento.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleAdd = async () => {
    if (!newName.trim()) { toast.error("Informe o nome."); return; }
    const extra: Record<string, unknown> = {
      type: newType,
      fee: parseFloat(newFee) || 0,
      termDays: parseInt(newTermDays) || 0,
      installments: newInstallments,
      notes: newNotes,
    };
    if (newInstallments) {
      extra.installmentRates = { ...INSTALLMENT_RATES_DEFAULT };
    }
    const ok = await addRegistryItem("paymentMethods", { name: newName.trim(), ...extra });
    if (!ok) { toast.error("Falha ao adicionar."); return; }
    toast.success("Forma de pagamento adicionada.");
    setNewName(""); setNewType(""); setNewFee("");
    setNewTermDays(""); setNewInstallments(false); setNewNotes("");
    await refresh();
  };

  const handleUpdate = async (item: RegistryItem, key: string, value: unknown) => {
    const ok = await updateRegistryItem("paymentMethods", item.id, { [key]: value });
    if (!ok) { toast.error("Falha ao atualizar."); return; }
    await refresh();
  };

  const handleUpdateRate = async (item: RegistryItem, parcela: string, value: string) => {
    const currentRates = (item.installmentRates as Record<string, number>) || { ...INSTALLMENT_RATES_DEFAULT };
    const updated = { ...currentRates, [parcela]: parseFloat(value) || 0 };
    await handleUpdate(item, "installmentRates", updated);
  };

  const handleRemove = async (id: string) => {
    const ok = await removeRegistryItem("paymentMethods", id);
    if (!ok) { toast.error("Falha ao remover."); return; }
    toast.success("Removido.");
    await refresh();
  };

  return (
    <PageShell>
      <PageHeader
        title="Formas de Pagamento"
        description="Gerencie formas de pagamento, taxas e parcelas."
        icon={Wallet}
        module="finance"
        breadcrumb={<>Painel &gt; Financeiro &gt; Formas de Pagamento</>}
      />

      {/* Formulário de cadastro */}
      <SectionCard title="Adicionar nova" description="Cadastre uma nova forma de pagamento." icon={Wallet} tone="finance">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Label className="text-xs font-medium text-muted-foreground">Nome *</Label>
            <Input value={newName} onChange={e => setNewName(e.target.value)}
              className="mt-1 h-9 border border-border bg-card text-sm" placeholder="Ex.: Crédito, PIX..." />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Tipo</Label>
            <select value={newType} onChange={e => setNewType(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-border bg-card px-3 text-sm focus:outline-none">
              <option value="">Selecione...</option>
              <option value="credit">Crédito</option>
              <option value="debit">Débito</option>
              <option value="pix">PIX</option>
              <option value="cash">Dinheiro</option>
              <option value="other">Outro</option>
            </select>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Taxa base (%)</Label>
            <Input value={newFee} onChange={e => setNewFee(e.target.value)}
              className="mt-1 h-9 border border-border bg-card text-sm" placeholder="Ex.: 3.15" type="number" step="0.01" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Prazo (dias úteis)</Label>
            <Input value={newTermDays} onChange={e => setNewTermDays(e.target.value)}
              className="mt-1 h-9 border border-border bg-card text-sm" placeholder="Ex.: 1" type="number" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Observações</Label>
            <Input value={newNotes} onChange={e => setNewNotes(e.target.value)}
              className="mt-1 h-9 border border-border bg-card text-sm" placeholder="Bandeiras, limites..." />
          </div>
          <div className="flex items-end gap-3">
            <div className="flex items-center gap-2 mb-1">
              <button type="button" onClick={() => setNewInstallments(!newInstallments)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${newInstallments ? 'bg-[hsl(var(--vf-finance))]' : 'bg-muted-foreground/30'}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${newInstallments ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <Label className="text-xs text-muted-foreground cursor-pointer" onClick={() => setNewInstallments(!newInstallments)}>
                Permite parcelamento
              </Label>
            </div>
          </div>
          <div className="lg:col-span-4 flex justify-end">
            <Button onClick={handleAdd} className="h-9 px-6 bg-[hsl(var(--vf-finance))] text-white rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Adicionar
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* Lista */}
      <SectionCard title="Formas cadastradas" description="Edite taxas, parcelas e configurações." icon={Wallet} tone="finance">
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma forma cadastrada.</p>
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const isExpanded = expandedId === item.id;
              const hasInstallments = item.installments === true;
              const rates = (item.installmentRates as Record<string, number>) || {};

              return (
                <div key={item.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  {/* Linha principal */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 p-4 items-end">
                    <div className="md:col-span-2">
                      <Label className="text-xs text-muted-foreground">Nome</Label>
                      <Input value={item.name ?? ""} onChange={e => handleUpdate(item, "name", e.target.value)}
                        className="mt-1 h-8 text-sm border border-border bg-card" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Tipo</Label>
                      <select value={item.type ?? ""} onChange={e => handleUpdate(item, "type", e.target.value)}
                        className="mt-1 h-8 w-full rounded-md border border-border bg-card px-2 text-sm focus:outline-none">
                        <option value="">-</option>
                        <option value="credit">Crédito</option>
                        <option value="debit">Débito</option>
                        <option value="pix">PIX</option>
                        <option value="cash">Dinheiro</option>
                        <option value="other">Outro</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Taxa base (%)</Label>
                      <Input
                        value={editingFee[item.id] !== undefined ? editingFee[item.id] : String(item.fee ?? 0)}
                        onChange={e => setEditingFee(prev => ({ ...prev, [item.id]: e.target.value }))}
                        onBlur={e => {
                          const val = parseFloat(e.target.value) || 0;
                          handleUpdate(item, "fee", val);
                          setEditingFee(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                        }}
                        className="mt-1 h-8 text-sm border border-border bg-card" type="number" step="0.01" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Prazo (dias)</Label>
                      <Input
                        value={editingTerm[item.id] !== undefined ? editingTerm[item.id] : String(item.termDays ?? 0)}
                        onChange={e => setEditingTerm(prev => ({ ...prev, [item.id]: e.target.value }))}
                        onBlur={e => {
                          const val = parseInt(e.target.value) || 0;
                          handleUpdate(item, "termDays", val);
                          setEditingTerm(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                        }}
                        className="mt-1 h-8 text-sm border border-border bg-card" type="number" />
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button type="button"
                          onClick={() => handleUpdate(item, "installments", !hasInstallments)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${hasInstallments ? 'bg-[hsl(var(--vf-finance))]' : 'bg-muted-foreground/30'}`}>
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${hasInstallments ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                        <span className="text-xs text-muted-foreground">Parcela</span>
                      </div>
                      <div className="flex gap-1">
                        {hasInstallments && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                            title="Editar taxas por parcela">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                          onClick={() => handleRemove(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Seção expandida de taxas por parcela */}
                  {isExpanded && hasInstallments && (
                    <div className="border-t border-border bg-muted/20 p-4">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Taxas por número de parcelas
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                          <div key={n}>
                            <Label className="text-xs text-muted-foreground">{n}x</Label>
                            <div className="relative mt-1">
                              <Input
                                value={editingFee[item.id + "-" + n] !== undefined
                                  ? editingFee[item.id + "-" + n]
                                  : String(rates[String(n)] ?? "")}
                                onChange={e => setEditingFee(prev => ({ ...prev, [item.id + "-" + n]: e.target.value }))}
                                onBlur={e => {
                                  handleUpdateRate(item, String(n), e.target.value);
                                  setEditingFee(prev => { const nw = { ...prev }; delete nw[item.id + "-" + n]; return nw; });
                                }}
                                className="h-8 text-sm border border-border bg-card pr-6"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                              />
                              <span className="absolute right-2 top-2 text-xs text-muted-foreground">%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Clique no campo e edite a taxa. A alteração é salva automaticamente.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
};

export default FinancialPaymentMethodsPage;
