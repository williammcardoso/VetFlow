import React from "react";
import { ClipboardList } from "lucide-react";
import RegistryManager from "@/components/RegistryManager";

const AppointmentTypesPage: React.FC = () => {
  return (
    <RegistryManager
      icon={ClipboardList}
      layoutVariant="A"
      storageKey="appointmentTypes"
      breadcrumb={<>Painel &gt; Cadastros &gt; Tipos de Atendimento</>}
      title="Tipos de Atendimento"
      columns={[
        { key: "defaultDuration", label: "Duração (min)", type: "number", placeholder: "Ex.: 30" },
        { key: "notes", label: "Observações", type: "textarea", placeholder: "Detalhes adicionais (opcional)" },
      ]}
    />
  );
};

export default AppointmentTypesPage;