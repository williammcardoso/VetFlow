import React from "react";
import SmartComboInput from "@/components/SmartComboInput";

export interface ClientComboboxOption {
  id: string;
  name: string;
}

interface ClientComboboxProps {
  clients: ClientComboboxOption[];
  value?: string;
  onChange: (clientId: string | undefined) => void;
  placeholder?: string;
  /** Rótulo da opção que limpa a seleção. Omitido = sem opção de limpar. */
  allLabel?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

// Valor sintético só pra representar a opção "allLabel" (limpar seleção) —
// nunca colide com um id real de cliente (uuid).
const CLEAR_VALUE = "__clear__";

/**
 * Seleção de cliente com busca digitável.
 *
 * Wrapper fino em volta de SmartComboInput — mantém a mesma API
 * (clients/value/onChange/allLabel) que as telas já usam, mas trocou o
 * padrão visual de "botão que abre popover com busca cmdk (fuzzy match,
 * trazia cliente sem nada a ver com o que foi digitado)" pro campo de
 * texto direto com filtro substring simples.
 */
const ClientCombobox: React.FC<ClientComboboxProps> = ({
  clients,
  value,
  onChange,
  placeholder = "Selecione o cliente...",
  allLabel,
  disabled,
  className,
  id,
}) => {
  const options = React.useMemo(() => {
    const base = clients.map((c) => ({ value: c.id, label: c.name }));
    return allLabel ? [{ value: CLEAR_VALUE, label: allLabel }, ...base] : base;
  }, [clients, allLabel]);

  return (
    <SmartComboInput
      id={id}
      options={options}
      value={value}
      onSelect={(val) => onChange(val === CLEAR_VALUE ? undefined : val)}
      placeholder={placeholder}
      emptyLabel="Nenhum cliente encontrado."
      className={className}
      disabled={disabled}
    />
  );
};

export default ClientCombobox;
