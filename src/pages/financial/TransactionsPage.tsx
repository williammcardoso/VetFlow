import { ArrowRightLeft } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/saas/ModulePlaceholderPage";

const TransactionsPage = () => {
  return (
    <ModulePlaceholderPage
      title="Lançamentos Financeiros"
      description="Gerencie entradas e saídas com classificação padronizada."
      icon={ArrowRightLeft}
      module="finance"
      tone="finance"
      breadcrumb={<>Painel &gt; Financeiro &gt; Lançamentos</>}
      backTo="/financial"
      backLabel="Voltar para Financeiro"
    />
  );
};

export default TransactionsPage;