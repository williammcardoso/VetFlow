"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FaPlus, FaTrashAlt, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { parseDosePerAdministration } from "@/utils/parseDose";
import { MedicationData } from "@/types/medication";

export type { MedicationData };

interface PrescriptionMedicationFormProps {
  medication: MedicationData;
  index: number;
  onSave: (updatedMedication: MedicationData) => void;
  onDelete: (id: string) => void;
  onToggleCollapse: (id: string) => void;
}

const mockUseTypes = ["Uso Oral", "Uso Tópico", "Uso Oftalmológico", "Uso Auricular", "Uso Injetável"];
const mockPharmacyTypes = ["Farmácia Veterinária", "Farmácia Humana"];
const mockPharmaceuticalForms = ["Comprimido", "Cápsula", "Líquido (ml)", "Gotas", "Aplicação", "Spray", "Pomada", "Outro"];
const mockFrequencies = ["6 horas", "8 horas", "12 horas", "24 horas (1x/dia)", "Outro"];
const mockPeriods = ["3 dias", "5 dias", "7 dias", "10 dias", "14 dias", "21 dias", "Outro"];

const PrescriptionMedicationForm: React.FC<PrescriptionMedicationFormProps> = ({
  medication,
  index,
  onSave,
  onDelete,
  onToggleCollapse,
}) => {
  const [useType, setUseType] = useState<string>(medication.useType);
  const [pharmacyType, setPharmacyType] = useState<string>(medication.pharmacyType);
  const [medicationName, setMedicationName] = useState<string>(medication.medicationName);
  const [concentration, setConcentration] = useState<string>(medication.concentration);
  const [pharmaceuticalForm, setPharmaceuticalForm] = useState<string>(medication.pharmaceuticalForm);
  const [customPharmaceuticalForm, setCustomPharmaceuticalForm] = useState<string>(medication.customPharmaceuticalForm || "");
  const [dosePerAdministration, setDosePerAdministration] = useState<string>(medication.dosePerAdministration);
  const [frequency, setFrequency] = useState<string>(medication.frequency);
  const [customFrequency, setCustomFrequency] = useState<string>(medication.customFrequency || "");
  const [period, setPeriod] = useState<string>(medication.period);
  const [customPeriod, setCustomPeriod] = useState<string>(medication.customPeriod || "");
  const [useCustomInstructions, setUseCustomInstructions] = useState<boolean>(medication.useCustomInstructions);
  const [customInstructionInput, setCustomInstructionInput] = useState<string>(
    medication.useCustomInstructions ? medication.generatedInstructions : ""
  );
  const [generalObservations, setGeneralObservations] = useState<string>(medication.generalObservations);
  const [totalQuantity, setTotalQuantity] = useState<string>(medication.totalQuantity);
  const [totalQuantityDisplay, setTotalQuantityDisplay] = useState<string>(medication.totalQuantityDisplay || "");
  const [isCollapsed, setIsCollapsed] = useState<boolean>(medication.isCollapsed ?? false);

  useEffect(() => {
    setIsCollapsed(medication.isCollapsed ?? false);
  }, [medication.id, medication.isCollapsed]);

  const useTypeRef = useRef<HTMLButtonElement>(null);
  const customInstructionInputRef = useRef<HTMLTextAreaElement>(null); // Ref para o campo de instrução personalizada

  // Foco no campo Tipo de Uso quando o formulário é expandido (novo ou editado)
  useEffect(() => {
    if (!isCollapsed && useTypeRef.current) {
      useTypeRef.current.focus();
    }
  }, [isCollapsed]);

  // Foco no campo de instrução personalizada quando o switch é ativado
  useEffect(() => {
    if (useCustomInstructions && customInstructionInputRef.current) {
      customInstructionInputRef.current.focus();
    }
  }, [useCustomInstructions]);

  const generateAutoInstructions = () => {
    let instructions = "";
    const doseText = dosePerAdministration.trim();
    let formText = pharmaceuticalForm === "Outro" && customPharmaceuticalForm.trim() ? customPharmaceuticalForm.trim() : pharmaceuticalForm.trim();
    const freqText = frequency === "Outro" && customFrequency.trim() ? customFrequency.trim() : frequency.trim();
    const periodText = period === "Outro" && customPeriod.trim() ? customPeriod.trim() : period.trim();

    const displayFormText = formText.toLowerCase(); 
    const pluralFormText = (displayFormText.includes("comprimido") || displayFormText.includes("cápsula"))
        ? `${displayFormText}(s)`
        : displayFormText;

    if (doseText && formText && freqText && periodText) {
      instructions = `Dê ${doseText} ${pluralFormText}, a cada ${freqText}, durante ${periodText}.`;
    } else if (doseText && formText && freqText) {
      instructions = `Dê ${doseText} ${pluralFormText}, a cada ${freqText}.`;
    } else if (doseText && formText) {
      instructions = `Dê ${doseText} ${pluralFormText}.`;
    } else if (doseText) {
      instructions = `Dê ${doseText}.`;
    }
    return instructions;
  };

  useEffect(() => {
    let calculatedQuantity = 0;
    const doseNum = parseDosePerAdministration(dosePerAdministration);
    const periodValue = period === "Outro" && customPeriod.trim() ? customPeriod.trim() : period.trim();
    const periodNum = parseFloat(periodValue.split(' ')[0]);

    if (!isNaN(doseNum) && !isNaN(periodNum)) {
      let freqMultiplier = 1;
      if (frequency.includes("24 horas")) freqMultiplier = 1;
      else if (frequency.includes("12 horas")) freqMultiplier = 2;
      else if (frequency.includes("8 horas")) freqMultiplier = 3;
      else if (frequency.includes("6 horas")) freqMultiplier = 4;
      
      const rawTotal = doseNum * freqMultiplier * periodNum;
      calculatedQuantity = rawTotal;
    }

    let formUnitForRound = (pharmaceuticalForm === "Outro" && customPharmaceuticalForm.trim()) ? customPharmaceuticalForm.trim() : pharmaceuticalForm.trim();
    formUnitForRound = formUnitForRound.toLowerCase();
    const isWholeUnit = formUnitForRound.includes("comprimido") || formUnitForRound.includes("cápsula") || formUnitForRound.includes("gota") || formUnitForRound.includes("aplicacao");
    const quantityToStore = calculatedQuantity > 0
      ? (isWholeUnit ? Math.round(calculatedQuantity) : Math.round(calculatedQuantity * 100) / 100)
      : 0;
    setTotalQuantity(quantityToStore > 0 ? String(quantityToStore) : "");

    let formattedTotalQuantity = "";
    if (quantityToStore > 0) {
      if (isWholeUnit) {
        formattedTotalQuantity = `${quantityToStore} ${formUnitForRound}(s)`;
      } else if (formUnitForRound.includes("ml")) {
        formattedTotalQuantity = `${quantityToStore} mL`;
      } else {
        formattedTotalQuantity = `${quantityToStore} ${formUnitForRound}`;
      }
    }
    setTotalQuantityDisplay(formattedTotalQuantity);

  }, [dosePerAdministration, pharmaceuticalForm, customPharmaceuticalForm, frequency, customFrequency, period, customPeriod]);

  const handleSave = () => {
    if (
      !useType ||
      !pharmacyType ||
      !medicationName.trim() ||
      (!useCustomInstructions && (!pharmaceuticalForm || !dosePerAdministration.trim() || !frequency || !period)) ||
      (useCustomInstructions && !customInstructionInput.trim())
    ) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const currentAutoGeneratedInstructions = generateAutoInstructions();

    const updatedMedication: MedicationData = {
      ...medication,
      useType,
      pharmacyType,
      medicationName: medicationName.trim(),
      concentration: concentration.trim(),
      pharmaceuticalForm: useCustomInstructions ? "" : (pharmaceuticalForm === "Outro" ? customPharmaceuticalForm.trim() : pharmaceuticalForm),
      customPharmaceuticalForm: useCustomInstructions ? undefined : (pharmaceuticalForm === "Outro" ? customPharmaceuticalForm.trim() : undefined),
      dosePerAdministration: useCustomInstructions ? "" : dosePerAdministration.trim(),
      frequency: useCustomInstructions ? "" : (frequency === "Outro" ? customFrequency.trim() : frequency),
      customFrequency: useCustomInstructions ? undefined : (frequency === "Outro" ? customFrequency.trim() : undefined),
      period: useCustomInstructions ? "" : (period === "Outro" ? customPeriod.trim() : period),
      customPeriod: useCustomInstructions ? undefined : (period === "Outro" ? customPeriod.trim() : undefined),
      useCustomInstructions,
      generatedInstructions: useCustomInstructions ? customInstructionInput.trim() : currentAutoGeneratedInstructions,
      generalObservations: generalObservations.trim(),
      totalQuantity: useCustomInstructions ? "" : totalQuantity,
      totalQuantityDisplay: useCustomInstructions ? "" : totalQuantityDisplay,
      isCollapsed: true,
    };
    onSave(updatedMedication);
    setIsCollapsed(true);
  };

  const displayMedicationName = medicationName.trim() || "Medicamento sem nome";
  const displayPharmacyType = pharmacyType === "Farmácia Veterinária" ? "Vet" : "Humana";
  const currentAutoGeneratedInstructionsForDisplay = generateAutoInstructions();

  return (
    <div className="rounded-xl border border-border bg-white p-4 space-y-4 shadow-lg">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-sm">
            #{index + 1}
          </span>
          <>
            {displayMedicationName} {concentration && ` ${concentration}`}
            {medication.pharmacyType && (
              <span
                className={cn(
                  "ml-2 px-2 py-0.5 text-xs font-medium rounded-full",
                  medication.pharmacyType.includes("Veterin") ? "bg-emerald-100 text-emerald-800" : "bg-[hsl(var(--vf-clinical))]/15 text-vf-clinical"
                )}
              >
                {medication.pharmacyType.includes("Veterin") ? "Veterinária" : "Humana"}
              </span>
            )}
          </>
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => onDelete(medication.id)} className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200" title="Excluir">
            <FaTrashAlt className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onToggleCollapse(medication.id)} className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200" title={isCollapsed ? "Expandir para editar" : "Recolher"}>
            {isCollapsed ? <FaChevronDown className="h-4 w-4 text-muted-foreground" /> : <FaChevronUp className="h-4 w-4 text-muted-foreground" />}
          </Button>
        </div>
      </div>
      {/* Mostrar instrução gerada automaticamente também no cartão (atualiza enquanto digita) */}
      { (medication.generatedInstructions || (!useCustomInstructions && (dosePerAdministration || pharmaceuticalForm || frequency || period))) && (
        <div className="mt-2 text-sm text-muted-foreground">
          {useCustomInstructions ? (customInstructionInput || medication.generatedInstructions) : (generateAutoInstructions() || medication.generatedInstructions)}
        </div>
      )}

      {!isCollapsed && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`useType-${medication.id}`}>Tipo de Uso *</Label>
              <Select onValueChange={setUseType} value={useType}>
                <SelectTrigger ref={useTypeRef} id={`useType-${medication.id}`} className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200">
                  <SelectValue placeholder="Selecionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {mockUseTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`pharmacyType-${medication.id}`}>Tipo de Farmácia *</Label>
              <Select onValueChange={setPharmacyType} value={pharmacyType}>
                <SelectTrigger id={`pharmacyType-${medication.id}`} className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200">
                  <SelectValue placeholder="Selecionar farmácia" />
                </SelectTrigger>
                <SelectContent>
                  {mockPharmacyTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`medicationName-${medication.id}`}>Nome do Medicamento *</Label>
              <Input
                id={`medicationName-${medication.id}`}
                placeholder="Ex: Carprofeno"
                value={medicationName}
                onChange={(e) => setMedicationName(e.target.value)}
                className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`concentration-${medication.id}`}>Concentração</Label>
              <Input
                id={`concentration-${medication.id}`}
                placeholder="Ex: 75mg, 100mg/ml"
                value={concentration}
                onChange={(e) => setConcentration(e.target.value)}
                className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
              />
            </div>
          </div>

          {useCustomInstructions ? (
            <div className="space-y-2 mt-4">
              <Label htmlFor={`customInstructionInput-${medication.id}`}>Instrução Personalizada *</Label>
              <Textarea
                ref={customInstructionInputRef} // Adicionando a ref aqui
                id={`customInstructionInput-${medication.id}`}
                placeholder="Digite a instrução de uso personalizada..."
                rows={3}
                value={customInstructionInput}
                onChange={(e) => setCustomInstructionInput(e.target.value)}
                className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`pharmaceuticalForm-${medication.id}`}>Forma Farmacêutica *</Label>
                  <Select onValueChange={setPharmaceuticalForm} value={pharmaceuticalForm}>
                    <SelectTrigger id={`pharmaceuticalForm-${medication.id}`} className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200">
                      <SelectValue placeholder="Selecionar forma" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockPharmaceuticalForms.map((form) => (
                        <SelectItem key={form} value={form}>
                          {form}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {pharmaceuticalForm === "Outro" && (
                    <Input
                      placeholder="Ou digite forma personalizada"
                      value={customPharmaceuticalForm}
                      onChange={(e) => setCustomPharmaceuticalForm(e.target.value)}
                      className="mt-2 bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`dosePerAdministration-${medication.id}`}>Dose por Administração *</Label>
                  <Input
                    id={`dosePerAdministration-${medication.id}`}
                    placeholder="Ex: 1, 0.5, 2"
                    value={dosePerAdministration}
                    onChange={(e) => setDosePerAdministration(e.target.value)}
                    className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor={`frequency-${medication.id}`}>Frequência *</Label>
                  <Select onValueChange={setFrequency} value={frequency}>
                    <SelectTrigger id={`frequency-${medication.id}`} className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200">
                      <SelectValue placeholder="A cada..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mockFrequencies.map((freq) => (
                        <SelectItem key={freq} value={freq}>
                          {freq}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`period-${medication.id}`}>Período *</Label>
                  <Select onValueChange={setPeriod} value={period}>
                    <SelectTrigger id={`period-${medication.id}`} className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200">
                      <SelectValue placeholder="Por..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mockPeriods.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`totalQuantity-${medication.id}`}>Quantidade Total</Label>
                  <Input id={`totalQuantity-${medication.id}`} placeholder="Auto calculado" value={totalQuantityDisplay} disabled className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {frequency === "Outro" && (
                  <Input
                    placeholder="Ou digite frequência personalizada"
                    value={customFrequency}
                    onChange={(e) => setCustomFrequency(e.target.value)}
                    className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                  />
                )}
                {period === "Outro" && (
                  <Input
                    placeholder="Ou digite período personalizado"
                    value={customPeriod}
                    onChange={(e) => setCustomPeriod(e.target.value)}
                    className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                  />
                )}
              </div>

              {currentAutoGeneratedInstructionsForDisplay && (
                <div className="bg-muted/50 border border-border text-foreground p-3 rounded-md text-sm mt-4">
                  <p className="font-semibold mb-1">Instrução Gerada:</p>
                  <p>{currentAutoGeneratedInstructionsForDisplay}</p>
                </div>
              )}
            </>
          )}
          
          <div className="flex items-center space-x-2 mt-4">
            <Switch
              id={`custom-instructions-${medication.id}`}
              checked={useCustomInstructions}
              onCheckedChange={setUseCustomInstructions}
            />
            <Label htmlFor={`custom-instructions-${medication.id}`}>Usar instrução personalizada</Label>
          </div>

          <div className="space-y-2 mt-6">
            <h4 className="text-lg font-semibold">Observações Gerais do Medicamento</h4>
            <Textarea
              id={`generalObservations-${medication.id}`}
              placeholder="Instruções especiais, restrições alimentares, ou outras observações..."
              rows={3}
              value={generalObservations}
              onChange={(e) => setGeneralObservations(e.target.value)}
              className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
            />
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
              <FaPlus className="h-4 w-4 mr-2" /> Salvar Medicamento
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default PrescriptionMedicationForm;