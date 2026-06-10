import { Landmark } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/saas/ModulePlaceholderPage";

const AccountsCardsPage = () => {
  return (
    <ModulePlaceholderPage
      title="Contas e Cartões"
      description="Centralize contas bancárias, cartões e limites operacionais."
      icon={Landmark}
      module="finance"
      tone="finance"
      breadcrumb={<>Painel &gt; Financeiro &gt; Contas e Cartões</>}
      backTo="/financial"
      backLabel="Voltar para Financeiro"
    />
  );
};

export default AccountsCardsPage;