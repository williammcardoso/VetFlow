import React from "react";
import { Wallet } from "lucide-react";
import RegistryManager from "@/components/RegistryManager";

const FinancialPaymentMethodsPage = () => {
  return (
    <RegistryManager
      icon={Wallet}
      module="finance"
      layoutVariant="B"
      storageKey="paymentMethods"
      title="Formas de Pagamento"
      breadcrumb={<>Painel &gt; Financeiro &gt; Formas de Pagamento</>}
      columns={[
        { key: "type", label: "Tipo", type: "text", placeholder: "Ex.: À vista, Parcelado" },
        { key: "fee", label: "Taxa (%)", type: "number", placeholder: "Ex.: 2.99" },
        { key: "termDays", label: "Prazo (dias)", type: "number", placeholder: "Ex.: 30" },
        { key: "notes", label: "Observações", type: "textarea", placeholder: "Regras curtas, bandeiras e limites..." },
      ]}
    />
  );
};

export default FinancialPaymentMethodsPage;