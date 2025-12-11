import React from "react";
import RegistryManager from "@/components/RegistryManager";

const ExamAttributesPage: React.FC = () => {
  return (
    <RegistryManager
      storageKey="examAttributes"
      title="Atributos de Exames"
      columns={[
        { key: "unit", label: "Unidade", type: "text", placeholder: "Ex.: mg/dL, U/L" },
        { key: "notes", label: "Observações", type: "textarea" },
      ]}
    />
  );
};

export default ExamAttributesPage;