import React from "react";
import { Activity } from "lucide-react";
import RegistryManager from "@/components/RegistryManager";

const PathologiesPage: React.FC = () => {
  return (
    <RegistryManager
      icon={Activity}
      layoutVariant="C"
      storageKey="pathologies"
      breadcrumb={<>Painel &gt; Cadastros &gt; Patologias</>}
      title="Patologias"
      columns={[
        { key: "code", label: "Código", type: "text", placeholder: "Ex.: ICD-10" },
        { key: "description", label: "Descrição", type: "textarea", placeholder: "Breve descrição" },
      ]}
    />
  );
};

export default PathologiesPage;