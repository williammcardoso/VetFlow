import { supabase } from "@/integrations/supabase/client";

// O Storage do Supabase rejeita chave com acento ("Invalid key") — nome de
// paciente/tutor com "é", "ã", "ç" etc. quebrava o upload. Remove os acentos
// (NFD + strip de diacríticos) antes de qualquer outra limpeza.
const DIACRITICS_RE = new RegExp("[\\u0300-\\u036f]", "g");

export function sanitizeFileName(name: string): string {
  const semAcento = name.normalize("NFD").replace(DIACRITICS_RE, "");
  return semAcento
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_");
}

/**
 * Sobe o PDF pro Storage SEM engolir o erro (diferente de src/lib/pdfExport.ts
 * persistPdf, que devolve null em qualquer falha — bom o suficiente pros
 * outros PDFs do sistema, mas aqui precisamos saber o motivo real quando dá
 * errado, pra não ficar tentando às cegas).
 */
export async function uploadDocumentPdf(
  blob: Blob,
  fileName: string
): Promise<{ url: string | null; errorMessage: string | null }> {
  try {
    const bucket = "documents";
    const clean = sanitizeFileName(fileName) || "documento.pdf";
    const path = `generated_pdfs/${Date.now()}_${Math.random().toString(36).slice(2, 10)}_${clean}`;
    const file = new File([blob], clean, { type: "application/pdf" });

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: false,
      contentType: "application/pdf",
    });
    if (uploadError) {
      console.error("[documentEmissionApi] uploadDocumentPdf error", uploadError);
      return { url: null, errorMessage: uploadError.message };
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl ?? null, errorMessage: data.publicUrl ? null : "URL pública não disponível." };
  } catch (err: any) {
    console.error("[documentEmissionApi] uploadDocumentPdf exception", err);
    return { url: null, errorMessage: err?.message || "Erro desconhecido ao subir o PDF." };
  }
}

export interface InsertDraftDocumentParams {
  templateVersionId: string;
  atendimentoId: string | null;
  pacienteId: string;
  responsavelId: string;
  vetId: string | null;
  payload: Record<string, unknown>;
  corpoRenderizado: string;
}

/**
 * Grava o documento já como "emitido" (a Etapa 5 ainda não tem rascunho
 * salvo em progresso — o formulário de emissão só grava no banco quando o
 * usuário confirma). numero/hash: numero vem do banco (sequence), então o
 * hash (que inclui o numero) só pode ser calculado DEPOIS deste insert —
 * ver updateDocumentHashAndPdf.
 */
export async function insertEmittedDocument(
  params: InsertDraftDocumentParams
): Promise<{ id: string; numero: number }> {
  const { data, error } = await supabase
    .from("documents")
    .insert({
      template_version_id: params.templateVersionId,
      atendimento_id: params.atendimentoId,
      paciente_id: params.pacienteId,
      responsavel_id: params.responsavelId,
      vet_id: params.vetId,
      payload: params.payload,
      corpo_renderizado: params.corpoRenderizado,
      status: "emitido",
      emitido_em: new Date().toISOString(),
    })
    .select("id, numero")
    .single();

  if (error) {
    console.error("[documentEmissionApi] insertEmittedDocument error", error);
    throw new Error(`Falha ao gravar o documento: ${error.message}`);
  }
  return { id: data.id, numero: data.numero };
}

export async function updateDocumentHashAndPdf(documentId: string, hashSha256: string, pdfPath: string | null): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .update({ hash_sha256: hashSha256, pdf_path: pdfPath })
    .eq("id", documentId);

  if (error) {
    console.error("[documentEmissionApi] updateDocumentHashAndPdf error", error);
    throw new Error(`Documento gravado, mas falhou ao salvar hash/PDF: ${error.message}`);
  }
}

export interface DocumentForPdfRegeneration {
  id: string;
  numero: number;
  status: string;
  hashSha256: string | null;
  corpoRenderizado: string;
  emitidoEm: string | null;
  codigo: string;
  titulo: string;
  vetNome: string;
  vetCrmvLabel: string;
}

/** Tudo que o PDF precisa pra ser regerado (ex.: depois que uma assinatura é coletada) sem precisar reemitir o documento. */
export async function getDocumentForPdfRegeneration(documentId: string): Promise<DocumentForPdfRegeneration | null> {
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, numero, status, hash_sha256, corpo_renderizado, emitido_em, payload, document_template_versions(document_templates(codigo, titulo))"
    )
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    console.error("[documentEmissionApi] getDocumentForPdfRegeneration error", error);
    throw new Error(`Falha ao carregar o documento: ${error.message}`);
  }
  if (!data) return null;

  const row = data as any;
  const payload = (row.payload ?? {}) as { vet?: { nome?: string; crmv?: string; crmv_uf?: string } };
  const vet = payload.vet;

  return {
    id: row.id,
    numero: row.numero,
    status: row.status,
    hashSha256: row.hash_sha256,
    corpoRenderizado: row.corpo_renderizado ?? "",
    emitidoEm: row.emitido_em,
    codigo: row.document_template_versions?.document_templates?.codigo ?? "-",
    titulo: row.document_template_versions?.document_templates?.titulo ?? "Documento",
    vetNome: vet?.nome || "",
    vetCrmvLabel: vet?.crmv_uf && vet?.crmv ? `${vet.crmv_uf}/${vet.crmv}` : vet?.crmv || "",
  };
}

export interface EmittedDocumentSummary {
  id: string;
  numero: number;
  status: string;
  emitidoEm: string | null;
  canceladoEm: string | null;
  motivoCancelamento: string | null;
  pdfPath: string | null;
  hashSha256: string | null;
  templateVersionId: string;
  codigo: string;
  titulo: string;
}

/** Documentos já emitidos para um paciente — usado na timeline do prontuário (Etapa 5, item 5). */
export async function getDocumentsByPatient(pacienteId: string): Promise<EmittedDocumentSummary[]> {
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, numero, status, emitido_em, cancelado_em, motivo_cancelamento, pdf_path, hash_sha256, template_version_id, document_template_versions(template_id, document_templates(codigo, titulo))"
    )
    .eq("paciente_id", pacienteId)
    .order("emitido_em", { ascending: false });

  if (error) {
    console.error("[documentEmissionApi] getDocumentsByPatient error", error);
    throw new Error(`Falha ao carregar documentos do paciente: ${error.message}`);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    numero: row.numero,
    status: row.status,
    emitidoEm: row.emitido_em,
    canceladoEm: row.cancelado_em,
    motivoCancelamento: row.motivo_cancelamento,
    pdfPath: row.pdf_path,
    hashSha256: row.hash_sha256,
    templateVersionId: row.template_version_id,
    codigo: row.document_template_versions?.document_templates?.codigo ?? "-",
    titulo: row.document_template_versions?.document_templates?.titulo ?? "Documento",
  }));
}

/** Cancela um documento (motivo obrigatório) — imutabilidade: nunca edita o corpo, só marca status. */
export async function cancelDocument(documentId: string, motivo: string): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .update({ status: "cancelado", cancelado_em: new Date().toISOString(), motivo_cancelamento: motivo })
    .eq("id", documentId);

  if (error) {
    console.error("[documentEmissionApi] cancelDocument error", error);
    throw new Error(`Falha ao cancelar documento: ${error.message}`);
  }
}
