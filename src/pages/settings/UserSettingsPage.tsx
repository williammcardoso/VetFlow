import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUser, FaBriefcase, FaLock, FaTimes, FaSave } from "@/components/icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getMyUserProfile, saveMyUserProfile } from "@/lib/authApi";
import { useAuth } from "@/contexts/AuthContext";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { UserCog, ArrowLeft } from "lucide-react";

type UserSettingsForm = {
  userName: string;
  userEmail: string;
  userCrmv: string;
  userMapaRegistration: string;
  signatureText: string;
};

const UserSettingsPage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [settings, setSettings] = useState<UserSettingsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyUserProfile()
      .then((profile) => {
        setSettings({
          userName: profile.full_name || "",
          userEmail: profile.email || "",
          userCrmv: profile.crmv || "",
          userMapaRegistration: profile.mapa_registration || "",
          signatureText: profile.signature_text || "",
        });
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Falha ao carregar perfil.");
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setSettings((prev) => prev ? { ...prev, [id]: value } : prev);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await saveMyUserProfile({
        full_name: settings.userName,
        email: settings.userEmail,
        crmv: settings.userCrmv,
        mapa_registration: settings.userMapaRegistration,
        signature_text: settings.signatureText,
      });
      toast.success("Perfil salvo com sucesso.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <PageHeader
          title="Configurações do Usuário"
          description="Carregando seu perfil profissional."
          icon={UserCog}
          module="settings"
          breadcrumb={<>Painel &gt; Configurações &gt; Usuário</>}
        />
        <Card className="vf-surface-card vf-tone-settings card-hover rounded-2xl border-border/80">
          <CardContent className="py-10">
            <p className="text-sm text-muted-foreground">Carregando configurações...</p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (error || !settings) {
    return (
      <PageShell>
        <PageHeader
          title="Configurações do Usuário"
          description="Não foi possível carregar os dados do seu perfil."
          icon={UserCog}
          module="settings"
          breadcrumb={<>Painel &gt; Configurações &gt; Usuário</>}
        />
        <Card className="vf-surface-card vf-tone-settings card-hover rounded-2xl border-border/80">
          <CardContent className="space-y-4 py-8">
            <p className="text-destructive font-medium">Erro ao carregar configurações</p>
            <p className="text-sm text-muted-foreground max-w-2xl">{error || "Configurações não disponíveis."}</p>
            <Button variant="outline" onClick={() => navigate("/")}>Voltar ao início</Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Configurações do Usuário"
        description="Gerencie suas informações e credenciais profissionais."
        icon={UserCog}
        module="settings"
        breadcrumb={<>Painel &gt; Configurações &gt; Usuário</>}
        actions={
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/public/placeholder.svg" alt="User Avatar" />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {session?.username?.slice(0, 2).toUpperCase() || "US"}
              </AvatarFallback>
            </Avatar>
            <Button asChild variant="outline" className="rounded-xl border-border/70">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex-1">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="vf-surface-card vf-tone-settings card-hover rounded-2xl border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <FaUser className="h-5 w-5 text-vf-settings" /> Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-y-3 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userName" className="text-muted-foreground font-medium">Nome Completo</Label>
                  <Input id="userName" value={settings.userName} onChange={handleChange} className="bg-input rounded-md border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userEmail" className="text-muted-foreground font-medium">Email</Label>
                  <Input id="userEmail" type="email" value={settings.userEmail} onChange={handleChange} className="bg-input rounded-md border-border" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="vf-surface-card vf-tone-settings card-hover rounded-2xl border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <FaBriefcase className="h-5 w-5 text-vf-settings" /> Informações Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-y-3 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userCrmv" className="text-muted-foreground font-medium">CRMV</Label>
                  <Input id="userCrmv" value={settings.userCrmv} onChange={handleChange} className="bg-input rounded-md border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userMapaRegistration" className="text-muted-foreground font-medium">Registro no MAPA</Label>
                  <Input id="userMapaRegistration" value={settings.userMapaRegistration} onChange={handleChange} className="bg-input rounded-md border-border" />
                </div>
              </div>
              <div className="space-y-2 border-t border-border mt-4 pt-4">
                <Label htmlFor="signatureText" className="text-muted-foreground font-medium">Texto da Assinatura (para relatórios)</Label>
                <Textarea id="signatureText" value={settings.signatureText} onChange={handleChange} rows={2} className="bg-input rounded-md border-border" />
                <p className="text-xs text-muted-foreground">
                  Este texto será usado em receitas e documentos quando houver assinatura eletrônica.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="vf-surface-card vf-tone-settings card-hover rounded-2xl border-border/80 lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <FaLock className="h-5 w-5 text-vf-settings" /> Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-y-3 pt-0">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-muted-foreground font-medium">Alterar Senha</Label>
                <Input id="password" type="password" placeholder="Fluxo de troca de senha sera habilitado em breve" disabled className="bg-input rounded-md border-border" />
                <p className="text-xs text-muted-foreground">
                  Para troca de senha, use a gestão de usuários (admin) até a próxima entrega de recuperação segura.
                </p>
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

export default UserSettingsPage;
