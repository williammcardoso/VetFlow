import React from "react";
import RegistryManager from "@/components/RegistryManager";

const RecipeModelPage: React.FC = () => {
  return (
    <RegistryManager
      storageKey="recipeModels"
      title="Modelos de Receita"
      columns={[
        { key: "template", label: "Template", type: "textarea", placeholder: "Ex.: fórmula, posologia..." },
      ]}
    />
  );
};

export default RecipeModelPage;