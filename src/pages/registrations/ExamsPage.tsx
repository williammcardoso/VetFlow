import React from "react";
import RegistryManager from "@/components/RegistryManager";

const ExamsPage: React.FC = () => {
  return (
    <RegistryManager
      storageKey="exams"
      title="Exames"
      columns={[
        { key: "sampleType", label: "Amostra", type: "text", placeholder: "Ex.: sangue, urina, fezes" },
        { key: "notes", label: "Observações", type: "textarea" },
      ]}
    />
  );
};

export default ExamsPage;