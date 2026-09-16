import { supabase } from "@/integrations/supabase/client";
import { generateShortCode } from "@/lib/utils";

const TABLE = "document_share_links";

/**
 * Cria um link curto (/d/:code) que redireciona pra targetUrl (URL real,
 * comprida, do Supabase Storage) — usado só quando o link vai virar texto
 * visível pra alguém (ex.: mensagem de WhatsApp), não para abrir/baixar
 * direto dentro do sistema.
 */
export async function createShareLink(targetUrl: string): Promise<string | null> {
  const code = generateShortCode();
  const { error } = await supabase.from(TABLE).insert({ code, target_url: targetUrl });
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
