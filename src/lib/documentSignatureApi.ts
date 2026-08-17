import { supabase } from "@/integrations/supabase/client";

export type SignatureTipo = "responsavel" | "veterinario" | "testemunha";

export interface SaveSignatureInput {
  documentId: string;
  tipo: SignatureTipo;
  nome: string;
  cpf?: string;
  funcao?: string;
  /** Desenhada agora no canvas. */
  dataUrlPng?: string;
  /** Reaproveita a assinatura digital já salva no perfil do usuário (Configurações > Usuário) — não sobe imagem nova, só referencia a existente. */
  imagemSalvaUrl?: string;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*);base64/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function uploadSignatureImage(documentId: string, tipo: SignatureTipo, dataUrlPng: string): Promise<string | null> {
  const blob = dataUrlToBlob(dataUrlPng);
  const path = `signatures/${documentId}/${tipo}_${Date.now()}.png`;
  const { error } = await supabase.storage.from("documents").upload(path, blob, {
    contentType: "image/png",
    upsert: false,
  });
  if (error) {
    console.error("[documentSignatureApi] uploadSignatureImage error", error);
    return null;
  }
  const { data } = supabase.storage.from("documents").getPublicUrl(path);
  return data.publicUrl ?? null;
}

/**
 * IP do signatário não é capturado (exigiria chamar um serviço externo de
 * terceiro a cada assinatura — decisão consciente de não introduzir essa
 * dependência agora). user_agent + timestamp são capturados nativamente,
 * sem custo nem chamada externa.
 */
export async function saveSignature(input: SaveSignatureInput): Promise<void> {
  const usaAssinaturaSalva = !!input.imagemSalvaUrl;
  const imagePath = usaAssinaturaSalva
    ? input.imagemSalvaUrl!
    : input.dataUrlPng
      ? await uploadSignatureImage(input.documentId, input.tipo, input.dataUrlPng)
      : null;

  const { error } = await supabase.from("document_signatures").insert({
    document_id: input.documentId,
    tipo: input.tipo,
    nome: input.nome,
    cpf: input.cpf || null,
    funcao: input.funcao || null,
    metodo: usaAssinaturaSalva ? "fisica_digitalizada" : "canvas",
    assinatura_imagem_path: imagePath,
    assinado_em: new Date().toISOString(),
    ip: null,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });

  if (error) {
    console.error("[documentSignatureApi] saveSignature error", error);
    throw new Error(`Falha ao gravar assinatura de ${input.nome}: ${error.message}`);
  }
}

export async function markDocumentAsSigned(documentId: string): Promise<void> {
  const { error } = await supabase.from("documents").update({ status: "assinado" }).eq("id", documentId);
  if (error) {
    console.error("[documentSignatureApi] markDocumentAsSigned error", error);
    throw new Error(`Assinaturas gravadas, mas falhou ao atualizar o status do documento: ${error.message}`);
  }
}

export interface DocumentSignatureSummary {
  id: string;
  tipo: SignatureTipo;
  nome: string;
  funcao: string | null;
  assinadoEm: string;
  imagemUrl: string | null;
}

export async function getSignaturesByDocument(documentId: string): Promise<DocumentSignatureSummary[]> {
  const { data, error } = await supabase
    .from("document_signatures")
    .select("id, tipo, nome, funcao, assinado_em, assinatura_imagem_path")
    .eq("document_id", documentId)
    .order("assinado_em");

  if (error) {
    console.error("[documentSignatureApi] getSignaturesByDocument error", error);
    throw new Error(`Falha ao carregar assinaturas: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    tipo: row.tipo,
    nome: row.nome,
    funcao: row.funcao,
    assinadoEm: row.assinado_em,
    imagemUrl: row.assinatura_imagem_path,
  }));
}
