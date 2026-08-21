"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FaTrashAlt } from "react-icons/fa";
import { ManipulatedFormulaComponent } from "@/types/medication";

interface ManipulatedFormulaComponentFormProps {
  component: ManipulatedFormulaComponent;
  index: number;
  onUpdate: (id: string, updatedComponent: Partial<ManipulatedFormulaComponent>) => void;
  onDelete: (id: string) => void;
  shouldFocus?: boolean; // Nova prop para controlar o foco
}

const mockDosageUnits = ["Unidade", "Grama (g)", "Miligrama (mg)", "Mililitro (mL)", "Micrograma (mcg)"];

const ManipulatedFormulaComponentForm: React.FC<ManipulatedFormulaComponentFormProps> = ({
  component,
  index,
  onUpdate,
  onDelete,
  shouldFocus, // Desestruturar a nova prop
}) => {
  const [name, setName] = useState(component.name);
  const [dosageQuantity, setDosageQuantity] = useState(component.dosageQuantity);
  const [dosageUnit, setDosageUnit] = useState(component.dosageUnit);

  const nameInputRef = useRef<HTMLInputElement>(null); // Ref para o campo de nome

  useEffect(() => {
    onUpdate(component.id, { name, dosageQuantity, dosageUnit });
  }, [name, dosageQuantity, dosageUnit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Efeito para focar o campo de nome quando shouldFocus for true
  useEffect(() => {
    if (shouldFocus && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [shouldFocus]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-4 border-b border-border pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
      <div className="flex-1 space-y-2">
        <Label htmlFor={`component-name-${component.id}`}>Nome do Componente {index + 1}*</Label>
        <Input
          ref={nameInputRef} // Aplicar o ref aqui
          id={`component-name-${component.id}`}
          placeholder="Digite o Nome do Componente"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
        />
      </div>
      <div className="w-full sm:w-32 space-y-2">
        <Label htmlFor={`dosage-quantity-${component.id}`}>Dosagem / Quantidade*</Label>
        <Input
          id={`dosage-quantity-${component.id}`}
          placeholder="Ex: 555"
          value={dosageQuantity}
          onChange={(e) => setDosageQuantity(e.target.value)}
          className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
        />
      </div>
      <div className="w-full sm:w-32 space-y-2">
        <Label htmlFor={`dosage-unit-${component.id}`}>Unidade*</Label>
        <Select onValueChange={setDosageUnit} value={dosageUnit}>
          <SelectTrigger id={`dosage-unit-${component.id}`} className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200">
            <SelectValue placeholder="Ex: Unidade" />
          </SelectTrigger>
          <SelectContent>
            {mockDosageUnits.map((unit) => (
              <SelectItem key={unit} value={unit}>
                {unit}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button variant="ghost" size="icon" onClick={() => onDelete(component.id)} className="rounded-md hover:bg-muted hover:text-foreground transition-colors duration-200">
        <FaTrashAlt className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
};

export default ManipulatedFormulaComponentForm;