"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { Folder, Lock } from "lucide-react";
import { PageHeader, type VfModule } from "@/components/saas/PageHeader";
import { PageShell } from "@/components/saas/PageShell";
import { SectionCard } from "@/components/saas/SectionCard";
import { ToolbarRow } from "@/components/saas/ToolbarRow";
import { DataTableFrame } from "@/components/saas/DataTableFrame";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RegistryItem, RegistryKeySimple, getRegistryList, addRegistryItem, updateRegistryItem, removeRegistryItem } from "@/mockData/registry";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

type ColumnType = "text" | "number" | "textarea";

interface ColumnConfig {
  key: string;
  label: string;
  type?: ColumnType;
  placeholder?: string;
}

interface RegistryManagerProps {
  storageKey: RegistryKeySimple;
  title: string;
  columns: ColumnConfig[];
  icon?: LucideIcon;
  module?: VfModule;
  breadcrumb?: React.ReactNode;
  layoutVariant?: "A" | "B" | "C";
}

const RegistryManager: React.FC<RegistryManagerProps> = ({
  storageKey,
  title,
  columns,
  icon: Icon = Folder,
  module = "registry",
  breadcrumb,
  layoutVariant = "A",
}) => {
  const [items, setItems] = React.useState<RegistryItem[]>([]);
  const [newItem, setNewItem] = React.useState<Record<string, any>>({ name: "" });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getRegistryList(storageKey);
      setItems(list);
    } catch (err: any) {
      setError(err.message || "Falha ao carregar dados.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAdd = async () => {
    if (!(newItem.name || "").trim()) {
      toast.error("Informe o nome.");
      return;
    }
    const created = await addRegistryItem(storageKey, { ...newItem, name: (newItem.name || "").trim() });
    if (!created) {
      toast.error("Falha ao adicionar.");
      return;
    }
    toast.success("Item adicionado.");
    setNewItem({ name: "" });
    await refresh();
  };

  const handleUpdate = async (item: RegistryItem, key: string, value: any) => {
    const ok = await updateRegistryItem(storageKey, item.id, { [key]: value });
    if (!ok) {
      toast.error("Falha ao atualizar.");
      return;
    }
    await refresh();
  };

  const handleRemove = async (id: string) => {
    const ok = await removeRegistryItem(storageKey, id);
    if (!ok) {
      toast.error("Falha ao remover.");
      return;
    }
    toast.success("Removido.");
    await refresh();
  };

  const renderField = (value: any, type: ColumnType | undefined, onChange: (v: any) => void, placeholder?: string) => {
    switch (type) {
      case "textarea":
        return (
          <Textarea
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 min-h-[2.25rem] w-full resize-none overflow-hidden text-sm bg-input"
            placeholder={placeholder}
          />
        );
      case "number":
        return <Input value={value ?? ""} onChange={(e) => onChange(Number(e.target.value) || 0)} className="h-8 text-sm bg-input" placeholder={placeholder} />;
      default:
        return <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm bg-input" placeholder={placeholder} />;
    }
  };

  const tone =
    module === "default"
      ? "neutral"
      : module === "settings"
        ? "settings"
        : module === "clinical"
          ? "clinical"
          : module;

  const addButtonClassByModule: Record<VfModule, string> = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    clinical: "bg-[hsl(var(--vf-clinical))] text-white hover:bg-[hsl(var(--vf-clinical)/0.9)]",
    sales: "bg-[hsl(var(--vf-sales))] text-white hover:bg-[hsl(var(--vf-sales)/0.9)]",
    finance: "bg-[hsl(var(--vf-finance))] text-white hover:bg-[hsl(var(--vf-finance)/0.9)]",
    stock: "bg-[hsl(var(--vf-stock))] text-white hover:bg-[hsl(var(--vf-stock)/0.9)]",
    registry: "bg-[hsl(var(--vf-registry))] text-white hover:bg-[hsl(var(--vf-registry)/0.9)]",
    settings: "bg-[hsl(var(--vf-settings))] text-white hover:bg-[hsl(var(--vf-settings)/0.9)]",
  };

  return (
    <PageShell>
      <PageHeader
        title={title}
        description="Cadastre e edite itens rapidamente com layout compacto."
        icon={Icon}
        module={module}
        breadcrumb={breadcrumb}
      />

      <SectionCard
        title={layoutVariant === "C" ? "Entrada rápida" : "Adicionar novo"}
        description={
          layoutVariant === "C"
            ? "Cadastre itens na biblioteca operacional do módulo."
            : "Cadastro rápido com validação imediata."
        }
        icon={Icon}
        tone={tone}
        className="no-card-lift"
      >
        <ToolbarRow className="grid grid-cols-1 items-end gap-2 sm:grid-cols-6 lg:grid-cols-8">
          <div className="sm:col-span-2">
            <Label className="text-xs">Nome</Label>
            <Input value={newItem.name ?? ""} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="vf-toolbar-control bg-input" placeholder="Nome" />
          </div>
          {columns.map((col) => (
            <div key={`new-${col.key}`} className={col.type === "textarea" ? "sm:col-span-2 lg:col-span-3" : ""}>
              <Label className="text-xs">{col.label}</Label>
              {renderField(newItem[col.key], col.type, (v) => setNewItem({ ...newItem, [col.key]: v }), col.placeholder)}
            </div>
          ))}
          <div className="sm:col-span-2 lg:col-span-1">
            <Button
              onClick={handleAdd}
              className={`h-8 w-full px-3 text-sm ${addButtonClassByModule[module]}`}
            >
              Adicionar
            </Button>
          </div>
        </ToolbarRow>
      </SectionCard>

      <SectionCard
        title={layoutVariant === "B" ? "Lista agrupada" : "Itens cadastrados"}
        description={
          layoutVariant === "B"
            ? "Leitura densa com foco em manutenção rápida."
            : "Edite em linha e mantenha consistência de dados."
        }
        icon={Folder}
        tone={tone}
        className="no-card-lift"
      >
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Erro ao carregar dados</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <DataTableFrame
            empty={items.length === 0}
            emptyTitle={layoutVariant === "C" ? "Biblioteca vazia" : "Nenhum registro encontrado"}
            emptyDescription={
              layoutVariant === "C"
                ? "Cadastre o primeiro item para iniciar este repositório."
                : "Ajuste os filtros ou adicione um novo item."
            }
          >
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                {columns.map((col) => (
                  <TableHead key={`head-${col.key}`}>{col.label}</TableHead>
                ))}
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => {
                const isProtected = Boolean(item.protected);
                return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium min-w-[220px]">
                    {isProtected ? (
                      <div className="flex items-center gap-2 px-1 text-sm" title="Tipo do sistema — usado em outras partes do app, não pode ser renomeado ou removido.">
                        <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span>{item.name}</span>
                      </div>
                    ) : (
                      <Input value={item.name ?? ""} onChange={(e) => handleUpdate(item, "name", e.target.value)} className="h-8 text-sm bg-input" />
                    )}
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell
                      key={`cell-${item.id}-${col.key}`}
                      className={col.type === "textarea" ? "min-w-[320px]" : "min-w-[160px]"}
                    >
                      {renderField(item[col.key], col.type, (v) => handleUpdate(item, col.key, v), col.placeholder)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    {isProtected ? (
                      <span className="text-xs italic text-muted-foreground">Protegido</span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-destructive/35 text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemove(item.id)}
                      >
                        Remover
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
            </Table>
          </DataTableFrame>
        )}
      </SectionCard>
    </PageShell>
  );
};

export default RegistryManager;