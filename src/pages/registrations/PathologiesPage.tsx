import React from "react";
import RegistryManager from "@/components/RegistryManager";

const PathologiesPage: React.FC = () => {
  return (
    <RegistryManager
      storageKey="pathologies"
      title="Patologias"
      columns={[
        { key: "code", label: "Código", type: "text", placeholder: "Ex.: ICD-10" },
        { key: "description", label: "Descrição", type: "textarea", placeholder: "Breve descrição" },
      ]}
    />
  );
};

export default PathologiesPage;