import { buildPdfFileName, formatDateBRForFileName, toLocalISODate } from "@/lib/utils";

/**
 * Nome do PDF de um termo/atestado oficial: título do modelo + pet + dia da
 * emissão em formato BR — "Atestado ou Declaração de Vacinação - Thor - 23-11-2026.pdf".
 * Usado no upload (emissão e PDF regerado com as assinaturas) e no botão Baixar.
 */
export function officialDocumentFileName(
  titulo: string,
  petName: string | undefined | null,
  emitidoEm: string | Date | null | undefined
): string {
  const date = emitidoEm ? new Date(emitidoEm) : null;
  const dateBR = date && !Number.isNaN(date.getTime()) ? formatDateBRForFileName(toLocalISODate(date)) : "";
  return buildPdfFileName(titulo, petName, dateBR);
}
