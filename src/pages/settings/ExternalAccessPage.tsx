import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Globe, Link2, Save } from "lucide-react";
import { PageHeader } from "@/components/saas/PageHeader";
import { PageShell } from "@/components/saas/PageShell";
import { SectionCard } from "@/components/saas/SectionCard";
import { ToolbarRow } from "@/components/saas/ToolbarRow";

const ExternalAccessPage: React.FC = () => {
  const [enabled, setEnabled] = React.useState<boolean>(() => {
    const raw = localStorage.getItem("settings:externalEnabled");
    return raw === "true";
  });
  const [portalUrl, setPortalUrl] = React.useState<string>(() => localStorage.getItem("settings:portalUrl") || "");

  const handleSave = () => {
    localStorage.setItem("settings:externalEnabled", String(enabled));
    localStorage.setItem("settings:portalUrl", portalUrl);
    toast.success("Configurações salvas.");
  };

  return (
    <PageShell>
      <PageHeader
        title="Acesso Externo"
        description="Habilite portal para tutores e compartilhamento de documentos."
        icon={Globe}
        module="settings"
        breadcrumb={<>Painel &gt; Configurações &gt; Acesso Externo</>}
      />

      <SectionCard
        title="Configuração do portal"
        description="Ative acesso remoto e informe o endpoint oficial da clínica."
        icon={Link2}
        tone="settings"
      >
        <ToolbarRow className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <Label className="text-sm">Habilitar portal externo</Label>
          </div>
          <div className="sm:col-span-3">
            <Label className="text-xs">URL do portal</Label>
            <Input value={portalUrl} onChange={(e) => setPortalUrl(e.target.value)} className="vf-toolbar-control bg-input" placeholder="https://portal.sua-clinica.com" />
          </div>
        </ToolbarRow>
      </SectionCard>

      <SectionCard
        title="Persistência das preferências"
        description="As alterações são gravadas localmente no navegador."
        icon={Save}
        tone="settings"
      >
        <div className="flex justify-end">
          <Button onClick={handleSave} className="h-9 bg-[hsl(var(--vf-settings))] px-4 text-white hover:bg-[hsl(var(--vf-settings)/0.9)]">
            Salvar
          </Button>
        </div>
      </SectionCard>
    </PageShell>
  );
};

export default ExternalAccessPage;