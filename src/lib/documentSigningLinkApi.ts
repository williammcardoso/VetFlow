import { supabase } from "@/integrations/supabase/client";

export interface DocumentForSigning {
  id: string;
  numero: number;
  codigo: string;
  titulo: string;
  corpoRenderizado: string;
  status: string;
  respNome: string;
  respCpf: string;
  jaTemAssinaturaResponsavel: boolean;
  jaTemAssinaturaVeterinario: boolean;
  exigeAssinaturaResponsavel: boolean;
}

/**
 * Usado pela página pública /assinar/:documentId (link enviado ao
 * responsável, ex.: por WhatsApp). Mesmo nível de confiança de qualquer link
 * compartilhado: quem tiver o link vê o texto do documento e pode assinar
 * como responsável — não tem senha nem confirmação de identidade além da
 * assinatura em si. `documents`/`document_signatures` já são `allow_all`
 * (Etapa 1) para o app inteiro, então essa consulta não abre nada que o
 * anon key já não pudesse acessar.
 */
export async function getDocumentForSigning(documentId: string): Promise<DocumentForSigning | null> {
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, numero, status, payload, corpo_renderizado, document_template_versions(exige_assinatura_responsavel, document_templates(codigo, titulo))"
    )
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    console.error("[documentSigningLinkApi] getDocumentForSigning error", error);
    throw new Error("Falha ao carregar o documento.");
  }
  if (!data) return null;

  const { data: signatures, error: sigError } = await supabase
    .from("document_signatures")
    .select("tipo")
    .eq("document_id", documentId);
  if (sigError) {
    console.error("[documentSigningLinkApi] getDocumentForSigning (signatures) error", sigError);
  }

  const row = data as any;
  const payload = (row.payload ?? {}) as { resp?: { nome?: string; cpf?: string } };

  return {
    id: row.id,
    numero: row.numero,
    codigo: row.document_template_versions?.document_templates?.codigo ?? "-",
    titulo: row.document_template_versions?.document_templates?.titulo ?? "Documento",
    corpoRenderizado: row.corpo_renderizado ?? "",
    status: row.status,
    respNome: payload.resp?.nome ?? "",
    respCpf: payload.resp?.cpf ?? "",
    jaTemAssinaturaResponsavel: (signatures ?? []).some((s: any) => s.tipo === "responsavel"),
    jaTemAssinaturaVeterinario: (signatures ?? []).some((s: any) => s.tipo === "veterinario"),
    exigeAssinaturaResponsavel: row.document_template_versions?.exige_assinatura_responsavel ?? true,
  };
}
