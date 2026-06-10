import { Truck } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/saas/ModulePlaceholderPage";

const SuppliersPage = () => {
  return (
    <ModulePlaceholderPage
      title="Fornecedores"
      description="Cadastre parceiros e acompanhe histórico de compras."
      icon={Truck}
      module="finance"
      tone="finance"
      breadcrumb={<>Painel &gt; Financeiro &gt; Fornecedores</>}
      backTo="/financial"
      backLabel="Voltar para Financeiro"
    />
  );
};

export default SuppliersPage;