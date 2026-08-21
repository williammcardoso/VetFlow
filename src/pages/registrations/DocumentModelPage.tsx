import React, { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { useRegistryList } from "@/hooks/useRegistryList";
import { addRegistryItem, removeRegistryItem, updateRegistryItem } from "@/lib/registryApi";
import { DOCUMENT_TEMPLATES } from "@/constants/documentTemplates";
import TiptapRichText, { TiptapRichTextHandle } from "@/components/TiptapRichText";
import { ChevronDown, FileText, Plus, Trash2, Pencil, Copy, Save, Sparkles, Layers } from "lucide-react";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";

type EditorMode = "new" | "edit";

function plainTextToHtml(text: string): string {
  if (!text) return "";
  if (text.trim().startsWith("<") && text.includes(">")) return text;
  return text
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const DocumentModelPage: React.FC = () => {
  const { list, loading, refetch } = useRegistryList("documentModels");
  const [mode, setMode] = useState<EditorMode>("new");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [variableSearch, setVariableSearch] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const editorRef = useRef<TiptapRichTextHandle>(null);

  const builtInTemplates = useMemo(
    () =>
      Object.entries(DOCUMENT_TEMPLATES).map(([key, value]) => ({
        key,
        title: value.title,
        type: value.type,
        content: plainTextToHtml(value.content),
      })),
    []
  );

  const customTemplates = useMemo(
    () =>
      list.map((item) => ({
        id: item.id,
        title: item.name,
        content: String((item as { template?: string }).template || ""),
      })),
    [list]
  );

  const templateVariables = useMemo(
    () => [
      "{{pet_nome}}",
      "{{pet_especie}}",
      "{{pet_raca}}",
      "{{pet_sexo}}",
      "{{pet_idade}}",
      "{{pet_idade_extensa}}",
      "{{pet_peso}}",
      "{{pet_pelagem}}",
      "{{pet_microchip}}",
      "{{tutor_nome}}",
      "{{tutor_cpf}}",
      "{{tutor_rg}}",
      "{{tutor_telefone}}",
      "{{tutor_endereco}}",
      "{{vet_nome}}",
      "{{vet_crmv}}",
      "{{vet_estado}}",
      "{{cidade}}",
      "{{data}}",
      "{{data_abrev}}",
      "{{data_extenso}}",
      "{{dia}}",
      "{{mes}}",
      "{{ano}}",
      "{{procedimento}}",
      "{{motivo_internacao}}",
      "{{motivo_eutanasia}}",
      "{{tratamento_recusado}}",
      "{{observacoes}}",
      "{{validade}}",
    ],
    []
  );

  const resetEditor = () => {
    setMode("new");
    setEditingId(null);
    setTitle("");
    setTemplate("");
  };

  const loadBuiltInToEditor = (templateKey: string) => {
    const selected = builtInTemplates.find((t) => t.key === templateKey);
    if (!selected) return;
    setMode("new");
    setEditingId(null);
    setTitle(selected.title);
    setTemplate(selected.content);
    toast.success("Modelo pronto carregado no editor.");
  };

  const loadCustomToEditor = (id: string) => {
    const selected = customTemplates.find((t) => t.id === id);
    if (!selected) return;
    setMode("edit");
    setEditingId(selected.id);
    setTitle(selected.title);
    setTemplate(selected.content);
    toast.success("Modelo carregado para edição.");
  };

  const insertVariable = (variable: string) => {
    const inserted = editorRef.current?.insertVariableAtSelection(variable);
    if (inserted) {
      toast.success(`Variável ${variable} inserida.`);
      return;
    }
    setTemplate((prev) => `${prev || ""}${variable}`);
    toast.success(`Variável ${variable} adicionada.`);
  };

  const handleAdd = async () => {
    const name = title.trim();
    const body = template;
    if (!name || !body) {
      toast.error("Preencha nome e template.");
      return;
    }

    if (mode === "edit" && editingId) {
      const ok = await updateRegistryItem("documentModels", editingId, {
        name,
        template: body,
      });
      if (!ok) {
        toast.error("Falha ao atualizar modelo.");
        return;
      }
      toast.success("Modelo atualizado.");
    } else {
      const created = await addRegistryItem("documentModels", { name, template: body });
      if (!created) {
        toast.error("Falha ao salvar modelo.");
        return;
      }
      toast.success("Modelo salvo.");
    }

    resetEditor();
    await refetch();
  };

  const handleRemove = async (id: string) => {
    const ok = await removeRegistryItem("documentModels", id);
    if (!ok) {
      toast.error("Falha ao remover modelo.");
      return;
    }
    toast.success("Modelo removido.");
    await refetch();
  };

  const filteredBuiltIn = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    if (!q) return builtInTemplates;
    return builtInTemplates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q)
    );
  }, [builtInTemplates, templateSearch]);

  const filteredCustom = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    if (!q) return customTemplates;
    return customTemplates.filter((t) => t.title.toLowerCase().includes(q));
  }, [customTemplates, templateSearch]);

  const filteredVariables = useMemo(() => {
    const q = variableSearch.trim().toLowerCase();
    if (!q) return templateVariables;
    return templateVariables.filter((v) => v.toLowerCase().includes(q));
  }, [templateVariables, variableSearch]);

  return (
    <PageShell>
      <PageHeader
        title="Modelos de Documento"
        description="Biblioteca de templates prontos e editor avançado para documentos clínicos."
        icon={FileText}
        module="registry"
        breadcrumb={<>Painel &gt; Cadastros &gt; Modelos de documento</>}
        actions={<Badge variant="secondary">{list.length} modelo(s)</Badge>}
      />

      <SectionCard
        title="Editor de modelo"
        description="Crie e atualize modelos com variáveis dinâmicas para preenchimento automático."
        icon={FileText}
        tone="registry"
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="space-y-6 min-w-0">
            <Card className="vf-surface-card vf-tone-registry card-hover border-primary/20 bg-card">
            <CardHeader>
              <CardTitle className="text-base flex flex-wrap items-center justify-between gap-2">
                <span>{mode === "edit" ? "Editar modelo" : "Novo modelo"}</span>
                <div className="flex items-center gap-2">
                  <Popover open={libraryOpen} onOpenChange={setLibraryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="border-violet-400/60 bg-violet-100/75 text-violet-700 hover:bg-violet-200/80"
                      >
                        <Layers className="mr-2 h-4 w-4" />
                        Biblioteca de modelos
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      sideOffset={8}
                      className="w-[min(92vw,560px)] border-violet-500/60 bg-violet-100/85 p-0"
                    >
                      <div className="rounded-xl border border-violet-500/70 bg-violet-100/85">
                        <div className="rounded-t-xl bg-violet-100/95 p-3">
                          <p className="mb-2 flex items-center gap-2 text-base font-semibold text-violet-700">
                            <Layers className="h-4 w-4" /> Biblioteca de modelos
                          </p>
                          <Input
                            placeholder="Buscar modelo..."
                            value={templateSearch}
                            onChange={(e) => setTemplateSearch(e.target.value)}
                            className="bg-white"
                          />
                        </div>
                        <div className="bg-violet-100/70 p-3">
                          <Tabs defaultValue="custom" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="custom">Cadastrados</TabsTrigger>
                              <TabsTrigger value="ready">Prontos</TabsTrigger>
                            </TabsList>
                            <TabsContent value="custom" className="mt-3">
                              {loading ? (
                                <p className="text-sm text-muted-foreground">Carregando...</p>
                              ) : filteredCustom.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Nenhum modelo cadastrado.</p>
                              ) : (
                                <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
                                  {filteredCustom.map((item) => (
                                    <div key={item.id} className="rounded-md border border-violet-300/55 bg-white p-3 shadow-sm">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-medium">{item.title}</p>
                                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                            {item.content.replace(/<[^>]*>/g, "").trim()}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-violet-600 hover:bg-violet-100/80"
                                            onClick={() => {
                                              loadCustomToEditor(item.id);
                                              setLibraryOpen(false);
                                            }}
                                            aria-label={`Editar modelo ${item.title}`}
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-600 hover:bg-red-100"
                                            onClick={() => handleRemove(item.id)}
                                            aria-label={`Excluir modelo ${item.title}`}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </TabsContent>
                            <TabsContent value="ready" className="mt-3">
                              <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
                                {filteredBuiltIn.map((item) => (
                                  <div key={item.key} className="rounded-md border border-violet-300/45 bg-white p-3 shadow-sm">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium">{item.title}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">{item.type}</p>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-vf-registry hover:bg-[hsl(var(--vf-registry))]/15"
                                        onClick={() => {
                                          loadBuiltInToEditor(item.key);
                                          setLibraryOpen(false);
                                        }}
                                        aria-label={`Usar modelo pronto ${item.title} no editor`}
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {mode === "edit" && (
                    <Badge variant="outline">Edição</Badge>
                  )}
                  {mode === "edit" && (
                    <Button variant="outline" onClick={resetEditor} className="hidden md:inline-flex">
                      Cancelar
                    </Button>
                  )}
                  <Button
                    onClick={handleAdd}
                    className="hidden md:inline-flex"
                    disabled={!title.trim() || !template.trim()}
                  >
                    {mode === "edit" ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                    {mode === "edit" ? "Atualizar modelo" : "Salvar modelo"}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="document-model-title" className="text-xs">Nome do modelo</Label>
                <Input
                  id="document-model-title"
                  placeholder="Ex.: Atestado de saúde"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <TiptapRichText
                ref={editorRef}
                value={template}
                onChange={setTemplate}
                placeholder="Escreva o template do documento..."
                minHeight="320px"
              />
              <div className="flex flex-wrap justify-end gap-2 md:hidden">
                {mode === "edit" && (
                  <Button variant="outline" onClick={resetEditor}>
                    Cancelar edição
                  </Button>
                )}
                <Button onClick={handleAdd}>
                  {mode === "edit" ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  {mode === "edit" ? "Atualizar modelo" : "Salvar modelo"}
                </Button>
              </div>
            </CardContent>
            </Card>
          </div>

          <Card className="vf-surface-card vf-tone-registry no-card-lift border-[hsl(var(--vf-registry)/0.5)] lg:sticky lg:top-24 lg:self-start">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-[hsl(var(--vf-registry))]">
                <Sparkles /> Variáveis disponíveis
              </CardTitle>
              <Input
                placeholder="Buscar variável..."
                value={variableSearch}
                onChange={(e) => setVariableSearch(e.target.value)}
              />
            </CardHeader>
            <CardContent>
              <div className="max-h-[430px] xl:max-h-[480px] overflow-auto pr-1 space-y-2">
                {filteredVariables.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="w-full text-left rounded-md border border-[hsl(var(--vf-registry)/0.35)] bg-card px-3 py-2 text-sm font-medium hover:bg-[hsl(var(--vf-registry)/0.08)] transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </SectionCard>
    </PageShell>
  );
};

export default DocumentModelPage;