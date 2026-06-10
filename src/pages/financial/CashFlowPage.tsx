import { BarChart3 } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/saas/ModulePlaceholderPage";

const CashFlowPage = () => {
  return (
    <ModulePlaceholderPage
      title="Fluxo de Caixa"
      description="Controle entradas e saídas por dia, semana e mês."
      icon={BarChart3}
      module="finance"
      tone="finance"
      breadcrumb={<>Painel &gt; Financeiro &gt; Fluxo de Caixa</>}
      backTo="/financial"
      backLabel="Voltar para Financeiro"
    />
  );
};

export default CashFlowPage;