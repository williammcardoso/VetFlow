import React from "react";
import RegistryManager from "@/components/RegistryManager";

const DocumentModelPage: React.FC = () => {
  return (
    <RegistryManager
      storageKey="documentModels"
      title="Modelos de Documento"
      columns={[
        { key: "template", label: "Template", type: "textarea", placeholder: "Texto do documento..." },
      ]}
    />
  );
};

export default DocumentModelPage;