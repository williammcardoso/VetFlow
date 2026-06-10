import React from "react";
import { UserRound } from "lucide-react";
import RegistryManager from "@/components/RegistryManager";

const ClientOriginsPage: React.FC = () => {
  return (
    <RegistryManager
      icon={UserRound}
      layoutVariant="A"
      storageKey="clientOrigins"
      breadcrumb={<>Painel &gt; Cadastros &gt; Origem dos Clientes</>}
      title="Origem dos Clientes"
      columns={[
        { key: "channel", label: "Canal", type: "text", placeholder: "Ex.: Indicação, Instagram" },
        { key: "notes", label: "Observações", type: "textarea" },
      ]}
    />
  );
};

export default ClientOriginsPage;