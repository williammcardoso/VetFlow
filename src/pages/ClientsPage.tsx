import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Filter, RefreshCw, Plus, Eye, X } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/saas/PageHeader";
import { PageShell } from "@/components/saas/PageShell";
import { SectionCard } from "@/components/saas/SectionCard";
import { ToolbarRow } from "@/components/saas/ToolbarRow";
import { DataTableFrame } from "@/components/saas/DataTableFrame";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Client } from "@/types/client";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

// Mock data for species (from SpeciesPage.tsx)
const mockSpecies = [
  { id: "1", name: "Cachorro" },
  { id: "2", name: "Gato" },
  { id: "3", name: "Pássaro" },
  { id: "4", name: "Roedor" },
];

const ClientsPage = () => {
  const { data: dbClients, isLoading, isError, error } = useClientsList();
  const baseClients: Client[] = useMemo(() => dbClients ?? [], [dbClients]);

  const [responsibleSearch, setResponsibleSearch] = useState("");
  const [animalSearch, setAnimalSearch] = useState("");
  const [filteredClients, setFilteredClients] = useState<Client[]>(baseClients);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [filterSpecies, setFilterSpecies] = useState<string>("all");
  const [filterGender, setFilterGender] = useState<string>("all");

  const applyFilters = () => {
    const lowerCaseResponsibleSearch = responsibleSearch.toLowerCase();
    const lowerCaseAnimalSearch = animalSearch.toLowerCase();

    const results = baseClients.filter(client => {
      const matchesResponsible = responsibleSearch.length === 0 || client.name.toLowerCase().includes(lowerCaseResponsibleSearch);

      const animals = client.animals ?? [];
      const matchesAnimal = animals.some(animal => {
        const animalNameMatches = animalSearch.length === 0 || animal.name.toLowerCase().includes(lowerCaseAnimalSearch);
        const animalSpeciesMatches = filterSpecies === "all" || animal.species === filterSpecies;
        const animalGenderMatches = filterGender === "all" || animal.gender === filterGender;
        return animalNameMatches && animalSpeciesMatches && animalGenderMatches;
      });

      if (animalSearch.length === 0 && (filterSpecies !== "all" || filterGender !== "all")) {
        return matchesResponsible && animals.some(animal => {
          const animalSpeciesMatches = filterSpecies === "all" || animal.species === filterSpecies;
          const animalGenderMatches = filterGender === "all" || animal.gender === filterGender;
          return animalSpeciesMatches && animalGenderMatches;
        });
      }

      return matchesResponsible && (animalSearch.length === 0 && filterSpecies === "all" && filterGender === "all" ? true : matchesAnimal);
    });
    setFilteredClients(results);
  };

  useEffect(() => {
    setFilteredClients(baseClients);
  }, [baseClients]);

  useEffect(() => {
    applyFilters();
  }, [responsibleSearch, animalSearch, filterSpecies, filterGender]); // aplica em tempo real

  const handleReset = () => {
    setResponsibleSearch("");
    setAnimalSearch("");
    setFilterSpecies("all");
    setFilterGender("all");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      applyFilters();
    }
  };

  const handleApplyFilterDialog = () => {
    applyFilters();
    setIsFilterDialogOpen(false);
  };

  const handleClearFilterDialog = () => {
    setFilterSpecies("all");
    setFilterGender("all");
    setIsFilterDialogOpen(false);
  };

  return (
    <PageShell>
      <PageHeader
        title="Clientes"
        description="Gerencie os responsáveis e seus animais."
        icon={Users}
        module="clinical"
        breadcrumb={<>Painel &gt; Clientes</>}
      />

      <SectionCard
        title="Filtros e ações"
        description="Use busca rápida e filtros avançados para localizar responsáveis e animais."
        icon={Filter}
        tone="clinical"
      >
        <ToolbarRow>
          <div className="relative min-w-[150px] max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vf-clinical" />
            <Input
              placeholder="Responsável"
              className="vf-toolbar-control rounded-xl border-border bg-input pl-9 transition-colors focus-visible:ring-primary/30"
              value={responsibleSearch}
              onChange={(e) => setResponsibleSearch(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="relative min-w-[150px] max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vf-clinical" />
            <Input
              placeholder="Animal"
              className="vf-toolbar-control rounded-xl border-border bg-input pl-9 transition-colors focus-visible:ring-primary/30"
              value={animalSearch}
              onChange={(e) => setAnimalSearch(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button variant="secondary" size="icon" onClick={applyFilters} aria-label="Pesquisar clientes" title="Pesquisar">
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setIsFilterDialogOpen(true)}
            aria-label="Filtros avançados"
            title="Filtros"
          >
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" onClick={handleReset} aria-label="Limpar filtros" title="Limpar">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button asChild className="font-semibold shadow-sm">
            <Link to="/clients/add">
              <Plus className="mr-2 h-4 w-4" /> Adicionar Responsável
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-primary/25 shadow-sm transition-colors hover:border-primary/40">
            <Link to="/animals/add">
              <Plus className="mr-2 h-4 w-4" /> Adicionar Animal
            </Link>
          </Button>
        </ToolbarRow>
      </SectionCard>

      <SectionCard
        title="Lista de clientes"
        description="Visualização consolidada de responsáveis, pets e atalhos de navegação."
        icon={Users}
        tone="clinical"
      >
        {isError ? (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Falha ao carregar clientes</AlertTitle>
            <AlertDescription>{error instanceof Error ? error.message : "Erro desconhecido ao consultar o Supabase."}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <DataTableFrame empty={filteredClients.length === 0}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Animais</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client, index) => {
                  const animals = client.animals ?? [];
                  return (
                    <TableRow key={client.id} className={cn(index % 2 === 1 && "bg-muted/50")}>
                      <TableCell className="font-medium">
                        {client.name} ({animals.length})
                      </TableCell>
                      <TableCell>{animals.map((a) => a.name).join(", ") || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm" className="rounded-md transition-colors">
                          <Link to={`/clients/${client.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> Ver
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DataTableFrame>
        )}
      </SectionCard>

      {/* Dialog de Filtro Avançado */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-xl border-border bg-card shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">Filtros Avançados</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Selecione as opções para filtrar a lista de clientes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filterSpecies">Espécie do Animal</Label>
              <Select onValueChange={setFilterSpecies} value={filterSpecies}>
                <SelectTrigger id="filterSpecies" className="bg-input">
                  <SelectValue placeholder="Todas as espécies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as espécies</SelectItem>
                  {mockSpecies.map((species) => (
                    <SelectItem key={species.id} value={species.name}>
                      {species.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterGender">Sexo do Animal</Label>
              <Select onValueChange={setFilterGender} value={filterGender}>
                <SelectTrigger id="filterGender" className="bg-input">
                  <SelectValue placeholder="Todos os sexos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os sexos</SelectItem>
                  <SelectItem value="Macho">Macho</SelectItem>
                  <SelectItem value="Fêmea">Fêmea</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClearFilterDialog}>
              <X className="mr-2 h-4 w-4" /> Limpar Filtros
            </Button>
            <Button onClick={handleApplyFilterDialog}>
              <Filter className="mr-2 h-4 w-4" /> Aplicar Filtros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default ClientsPage;