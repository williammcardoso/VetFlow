/**
 * Templates de documentos veterinários (corpo do texto).
 * Cabeçalho e rodapé são adicionados pelo sistema na impressão.
 * Variáveis: {{pet_nome}}, {{pet_especie}}, {{pet_raca}}, {{pet_sexo}}, {{pet_idade}}, {{pet_peso}}, {{pet_microchip}},
 * {{tutor_nome}}, {{tutor_cpf}}, {{tutor_telefone}}, {{tutor_endereco}}, {{vet_nome}}, {{vet_crmv}}, {{vet_estado}},
 * {{cidade}}, {{data}}, etc.
 */
export const DOCUMENT_TEMPLATES: Record<
  string,
  { title: string; type: string; content: string }
> = {
  autorizacao_cirurgica: {
    title: "Autorização para Procedimento Cirúrgico",
    type: "Autorização",
    content: `TERMO DE AUTORIZAÇÃO PARA PROCEDIMENTO CIRÚRGICO

Eu, {{tutor_nome}}, portador(a) do CPF {{tutor_cpf}}, na qualidade de responsável pelo animal {{pet_nome}}, da espécie {{pet_especie}}, raça {{pet_raca}}, autorizo a realização do procedimento cirúrgico: {{procedimento}}.

Declaro que fui devidamente informado(a) sobre:
• A natureza do procedimento cirúrgico proposto;
• Os riscos inerentes à anestesia e ao procedimento;
• As possíveis complicações que podem ocorrer;
• Os cuidados necessários no pós-operatório;
• A necessidade de exames pré-operatórios.

Estou ciente de que, apesar de todos os cuidados e técnicas empregados, podem ocorrer complicações inesperadas, incluindo, mas não se limitando a: reações adversas à anestesia, hemorragias, infecções e, em casos extremos, óbito.

Autorizo também a realização de procedimentos adicionais que se façam necessários durante o ato cirúrgico, caso sejam identificadas condições não previstas inicialmente.

{{cidade}}, {{data}}.

_________________________
{{tutor_nome}}
CPF: {{tutor_cpf}}

_________________________
Médico(a) Veterinário(a) Responsável
CRMV: {{vet_crmv}}`,
  },
  autorizacao_anestesia: {
    title: "Termo de Consentimento para Anestesia",
    type: "Termo",
    content: `TERMO DE CONSENTIMENTO PARA ANESTESIA

Eu, {{tutor_nome}}, portador(a) do CPF {{tutor_cpf}}, responsável pelo animal {{pet_nome}}, da espécie {{pet_especie}}, autorizo a realização de procedimento anestésico para: {{procedimento}}.

DECLARO que fui informado(a) que:
1. Todo procedimento anestésico envolve riscos, mesmo quando realizados por profissionais qualificados e com equipamentos adequados;
2. Os riscos incluem, mas não se limitam a: reações alérgicas, depressão respiratória, alterações cardíacas, hipotermia, e em casos raros, óbito;
3. Animais idosos, obesos, braquicefálicos ou com doenças pré-existentes apresentam riscos aumentados;
4. A realização de exames pré-anestésicos foi recomendada para minimizar os riscos;
5. É fundamental informar sobre qualquer medicação que o animal esteja utilizando, bem como jejum alimentar e hídrico conforme orientado.

( ) Concordo com a realização dos exames pré-anestésicos recomendados
( ) Opto por não realizar os exames pré-anestésicos, assumindo os riscos

{{cidade}}, {{data}}.

_________________________
{{tutor_nome}}
CPF: {{tutor_cpf}}`,
  },
  termo_recusa_exames: {
    title: "Termo de Recusa de Exames",
    type: "Termo",
    content: `TERMO DE RECUSA DE EXAMES PRÉ-OPERATÓRIOS / PRÉ-ANESTÉSICOS

Eu, {{tutor_nome}}, CPF {{tutor_cpf}}, responsável pelo animal {{pet_nome}} ({{pet_especie}} - {{pet_raca}}), declaro que fui informado(a) sobre a importância e a necessidade dos exames recomendados (hemograma, bioquímico, entre outros) para avaliação do estado de saúde do animal antes do procedimento.

Mesmo ciente dos riscos envolvidos, DECLARO que opto por NÃO realizar os exames recomendados, assumindo integralmente a responsabilidade por essa decisão e isentando o(a) médico(a) veterinário(a) e o estabelecimento de qualquer responsabilidade por eventuais complicações decorrentes da não realização dos referidos exames.

{{cidade}}, {{data}}.

_________________________
{{tutor_nome}}
CPF: {{tutor_cpf}}`,
  },
  nao_aceite_tratamento: {
    title: "Termo de Não Aceite de Tratamento",
    type: "Termo",
    content: `TERMO DE NÃO ACEITE DE TRATAMENTO PROPOSTO

Eu, {{tutor_nome}}, CPF {{tutor_cpf}}, responsável pelo animal {{pet_nome}} ({{pet_especie}} - {{pet_raca}}), declaro que fui devidamente informado(a) sobre o diagnóstico, o plano de tratamento recomendado e as consequências da não realização do mesmo.

Mesmo ciente das orientações, DECLARO que opto por NÃO aceitar o tratamento proposto, assumindo integralmente a responsabilidade por essa decisão e as possíveis consequências para a saúde e o bem-estar do animal.

Tratamento recusado: {{tratamento_recusado}}

{{cidade}}, {{data}}.

_________________________
{{tutor_nome}}
CPF: {{tutor_cpf}}`,
  },
  carta_cobranca: {
    title: "Carta de Cobrança",
    type: "Comunicação",
    content: `CARTA DE COBRANÇA

Prezado(a) Sr(a). {{tutor_nome}},

Informamos que consta em nosso cadastro pendência financeira referente aos serviços/produtos prestados ao(à) seu(sua) animal {{pet_nome}}.

Solicitamos que entre em contato conosco para regularização até a data de {{data_vencimento}}, a fim de evitar medidas cabíveis.

Em caso de quitação anterior, solicitamos desconsiderar este aviso.

Atenciosamente,

_________________________
{{vet_nome}}
CRMV {{vet_estado}} {{vet_crmv}}
{{cidade}}, {{data}}.`,
  },
  carta_ciencia_debitos: {
    title: "Carta de Ciência de Débitos",
    type: "Comunicação",
    content: `CARTA DE CIÊNCIA DE DÉBITOS

Eu, {{tutor_nome}}, CPF {{tutor_cpf}}, responsável pelo animal {{pet_nome}}, declaro ter ciência dos débitos relacionados aos atendimentos realizados neste estabelecimento, conforme discriminado abaixo ou em extrato anexo.

Comprometo-me a regularizar as pendências no prazo acordado. Fico ciente de que a não quitação poderá implicar em restrições a novos atendimentos e medidas de cobrança.

{{cidade}}, {{data}}.

_________________________
{{tutor_nome}}
CPF: {{tutor_cpf}}`,
  },
  autorizacao_eutanasia: {
    title: "Autorização para Eutanásia",
    type: "Autorização",
    content: `AUTORIZAÇÃO PARA EUTANÁSIA

Eu, {{tutor_nome}}, portador(a) do CPF {{tutor_cpf}}, na qualidade de responsável legal pelo animal {{pet_nome}}, da espécie {{pet_especie}}, raça {{pet_raca}}, após ter sido informado(a) sobre o estado de saúde do animal e as alternativas disponíveis, autorizo de forma livre e esclarecida a realização do procedimento de eutanásia.

Declaro estar ciente de que se trata de procedimento irreversível e que o mesmo será realizado por médico(a) veterinário(a) habilitado(a), de forma humanitária e em conformidade com a legislação vigente.

Motivo/Justificativa: {{motivo_eutanasia}}

{{cidade}}, {{data}}.

_________________________
{{tutor_nome}}
CPF: {{tutor_cpf}}

_________________________
Médico(a) Veterinário(a) Responsável
CRMV: {{vet_crmv}}`,
  },
  atestado_saude: {
    title: "Atestado de Saúde Animal",
    type: "Atestado",
    content: `ATESTADO DE SAÚDE ANIMAL

Atesto para os devidos fins que o animal abaixo identificado foi submetido a exame clínico nesta data, apresentando-se em bom estado geral de saúde.

IDENTIFICAÇÃO DO ANIMAL:
Nome: {{pet_nome}}
Espécie: {{pet_especie}}
Raça: {{pet_raca}}
Sexo: {{pet_sexo}}
Idade aproximada: {{pet_idade}}
Microchip: {{pet_microchip}}

IDENTIFICAÇÃO DO PROPRIETÁRIO:
Nome: {{tutor_nome}}
CPF: {{tutor_cpf}}
Endereço: {{tutor_endereco}}

OBSERVAÇÕES CLÍNICAS: {{observacoes}}

Este atestado é válido por {{validade}} dias a partir da data de emissão.

{{cidade}}, {{data}}.

_________________________
Dr(a). {{vet_nome}}
CRMV-{{vet_estado}} {{vet_crmv}}`,
  },
  atestado_obito: {
    title: "Declaração de Óbito Animal",
    type: "Atestado",
    content: `DECLARAÇÃO DE ÓBITO ANIMAL

Declaro para os devidos fins que o animal abaixo identificado veio a óbito nesta data.

IDENTIFICAÇÃO DO ANIMAL:
Nome: {{pet_nome}}
Espécie: {{pet_especie}}
Raça: {{pet_raca}}
Sexo: {{pet_sexo}}
Idade: {{pet_idade}}
Microchip: {{pet_microchip}}

PROPRIETÁRIO: {{tutor_nome}}
CPF: {{tutor_cpf}}

DATA E HORA DO ÓBITO: {{data_obito}}
CAUSA DO ÓBITO: {{causa_obito}}
OBSERVAÇÕES: {{observacoes}}

{{cidade}}, {{data}}.

_________________________
Dr(a). {{vet_nome}}
CRMV-{{vet_estado}} {{vet_crmv}}`,
  },
  laudo_aptidao_viagem: {
    title: "Laudo de Aptidão para Viagem",
    type: "Laudo",
    content: `LAUDO DE APTIDÃO PARA VIAGEM

IDENTIFICAÇÃO DO ANIMAL:
Nome: {{pet_nome}}
Espécie: {{pet_especie}}
Raça: {{pet_raca}}
Sexo: {{pet_sexo}}
Idade: {{pet_idade}}
Peso: {{pet_peso}} kg
Microchip: {{pet_microchip}}

PROPRIETÁRIO: {{tutor_nome}}
CPF: {{tutor_cpf}}
Telefone: {{tutor_telefone}}

EXAME CLÍNICO REALIZADO EM: {{data}}

Após avaliação clínica, ATESTO que o animal acima identificado encontra-se:
( ) APTO para viagem aérea/terrestre
( ) INAPTO para viagem - Motivo: _______________

VACINAÇÃO: Antirrábica e Polivalente em dia (conforme registro).
VERMIFUGAÇÃO: Em dia.

OBSERVAÇÕES: {{observacoes}}

Este laudo é válido por 10 (dez) dias a partir da data de emissão.

{{cidade}}, {{data}}.

_________________________
Dr(a). {{vet_nome}}
CRMV-{{vet_estado}} {{vet_crmv}}`,
  },
  termo_internacao: {
    title: "Termo de Internação",
    type: "Termo",
    content: `TERMO DE INTERNAÇÃO HOSPITALAR

Eu, {{tutor_nome}}, CPF {{tutor_cpf}}, autorizo a internação do animal {{pet_nome}} ({{pet_especie}} - {{pet_raca}}) para tratamento de: {{motivo_internacao}}.

DECLARO ESTAR CIENTE:
1. O animal ficará internado pelo período necessário ao tratamento;
2. Os custos de internação, medicamentos e procedimentos serão de minha responsabilidade;
3. Autorizo a realização de exames e procedimentos necessários;
4. Em caso de emergência, autorizo procedimentos de urgência;
5. Comprometo-me a manter contato telefônico disponível;
6. A alta será concedida apenas mediante quitação dos débitos.

CONTATOS PARA EMERGÊNCIA: {{tutor_telefone}}

{{cidade}}, {{data}}.

_________________________
{{tutor_nome}}
CPF: {{tutor_cpf}}`,
  },
  receituario_simples: {
    title: "Receituário Simples",
    type: "Receita",
    content: `RECEITUÁRIO

Paciente: {{pet_nome}}
Espécie: {{pet_especie}} | Raça: {{pet_raca}}
Peso: {{pet_peso}} kg
Tutor: {{tutor_nome}}
Data: {{data}}

Uso: ( ) Interno  ( ) Externo  ( ) Tópico

PRESCRIÇÃO:
_________________________________________________
_________________________________________________
_________________________________________________
_________________________________________________

ORIENTAÇÕES:
_________________________________________________
_________________________________________________

_________________________
Dr(a). {{vet_nome}}
CRMV-{{vet_estado}} {{vet_crmv}}`,
  },
};
