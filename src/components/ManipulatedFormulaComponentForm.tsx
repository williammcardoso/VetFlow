"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FaTrashAlt } from "react-icons/fa";
import { ManipulatedFormulaComponent } from "@/types/medication";
import { COMPONENT_UNITS, withSavedOption } from "@/lib/manipulatedUnits";
import { calculateCompoundDose, formatDecimalBR, parseDecimalBR } from "@/lib/posology";
import { Calculator } from "lucide-react";
import { toast } from "sonner";

interface ManipulatedFormulaComponentFormProps {
  component: ManipulatedFormulaComponent;
  index: number;
  onUpdate: (id: string, updatedComponent: Partial<ManipulatedFormulaComponent>) => void;
  onDelete: (id: string) => void;
  shouldFocus?: boolean; // Nova prop para controlar o foco
  /** Peso do paciente (kg) — base do "Calcular pelo peso". */
  animalWeight?: number;
  /** Quanto vai em cada dose da posologia (volume em mL, ou nº de cápsulas/biscoitos). */
  doseBasis?: { doseVolumeMl?: number; unitsPerDose?: number; unitName?: string };
}

const ManipulatedFormulaComponentForm: React.FC<ManipulatedFormulaComponentFormProps> = ({
  component,
  index,
  onUpdate,
  onDelete,
  shouldFocus, // Desestruturar a nova prop
  animalWeight,
  doseBasis,
}) => {
  const [name, setName] = useState(component.name);
  const [dosageQuantity, setDosageQuantity] = useState(component.dosageQuantity);
  const [dosageUnit, setDosageUnit] = useState(component.dosageUnit);
  const [customDosageUnit, setCustomDosageUnit] = useState(component.customDosageUnit || "");

  const nameInputRef = useRef<HTMLInputElement>(null); // Ref para o campo de nome
  const customDosageUnitInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onUpdate(component.id, {
      name,
      dosageQuantity,
      dosageUnit,
      customDosageUnit: dosageUnit === "Outro" ? customDosageUnit : undefined,
    });
  }, [name, dosageQuantity, dosageUnit, customDosageUnit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Efeito para focar o campo de nome quando shouldFocus for true
  useEffect(() => {
    if (shouldFocus && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [shouldFocus]);

  // Foca o campo de unidade personalizada assim que "Outro" é selecionado
  useEffect(() => {
    if (dosageUnit === "Outro" && customDosageUnitInputRef.current) {
      setTimeout(() => customDosageUnitInputRef.current?.focus(), 0);
    } else if (dosageUnit !== "Outro") {
      setCustomDosageUnit("");
    }
  }, [dosageUnit]);

  // ---- Dose pelo peso: mg/kg × peso → quanto do ativo vai na fórmula ----
  const [showCalc, setShowCalc] = useState(false);
  const [calcDose, setCalcDose] = useState("");
  const [calcUnit, setCalcUnit] = useState<"mg" | "mcg">("mg");
  const calc = showCalc
    ? calculateCompoundDose({ dosePerKg: parseDecimalBR(calcDose), unit: calcUnit, weightKg: animalWeight || 0, ...doseBasis })
    : null;
  const applyCalc = () => {
    if (!calc || "error" in calc) return;
    const unitOption: Record<string, string> = {
      mg: "Miligrama (mg)",
      mcg: "Micrograma (mcg)",
      "mg/mL": "Miligrama por mililitro (mg/mL)",
    };
    setDosageQuantity(formatDecimalBR(calc.amount));
    if (unitOption[calc.unitLabel]) {
      setDosageUnit(unitOption[calc.unitLabel]);
    } else {
      setDosageUnit("Outro");
      setTimeout(() => setCustomDosageUnit(calc.unitLabel), 0);
    }
    setShowCalc(false);
    toast.success(`${name || "Componente"}: ${formatDecimalBR(calc.amount)} ${calc.unitLabel}`);
  };

  // Rótulos só na primeira linha (no computador): as outras ficam alinhadas
  // embaixo, sem repetir "Nome / Qtd. / Unidade" a cada componente.
  const labelClass = index > 0 ? "text-xs sm:sr-only" : "text-xs";

  return (
    <div className="border-b border-border/60 pb-2 last:border-b-0 last:pb-0">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1 space-y-1">
        <Label htmlFor={`component-name-${component.id}`} className={labelClass}>
          Componente {index + 1}*
        </Label>
        <Input
          ref={nameInputRef} // Aplicar o ref aqui
          id={`component-name-${component.id}`}
          placeholder="Nome do componente"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 bg-input"
        />
      </div>
      <div className="flex items-end gap-2">
        <div className="w-24 shrink-0 space-y-1">
          <Label htmlFor={`dosage-quantity-${component.id}`} className={labelClass}>
            Qtd.*
          </Label>
          <Input
            id={`dosage-quantity-${component.id}`}
            placeholder="Ex: 50"
            value={dosageQuantity}
            onChange={(e) => setDosageQuantity(e.target.value)}
            className="h-9 bg-input"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1 sm:w-44 sm:flex-none">
          <Label htmlFor={`dosage-unit-${component.id}`} className={labelClass}>
            Unidade*
          </Label>
          <Select onValueChange={setDosageUnit} value={dosageUnit}>
            <SelectTrigger id={`dosage-unit-${component.id}`} className="h-9 bg-input">
              <SelectValue placeholder="mg, %, UI" />
            </SelectTrigger>
            <SelectContent>
              {withSavedOption(COMPONENT_UNITS, dosageUnit).map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowCalc((v) => !v)}
          aria-expanded={showCalc}
          title="Calcular pelo peso"
          aria-label="Calcular pelo peso"
          className={showCalc ? "h-9 w-9 shrink-0 bg-primary/10 text-primary" : "h-9 w-9 shrink-0 text-primary hover:bg-primary/10"}
        >
          <Calculator className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onDelete(component.id)}
          title="Remover componente"
          aria-label="Remover componente"
          className="h-9 w-9 shrink-0 hover:bg-muted"
        >
          <FaTrashAlt className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
    {dosageUnit === "Outro" && (
      <Input
        ref={customDosageUnitInputRef}
        placeholder="Digite a unidade (ex: mEq, gotas)"
        value={customDosageUnit}
        onChange={(e) => setCustomDosageUnit(e.target.value)}
        className="mt-2 h-9 bg-input sm:ml-auto sm:w-72"
      />
    )}
    {showCalc && (
      <div className="mt-2 space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor={`calc-dose-${component.id}`} className="text-xs">
              Dose ({calcUnit}/kg)
            </Label>
            <Input
              id={`calc-dose-${component.id}`}
              inputMode="decimal"
              placeholder="Ex: 10"
              value={calcDose}
              onChange={(e) => setCalcDose(e.target.value)}
              className="bg-input"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Unidade</Label>
            <Select value={calcUnit} onValueChange={(v) => setCalcUnit(v as "mg" | "mcg")}>
              <SelectTrigger className="bg-input" aria-label="Unidade da dose">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mg">mg/kg</SelectItem>
                <SelectItem value="mcg">mcg/kg</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1 sm:col-span-1">
            <span className="text-xs font-medium">Peso</span>
            <p className="flex h-10 items-center text-sm font-semibold text-foreground">
              {animalWeight ? `${formatDecimalBR(animalWeight)} kg` : "— (informe no topo)"}
            </p>
          </div>
        </div>
        {calc &&
          ("error" in calc ? (
            <p className="text-xs text-amber-700">{calc.error}</p>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 text-sm">
                <strong>{calc.description}</strong>
              </p>
              <Button type="button" size="sm" className="w-full shrink-0 sm:w-auto" onClick={applyCalc}>
                Usar {formatDecimalBR(calc.amount)} {calc.unitLabel}
              </Button>
            </div>
          ))}
      </div>
    )}
    </div>
  );
};

export default ManipulatedFormulaComponentForm;
