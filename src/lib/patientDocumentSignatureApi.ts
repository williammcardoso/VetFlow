import { supabase } from "@/integrations/supabase/client";

export type PatientDocSignatureTipo = "veterinario" | "responsavel";

export interface SavePatientDocumentSignatureInput {
  patientDocumentId: string;
  tipo: PatientDocSignatureTipo;
  nome: string;
  cpf?: string;
  funcao?: string;
  /** Desenhada agora no canvas. */
  dataUrlPng?: string;
  /** Reaproveita a assinatura salva no perfil do usuário (Configurações > Usuário). */
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

async function uploadSignatureImage(patientDocumentId: string, tipo: string, dataUrlPng: string): Promise<string | null> {
  const blob = dataUrlToBlob(dataUrlPng);
  const path = `patient-document-signatures/${patientDocumentId}/${tipo}_${Date.now()}.png`;
  const { error } = await supabase.storage.from("documents").upload(path, blob, {
    contentType: "image/png",
    upsert: false,
  });
  if (error) {
    console.error("[patientDocumentSignatureApi] uploadSignatureImage error", error);
    return null;
  }
  const { data } = supabase.storage.from("documents").getPublicUrl(path);
  return data.publicUrl ?? null;
}

/**
 * Grava (ou substitui, se essa pessoa já tinha assinado esse documento) a
 * assinatura de um papel (veterinário/responsável) num documento livre. Sem
 * "regenerar PDF" depois — o PDF desses documentos já é montado na hora
 * (DocumentPdfContent) buscando as assinaturas existentes toda vez.
 */
export async function savePatientDocumentSignature(input: SavePatientDocumentSignatureInput): Promise<void> {
  const usaAssinaturaSalva = !!input.imagemSalvaUrl;
  const imagePath = usaAssinaturaSalva
    ? input.imagemSalvaUrl!
    : input.dataUrlPng
      ? await uploadSignatureImage(input.patientDocumentId, input.tipo, input.dataUrlPng)
      : null;

  const { error } = await supabase
    .from("patient_document_signatures")
    .upsert(
      {
        patient_document_id: input.patientDocumentId,
        tipo: input.tipo,
        nome: input.nome,
        cpf: input.cpf || null,
        funcao: input.funcao || null,
        assinatura_imagem_path: imagePath,
        assinado_em: new Date().toISOString(),
      },
      { onConflict: "patient_document_id,tipo" }
    );

  if (error) {
    console.error("[patientDocumentSignatureApi] savePatientDocumentSignature error", error);
    throw new Error(`Falha ao gravar assinatura de ${input.nome}: ${error.message}`);
  }
}

export interface PatientDocumentSignatureSummary {
  tipo: PatientDocSignatureTipo;
  nome: string;
  funcao: string | null;
  imagemUrl: string | null;
}

export async function getPatientDocumentSignatures(patientDocumentId: string): Promise<PatientDocumentSignatureSummary[]> {
  const { data, error } = await supabase
    .from("patient_document_signatures")
    .select("tipo, nome, funcao, assinatura_imagem_path")
    .eq("patient_document_id", patientDocumentId)
    .order("assinado_em");

  if (error) {
    console.error("[patientDocumentSignatureApi] getPatientDocumentSignatures error", error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    tipo: row.tipo,
    nome: row.nome,
    funcao: row.funcao,
    imagemUrl: row.assinatura_imagem_path,
  }));
}
