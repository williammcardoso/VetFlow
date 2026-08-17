import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { diffLines, type Change } from "diff";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, PenSquare, Save } from "lucide-react";
import { toast } from "sonner";
import { useDocumentTemplates, useDocumentTemplateVersion } from "@/hooks/useDocumentTemplates";
import { publishDocumentTemplateVersion } from "@/lib/documentTemplatesApi";
import { renderDocumentTemplate, extractTemplateVariables } from "@/lib/documentTemplateEngine";
import { useAuth } from "@/contexts/AuthContext";

// Referência das variáveis padrão (seção 3 da biblioteca) — mostrada como
// consulta, não é uma lista fechada (um modelo pode usar qualquer caminho
// {{escopo.campo}}, resolvido em tempo de emissão pelo motor da Etapa 3).
const VARIABLE_REFERENCE: Record<string, string[]> = {
  estab: ["razao_social", "nome_fantasia", "cnpj", "crmv_pj", "endereco", "cidade", "uf", "telefone", "email", "logo_url"],
  vet: ["nome", "crmv", "crmv_uf", "cpf", "especialidade", "endereco", "telefone", "email", "assinatura_url"],
  resp: ["nome", "cpf", "rg", "endereco", "cidade", "uf", "cep", "telefone", "email"],
  pac: ["nome", "especie", "raca", "sexo", "castrado", "idade", "data_nascimento", "pelagem", "peso", "microchip", "resenha"],
  atend: ["numero", "data", "hora", "hora_entrada", "hora_saida", "diagnostico", "diagnostico_presuntivo", "prognostico", "procedimento", "medicamentos", "observacoes"],
  doc: ["numero", "hash", "local", "data_extenso", "qr_validacao"],
};

// Os 4 blocos reutilizáveis que o motor de template (Etapa 3) reconhece
// entre colchetes — diferente de {{escopo.campo}}, cada um expande pra um
// trecho pronto (com seus próprios campos já resolvidos).
const BLOCO_REFERENCE: { token: string; descricao: string }[] = [
  { token: "[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]", descricao: "Nome, espécie, raça, sexo, idade, peso, pelagem, microchip, resenha" },
  { token: "[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]", descricao: "Nome, CPF, RG, endereço, cidade/UF, CEP, telefone, e-mail" },
  { token: "[BLOCO DE ASSINATURAS]", descricao: "Data/local + assinatura do responsável e do veterinário" },
  { token: "[BLOCO DE ASSINATURA DO MÉDICO-VETERINÁRIO]", descricao: "Data/local + assinatura só do veterinário (ex.: atestados)" },
];

function copyToClipboard(texto: string) {
  navigator.clipboard.writeText(texto).then(
    () => toast.success("Copiado — cole no texto do modelo."),
    () => toast.error("Não foi possível copiar.")
  );
}

function DiffView({ before, after }: { before: string; after: string }) {
  const changes: Change[] = useMemo(() => diffLines(before, after), [before, after]);
  const houveMudanca = changes.some((c) => c.added || c.removed);

  if (!houveMudanca) {
    return <p className="text-sm text-muted-foreground">Nenhuma alteração no texto.</p>;
  }

  return (
    <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
      {changes.map((change, i) => (
        <span
          key={i}
          className={
            change.added
              ? "block bg-emerald-100 text-emerald-800"
              : change.removed
                ? "block bg-red-100 text-red-800 line-through"
                : "block text-muted-foreground"
          }
        >
          {change.value}
        </span>
      ))}
    </pre>
  );
}

