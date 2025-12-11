import React from "react";
import RegistryManager from "@/components/RegistryManager";

const VaccinesPage: React.FC = () => {
  return (
    <RegistryManager
      storageKey="vaccines"
      title="Vacinas"
      columns={[
        { key: "unit", label: "Unidade", type: "text", placeholder: "Ex.: dose, mL" },
        { key: "schedule", label: "Esquema", type: "textarea", placeholder: "Ex.: 3 doses, reforço anual..." },
      ]}
    />
  );
};

export default VaccinesPage;