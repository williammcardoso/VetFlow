import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PawPrint, Plus, Trash2, Bird, Fish, Rabbit, Cat, Dog, Turtle } from "lucide-react";
import { useRegistryList } from "@/hooks/useRegistryList";
import { addRegistryItem, removeRegistryItem } from "@/lib/registryApi";
import { PageHeader } from "@/components/saas/PageHeader";
import { PageShell } from "@/components/saas/PageShell";
import { SectionCard } from "@/components/saas/SectionCard";

const SpeciesPage: React.FC = () => {
  const { list: species, loading, error, refetch } = useRegistryList("species");
  const [newName, setNewName] = useState("");

  const speciesVisuals = useMemo(
    () => [
      { chip: "bg-emerald-100 text-emerald-700", card: "border-emerald-200/70 bg-emerald-50/30" },
      { chip: "bg-blue-100 text-blue-700", card: "border-blue-200/70 bg-blue-50/30" },
      { chip: "bg-violet-100 text-violet-700", card: "border-violet-200/70 bg-violet-50/30" },
      { chip: "bg-amber-100 text-amber-700", card: "border-amber-200/70 bg-amber-50/30" },
      { chip: "bg-pink-100 text-pink-700", card: "border-pink-200/70 bg-pink-50/30" },
    ],
    []
  );

  const resolveIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("can")) return Dog;
    if (n.includes("gat") || n.includes("fel")) return Cat;
    if (n.includes("ave") || n.includes("páss") || n.includes("pass")) return Bird;
    if (n.includes("roed") || n.includes("coelh")) return Rabbit;
    if (n.includes("peix")) return Fish;
    if (n.includes("répt") || n.includes("rept")) return Turtle;
    return PawPrint;
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    const created = await addRegistryItem("species", { name });
    if (!created) {
      toast.error("Falha ao adicionar espécie.");
      return;
    }
    setNewName("");
    toast.success("Espécie adicionada.");
    await refetch();
  };

  const handleRemove = async (id: string) => {
    const ok = await removeRegistryItem("species", id);
    if (!ok) {
      toast.error("Falha ao remover espécie.");
      return;
    }
    toast.success("Espécie removida.");
    await refetch();
  };

  return (
    <PageShell>
      <PageHeader
        title="Cadastro de Espécies"
        description="Estruture os grupos principais de animais atendidos."
        icon={PawPrint}
        module="registry"
        breadcrumb={<>Painel &gt; Cadastros &gt; Espécies</>}
        actions={<Badge variant="secondary">{species.length} espécie(s)</Badge>}
      />

      <SectionCard
        title="Espécies"
        description="Cadastro rápido e visualização compacta das espécies em um único painel."
        icon={PawPrint}
        tone="registry"
      >
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Ex.: Canino"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="max-w-md bg-input"
              />
              <Button onClick={handleAdd} className="bg-[hsl(var(--vf-registry))] text-white shadow-sm hover:bg-[hsl(var(--vf-registry)/0.9)]">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
              <Badge className="bg-[hsl(var(--vf-registry))]/15 text-vf-registry">{species.length} cadastrada(s)</Badge>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-3">
                <p className="text-sm font-medium text-destructive">Erro ao carregar espécies</p>
                <p className="mt-1 text-xs text-muted-foreground">{error}</p>
              </div>
            )}

            {loading ? (
              <p className="py-2 text-sm text-muted-foreground">Carregando...</p>
            ) : species.length === 0 && !error ? (
              <p className="py-2 text-sm text-muted-foreground">Nenhuma espécie cadastrada.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {species.map((s, idx) => {
                  const iconFromDb = (s as { icon?: string; iconUrl?: string }).icon;
                  const iconUrlFromDb = (s as { icon?: string; iconUrl?: string }).iconUrl;
                  const Icon = resolveIcon(s.name);
                  const visual = speciesVisuals[idx % speciesVisuals.length];
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 ${visual.card}`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${visual.chip}`}>
                          {iconUrlFromDb ? (
                            <img src={iconUrlFromDb} alt={s.name} className="h-4 w-4 object-contain" />
                          ) : iconFromDb && iconFromDb.length <= 2 ? (
                            <span className="text-xs font-bold">{iconFromDb}</span>
                          ) : Icon === PawPrint ? (
                            <span className="text-xs font-bold">{s.name.charAt(0).toUpperCase()}</span>
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </span>
                        <span className="truncate text-sm font-medium">{s.name}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => void handleRemove(s.id)} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </SectionCard>
    </PageShell>
  );
};

export default SpeciesPage;
