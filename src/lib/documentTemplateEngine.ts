// Motor de template do módulo de Documentos (Etapa 3). Função pura: recebe o
// `corpo` de uma document_template_versions (texto com {{ }} e blocos
// reutilizáveis entre colchetes) e um contexto de dados, devolve o texto
// final resolvido + a lista de variáveis que ficaram sem valor.
//
// Cabeçalho e rodapé (seção 4 da biblioteca) NÃO são resolvidos aqui — não
// aparecem como token dentro de nenhum corpo dos 30 modelos (conferido por
// grep na biblioteca inteira), são aplicados como moldura do PDF na emissão
// (Etapa 4), não fazem parte do texto do documento em si.

export type DocumentTemplateContext = Record<string, Record<string, unknown> | undefined>;

export interface DocumentRenderResult {
  texto: string;
  /** Caminhos ({{escopo.campo}}) que resolveram vazio/ausente — ex.: "resp.cpf". Ordenado e sem duplicata. */
  variaveisPendentes: string[];
}

// Os 4 blocos reutilizáveis referenciados por [BLOCO ...] nos 30 modelos
// (ver seção 4 da biblioteca). BLOCO_ASSINATURA_PACIENTE e
// BLOCO_IDENTIFICACAO_RESPONSAVEL vêm de um único bloco combinado na
// biblioteca, mas os modelos os referenciam como dois tokens separados
// (às vezes só um dos dois aparece sozinho), então ficam divididos aqui.
//
// BLOCO DE ASSINATURA DO MÉDICO-VETERINÁRIO é o único que a biblioteca NÃO
// define explicitamente (ela só dá o bloco combinado responsável+vet) —
// construído aqui reaproveitando exatamente os mesmos campos/formato da
// coluna do vet em BLOCO DE ASSINATURAS, só em coluna única. Não é texto
// jurídico novo, é layout.
// Cada campo em sua própria linha ("Rótulo: valor"), não vários campos por
// linha com espaços contando posição — alinhamento por espaços só funciona
// em fonte monoespaçada, quebra na fonte proporcional do PDF (Etapa 4).
// Esse formato também é o que src/lib/documentPdfLayout.ts (Etapa 4)
// reconhece para desenhar como cartão em vez de texto corrido.
const PARTIALS: Record<string, string> = {
  "BLOCO DE IDENTIFICAÇÃO DO PACIENTE": `IDENTIFICAÇÃO DO PACIENTE
Nome: {{pac.nome}}
Espécie: {{pac.especie}}
Raça: {{pac.raca}}
Sexo: {{pac.sexo}}
Idade: {{pac.idade}}
Peso: {{pac.peso}} kg
Pelagem: {{pac.pelagem}}
Microchip: {{pac.microchip}}
Resenha/sinais particulares: {{pac.resenha}}`,

  "BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL": `IDENTIFICAÇÃO DO RESPONSÁVEL PELO ANIMAL
Nome: {{resp.nome}}
CPF: {{resp.cpf}}
RG: {{resp.rg}}
Endereço: {{resp.endereco}}
Cidade/UF: {{resp.cidade}}/{{resp.uf}}
CEP: {{resp.cep}}
Telefone: {{resp.telefone}}
E-mail: {{resp.email}}`,

  "BLOCO DE ASSINATURAS": `{{doc.local}}, {{doc.data_extenso}}.

______________________________________
{{resp.nome}}
CPF {{resp.cpf}}
Responsável pelo animal

______________________________________
{{vet.nome}}
CRMV-{{vet.crmv_uf}} nº {{vet.crmv}}
Médico-Veterinário`,

  "BLOCO DE ASSINATURA DO MÉDICO-VETERINÁRIO": `{{doc.local}}, {{doc.data_extenso}}.

______________________________________
{{vet.nome}}
CRMV-{{vet.crmv_uf}} nº {{vet.crmv}}
Médico-Veterinário`,
};

