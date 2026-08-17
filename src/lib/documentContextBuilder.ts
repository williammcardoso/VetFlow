import type { Client, Animal } from "@/types/client";
import type { CompanySettings } from "@/types/settings";
import type { UserProfile } from "@/lib/authApi";
import type { DocumentTemplateContext } from "@/lib/documentTemplateEngine";

// Mesmo cálculo de idade já usado em src/utils/templateReplacements.ts (o
// motor antigo de documentos) — mantido separado de propósito: aquele
// arquivo resolve {{pet_idade}} num formato de string fixa, este monta um
// objeto de contexto pro motor novo (Etapa 3), formatos diferentes.
export function calcularIdadeTexto(birthday: string | undefined | null): string {
  if (!birthday) return "";
  const nascimento = new Date(birthday);
  if (Number.isNaN(nascimento.getTime())) return "";
  const hoje = new Date();
  let anos = hoje.getFullYear() - nascimento.getFullYear();
  let meses = hoje.getMonth() - nascimento.getMonth();
  let dias = hoje.getDate() - nascimento.getDate();
  if (dias < 0) {
    meses--;
    dias += new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate();
  }
  if (meses < 0) {
    anos--;
    meses += 12;
  }
  if (anos > 0) return meses > 0 ? `${anos} ano(s) e ${meses} mês(es)` : `${anos} ano(s)`;
  if (meses > 0) return `${meses} mês(es)`;
  return `${dias} dia(s)`;
}

function formatDateBR(iso: string | undefined | null): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}

/**
 * Monta o contexto automático (pac/resp/vet/estab/doc) a partir dos
 * cadastros reais — o que sobrar sem valor vira variável pendente
 * (renderDocumentTemplate acusa) e a tela de emissão pede pra preencher à
 * mão (normalmente só campos de atend.*, que variam demais por tipo de
 * atendimento pra automatizar com segurança).
 */
export function buildAutoDocumentContext(params: {
  animal: Animal;
  client: Client;
  vetProfile: UserProfile | null;
  company: CompanySettings;
  atendimentoData?: string | null;
  atendimentoHora?: string | null;
}): DocumentTemplateContext {
  const { animal, client, vetProfile, company } = params;
  const [vetUf, vetNumero] = (vetProfile?.crmv || "").split("/").map((s) => s.trim());
  const hoje = new Date();

  return {
    pac: {
      nome: animal.name,
      especie: animal.species,
      raca: animal.breed,
      sexo: animal.gender,
      idade: calcularIdadeTexto(animal.birthday),
      peso: animal.weight,
      pelagem: animal.coatColor,
      // A maioria dos pacientes não tem microchip cadastrado — nunca pedir
      // pra digitar na hora de emitir, só usa o que já está no cadastro.
      // "Não informado" evita que isso vire campo pendente/obrigatório.
      microchip: animal.microchip || "Não informado",
      // Resenha (sinais particulares) também não tem campo equivalente no
      // cadastro — mesmo tratamento do microchip, nunca pede pra digitar.
      resenha: "Não informado",
    },
    resp: {
      nome: client.name,
      cpf: client.identificationNumber,
      rg: client.secondaryIdentification,
      endereco: [client.address?.street, client.address?.number].filter(Boolean).join(", "),
      cidade: client.address?.city,
      uf: client.address?.state,
      cep: client.address?.cep,
      telefone: client.mainPhoneContact,
      email: client.mainEmailContact,
    },
    vet: {
      nome: vetProfile?.full_name || vetProfile?.signature_text || "",
      crmv: vetNumero || vetProfile?.crmv || "",
      crmv_uf: vetUf || "SP",
    },
    estab: {
      razao_social: company.razaoSocial || company.companyName,
      nome_fantasia: company.companyName,
      cnpj: company.cnpj,
      endereco: company.address,
      cidade: company.city,
      telefone: company.phone,
      email: company.email,
    },
    doc: {
      local: company.city,
      data_extenso: hoje.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }),
    },
    atend: {
      data: params.atendimentoData ? formatDateBR(params.atendimentoData) : hoje.toLocaleDateString("pt-BR"),
      hora: params.atendimentoHora || "",
    },
  };
}

/**
 * Aplica os campos preenchidos à mão (um por variável pendente, chave =
 * caminho "escopo.campo") por cima do contexto automático. Se o valor tiver
 * mais de uma linha, vira array (o motor filtra item vazio e renderiza como
 * lista) — é assim que campos como {{exame.requisitos}} recebem múltiplos
 * itens sem precisar de um tipo de campo especial no formulário.
 */
export function mergeManualFields(
  base: DocumentTemplateContext,
  manual: Record<string, string>
): DocumentTemplateContext {
  const resultado: DocumentTemplateContext = { ...base };
  for (const [caminho, valorBruto] of Object.entries(manual)) {
    const [escopo, ...resto] = caminho.split(".");
    const campo = resto.join(".");
    if (!escopo || !campo) continue;
    const linhas = valorBruto
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (linhas.length === 0) continue;
    const valor = linhas.length > 1 ? linhas : linhas[0];
    resultado[escopo] = { ...(resultado[escopo] ?? {}), [campo]: valor };
  }
  return resultado;
}