const DocumentTemplateEditorPage: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const { data: templates, isLoading: loadingTemplates } = useDocumentTemplates();
  const template = useMemo(() => templates?.find((t) => t.codigo === codigo) ?? null, [templates, codigo]);
  const { data: versao, isLoading: loadingVersao, isError } = useDocumentTemplateVersion(template?.id ?? null);

  const [corpo, setCorpo] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (versao) setCorpo(versao.corpo);
  }, [versao]);

  const variaveisUsadas = useMemo(() => extractTemplateVariables(corpo), [corpo]);
  const preview = useMemo(() => renderDocumentTemplate(corpo, {}), [corpo]);
  const alterado = versao ? corpo !== versao.corpo : false;

  const handlePublish = async () => {
    if (!template) return;
    setPublishing(true);
    try {
      await publishDocumentTemplateVersion({
        templateId: template.id,
        novoCorpo: corpo,
        publicadoPor: session?.id ?? null,
      });
      await queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      await queryClient.invalidateQueries({ queryKey: ["document-template-version", template.id] });
      toast.success(`Nova versão do modelo ${template.codigo} publicada.`);
      setConfirmOpen(false);
      navigate("/registrations/document-library");
    } catch (err: any) {
      toast.error(err.message || "Falha ao publicar nova versão.");
    } finally {
      setPublishing(false);
    }
  };

  const loading = loadingTemplates || loadingVersao;

  return (
    <PageShell>
      <PageHeader
        title={template ? `Editar modelo ${template.codigo}` : "Editar modelo"}
        description={template?.titulo}
        icon={PenSquare}
        module="registry"
        breadcrumb={<>Painel &gt; Cadastros &gt; Biblioteca de Documentos &gt; Editar</>}
        actions={
          <Button asChild variant="outline">
            <Link to="/registrations/document-library">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Link>
          </Button>
        }
      />

      {!loading && !template && (
        <Alert variant="destructive">
          <AlertTitle>Modelo não encontrado</AlertTitle>
          <AlertDescription>Não existe nenhum modelo com o código "{codigo}".</AlertDescription>
        </Alert>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Falha ao carregar o texto atual do modelo</AlertTitle>
        </Alert>
      )}

      {loading ? (
        <SectionCard title="Carregando..." icon={PenSquare} tone="registry">
          <Skeleton className="h-64 w-full" />
        </SectionCard>
      ) : template && versao ? (
        <>
          <SectionCard
            title={`Versão atual: v${versao.versao}`}
            description="Editar o corpo cria uma NOVA versão — a versão publicada atual nunca é sobrescrita nem apagada. Documentos já emitidos continuam mostrando o texto de quando foram emitidos."
            icon={PenSquare}
            tone="registry"
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Corpo do modelo</p>
                <Textarea
                  value={corpo}
                  onChange={(e) => setCorpo(e.target.value)}
                  className="min-h-[420px] rounded-lg border-border bg-input font-mono text-xs leading-relaxed"
                  spellCheck={false}
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Preview (blocos expandidos — variáveis aparecem como pendência, já que não há paciente real neste contexto)
                </p>
                <pre className="min-h-[420px] max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
                  {preview.texto}
                </pre>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={() => setConfirmOpen(true)} disabled={!alterado}>
                <Save className="mr-2 h-4 w-4" /> Publicar nova versão
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            title="Variáveis"
            description="Variáveis usadas neste modelo e referência dos campos disponíveis por escopo."
            icon={PenSquare}
            tone="registry"
          >
            <div className="mb-4">
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Usadas neste modelo ({variaveisUsadas.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {variaveisUsadas.length === 0 && <span className="text-sm text-muted-foreground">Nenhuma.</span>}
                {variaveisUsadas.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => copyToClipboard(`{{${v}}}`)}
                    title="Clique para copiar"
                    className="rounded-md border border-teal-300 bg-teal-100 px-2 py-1 font-mono text-xs font-semibold text-teal-900 transition-colors hover:bg-teal-200"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Blocos reutilizáveis</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {BLOCO_REFERENCE.map((bloco) => (
                  <button
                    key={bloco.token}
                    type="button"
                    onClick={() => copyToClipboard(bloco.token)}
                    title="Clique para copiar"
                    className="rounded-lg border border-violet-300 bg-violet-100 p-2.5 text-left transition-colors hover:bg-violet-200"
                  >
                    <p className="font-mono text-xs font-semibold text-violet-900">{bloco.token}</p>
                    <p className="mt-0.5 text-xs text-violet-800/80">{bloco.descricao}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Referência por escopo</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(VARIABLE_REFERENCE).map(([escopo, campos]) => (
                  <div key={escopo} className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="mb-1.5 font-mono text-xs font-bold text-teal-800">{escopo}</p>
                    <div className="flex flex-wrap gap-1">
                      {campos.map((campo) => (
                        <button
                          key={campo}
                          type="button"
                          onClick={() => copyToClipboard(`{{${escopo}.${campo}}}`)}
                          title="Clique para copiar"
                          className="rounded bg-card px-1.5 py-0.5 font-mono text-xs font-medium text-foreground/80 ring-1 ring-inset ring-border transition-colors hover:bg-teal-50 hover:text-teal-900"
                        >
                          {`{{${escopo}.${campo}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={(open) => !publishing && setConfirmOpen(open)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirmar publicação da versão {versao ? versao.versao + 1 : ""}</DialogTitle>
            <DialogDescription>
              A versão {versao?.versao} continua existindo e é a que aparece nos documentos já emitidos. Confira as
              mudanças antes de confirmar.
            </DialogDescription>
          </DialogHeader>

          {versao && <DiffView before={versao.corpo} after={corpo} />}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={publishing}>
              Cancelar
            </Button>
            <Button onClick={handlePublish} disabled={publishing}>
              {publishing ? "Publicando..." : "Confirmar e publicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default DocumentTemplateEditorPage;
