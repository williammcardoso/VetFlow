"use client";

import React from "react";
import SmartComboInput from "@/components/SmartComboInput";

export interface AutocompleteOption {
  value: string;
  label: string;
}

interface AutocompleteSelectProps {
  value?: string;
  onChange: (val: string) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Wrapper fino em volta de SmartComboInput — mantém a mesma API
 * (value/onChange/options) que as telas já usam, mas trocou o padrão visual
 * de "botão que abre popover com busca cmdk (fuzzy match, trazia item sem
 * nada a ver)" pro campo de texto direto com filtro substring simples.
 */
const AutocompleteSelect: React.FC<AutocompleteSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  emptyLabel = "Nenhuma opção encontrada.",
  className,
  disabled = false,
}) => {
  return (
    <SmartComboInput
      options={options}
      value={value}
      onSelect={(val) => onChange(val)}
      placeholder={placeholder}
      emptyLabel={emptyLabel}
      className={className}
      disabled={disabled}
    />
  );
};

export default AutocompleteSelect;
