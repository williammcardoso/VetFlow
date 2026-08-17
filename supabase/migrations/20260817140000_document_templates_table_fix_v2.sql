-- Módulo de Documentos — seed gerado por scripts/seed-document-templates.mjs
-- (docs/documentos/vetflow-modelos-documentos.md), versão 2. Não editar
-- à mão; para corrigir texto, edite a biblioteca e rode o script de novo.
--
-- Idempotente: ON CONFLICT DO NOTHING em ambas as tabelas, então rodar de
-- novo não duplica nem sobrescreve uma versão já publicada.

-- A4 — Atestado / Declaração de Vacinação
insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 2, $dq$ATESTADO DE VACINAÇÃO

Atesto, para os devidos fins, que apliquei nesta data no animal abaixo
identificado a(s) vacina(s) especificada(s), observadas as recomendações
técnicas do fabricante e a cadeia de frio do imunobiológico.

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

Vacina 1
Nome: .................................................
Fabricante: .................................................
Lote: .................................................
Validade: .................................................
Via de aplicação: .................................................
Local de aplicação: .................................................
Data de aplicação: ....../....../......
Revacinação prevista: ....../....../......

Vacina 2 (se aplicável)
Nome: .................................................
Fabricante: .................................................
Lote: .................................................
Validade: .................................................
Via de aplicação: .................................................
Local de aplicação: .................................................
Data de aplicação: ....../....../......
Revacinação prevista: ....../....../......

Orientações pós-vacinais entregues ao responsável: ( ) Sim  ( ) Não
Observações: {{atend.observacoes}}

Declaro que o imunobiológico foi conservado sob refrigeração entre 2 °C e 8 °C
até o momento da aplicação.

[BLOCO DE ASSINATURA DO MÉDICO-VETERINÁRIO]$dq$,
  '["atend.observacoes"]'::jsonb,
  '[]'::jsonb,
  false, false, 1, now()
from public.document_templates
where codigo = 'A4'
on conflict (template_id, versao) do nothing;

-- C2 — Termo de Não Aceite / Recusa de Exames Complementares
insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 2, $dq$TERMO DE CIÊNCIA E RECUSA DE EXAMES COMPLEMENTARES

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

Data e hora: {{atend.data}} às {{atend.hora}}

1. QUADRO CLÍNICO
{{atend.quadro_atual}}

2. EXAMES INDICADOS E RECUSADOS
Foram indicados, com justificativa técnica, os exames abaixo, os quais RECUSO:

Hemograma completo
Finalidade: .................................................
Recusa: ( )

Perfil bioquímico
Finalidade: .................................................
Recusa: ( )

Urinálise / relação UPC
Finalidade: .................................................
Recusa: ( )

Radiografia
Finalidade: .................................................
Recusa: ( )

Ultrassonografia
Finalidade: .................................................
Recusa: ( )

Ecocardiograma / ECG
Finalidade: .................................................
Recusa: ( )

Citologia / histopatológico
Finalidade: .................................................
Recusa: ( )

Cultura e antibiograma
Finalidade: .................................................
Recusa: ( )

Tomografia / ressonância
Finalidade: .................................................
Recusa: ( )

Testes sorológicos / PCR
Finalidade: .................................................
Recusa: ( )

Exames pré-anestésicos
Finalidade: .................................................
Recusa: ( )

Outros: .................................................
Finalidade: .................................................
Recusa: ( )

3. CONSEQUÊNCIAS DA RECUSA
Fui expressamente informado(a) de que, sem os exames indicados:
- o diagnóstico permanecerá PRESUNTIVO, baseado apenas em achados clínicos;
- a conduta terapêutica será EMPÍRICA, com menor probabilidade de acerto;
- não será possível estratificar corretamente o risco anestésico e cirúrgico;
- doenças concomitantes relevantes podem permanecer não identificadas;
- a resposta ao tratamento não poderá ser adequadamente monitorada;
- pode haver atraso no diagnóstico, com piora do prognóstico;
- podem ocorrer complicações evitáveis, sequelas e ÓBITO.
Consequências específicas neste caso: {{atend.consequencias_recusa}}

4. CONDUTA ADOTADA DIANTE DA RECUSA
{{atend.conduta_recomendada}}

5. DECLARAÇÃO
Declaro que a recusa é decisão exclusivamente minha, livre e esclarecida,
CONTRÁRIA à orientação médico-veterinária; que compreendo que ela limita
significativamente a segurança e a precisão da conduta médica; que assumo
integral responsabilidade pelas consequências; e que isento o médico-veterinário
e o estabelecimento de responsabilidade por desfechos decorrentes da ausência
das informações que os exames recusados poderiam fornecer.

Motivo declarado (opcional): ( ) Financeiro ( ) Considera desnecessário
( ) Receio de estresse ao animal ( ) Outro: ......................

[BLOCO DE ASSINATURAS]

── EM CASO DE RECUSA DE ASSINATURA ──
1. Nome: .................. CPF: .......... Função: ......... Ass.: .........
2. Nome: .................. CPF: .......... Função: ......... Ass.: .........$dq$,
  '["atend.conduta_recomendada","atend.consequencias_recusa","atend.data","atend.hora","atend.quadro_atual"]'::jsonb,
  '[]'::jsonb,
  true, false, 2, now()
from public.document_templates
where codigo = 'C2'
on conflict (template_id, versao) do nothing;

-- D2 — Termo de Orçamento e Ciência de Custos
insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 2, $dq$ORÇAMENTO DE SERVIÇOS MÉDICO-VETERINÁRIOS

Orçamento nº {{doc.numero}} — Data: {{atend.data}}

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

Item 1
Descrição: .................................................
Quantidade: .................................................
Valor unitário: R$ .................................................
Subtotal: R$ .................................................

Item 2
Descrição: .................................................
Quantidade: .................................................
Valor unitário: R$ .................................................
Subtotal: R$ .................................................

TOTAL: R$ .................................................

Condições de pagamento: ...........................................
Validade deste orçamento: 10 (dez) dias a contar desta data.

NÃO ESTÃO INCLUSOS neste orçamento:
- exames complementares não listados;
- medicações e materiais decorrentes de intercorrências;
- diárias de internação além do previsto;
- reintervenções;
- tratamento de complicações;
- ................................................................

DECLARAÇÃO
Declaro que recebi este orçamento previamente à execução dos serviços; que fui
informado(a) de que se trata de ESTIMATIVA baseada na avaliação atual do
paciente; que intercorrências clínicas podem gerar custos adicionais, os quais
me serão comunicados assim que possível; e que, em situação de risco iminente
de morte, o atendimento será prestado independentemente de prévia aprovação
de custos adicionais.

( ) APROVO o orçamento e autorizo a execução dos serviços
( ) NÃO APROVO o orçamento

[BLOCO DE ASSINATURAS]$dq$,
  '["atend.data","doc.numero"]'::jsonb,
  '[]'::jsonb,
  true, false, 2, now()
from public.document_templates
where codigo = 'D2'
on conflict (template_id, versao) do nothing;
