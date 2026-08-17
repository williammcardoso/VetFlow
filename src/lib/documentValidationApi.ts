import { supabase } from "@/integrations/supabase/client";

export interface DocumentValidationResult {
  numero: number;
  codigoModelo: string;
  tituloModelo: string;
  status: string;
  emitidoEm: string | null;
  canceladoEm: string | null;
}

/**
 * Consulta a função pública validar_documento (Etapa 1) — devolve só o
 * mínimo pra confirmar autenticidade (nunca CPF/diagnóstico/payload), porque
 * quem acessa /validar/:hash pode ser qualquer pessoa com o papel em mãos,
 * não só quem tem a chave anônima do app.
 */
export async function validateDocumentByHash(hash: string): Promise<DocumentValidationResult | null> {
  const { data, error } = await supabase.rpc("validar_documento", { p_hash: hash });
  if (error) {
    console.error("[documentValidationApi] validateDocumentByHash error", error);
    throw new Error("Falha ao consultar o documento.");
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    numero: row.numero,
    codigoModelo: row.codigo_modelo,
    tituloModelo: row.titulo_modelo,
    status: row.status,
    emitidoEm: row.emitido_em,
    canceladoEm: row.cancelado_em,
  };
}
