"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FaPlus, FaTrashAlt, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { MedicationData } from "@/types/medication";
import {
  buildPosology,
  formsForUse,
  sitesForUse,
  FREQUENCIES,
  PERIODS,
  PHARMACY_TYPES,
  USE_TYPES,
} from "@/lib/posology";

export type { MedicationData };

interface PrescriptionMedicationFormProps {
  medication: MedicationData;
  index: number;
  onSave: (updatedMedication: MedicationData) => void;
  onDelete: (id: string) => void;
  onToggleCollapse: (id: string) => void;
}

// Receita antiga gravava o texto livre direto no campo (ex.: frequency =
// "a cada 48 horas") — ao abrir pra editar, vira "Outro" + o texto, em vez
// de o select aparecer vazio e o texto sumir.
function splitOption(value: string | undefined, custom: string | undefined, options: string[]) {
  const v = (value || "").trim();
  if (!v) return { value: "", custom: custom || "" };
  if (options.includes(v)) return { value: v, custom: v === "Outro" ? custom || "" : "" };
  return { value: "Outro", custom: custom || v };
}

const DOSE_PLACEHOLDER: Record<string, string> = {
  "Líquido (mL)": "Ex: 5 (mL por vez)",
  Gotas: "Ex: 4 (gotas por vez)",
  Spray: "Ex: 1 (borrifada por vez)",
  Pomada: "Opcional — padrão: uma fina camada",
  Shampoo: "Opcional",
  Pipeta: "Ex: 1",
  "Ração (g)": "Ex: 70 (g por dia)",
  Sachê: "Ex: 1",
};

