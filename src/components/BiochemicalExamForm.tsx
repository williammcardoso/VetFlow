"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FaTrashAlt } from "react-icons/fa";
import { BiochemicalEntry } from "@/types/exam";

interface BiochemicalExamFormProps {
  biochemical: BiochemicalEntry;
  index: number;
  onUpdate: (id: string, updatedBiochemical: Partial<BiochemicalEntry>) => void;
  onDelete: (id: string) => void;
  shouldFocus?: boolean;
}

const mockEnzymes = [
  "ALT (Alanina Aminotransferase)",
  "AST (Aspartato Aminotransferase)",
  "FA (Fosfatase Alcalina)",
  "GGT (Gama-Glutamil Transferase)",
  "Creatinina",
  "Ureia",
  "Glicose",
  "Albumina",
  "Proteína Total",
  "Fósforo",
  "Cálcio",
  "Amilase",
  "Lipase",
  "Bilirrubina Total",
  "Colesterol",
  "Triglicerídeos",
  "Outro",
];

const BiochemicalExamForm: React.FC<BiochemicalExamFormProps> = ({
  biochemical,
  index,
  onUpdate,
  onDelete,
  shouldFocus,
}) => {
  const [enzymeName, setEnzymeName] = useState(biochemical.enzymeName);
  const [customEnzymeName, setCustomEnzymeName] = useState(biochemical.customEnzymeName || "");
  const [material, setMaterial] = useState(biochemical.material);
  const [metodologia, setMetodologia] = useState(biochemical.metodologia);
  const [equipamento, setEquipamento] = useState(biochemical.equipamento);
  const [result, setResult] = useState(biochemical.result);

  const enzymeNameRef = useRef<HTMLButtonElement>(null); // Ref para o Select
  const customEnzymeInputRef = useRef<HTMLInputElement>(null); // Ref para o input de enzima personalizada

  useEffect(() => {
    // Sincroniza o estado interno com as props iniciais
    setEnzymeName(biochemical.enzymeName);
    setCustomEnzymeName(biochemical.customEnzymeName || "");
    setMaterial(biochemical.material);
    setMetodologia(biochemical.metodologia);
    setEquipamento(biochemical.equipamento);
    setResult(biochemical.result);
  }, [biochemical]);

  useEffect(() => {
    // Atualiza o componente pai sempre que os estados internos mudam
    onUpdate(biochemical.id, {
      enzymeName: enzymeName === "Outro" ? customEnzymeName.trim() : enzymeName,
      customEnzymeName: enzymeName === "Outro" ? customEnzymeName.trim() : undefined,
      material,
      metodologia,
      equipamento,
      result,
    });
  }, [enzymeName, customEnzymeName, material, metodologia, equipamento, result]); // eslint-disable-line react-hooks/exhaustive-deps

  // Foco no campo de seleção da enzima quando o formulário é adicionado
  useEffect(() => {
    if (shouldFocus && enzymeNameRef.current) {
      enzymeNameRef.current.focus();
    }
  }, [shouldFocus]);

  // Foco no campo de enzima personalizada quando "Outro" é selecionado
  useEffect(() => {
    if (enzymeName === "Outro" && customEnzymeInputRef.current) {
      setTimeout(() => customEnzymeInputRef.current?.focus(), 0);
    }
  }, [enzymeName]);

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
      <div className="flex items-center justify-between">
        <h4 className="text-md font-semibold text-foreground">Enzima #{index + 1}</h4>
        <Button variant="ghost" size="icon" onClick={() => onDelete(biochemical.id)} className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200">
          <FaTrashAlt className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`enzyme-name-${biochemical.id}`}>Enzima*</Label>
          <Select onValueChange={(value) => {
            setEnzymeName(value);
            if (value !== "Outro") setCustomEnzymeName("");
          }} value={enzymeName}>
            <SelectTrigger ref={enzymeNameRef} id={`enzyme-name-${biochemical.id}`} className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200">
              <SelectValue placeholder="Selecione a enzima" />
            </SelectTrigger>
            <SelectContent>
              {mockEnzymes.map((enzyme) => (
                <SelectItem key={enzyme} value={enzyme}>
                  {enzyme}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {enzymeName === "Outro" && (
            <Input
              ref={customEnzymeInputRef}
              placeholder="Digite o nome da enzima personalizada"
              value={customEnzymeName}
              onChange={(e) => setCustomEnzymeName(e.target.value)}
              className="mt-2 bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
            />
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`result-${biochemical.id}`}>Resultado*</Label>
          <Input
            id={`result-${biochemical.id}`}
            placeholder="Ex: 120 U/L"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`material-${biochemical.id}`}>Material</Label>
          <Input
            id={`material-${biochemical.id}`}
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
            disabled // Desabilitado para ser auto-preenchido
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`metodologia-${biochemical.id}`}>Metodologia</Label>
          <Input
            id={`metodologia-${biochemical.id}`}
            value={metodologia}
            onChange={(e) => setMetodologia(e.target.value)}
            className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
            disabled // Desabilitado para ser auto-preenchido
          />
        </div>
        <div className="space-y-2 col-span-full">
          <Label htmlFor={`equipamento-${biochemical.id}`}>Equipamento</Label>
          <Input
            id={`equipamento-${biochemical.id}`}
            value={equipamento}
            onChange={(e) => setEquipamento(e.target.value)}
            className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
            disabled // Desabilitado para ser auto-preenchido
          />
        </div>
      </div>
    </div>
  );
};

export default BiochemicalExamForm;