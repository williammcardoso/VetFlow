import { FileSpreadsheet } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/saas/ModulePlaceholderPage";

const StatementModelPage = () => {
  return (
    <ModulePlaceholderPage
      title="Modelo de Demonstrativo"
      description="Configure layouts padrão para documentos de vendas."
      icon={FileSpreadsheet}
      module="sales"
      tone="sales"
      breadcrumb={<>Painel &gt; Vendas &gt; Modelo de Demonstrativo</>}
      backTo="/sales/my-sales"
      backLabel="Voltar para Vendas"
    />
  );
};

export default StatementModelPage;