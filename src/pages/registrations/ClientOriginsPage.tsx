import React from "react";
import RegistryManager from "@/components/RegistryManager";

const ClientOriginsPage: React.FC = () => {
  return (
    <RegistryManager
      storageKey="clientOrigins"
      title="Origem dos Clientes"
      columns={[
        { key: "channel", label: "Canal", type: "text", placeholder: "Ex.: Indicação, Instagram" },
        { key: "notes", label: "Observações", type: "textarea" },
      ]}
    />
  );
};

export default ClientOriginsPage;