import React from "react";
import { Tag } from "lucide-react";
import RegistryManager from "@/components/RegistryManager";

const BrandsPage: React.FC = () => {
  return (
    <RegistryManager
      icon={Tag}
      layoutVariant="B"
      module="stock"
      breadcrumb={<>Painel &gt; Estoque &gt; Marcas</>}
      storageKey="brands"
      title="Marcas"
      columns={[
        { key: "notes", label: "Observações", type: "textarea" },
      ]}
    />
  );
};

export default BrandsPage;