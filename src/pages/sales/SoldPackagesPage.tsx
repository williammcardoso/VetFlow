import { PackageCheck } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/saas/ModulePlaceholderPage";

const SoldPackagesPage = () => {
  return (
    <ModulePlaceholderPage
      title="Pacotes Vendidos"
      description="Acompanhe contratos fechados e consumo de pacotes."
      icon={PackageCheck}
      module="sales"
      tone="sales"
      breadcrumb={<>Painel &gt; Vendas &gt; Pacotes Vendidos</>}
      backTo="/sales/my-sales"
      backLabel="Voltar para Vendas"
    />
  );
};

export default SoldPackagesPage;