const PrescriptionMedicationForm: React.FC<PrescriptionMedicationFormProps> = ({
  medication,
  index,
  onSave,
  onDelete,
  onToggleCollapse,
}) => {
  const initialForm = medication.pharmaceuticalForm === "Líquido (ml)" ? "Líquido (mL)" : medication.pharmaceuticalForm;
  const formInit = splitOption(initialForm, medication.customPharmaceuticalForm, [...formsForUse(""), "Outro"]);
  const freqInit = splitOption(medication.frequency, medication.customFrequency, FREQUENCIES);
  const periodInit = splitOption(medication.period, medication.customPeriod, PERIODS);
  const siteInit = splitOption(medication.applicationSite, medication.customApplicationSite, [
    ...sitesForUse(medication.useType),
    "Outro",
  ]);

  const [useType, setUseType] = useState<string>(medication.useType);
  const [pharmacyType, setPharmacyType] = useState<string>(medication.pharmacyType);
  const [medicationName, setMedicationName] = useState<string>(medication.medicationName);
  const [concentration, setConcentration] = useState<string>(medication.concentration);
  const [pharmaceuticalForm, setPharmaceuticalForm] = useState<string>(formInit.value);
  const [customPharmaceuticalForm, setCustomPharmaceuticalForm] = useState<string>(formInit.custom);
  const [dosePerAdministration, setDosePerAdministration] = useState<string>(medication.dosePerAdministration);
  const [frequency, setFrequency] = useState<string>(freqInit.value);
  const [customFrequency, setCustomFrequency] = useState<string>(freqInit.custom);
  const [period, setPeriod] = useState<string>(periodInit.value);
  const [customPeriod, setCustomPeriod] = useState<string>(periodInit.custom);
  const [applicationSite, setApplicationSite] = useState<string>(siteInit.value);
  const [customApplicationSite, setCustomApplicationSite] = useState<string>(siteInit.custom);
  const [generalObservations, setGeneralObservations] = useState<string>(medication.generalObservations);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(medication.isCollapsed ?? false);

  // Texto de uso e quantidade: sugeridos pelo motor (lib/posology) enquanto o
  // veterinário não mexer; depois de editados, ficam como ele escreveu até ele
  // pedir "voltar ao automático". Substitui o antigo liga/desliga de
  // "instrução personalizada", que obrigava a reescrever tudo do zero.
  //
  // Receita antiga cujos campos não geram frase/quantidade no motor novo
  // (ex.: dose em branco, período livre) começa como "editada": mantém o
  // texto que já estava gravado em vez de apagá-lo ao abrir pra editar.
  const [initialPosology] = useState(() =>
    buildPosology({
      useType: medication.useType,
      form: formInit.value,
      customForm: formInit.custom,
      dose: medication.dosePerAdministration,
      frequency: freqInit.value,
      customFrequency: freqInit.custom,
      period: periodInit.value,
      customPeriod: periodInit.custom,
      site: siteInit.value,
      customSite: siteInit.custom,
    })
  );
  const [instructionsEdited, setInstructionsEdited] = useState<boolean>(
    Boolean(medication.useCustomInstructions) ||
      (!initialPosology.text && Boolean(medication.generatedInstructions?.trim()))
  );
  const [instructionText, setInstructionText] = useState<string>(medication.generatedInstructions || "");
  const [quantityEdited, setQuantityEdited] = useState<boolean>(
    Boolean(medication.quantityEdited) ||
      (!initialPosology.quantityDisplay && Boolean(medication.totalQuantityDisplay?.trim()))
  );
  const [quantityText, setQuantityText] = useState<string>(medication.totalQuantityDisplay || "");

  useEffect(() => {
    setIsCollapsed(medication.isCollapsed ?? false);
  }, [medication.id, medication.isCollapsed]);

  const useTypeRef = useRef<HTMLButtonElement>(null);

  // Foco no campo Tipo de Uso quando o formulário é expandido (novo ou editado)
  useEffect(() => {
    if (!isCollapsed && useTypeRef.current) {
      useTypeRef.current.focus();
    }
  }, [isCollapsed]);

  const posology = useMemo(
    () =>
      buildPosology({
        useType,
        form: pharmaceuticalForm,
        customForm: customPharmaceuticalForm,
        dose: dosePerAdministration,
        frequency,
        customFrequency,
        period,
        customPeriod,
        site: applicationSite,
        customSite: customApplicationSite,
      }),
    [
      useType,
      pharmaceuticalForm,
      customPharmaceuticalForm,
      dosePerAdministration,
      frequency,
      customFrequency,
      period,
      customPeriod,
      applicationSite,
      customApplicationSite,
    ]
  );

  useEffect(() => {
    if (!instructionsEdited) setInstructionText(posology.text);
  }, [posology.text, instructionsEdited]);

  useEffect(() => {
    if (!quantityEdited) setQuantityText(posology.quantityDisplay);
  }, [posology.quantityDisplay, quantityEdited]);

  // A forma atual continua na lista mesmo se o tipo de uso mudar (senão o
  // select ficaria em branco com um valor escondido).
  const formOptions = useMemo(() => {
    const list = formsForUse(useType);
    return pharmaceuticalForm && !list.includes(pharmaceuticalForm)
      ? [...list.filter((f) => f !== "Outro"), pharmaceuticalForm, "Outro"]
      : list;
  }, [useType, pharmaceuticalForm]);

  const siteOptions = useMemo(() => {
    const list = sitesForUse(useType);
    return applicationSite && applicationSite !== "Outro" && !list.includes(applicationSite)
      ? [...list, applicationSite]
      : list;
  }, [useType, applicationSite]);
  const showSite = siteOptions.length > 0 || applicationSite === "Outro";

  const handleSave = () => {
    if (!useType || !pharmacyType || !medicationName.trim() || !instructionText.trim()) {
      toast.error("Preencha tipo de uso, farmácia, nome do medicamento e a instrução de uso.");
      return;
    }

    const updatedMedication: MedicationData = {
      ...medication,
      useType,
      pharmacyType,
      medicationName: medicationName.trim(),
      concentration: concentration.trim(),
      pharmaceuticalForm,
      customPharmaceuticalForm: pharmaceuticalForm === "Outro" ? customPharmaceuticalForm.trim() : undefined,
      dosePerAdministration: dosePerAdministration.trim(),
      frequency,
      customFrequency: frequency === "Outro" ? customFrequency.trim() : undefined,
      period,
      customPeriod: period === "Outro" ? customPeriod.trim() : undefined,
      applicationSite: showSite ? applicationSite : "",
      customApplicationSite: showSite && applicationSite === "Outro" ? customApplicationSite.trim() : undefined,
      useCustomInstructions: instructionsEdited,
      generatedInstructions: instructionText.trim(),
      generalObservations: generalObservations.trim(),
      totalQuantity: !quantityEdited && posology.quantityNumber != null ? String(posology.quantityNumber) : "",
      totalQuantityDisplay: quantityText.trim(),
      quantityEdited,
      isCollapsed: true,
    };
    onSave(updatedMedication);
    setIsCollapsed(true);
  };

  const displayMedicationName = medicationName.trim() || "Medicamento sem nome";
  const selectClass =
    "bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200";

  return (
    <div className="rounded-xl border border-border bg-white p-3 sm:p-4 space-y-4 shadow-lg">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3 mb-4">
        <h3 className="min-w-0 break-words text-base sm:text-lg font-semibold flex flex-wrap items-center gap-2">
          <span className="shrink-0 bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-sm">
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
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" onClick={() => onDelete(medication.id)} className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200" title="Excluir">
            <FaTrashAlt className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onToggleCollapse(medication.id)} className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200" title={isCollapsed ? "Expandir para editar" : "Recolher"}>
            {isCollapsed ? <FaChevronDown className="h-4 w-4 text-muted-foreground" /> : <FaChevronUp className="h-4 w-4 text-muted-foreground" />}
          </Button>
        </div>
      </div>

      {/* Recolhido: mostra a instrução e a quantidade como vão sair na receita. */}
      {isCollapsed && (instructionText || quantityText) && (
        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          {instructionText && <p>{instructionText}</p>}
          {quantityText && <p className="font-medium text-foreground/80">Quantidade: {quantityText}</p>}
        </div>
      )}

      {!isCollapsed && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`useType-${medication.id}`}>Tipo de Uso *</Label>
              <Select onValueChange={setUseType} value={useType}>
                <SelectTrigger ref={useTypeRef} id={`useType-${medication.id}`} className={selectClass}>
                  <SelectValue placeholder="Selecionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {USE_TYPES.map((type) => (
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
                <SelectTrigger id={`pharmacyType-${medication.id}`} className={selectClass}>
                  <SelectValue placeholder="Selecionar farmácia" />
                </SelectTrigger>
                <SelectContent>
                  {PHARMACY_TYPES.map((type) => (
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
                className={selectClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`concentration-${medication.id}`}>Concentração</Label>
              <Input
                id={`concentration-${medication.id}`}
                placeholder="Ex: 75mg, 100mg/ml"
                value={concentration}
                onChange={(e) => setConcentration(e.target.value)}
                className={selectClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`pharmaceuticalForm-${medication.id}`}>Forma Farmacêutica</Label>
              <Select onValueChange={setPharmaceuticalForm} value={pharmaceuticalForm}>
                <SelectTrigger id={`pharmaceuticalForm-${medication.id}`} className={selectClass}>
                  <SelectValue placeholder="Selecionar forma" />
                </SelectTrigger>
                <SelectContent>
                  {formOptions.map((form) => (
                    <SelectItem key={form} value={form}>
                      {form}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pharmaceuticalForm === "Outro" && (
                <Input
                  placeholder="Digite a forma (ex.: pasta oral)"
                  value={customPharmaceuticalForm}
                  onChange={(e) => setCustomPharmaceuticalForm(e.target.value)}
                  className={cn("mt-2", selectClass)}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`dosePerAdministration-${medication.id}`}>
                {pharmaceuticalForm === "Ração (g)" ? "Quantidade (g)" : "Dose por Administração"}
              </Label>
              <Input
                id={`dosePerAdministration-${medication.id}`}
                placeholder={DOSE_PLACEHOLDER[pharmaceuticalForm] ?? "Ex: 1, 1/2, 1 + 1/2"}
                value={dosePerAdministration}
                onChange={(e) => setDosePerAdministration(e.target.value)}
                className={selectClass}
              />
            </div>
          </div>

          <div className={cn("grid grid-cols-1 gap-4", showSite ? "md:grid-cols-3" : "md:grid-cols-2")}>
            <div className="space-y-2">
              <Label htmlFor={`frequency-${medication.id}`}>Frequência</Label>
              <Select onValueChange={setFrequency} value={frequency}>
                <SelectTrigger id={`frequency-${medication.id}`} className={selectClass}>
                  <SelectValue placeholder="A cada..." />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((freq) => (
                    <SelectItem key={freq} value={freq}>
                      {freq}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {frequency === "Outro" && (
                <Input
                  placeholder="Ex: a cada 48 horas, 2x ao dia"
                  value={customFrequency}
                  onChange={(e) => setCustomFrequency(e.target.value)}
                  className={selectClass}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`period-${medication.id}`}>Período</Label>
              <Select onValueChange={setPeriod} value={period}>
                <SelectTrigger id={`period-${medication.id}`} className={selectClass}>
                  <SelectValue placeholder="Por..." />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {period === "Outro" && (
                <Input
                  placeholder="Ex: 2 semanas, até voltar o apetite"
                  value={customPeriod}
                  onChange={(e) => setCustomPeriod(e.target.value)}
                  className={selectClass}
                />
              )}
            </div>
            {showSite && (
              <div className="space-y-2">
                <Label htmlFor={`applicationSite-${medication.id}`}>Local de aplicação</Label>
                <Select
                  onValueChange={(v) => setApplicationSite(v === "__none__" ? "" : v)}
                  value={applicationSite || "__none__"}
                >
                  <SelectTrigger id={`applicationSite-${medication.id}`} className={selectClass}>
                    <SelectValue placeholder="Onde aplicar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Não informar</SelectItem>
                    {siteOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
                {applicationSite === "Outro" && (
                  <Input
                    placeholder="Ex: após a limpeza do ouvido"
                    value={customApplicationSite}
                    onChange={(e) => setCustomApplicationSite(e.target.value)}
                    className={selectClass}
                  />
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px]">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor={`instruction-${medication.id}`}>Instrução de uso *</Label>
                {instructionsEdited ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-primary"
                    onClick={() => {
                      setInstructionsEdited(false);
                      setInstructionText(posology.text);
                    }}
                    title="Descartar a edição e usar o texto gerado pelos campos acima"
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> Voltar ao texto automático
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Gerada pelos campos acima — pode editar</span>
                )}
              </div>
              <Textarea
                id={`instruction-${medication.id}`}
                placeholder="Preencha forma, dose, frequência e período — ou escreva a instrução aqui."
                rows={3}
                value={instructionText}
                onChange={(e) => {
                  setInstructionText(e.target.value);
                  setInstructionsEdited(true);
                }}
                className={selectClass}
              />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor={`totalQuantity-${medication.id}`}>Quantidade</Label>
                {quantityEdited && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-primary"
                    onClick={() => {
                      setQuantityEdited(false);
                      setQuantityText(posology.quantityDisplay);
                    }}
                    title="Voltar à quantidade calculada"
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> Recalcular
                  </Button>
                )}
              </div>
              <Input
                id={`totalQuantity-${medication.id}`}
                placeholder="Ex: 1 caixa"
                value={quantityText}
                onChange={(e) => {
                  setQuantityText(e.target.value);
                  setQuantityEdited(true);
                }}
                className={selectClass}
              />
              {!quantityEdited && (
                <p className="text-xs text-muted-foreground">Calculada automaticamente — pode editar.</p>
              )}
            </div>
          </div>

          <div className="space-y-2 mt-6">
            <h4 className="text-lg font-semibold">Observações Gerais do Medicamento</h4>
            <Textarea
              id={`generalObservations-${medication.id}`}
              placeholder="Instruções especiais, restrições alimentares, ou outras observações..."
              rows={3}
              value={generalObservations}
              onChange={(e) => setGeneralObservations(e.target.value)}
              className={selectClass}
            />
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
              <FaPlus className="h-4 w-4 mr-2" /> Salvar Medicamento
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default PrescriptionMedicationForm;
