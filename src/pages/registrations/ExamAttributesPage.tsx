import React from "react";
import { SlidersHorizontal } from "lucide-react";
import RegistryManager from "@/components/RegistryManager";

const ExamAttributesPage: React.FC = () => {
  return (
    <RegistryManager
      icon={SlidersHorizontal}
      layoutVariant="C"
      storageKey="examAttributes"
      breadcrumb={<>Painel &gt; Cadastros &gt; Atributos de Exames</>}
      title="Atributos de Exames"
      columns={[
        { key: "unit", label: "Unidade", type: "text", placeholder: "Ex.: mg/dL, U/L" },
        { key: "notes", label: "Observações", type: "textarea" },
      ]}
    />
  );
};

export default ExamAttributesPage;