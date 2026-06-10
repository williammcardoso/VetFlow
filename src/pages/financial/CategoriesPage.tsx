import { Tags } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/saas/ModulePlaceholderPage";

const CategoriesPage = () => {
  return (
    <ModulePlaceholderPage
      title="Categorias Financeiras"
      description="Defina categorias para relatórios e apuração financeira."
      icon={Tags}
      module="finance"
      tone="finance"
      breadcrumb={<>Painel &gt; Financeiro &gt; Categorias</>}
      backTo="/financial"
      backLabel="Voltar para Financeiro"
    />
  );
};

export default CategoriesPage;