const PARTIAL_NAMES_PATTERN = Object.keys(PARTIALS)
  .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
const BLOCO_TOKEN_RE = new RegExp(`\\[(${PARTIAL_NAMES_PATTERN})\\]`, "g");

const VARIABLE_RE = /\{\{([a-zA-Z0-9_.]+)\}\}/g;

function expandPartials(corpo: string): string {
  return corpo.replace(BLOCO_TOKEN_RE, (_match, nome: string) => PARTIALS[nome]);
}

function getByPath(context: DocumentTemplateContext, caminho: string): unknown {
  const [escopo, ...resto] = caminho.split(".");
  let valor: unknown = context[escopo];
  for (const chave of resto) {
    if (valor === null || valor === undefined || typeof valor !== "object") return undefined;
    valor = (valor as Record<string, unknown>)[chave];
  }
  return valor;
}

// Só escapa o VALOR interpolado (dado do cliente/paciente), nunca o texto
// estático do modelo — o corpo em si é conteúdo jurídico confiável, não
// entrada de usuário.
function escapeForPdf(valor: string): string {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function stringifyScalar(valor: unknown): string {
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  return String(valor);
}

/**
 * Resolve um valor de contexto para texto. Listas viram itens com marcador,
 * filtrando entradas vazias antes de renderizar (requisito explícito: não
 * pode sair item numerado/com marcador em branco). Retorna `pendente: true`
 * quando não há nada de fato para mostrar (valor ausente, string vazia após
 * trim, ou array que ficou vazio depois do filtro).
 */
function formatValue(valor: unknown): { texto: string; pendente: boolean } {
  if (Array.isArray(valor)) {
    const itens = valor
      .map((item) => (item === null || item === undefined ? "" : String(item).trim()))
      .filter((item) => item.length > 0);
    if (itens.length === 0) return { texto: "", pendente: true };
    return { texto: itens.map((item) => `- ${escapeForPdf(item)}`).join("\n"), pendente: false };
  }
  if (valor === null || valor === undefined) return { texto: "", pendente: true };
  const texto = stringifyScalar(valor).trim();
  if (texto.length === 0) return { texto: "", pendente: true };
  return { texto: escapeForPdf(texto), pendente: false };
}

/**
 * Renderiza o corpo de uma versão de modelo: expande os blocos [BLOCO ...]
 * e resolve {{escopo.campo}} a partir do contexto. Nunca produz "undefined"
 * ou um espaço em branco silencioso para variável ausente — troca por um
 * marcador visível `[[PENDENTE: escopo.campo]]` e devolve o caminho em
 * `variaveisPendentes`, para a UI (Etapa 5) destacar antes de permitir
 * emitir o documento.
 */
export function renderDocumentTemplate(
  corpo: string,
  context: DocumentTemplateContext
): DocumentRenderResult {
  const expandido = expandPartials(corpo);
  const pendentes = new Set<string>();

  const texto = expandido.replace(VARIABLE_RE, (_match, caminho: string) => {
    const valor = getByPath(context, caminho);
    const { texto: valorTexto, pendente } = formatValue(valor);
    if (pendente) {
      pendentes.add(caminho);
      return `[[PENDENTE: ${caminho}]]`;
    }
    return valorTexto;
  });

  return { texto, variaveisPendentes: [...pendentes].sort() };
}

/**
 * Extrai os caminhos {{escopo.campo}} usados num corpo de modelo (cru, sem
 * expandir blocos), ordenados e sem duplicata — usado pelo editor de
 * modelos (Etapa 5) para popular `variaveis_requeridas` ao publicar uma
 * nova versão, sem precisar de contexto nenhum.
 */
export function extractTemplateVariables(corpo: string): string[] {
  const variaveis = new Set<string>();
  for (const match of corpo.matchAll(VARIABLE_RE)) {
    variaveis.add(match[1]);
  }
  return [...variaveis].sort();
}
