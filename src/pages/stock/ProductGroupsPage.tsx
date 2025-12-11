import React from "react";
import RegistryManager from "@/components/RegistryManager";

const ProductGroupsPage: React.FC = () => {
  return (
    <RegistryManager
      storageKey="productGroups"
      title="Grupos de Produtos"
      columns={[
        { key: "notes", label: "Observações", type: "textarea" },
      ]}
    />
  );
};

export default ProductGroupsPage;