import React from "react";
import { Layers } from "lucide-react";
import RegistryManager from "@/components/RegistryManager";

const ProductGroupsPage: React.FC = () => {
  return (
    <RegistryManager
      icon={Layers}
      layoutVariant="B"
      module="stock"
      breadcrumb={<>Painel &gt; Estoque &gt; Grupos</>}
      storageKey="productGroups"
      title="Grupos de Produtos"
      columns={[
        { key: "notes", label: "Observações", type: "textarea" },
      ]}
    />
  );
};

export default ProductGroupsPage;