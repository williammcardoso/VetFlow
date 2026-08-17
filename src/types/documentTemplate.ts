export type DocumentTemplateGroup = "atestados" | "consentimento" | "recusa" | "administrativo";

export interface DocumentTemplateListItem {
  id: string;
  codigo: string;
  titulo: string;
  grupo: DocumentTemplateGroup;
  categoria: string | null;
  baseLegal: string | null;
  ativo: boolean;
  versaoAtual: number | null;
  numeroVias: number | null;
  exigeAssinaturaResponsavel: boolean | null;
  exigeTestemunhas: boolean | null;
}

export interface DocumentTemplateVersionDetail {
  id: string;
  templateId: string;
  versao: number;
  corpo: string;
  variaveisRequeridas: string[];
  numeroVias: number;
  exigeAssinaturaResponsavel: boolean;
  exigeTestemunhas: boolean;
  publicadoEm: string;
}
