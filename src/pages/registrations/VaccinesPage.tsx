import React from "react";
import { Syringe } from "lucide-react";
import RegistryManager from "@/components/RegistryManager";

const VaccinesPage: React.FC = () => {
  return (
    <RegistryManager
      icon={Syringe}
      layoutVariant="C"
      storageKey="vaccines"
      breadcrumb={<>Painel &gt; Cadastros &gt; Vacinas</>}
      title="Vacinas"
      columns={[
        { key: "unit", label: "Unidade", type: "text", placeholder: "Ex.: dose, mL" },
        { key: "schedule", label: "Esquema", type: "textarea", placeholder: "Ex.: 3 doses, reforço anual..." },
      ]}
    />
  );
};

export default VaccinesPage;