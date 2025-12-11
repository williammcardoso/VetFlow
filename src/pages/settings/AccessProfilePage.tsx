import React from "react";
import RegistryManager from "@/components/RegistryManager";

const AccessProfilePage: React.FC = () => {
  return (
    <RegistryManager
      storageKey="brands" // reutilizando store genérica; em app real seria 'accessProfiles'
      title="Perfis de Acesso"
      columns={[
        { key: "level", label: "Nível", type: "text", placeholder: "Ex.: Admin, Atendente, Veterinário" },
        { key: "notes", label: "Observações", type: "textarea" },
      ]}
    />
  );
};

export default AccessProfilePage;