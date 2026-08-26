import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { FileSignature, ArrowLeft, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useClientWithAnimals } from "@/hooks/useSupabaseClients";
import { getPatientRecordPath } from "@/utils/patientDisplayId";
import { useAppointments } from "@/hooks/useAppointments";
import { useDocumentTemplates, useDocumentTemplateVersion } from "@/hooks/useDocumentTemplates";
import { getMyUserProfile } from "@/lib/authApi";
import { getCompanySettings } from "@/lib/settingsApi";
import { buildAutoDocumentContext, mergeManualFields } from "@/lib/documentContextBuilder";
import { renderDocumentTemplate } from "@/lib/documentTemplateEngine";
import { computeDocumentHash } from "@/lib/documentHash";
import { generateQrCodeDataUrl } from "@/lib/qrCode";
import { createPdfBlob } from "@/lib/pdfExport";
import { insertEmittedDocument, updateDocumentHashAndPdf, uploadDocumentPdf } from "@/lib/documentEmissionApi";
import DocumentTemplatePdfContent from "@/components/DocumentTemplatePdfContent";
import DocumentSignaturePanel from "@/components/DocumentSignaturePanel";
import { useAuth } from "@/contexts/AuthContext";
import type { DocumentTemplateGroup } from "@/types/documentTemplate";

const GROUP_LABEL: Record<DocumentTemplateGroup, string> = {
  atestados: "Grupo A — Atestados e Declarações",
  consentimento: "Grupo B — Termos de Consentimento (TCLE)",
  recusa: "Grupo C — Recusa / Não Aceite",
  administrativo: "Grupo D — Complementares e Administrativos",
};
const GROUP_ORDER: DocumentTemplateGroup[] = ["atestados", "consentimento", "recusa", "administrativo"];

// Rótulo do campo de preenchimento fica mais legível "quebrando" o caminho
// {{escopo.campo}} em algo tipo "atend · diagnóstico".
function labelForPath(caminho: string): string {
  const [escopo, ...resto] = caminho.split(".");
  return `${escopo} · ${resto.join(".").replace(/_/g, " ")}`;
}

