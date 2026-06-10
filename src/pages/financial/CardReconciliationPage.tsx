import { CreditCard } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/saas/ModulePlaceholderPage";

const CardReconciliationPage = () => {
  return (
    <ModulePlaceholderPage
      title="Conciliação de Cartões"
      description="Valide recebíveis e taxas de operadoras em uma trilha única."
      icon={CreditCard}
      module="finance"
      tone="finance"
      breadcrumb={<>Painel &gt; Financeiro &gt; Conciliação de Cartões</>}
      backTo="/financial"
      backLabel="Voltar para Financeiro"
    />
  );
};

export default CardReconciliationPage;