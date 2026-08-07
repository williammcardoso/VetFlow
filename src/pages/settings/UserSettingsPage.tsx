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
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { UserCog, ArrowLeft, Trash2, Upload } from "lucide-react";

type UserSettingsForm = {
  userName: string;
  userEmail: string;
  userCrmv: string;
  userMapaRegistration: string;
  signatureText: string;
  signatureUrl: string;
};

const SIGNATURE_BUCKET = "documents";

async function uploadSignatureImage(userId: string, file: File): Promise<string | null> {
  const path = `signatures/${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: upErr } = await supabase.storage.from(SIGNATURE_BUCKET).upload(path, file, { upsert: false });
  if (upErr) {
    console.error("[uploadSignatureImage] upload error", upErr);
    return null;
  }
  const { data } = supabase.storage.from(SIGNATURE_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

const UserSettingsPage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [settings, setSettings] = useState<UserSettingsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
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
          signatureUrl: profile.signature_url || "",
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

  const handleSignatureFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !session) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma imagem (PNG ou JPG) da assinatura.");
      return;
    }
    setUploadingSignature(true);
    try {
      const url = await uploadSignatureImage(session.id, file);
      if (!url) {
        toast.error("Falha ao enviar a imagem da assinatura.");
        return;
      }
      setSettings((prev) => (prev ? { ...prev, signatureUrl: url } : prev));
      toast.success("Assinatura carregada. Clique em Salvar para confirmar.");
    } finally {
      setUploadingSignature(false);
    }
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
        signature_url: settings.signatureUrl,
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

              <div className="space-y-2 border-t border-border mt-2 pt-4">
                <Label className="text-muted-foreground font-medium">Assinatura digital (imagem escaneada)</Label>
                <p className="text-xs text-muted-foreground">
                  Opcional — a maioria dos documentos usa a linha em branco para assinar no papel. Só use isto se
                  precisar entregar um documento já assinado digitalmente; nesse caso, marque "usar assinatura
                  digital" na hora de gerar o documento.
                </p>
                <div className="flex items-center gap-3">
                  {settings.signatureUrl ? (
                    <img
                      src={settings.signatureUrl}
                      alt="Assinatura"
                      className="h-14 rounded-md border border-border bg-white object-contain px-2"
                    />
                  ) : (
                    <div className="flex h-14 w-28 items-center justify-center rounded-md border border-dashed border-border text-[11px] text-muted-foreground">
                      Sem assinatura
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="signatureFile"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingSignature ? "Enviando..." : settings.signatureUrl ? "Trocar imagem" : "Enviar imagem"}
                    </Label>
                    <input
                      id="signatureFile"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingSignature}
                      onChange={handleSignatureFile}
                    />
                    {settings.signatureUrl && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-600"
                        onClick={() => setSettings((prev) => (prev ? { ...prev, signatureUrl: "" } : prev))}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remover
                      </button>
                    )}
                  </div>
                </div>
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
