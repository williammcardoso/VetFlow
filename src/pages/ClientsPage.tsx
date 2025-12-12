import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FaUsers, FaCog, FaSearch, FaFilter, FaSyncAlt, FaPlus, FaEye, FaTimes } from "react-icons/fa";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
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
import { mockClients as fallbackMockClients } from "@/mockData/clients";

// Mock data for species (from SpeciesPage.tsx)
const mockSpecies = [
  { id: "1", name: "Cachorro" },
  { id: "2", name: "Gato" },
  { id: "3", name: "Pássaro" },
  { id: "4", name: "Roedor" },
];

const ClientsPage = () => {
  const { data: dbClients, isLoading, isError } = useClientsList();
  const baseClients: Client[] = useMemo(() => {
    // Fallback para mocks caso não haja sessão ou erro de RLS
    if (isError || !dbClients || dbClients.length === 0) {
      return fallbackMockClients;
    }
    return dbClients;
  }, [dbClients, isError]);

  const [responsibleSearch, setResponsibleSearch] = useState("");
  const [animalSearch, setAnimalSearch] = useState("");
  const [filteredClients, setFilteredClients] = useState<Client[]>(baseClients);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [filterSpecies, setFilterSpecies] = useState<string | undefined>(undefined);
  const [filterGender, setFilterGender] = useState<string | undefined>(undefined);

  const applyFilters = () => {
    const lowerCaseResponsibleSearch = responsibleSearch.toLowerCase();
    const lowerCaseAnimalSearch = animalSearch.toLowerCase();

    const results = baseClients.filter(client => {
      const matchesResponsible = responsibleSearch.length === 0 || client.name.toLowerCase().includes(lowerCaseResponsibleSearch);

      const matchesAnimal = client.animals.some(animal => {
        const animalNameMatches = animalSearch.length === 0 || animal.name.toLowerCase().includes(lowerCaseAnimalSearch);
        const animalSpeciesMatches = !filterSpecies || animal.species === filterSpecies;
        const animalGenderMatches = !filterGender || animal.gender === filterGender;
        return animalNameMatches && animalSpeciesMatches && animalGenderMatches;
      });

      if (animalSearch.length === 0 && (filterSpecies || filterGender)) {
        return matchesResponsible && client.animals.some(animal => {
          const animalSpeciesMatches = !filterSpecies || animal.species === filterSpecies;
          const animalGenderMatches = !filterGender || animal.gender === filterGender;
          return animalSpeciesMatches && animalGenderMatches;
        });
      }

      return matchesResponsible && (animalSearch.length === 0 && !filterSpecies && !filterGender ? true : matchesAnimal);
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
    setFilterSpecies(undefined);
    setFilterGender(undefined);
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
    setFilterSpecies(undefined);
    setFilterGender(undefined);
    setIsFilterDialogOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header da Página com Gradiente e Breadcrumb */}
      <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 p-6 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-3 text-[#1E293B] dark:text-gray-100 group">
                <FaUsers className="h-5 w-5 text-gray-500 dark:text-gray-400" /> Clientes
              </h1>
              <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-1 mb-4">
                Gerencie os responsáveis e seus animais.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="rounded-md border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors duration-200">
              <FaCog className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Painel &gt; Clientes
        </p>
      </div>

      <div className="flex-1 p-6">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[150px] max-w-xs">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Responsável"
              className="pl-9 bg-white rounded-lg border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-400 placeholder-[#9CA3AF] dark:placeholder-gray-500 transition-all duration-200"
              value={responsibleSearch}
              onChange={(e) => setResponsibleSearch(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="relative flex-1 min-w-[150px] max-w-xs">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Animal"
              className="pl-9 bg-white rounded-lg border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-400 placeholder-[#9CA3AF] dark:placeholder-gray-500 transition-all duration-200"
              value={animalSearch}
              onChange={(e) => setAnimalSearch(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button variant="secondary" size="icon" onClick={applyFilters} className="rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200 shadow-sm hover:shadow-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600">
            <FaSearch className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" onClick={() => setIsFilterDialogOpen(true)} className="rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200 shadow-sm hover:shadow-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600">
            <FaFilter className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" onClick={handleReset} className="rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200 shadow-sm hover:shadow-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600">
            <FaSyncAlt className="h-4 w-4" />
          </Button>
          <Link to="/clients/add">
            <Button className="rounded-md bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
              <FaPlus className="mr-2 h-4 w-4" /> Adicionar Responsável
            </Button>
          </Link>
          <Link to="/animals/add">
            <Button variant="outline" className="rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200 shadow-sm hover:shadow-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600">
              <FaPlus className="mr-2 h-4 w-4" /> Adicionar Animal
            </Button>
          </Link>
        </div>

        <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.08)] transition-all duration-300">
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Animais</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-muted-foreground">Carregando clientes...</TableCell>
                  </TableRow>
                ) : (
                  <>
                    {filteredClients.map((client, index) => (
                      <TableRow key={client.id} className={cn(index % 2 === 1 && "bg-muted/50")}>
                        <TableCell className="font-medium">{client.name} ({client.animals.length})</TableCell>
                        <TableCell>{client.animals.map(a => a.name).join(", ")}</TableCell>
                        <TableCell className="text-right">
                          <Link to={`/clients/${client.id}`}>
                            <Button variant="ghost" size="sm" className="rounded-md hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors duration-200">
                              <FaEye className="h-4 w-4 mr-2" /> Ver
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredClients.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                          Nenhum cliente encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Dialog de Filtro Avançado */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:bg-gray-800/90">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#374151] dark:text-gray-100">Filtros Avançados</DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280] dark:text-gray-400">
              Selecione as opções para filtrar a lista de clientes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filterSpecies">Espécie do Animal</Label>
              <Select onValueChange={setFilterSpecies} value={filterSpecies}>
                <SelectTrigger id="filterSpecies" className="bg-white rounded-lg border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-400 placeholder-[#9CA3AF] dark:placeholder-gray-500 transition-all duration-200">
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
                <SelectTrigger id="filterGender" className="bg-white rounded-lg border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-400 placeholder-[#9CA3AF] dark:placeholder-gray-500 transition-all duration-200">
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
            <Button variant="outline" onClick={handleClearFilterDialog} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-all duration-200 shadow-sm hover:shadow-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600">
              <FaTimes className="mr-2 h-4 w-4" /> Limpar Filtros
            </Button>
            <Button onClick={handleApplyFilterDialog} className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 rounded-md font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
              <FaFilter className="mr-2 h-4 w-4" /> Aplicar Filtros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsPage;