import type { ExamRequestPdfData } from "@/components/ExamRequestPdfContent";

/**
 * Marca um documento (patient_documents.content) como "Pedido de Exame" —
 * usado por AddExamRequestPage (grava e, ao editar, lê de volta) e
 * PatientRecordPage (detecta, para usar o PDF dedicado ExamRequestPdfContent
 * em vez do conversor genérico e abrir a tela certa no "Editar").
 */
export const EXAM_REQUEST_MARKER = "EXAM_REQUEST_DATA";

/** Comentário HTML com os dados do pedido, gravado no início do content. */
export function buildExamRequestMarker(data: ExamRequestPdfData): string {
  return `<!--${EXAM_REQUEST_MARKER}:${JSON.stringify(data).replace(/-->/g, "--\\>")}-->`;
}

/** Dados do pedido gravados no content, ou null se o documento não é um pedido de exame. */
export function parseExamRequestData(content: string | undefined): ExamRequestPdfData | null {
  const match = (content || "").match(new RegExp(`^<!--${EXAM_REQUEST_MARKER}:([\\s\\S]*?)-->`));
  if (!match) return null;
  try {
    return JSON.parse(match[1].replace(/--\\>/g, "-->")) as ExamRequestPdfData;
  } catch {
    return null;
  }
}
