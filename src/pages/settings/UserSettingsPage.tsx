import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUser, FaBriefcase, FaLock, FaTimes, FaSave } from "@/components/icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getMyUserProfile, saveMyUserProfile } from "@/lib/authApi";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import SignatureCanvas, { type SignatureCanvasHandle } from "@/components/SignatureCanvas";
import AvatarCropper from "@/components/AvatarCropper";
import UserAvatarDisplay from "@/components/UserAvatarDisplay";
import { AVATAR_ICON_OPTIONS } from "@/constants/avatarIcons";
import { cn } from "@/lib/utils";
import { UserCog, ArrowLeft, Trash2, Upload, Camera, PenLine, Eraser, Check, Type as TypeIcon } from "lucide-react";

type AvatarMode = "photo" | "icon" | "initials";

type UserSettingsForm = {
  userName: string;
  userEmail: string;
  userCrmv: string;
  userMapaRegistration: string;
  signatureText: string;
  signatureUrl: string;
  avatarUrl: string;
  avatarType: AvatarMode;
  avatarIcon: string;
  avatarInitials: string;
};

const PROFILE_BUCKET = "documents";

async function uploadUserFile(userId: string, folder: "signatures" | "avatars", file: File | Blob): Promise<string | null> {
  const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "png";
  const baseName = file instanceof File ? file.name.replace(/[^a-zA-Z0-9._-]/g, "_") : `imagem.${ext}`;
  const path = `${folder}/${userId}/${Date.now()}_${baseName}`;
  const { error: upErr } = await supabase.storage.from(PROFILE_BUCKET).upload(path, file, { upsert: false });
  if (upErr) {
    console.error(`[uploadUserFile:${folder}] upload error`, upErr);
    return null;
  }
  const { data } = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

const UserSettingsPage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [settings, setSettings] = useState<UserSettingsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropperFile, setCropperFile] = useState<File | null>(null);
  const [signatureMode, setSignatureMode] = useState<"upload" | "draw">("upload");
  const [savingDrawnSignature, setSavingDrawnSignature] = useState(false);
  const [drawnSignatureHasContent, setDrawnSignatureHasContent] = useState(false);
  const signatureCanvasRef = useRef<SignatureCanvasHandle | null>(null);
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
          avatarUrl: profile.avatar_url || "",
          avatarType: (profile.avatar_type as AvatarMode) || "initials",
          avatarIcon: profile.avatar_icon || "",
          avatarInitials: profile.avatar_initials || "",
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
      const url = await uploadUserFile(session.id, "signatures", file);
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

  const handleSaveDrawnSignature = async () => {
    if (!session || signatureCanvasRef.current?.isEmpty()) {
      toast.error("Desenhe a assinatura no campo antes de usar.");
      return;
    }
    const dataUrl = signatureCanvasRef.current?.toDataUrl();
    if (!dataUrl) return;
    setSavingDrawnSignature(true);
    try {
      const file = await dataUrlToFile(dataUrl, "assinatura.png");
      const url = await uploadUserFile(session.id, "signatures", file);
      if (!url) {
        toast.error("Falha ao salvar a assinatura desenhada.");
        return;
      }
      setSettings((prev) => (prev ? { ...prev, signatureUrl: url } : prev));
      signatureCanvasRef.current?.clear();
      setDrawnSignatureHasContent(false);
      setSignatureMode("upload");
      toast.success("Assinatura desenhada salva. Clique em Salvar para confirmar.");
    } finally {
      setSavingDrawnSignature(false);
    }
  };

  const handleAvatarFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma imagem (PNG ou JPG) para a foto de perfil.");
      return;
    }
    setCropperFile(file);
  };

  const handleCropConfirm = async (blob: Blob) => {
    if (!session) return;
    setCropperFile(null);
    setUploadingAvatar(true);
    try {
      const url = await uploadUserFile(session.id, "avatars", blob);
      if (!url) {
        toast.error("Falha ao enviar a foto de perfil.");
        return;
      }
      setSettings((prev) => (prev ? { ...prev, avatarUrl: url, avatarType: "photo" } : prev));
      toast.success("Foto carregada. Clique em Salvar para confirmar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePickIcon = (key: string) => {
    setSettings((prev) => (prev ? { ...prev, avatarType: "icon", avatarIcon: key } : prev));
  };

  const handleCustomInitials = (value: string) => {
    const cleaned = value.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();
    setSettings((prev) => (prev ? { ...prev, avatarType: "initials", avatarInitials: cleaned } : prev));
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
        avatar_url: settings.avatarUrl,
        avatar_type: settings.avatarType,
        avatar_icon: settings.avatarIcon,
        avatar_initials: settings.avatarInitials,
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
            <UserAvatarDisplay
              avatarType={settings.avatarType}
              avatarUrl={settings.avatarUrl}
              avatarIcon={settings.avatarIcon}
              avatarInitials={settings.avatarInitials}
              fallbackName={session?.username}
              className="h-8 w-8"
            />
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
              <div className="space-y-3 border-b border-border pb-4">
                <div className="flex items-center gap-4">
                  <UserAvatarDisplay
                    avatarType={settings.avatarType}
                    avatarUrl={settings.avatarUrl}
                    avatarIcon={settings.avatarIcon}
                    avatarInitials={settings.avatarInitials}
                    fallbackName={session?.username}
                    className="h-16 w-16 shrink-0 ring-1 ring-border"
                  />
                  <div className="flex gap-1.5 rounded-lg border border-border bg-muted/40 p-1">
                    <button
                      type="button"
                      onClick={() => document.getElementById("avatarFile")?.click()}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                        settings.avatarType === "photo" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Camera className="h-3.5 w-3.5" /> Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings((prev) => (prev ? { ...prev, avatarType: "icon" } : prev))}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                        settings.avatarType === "icon" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      🐾 Ícone
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings((prev) => (prev ? { ...prev, avatarType: "initials" } : prev))}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                        settings.avatarType === "initials" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <TypeIcon className="h-3.5 w-3.5" /> Iniciais
                    </button>
                  </div>
                  <input
                    id="avatarFile"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingAvatar}
                    onChange={handleAvatarFileSelected}
                  />
                </div>

                {settings.avatarType === "photo" && (
                  <p className="text-xs text-muted-foreground">
                    {uploadingAvatar ? "Enviando..." : settings.avatarUrl ? "Clique em \"Foto\" acima pra trocar." : "Clique em \"Foto\" acima pra enviar e recortar uma imagem."}
                  </p>
                )}

                {settings.avatarType === "icon" && (
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                    {AVATAR_ICON_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        title={opt.label}
                        onClick={() => handlePickIcon(opt.key)}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-105",
                          opt.bg,
                          settings.avatarIcon === opt.key && settings.avatarType === "icon" ? "ring-2 ring-[hsl(var(--vf-settings))] ring-offset-2" : ""
                        )}
                      >
                        <opt.Icon className={cn("h-5 w-5", opt.fg)} strokeWidth={1.8} />
                      </button>
                    ))}
                  </div>
                )}

                {settings.avatarType === "initials" && (
                  <div className="flex items-center gap-2">
                    <Input
                      value={settings.avatarInitials}
                      onChange={(e) => handleCustomInitials(e.target.value)}
                      placeholder={(session?.username?.slice(0, 2) || "US").toUpperCase()}
                      className="h-9 w-24 bg-input text-center font-semibold uppercase tracking-wide"
                      maxLength={3}
                    />
                    <p className="text-xs text-muted-foreground">Até 3 letras. Em branco usa as iniciais do seu usuário.</p>
                  </div>
                )}
              </div>
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
                <Label className="text-muted-foreground font-medium">Assinatura digital</Label>
                <p className="text-xs text-muted-foreground">
                  Opcional — a maioria dos documentos usa a linha em branco para assinar no papel. Só use isto se
                  precisar entregar um documento já assinado digitalmente; nesse caso, marque "usar assinatura
                  digital" na hora de gerar o documento. Envie uma foto/scan da sua assinatura, ou desenhe na tela.
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
                  {settings.signatureUrl && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-600"
                      onClick={() => setSettings((prev) => (prev ? { ...prev, signatureUrl: "" } : prev))}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remover assinatura salva
                    </button>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant={signatureMode === "upload" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSignatureMode("upload")}
                    className={signatureMode === "upload" ? "bg-[hsl(var(--vf-settings))] text-white hover:bg-[hsl(var(--vf-settings)/0.9)]" : ""}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" /> Enviar imagem
                  </Button>
                  <Button
                    type="button"
                    variant={signatureMode === "draw" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSignatureMode("draw")}
                    className={signatureMode === "draw" ? "bg-[hsl(var(--vf-settings))] text-white hover:bg-[hsl(var(--vf-settings)/0.9)]" : ""}
                  >
                    <PenLine className="mr-1.5 h-3.5 w-3.5" /> Desenhar assinatura
                  </Button>
                </div>

                {signatureMode === "upload" ? (
                  <div className="pt-1">
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
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <SignatureCanvas ref={(h) => (signatureCanvasRef.current = h)} onChange={setDrawnSignatureHasContent} height={140} />
                    <div className="flex items-center justify-between">
                      <Button type="button" variant="ghost" size="sm" onClick={() => { signatureCanvasRef.current?.clear(); setDrawnSignatureHasContent(false); }}>
                        <Eraser className="mr-2 h-3.5 w-3.5" /> Limpar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!drawnSignatureHasContent || savingDrawnSignature}
                        onClick={() => void handleSaveDrawnSignature()}
                        className="bg-[hsl(var(--vf-settings))] text-white hover:bg-[hsl(var(--vf-settings)/0.9)]"
                      >
                        <Check className="mr-1.5 h-3.5 w-3.5" /> {savingDrawnSignature ? "Salvando..." : "Usar esta assinatura"}
                      </Button>
                    </div>
                  </div>
                )}
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
                <Input id="password" type="password" placeholder="Em breve" disabled className="bg-input rounded-md border-border" />
                <p className="text-xs text-muted-foreground">
                  Troca de senha pelo próprio usuário ainda não está disponível. Por enquanto, use a gestão de usuários (admin) para redefinir.
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

      <AvatarCropper
        file={cropperFile}
        open={!!cropperFile}
        onClose={() => setCropperFile(null)}
        onConfirm={(blob) => void handleCropConfirm(blob)}
      />
    </PageShell>
  );
};

export default UserSettingsPage;
