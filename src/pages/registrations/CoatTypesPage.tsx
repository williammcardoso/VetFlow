import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Palette, Plus, Trash2, Sparkles } from "lucide-react";
import { useRegistryList } from "@/hooks/useRegistryList";
import { addRegistryItem, removeRegistryItem } from "@/lib/registryApi";
import { PageHeader } from "@/components/saas/PageHeader";
import { PageShell } from "@/components/saas/PageShell";
import { SectionCard } from "@/components/saas/SectionCard";

const CoatTypesPage: React.FC = () => {
  const { list: coatTypes, loading, error, refetch } = useRegistryList("coatTypes");
  const [newName, setNewName] = useState("");

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    if (coatTypes.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Essa cor já existe.");
      return;
    }

    const created = await addRegistryItem("coatTypes", { name });
    if (!created) {
      toast.error("Falha ao adicionar cor.");
      return;
    }
    setNewName("");
    toast.success("Cor adicionada.");
    await refetch();
  };

  const handleRemove = async (id: string) => {
    const ok = await removeRegistryItem("coatTypes", id);
    if (!ok) {
      toast.error("Falha ao remover cor.");
      return;
    }
    toast.success("Cor removida.");
    await refetch();
  };

  return (
    <PageShell>
      <PageHeader
        title="Cores de Pelagem"
        description="Lista de cores de pelagem usada no cadastro clínico dos animais."
        icon={Palette}
        module="registry"
        breadcrumb={<>Painel &gt; Cadastros &gt; Cores de Pelagem</>}
        actions={<Badge variant="secondary">{coatTypes.length} cor(es)</Badge>}
      />

      <SectionCard
        title="Cores de Pelagem"
        description="Cadastro rápido e lista compacta das cores de pelagem em um único painel."
        icon={Palette}
        tone="registry"
      >
        <Card className="vf-surface-card card-hover border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">Cadastro rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Ex.: Tricolor"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="max-w-md bg-input"
              />
              <Button onClick={handleAdd} className="bg-[hsl(var(--vf-registry))] text-white shadow-sm hover:bg-[hsl(var(--vf-registry)/0.9)]">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
              <Badge className="bg-[hsl(var(--vf-registry))]/15 text-vf-registry">{coatTypes.length} cor(es)</Badge>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-3">
                <p className="text-sm font-medium text-destructive">Erro ao carregar cores de pelagem</p>
                <p className="mt-1 text-xs text-muted-foreground">{error}</p>
              </div>
            )}
            {loading ? (
              <p className="py-2 text-sm text-muted-foreground">Carregando...</p>
            ) : coatTypes.length === 0 && !error ? (
              <p className="py-2 text-sm text-muted-foreground">Nenhuma cor cadastrada.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {coatTypes.map((c, idx) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                      idx % 2 === 0 ? "border-violet-200/60 bg-violet-50/30" : "border-slate-200 bg-slate-50/50"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Sparkles className="h-4 w-4 text-vf-registry" />
                      <span className="truncate text-sm font-medium">{c.name}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleRemove(c.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </SectionCard>
    </PageShell>
  );
};

export default CoatTypesPage;
