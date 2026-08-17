import { supabase } from "@/integrations/supabase/client";
import { extractTemplateVariables } from "@/lib/documentTemplateEngine";
import type { DocumentTemplateGroup, DocumentTemplateListItem, DocumentTemplateVersionDetail } from "@/types/documentTemplate";

type DbTemplate = {
  id: string;
  codigo: string;
  titulo: string;
  grupo: DocumentTemplateGroup;
  categoria: string | null;
  base_legal: string | null;
  ativo: boolean;
};

type DbVersionSummary = {
  template_id: string;
  versao: number;
  numero_vias: number;
  exige_assinatura_responsavel: boolean;
  exige_testemunhas: boolean;
};

type DbVersionDetail = {
  id: string;
  template_id: string;
  versao: number;
  corpo: string;
  variaveis_requeridas: string[];
  numero_vias: number;
  exige_assinatura_responsavel: boolean;
  exige_testemunhas: boolean;
  publicado_em: string;
};

/**
 * Lista os modelos + a versão mais recente de cada um (vias, exige
 * assinatura/testemunhas). Não traz o `corpo` — pesado e desnecessário pra
 * lista; buscar sob demanda via getDocumentTemplateVersion() ao abrir o
 * preview de um modelo específico.
 */
export async function getDocumentTemplates(): Promise<DocumentTemplateListItem[]> {
  const { data: templates, error: templatesError } = await supabase
    .from("document_templates")
    .select("id, codigo, titulo, grupo, categoria, base_legal, ativo")
    .order("codigo");

  if (templatesError) {
    console.error("[documentTemplatesApi] getDocumentTemplates error", templatesError);
    throw new Error(`Falha ao carregar modelos de documento: ${templatesError.message}`);
  }

  const { data: versions, error: versionsError } = await supabase
    .from("document_template_versions")
    .select("template_id, versao, numero_vias, exige_assinatura_responsavel, exige_testemunhas")
    .order("versao", { ascending: false });

  if (versionsError) {
    console.error("[documentTemplatesApi] getDocumentTemplates (versions) error", versionsError);
    throw new Error(`Falha ao carregar versões dos modelos: ${versionsError.message}`);
  }

  const latestByTemplate = new Map<string, DbVersionSummary>();
  for (const v of (versions as DbVersionSummary[]) ?? []) {
    if (!latestByTemplate.has(v.template_id)) latestByTemplate.set(v.template_id, v);
  }

  return ((templates as DbTemplate[]) ?? []).map((t) => {
    const latest = latestByTemplate.get(t.id);
    return {
      id: t.id,
      codigo: t.codigo,
      titulo: t.titulo,
      grupo: t.grupo,
      categoria: t.categoria,
      baseLegal: t.base_legal,
      ativo: t.ativo,
      versaoAtual: latest?.versao ?? null,
      numeroVias: latest?.numero_vias ?? null,
      exigeAssinaturaResponsavel: latest?.exige_assinatura_responsavel ?? null,
      exigeTestemunhas: latest?.exige_testemunhas ?? null,
    };
  });
}

/** Busca a versão publicada mais recente de um modelo, com o corpo completo — usado no preview. */
export async function getLatestDocumentTemplateVersion(templateId: string): Promise<DocumentTemplateVersionDetail | null> {
  const { data, error } = await supabase
    .from("document_template_versions")
    .select("id, template_id, versao, corpo, variaveis_requeridas, numero_vias, exige_assinatura_responsavel, exige_testemunhas, publicado_em")
    .eq("template_id", templateId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[documentTemplatesApi] getLatestDocumentTemplateVersion error", error);
    throw new Error(`Falha ao carregar o texto do modelo: ${error.message}`);
  }
  if (!data) return null;

  const row = data as DbVersionDetail;
  return {
    id: row.id,
    templateId: row.template_id,
    versao: row.versao,
    corpo: row.corpo,
    variaveisRequeridas: row.variaveis_requeridas ?? [],
    numeroVias: row.numero_vias,
    exigeAssinaturaResponsavel: row.exige_assinatura_responsavel,
    exigeTestemunhas: row.exige_testemunhas,
    publicadoEm: row.publicado_em,
  };
}

/**
 * Publica uma NOVA versão do modelo — nunca sobrescreve a versão atual
 * (document_template_versions é imutável, ver Etapa 1). numero_vias/
 * exige_assinatura_responsavel/exige_testemunhas são herdados da versão
 * anterior (o editor da Etapa 5 só edita o corpo); variaveis_requeridas é
 * recalculado automaticamente a partir do novo corpo.
 */
export async function publishDocumentTemplateVersion(params: {
  templateId: string;
  novoCorpo: string;
  publicadoPor: string | null;
}): Promise<DocumentTemplateVersionDetail> {
  const atual = await getLatestDocumentTemplateVersion(params.templateId);
  if (!atual) {
    throw new Error("Não há versão publicada anterior para este modelo — não é possível criar uma nova versão.");
  }

  const { data, error } = await supabase
    .from("document_template_versions")
    .insert({
      template_id: params.templateId,
      versao: atual.versao + 1,
      corpo: params.novoCorpo,
      variaveis_requeridas: extractTemplateVariables(params.novoCorpo),
      campos_formulario: [],
      exige_assinatura_responsavel: atual.exigeAssinaturaResponsavel,
      exige_testemunhas: atual.exigeTestemunhas,
      numero_vias: atual.numeroVias,
      publicado_por: params.publicadoPor,
    })
    .select("id, template_id, versao, corpo, variaveis_requeridas, numero_vias, exige_assinatura_responsavel, exige_testemunhas, publicado_em")
    .single();

  if (error) {
    console.error("[documentTemplatesApi] publishDocumentTemplateVersion error", error);
    throw new Error(`Falha ao publicar nova versão: ${error.message}`);
  }

  const row = data as DbVersionDetail;
  return {
    id: row.id,
    templateId: row.template_id,
    versao: row.versao,
    corpo: row.corpo,
    variaveisRequeridas: row.variaveis_requeridas ?? [],
    numeroVias: row.numero_vias,
    exigeAssinaturaResponsavel: row.exige_assinatura_responsavel,
    exigeTestemunhas: row.exige_testemunhas,
    publicadoEm: row.publicado_em,
  };
}
