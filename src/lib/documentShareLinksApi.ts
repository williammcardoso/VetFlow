import { supabase } from "@/integrations/supabase/client";
import { generateShortCode } from "@/lib/utils";

const TABLE = "document_share_links";

/** Título/descrição que aparecem na prévia do link no WhatsApp (og:title /
 * og:description, servidos por api/share-link.ts). */
export interface ShareLinkPreview {
  title?: string;
  description?: string;
}

/**
 * Cria um link curto (/d/:code) que redireciona pra targetUrl (URL real,
 * comprida, do Supabase Storage) — usado só quando o link vai virar texto
 * visível pra alguém (ex.: mensagem de WhatsApp), não para abrir/baixar
 * direto dentro do sistema.
 */
export async function createShareLink(targetUrl: string, preview?: ShareLinkPreview): Promise<string | null> {
  const code = generateShortCode();
  const base = { code, target_url: targetUrl };
  const title = preview?.title?.trim().slice(0, 200) || null;
  const description = preview?.description?.trim().slice(0, 300) || null;
  const hasPreview = Boolean(title || description);

  let { error } = await supabase.from(TABLE).insert(hasPreview ? { ...base, title, description } : base);
  // As colunas title/description vêm da migration
  // 20260925190000_document_share_links_preview — enquanto ela não for
  // aplicada no Supabase, o insert com elas falha. Grava sem a prévia: o link
  // funciona igual, só a prévia do WhatsApp fica genérica.
  if (error && hasPreview) {
    console.warn("[createShareLink] não gravou o título da prévia; gravando o link sem ele", error);
    ({ error } = await supabase.from(TABLE).insert(base));
  }
  if (error) {
    console.error("[createShareLink] falhou ao gravar o link curto", error);
    return null;
  }
  return `${window.location.origin}/d/${code}`;
}

/** Busca a URL real por trás de um código curto — usado pela rota pública /d/:code. */
export async function resolveShareLink(code: string): Promise<string | null> {
  const { data, error } = await supabase.from(TABLE).select("target_url").eq("code", code).maybeSingle();
  if (error || !data) return null;
  return data.target_url as string;
}
