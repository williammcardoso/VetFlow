import React from "react";
import RegistryManager from "@/components/RegistryManager";

const BrandsPage: React.FC = () => {
  return (
    <RegistryManager
      storageKey="brands"
      title="Marcas"
      columns={[
        { key: "notes", label: "Observações", type: "textarea" },
      ]}
    />
  );
};

export default BrandsPage;