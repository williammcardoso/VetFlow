import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowLeft, Clock3, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageHeader, type VfModule } from "@/components/saas/PageHeader";
import { PageShell } from "@/components/saas/PageShell";
import { SectionCard, type SectionTone } from "@/components/saas/SectionCard";

interface ModulePlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  module: VfModule;
  tone: SectionTone;
  breadcrumb: React.ReactNode;
  backTo: string;
  backLabel: string;
}

export function ModulePlaceholderPage({
  title,
  description,
  icon,
  module,
  tone,
  breadcrumb,
  backTo,
  backLabel,
}: ModulePlaceholderPageProps) {
  return (
    <PageShell>
      <PageHeader
        title={title}
        description={description}
        icon={icon}
        module={module}
        breadcrumb={breadcrumb}
        actions={
          <Button asChild variant="outline" className="h-9">
            <Link to={backTo}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        }
      />

      <SectionCard
        title="Status do módulo"
        description="Este fluxo está em evolução e seguirá o mesmo padrão visual das demais áreas."
        icon={AlertTriangle}
        tone={tone}
      >
        <p className="text-sm text-muted-foreground">
          A funcionalidade ainda não foi disponibilizada para uso operacional, mas já está preparada no shell padrão SaaS.
        </p>
      </SectionCard>

      <SectionCard
        title="Próximas entregas"
        description="Escopo planejado para as próximas sprints."
        icon={Sparkles}
        tone={tone}
      >
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>- filtros e listagem principal com tabela consistente;</li>
          <li>- ações de cadastro/edição com validação em formulário;</li>
          <li>- estados de loading, erro e vazio padronizados.</li>
        </ul>
      </SectionCard>

      <SectionCard
        title="Disponibilidade"
        description="Acompanhe a ativação deste módulo."
        icon={Clock3}
        tone={tone}
      >
        <p className="text-sm text-muted-foreground">Sem data final publicada no momento. Retorne em breve para novidades.</p>
      </SectionCard>
    </PageShell>
  );
}
