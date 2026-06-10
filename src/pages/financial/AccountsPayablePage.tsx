import { WalletCards } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/saas/ModulePlaceholderPage";

const AccountsPayablePage = () => {
  return (
    <ModulePlaceholderPage
      title="Contas a Pagar"
      description="Acompanhe vencimentos, fornecedores e prioridades financeiras."
      icon={WalletCards}
      module="finance"
      tone="finance"
      breadcrumb={<>Painel &gt; Financeiro &gt; Contas a Pagar</>}
      backTo="/financial"
      backLabel="Voltar para Financeiro"
    />
  );
};

export default AccountsPayablePage;