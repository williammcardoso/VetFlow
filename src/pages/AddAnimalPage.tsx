import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Bird, Cat, Dog, Loader2, PawPrint, Rabbit, Save } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import WeightInput from "@/components/inputs/WeightInput";
import ClientCombobox from "@/components/ClientCombobox";
import AutocompleteSelect from "@/components/AutocompleteSelect";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { ChoiceGroup, Field, FieldGrid, FormSection, StickyActionBar, focusField } from "@/components/forms/FormLayout";
import { ClientAvatar } from "@/components/clients/clientVisuals";
import { usePatientRouteParams } from "@/hooks/usePatientRouteParams";
import { useClientWithAnimals, useClientsList } from "@/hooks/useSupabaseClients";
import { useRegistryList } from "@/hooks/useRegistryList";
import { addAnimalToClient, updateAnimalDetails } from "@/lib/clientsApi";
import { formatAgeLong, formatPhoneBR, getTodayLocalISO } from "@/lib/utils";
import { getPatientRecordPath } from "@/utils/patientDisplayId";
import type { Animal } from "@/types/client";

// Cadastro de animal em seções (mesmo padrão do cadastro de cliente):
// espécie e sexo como opções visíveis, idade calculada na hora, opção de
// informar só a idade aproximada, um "Salvar" fixo no rodapé.
//
// Raça e pelagem ficam guardadas pelo NOME (é o que vai pro banco) e a
// opção do select é derivada na hora — antes eram ids e dois efeitos
// sincronizavam os campos: ao abrir pra editar, a raça era apagada logo
// depois de carregada.

const SPECIES = [
  { id: "1", name: "Canino", icon: Dog },
  { id: "2", name: "Felino", icon: Cat },
  { id: "3", name: "Pássaro", icon: Bird },
  { id: "4", name: "Roedor", icon: Rabbit },
  { id: "other", name: "Outra", icon: PawPrint },
] as const;
type SpeciesId = (typeof SPECIES)[number]["id"];

const BREEDS: Record<string, string[]> = {
  "1": [
    "SRD / Vira-lata", "American Bully", "Beagle", "Bernese Mountain Dog", "Bichon Frisé", "Border Collie", "Boxer",
    "Bulldog Francês", "Cane Corso", "Chihuahua", "Chow Chow", "Cocker Spaniel", "Dachshund (Salsicha)", "Dogue Alemão",
    "Golden Retriever", "Husky Siberiano", "Labrador Retriever", "Lhasa Apso", "Lulu da Pomerânia (Spitz Alemão)",
    "Maltês", "Pastor Alemão", "Pastor Australiano", "Pastor Belga Malinois", "Pinscher Miniatura",
    "Pit Bull (American Pit Bull Terrier)", "Pit Monster", "Poodle", "Pug", "Rottweiler", "Schnauzer", "Shih Tzu",
    "Staffordshire Terrier (Amstaff)", "Yorkshire Terrier",
  ],
  "2": ["SRD / Vira-lata", "American Shorthair", "Angorá Turco", "Azul Russo", "Bengal", "Maine Coon", "Persa", "Ragdoll", "Siamês", "Sphynx"],
  "3": ["Calopsita", "Canário", "Periquito", "Agapornis", "Cacatua", "Papagaio"],
  "4": ["Hamster", "Porquinho-da-Índia", "Coelho", "Chinchila", "Rato Twister"],
};

const OTHER = "__other__";

/** SRD primeiro, o resto em ordem alfabética. */
function breedsFor(speciesId: SpeciesId | undefined): string[] {
  const list = speciesId ? BREEDS[speciesId] ?? [] : [];
  const srd = list.filter((b) => b === "SRD / Vira-lata");
  return [...srd, ...list.filter((b) => b !== "SRD / Vira-lata").sort((a, b) => a.localeCompare(b, "pt-BR"))];
}

/** Data de hoje menos N anos e M meses, em "aaaa-mm-dd" (idade aproximada). */
function birthdayFromAge(years: number, months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - (years * 12 + months));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type FieldErrors = Partial<Record<"tutor" | "animalName" | "species" | "customSpecies" | "breed" | "gender" | "birthday" | "weight" | "coatColor", string>>;

