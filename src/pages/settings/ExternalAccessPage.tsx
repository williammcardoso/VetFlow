import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
    <div className="flex flex-col min-h-screen bg-background p-4 sm:p-6">
      <div className="mb-3">
        <h1 className="text-xl sm:text-2xl font-semibold">Acesso Externo</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Habilite portal para tutores e compartilhamento de documentos.</p>
      </div>

      <Card className="border border-border">
        <CardHeader className="pb-2"><CardTitle className="text-base">Configuração</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <Label className="text-sm">Habilitar portal externo</Label>
          </div>
          <div className="sm:col-span-3">
            <Label className="text-xs">URL do portal</Label>
            <Input value={portalUrl} onChange={(e) => setPortalUrl(e.target.value)} className="h-8 text-sm bg-input" placeholder="https://portal.sua-clinica.com" />
          </div>
          <div className="sm:col-span-4 flex justify-end">
            <Button onClick={handleSave} className="h-9 px-4">Salvar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExternalAccessPage;