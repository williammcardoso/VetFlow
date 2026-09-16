import { pdf } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createShareLink } from "@/lib/documentShareLinksApi";

const DEFAULT_BUCKET = "documents";

type PersistOptions = {
  bucket?: string;
  folder?: string;
  fileName?: string;
};

function sanitizeFileName(name: string) {
  return name
    .trim()
    // Remove acentos (ex.: "Bioquímico" -> "Bioquimico") - nome de arquivo com
    // caractere acentuado no path do Storage vinha falhando o upload em silêncio
    // (persistPdf caía no fallback de download local sem avisar o motivo).
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
}

function ensurePdfName(name: string) {
  const clean = sanitizeFileName(name || "arquivo");
  return clean.toLowerCase().endsWith(".pdf") ? clean : `${clean}.pdf`;
}

/** Sobe o PDF pro storage e devolve um link curto (/d/:code) — usado quando
 * o PDF precisa virar um link visível pra alguém (ex.: mensagem de
 * WhatsApp), não só ser aberto/baixado dentro do próprio sistema. A URL
 * direta do Storage é enorme (domínio do projeto + bucket + pasta + nome);
 * se não der pra gravar o link curto (ex.: migration do
 * document_share_links ainda não aplicada), cai pra URL direta em vez de
 * falhar o envio. */
export async function persistPdf(blob: Blob, options?: PersistOptions & { fileName: string }): Promise<string | null> {
  const longUrl = await tryPersistPdf(blob, options);
  if (!longUrl) return null;
  const shortUrl = await createShareLink(longUrl);
  return shortUrl || longUrl;
}

async function tryPersistPdf(blob: Blob, options?: PersistOptions): Promise<string | null> {
  try {
    const bucket = options?.bucket || DEFAULT_BUCKET;
    const folder = (options?.folder || "generated_pdfs").replace(/^\/+|\/+$/g, "");
    const fileName = ensurePdfName(options?.fileName || `documento_${Date.now()}.pdf`);
    // O identificador único vira subpasta, não prefixo do nome — evita
    // colisão no Storage sem sujar o nome que o navegador mostra (a URL
    // pública termina no nome do arquivo; era esse prefixo que aparecia
    // feio no download e virava o título da aba ao abrir o PDF direto).
    const uniqueDir = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const path = `${folder}/${uniqueDir}/${fileName}`;
    const file = new File([blob], fileName, { type: "application/pdf" });

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: false,
      contentType: "application/pdf",
    });
    if (uploadError) {
      console.error("[persistPdf] upload falhou", uploadError);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl || null;
  } catch (err) {
    console.error("[persistPdf] erro inesperado", err);
    return null;
  }
}

function openBlobUrl(blob: Blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ensurePdfName(fileName);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function createPdfBlob(node: ReactElement): Promise<Blob> {
  return pdf(node).toBlob();
}

export async function openPdf({
  blob,
  fileName,
  persist = true,
  persistOptions,
}: {
  blob: Blob;
  fileName: string;
  persist?: boolean;
  persistOptions?: PersistOptions;
}) {
  if (persist) {
    const persistedUrl = await tryPersistPdf(blob, { ...persistOptions, fileName });
    if (persistedUrl) {
      window.open(persistedUrl, "_blank", "noopener,noreferrer");
      return;
    }
  }
  openBlobUrl(blob);
}

export async function downloadPdf({
  blob,
  fileName,
  persist = true,
  persistOptions,
}: {
  blob: Blob;
  fileName: string;
  persist?: boolean;
  persistOptions?: PersistOptions;
}) {
  if (persist) {
    const persistedUrl = await tryPersistPdf(blob, { ...persistOptions, fileName });
    if (persistedUrl) {
      const a = document.createElement("a");
      a.href = persistedUrl;
      a.download = ensurePdfName(fileName);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
  }
  downloadBlob(blob, fileName);
}
