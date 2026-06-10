import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PawPrint, Plus, Trash2, Filter, Pencil, Check, X } from "lucide-react";
import { PageHeader } from "@/components/saas/PageHeader";
import { VfCard } from "@/components/saas/VfCard";
import { useRegistryList } from "@/hooks/useRegistryList";
import { addRegistryItem, removeRegistryItem, updateRegistryItem } from "@/lib/registryApi";

type BreedRow = {
  id: string;
  name: string;
  speciesLabel: string;
};

const BreedsPage: React.FC = () => {
  const { list: speciesList } = useRegistryList("species");
  const { list: breedList, loading, refetch } = useRegistryList("breeds");
  const [newName, setNewName] = useState("");
  const [species, setSpecies] = useState("");
  const [filterSpecies, setFilterSpecies] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const speciesById = useMemo(
    () =>
      new Map(
        speciesList.map((s) => [s.id, s.name])
      ),
    [speciesList]
  );

  const rows = useMemo<BreedRow[]>(
    () =>
      breedList.map((b) => {
        const rawSpecies = String(
          (b as any).species ||
          (b as any).speciesName ||
          (b as any).speciesLabel ||
          ""
        );
        const speciesFromId = speciesById.get(String((b as any).speciesId || ""));
        return {
          id: b.id,
          name: b.name,
          speciesLabel: speciesFromId || rawSpecies || "Sem espécie",
        };
      }),
    [breedList, speciesById]
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return rows.filter((r) => {
      const bySpecies = filterSpecies === "all" || r.speciesLabel === filterSpecies;
      const byName = !normalizedSearch || r.name.toLowerCase().includes(normalizedSearch);
      return bySpecies && byName;
    });
  }, [rows, filterSpecies, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, BreedRow[]>();
    for (const r of filteredRows) {
      const key = r.speciesLabel;
      const list = map.get(key) || [];
      list.push(r);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [filteredRows]);

  const speciesPalette = useMemo<Record<string, string>>(
    () => ({
      Canino:
        "border-l-emerald-500 bg-card dark:border-l-emerald-400 vf-surface-card",
      Felino:
        "border-l-[hsl(var(--vf-registry))] bg-card dark:border-l-[hsl(var(--vf-registry))] vf-surface-card",
      Pássaro: "border-l-teal-500 bg-card dark:border-l-teal-400 vf-surface-card",
      Roedor:
        "border-l-amber-500 bg-card dark:border-l-amber-400 vf-surface-card",
      "Sem espécie":
        "border-l-slate-400 bg-card dark:border-l-slate-500 vf-surface-card",
    }),
    []
  );

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    const speciesLabel = speciesList.find((s) => s.id === species)?.name || species || "Sem espécie";

    const created = await addRegistryItem("breeds", {
      name,
      species,
      speciesId: species,
      speciesName: speciesLabel,
      speciesLabel,
    });
    if (!created) {
      toast.error("Falha ao adicionar raça.");
      return;
    }
    setNewName("");
    setSpecies("");
    toast.success("Raça adicionada.");
    await refetch();
  };

  const handleRemove = async (id: string) => {
    const ok = await removeRegistryItem("breeds", id);
    if (!ok) {
      toast.error("Falha ao remover raça.");
      return;
    }
    toast.success("Raça removida.");
    await refetch();
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const nextName = editingName.trim();
    if (!nextName) return;
    const ok = await updateRegistryItem("breeds", editingId, { name: nextName });
    if (!ok) {
      toast.error("Falha ao atualizar raça.");
      return;
    }
    toast.success("Raça atualizada.");
    cancelEdit();
    await refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cadastro de Raças"
        description="Raças organizadas por espécie, com leitura clínica rápida."
        icon={PawPrint}
        module="registry"
        breadcrumb={<>Painel &gt; Cadastros &gt; Raças</>}
        actions={<Badge variant="secondary">{rows.length} raça(s)</Badge>}
      />

      <VfCard className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base text-foreground">
            <span>Nova raça e filtros</span>
            <Badge className="bg-[hsl(var(--vf-registry))]/15 text-vf-registry">{rows.length} raça(s)</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_260px_auto]">
            <Input placeholder="Ex.: Labrador Retriever" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Select value={species} onValueChange={setSpecies}>
              <SelectTrigger>
                <SelectValue placeholder="Espécie (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {speciesList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} className="bg-[hsl(var(--vf-registry))] text-white shadow-sm hover:bg-[hsl(var(--vf-registry)/0.9)]">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[280px_1fr_auto]">
            <Select value={filterSpecies} onValueChange={setFilterSpecies}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por espécie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as espécies</SelectItem>
                {Array.from(new Set(rows.map((r) => r.speciesLabel)))
                  .sort((a, b) => a.localeCompare(b, "pt-BR"))
                  .map((sp) => (
                    <SelectItem key={sp} value={sp}>
                      {sp}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Buscar raça..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => {
                setFilterSpecies("all");
                setSearch("");
              }}
            >
              <Filter className="mr-2 h-4 w-4" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </VfCard>

      {loading ? (
        <VfCard>
          <CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent>
        </VfCard>
      ) : (
        grouped.map(([speciesLabel, list]) => (
          <Card
            key={speciesLabel}
            className={`rounded-xl border-l-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md ${speciesPalette[speciesLabel] || speciesPalette["Sem espécie"]}`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{speciesLabel}</span>
                <Badge variant="outline">{list.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {list
                  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
                  .map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      {editingId === r.id ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="mr-2 h-8 text-sm"
                        />
                      ) : (
                        <span className="truncate text-sm font-medium">{r.name}</span>
                      )}
                      <div className="ml-2 flex items-center gap-1">
                        {editingId === r.id ? (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => void saveEdit()} className="text-emerald-700 hover:bg-emerald-50">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={cancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => startEdit(r.id, r.name)} className="text-vf-registry hover:bg-[hsl(var(--vf-registry))]/10">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleRemove(r.id)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default BreedsPage;