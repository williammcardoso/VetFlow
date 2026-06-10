import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, LayoutDashboard } from "lucide-react";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";

const Index = () => {
  return (
    <PageShell>
      <PageHeader
        title="Boas-vindas"
        description="Sua solução completa para gestão veterinária com fluxo clínico, financeiro e operacional em um único lugar."
        icon={Sparkles}
        module="clinical"
        breadcrumb={<>Painel &gt; Início</>}
      />

      <SectionCard
        title="Começar agora"
        description="Acesse o dashboard para acompanhar a operação da clínica."
        icon={LayoutDashboard}
        tone="clinical"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild className="h-10">
            <Link to="/dashboard">
              Ir para o Painel de Controle <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Navegação principal"
        description="Use o menu lateral para acessar clientes, agenda, vendas, estoque, financeiro e configurações."
        icon={Sparkles}
        tone="neutral"
      >
        <p className="text-sm text-muted-foreground">
          Todo o sistema segue o mesmo padrão de layout para leitura rápida, ações previsíveis e melhor experiência em dark mode.
        </p>
      </SectionCard>
    </PageShell>
  );
};

export default Index;