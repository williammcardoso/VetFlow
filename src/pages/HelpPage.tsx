import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, HelpCircle, ArrowLeft, LifeBuoy } from "lucide-react";
import { PageHeader } from "@/components/saas/PageHeader";
import { PageShell } from "@/components/saas/PageShell";
import { SectionCard } from "@/components/saas/SectionCard";

const HelpPage = () => {
  return (
    <PageShell>
      <PageHeader
        title="Ajuda"
        description="Documentação rápida do VetFlow e canais de suporte."
        icon={HelpCircle}
        module="settings"
        breadcrumb={<>Painel &gt; Ajuda</>}
        actions={
          <Button asChild variant="outline" className="h-9">
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Link>
          </Button>
        }
      />

      <SectionCard
        title="Guia de navegação"
        description="Resumo dos principais fluxos disponíveis no sistema."
        icon={BookOpen}
        tone="settings"
      >
        <p className="text-sm text-muted-foreground">
          Use o menu lateral para acessar Clientes, Agenda, Vendas, Cadastros, Estoque, Financeiro e Configurações.
        </p>
      </SectionCard>

      <SectionCard
        title="Suporte"
        description="Canais para dúvidas e assistência operacional."
        icon={LifeBuoy}
        tone="settings"
      >
        <p className="text-sm text-muted-foreground">
          Para suporte ou documentação detalhada, entre em contato com o administrador do sistema.
        </p>
      </SectionCard>
    </PageShell>
  );
};

export default HelpPage;