const EmitDocumentPage: React.FC = () => {
  const { clientId, animalId } = useParams<{ clientId: string; animalId: string }>();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const { data: client, isLoading: loadingClient } = useClientWithAnimals(clientId);
  const animal = useMemo(() => client?.animals.find((a) => a.id === animalId), [client, animalId]);
  const { appointments, loading: loadingAppointments } = useAppointments(animalId);
  const appointment = useMemo(
    () => (appointmentId ? appointments.find((a) => a.id === appointmentId) : undefined),
    [appointments, appointmentId]
  );

  const { data: vetProfile, isLoading: loadingVet } = useQuery({
    queryKey: ["my-user-profile-for-document"],
    queryFn: getMyUserProfile,
    staleTime: 1000 * 60,
  });
  const { data: company, isLoading: loadingCompany } = useQuery({
    queryKey: ["company-settings-for-document"],
    queryFn: getCompanySettings,
    staleTime: 1000 * 60,
  });

  const { data: templates, isLoading: loadingTemplates } = useDocumentTemplates();
  const [selectedCodigo, setSelectedCodigo] = useState<string>("");
  const template = useMemo(() => templates?.find((t) => t.codigo === selectedCodigo) ?? null, [templates, selectedCodigo]);
  const { data: versao, isLoading: loadingVersao } = useDocumentTemplateVersion(template?.id ?? null);

  const [manualFields, setManualFields] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [emitting, setEmitting] = useState(false);
  const [resultado, setResultado] = useState<{
    id: string;
    numero: number;
    url: string | null;
    corpoRenderizado: string;
    emitidoEm: Date;
  } | null>(null);
  const [retrying, setRetrying] = useState(false);
  // Texto final, editável à mão antes de emitir — necessário porque muitos
  // modelos têm checkbox "( )" e linhas de reticências "......." que não são
  // {{variável}} nenhuma (não têm como virar campo de formulário genérico);
  // o jeito de marcar essas opções é editando o texto final diretamente.
  // null = ainda não editado manualmente, usa o texto calculado automático.
  const [textoManual, setTextoManual] = useState<string | null>(null);

  useEffect(() => {
    setManualFields({});
    setResultado(null);
    setTextoManual(null);
  }, [selectedCodigo]);

  const autoContext = useMemo(() => {
    if (!animal || !client) return null;
    return buildAutoDocumentContext({
      animal,
      client,
      vetProfile: vetProfile ?? null,
      company: company ?? { companyName: "", razaoSocial: "", cnpj: "", crmv: "", mapaRegistration: "", address: "", city: "", zipCode: "", phone: "", email: "" },
      atendimentoData: appointment?.date,
      atendimentoHora: appointment?.time,
    });
  }, [animal, client, vetProfile, company, appointment]);

  const contextoFinal = useMemo(() => (autoContext ? mergeManualFields(autoContext, manualFields) : null), [autoContext, manualFields]);

  const preview = useMemo(() => {
    if (!versao || !contextoFinal) return null;
    return renderDocumentTemplate(versao.corpo, contextoFinal);
  }, [versao, contextoFinal]);

  // Calculado só a partir do contexto AUTOMÁTICO (sem manualFields de propósito):
  // é a lista de campos a mostrar no formulário, e não pode encolher conforme o
  // usuário digita — senão o campo que acabou de ganhar valor desaparece da tela
  // no meio da digitação (a variável sai da lista de pendências assim que tem
  // qualquer valor). "podeEmitir"/o preview continuam usando `preview`, que
  // reflete o que falta de verdade a cada instante.
  const camposParaPreencher = useMemo(() => {
    if (!versao || !autoContext) return [];
    return renderDocumentTemplate(versao.corpo, autoContext).variaveisPendentes;
  }, [versao, autoContext]);

  const textoFinalParaEmitir = textoManual ?? preview?.texto ?? "";
  const aindaTemPendencia = textoFinalParaEmitir.includes("[[PENDENTE:");
  const podeEmitir = !!(template && versao && preview && !aindaTemPendencia && contextoFinal);

  // Gera o PDF, sobe pro Storage e salva hash+pdf_path — extraído à parte pra
  // poder ser chamado de novo (botão "Tentar novamente") sem reemitir o
  // documento quando só o upload do PDF falhou. Separa "PDF não renderizou"
  // de "upload falhou" e devolve o motivo real (não engole erro).
  const gerarEUploadPdf = async (params: {
    documentId: string;
    numero: number;
    corpoRenderizado: string;
    emitidoEm: Date;
  }): Promise<{ url: string | null; errorMessage: string | null }> => {
    if (!template) return { url: null, errorMessage: "Modelo não carregado." };

    const hash = await computeDocumentHash({
      numero: params.numero,
      templateCodigo: template.codigo,
      templateVersao: versao!.versao,
      emitidoEm: params.emitidoEm.toISOString(),
      corpoRenderizado: params.corpoRenderizado,
    });
    const qrDataUrl = await generateQrCodeDataUrl(`${window.location.origin}/validar/${hash}`);

    let blob: Blob;
    try {
      const vetContext = contextoFinal?.vet as { nome?: string; crmv?: string; crmv_uf?: string } | undefined;
      blob = await createPdfBlob(
        <DocumentTemplatePdfContent
          codigo={template.codigo}
          titulo={template.titulo}
          numero={params.numero}
          corpoRenderizado={params.corpoRenderizado}
          status="emitido"
          via="responsavel"
          emitidoEm={params.emitidoEm}
          hash={hash}
          qrDataUrl={qrDataUrl}
          vetNome={vetContext?.nome}
          vetCrmv={vetContext?.crmv_uf && vetContext?.crmv ? `${vetContext.crmv_uf}/${vetContext.crmv}` : vetContext?.crmv}
        />
      );
    } catch (err: any) {
      console.error("[EmitDocumentPage] createPdfBlob falhou", err);
      // Hash já foi calculado com sucesso — salva mesmo sem PDF, senão perde o cálculo.
      await updateDocumentHashAndPdf(params.documentId, hash, null);
      return { url: null, errorMessage: `Falha ao montar o PDF: ${err?.message || "erro desconhecido"}` };
    }

    const { url, errorMessage } = await uploadDocumentPdf(blob, `${template.codigo}_${animal?.name}_${params.numero}.pdf`);
    // Salva o hash sempre — mesmo se o upload do PDF falhar, o documento já
    // está emitido e o hash já foi calculado; não faz sentido perdê-lo.
    await updateDocumentHashAndPdf(params.documentId, hash, url);
    return { url, errorMessage };
  };

  const handleEmitir = async () => {
    if (!template || !versao || !contextoFinal || !animal || !client) return;
    const corpoRenderizado = textoFinalParaEmitir;
    if (corpoRenderizado.includes("[[PENDENTE:")) {
      toast.error("Ainda há variáveis pendentes.");
      return;
    }

    setEmitting(true);
    try {
      const { id, numero } = await insertEmittedDocument({
        templateVersionId: versao.id,
        atendimentoId: appointmentId ?? null,
        pacienteId: animal.id,
        responsavelId: client.id,
        vetId: session?.id ?? null,
        payload: contextoFinal as Record<string, unknown>,
        corpoRenderizado,
      });

      const emitidoEm = new Date();
      const { url, errorMessage } = await gerarEUploadPdf({ documentId: id, numero, corpoRenderizado, emitidoEm });

      await queryClient.invalidateQueries({ queryKey: ["patient-documents", animal.id] });
      if (url) {
        toast.success(`Documento nº ${numero} emitido.`);
      } else {
        toast.warning(`Documento nº ${numero} emitido, mas o PDF falhou: ${errorMessage || "motivo desconhecido"}. Tente novamente pelo botão abaixo.`);
      }
      setResultado({ id, numero, url, corpoRenderizado, emitidoEm });
      setConfirmOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Falha ao emitir o documento.");
    } finally {
      setEmitting(false);
    }
  };

  const handleTentarPdfNovamente = async () => {
    if (!resultado) return;
    setRetrying(true);
    try {
      const { url, errorMessage } = await gerarEUploadPdf({
        documentId: resultado.id,
        numero: resultado.numero,
        corpoRenderizado: resultado.corpoRenderizado,
        emitidoEm: resultado.emitidoEm,
      });
      if (url) {
        toast.success("PDF gerado com sucesso.");
        setResultado({ ...resultado, url });
      } else {
        toast.error(`Ainda não foi possível gerar o PDF: ${errorMessage || "motivo desconhecido"}.`);
      }
    } catch (err: any) {
      toast.error(err.message || "Falha ao gerar o PDF.");
    } finally {
      setRetrying(false);
    }
  };

  const loading = loadingClient || loadingAppointments || loadingVet || loadingCompany || loadingTemplates;

  if (loading) {
    return (
      <PageShell>
        <PageHeader title="Emitir documento" icon={FileSignature} module="clinical" />
        <SectionCard title="Carregando..." icon={FileSignature} tone="clinical">
          <Skeleton className="h-64 w-full" />
        </SectionCard>
      </PageShell>
    );
  }

  if (!client || !animal) {
    return (
      <PageShell>
        <PageHeader title="Emitir documento" icon={FileSignature} module="clinical" />
        <Alert variant="destructive">
          <AlertTitle>Paciente ou responsável não encontrado</AlertTitle>
        </Alert>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Emitir termo/atestado"
        description={`${animal.name} · ${client.name}`}
        icon={FileSignature}
        module="clinical"
        breadcrumb={<>Painel &gt; Clientes &gt; {client.name} &gt; {animal.name} &gt; Emitir documento</>}
        actions={
          <Button asChild variant="outline">
            <Link to={`${getPatientRecordPath(clientId, animalId, animal?.patientCode)}?tab=documents`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao prontuário
            </Link>
          </Button>
        }
      />

      <SectionCard title="1. Escolha o modelo" icon={FileSignature} tone="clinical">
        <Select value={selectedCodigo} onValueChange={setSelectedCodigo}>
          <SelectTrigger className="max-w-lg">
            <SelectValue placeholder="Selecione um modelo da biblioteca..." />
          </SelectTrigger>
          <SelectContent>
            {GROUP_ORDER.map((grupo) => {
              const items = (templates ?? []).filter((t) => t.grupo === grupo);
              if (items.length === 0) return null;
              return (
                <SelectGroup key={grupo}>
                  <SelectLabel>{GROUP_LABEL[grupo]}</SelectLabel>
                  {items.map((t) => (
                    <SelectItem key={t.codigo} value={t.codigo}>
                      {t.codigo} — {t.titulo}
                    </SelectItem>
                  ))}
                </SelectGroup>
              );
            })}
          </SelectContent>
        </Select>
      </SectionCard>

      {selectedCodigo && loadingVersao && (
        <SectionCard title="Carregando modelo..." icon={FileSignature} tone="clinical">
          <Skeleton className="h-40 w-full" />
        </SectionCard>
      )}

      {template && versao && preview && contextoFinal && (
        <>
          <SectionCard
            title="2. Dados preenchidos automaticamente"
            description="Vêm do cadastro do paciente, do responsável, do seu perfil e das configurações da clínica."
            icon={FileSignature}
            tone="clinical"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">PACIENTE</p>
                <p className="font-medium">{animal.name}</p>
                <p className="text-muted-foreground">{animal.species} · {animal.breed} · {animal.gender}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">RESPONSÁVEL</p>
                <p className="font-medium">{client.name}</p>
                <p className="text-muted-foreground">{client.identificationNumber || "CPF não cadastrado"}</p>
              </div>
            </div>
          </SectionCard>

          {camposParaPreencher.length > 0 && (
            <SectionCard
              title="3. Complete os dados que faltam"
              description="Esses campos não vêm de nenhum cadastro — preencha pra liberar a emissão. Uma linha por item se o campo aceitar lista (ex.: exames)."
              icon={FileSignature}
              tone="clinical"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {camposParaPreencher.map((caminho) => {
                  const aindaPendente = preview.variaveisPendentes.includes(caminho);
                  return (
                    <div key={caminho} className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {labelForPath(caminho)}
                        {!aindaPendente && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                      </label>
                      <Textarea
                        value={manualFields[caminho] ?? ""}
                        onChange={(e) => setManualFields((prev) => ({ ...prev, [caminho]: e.target.value }))}
                        className="min-h-[70px] rounded-lg border-border bg-input text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          <SectionCard
            title="4. Preview — pode editar antes de emitir"
            description='Marque as opções "( )" trocando por "(X)" e preencha as linhas de reticências direto no texto abaixo — é assim que checkboxes e campos específicos de cada modelo (ex.: classificação ASA, tipo de anestesia) são preenchidos, já que variam demais de modelo pra modelo pra virar formulário.'
            icon={FileSignature}
            tone="clinical"
          >
            <Textarea
              value={textoFinalParaEmitir}
              onChange={(e) => setTextoManual(e.target.value)}
              className="min-h-[420px] max-h-[420px] overflow-y-auto rounded-lg border-border bg-muted/30 font-mono text-xs leading-relaxed"
              spellCheck={false}
            />
            <div className="mt-4 flex justify-between">
              {textoManual !== null && (
                <Button variant="ghost" size="sm" onClick={() => setTextoManual(null)}>
                  Desfazer edições e voltar ao texto automático
                </Button>
              )}
              <div className="flex-1" />
              <Button onClick={() => setConfirmOpen(true)} disabled={!podeEmitir}>
                <FileSignature className="mr-2 h-4 w-4" /> Emitir documento
              </Button>
            </div>
          </SectionCard>
        </>
      )}

      {resultado && (
        <SectionCard title="Documento emitido" icon={CheckCircle2} tone="clinical">
          <div className="mb-4 flex items-center gap-3 text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>Documento nº {resultado.numero} emitido com sucesso.</span>
            {resultado.url ? (
              <Button asChild variant="outline" size="sm">
                <a href={resultado.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Abrir PDF
                </a>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleTentarPdfNovamente} disabled={retrying}>
                {retrying ? "Gerando..." : "Tentar gerar PDF novamente"}
              </Button>
            )}
          </div>

          {versao && contextoFinal && (
            <DocumentSignaturePanel
              documentId={resultado.id}
              exigeAssinaturaResponsavel={versao.exigeAssinaturaResponsavel}
              exigeTestemunhas={versao.exigeTestemunhas}
              respNome={client.name}
              respCpf={client.identificationNumber}
              vetNome={(contextoFinal.vet as { nome?: string })?.nome || ""}
              vetCrmvLabel={(() => {
                const v = contextoFinal.vet as { crmv?: string; crmv_uf?: string } | undefined;
                return v?.crmv_uf && v?.crmv ? `${v.crmv_uf}/${v.crmv}` : v?.crmv;
              })()}
              vetImagemSalva={vetProfile?.signature_url || undefined}
              onSigned={() => {
                // Manter o link do PDF sincronizado nesta própria tela se mostrou
                // pouco confiável (dependia do estado local atualizar certinho);
                // a timeline do prontuário já busca o pdf_path direto do banco
                // toda vez, então é mais simples (e foi o que o usuário pediu)
                // mandar pra lá em vez de tentar manter um botão aqui.
                queryClient.invalidateQueries({ queryKey: ["patient-documents", animal.id] });
                toast.success("Assinaturas concluídas.");
                navigate(`${getPatientRecordPath(clientId, animalId, animal?.patientCode)}?tab=documents`);
              }}
            />
          )}
        </SectionCard>
      )}

      <Dialog open={confirmOpen} onOpenChange={(open) => !emitting && setConfirmOpen(open)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar emissão</DialogTitle>
            <DialogDescription>
              Depois de emitido, o documento fica imutável — qualquer correção exige cancelar (com motivo) e emitir de
              novo. Confirma a emissão de "{template?.titulo}" para {animal.name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={emitting}>
              Cancelar
            </Button>
            <Button onClick={handleEmitir} disabled={emitting}>
              {emitting ? "Emitindo..." : "Confirmar emissão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default EmitDocumentPage;
