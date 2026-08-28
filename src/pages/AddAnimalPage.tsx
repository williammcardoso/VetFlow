import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import WeightInput from "@/components/inputs/WeightInput";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ClientCombobox from "@/components/ClientCombobox";
import AutocompleteSelect from "@/components/AutocompleteSelect";
import { usePatientRouteParams } from "@/hooks/usePatientRouteParams";
import { Textarea } from "@/components/ui/textarea";
import { FaArrowLeft, FaPlus, FaTimes, FaSave } from "@/components/icons/fa";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"; // Importar useParams e useSearchParams
import { toast } from "sonner";
import { Animal, Client } from "@/types/client"; // Importar as interfaces Animal e Client
import { useClientWithAnimals, useClientsList } from "@/hooks/useSupabaseClients";
import { getPatientRecordPath } from "@/utils/patientDisplayId";
import { useRegistryList } from "@/hooks/useRegistryList";
import { addAnimalToClient, updateAnimalDetails } from "@/lib/clientsApi";
import { useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { PawPrint } from "lucide-react";

// Mock data for species
const mockSpecies = [
  { id: "1", name: "Canino" },
  { id: "2", name: "Felino" },
  { id: "3", name: "Pássaro" },
  { id: "4", name: "Roedor" },
  { id: "other", name: "Outro" },
];

// Mock data for breeds, categorized by speciesId
const mockBreeds = [
  // Canino (speciesId: "1")
  { id: "c1", name: "SRD / Vira-lata", speciesId: "1" },
  { id: "c2", name: "American Bully", speciesId: "1" },
  { id: "c3", name: "Beagle", speciesId: "1" },
  { id: "c4", name: "Bernese Mountain Dog", speciesId: "1" },
  { id: "c5", name: "Bichon Frisé", speciesId: "1" },
  { id: "c6", name: "Border Collie", speciesId: "1" },
  { id: "c7", name: "Boxer", speciesId: "1" },
  { id: "c8", name: "Bulldog Francês", speciesId: "1" },
  { id: "c9", name: "Cane Corso", speciesId: "1" },
  { id: "c10", name: "Chihuahua", speciesId: "1" },
  { id: "c11", name: "Chow Chow", speciesId: "1" },
  { id: "c12", name: "Cocker Spaniel", speciesId: "1" },
  { id: "c13", name: "Dachshund (Salsicha)", speciesId: "1" },
  { id: "c14", name: "Dogue Alemão", speciesId: "1" },
  { id: "c15", name: "Golden Retriever", speciesId: "1" },
  { id: "c16", name: "Husky Siberiano", speciesId: "1" },
  { id: "c17", name: "Labrador Retriever", speciesId: "1" },
  { id: "c18", name: "Lhasa Apso", speciesId: "1" },
  { id: "c19", name: "Lulu da Pomerânia (Spitz Alemão)", speciesId: "1" },
  { id: "c20", name: "Maltês", speciesId: "1" },
  { id: "c21", name: "Pastor Alemão", speciesId: "1" },
  { id: "c22", name: "Pastor Australiano", speciesId: "1" },
  { id: "c23", name: "Pastor Belga Malinois", speciesId: "1" },
  { id: "c24", name: "Pinscher Miniatura", speciesId: "1" },
  { id: "c25", name: "Pit Bull (American Pit Bull Terrier)", speciesId: "1" },
  { id: "c26", name: "Pit Monster", speciesId: "1" },
  { id: "c27", name: "Poodle", speciesId: "1" },
  { id: "c28", name: "Pug", speciesId: "1" },
  { id: "c29", name: "Rottweiler", speciesId: "1" },
  { id: "c30", name: "Schnauzer", speciesId: "1" },
  { id: "c31", name: "Shih Tzu", speciesId: "1" },
  { id: "c32", name: "Staffordshire Terrier (Amstaff)", speciesId: "1" },
  { id: "c33", name: "Yorkshire Terrier", speciesId: "1" },

  // Felino (speciesId: "2")
  { id: "f1", name: "SRD / Vira-lata", speciesId: "2" },
  { id: "f2", name: "American Shorthair", speciesId: "2" },
  { id: "f3", name: "Angorá Turco", speciesId: "2" },
  { id: "f4", name: "Azul Russo", speciesId: "2" },
  { id: "f5", name: "Bengal", speciesId: "2" },
  { id: "f6", name: "Maine Coon", speciesId: "2" },
  { id: "f7", name: "Persa", speciesId: "2" },
  { id: "f8", name: "Ragdoll", speciesId: "2" },
  { id: "f9", name: "Siamês", speciesId: "2" },
  { id: "f10", name: "Sphynx", speciesId: "2" },

  // Pássaro (speciesId: "3")
  { id: "p1", name: "Calopsita", speciesId: "3" },
  { id: "p2", name: "Canário", speciesId: "3" },
  { id: "p3", name: "Periquito", speciesId: "3" },
  { id: "p4", name: "Agapornis", speciesId: "3" },
  { id: "p5", name: "Cacatua", speciesId: "3" },
  { id: "p6", name: "Papagaio", speciesId: "3" },

  // Roedor (speciesId: "4")
  { id: "r1", name: "Hamster", speciesId: "4" },
  { id: "r2", name: "Porquinho-da-Índia", speciesId: "4" },
  { id: "r3", name: "Coelho", speciesId: "4" },
  { id: "r4", name: "Chinchila", speciesId: "4" },
  { id: "r5", name: "Rato Twister", speciesId: "4" },
];

const AddAnimalPage = () => {
  const navigate = useNavigate();
  const { clientId, animalId } = usePatientRouteParams(); // clientId/animalId da rota longa OU curta (/prontuario/:patientCode/edit)
  const isEditing = !!animalId; // Determinar se está em modo de edição
  const [searchParams] = useSearchParams();
  const initialClientIdFromParams = searchParams.get('clientId');
  const queryClient = useQueryClient();
  const { data: clientsData, isLoading: isClientsLoading, isError: isClientsError, error: clientsError } = useClientsList();
  const { list: coatTypesFromDb } = useRegistryList("coatTypes");

  const [selectedTutorId, setSelectedTutorId] = useState<string | undefined>(initialClientIdFromParams || clientId || undefined);
  const [animalName, setAnimalName] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState<string | undefined>(undefined);
  const [customSpeciesName, setCustomSpeciesName] = useState(""); // New state for custom species
  const [selectedBreed, setSelectedBreed] = useState<string | undefined>(undefined);
  const [customBreedName, setCustomBreedName] = useState(""); // New state for custom breed
  const [gender, setGender] = useState<Animal['gender'] | undefined>(undefined);
  const [birthday, setBirthday] = useState("");
  const [selectedCoatColor, setSelectedCoatColor] = useState<string | undefined>(undefined);
  const [customCoatColorName, setCustomCoatColorName] = useState(""); // New state for custom coat color
  const [weight, setWeight] = useState<number | ''>('');
  const [microchip, setMicrochip] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isFirstSpeciesSync = useRef(true);
  const coatTypesBase = useMemo(
    () => coatTypesFromDb.map((c) => ({ id: c.id, name: c.name })),
    [coatTypesFromDb]
  );

  const { data: clientData, isLoading: isClientLoading, isError: isClientError, error: clientError } =
    useClientWithAnimals(isEditing ? clientId : selectedTutorId);
  const existingAnimal = clientData?.animals.find((a) => a.id === animalId);

  // Carregar dados do animal se estiver em modo de edição
  useEffect(() => {
    if (!isEditing || !clientId || !animalId) return;
    if (isClientLoading) return;
    if (isClientError) {
      toast.error(
        `Erro ao carregar animal do banco: ${clientError instanceof Error ? clientError.message : "erro desconhecido"}.`
      );
      navigate(`/clients/${clientId}`);
      return;
    }

    const animalToEdit = clientData?.animals.find((a) => a.id === animalId);
    if (!animalToEdit) {
      toast.error("Animal não encontrado para edição.");
      navigate(`/clients/${clientId}`);
      return;
    }

    setAnimalName(animalToEdit.name);
    // Encontrar o ID da espécie correspondente ou definir como 'other'
    const speciesFound = mockSpecies.find((s) => s.name === animalToEdit.species);
    if (speciesFound) {
      setSelectedSpecies(speciesFound.id);
      setCustomSpeciesName("");
    } else {
      setSelectedSpecies("other");
      setCustomSpeciesName(animalToEdit.species);
    }

    // Encontrar o ID da raça correspondente ou definir como 'other'
    const breedFound = mockBreeds.find((b) => b.name === animalToEdit.breed && b.speciesId === speciesFound?.id);
    if (breedFound) {
      setSelectedBreed(breedFound.id);
      setCustomBreedName("");
    } else {
      setSelectedBreed(`other-${speciesFound?.id || "other"}`);
      setCustomBreedName(animalToEdit.breed);
    }

    setGender(animalToEdit.gender);
    setBirthday(animalToEdit.birthday);

    // Encontrar o ID da cor da pelagem correspondente ou definir como 'other-color'
    const coatColorFound = coatTypesBase.find((c) => c.name === animalToEdit.coatColor);
    if (coatColorFound) {
      setSelectedCoatColor(coatColorFound.id);
      setCustomCoatColorName("");
    } else {
      setSelectedCoatColor("other-color");
      setCustomCoatColorName(animalToEdit.coatColor);
    }

    setWeight(animalToEdit.weight);
    setMicrochip(animalToEdit.microchip);
    setNotes(animalToEdit.notes);
  }, [isEditing, clientId, animalId, isClientLoading, isClientError, clientError, clientData, navigate]);


  // Filter breeds based on selected species and sort them
  const getFilteredBreeds = () => {
    if (!selectedSpecies) return [];
    if (selectedSpecies === "other") return [{ id: "other-custom", name: "Outra Raça", speciesId: "other" }];

    const breedsForSpecies = mockBreeds.filter(breed => breed.speciesId === selectedSpecies);

    // Separate SRD / Vira-lata
    const srdBreed = breedsForSpecies.find(b => b.name === "SRD / Vira-lata");
    const otherBreeds = breedsForSpecies.filter(b => b.name !== "SRD / Vira-lata");

    // Sort other breeds alphabetically
    const sortedOtherBreeds = [...otherBreeds].sort((a, b) => a.name.localeCompare(b.name));

    // Combine SRD (if exists), sorted other breeds, and then "Outra Raça"
    const finalBreeds = [];
    if (srdBreed) {
      finalBreeds.push(srdBreed);
    }
    finalBreeds.push(...sortedOtherBreeds);
    finalBreeds.push({ id: `other-${selectedSpecies}`, name: "Outra Raça", speciesId: selectedSpecies });

    return finalBreeds;
  };

  // Prepare coat color options with "Outra Cor" at the end
  const getCoatColorOptions = () => {
    const sortedColors = [...coatTypesBase].sort((a, b) => a.name.localeCompare(b.name));
    return [...sortedColors, { id: "other-color", name: "Outra Cor" }];
  };

  // Reset breed and custom breed when species changes
  useEffect(() => {
    if (isFirstSpeciesSync.current) {
      isFirstSpeciesSync.current = false;
      return;
    }
    setSelectedBreed(undefined);
    setCustomBreedName("");
  }, [selectedSpecies]);

  // Reset custom species name if "Outro" is deselected
  useEffect(() => {
    if (selectedSpecies !== "other") {
      setCustomSpeciesName("");
    }
  }, [selectedSpecies]);

  // Reset custom breed name if "Outra Raça" is deselected
  useEffect(() => {
    if (selectedBreed && !selectedBreed.startsWith("other-")) {
      setCustomBreedName("");
    }
  }, [selectedBreed]);

  // Reset custom coat color name if "Outra Cor" is deselected
  useEffect(() => {
    if (selectedCoatColor !== "other-color") {
      setCustomCoatColorName("");
    }
  }, [selectedCoatColor]);


  const invalidateAnimalQueries = async (targetClientId: string) => {
    await queryClient.invalidateQueries({ queryKey: ["clients-with-animals"] });
    await queryClient.invalidateQueries({ queryKey: ["client-with-animals", targetClientId] });
  };

  const handleSaveAnimal = async () => {
    if (isSaving) return;
    // Determine final species name
    const finalSpeciesName = selectedSpecies === "other"
      ? customSpeciesName.trim()
      : mockSpecies.find(s => s.id === selectedSpecies)?.name || '';

    // Determine final breed name
    const finalBreedName = selectedBreed && selectedBreed.startsWith("other-")
      ? customBreedName.trim()
      : mockBreeds.find(b => b.id === selectedBreed)?.name || '';

    // Determine final coat color name
    const finalCoatColorName = selectedCoatColor === "other-color"
      ? customCoatColorName.trim()
      : coatTypesBase.find(c => c.id === selectedCoatColor)?.name || '';

    // Basic validation
    if (!selectedTutorId || !animalName.trim() || !finalSpeciesName || !gender || !birthday || weight === '') {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    if (selectedSpecies === "other" && !customSpeciesName.trim()) {
      toast.error("Por favor, digite o nome da espécie personalizada.");
      return;
    }
    if (selectedBreed && selectedBreed.startsWith("other-") && !customBreedName.trim()) {
      toast.error("Por favor, digite o nome da raça personalizada.");
      return;
    }
    if (selectedCoatColor === "other-color" && !customCoatColorName.trim()) {
      toast.error("Por favor, digite o nome da cor da pelagem personalizada.");
      return;
    }


    const animalData: Omit<Animal, 'id'> = {
      name: animalName.trim(),
      species: finalSpeciesName,
      breed: finalBreedName,
      gender: gender,
      birthday: birthday,
      coatColor: finalCoatColorName,
      weight: Number(weight),
      microchip: microchip.trim(),
      notes: notes.trim(),
      status: 'Ativo', // Default status
    };

    setIsSaving(true);
    try {
      if (isEditing && clientId && animalId) {
        const updated = await updateAnimalDetails(clientId, animalId, animalData);
        if (!updated) {
          toast.error("Erro ao atualizar animal no banco.");
          return;
        }
        await invalidateAnimalQueries(clientId);
        toast.success(`Animal ${animalData.name} atualizado com sucesso!`);
        navigate(getPatientRecordPath(clientId, animalId, existingAnimal?.patientCode));
        return;
      }

      if (!selectedTutorId) {
        toast.error("Selecione um tutor para salvar o animal.");
        return;
      }

      const addedAnimal = await addAnimalToClient(selectedTutorId, animalData);
      if (!addedAnimal) {
        toast.error("Erro ao adicionar animal no banco.");
        return;
      }
      await invalidateAnimalQueries(selectedTutorId);
      toast.success(`Animal ${addedAnimal.name} adicionado com sucesso ao cliente!`);
      navigate(`/clients/${selectedTutorId}`);
    } finally {
      setIsSaving(false);
    }
  };

  const pageTitle = isEditing ? `Editar Animal: ${animalName}` : "Adicionar Animal";
  const breadcrumbText = isEditing ? "Editar Animal" : "Adicionar Animal";
  const backLink = isEditing && clientId && animalId
    ? getPatientRecordPath(clientId, animalId, existingAnimal?.patientCode)
    : `/clients/${selectedTutorId || ''}`;

  if ((isEditing && isClientLoading) || (!isEditing && isClientsLoading)) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">Carregando...</h1>
        <p className="text-muted-foreground">Buscando dados no banco.</p>
      </div>
    );
  }

  if (isClientError || isClientsError) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-semibold mb-2 text-destructive">Erro ao carregar dados</h1>
        <p className="text-muted-foreground">
          {isClientError
            ? `Falha ao carregar cliente: ${clientError instanceof Error ? clientError.message : "erro desconhecido"}`
            : `Falha ao carregar lista de tutores: ${clientsError instanceof Error ? clientsError.message : "erro desconhecido"}`}
        </p>
      </div>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={pageTitle}
        description={isEditing ? "Edite as informações do animal." : "Cadastre um novo animal e suas informações."}
        icon={PawPrint}
        module="clinical"
        breadcrumb={
          <>
            Painel &gt; <Link to="/clients" className="hover:text-primary">Clientes</Link> &gt; {breadcrumbText}
          </>
        }
        actions={
          <Link to={backLink}>
            <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground transition-colors duration-200">
              <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
          </Link>
        }
      />

      <div className="flex-1">
        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-sm md:grid-cols-2 lg:grid-cols-3 vf-surface-card vf-tone-clinical card-hover">
          <div className="space-y-2">
            <Label htmlFor="tutor" className="text-muted-foreground font-medium">Tutor/Responsável*</Label>
            <ClientCombobox
              id="tutor"
              clients={clientsData || []}
              value={selectedTutorId}
              onChange={setSelectedTutorId}
              placeholder="Selecione o tutor..."
              disabled={isEditing || !!initialClientIdFromParams}
              className="h-10 bg-input rounded-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="animalName" className="text-muted-foreground font-medium">Nome do Animal*</Label>
            <Input id="animalName" placeholder="Nome do animal" value={animalName} onChange={(e) => setAnimalName(e.target.value)} className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="species" className="text-muted-foreground font-medium">Espécie*</Label>
            <Select onValueChange={setSelectedSpecies} value={selectedSpecies}>
              <SelectTrigger id="species" className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {mockSpecies.map((species) => (
                  <SelectItem key={species.id} value={species.id}>
                    {species.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSpecies === "other" && (
              <Input
                id="customSpeciesName"
                placeholder="Digite a espécie"
                value={customSpeciesName}
                onChange={(e) => setCustomSpeciesName(e.target.value)}
                className="mt-2 bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="breed" className="text-muted-foreground font-medium">Raça</Label>
            <AutocompleteSelect
              disabled={!selectedSpecies || selectedSpecies === "other"}
              value={selectedBreed}
              onChange={setSelectedBreed}
              options={getFilteredBreeds().map((breed) => ({ value: breed.id, label: breed.name }))}
              placeholder="Digite pra buscar a raça..."
            />
            {selectedBreed && selectedBreed.startsWith("other-") && (
              <Input
                id="customBreedName"
                placeholder="Digite a raça"
                value={customBreedName}
                onChange={(e) => setCustomBreedName(e.target.value)}
                className="mt-2 bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender" className="text-muted-foreground font-medium">Sexo*</Label>
            <Select onValueChange={(value: Animal['gender']) => setGender(value)} value={gender}>
              <SelectTrigger id="gender" className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Macho">Macho</SelectItem>
                <SelectItem value="Fêmea">Fêmea</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthday" className="text-muted-foreground font-medium">Data de Nascimento*</Label>
            <Input id="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coatColor" className="text-muted-foreground font-medium">Cor da Pelagem</Label>
            <Select onValueChange={setSelectedCoatColor} value={selectedCoatColor}>
              <SelectTrigger id="coatColor" className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {getCoatColorOptions().map((coatType) => (
                  <SelectItem key={coatType.id} value={coatType.id}>
                    {coatType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCoatColor === "other-color" && (
              <Input
                id="customCoatColorName"
                placeholder="Digite a cor da pelagem"
                value={customCoatColorName}
                onChange={(e) => setCustomCoatColorName(e.target.value)}
                className="mt-2 bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight" className="text-muted-foreground font-medium">Peso (kg)*</Label>
            <WeightInput id="weight" placeholder="Ex: 5,5" value={weight} onChange={setWeight} className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="microchip" className="text-muted-foreground font-medium">Microchip</Label>
            <Input id="microchip" placeholder="Número do microchip" value={microchip} onChange={(e) => setMicrochip(e.target.value)} className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200" />
          </div>
        </div>

        <div className="vf-surface-card vf-tone-clinical card-hover mt-6 space-y-2 rounded-2xl border border-border/80 p-6">
          <Label htmlFor="animalNotes" className="text-muted-foreground font-medium">Observações</Label>
          <Textarea id="animalNotes" placeholder="Adicione observações sobre o animal..." rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200" />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => navigate(backLink)} className="bg-card border border-border text-foreground hover:bg-muted rounded-md transition-all duration-200 shadow-sm hover:shadow-md">
            <FaTimes className="mr-2 h-4 w-4" /> Cancelar
          </Button>
          <Button disabled={isSaving} onClick={handleSaveAnimal} className="rounded-md bg-[hsl(var(--vf-clinical))] font-semibold text-white transition-all duration-200 shadow-md hover:bg-[hsl(var(--vf-clinical)/0.9)] hover:shadow-lg">
            <FaSave className="mr-2 h-4 w-4" /> Salvar
          </Button>
        </div>
      </div>
    </PageShell>
  );
};

export default AddAnimalPage;