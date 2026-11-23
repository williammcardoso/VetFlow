import type { ReactElement } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createShareLink, type ShareLinkPreview } from "@/lib/documentShareLinksApi";
import { cleanDownloadFileName, storageFileName, withDownloadName } from "@/lib/utils";

const DEFAULT_BUCKET = "documents";

type PersistOptions = {
  bucket?: string;
  folder?: string;
  fileName?: string;
};

// O `fileName` que as telas passam é o nome "bonito" (buildPdfFileName, com
// acento e espaço) — é o que fica no arquivo baixado. No caminho do Storage
// vai a versão sem acento/espaço (storageFileName): chave com acento falha o
// upload em silêncio ("Invalid key") e o persistPdf caía no download local.

/** Sobe o PDF pro storage e devolve um link curto (/d/:code) — usado quando
 * o PDF precisa virar um link visível pra alguém (ex.: mensagem de
 * WhatsApp), não só ser aberto/baixado dentro do próprio sistema. A URL
 * direta do Storage é enorme (domínio do projeto + bucket + pasta + nome);
 * se não der pra gravar o link curto (ex.: migration do
 * document_share_links ainda não aplicada), cai pra URL direta em vez de
 * falhar o envio. */
export async function persistPdf(
  blob: Blob,
  options?: PersistOptions & { fileName: string; sharePreview?: ShareLinkPreview }
): Promise<string | null> {
  const longUrl = await tryPersistPdf(blob, options);
  if (!longUrl) return null;
  const shortUrl = await createShareLink(longUrl, options?.sharePreview);
  return shortUrl || longUrl;
}

async function tryPersistPdf(blob: Blob, options?: PersistOptions): Promise<string | null> {
  try {
    const bucket = options?.bucket || DEFAULT_BUCKET;
    const folder = (options?.folder || "generated_pdfs").replace(/^\/+|\/+$/g, "");
    const fileName = storageFileName(options?.fileName || "documento");
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
  a.download = cleanDownloadFileName(fileName);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Baixa um PDF que já está no Storage com o nome escolhido (com acento):
 * `?download=` faz o Supabase mandar o arquivo como anexo com esse nome. Sem
 * nova aba — download não troca de página. Antes, o "baixar" abria o PDF e
 * o arquivo salvo levava o fim da URL (ex.: "1732…_k3j4_A03_Thor_12.pdf").
 */
export function downloadPdfFromUrl(url: string, fileName: string): void {
  const a = document.createElement("a");
  a.href = withDownloadName(url, fileName);
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// A biblioteca de PDF (~1,3 MB) é carregada só aqui, na hora de gerar — antes
// vinha no import do topo e descia junto com qualquer tela que tivesse um
// botão de PDF/WhatsApp (inclusive o Painel).
export async function createPdfBlob(node: ReactElement): Promise<Blob> {
  const { pdf } = await import("@react-pdf/renderer");
  return pdf(node).toBlob();
}

export type PdfKit = typeof import("@/lib/pdfKit");

/**
 * Gera o PDF carregando os modelos (lib/pdfKit) só agora:
 * `renderPdf((K) => <K.SaleReceiptPdfContent ... />)`.
 */
export async function renderPdf(build: (kit: PdfKit) => ReactElement | Promise<ReactElement>): Promise<Blob> {
  const kit = await import("@/lib/pdfKit");
  return createPdfBlob(await build(kit));
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
      downloadPdfFromUrl(persistedUrl, fileName);
      return;
    }
  }
  downloadBlob(blob, fileName);
}