const AddAnimalPage = () => {
  const navigate = useNavigate();
  const { clientId, animalId } = usePatientRouteParams(); // rota longa OU curta (/prontuario/:patientCode/edit)
  const isEditing = !!animalId;
  const [searchParams] = useSearchParams();
  const initialClientIdFromParams = searchParams.get("clientId");
  const queryClient = useQueryClient();
  const { data: clientsData, isLoading: isClientsLoading, isError: isClientsError, error: clientsError } = useClientsList();
  const { list: coatTypesFromDb } = useRegistryList("coatTypes");

  const [selectedTutorId, setSelectedTutorId] = useState<string | undefined>(initialClientIdFromParams || clientId || undefined);
  const [animalName, setAnimalName] = useState("");
  const [speciesId, setSpeciesId] = useState<SpeciesId | undefined>(undefined);
  const [customSpecies, setCustomSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [breedIsCustom, setBreedIsCustom] = useState(false);
  const [gender, setGender] = useState<string | undefined>(undefined);
  const [birthday, setBirthday] = useState("");
  const [approxAge, setApproxAge] = useState<{ open: boolean; years: string; months: string }>({ open: false, years: "", months: "" });
  const [coatColor, setCoatColor] = useState("");
  const [coatIsCustom, setCoatIsCustom] = useState(false);
  const [weight, setWeight] = useState<number | "">("");
  const [microchip, setMicrochip] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loadedAnimalId, setLoadedAnimalId] = useState<string | null>(null);

  const { data: clientData, isLoading: isClientLoading, isError: isClientError, error: clientError } =
    useClientWithAnimals(isEditing ? clientId : selectedTutorId);
  const existingAnimal = clientData?.animals.find((a) => a.id === animalId);
  const tutorLocked = isEditing || !!initialClientIdFromParams;

  // Carrega o animal no modo edição (uma vez por animal).
  useEffect(() => {
    if (!isEditing || !clientId || !animalId || isClientLoading) return;
    if (isClientError) {
      toast.error(`Erro ao carregar animal do banco: ${clientError instanceof Error ? clientError.message : "erro desconhecido"}.`);
      navigate(`/clients/${clientId}`);
      return;
    }
    const animal = clientData?.animals.find((a) => a.id === animalId);
    if (!animal) {
      toast.error("Animal não encontrado para edição.");
      navigate(`/clients/${clientId}`);
      return;
    }
    if (loadedAnimalId === animal.id) return;
    setAnimalName(animal.name);
    const species = SPECIES.find((s) => s.id !== "other" && s.name === animal.species);
    setSpeciesId(species ? species.id : "other");
    setCustomSpecies(species ? "" : animal.species);
    setBreed(animal.breed || "");
    setGender(animal.gender || undefined);
    setBirthday(animal.birthday || "");
    setCoatColor(animal.coatColor || "");
    setWeight(animal.weight || "");
    setMicrochip(animal.microchip || "");
    setNotes(animal.notes || "");
    setLoadedAnimalId(animal.id);
  }, [isEditing, clientId, animalId, isClientLoading, isClientError, clientError, clientData, navigate, loadedAnimalId]);

  const breedOptions = useMemo(() => breedsFor(speciesId), [speciesId]);
  const breedInList = breedOptions.includes(breed);
  const showCustomBreed = speciesId === "other" || breedIsCustom || (Boolean(breed) && !breedInList);

  const coatOptions = useMemo(
    () => coatTypesFromDb.map((c) => c.name).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [coatTypesFromDb]
  );
  const coatInList = coatOptions.includes(coatColor);
  const showCustomCoat = coatIsCustom || (Boolean(coatColor) && !coatInList);

  const clearError = (key: keyof FieldErrors) => setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const handleSpeciesChange = (value: SpeciesId | undefined) => {
    if (!value || value === speciesId) return;
    setSpeciesId(value);
    // Raça de uma espécie não vale pra outra.
    setBreed("");
    setBreedIsCustom(false);
    if (value !== "other") setCustomSpecies("");
    clearError("species");
  };

  const ageLabel = useMemo(() => {
    if (!birthday) return "";
    if (birthday > getTodayLocalISO()) return "";
    return formatAgeLong(`${birthday}T12:00:00`);
  }, [birthday]);

  const applyApproxAge = (years: string, months: string) => {
    setApproxAge((prev) => ({ ...prev, years, months }));
    const y = parseInt(years, 10) || 0;
    const m = parseInt(months, 10) || 0;
    if (y > 0 || m > 0) {
      setBirthday(birthdayFromAge(y, m));
      clearError("birthday");
    }
  };

  const invalidateAnimalQueries = async (targetClientId: string) => {
    await queryClient.invalidateQueries({ queryKey: ["clients-with-animals"] });
    await queryClient.invalidateQueries({ queryKey: ["client-with-animals", targetClientId] });
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!selectedTutorId) next.tutor = "Escolha o tutor do animal.";
    if (!animalName.trim()) next.animalName = "Informe o nome do animal.";
    if (!speciesId) next.species = "Escolha a espécie.";
    else if (speciesId === "other" && !customSpecies.trim()) next.customSpecies = "Digite qual é a espécie.";
    if (showCustomBreed && breedIsCustom && !breed.trim() && speciesId !== "other") next.breed = "Digite a raça ou escolha outra opção.";
    if (!gender) next.gender = "Escolha o sexo.";
    if (!birthday) next.birthday = "Informe a data de nascimento (ou a idade aproximada).";
    else if (birthday > getTodayLocalISO()) next.birthday = "A data de nascimento está no futuro.";
    if (weight === "" || Number(weight) <= 0) next.weight = "Informe o peso.";
    if (coatIsCustom && !coatColor.trim()) next.coatColor = "Digite a cor da pelagem ou escolha da lista.";
    return next;
  };

  const handleSaveAnimal = async () => {
    if (isSaving) return;
    const found = validate();
    setErrors(found);
    const order: Array<keyof FieldErrors> = ["tutor", "animalName", "species", "customSpecies", "breed", "gender", "birthday", "weight", "coatColor"];
    const firstInvalid = order.find((k) => found[k]);
    if (firstInvalid) {
      toast.error("Confira os campos destacados.");
      focusField(firstInvalid);
      return;
    }

    const speciesName = speciesId === "other" ? customSpecies.trim() : SPECIES.find((s) => s.id === speciesId)?.name || "";
    const base: Partial<Animal> = {
      name: animalName.trim(),
      species: speciesName,
      breed: breed.trim(),
      gender: gender as Animal["gender"],
      birthday,
      coatColor: coatColor.trim(),
      microchip: microchip.trim(),
      notes: notes.trim(),
    };

    setIsSaving(true);
    try {
      if (isEditing && clientId && animalId) {
        // Peso só vai junto se mudou: cada peso enviado vira um ponto no
        // histórico da aba Peso (antes, qualquer edição — até corrigir o
        // nome — gravava o mesmo peso de novo).
        const updates: Partial<Animal> = { ...base };
        if (!existingAnimal || Number(weight) !== existingAnimal.weight) {
          updates.weight = Number(weight);
          updates.lastWeightSource = "Manual";
        }
        const now = new Date();
        const ok = await updateAnimalDetails(clientId, animalId, updates, {
          date: getTodayLocalISO(),
          time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
        });
        if (!ok) {
          toast.error("Erro ao atualizar animal no banco.");
          return;
        }
        await invalidateAnimalQueries(clientId);
        toast.success(`${base.name} atualizado.`);
        navigate(getPatientRecordPath(clientId, animalId, existingAnimal?.patientCode));
        return;
      }

      if (!selectedTutorId) return;
      const added = await addAnimalToClient(selectedTutorId, {
        ...base,
        weight: Number(weight),
        status: "Ativo",
        lastWeightSource: "Cadastro Inicial",
      });
      if (!added) {
        toast.error("Erro ao adicionar animal no banco.");
        return;
      }
      await invalidateAnimalQueries(selectedTutorId);
      toast.success(`${added.name} cadastrado.`);
      navigate(`/clients/${selectedTutorId}`);
    } finally {
      setIsSaving(false);
    }
  };

  const backLink =
    isEditing && clientId && animalId
      ? getPatientRecordPath(clientId, animalId, existingAnimal?.patientCode)
      : selectedTutorId
        ? `/clients/${selectedTutorId}`
        : "/clients";

  if ((isEditing && isClientLoading && !clientData) || (!isEditing && isClientsLoading)) {
    return (
      <PageShell>
        <div className="p-6 text-center">
          <h1 className="mb-2 text-xl font-semibold">Carregando…</h1>
          <p className="text-muted-foreground">Buscando dados no banco.</p>
        </div>
      </PageShell>
    );
  }

  if (isClientError || isClientsError) {
    return (
      <PageShell>
        <div className="p-6 text-center">
          <h1 className="mb-2 text-xl font-semibold text-destructive">Erro ao carregar dados</h1>
          <p className="text-muted-foreground">
            {isClientError
              ? `Falha ao carregar cliente: ${clientError instanceof Error ? clientError.message : "erro desconhecido"}`
              : `Falha ao carregar lista de tutores: ${clientsError instanceof Error ? clientsError.message : "erro desconhecido"}`}
          </p>
        </div>
      </PageShell>
    );
  }

  const tutor = clientData ?? clientsData?.find((c) => c.id === selectedTutorId);
  const genderOptions = [
    { value: "Macho", label: "Macho" },
    { value: "Fêmea", label: "Fêmea" },
    ...(gender === "Outro" ? [{ value: "Outro", label: "Outro" }] : []),
  ];

  return (
    <PageShell className="space-y-5 sm:space-y-6">
      <PageHeader
        title={isEditing ? `Editar ${animalName || "animal"}` : "Novo animal"}
        description="Campos com * são obrigatórios."
        icon={PawPrint}
        module="clinical"
        className="mb-0 sm:mb-0"
        breadcrumb={
          <>
            Painel &gt;{" "}
            <Link to="/clients" className="hover:text-primary">
              Clientes
            </Link>{" "}
            &gt; {isEditing ? "Editar animal" : "Novo animal"}
          </>
        }
      />

      <form
        noValidate
        className="space-y-6 sm:space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSaveAnimal();
        }}
      >
        <FormSection title="Tutor" description={tutorLocked ? "Responsável pelo animal." : "Quem é o responsável pelo animal."}>
          {tutorLocked && tutor ? (
            <div className="flex items-center gap-3">
              <ClientAvatar name={tutor.name} />
              <div className="min-w-0">
                <p className="break-words font-medium text-foreground">{tutor.name}</p>
                {tutor.mainPhoneContact && <p className="text-sm text-muted-foreground">{formatPhoneBR(tutor.mainPhoneContact)}</p>}
              </div>
            </div>
          ) : (
            <Field
              label="Tutor"
              htmlFor="tutor"
              required
              error={errors.tutor}
              hint={
                <>
                  Não está na lista?{" "}
                  <Link to="/clients/add" className="font-medium text-primary hover:underline">
                    Cadastre o cliente primeiro
                  </Link>
                  .
                </>
              }
            >
              <ClientCombobox
                id="tutor"
                clients={clientsData || []}
                value={selectedTutorId}
                onChange={(id) => {
                  setSelectedTutorId(id);
                  clearError("tutor");
                }}
                placeholder="Digite o nome do tutor…"
              />
            </Field>
          )}
        </FormSection>

        <FormSection title="Dados do animal" description="Nome, espécie, idade e peso atual.">
          <FieldGrid>
            <Field label="Nome" htmlFor="animalName" required error={errors.animalName} className="sm:col-span-6">
              <Input
                id="animalName"
                value={animalName}
                autoComplete="off"
                aria-invalid={Boolean(errors.animalName)}
                placeholder="Ex.: Thor"
                onChange={(e) => {
                  setAnimalName(e.target.value);
                  clearError("animalName");
                }}
              />
            </Field>

            <Field label="Espécie" labelId="species-label" required error={errors.species} className="sm:col-span-6">
              <ChoiceGroup
                id="species"
                labelledBy="species-label"
                value={speciesId}
                onChange={handleSpeciesChange}
                options={SPECIES.map((s) => ({ value: s.id, label: s.name, icon: s.icon }))}
              />
            </Field>

            {speciesId === "other" && (
              <Field label="Qual espécie?" htmlFor="customSpecies" required error={errors.customSpecies} className="sm:col-span-6">
                <Input
                  id="customSpecies"
                  value={customSpecies}
                  placeholder="Ex.: Réptil, Equino"
                  onChange={(e) => {
                    setCustomSpecies(e.target.value);
                    clearError("customSpecies");
                  }}
                />
              </Field>
            )}

            <Field label="Raça" htmlFor={showCustomBreed ? "breed" : undefined} error={errors.breed} className="sm:col-span-3">
              {speciesId !== "other" && (
                <AutocompleteSelect
                  disabled={!speciesId}
                  value={breedInList ? breed : showCustomBreed ? OTHER : undefined}
                  onChange={(value) => {
                    clearError("breed");
                    if (value === OTHER) {
                      setBreedIsCustom(true);
                      if (breedInList) setBreed("");
                    } else {
                      setBreedIsCustom(false);
                      setBreed(value);
                    }
                  }}
                  options={[...breedOptions.map((b) => ({ value: b, label: b })), { value: OTHER, label: "Outra raça" }]}
                  placeholder={speciesId ? "Digite para buscar…" : "Escolha a espécie primeiro"}
                />
              )}
              {showCustomBreed && (
                <Input
                  id="breed"
                  value={breed}
                  className={speciesId !== "other" ? "mt-2" : undefined}
                  placeholder="Digite a raça"
                  onChange={(e) => {
                    setBreed(e.target.value);
                    clearError("breed");
                  }}
                />
              )}
            </Field>

            <Field label="Sexo" labelId="gender-label" required error={errors.gender} className="sm:col-span-3">
              <ChoiceGroup
                id="gender"
                labelledBy="gender-label"
                value={gender}
                onChange={(v) => {
                  setGender(v);
                  clearError("gender");
                }}
                options={genderOptions}
              />
            </Field>

            <Field
              label="Data de nascimento"
              htmlFor="birthday"
              required
              error={errors.birthday}
              hint={ageLabel ? `Idade: ${ageLabel}${approxAge.open ? " (aproximada)" : ""}` : undefined}
              className="sm:col-span-3"
            >
              <Input
                id="birthday"
                type="date"
                max={getTodayLocalISO()}
                value={birthday}
                aria-invalid={Boolean(errors.birthday)}
                onChange={(e) => {
                  setBirthday(e.target.value);
                  clearError("birthday");
                }}
              />
              {approxAge.open ? (
                <div className="flex flex-wrap items-end gap-2 rounded-xl bg-muted/50 p-2.5">
                  <div className="w-20 space-y-1">
                    <Label htmlFor="approxYears" className="text-xs">
                      Anos
                    </Label>
                    <Input
                      id="approxYears"
                      inputMode="numeric"
                      value={approxAge.years}
                      onChange={(e) => applyApproxAge(e.target.value.replace(/\D/g, "").slice(0, 2), approxAge.months)}
                    />
                  </div>
                  <div className="w-20 space-y-1">
                    <Label htmlFor="approxMonths" className="text-xs">
                      Meses
                    </Label>
                    <Input
                      id="approxMonths"
                      inputMode="numeric"
                      value={approxAge.months}
                      onChange={(e) => applyApproxAge(approxAge.years, e.target.value.replace(/\D/g, "").slice(0, 2))}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setApproxAge({ open: false, years: "", months: "" })}>
                    Fechar
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => setApproxAge((p) => ({ ...p, open: true }))}
                >
                  Não sabe a data? Informe a idade aproximada
                </button>
              )}
            </Field>

            <Field label="Peso (kg)" htmlFor="weight" required error={errors.weight} hint="Digite só os números: 5500 vira 5,500 kg." className="sm:col-span-3">
              <WeightInput
                id="weight"
                placeholder="0,000"
                value={weight}
                onChange={(v) => {
                  setWeight(v);
                  clearError("weight");
                }}
              />
            </Field>

            <Field label="Pelagem" htmlFor="coatColor" error={errors.coatColor} className="sm:col-span-3">
              <Select
                value={coatInList ? coatColor : showCustomCoat ? OTHER : undefined}
                onValueChange={(value) => {
                  clearError("coatColor");
                  if (value === OTHER) {
                    setCoatIsCustom(true);
                    if (coatInList) setCoatColor("");
                  } else {
                    setCoatIsCustom(false);
                    setCoatColor(value);
                  }
                }}
              >
                <SelectTrigger id={showCustomCoat ? undefined : "coatColor"}>
                  <SelectValue placeholder="Escolha a cor" />
                </SelectTrigger>
                <SelectContent>
                  {coatOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER}>Outra cor</SelectItem>
                </SelectContent>
              </Select>
              {showCustomCoat && (
                <Input
                  id="coatColor"
                  className="mt-2"
                  value={coatColor}
                  placeholder="Digite a cor da pelagem"
                  onChange={(e) => {
                    setCoatColor(e.target.value);
                    clearError("coatColor");
                  }}
                />
              )}
            </Field>

            <Field label="Microchip" htmlFor="microchip" className="sm:col-span-3">
              <Input id="microchip" inputMode="numeric" value={microchip} placeholder="Número do microchip, se tiver" onChange={(e) => setMicrochip(e.target.value)} />
            </Field>
          </FieldGrid>
        </FormSection>

        <FormSection title="Observações" description="Alergias, comportamento, cuidados especiais.">
          <Field label="Observações" htmlFor="animalNotes">
            <Textarea
              id="animalNotes"
              rows={4}
              value={notes}
              placeholder="Ex.: alérgico a dipirona; morde na contenção."
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </FormSection>

        <StickyActionBar>
          <Button type="button" variant="outline" onClick={() => navigate(backLink)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving} className="min-w-[9rem] font-semibold">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isEditing ? "Salvar alterações" : "Salvar animal"}
          </Button>
        </StickyActionBar>
      </form>
    </PageShell>
  );
};

export default AddAnimalPage;
