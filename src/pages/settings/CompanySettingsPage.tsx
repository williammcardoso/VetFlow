import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaBuilding, FaMapPin, FaWrench, FaTimes, FaSave } from "@/components/icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhoneBR } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getCompanySettings, saveCompanySettings } from "@/lib/settingsApi";
import type { CompanySettings } from "@/types/settings";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Building2, ArrowLeft } from "lucide-react";

const CompanySettingsPage = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCompanySettings()
      .then((s) => { setSettings(s); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    // Telefone é impresso em todos os documentos — normaliza aqui para não
    // depender de o usuário digitar formatado.
    const next = id === "phone" ? formatPhoneBR(value) : value;
    setSettings((prev) => prev ? { ...prev, [id]: next } : prev);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await saveCompanySettings(settings);
      toast.success("Configurações salvas com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <PageHeader title="Configurações da Empresa" description="Gerencie as informações e credenciais da sua empresa." icon={Building2} module="settings" />
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </PageShell>
    );
  }

  if (error || !settings) {
    return (
      <PageShell>
        <PageHeader title="Configurações da Empresa" icon={Building2} module="settings" />
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Erro ao carregar configurações</AlertTitle>
          <AlertDescription>{error || "Configurações não disponíveis."}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate("/")}>Voltar ao início</Button>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Configurações da Empresa"
        description="Gerencie as informações e credenciais da sua empresa."
        icon={Building2}
        module="settings"
        breadcrumb={<>Painel &gt; Configurações &gt; Empresa</>}
        actions={
          <Button asChild variant="outline" className="rounded-xl border-border/70">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        }
      />

      <div className="flex-1">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="vf-surface-card vf-tone-settings card-hover rounded-2xl border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <FaBuilding className="h-5 w-5 text-vf-settings" /> Informações Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-y-3 pt-0">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-muted-foreground font-medium">Nome da Empresa (nome fantasia)</Label>
                <Input id="companyName" value={settings.companyName} onChange={handleChange} className="bg-input rounded-md border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="razaoSocial" className="text-muted-foreground font-medium">Razão Social</Label>
                <Input id="razaoSocial" value={settings.razaoSocial} onChange={handleChange} className="bg-input rounded-md border-border" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj" className="text-muted-foreground font-medium">CNPJ</Label>
                  <Input id="cnpj" value={settings.cnpj} onChange={handleChange} className="bg-input rounded-md border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crmv" className="text-muted-foreground font-medium">CRMV</Label>
                  <Input id="crmv" value={settings.crmv} onChange={handleChange} className="bg-input rounded-md border-border" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-muted-foreground font-medium">Telefone</Label>
                <Input id="phone" value={settings.phone} onChange={handleChange} className="bg-input rounded-md border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mapaRegistration" className="text-muted-foreground font-medium">Registro no MAPA</Label>
                <Input id="mapaRegistration" value={settings.mapaRegistration} onChange={handleChange} className="bg-input rounded-md border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-muted-foreground font-medium">Email</Label>
                <Input id="email" type="email" value={settings.email} onChange={handleChange} className="bg-input rounded-md border-border" />
              </div>
            </CardContent>
          </Card>

          <Card className="vf-surface-card vf-tone-settings card-hover rounded-2xl border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <FaMapPin className="h-5 w-5 text-vf-settings" /> Endereço
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-y-3 pt-0">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-muted-foreground font-medium">Endereço Completo</Label>
                <Textarea id="address" value={settings.address} onChange={handleChange} rows={2} className="bg-input rounded-md border-border" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-muted-foreground font-medium">Cidade</Label>
                  <Input id="city" value={settings.city} onChange={handleChange} className="bg-input rounded-md border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode" className="text-muted-foreground font-medium">CEP</Label>
                  <Input id="zipCode" value={settings.zipCode} onChange={handleChange} className="bg-input rounded-md border-border" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="vf-surface-card vf-tone-settings card-hover rounded-2xl border-border/80 lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <FaWrench className="h-5 w-5 text-vf-settings" /> Outros
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-y-3 pt-0">
              <div className="space-y-2">
                <Label htmlFor="logoUrl" className="text-muted-foreground font-medium">URL do Logo</Label>
                <Input id="logoUrl" value={settings.logoUrl || ""} onChange={handleChange} placeholder="Ex: /logo.png" className="bg-input rounded-md border-border" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 flex justify-center gap-4 border-t border-border bg-card/80 p-4 backdrop-blur-sm">
        <Button variant="outline" onClick={() => navigate("/")} className="bg-card border border-border text-foreground hover:bg-muted rounded-md">
          <FaTimes className="mr-2 h-4 w-4" /> Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-[hsl(var(--vf-settings))] font-semibold text-white hover:bg-[hsl(var(--vf-settings)/0.9)]"
        >
          <FaSave className="mr-2 h-4 w-4" /> {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </PageShell>
  );
};

export default CompanySettingsPage;
