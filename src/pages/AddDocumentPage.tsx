"use client";

import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Upload,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TiptapRichText from "@/components/TiptapRichText";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useRegistryList } from "@/hooks/useRegistryList";
import { addPatientDocument, updatePatientDocument, readPatientDocuments } from "@/lib/documentsApi";
import { useClientWithAnimals } from "@/hooks/useSupabaseClients";
import type { Client, Animal } from "@/types/client";
import { replaceTemplateVariables } from "@/utils/templateReplacements";
import { PageShell } from "@/components/saas/PageShell";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { getPatientRecordPath } from "@/utils/patientDisplayId";

const recordUrl = (clientId: string, animalId: string, patientCode?: number) =>
  `${getPatientRecordPath(clientId, animalId, patientCode)}?tab=documents`;

/** Converte texto com \n em HTML para o Quill (parágrafos/br) - ReactQuill espera HTML no value */
function plainTextToQuillHtml(text: string): string {
  if (!text) return "";
  if (text.trim().startsWith("<") && text.includes(">")) return text;
  return text
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function withDefaultTemplateTypography(html: string): string {
  if (!html) return "";
  if (/data-default-typography=["']1["']/i.test(html)) return html;

  const injectDefaultStyle = (rawStyle: string | undefined) => {
    const style = (rawStyle || "").trim();
    const hasFontFamily = /font-family\s*:/i.test(style);
    const hasFontSize = /font-size\s*:/i.test(style);
    let next = style;
    if (!hasFontFamily) next = `${next}${next ? ";" : ""} font-family: Inter`;
    if (!hasFontSize) next = `${next}${next ? ";" : ""} font-size: 12px`;
    return next.trim();
  };

  const styled = html.replace(
    /<(p|li|blockquote|h1|h2|h3|h4|h5|h6)([^>]*)>/gi,
    (_m, tag, attrs) => {
      const currentStyle = String(attrs).match(/\sstyle\s*=\s*["']([^"']*)["']/i)?.[1];
      const mergedStyle = injectDefaultStyle(currentStyle);
      if (currentStyle != null) {
        const replacedAttrs = String(attrs).replace(/\sstyle\s*=\s*["'][^"']*["']/i, "");
        return `<${tag}${replacedAttrs} style="${mergedStyle}">`;
      }
      return `<${tag}${attrs} style="${mergedStyle}">`;
    }
  );

  return `<div data-default-typography="1" style="font-family: Inter; font-size: 12px;">${styled}</div>`;
}


const AddDocumentPage: React.FC = () => {
  const { clientId, animalId } = useParams<{
    clientId: string;
    animalId: string;
  }>();
  const [searchParams] = useSearchParams();
  const editDocId = searchParams.get("edit") ?? undefined;
  const debug = searchParams.get("debug") === "1";
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"upload" | "editor">("editor");
  const [copied, setCopied] = useState(false);

  const { data: clientData } = useClientWithAnimals(clientId);
  const { profile: currentUserProfile } = useCurrentUserProfile();
  const { canAccessModule } = useAuth();
  const canEditDocuments = canAccessModule("prescriptions", "edit");
  const client = clientData ?? undefined;
  const animal = client?.animals?.find((a) => a.id === animalId);

  const recordLink = recordUrl(clientId!, animalId!, animal?.patientCode);

  // ---- Upload ----
  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // ---- Editor ----
  const [editorTitle, setEditorTitle] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [editorTemplateKey, setEditorTemplateKey] = useState<string>("");
  const [templateAutoSizeToken, setTemplateAutoSizeToken] = useState(0);

  const { list: customTemplates } = useRegistryList("documentModels");
  const allTemplates = customTemplates
    .map((t) => ({
      key: (t as { id: string }).id,
      title: (t as { name: string }).name,
      type: "Modelo cadastrado",
      content: (t as { template?: string }).template ?? "",
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

  const applyTemplate = (templateKey: string) => {
    setActiveTab("editor");
    const custom = customTemplates.find((t) => (t as { id: string }).id === templateKey) as
      | { id: string; name: string; template?: string }
      | undefined;
    if (custom) {
      const plain = replaceTemplateVariables(custom.template ?? "", animal, client, currentUserProfile);
      const html = withDefaultTemplateTypography(plainTextToQuillHtml(plain));
      if (debug) {
        console.log("[applyTemplate] custom", { name: custom.name, plainLen: plain.length, htmlLen: html.length });
      }
      setEditorTitle(custom.name);
      setEditorContent(html);
      setEditorTemplateKey(custom.id);
      setTemplateAutoSizeToken((n) => n + 1);
      toast.success("Modelo aplicado! Edite o texto.");
    }
  };

  useEffect(() => {
    if (!editDocId || !animalId) return;
    void (async () => {
      const list = await readPatientDocuments(animalId);
      const doc = list.find((d) => d.id === editDocId);
      if (doc && doc.source === "editor") {
        setActiveTab("editor");
        setEditorTitle(doc.name);
        setEditorContent(doc.content ?? "");
        setEditorTemplateKey(doc.templateKey ?? "");
      }
    })();
  }, [editDocId, animalId]);

  useEffect(() => {
    if (editorTemplateKey && !editorContent && allTemplates.length && !editDocId) {
      const t = allTemplates.find((t) => t.key === editorTemplateKey);
      if (t) {
        setEditorContent(
          withDefaultTemplateTypography(plainTextToQuillHtml(replaceTemplateVariables(t.content, animal, client, currentUserProfile)))
        );
      }
    }
  }, [editorTemplateKey, animal, client, editDocId, currentUserProfile]);

  const copyContent = () => {
    navigator.clipboard.writeText(editorContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Conteúdo copiado!");
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditDocuments) {
      toast.error("Você não possui permissão para editar documentos.");
      return;
    }
    if (!uploadName.trim() || !uploadFile || !animalId) {
      toast.error("Informe o nome e selecione o arquivo.");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(uploadFile);
      });
      const created = await addPatientDocument(animalId, {
        name: uploadName.trim(),
        fileUrl: dataUrl,
        source: "upload",
      });
      if (created) {
        toast.success("Documento anexado ao prontuário!");
        navigate(recordLink);
      } else {
        toast.error("Não foi possível salvar o documento.");
      }
    } catch {
      toast.error("Erro ao processar o arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const handleEditorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditDocuments) {
      toast.error("Você não possui permissão para editar documentos.");
      return;
    }
    if (!editorTitle.trim() || !editorContent.trim() || !animalId) {
      toast.error("Informe o título e o conteúdo do documento.");
      return;
    }

    if (editDocId) {
      const updated = await updatePatientDocument(animalId, editDocId, {
        name: editorTitle.trim(),
        // preserve leading/trailing whitespace (do not trim) so paragraph indents remain
        content: editorContent,
        templateKey: editorTemplateKey || undefined,
      });
      if (!updated) {
        toast.error("Não foi possível atualizar o documento.");
        return;
      }
      toast.success("Documento atualizado no prontuário!");
      navigate(recordLink);
      return;
    }

    const created = await addPatientDocument(animalId, {
      name: editorTitle.trim(),
      fileUrl: "",
      source: "editor",
      // preserve leading/trailing whitespace (do not trim) so paragraph indents remain
      content: editorContent,
      templateKey: editorTemplateKey || undefined,
    });
    if (created) {
      toast.success("Documento salvo no prontuário!");
      navigate(recordLink);
    } else {
      toast.error("Não foi possível salvar o documento.");
    }
  };

  if (!client || !animal) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Paciente não encontrado.</p>
        <Button variant="link" asChild>
          <Link to="/dashboard">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <PageShell>
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4 -ml-2">
          <Link to={recordLink}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Prontuário
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {editDocId ? "Editar documento" : "Novo Documento"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Paciente: <span className="font-medium text-foreground">{animal.name}</span>
          {client && (
            <>
              {" "}
              • Tutor: <span className="font-medium text-foreground">{client.name}</span>
            </>
          )}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "editor")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 max-w-md">
          <TabsTrigger value="editor" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Novo documento (editor)
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" /> Upload de arquivo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-4">
          {debug && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <strong>Debug:</strong> título=&quot;{editorTitle || "(vazio)"}&quot; ({editorTitle.length} chars) |
              conteúdo={editorContent.length} chars |
              aba={activeTab}
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card className="vf-surface-card vf-tone-clinical card-hover border-border/80">
                <CardContent className="p-6">
                  <Tabs value="editor-form" className="w-full">
                    <form onSubmit={handleEditorSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-2">
                          <Label>Título do documento *</Label>
                          <Input
                            value={editorTitle}
                            onChange={(e) => setEditorTitle(e.target.value)}
                            placeholder="Ex: Autorização para Cirurgia"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>Conteúdo (corpo do texto)</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={copyContent}
                            disabled={!editorContent}
                          >
                            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                            {copied ? "Copiado!" : "Copiar"}
                          </Button>
                        </div>
                        <TiptapRichText
                          value={editorContent}
                          onChange={setEditorContent}
                          autoApplySizeToken={templateAutoSizeToken}
                          placeholder="Selecione um template ao lado ou digite o conteúdo. Use a barra de ferramentas para formatação."
                          minHeight="320px"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={!canEditDocuments || !editorTitle.trim() || !editorContent.trim()}>
                          {editDocId ? "Salvar alterações" : "Salvar no prontuário"}
                        </Button>
                        <Button type="button" variant="outline" asChild>
                          <Link to={recordLink}>Cancelar</Link>
                        </Button>
                      </div>
                    </form>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="vf-surface-card vf-tone-clinical card-hover sticky top-6 border-border/80">
                <CardHeader className="border-b border-primary/10 bg-card rounded-t-lg">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" /> Modelos cadastrados
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Selecione um modelo cadastrado para preencher com os dados do paciente e tutor. Cabeçalho e rodapé são adicionados na impressão.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2 w-full gap-2" asChild>
                    <Link to="/registrations/document-model">
                      <ExternalLink className="h-4 w-4" /> Cadastrar novo modelo
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {allTemplates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum modelo cadastrado. Cadastre em Cadastros → Modelos de Documento.
                    </p>
                  ) : (
                    allTemplates.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => applyTemplate(t.key)}
                        className="w-full text-left p-3 rounded-lg border border-primary/20 bg-card shadow-sm hover:shadow-md hover:border-primary/50 hover:bg-primary/[0.04] transition-all text-sm"
                      >
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">{t.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{t.type}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <Card className="vf-surface-card vf-tone-clinical card-hover border-border/80">
            <CardHeader>
              <CardTitle className="text-lg">Anexar documento ao prontuário</CardTitle>
              <p className="text-sm text-muted-foreground">
                Envie um arquivo (PDF, imagem ou documento). O documento ficará disponível para visualização e download no prontuário.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do documento *</Label>
                  <Input
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="Ex: Resultado hemograma, Laudo de imagem..."
                    required
                    className="max-w-md"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Arquivo *</Label>
                  <div className="flex flex-col sm:flex-row gap-2 items-start">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                      className="max-w-md"
                    />
                    {uploadFile && (
                      <span className="text-sm text-muted-foreground">
                        {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={!canEditDocuments || uploading || !uploadName.trim() || !uploadFile}>
                    {uploading ? "Enviando..." : "Anexar ao prontuário"}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link to={recordLink}>Cancelar</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </PageShell>
  );
};

export default AddDocumentPage;
