import { pdf } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_BUCKET = "documents";

type PersistOptions = {
  bucket?: string;
  folder?: string;
  fileName?: string;
};

function sanitizeFileName(name: string) {
  return name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
}

function ensurePdfName(name: string) {
  const clean = sanitizeFileName(name || "arquivo");
  return clean.toLowerCase().endsWith(".pdf") ? clean : `${clean}.pdf`;
}

/** Sobe o PDF pro storage e devolve a URL pública — usado quando o PDF
 * precisa virar um link (ex.: mensagem de WhatsApp), não só ser aberto/baixado. */
export async function persistPdf(blob: Blob, options?: PersistOptions & { fileName: string }): Promise<string | null> {
  return tryPersistPdf(blob, options);
}

async function tryPersistPdf(blob: Blob, options?: PersistOptions): Promise<string | null> {
  try {
    const bucket = options?.bucket || DEFAULT_BUCKET;
    const folder = (options?.folder || "generated_pdfs").replace(/^\/+|\/+$/g, "");
    const fileName = ensurePdfName(options?.fileName || `documento_${Date.now()}.pdf`);
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}_${fileName}`;
    const file = new File([blob], fileName, { type: "application/pdf" });

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: false,
      contentType: "application/pdf",
    });
    if (uploadError) return null;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl || null;
  } catch {
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
