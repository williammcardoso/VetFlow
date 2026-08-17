import { createPdfBlob } from "@/lib/pdfExport";
import { getDocumentForPdfRegeneration, updateDocumentHashAndPdf, uploadDocumentPdf } from "@/lib/documentEmissionApi";
import { getSignaturesByDocument } from "@/lib/documentSignatureApi";
import { generateQrCodeDataUrl } from "@/lib/qrCode";
import DocumentTemplatePdfContent from "@/components/DocumentTemplatePdfContent";

/**
 * Regera o PDF de um documento já emitido incluindo as imagens de assinatura
 * já coletadas até agora — chamado depois que QUALQUER assinatura é gravada
 * (painel do veterinário ou link público do responsável), pra que o PDF
 * final mostre as assinaturas de verdade em vez de ficar sempre com a linha
 * em branco da primeira geração (na emissão, antes de qualquer assinatura
 * existir). O hash não muda — continua sendo do texto (payload), não dos
 * bytes do PDF (ver documentHash.ts), então só troca o `pdf_path`.
 */
export async function regenerarPdfComAssinaturas(documentId: string): Promise<{ url: string | null; errorMessage: string | null }> {
  const doc = await getDocumentForPdfRegeneration(documentId);
  if (!doc) return { url: null, errorMessage: "Documento não encontrado." };
  if (!doc.hashSha256) return { url: null, errorMessage: "Documento ainda não tem hash — gere o PDF original primeiro." };

  const assinaturasSalvas = await getSignaturesByDocument(documentId);
  const imagensPorPapel: Record<string, string> = {};
  let testemunhaIndex = 0;
  for (const s of assinaturasSalvas) {
    if (!s.imagemUrl) continue;
    if (s.tipo === "veterinario") imagensPorPapel.veterinario = s.imagemUrl;
    else if (s.tipo === "responsavel") imagensPorPapel.responsavel = s.imagemUrl;
    else if (s.tipo === "testemunha") {
      testemunhaIndex += 1;
      imagensPorPapel[`testemunha${testemunhaIndex}`] = s.imagemUrl;
    }
  }

  const qrDataUrl = await generateQrCodeDataUrl(`${window.location.origin}/validar/${doc.hashSha256}`);

  let blob: Blob;
  try {
    blob = await createPdfBlob(
      <DocumentTemplatePdfContent
        codigo={doc.codigo}
        titulo={doc.titulo}
        numero={doc.numero}
        corpoRenderizado={doc.corpoRenderizado}
        status={doc.status as "rascunho" | "emitido" | "assinado" | "cancelado"}
        via="responsavel"
        emitidoEm={doc.emitidoEm ? new Date(doc.emitidoEm) : new Date()}
        hash={doc.hashSha256}
        qrDataUrl={qrDataUrl}
        vetNome={doc.vetNome}
        vetCrmv={doc.vetCrmvLabel}
        assinaturas={imagensPorPapel}
      />
    );
  } catch (err: any) {
    console.error("[documentPdfRegeneration] createPdfBlob falhou", err);
    return { url: null, errorMessage: `Falha ao montar o PDF: ${err?.message || "erro desconhecido"}` };
  }

  const { url, errorMessage } = await uploadDocumentPdf(blob, `${doc.codigo}_${doc.numero}_assinado.pdf`);
  if (url) {
    await updateDocumentHashAndPdf(documentId, doc.hashSha256, url);
  }
  return { url, errorMessage };
}
