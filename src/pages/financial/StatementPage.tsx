import { FileText } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/saas/ModulePlaceholderPage";

const StatementPage = () => {
  return (
    <ModulePlaceholderPage
      title="Demonstrativo Financeiro"
      description="Visualize períodos consolidados e indicadores por competência."
      icon={FileText}
      module="finance"
      tone="finance"
      breadcrumb={<>Painel &gt; Financeiro &gt; Demonstrativo</>}
      backTo="/financial"
      backLabel="Voltar para Financeiro"
    />
  );
};

export default StatementPage;