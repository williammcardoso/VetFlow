import React from "react";
import { FileText } from "lucide-react";
import RegistryManager from "@/components/RegistryManager";

const RecipeModelPage: React.FC = () => {
  return (
    <RegistryManager
      icon={FileText}
      layoutVariant="C"
      storageKey="recipeModels"
      breadcrumb={<>Painel &gt; Cadastros &gt; Modelos de Receita</>}
      title="Modelos de Receita"
      columns={[
        { key: "template", label: "Template", type: "textarea", placeholder: "Ex.: fórmula, posologia..." },
      ]}
    />
  );
};

export default RecipeModelPage;