-- Módulo de Documentos — seed gerado por scripts/seed-document-templates.mjs
-- (docs/documentos/vetflow-modelos-documentos.md), versão 1. Não editar
-- à mão; para corrigir texto, edite a biblioteca e rode o script de novo.
--
-- Idempotente: ON CONFLICT DO NOTHING em ambas as tabelas, então rodar de
-- novo não duplica nem sobrescreve uma versão já publicada.

-- A1 — Atestado de Comparecimento do Responsável
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('A1', $dq$Atestado de Comparecimento do Responsável$dq$, 'atestados', $dq$ATESTADOS E DECLARAÇÕES$dq$, $dq$art. 4º, §2º da Res. CFMV nº 1.321/2020 (o profissional pode emitir outros documentos que julgar necessários). Não é atestado médico de pessoa — apenas certifica a permanência do responsável no estabelecimento. Nunca declare condição de saúde humana nem justifique afastamento laboral; o documento apenas comprova o fato do comparecimento, cabendo ao empregador aceitá-lo ou não.$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$ATESTADO DE COMPARECIMENTO

Atesto, para os devidos fins, que o(a) Sr.(a) {{resp.nome}}, portador(a) do
CPF nº {{resp.cpf}}, compareceu a este estabelecimento médico-veterinário no
dia {{atend.data}}, no período das {{atend.hora_entrada}} às {{atend.hora_saida}},
acompanhando o animal sob sua responsabilidade, abaixo identificado, para
atendimento médico-veterinário.

IDENTIFICAÇÃO DO PACIENTE
Nome: {{pac.nome}} — Espécie: {{pac.especie}} — Raça: {{pac.raca}} —
Sexo: {{pac.sexo}} — Idade: {{pac.idade}} — Microchip: {{pac.microchip}}

Natureza do atendimento: {{atend.procedimento}}

Este atestado não contém informações clínicas sobre o paciente, em respeito ao
sigilo profissional, e destina-se exclusivamente à comprovação do comparecimento.

[BLOCO DE ASSINATURA DO MÉDICO-VETERINÁRIO]$dq$,
  '["atend.data","atend.hora_entrada","atend.hora_saida","atend.procedimento","pac.especie","pac.idade","pac.microchip","pac.nome","pac.raca","pac.sexo","resp.cpf","resp.nome"]'::jsonb,
  '[]'::jsonb,
  false, false, 2, now()
from public.document_templates
where codigo = 'A1'
on conflict (template_id, versao) do nothing;

-- A2 — Atestado / Declaração de Óbito
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('A2', $dq$Atestado / Declaração de Óbito$dq$, 'atestados', $dq$ATESTADOS E DECLARAÇÕES$dq$, $dq$art. 2º, I, Res. CFMV nº 1.321/2020. Documento privativo do médico-veterinário. Não pode conter rasuras ou emendas.$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$ATESTADO DE ÓBITO ANIMAL

Atesto, para os devidos fins, que o animal abaixo identificado veio a óbito
às {{atend.hora}} horas do dia {{atend.data}}.

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

Local do óbito: {{doc.local_obito}}

Causa mortis provável: {{atend.causa_mortis}}

Causa básica: ......................................................
Causa intermediária: ...............................................
Causa imediata: ....................................................

Diagnóstico estabelecido por: ( ) exame clínico  ( ) exames complementares
( ) necropsia  ( ) exame histopatológico  ( ) presuntivo

Houve eutanásia? ( ) Não  ( ) Sim — método empregado: ..................
(conforme Anexo I da Resolução CFMV nº 1.000/2012)

Trata-se de doença de notificação obrigatória? ( ) Não  ( ) Sim — órgão
notificado: ........................ em ...../...../..........

Informações complementares: {{atend.observacoes}}

[BLOCO DE ASSINATURA DO MÉDICO-VETERINÁRIO]$dq$,
  '["atend.causa_mortis","atend.data","atend.hora","atend.observacoes","doc.local_obito"]'::jsonb,
  '[]'::jsonb,
  false, false, 2, now()
from public.document_templates
where codigo = 'A2'
on conflict (template_id, versao) do nothing;

-- A3 — Atestado Sanitário / de Saúde Animal
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('A3', $dq$Atestado Sanitário / de Saúde Animal$dq$, 'atestados', $dq$ATESTADOS E DECLARAÇÕES$dq$, $dq$art. 2º, III, Res. CFMV nº 1.321/2020. Exceção à regra das duas vias — emitido em via única. Deve refletir apenas o que foi efetivamente constatado no exame.$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$ATESTADO DE SAÚDE ANIMAL

Atesto, para os devidos fins, que examinei clinicamente nesta data o animal
abaixo identificado, tendo constatado que o mesmo se encontra
( ) clinicamente sadio
( ) apto para transporte
( ) apto para participação em evento/exposição
( ) com as seguintes alterações: ..................................

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

Data e hora do exame: {{atend.data}} às {{atend.hora}}
Temperatura retal: ......... °C   FC: ......... bpm   FR: ......... mpm
Estado geral: .....................................................
Mucosas: ..........................................................
Linfonodos: .......................................................
Estado nutricional (ECC): ......../9

Ausência de sinais clínicos de doenças infectocontagiosas de notificação
obrigatória: ( ) Sim  ( ) Não

Situação vacinal (conforme carteira apresentada):
Antirrábica — Data: ....../....../......  Lote: ............  Fab.: ...........
Múltipla/Polivalente — Data: ....../....../......  Lote: ...........
Outras: ...........................................................

Situação de vermifugação: Produto ................ Data: ....../....../......

Exames complementares realizados: ..................................

Validade deste atestado: {{doc.validade}} (____ dias a contar desta data)

Observações: {{atend.observacoes}}

Este atestado refere-se exclusivamente ao estado de saúde constatado no momento
do exame clínico, não implicando garantia de sanidade futura.

[BLOCO DE ASSINATURA DO MÉDICO-VETERINÁRIO]$dq$,
  '["atend.data","atend.hora","atend.observacoes","doc.validade"]'::jsonb,
  '[]'::jsonb,
  false, false, 1, now()
from public.document_templates
where codigo = 'A3'
on conflict (template_id, versao) do nothing;

-- A4 — Atestado / Declaração de Vacinação
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('A4', $dq$Atestado / Declaração de Vacinação$dq$, 'atestados', $dq$ATESTADOS E DECLARAÇÕES$dq$, $dq$art. 2º, II, Res. CFMV nº 1.321/2020. A carteira de vacinação é exceção à regra das duas vias. A assinatura só pode ser aposta após a efetiva aplicação — é vedado assinar carteira em branco ou dar continuidade a carteira que não atenda aos requisitos normativos.$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$ATESTADO DE VACINAÇÃO

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

-- A5 — Relatório / Encaminhamento a Especialista
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('A5', $dq$Relatório / Encaminhamento a Especialista$dq$, 'atestados', $dq$ATESTADOS E DECLARAÇÕES$dq$, null, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$RELATÓRIO MÉDICO-VETERINÁRIO E ENCAMINHAMENTO

Ao(À) Colega: ....................................................
Especialidade: ...................................................

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

1. QUEIXA PRINCIPAL E ANAMNESE
{{atend.anamnese}}

2. EXAME FÍSICO
{{atend.exame_fisico}}

3. EXAMES COMPLEMENTARES REALIZADOS (laudos anexos)
{{atend.exames}}

4. DIAGNÓSTICO / HIPÓTESES DIAGNÓSTICAS
{{atend.diagnostico}}

5. TRATAMENTOS INSTITUÍDOS E RESPOSTA CLÍNICA
{{atend.tratamento}}

6. MEDICAÇÕES EM USO NO MOMENTO DO ENCAMINHAMENTO
{{atend.medicamentos}}

7. MOTIVO DO ENCAMINHAMENTO
{{atend.motivo_encaminhamento}}

8. OBSERVAÇÕES
{{atend.observacoes}}

Coloco-me à disposição para quaisquer esclarecimentos.

[BLOCO DE ASSINATURA DO MÉDICO-VETERINÁRIO]$dq$,
  '["atend.anamnese","atend.diagnostico","atend.exame_fisico","atend.exames","atend.medicamentos","atend.motivo_encaminhamento","atend.observacoes","atend.tratamento"]'::jsonb,
  '[]'::jsonb,
  false, false, 2, now()
from public.document_templates
where codigo = 'A5'
on conflict (template_id, versao) do nothing;

-- A6 — Solicitação de Exame de Imagem
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('A6', $dq$Solicitação de Exame de Imagem$dq$, 'atestados', $dq$ATESTADOS E DECLARAÇÕES$dq$, $dq$art. 4º, §2º, Res. CFMV nº 1.321/2020. A requisição de exame é ato privativo do médico-veterinário (Lei nº 5.517/1968). Deve conter dados suficientes para que o colega executor conduza o exame com a técnica adequada — requisição vaga gera exame inconclusivo.$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$SOLICITAÇÃO DE EXAME DE IMAGEM

Ao(À) serviço de diagnóstico por imagem: ..........................
A/C do(a) Médico(a)-Veterinário(a): ............... CRMV nº ........

Solicitante: {{vet.nome}} — CRMV-{{vet.crmv_uf}} nº {{vet.crmv}}
Telefone de contato do solicitante: {{vet.telefone}}
E-mail: {{vet.email}}
Data da solicitação: {{atend.data}}
Caráter: ( ) Eletivo  ( ) Prioritário  ( ) Urgência/Emergência

IDENTIFICAÇÃO DO PACIENTE
Nome: {{pac.nome}} — Espécie: {{pac.especie}} — Raça: {{pac.raca}}
Sexo: {{pac.sexo}} — Idade: {{pac.idade}} — Peso: {{pac.peso}} kg
Microchip: {{pac.microchip}}

RESPONSÁVEL PELO ANIMAL
Nome: {{resp.nome}} — Telefone: {{resp.telefone}}

1. EXAME SOLICITADO
{{exame.descricao}}
Modalidade: ( ) Radiografia ( ) Ultrassonografia ( ) Tomografia
( ) Ressonância ( ) Ecocardiograma ( ) Fluoroscopia ( ) Cintilografia
Região anatômica: ................................................
Contraste: ( ) Não ( ) Sim — tipo/via: .........................

2. REQUISITOS TÉCNICOS
{{exame.requisitos}}
(Ex.: número mínimo de canais; espessura de corte; fases de aquisição;
projeções ou planos obrigatórios; reconstruções MPR/3D; janela de leitura.)

3. HISTÓRICO CLÍNICO E SUSPEITA DIAGNÓSTICA
{{atend.anamnese}}
Suspeita(s): {{atend.diagnostico_presuntivo}}
Exames prévios relevantes e seus achados: ........................
Tratamentos em curso: {{atend.medicamentos}}

4. OBJETIVO DO EXAME — perguntas a serem respondidas
{{exame.objetivos}}

5. AVALIAÇÃO DE RISCO PARA SEDAÇÃO / ANESTESIA
Necessita sedação ou anestesia geral: ( ) Não ( ) Sim ( ) A critério
Classificação ASA: ( ) I ( ) II ( ) III ( ) IV ( ) V ( ) E
Comorbidades relevantes: {{atend.comorbidades}}
Função renal avaliada (relevante para contraste iodado):
Creatinina: ......... mg/dL — Ureia: ......... mg/dL — Data: ......
Alergias conhecidas: .............................................
Jejum orientado: alimentar ____ h / hídrico ____ h

6. OBSERVAÇÕES E CUIDADOS ESPECIAIS
{{exame.observacoes}}

7. ENTREGA DO RESULTADO
( ) Laudo em PDF  ( ) Imagens em DICOM  ( ) Mídia física
Enviar para: {{vet.email}}
Prazo desejado: ..................................................

Coloco-me à disposição para discutir o caso.

[BLOCO DE ASSINATURA DO MÉDICO-VETERINÁRIO]$dq$,
  '["atend.anamnese","atend.comorbidades","atend.data","atend.diagnostico_presuntivo","atend.medicamentos","exame.descricao","exame.objetivos","exame.observacoes","exame.requisitos","pac.especie","pac.idade","pac.microchip","pac.nome","pac.peso","pac.raca","pac.sexo","resp.nome","resp.telefone","vet.crmv","vet.crmv_uf","vet.email","vet.nome","vet.telefone"]'::jsonb,
  '[]'::jsonb,
  false, false, 2, now()
from public.document_templates
where codigo = 'A6'
on conflict (template_id, versao) do nothing;

-- A7 — Solicitação de Exame Laboratorial / Anatomopatológico
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('A7', $dq$Solicitação de Exame Laboratorial / Anatomopatológico$dq$, 'atestados', $dq$ATESTADOS E DECLARAÇÕES$dq$, null, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$SOLICITAÇÃO DE EXAME LABORATORIAL / ANATOMOPATOLÓGICO

Ao laboratório: ...................................................
Solicitante: {{vet.nome}} — CRMV-{{vet.crmv_uf}} nº {{vet.crmv}}
Data e hora da coleta: {{atend.data}} às {{atend.hora}}
Caráter: ( ) Rotina  ( ) Urgência

IDENTIFICAÇÃO DO PACIENTE
Nome: {{pac.nome}} — Espécie: {{pac.especie}} — Raça: {{pac.raca}}
Sexo: {{pac.sexo}} — Castrado: {{pac.castrado}} — Idade: {{pac.idade}}
Peso: {{pac.peso}} kg — Microchip: {{pac.microchip}}
Responsável: {{resp.nome}} — Tel.: {{resp.telefone}}

1. EXAMES SOLICITADOS
{{exame.lista}}

2. MATERIAL ENVIADO
Tipo: ( ) Sangue total EDTA ( ) Soro ( ) Plasma ( ) Urina
( ) Swab ( ) Aspirado ( ) Fragmento tecidual ( ) Peça cirúrgica integral
( ) Líquido cavitário ( ) Medula óssea ( ) Outro: ................
Nº de frascos/recipientes: ....... Fixador: ( ) Formol 10% ( ) Nenhum
Proporção fixador:tecido: .........  Data da fixação: ....../....../......
Identificação das amostras: ......................................
Marcação de margens cirúrgicas: ( ) Não ( ) Sim — descrever código de
cores/fios: ......................................................

3. HISTÓRICO CLÍNICO
{{atend.anamnese}}
Duração da evolução: .............................................
Tratamentos prévios (especialmente corticoide e antimicrobiano):
{{atend.medicamentos}}

4. DESCRIÇÃO MACROSCÓPICA DA LESÃO (para anatomopatológico)
Localização anatômica exata: .....................................
Dimensões: ....... x ....... x ....... cm
Aspecto: ( ) Nodular ( ) Ulcerado ( ) Infiltrativo ( ) Cístico
( ) Pediculado ( ) Séssil — Consistência: ........................
Aderência a planos profundos: ( ) Sim ( ) Não
Crescimento: ( ) Lento ( ) Rápido — Tempo de evolução: ...........
Tipo de excisão: ( ) Incisional/biópsia ( ) Excisional marginal
( ) Excisional ampla ( ) Radical — Margens estimadas: ....... cm

5. SUSPEITA DIAGNÓSTICA
{{atend.diagnostico_presuntivo}}

6. PERGUNTAS AO PATOLOGISTA
( ) Diagnóstico histopatológico
( ) Grau histológico
( ) Avaliação de margens cirúrgicas
( ) Índice mitótico
( ) Invasão vascular ou linfática
( ) Necessidade de imuno-histoquímica — painel sugerido: ..........
( ) Outra: .......................................................

7. ENVIO DO LAUDO
E-mail: {{vet.email}} — Telefone: {{vet.telefone}}

[BLOCO DE ASSINATURA DO MÉDICO-VETERINÁRIO]$dq$,
  '["atend.anamnese","atend.data","atend.diagnostico_presuntivo","atend.hora","atend.medicamentos","exame.lista","pac.castrado","pac.especie","pac.idade","pac.microchip","pac.nome","pac.peso","pac.raca","pac.sexo","resp.nome","resp.telefone","vet.crmv","vet.crmv_uf","vet.email","vet.nome","vet.telefone"]'::jsonb,
  '[]'::jsonb,
  false, false, 2, now()
from public.document_templates
where codigo = 'A7'
on conflict (template_id, versao) do nothing;

-- B1 — TCLE — Realização de Exames
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('B1', $dq$TCLE — Realização de Exames$dq$, 'consentimento', $dq$TERMOS DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)$dq$, $dq$art. 4º, I, Res. CFMV nº 1.321/2020. Quando o exame oferecer riscos, é obrigatório informar o grau de comprometimento e a possibilidade de debilidade de sentido ou função.$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO
PARA REALIZAÇÃO DE EXAMES

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

1. EXAME(S) INDICADO(S)
{{atend.exames_indicados}}

2. JUSTIFICATIVA CLÍNICA
{{atend.justificativa}}

3. DESCRIÇÃO DO PROCEDIMENTO
Fui informado(a), em linguagem clara e acessível, sobre como o exame será
realizado: {{atend.descricao_exame}}

4. NECESSIDADE DE PREPARO PRÉVIO
( ) Jejum alimentar de ______ horas   ( ) Jejum hídrico de ______ horas
( ) Suspensão de medicamentos: ...................................
( ) Tricotomia   ( ) Outros: ....................................

5. NECESSIDADE DE SEDAÇÃO OU ANESTESIA
( ) Não  ( ) Sim — neste caso, será apresentado o Termo de Consentimento
específico para procedimentos anestésicos.

6. RISCOS E POSSÍVEIS COMPLICAÇÕES
Declaro ter sido esclarecido(a) de que todo procedimento diagnóstico envolve
riscos, dentre os quais:
- reações adversas a contrastes, sedativos ou anestésicos;
- hematomas, sangramento ou infecção no local de coleta ou punção;
- desconforto, dor, estresse e alterações comportamentais transitórias;
- em exames invasivos: perfuração de órgãos, hemorragia, disseminação de
  células neoplásicas pelo trajeto da agulha, pneumotórax, peritonite;
- possibilidade de agravamento do quadro clínico em pacientes debilitados;
- em casos raros, óbito.
Riscos específicos deste exame: {{atend.riscos_exame}}
Possibilidade de comprometimento, debilidade ou perda de sentido ou função:
{{atend.riscos_funcao}}

7. LIMITAÇÕES DO MÉTODO
Fui informado(a) de que nenhum exame possui 100% de sensibilidade e
especificidade; que podem ocorrer resultados falso-negativos e falso-positivos;
que o resultado pode ser inconclusivo e exigir repetição ou exames adicionais;
e que a interpretação depende sempre da correlação com o quadro clínico.

8. ALTERNATIVAS
Foram-me apresentadas as seguintes alternativas: {{atend.alternativas}}

9. CUSTOS
Fui informado(a) previamente do valor de R$ {{atend.valor}} e de que exames
complementares adicionais poderão ser necessários, com custo à parte,
mediante nova autorização.

10. PRAZO DE ENTREGA DO RESULTADO
Previsão: {{atend.prazo_resultado}}. Prazos podem sofrer alteração por fatores
técnicos ou laboratoriais.

11. DECLARAÇÃO
Declaro que li integralmente este termo, que me foi dada oportunidade de fazer
perguntas e que todas foram respondidas de forma satisfatória; que não me foi
prometido qualquer resultado ou garantia de cura; que compreendo que a
obrigação assumida pelo médico-veterinário é de meio e não de resultado; e que
AUTORIZO livremente a realização do(s) exame(s) descrito(s).

[BLOCO DE ASSINATURAS]

TESTEMUNHAS (quando aplicável)
1. Nome: ......................... CPF: .............. Ass.: ...........
2. Nome: ......................... CPF: .............. Ass.: ...........$dq$,
  '["atend.alternativas","atend.descricao_exame","atend.exames_indicados","atend.justificativa","atend.prazo_resultado","atend.riscos_exame","atend.riscos_funcao","atend.valor"]'::jsonb,
  '[]'::jsonb,
  true, true, 2, now()
from public.document_templates
where codigo = 'B1'
on conflict (template_id, versao) do nothing;

-- B2 — TCLE — Procedimento Cirúrgico
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('B2', $dq$TCLE — Procedimento Cirúrgico$dq$, 'consentimento', $dq$TERMOS DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)$dq$, $dq$art. 4º, III, Res. CFMV nº 1.321/2020. Modelo especialmente relevante para cirurgia de tecidos moles.$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO
PARA REALIZAÇÃO DE PROCEDIMENTO CIRÚRGICO

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

1. DIAGNÓSTICO / INDICAÇÃO
{{atend.diagnostico}}

2. PROCEDIMENTO CIRÚRGICO PROPOSTO
{{atend.procedimento}}
Caráter: ( ) Eletivo  ( ) Urgência  ( ) Emergência
Objetivo: ( ) Curativo  ( ) Paliativo  ( ) Diagnóstico  ( ) Estético/funcional

3. DESCRIÇÃO EM LINGUAGEM ACESSÍVEL
{{atend.descricao_cirurgia}}

4. EQUIPE
Cirurgião responsável: {{vet.nome}} — CRMV-{{vet.crmv_uf}} nº {{vet.crmv}}
Anestesista: ................................ CRMV nº ..............
Auxiliares: ........................................................

5. AVALIAÇÃO PRÉ-OPERATÓRIA REALIZADA
( ) Exame clínico  ( ) Hemograma  ( ) Bioquímico  ( ) Coagulograma
( ) ECG  ( ) Ecocardiograma  ( ) Radiografia  ( ) Ultrassonografia
( ) Outros: ...............   ( ) Dispensada pelo responsável (justificar): ......
Classificação ASA: ( ) I ( ) II ( ) III ( ) IV ( ) V ( ) E

6. RISCOS E COMPLICAÇÕES POSSÍVEIS
Declaro ter sido informado(a), de forma clara, de que todo ato cirúrgico
envolve riscos que não podem ser integralmente eliminados, incluindo:
- riscos anestésicos, inclusive parada cardiorrespiratória e óbito;
- hemorragia trans e pós-operatória, necessidade de transfusão sanguínea;
- infecção de ferida cirúrgica, deiscência de sutura, seroma, hérnia incisional;
- reação a fios, implantes, próteses ou materiais de síntese;
- lesão inadvertida de estruturas adjacentes (vasos, nervos, ureteres, alças
  intestinais e demais órgãos);
- deiscência de anastomoses, peritonite, íleo paralítico, aderências;
- reações adversas, alérgicas e idiossincráticas a fármacos;
- hipotensão, hipertensão, arritmias e parada cardiorrespiratória;
- hipoglicemia, hipotermia e distúrbios hidroeletrolíticos e ácido-base;
- sepse, choque séptico e coagulação intravascular disseminada (CID);
- tromboembolismo;
- necessidade de ampliação do procedimento, conversão de técnica ou realização
  de procedimentos não previstos, quando constatada intercorrência intraoperatória;
- necessidade de reintervenção cirúrgica;
- resultado estético e/ou funcional diverso do esperado;
- evolução desfavorável, sequelas permanentes ou óbito, ainda que a técnica
  tenha sido corretamente empregada.
Riscos específicos deste caso: {{atend.riscos_especificos}}

7. FATORES AGRAVANTES IDENTIFICADOS NESTE PACIENTE
{{atend.comorbidades}}

8. PROGNÓSTICO
( ) Favorável  ( ) Reservado  ( ) Desfavorável
Justificativa: {{atend.prognostico}}

9. AUTORIZAÇÃO PARA CONDUTAS NÃO PREVISTAS
AUTORIZO a equipe a adotar, durante o ato cirúrgico, as condutas que se
mostrarem tecnicamente indispensáveis diante de achados ou intercorrências não
previstas, incluindo ampliação da cirurgia, ressecção de tecidos ou órgãos,
transfusão sanguínea e demais medidas necessárias à preservação da vida do
paciente, quando não for possível ou viável nova consulta prévia.
( ) Autorizo   ( ) Não autorizo

10. AUTORIZAÇÃO PARA EUTANÁSIA INTRAOPERATÓRIA
Na hipótese de se constatar, durante o ato cirúrgico, condição incompatível com
a vida ou com o bem-estar do paciente, sem possibilidade de correção e com
sofrimento irreversível (nos termos do art. 3º, I, da Res. CFMV nº 1.000/2012):
( ) Autorizo a eutanásia intraoperatória
( ) Não autorizo — desejo ser contatado(a) no telefone {{resp.telefone}}
( ) Não autorizo em nenhuma hipótese

11. PREPARO, HIGIENIZAÇÃO E TRICOTOMIA
Estou ciente de que o preparo do paciente para o ato cirúrgico exige
procedimentos de higienização e antissepsia, incluindo TRICOTOMIA (remoção
dos pelos) nas áreas necessárias para o acesso cirúrgico, punção venosa,
sondagem, drenos, cateteres, bloqueios locorregionais e monitoração.
Fui informado(a) de que:
- a extensão da tricotomia é definida por critério técnico e pode ser maior
  do que a área da incisão, por exigência das normas de antissepsia;
- o pelo pode levar semanas a meses para retornar ao aspecto original;
- pode ocorrer ALOPECIA PÓS-TRICOTOMIA, com crescimento lento, irregular ou
  em ritmos diferentes entre as áreas, alteração de textura e de coloração
  da pelagem;
- em algumas raças, especialmente as nórdicas e de pelo duplo, o retorno
  completo da pelagem pode levar até cerca de 2 (dois) anos, e em casos
  isolados o padrão original pode não ser integralmente recuperado;
- trata-se de fenômeno de natureza fisiológica e individual, não decorrente
  de falha técnica;
- podem ainda ocorrer dermatite, foliculite ou irritação cutânea transitória
  no local da tricotomia e da antissepsia.
Estou ciente e de acordo com a realização da tricotomia nas condições acima.
( ) De acordo   ( ) Não autorizo — ciente de que a recusa inviabiliza a
realização do procedimento em condições seguras de antissepsia

12. DESTINAÇÃO DE MATERIAL BIOLÓGICO
Material excisado será encaminhado para exame histopatológico?
( ) Sim, autorizo (custo à parte: R$ ..........)  ( ) Não autorizo
( ) Autorizo o descarte conforme legislação sanitária
( ) Autorizo o uso anônimo de material residual para fins de ensino e pesquisa

13. CUIDADOS PÓS-OPERATÓRIOS
Comprometo-me a seguir integralmente as orientações pós-operatórias, incluindo
administração correta das medicações, restrição de exercícios, uso de colar
elizabetano ou roupa cirúrgica, cuidados com a ferida e comparecimento nas datas
de retorno e retirada de pontos. Estou ciente de que o descumprimento dessas
orientações pode comprometer o resultado e que, nessa hipótese, não caberá
responsabilização do profissional pelas complicações daí decorrentes.

14. CUSTOS E COMPROMISSO FINANCEIRO
Valor previsto do procedimento: R$ {{atend.valor}}
Itens inclusos: ...................................................
Itens NÃO inclusos: ...............................................
Estou ciente de que intercorrências podem gerar custos adicionais, os quais me
serão informados assim que possível, e COMPROMETO-ME a arcar com todas as
despesas decorrentes do atendimento autorizado por este instrumento, incluindo
as decorrentes de intercorrências, prorrogação de internação e reintervenções
tecnicamente necessárias.

15. DECLARAÇÃO FINAL
Declaro que prestei informações verdadeiras e completas sobre o histórico,
alimentação, jejum, medicações em uso e alergias do paciente; que li e
compreendi integralmente este termo; que tive todas as dúvidas esclarecidas;
que nenhum resultado me foi garantido; que compreendo que a obrigação do
médico-veterinário é de meio, consistindo no emprego diligente da técnica
adequada; e que AUTORIZO livre e conscientemente a realização do procedimento.

[BLOCO DE ASSINATURAS]

TESTEMUNHAS
1. Nome: ......................... CPF: .............. Ass.: ...........
2. Nome: ......................... CPF: .............. Ass.: ...........$dq$,
  '["atend.comorbidades","atend.descricao_cirurgia","atend.diagnostico","atend.procedimento","atend.prognostico","atend.riscos_especificos","atend.valor","resp.telefone","vet.crmv","vet.crmv_uf","vet.nome"]'::jsonb,
  '[]'::jsonb,
  true, true, 2, now()
from public.document_templates
where codigo = 'B2'
on conflict (template_id, versao) do nothing;

-- B3 — TCLE — Procedimentos Anestésicos
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('B3', $dq$TCLE — Procedimentos Anestésicos$dq$, 'consentimento', $dq$TERMOS DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)$dq$, $dq$art. 4º, VI, Res. CFMV nº 1.321/2020.$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO
PARA REALIZAÇÃO DE PROCEDIMENTOS ANESTÉSICOS

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

1. PROCEDIMENTO PARA O QUAL A ANESTESIA É NECESSÁRIA
{{atend.procedimento}}

2. TIPO DE ANESTESIA PREVISTO
( ) Sedação  ( ) Anestesia local  ( ) Anestesia locorregional/bloqueio
( ) Anestesia geral inalatória  ( ) Anestesia geral injetável  ( ) Combinada
Fármacos previstos: {{atend.protocolo_anestesico}}
Estou ciente de que o protocolo poderá ser alterado a critério técnico da equipe,
conforme a resposta individual do paciente.

3. AVALIAÇÃO PRÉ-ANESTÉSICA
Classificação ASA: ( ) I ( ) II ( ) III ( ) IV ( ) V ( ) E
Exames realizados: ................................................
Comorbidades identificadas: {{atend.comorbidades}}
Jejum orientado: alimentar ____ h / hídrico ____ h — cumprido? ( ) Sim ( ) Não

4. RISCOS ANESTÉSICOS
Fui informado(a) de que a anestesia, mesmo quando corretamente conduzida,
envolve riscos, incluindo:
- hipotensão, hipertensão, arritmias, bradicardia, taquicardia;
- depressão ou parada respiratória; hipóxia; broncoaspiração;
- hipotermia; hipertermia maligna;
- reações alérgicas ou idiossincráticas a fármacos;
- recuperação prolongada, disforia, agitação, vocalização;
- lesão de nervo periférico por posicionamento; lesão de córnea;
- lesão traqueal ou laríngea por intubação;
- insuficiência renal ou hepática pós-anestésica;
- parada cardiorrespiratória e ÓBITO.
Estou ciente de que pacientes idosos, neonatos, braquicefálicos, obesos,
cardiopatas, nefropatas, hepatopatas, endocrinopatas, debilitados ou em
emergência apresentam risco anestésico significativamente aumentado.

5. MONITORAÇÃO
Serão empregados os seguintes recursos: ( ) Oximetria ( ) Capnografia
( ) ECG ( ) PA não invasiva ( ) PA invasiva ( ) Temperatura ( ) Ventilação
mecânica ( ) Fluidoterapia ( ) Aquecimento ativo ( ) Outros: ..............

6. AUTORIZAÇÃO PARA MANOBRAS DE REANIMAÇÃO
Em caso de parada cardiorrespiratória:
( ) AUTORIZO todas as manobras de reanimação cardiopulmonar cerebral
( ) AUTORIZO manobras limitadas a: ................................
( ) NÃO AUTORIZO manobras de reanimação (ordem de não reanimar)

7. DECLARAÇÃO
Declaro ter prestado informações verdadeiras sobre jejum, medicações,
alergias e histórico do paciente; que compreendi os riscos descritos; que
nenhum resultado me foi garantido; e que AUTORIZO a realização do procedimento
anestésico.

[BLOCO DE ASSINATURAS]$dq$,
  '["atend.comorbidades","atend.procedimento","atend.protocolo_anestesico"]'::jsonb,
  '[]'::jsonb,
  true, false, 2, now()
from public.document_templates
where codigo = 'B3'
on conflict (template_id, versao) do nothing;

-- B4 — TCLE — Procedimento Terapêutico de Risco
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('B4', $dq$TCLE — Procedimento Terapêutico de Risco$dq$, 'consentimento', $dq$TERMOS DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)$dq$, $dq$art. 4º, II, Res. CFMV nº 1.321/2020. Usar para quimioterapia, transfusão, hemodiálise, imunoterapia, uso off-label, terapias experimentais.$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO
PARA REALIZAÇÃO DE PROCEDIMENTO TERAPÊUTICO DE RISCO

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

1. DIAGNÓSTICO
{{atend.diagnostico}}

2. PROCEDIMENTO/TERAPIA PROPOSTA
{{atend.procedimento}}
Modalidade: ( ) Quimioterapia antineoplásica  ( ) Transfusão de sangue ou
hemocomponentes  ( ) Hemodiálise/diálise peritoneal  ( ) Imunoterapia
( ) Radioterapia  ( ) Terapia com iodo radioativo  ( ) Uso off-label de
medicamento  ( ) Terapia sem consenso científico consolidado
( ) Outro: .......................................................

3. FINALIDADE
( ) Curativa  ( ) Controle da doença  ( ) Paliativa/qualidade de vida

4. PROTOCOLO PREVISTO
Fármacos/produtos: ................................................
Doses: ............................................................
Número de sessões/aplicações previstas: ...........................
Intervalo entre sessões: ..........................................
Duração estimada do tratamento: ...................................

5. RISCOS E EFEITOS ADVERSOS
Fui informado(a) de que o tratamento proposto apresenta riscos, incluindo:
{{atend.riscos_especificos}}
Em quimioterapia: mielossupressão, neutropenia febril, sepse, anemia,
trombocitopenia, vômito, diarreia, anorexia, alopecia, nefrotoxicidade,
hepatotoxicidade, cardiotoxicidade, cistite hemorrágica, extravasamento com
necrose tecidual, reações de hipersensibilidade e óbito.
Em transfusão: reações hemolíticas agudas e tardias, reações febris não
hemolíticas, urticária, anafilaxia, sobrecarga circulatória, hipocalcemia,
transmissão de agentes infecciosos e óbito.
Em uso off-label: ausência de registro para a indicação proposta na espécie,
com dados de segurança e eficácia limitados, podendo haver efeitos adversos
não descritos na literatura.

6. ALTERNATIVAS TERAPÊUTICAS
{{atend.alternativas}}
Consequências previsíveis da não realização do tratamento:
{{atend.consequencias_recusa}}

7. PROGNÓSTICO E EXPECTATIVA REALISTA
{{atend.prognostico}}
Estou ciente de que o tratamento NÃO garante cura, remissão, aumento de
sobrevida ou melhora da qualidade de vida, e de que a resposta é individual
e imprevisível.

8. NECESSIDADE DE MONITORAÇÃO
Exames de controle necessários: ...................................
Periodicidade: ....................................................
Estou ciente de que a recusa em realizar os exames de controle inviabiliza a
continuidade segura do tratamento.

9. CUSTOS
Valor estimado por sessão: R$ ............
Valor total estimado do protocolo: R$ ............
Custos de exames de controle, internações e manejo de efeitos adversos não
estão inclusos.

10. DECLARAÇÃO
Declaro que li e compreendi este termo; que fui esclarecido(a) sobre riscos,
benefícios e alternativas; que nenhum resultado me foi garantido; que posso
interromper o tratamento a qualquer momento, mediante assinatura do respectivo
termo de recusa; e que AUTORIZO a realização do procedimento.

[BLOCO DE ASSINATURAS]

TESTEMUNHAS
1. Nome: ......................... CPF: .............. Ass.: ...........
2. Nome: ......................... CPF: .............. Ass.: ...........$dq$,
  '["atend.alternativas","atend.consequencias_recusa","atend.diagnostico","atend.procedimento","atend.prognostico","atend.riscos_especificos"]'::jsonb,
  '[]'::jsonb,
  true, true, 2, now()
from public.document_templates
where codigo = 'B4'
on conflict (template_id, versao) do nothing;

-- B5 — TCLE — Internação e Tratamento Clínico ou Pós-Cirúrgico
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('B5', $dq$TCLE — Internação e Tratamento Clínico ou Pós-Cirúrgico$dq$, 'consentimento', $dq$TERMOS DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)$dq$, $dq$art. 4º, V, Res. CFMV nº 1.321/2020.$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO
PARA INTERNAÇÃO E TRATAMENTO CLÍNICO OU PÓS-CIRÚRGICO

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

Data e hora da internação: {{atend.data}} às {{atend.hora}}

1. MOTIVO DA INTERNAÇÃO
{{atend.diagnostico}}

2. PLANO TERAPÊUTICO INICIAL
{{atend.tratamento}}
Estou ciente de que o plano poderá ser modificado conforme a evolução clínica.

3. PREVISÃO DE PERMANÊNCIA
Estimativa: ______ dia(s). Estou ciente de que se trata de estimativa e que a
permanência efetiva depende da evolução do paciente.

4. REGIME DE INTERNAÇÃO
( ) Semi-intensivo  ( ) Intensivo (UTI)  ( ) Isolamento
Horário de visitas: ...............................................
Contato para informações: .........................................
Frequência de atualizações ao responsável: ........................

5. RISCOS INERENTES À INTERNAÇÃO
Fui informado(a) sobre:
- risco de infecção hospitalar e colonização por microrganismos multirresistentes;
- estresse do ambiente hospitalar, anorexia, alterações comportamentais;
- flebite, extravasamento e necessidade de troca de acessos venosos;
- úlceras de decúbito em pacientes acamados;
- broncoaspiração em pacientes com alteração de consciência ou disfagia;
- agravamento do quadro clínico, complicações e óbito, ainda que prestada
  assistência tecnicamente adequada;
- possibilidade de contenção física ou química quando necessária à segurança
  do paciente e da equipe.

6. AUTORIZAÇÕES ESPECÍFICAS DURANTE A INTERNAÇÃO
AUTORIZO a equipe a realizar, sem consulta prévia caso a urgência não permita:
( ) Coleta de sangue e demais amostras para exames
( ) Cateterização venosa, urinária e sondagem
( ) Fluidoterapia e administração de medicações
( ) Oxigenoterapia
( ) Transfusão de sangue ou hemocomponentes
( ) Toracocentese, abdominocentese e demais punções
( ) Ventilação mecânica
( ) Manobras de reanimação cardiopulmonar cerebral

7. ORDEM DE NÃO REANIMAR
Em caso de parada cardiorrespiratória:
( ) AUTORIZO reanimação completa
( ) AUTORIZO reanimação parcial: ..................................
( ) NÃO AUTORIZO manobras de reanimação

8. LIMITE FINANCEIRO E COMUNICAÇÃO
Valor da diária: R$ ............
Limite de gastos autorizado sem nova consulta: R$ ............
Estou ciente de que exames, medicações e procedimentos são cobrados à parte e
que serei comunicado(a) sempre que possível antes de gastos que superem o
limite acima. Comprometo-me a manter contato disponível pelos telefones
informados e a atender às chamadas do estabelecimento.

9. RESPONSABILIDADE PELO ANIMAL E ABANDONO
Comprometo-me a retirar o paciente em até 24 horas após a comunicação de alta
médica ou de óbito. Estou ciente de que o não comparecimento por prazo superior
a 15 (quinze) dias corridos, após notificação por escrito, poderá caracterizar
abandono, sujeitando-me às sanções do art. 32 da Lei nº 9.605/1998, com as
alterações da Lei nº 14.064/2020, sem prejuízo da cobrança das despesas.

10. DECLARAÇÃO
Declaro que prestei informações verdadeiras e completas sobre o paciente; que
li e compreendi este termo; que nenhum resultado me foi garantido; e que
AUTORIZO a internação e o tratamento propostos.

[BLOCO DE ASSINATURAS]$dq$,
  '["atend.data","atend.diagnostico","atend.hora","atend.tratamento"]'::jsonb,
  '[]'::jsonb,
  true, false, 2, now()
from public.document_templates
where codigo = 'B5'
on conflict (template_id, versao) do nothing;

-- B6 — TCLE — Eutanásia
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('B6', $dq$TCLE — Eutanásia$dq$, 'consentimento', $dq$TERMOS DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)$dq$, $dq$art. 4º, VII, Res. CFMV nº 1.321/2020 c/c Resolução CFMV nº 1.000/2012. Pontos críticos da Res. 1.000/2012: eutanásia é ato clínico de competência privativa do médico-veterinário (art. 5º — participação obrigatória na supervisão e/ou execução); só pode ser indicada nas hipóteses do art. 3º; a morte deve ser comprovada e o óbito declarado pelo médico-veterinário responsável (art. 10, III); métodos devem constar do Anexo I; métodos inaceitáveis constituem infração ética (art. 15) e a inobservância sujeita o profissional a processo ético-profissional (art. 16); o ambiente deve ser tranquilo e adequado, respeitando o comportamento da espécie (art. 7º).$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO E AUTORIZAÇÃO
PARA REALIZAÇÃO DE EUTANÁSIA

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

1. DECLARAÇÃO DE TITULARIDADE
Declaro, sob as penas da lei, ser o(a) legítimo(a) responsável pelo animal
acima identificado, possuindo plena capacidade civil e poderes para decidir
sobre sua destinação, respondendo civil e criminalmente pela veracidade desta
declaração, nos termos do art. 299 do Código Penal.

2. DIAGNÓSTICO E QUADRO CLÍNICO
{{atend.diagnostico}}

3. FUNDAMENTAÇÃO DA INDICAÇÃO
A eutanásia é indicada neste caso com fundamento no art. 3º da Resolução CFMV
nº 1.000/2012, pela(s) seguinte(s) razão(ões):
( ) O bem-estar do animal está comprometido de forma irreversível, sendo a
    eutanásia meio de eliminar dor ou sofrimento que não podem ser controlados
    por analgésicos, sedativos ou outros tratamentos
( ) O animal constitui ameaça à saúde pública
( ) O animal constitui ameaça à saúde animal
( ) O animal é objeto de atividade científica ou de ensino devidamente
    autorizada por Comissão de Ética no Uso de Animais
( ) Outra hipótese prevista na norma: ..............................

Descrição clínica que sustenta a indicação:
{{atend.justificativa_eutanasia}}

4. ALTERNATIVAS APRESENTADAS
Foram-me apresentadas e explicadas as seguintes alternativas:
( ) Continuidade do tratamento curativo: ..........................
( ) Cuidados paliativos e analgesia: ..............................
( ) Encaminhamento a especialista ou segunda opinião: .............
( ) Não há alternativa terapêutica viável
Manifestação do responsável: {{atend.observacoes}}

5. ESCLARECIMENTOS SOBRE O PROCEDIMENTO
Fui informado(a), em linguagem clara e acessível, de que:
- a eutanásia é a indução da cessação da vida do animal por método tecnicamente
  aceitável e cientificamente comprovado, com observância dos princípios éticos;
- o procedimento é IRREVERSÍVEL;
- será realizado em ambiente tranquilo e adequado, respeitando o comportamento
  da espécie;
- será precedido de sedação/anestesia profunda, de modo a assegurar inconsciência
  antes da administração do agente eutanásico;
- serão empregados exclusivamente métodos constantes do Anexo I da Resolução
  CFMV nº 1.000/2012;
- podem ocorrer, mesmo em procedimento corretamente conduzido, manifestações
  fisiológicas reflexas após a perda de consciência — movimentos musculares,
  vocalização agônica, respiração agônica, relaxamento de esfíncteres com
  eliminação de urina e fezes, midríase — que NÃO significam dor, sofrimento
  ou consciência;
- a morte será comprovada pelo médico-veterinário antes de qualquer manejo
  posterior do corpo.

6. MÉTODO A SER EMPREGADO
Sedação/anestesia prévia: .........................................
Agente eutanásico: ................................................
Via de administração: .............................................
Método classificado como: ( ) aceitável  ( ) aceito sob restrição
(conforme Anexo I da Resolução CFMV nº 1.000/2012)

7. PRESENÇA DURANTE O PROCEDIMENTO
( ) Desejo permanecer presente durante todo o procedimento
( ) Desejo permanecer apenas durante a sedação
( ) Não desejo permanecer presente
Acompanhantes autorizados: ........................................
Estou ciente de que o número de acompanhantes pode ser limitado por razões
técnicas e de segurança.

8. DESTINAÇÃO DO CORPO
( ) Retirada pelo responsável (assinar Termo de Retirada de Corpo — B7)
( ) Cremação coletiva          ( ) Cremação individual com devolução de cinzas
( ) Encaminhamento a empresa especializada: .......................
( ) Doação para ensino e pesquisa (assinar termo específico — B8)
( ) Necropsia, previamente à destinação: ( ) Sim  ( ) Não
( ) Sepultamento em cemitério de animais licenciado: ..............
Estou ciente de que o descarte de corpo de animal é regido por legislação
sanitária e ambiental, sendo VEDADO o descarte em lixo comum, cursos d'água
ou logradouros públicos, e de que, optando pela retirada, assumo integral
responsabilidade pela destinação ambientalmente adequada.

9. DOCUMENTAÇÃO
Estou ciente de que será emitido Atestado de Óbito, com registro da realização
da eutanásia e do método empregado, e de que todo o procedimento será
registrado no prontuário do paciente.

10. CUSTOS
Valor do procedimento: R$ ............
Valor da destinação do corpo: R$ ............

11. DECLARAÇÃO FINAL E AUTORIZAÇÃO
Declaro que li integralmente este termo; que fui esclarecido(a) sobre o
diagnóstico, o prognóstico, as alternativas e a natureza irreversível do ato;
que tive todas as minhas dúvidas respondidas; que tomo esta decisão de forma
livre, consciente e sem qualquer coação; e que, por este instrumento,
AUTORIZO EXPRESSAMENTE a realização da eutanásia no animal acima identificado,
isentando o médico-veterinário e o estabelecimento de qualquer responsabilidade
decorrente da execução regular deste ato autorizado.

[BLOCO DE ASSINATURAS]

Médico-Veterinário executor: ................... CRMV nº ...........
Médico-Veterinário supervisor (se distinto): .... CRMV nº ...........

TESTEMUNHAS
1. Nome: ......................... CPF: .............. Ass.: ...........
2. Nome: ......................... CPF: .............. Ass.: ...........

── PARA PREENCHIMENTO PELO MÉDICO-VETERINÁRIO APÓS O ATO ──
Data: ....../....../......   Início: ......h......   Óbito: ......h......
Sedação/anestesia — fármaco, dose, via: ...........................
Agente eutanásico — fármaco, dose, via: ...........................
Confirmação de óbito por: ( ) ausência de pulso e batimentos por ≥ 5 min
( ) ausência de movimentos respiratórios ( ) ausência de reflexo corneal
( ) midríase não responsiva ( ) auscultação cardíaca ( ) ECG em assistolia
Intercorrências: ..................................................
Destinação do corpo executada: ....................................
Assinatura do executor: ...........................................$dq$,
  '["atend.diagnostico","atend.justificativa_eutanasia","atend.observacoes"]'::jsonb,
  '[]'::jsonb,
  true, true, 2, now()
from public.document_templates
where codigo = 'B6'
on conflict (template_id, versao) do nothing;

-- B7 — TCLE — Retirada de Corpo de Animal em Óbito
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('B7', $dq$TCLE — Retirada de Corpo de Animal em Óbito$dq$, 'consentimento', $dq$TERMOS DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)$dq$, $dq$art. 4º, IV, Res. CFMV nº 1.321/2020. A norma exige que, ao entregar o corpo, seja indicada a responsabilidade do responsável pelo descarte ambientalmente adequado.$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO E RESPONSABILIDADE
PARA RETIRADA DE CORPO DE ANIMAL EM ÓBITO

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

Data e hora do óbito: {{atend.data}} às {{atend.hora}}
Causa mortis provável: {{atend.causa_mortis}}
Data e hora da retirada: ....../....../...... às ......h......

1. DECLARAÇÃO DE RECEBIMENTO
Declaro haver recebido, nesta data, o corpo do animal acima identificado,
devidamente acondicionado em {{doc.acondicionamento}}.

2. RESPONSABILIDADE PELA DESTINAÇÃO
Assumo INTEGRAL E EXCLUSIVA RESPONSABILIDADE pela destinação final do corpo,
declarando estar ciente de que:
- o descarte deve observar a legislação sanitária e ambiental federal, estadual
  e municipal aplicável;
- é VEDADO o descarte em lixo domiciliar comum, terrenos baldios, logradouros
  públicos, cursos d'água ou qualquer local não licenciado;
- as formas ambientalmente adequadas incluem cremação em empresa licenciada e
  sepultamento em cemitério de animais devidamente licenciado;
- o sepultamento em propriedade particular está sujeito às normas municipais e
  pode ser proibido;
- o descumprimento pode configurar infração ambiental e sanitária, sujeitando-me
  às sanções da Lei nº 9.605/1998 e demais normas aplicáveis.
Destinação declarada: {{doc.destinacao}}

3. RISCO SANITÁRIO
( ) Não há suspeita de zoonose
( ) HÁ SUSPEITA/CONFIRMAÇÃO de doença transmissível: ..............
    Neste caso, fui expressamente orientado(a) sobre as precauções necessárias
    e sobre a obrigatoriedade de destinação por incineração/cremação, bem como
    sobre a notificação ao serviço de vigilância competente.

4. NECROPSIA
( ) Foi oferecida a realização de necropsia e OPTEI POR NÃO REALIZÁ-LA, estando
    ciente de que a causa mortis permanecerá presuntiva e de que, após a
    retirada do corpo, não será possível esclarecê-la
( ) Autorizei a necropsia previamente à retirada

5. DECLARAÇÃO FINAL
Declaro que li e compreendi este termo, e que a partir da retirada nesta data
cessa qualquer responsabilidade do estabelecimento e do médico-veterinário
quanto à guarda e destinação do corpo.

[BLOCO DE ASSINATURAS]

TESTEMUNHA (funcionário responsável pela entrega)
Nome: ......................... CPF: .............. Ass.: ...........$dq$,
  '["atend.causa_mortis","atend.data","atend.hora","doc.acondicionamento","doc.destinacao"]'::jsonb,
  '[]'::jsonb,
  true, true, 2, now()
from public.document_templates
where codigo = 'B7'
on conflict (template_id, versao) do nothing;

-- B8 — TCLE — Doação de Corpo para Ensino e Pesquisa
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('B8', $dq$TCLE — Doação de Corpo para Ensino e Pesquisa$dq$, 'consentimento', $dq$TERMOS DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)$dq$, $dq$art. 4º, IX, Res. CFMV nº 1.321/2020.$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO
PARA DOAÇÃO DE CORPO DE ANIMAL PARA ENSINO E PESQUISA

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

Data e hora do óbito: {{atend.data}} às {{atend.hora}}
Causa mortis provável: {{atend.causa_mortis}}

1. DECLARAÇÃO DE TITULARIDADE
Declaro ser o(a) legítimo(a) responsável pelo animal acima identificado e
possuir poderes para dispor sobre a destinação de seu corpo.

2. FINALIDADE DA DOAÇÃO
( ) Ensino de graduação/pós-graduação  ( ) Treinamento cirúrgico
( ) Pesquisa científica  ( ) Necropsia com finalidade didática
( ) Preparação de peças anatômicas  ( ) Outra: ....................

3. INSTITUIÇÃO DESTINATÁRIA
Nome: .............................................................
CNPJ: .............................................................
Endereço: .........................................................
Responsável pelo recebimento: .....................................
Protocolo CEUA (quando aplicável): ................................

4. ESCLARECIMENTOS
Estou ciente de que:
- a doação é GRATUITA, VOLUNTÁRIA e IRREVERSÍVEL;
- o corpo poderá ser dissecado, seccionado, fixado, conservado ou utilizado
  integral ou parcialmente conforme a finalidade acadêmica ou científica;
- NÃO haverá devolução do corpo, de partes dele ou de cinzas;
- não receberei qualquer contraprestação financeira;
- a identidade do animal e a minha serão mantidas em sigilo em eventuais
  publicações, salvo autorização expressa;
- posso revogar esta doação por escrito ATÉ o momento da efetiva entrega do
  corpo à instituição destinatária.

5. AUTORIZAÇÃO PARA REGISTRO
( ) Autorizo registro fotográfico e audiovisual para fins didáticos e científicos
( ) Não autorizo

6. DECLARAÇÃO
Declaro que li e compreendi este termo e que DOO livremente o corpo do animal
acima identificado para as finalidades descritas.

[BLOCO DE ASSINATURAS]

Recebimento pela instituição: Nome ..................... Data ......./....../......
Assinatura: .......................................................$dq$,
  '["atend.causa_mortis","atend.data","atend.hora"]'::jsonb,
  '[]'::jsonb,
  true, false, 2, now()
from public.document_templates
where codigo = 'B8'
on conflict (template_id, versao) do nothing;

-- B9 — Termo de Esclarecimento e Responsabilidade — Retirada Sem Alta Médica
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('B9', $dq$Termo de Esclarecimento e Responsabilidade — Retirada Sem Alta Médica$dq$, 'consentimento', $dq$TERMOS DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)$dq$, $dq$art. 11 da Res. CFMV nº 1.321/2020, com redação da Res. CFMV nº 1.653/2025. Mudança importante: agora é exigido em qualquer retirada sem alta, e não apenas em risco iminente de morte. Havendo recusa de assinatura, registrar em prontuário e colher duas testemunhas que presenciaram a recusa.$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$TERMO DE ESCLARECIMENTO E RESPONSABILIDADE
PARA RETIRADA DE ANIMAL DO SERVIÇO VETERINÁRIO SEM ALTA MÉDICA

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

Data e hora da retirada: ....../....../...... às ......h......

1. QUADRO CLÍNICO ATUAL DO PACIENTE
{{atend.quadro_atual}}
Estado geral: ( ) Estável ( ) Instável ( ) Crítico ( ) Risco iminente de morte
Parâmetros no momento da retirada: FC ...... FR ...... T ...... °C
PA ............ mmHg   TPC ...... s   Mucosas .......................

2. CONDUTA RECOMENDADA PELO MÉDICO-VETERINÁRIO
{{atend.conduta_recomendada}}
Tratamentos em curso que serão interrompidos: .....................
Exames pendentes: .................................................
Previsão de permanência ainda necessária: .........................

3. ESCLARECIMENTO SOBRE OS RISCOS
Fui informado(a), de forma clara e detalhada, de que a retirada do paciente
antes da alta médica pode acarretar:
- interrupção de tratamento essencial à recuperação;
- agravamento rápido e imprevisível do quadro clínico;
- descompensação hemodinâmica, respiratória, metabólica ou neurológica;
- sequelas permanentes;
- ÓBITO, inclusive durante o transporte.
Riscos específicos deste caso: {{atend.riscos_especificos}}

4. ORIENTAÇÕES FORNECIDAS
Medicações e cuidados domiciliares orientados: ....................
Sinais de alerta que exigem retorno imediato: .....................
Serviços de emergência 24h indicados: .............................
Relatório médico e cópia do prontuário entregues: ( ) Sim ( ) Não

5. DECLARAÇÃO DO RESPONSÁVEL
Declaro que:
a) fui informado(a) do estado de saúde atual do paciente e dos riscos envolvidos
   na retirada antes da recomendação profissional;
b) a decisão de retirar o animal é EXCLUSIVAMENTE MINHA, tomada de forma livre
   e consciente, CONTRA a orientação médico-veterinária;
c) o estabelecimento e a equipe se colocaram à disposição para dar continuidade
   ao tratamento;
d) ASSUMO INTEGRAL RESPONSABILIDADE por todas as consequências decorrentes
   desta decisão, isentando o médico-veterinário e o estabelecimento de qualquer
   responsabilidade civil, criminal e ético-profissional pelo desfecho;
e) fui orientado(a) sobre a possibilidade de retornar a qualquer momento.

Motivo declarado da retirada (opcional): ..........................

[BLOCO DE ASSINATURAS]

── EM CASO DE RECUSA DE ASSINATURA ──
O(A) responsável pelo animal RECUSOU-SE a assinar o presente termo, fato
registrado no prontuário e presenciado pelas testemunhas abaixo, nos termos do
art. 11, §1º, da Resolução CFMV nº 1.321/2020, com a redação dada pela
Resolução CFMV nº 1.653/2025.

TESTEMUNHAS PRESENCIAIS
1. Nome: .................. CPF: .......... Função: ......... Ass.: .........
2. Nome: .................. CPF: .......... Função: ......... Ass.: .........$dq$,
  '["atend.conduta_recomendada","atend.quadro_atual","atend.riscos_especificos"]'::jsonb,
  '[]'::jsonb,
  true, true, 2, now()
from public.document_templates
where codigo = 'B9'
on conflict (template_id, versao) do nothing;

-- B10 — Termo de Consentimento para Pesquisa Clínica
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('B10', $dq$Termo de Consentimento para Pesquisa Clínica$dq$, 'consentimento', $dq$TERMOS DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)$dq$, $dq$art. 4º, X, Res. CFMV nº 1.321/2020, c/c Resolução Normativa CONCEA nº 22/2015. Exige aprovação prévia por CEUA.$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO
PARA PARTICIPAÇÃO EM PESQUISA CLÍNICA VETERINÁRIA

Título do projeto: ................................................
Pesquisador responsável: ................ CRMV nº .................
Instituição executora: ............................................
Protocolo CEUA nº: ......... Data de aprovação: ....../....../......
Patrocinador/financiador: .........................................

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

1. OBJETIVO DA PESQUISA
...................................................................

2. PROCEDIMENTOS A QUE O ANIMAL SERÁ SUBMETIDO
...................................................................
Duração da participação: ..........................................
Número de retornos previstos: .....................................

3. RISCOS E DESCONFORTOS PREVISÍVEIS
...................................................................
Grau de invasividade (classificação CONCEA): ......................

4. BENEFÍCIOS ESPERADOS
Para o paciente: ..................................................
Para a coletividade/ciência: ......................................
Estou ciente de que pode não haver benefício direto ao meu animal.

5. ALTERNATIVAS AO ESTUDO
Tratamento convencional disponível: ...............................

6. CUSTOS E RESSARCIMENTO
Custos cobertos pelo estudo: ......................................
Custos a cargo do responsável: ....................................
Previsão de ressarcimento de despesas: ............................

7. LIBERDADE DE RETIRADA
Estou ciente de que posso retirar meu animal do estudo A QUALQUER MOMENTO,
sem necessidade de justificativa e SEM QUALQUER PREJUÍZO à continuidade do
atendimento veterinário convencional.

8. SIGILO E DADOS
Os dados serão tratados de forma anonimizada, conforme a Lei nº 13.709/2018
(LGPD). Autorizo a publicação dos resultados em meio científico, preservada
a identificação individual.
( ) Autorizo uso de imagens do paciente  ( ) Não autorizo

9. CONTATOS
Pesquisador: ............... Tel.: ............ E-mail: ...........
CEUA: ...................... Tel.: ............ E-mail: ...........

10. DECLARAÇÃO
Declaro que recebi cópia deste termo, que compreendi todas as informações e
que CONSINTO livremente na participação do animal sob minha responsabilidade.

[BLOCO DE ASSINATURAS]$dq$,
  '[]'::jsonb,
  '[]'::jsonb,
  true, false, 2, now()
from public.document_templates
where codigo = 'B10'
on conflict (template_id, versao) do nothing;

-- C1 — Termo de Não Aceite / Recusa de Tratamento
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('C1', $dq$Termo de Não Aceite / Recusa de Tratamento$dq$, 'recusa', $dq$TERMOS DE RECUSA / NÃO ACEITE$dq$, null, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$TERMO DE CIÊNCIA E RECUSA DE TRATAMENTO

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

Data e hora: {{atend.data}} às {{atend.hora}}

1. DIAGNÓSTICO / HIPÓTESE DIAGNÓSTICA
{{atend.diagnostico}}

2. TRATAMENTO INDICADO E RECUSADO
Foi-me indicado, com fundamento técnico, o seguinte tratamento:
{{atend.tratamento_indicado}}

Recuso especificamente:
( ) Tratamento clínico medicamentoso: .............................
( ) Tratamento cirúrgico: .........................................
( ) Internação: ...................................................
( ) Fluidoterapia / suporte intensivo: ............................
( ) Antibioticoterapia: ...........................................
( ) Analgesia / controle de dor: ..................................
( ) Quimioterapia / terapia oncológica: ...........................
( ) Transfusão de sangue ou hemocomponentes: ......................
( ) Encaminhamento a especialista: ................................
( ) Eutanásia indicada tecnicamente: ..............................
( ) Todo e qualquer tratamento
( ) Outro: ........................................................

3. ESCLARECIMENTOS RECEBIDOS
Fui informado(a), em linguagem clara e acessível, sobre:
- o diagnóstico ou hipótese diagnóstica e a gravidade do quadro;
- a finalidade e os benefícios esperados do tratamento indicado;
- as alternativas terapêuticas existentes;
- as consequências previsíveis da NÃO realização do tratamento;
- a possibilidade de reavaliar minha decisão a qualquer momento.

4. CONSEQUÊNCIAS PREVISÍVEIS DA RECUSA
Fui expressamente advertido(a) de que a recusa pode acarretar:
{{atend.consequencias_recusa}}
Incluindo, conforme o caso: manutenção ou agravamento da dor e do sofrimento;
progressão da doença; perda de função ou de órgão; sequelas irreversíveis;
redução da expectativa e da qualidade de vida; e ÓBITO.

5. ADVERTÊNCIA SOBRE BEM-ESTAR ANIMAL
Fui orientado(a) de que a manutenção de animal em estado de dor ou sofrimento
evitável, sem a adoção das medidas terapêuticas ou paliativas cabíveis, pode
caracterizar maus-tratos, nos termos da Resolução CFMV nº 1.236/2018 e do
art. 32 da Lei nº 9.605/1998, com as alterações da Lei nº 14.064/2020, e que
o médico-veterinário possui o dever ético de comunicar às autoridades
competentes as situações que assim caracterizar.

6. MEDIDAS MÍNIMAS ACEITAS
Ainda que recusando o tratamento acima, ACEITO:
( ) Analgesia e cuidados paliativos: ..............................
( ) Orientações de manejo domiciliar
( ) Retorno para reavaliação em ....../....../......
( ) Nenhuma medida

7. DECLARAÇÃO
Declaro que a recusa é decisão exclusivamente minha, tomada de forma livre,
consciente e esclarecida, CONTRÁRIA à orientação médico-veterinária; que
assumo integral responsabilidade por suas consequências; e que isento o
médico-veterinário e o estabelecimento de qualquer responsabilidade decorrente
da não realização do tratamento indicado.

Motivo declarado (opcional): ( ) Financeiro ( ) Pessoal ( ) Religioso
( ) Busca de segunda opinião ( ) Outro: ..........................

[BLOCO DE ASSINATURAS]

── EM CASO DE RECUSA DE ASSINATURA ──
Registro que o(a) responsável recusou-se a assinar este termo, tendo o fato
sido anotado em prontuário e presenciado pelas testemunhas abaixo (art. 10, II,
Res. CFMV nº 1.321/2020).
1. Nome: .................. CPF: .......... Função: ......... Ass.: .........
2. Nome: .................. CPF: .......... Função: ......... Ass.: .........$dq$,
  '["atend.consequencias_recusa","atend.data","atend.diagnostico","atend.hora","atend.tratamento_indicado"]'::jsonb,
  '[]'::jsonb,
  true, true, 2, now()
from public.document_templates
where codigo = 'C1'
on conflict (template_id, versao) do nothing;

-- C2 — Termo de Não Aceite / Recusa de Exames Complementares
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('C2', $dq$Termo de Não Aceite / Recusa de Exames Complementares$dq$, 'recusa', $dq$TERMOS DE RECUSA / NÃO ACEITE$dq$, null, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$TERMO DE CIÊNCIA E RECUSA DE EXAMES COMPLEMENTARES

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

-- C3 — Termo de Recusa de Internação
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('C3', $dq$Termo de Recusa de Internação$dq$, 'recusa', $dq$TERMOS DE RECUSA / NÃO ACEITE$dq$, null, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$TERMO DE CIÊNCIA E RECUSA DE INTERNAÇÃO

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

1. QUADRO CLÍNICO E INDICAÇÃO
{{atend.diagnostico}}
Foi indicada internação em regime ( ) semi-intensivo ( ) intensivo (UTI)
( ) isolamento, pelo prazo estimado de ______ dia(s), pelos seguintes motivos:
{{atend.justificativa}}

2. TERAPIAS QUE NÃO PODERÃO SER REALIZADAS EM DOMICÍLIO
( ) Fluidoterapia contínua e correção de distúrbios eletrolíticos
( ) Medicação intravenosa em intervalos curtos
( ) Oxigenoterapia
( ) Monitoração contínua de parâmetros vitais
( ) Analgesia em infusão contínua
( ) Suporte nutricional assistido
( ) Intervenção imediata em caso de descompensação
( ) Outras: .......................................................

3. RISCOS DA RECUSA
Fui informado(a) de que a não internação pode acarretar: descompensação sem
assistência imediata, desidratação, agravamento do quadro, sofrimento evitável,
necessidade de atendimento de emergência em condições menos favoráveis,
sequelas e ÓBITO.
Riscos específicos: {{atend.riscos_especificos}}

4. PLANO DOMICILIAR ALTERNATIVO ORIENTADO
Medicações: .......................................................
Cuidados: .........................................................
Sinais de alerta para retorno imediato: ...........................
Retorno agendado para: ....../....../...... às ......h
Serviços de emergência 24h indicados: .............................

5. DECLARAÇÃO
Declaro que recuso a internação de forma livre e consciente, contra orientação
médico-veterinária, assumindo integral responsabilidade pelas consequências e
comprometendo-me a seguir rigorosamente o plano domiciliar orientado.

[BLOCO DE ASSINATURAS]$dq$,
  '["atend.diagnostico","atend.justificativa","atend.riscos_especificos"]'::jsonb,
  '[]'::jsonb,
  true, false, 2, now()
from public.document_templates
where codigo = 'C3'
on conflict (template_id, versao) do nothing;

-- C4 — Termo de Recusa de Eutanásia Indicada
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('C4', $dq$Termo de Recusa de Eutanásia Indicada$dq$, 'recusa', $dq$TERMOS DE RECUSA / NÃO ACEITE$dq$, $dq$Use quando a eutanásia é tecnicamente indicada (art. 3º, I, Res. 1.000/2012) e o responsável recusa. Documento essencial: protege o profissional e cumpre o dever ético de advertir sobre maus-tratos por omissão.$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$TERMO DE CIÊNCIA E RECUSA DE EUTANÁSIA INDICADA

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

1. QUADRO CLÍNICO
{{atend.diagnostico}}
Descrição do sofrimento observado: ................................
Escala de dor aplicada: ................. Escore: ............
Prognóstico: ( ) Reservado  ( ) Desfavorável  ( ) Sem possibilidade
terapêutica

2. INDICAÇÃO TÉCNICA
Nesta data, indiquei a eutanásia com fundamento no art. 3º da Resolução CFMV
nº 1.000/2012, por entender que o bem-estar do paciente está comprometido de
forma irreversível, com dor e/ou sofrimento que não podem ser adequadamente
controlados pelos recursos terapêuticos disponíveis.
Justificativa: {{atend.justificativa_eutanasia}}

3. RECUSA DO RESPONSÁVEL
O(A) responsável pelo animal, devidamente esclarecido(a), RECUSA a realização
da eutanásia indicada.
Motivo declarado: .................................................

4. ADVERTÊNCIA FORMAL
Fui expressamente advertido(a) de que:
- a manutenção deliberada de animal em estado de dor ou sofrimento irreversível
  e não controlável, quando existente indicação técnica de eutanásia, pode
  caracterizar maus-tratos por omissão, nos termos da Resolução CFMV
  nº 1.236/2018 e do art. 32 da Lei nº 9.605/1998, com as alterações da Lei
  nº 14.064/2020;
- o médico-veterinário tem o dever ético e legal de comunicar às autoridades
  competentes as situações que caracterizem maus-tratos;
- é indispensável a instituição imediata de protocolo de cuidados paliativos e
  analgesia, com reavaliações periódicas.

5. PLANO DE CUIDADOS PALIATIVOS INSTITUÍDO
Analgesia: ........................................................
Suporte nutricional e hídrico: ....................................
Higiene e prevenção de úlceras de decúbito: .......................
Manejo ambiental: .................................................
Reavaliação obrigatória em: ....../....../......
( ) Responsável ACEITA integralmente o plano paliativo
( ) Responsável recusa também os cuidados paliativos — neste caso, será
    formalizada comunicação ao órgão competente

6. DECLARAÇÃO
Declaro que compreendi integralmente as informações acima; que a decisão é
minha, livre e consciente, contrária à indicação técnica; que assumo integral
responsabilidade civil e criminal por suas consequências; e que me comprometo
a cumprir o plano de cuidados paliativos instituído.

[BLOCO DE ASSINATURAS]

TESTEMUNHAS
1. Nome: .................. CPF: .......... Ass.: .........
2. Nome: .................. CPF: .......... Ass.: .........$dq$,
  '["atend.diagnostico","atend.justificativa_eutanasia"]'::jsonb,
  '[]'::jsonb,
  true, true, 2, now()
from public.document_templates
where codigo = 'C4'
on conflict (template_id, versao) do nothing;

-- C5 — Termo de Recusa de Assinatura (Registro com Testemunhas)
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('C5', $dq$Termo de Recusa de Assinatura (Registro com Testemunhas)$dq$, 'recusa', $dq$TERMOS DE RECUSA / NÃO ACEITE$dq$, $dq$Modelo autônomo para quando o responsável se recusa a assinar qualquer termo. Vincular ao prontuário.$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$REGISTRO DE RECUSA DE ASSINATURA DE DOCUMENTO

Nos termos do art. 10, II, e do art. 11, §1º, da Resolução CFMV nº 1.321/2020,
com a redação dada pela Resolução CFMV nº 1.653/2025, REGISTRO que:

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]

O(A) Sr.(a) {{resp.nome}}, CPF {{resp.cpf}}, na qualidade de responsável pelo
animal acima identificado, em {{atend.data}} às {{atend.hora}}, no
estabelecimento {{estab.razao_social}}:

( ) RECUSOU-SE a assinar o documento: .............................
( ) RECUSOU-SE a receber as orientações prestadas
( ) Manifestou-se de forma que impossibilitou a obtenção do consentimento
( ) Estava impossibilitado(a) de assinar por: .....................

Conteúdo integral das informações prestadas ao responsável antes da recusa:
...................................................................
...................................................................

Conduta adotada pelo médico-veterinário diante da recusa:
...................................................................

Este registro foi lavrado na presença das testemunhas abaixo, que presenciaram
os fatos narrados e atestam sua veracidade.

{{doc.local}}, {{doc.data_extenso}}.

______________________________________
{{vet.nome}} — CRMV-{{vet.crmv_uf}} nº {{vet.crmv}}

TESTEMUNHAS PRESENCIAIS
1. Nome: ............. CPF: ......... Função: ......... Ass.: .........
2. Nome: ............. CPF: ......... Função: ......... Ass.: .........$dq$,
  '["atend.data","atend.hora","doc.data_extenso","doc.local","estab.razao_social","resp.cpf","resp.nome","vet.crmv","vet.crmv_uf","vet.nome"]'::jsonb,
  '[]'::jsonb,
  false, true, 2, now()
from public.document_templates
where codigo = 'C5'
on conflict (template_id, versao) do nothing;

-- D1 — Termo de Ciência de Prognóstico Reservado e Cuidados Paliativos
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('D1', $dq$Termo de Ciência de Prognóstico Reservado e Cuidados Paliativos$dq$, 'administrativo', $dq$TERMOS COMPLEMENTARES E ADMINISTRATIVOS$dq$, null, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$TERMO DE CIÊNCIA DE PROGNÓSTICO E PLANO DE CUIDADOS PALIATIVOS

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

1. DIAGNÓSTICO E ESTADIAMENTO
{{atend.diagnostico}}

2. PROGNÓSTICO
( ) Reservado  ( ) Desfavorável  ( ) Terminal
Expectativa de sobrevida estimada: ................................
Estou ciente de que estimativas de sobrevida são probabilísticas e podem não
se confirmar, para mais ou para menos.

3. OBJETIVO DO CUIDADO
( ) Curativo  ( ) Controle de doença  ( ) Exclusivamente paliativo
Definição de qualidade de vida aceitável, acordada com o responsável:
...................................................................

4. PLANO DE CUIDADOS PALIATIVOS
Analgesia multimodal: .............................................
Controle de náusea/vômito: ........................................
Suporte nutricional: ..............................................
Hidratação: .......................................................
Higiene e prevenção de escaras: ...................................
Manejo respiratório: ..............................................
Adequações ambientais: ............................................

5. MONITORAMENTO DE QUALIDADE DE VIDA
Escala aplicada: ..................................................
Reavaliações em: ....../....../......  ....../....../......
Sinais que indicarão necessidade de reavaliar a indicação de eutanásia:
...................................................................

6. DIRETIVAS ANTECIPADAS
Em caso de agravamento agudo:
( ) Suporte intensivo pleno
( ) Suporte limitado a: ...........................................
( ) Apenas medidas de conforto
( ) Eutanásia, se preenchidos os critérios do art. 3º da Res. CFMV nº 1.000/2012
Em caso de parada cardiorrespiratória:
( ) Reanimar  ( ) Não reanimar

7. DECLARAÇÃO
Declaro que fui esclarecido(a) sobre o prognóstico, sobre a finalidade dos
cuidados paliativos e sobre a possibilidade de indicação futura de eutanásia,
e que as diretivas acima refletem minha vontade, revogável a qualquer tempo.

[BLOCO DE ASSINATURAS]$dq$,
  '["atend.diagnostico"]'::jsonb,
  '[]'::jsonb,
  true, false, 2, now()
from public.document_templates
where codigo = 'D1'
on conflict (template_id, versao) do nothing;

-- D2 — Termo de Orçamento e Ciência de Custos
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('D2', $dq$Termo de Orçamento e Ciência de Custos$dq$, 'administrativo', $dq$TERMOS COMPLEMENTARES E ADMINISTRATIVOS$dq$, $dq$CDC arts. 6º, III e 40 (orçamento prévio). Validade padrão de 10 dias, salvo estipulação diversa.$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$ORÇAMENTO DE SERVIÇOS MÉDICO-VETERINÁRIOS

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

-- D3 — Termo de Autorização de Uso de Imagem
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('D3', $dq$Termo de Autorização de Uso de Imagem$dq$, 'administrativo', $dq$TERMOS COMPLEMENTARES E ADMINISTRATIVOS$dq$, $dq$Código Civil art. 20; LGPD (Lei nº 13.709/2018), arts. 7º, I e 8º. Atenção: é vedada propaganda nos documentos clínicos — este termo é autônomo. Observar também as restrições publicitárias do Código de Ética (Res. CFMV nº 1.138/2016), especialmente quanto à divulgação sensacionalista de casos.$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM E CONTEÚDO

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

Na qualidade de responsável pelo animal acima identificado, AUTORIZO,
a título gratuito e sem qualquer ônus, o uso das imagens, vídeos e áudios
captados durante o atendimento veterinário, para as seguintes finalidades:

( ) Registro em prontuário e acompanhamento clínico (uso interno)
( ) Divulgação em redes sociais e site do estabelecimento
( ) Material didático e educativo dirigido a tutores
( ) Apresentação em eventos e congressos científicos
( ) Publicação em periódicos científicos e relatos de caso
( ) Material institucional impresso

ABRANGÊNCIA
( ) Imagens do animal apenas
( ) Imagens do animal e do responsável
( ) Imagens de lesões, procedimentos cirúrgicos e peças anatômicas
( ) Menção ao nome do animal
( ) Menção ao meu nome
( ) Uso exclusivamente anonimizado

Prazo: ( ) Indeterminado  ( ) Até ....../....../......
Território: mundial, em qualquer meio ou suporte.

REVOGAÇÃO
Estou ciente de que posso revogar esta autorização a qualquer momento, por
comunicação escrita, com efeitos a partir do recebimento, ressalvados os
materiais já publicados em meio impresso ou já distribuídos, cuja retirada
pode ser materialmente impossível.

LGPD
Fui informado(a) de que os dados pessoais coletados serão tratados conforme a
Lei nº 13.709/2018, para as finalidades acima e para o cumprimento das
obrigações legais e regulatórias do estabelecimento, e de que posso exercer
os direitos previstos no art. 18 da referida lei pelo e-mail {{estab.email}}.

[BLOCO DE ASSINATURAS]$dq$,
  '["estab.email"]'::jsonb,
  '[]'::jsonb,
  true, false, 2, now()
from public.document_templates
where codigo = 'D3'
on conflict (template_id, versao) do nothing;

-- D4 — Termo de Consentimento LGPD — Tratamento de Dados
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('D4', $dq$Termo de Consentimento LGPD — Tratamento de Dados$dq$, 'administrativo', $dq$TERMOS COMPLEMENTARES E ADMINISTRATIVOS$dq$, null, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$TERMO DE CIÊNCIA E CONSENTIMENTO PARA TRATAMENTO DE DADOS PESSOAIS

Controlador: {{estab.razao_social}} — CNPJ {{estab.cnpj}}
Contato do encarregado: {{estab.email}}

[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

1. DADOS COLETADOS
Nome, CPF, RG, endereço, telefone, e-mail, dados do animal, histórico clínico,
imagens, dados de pagamento.

2. FINALIDADES
( ) Prestação do serviço médico-veterinário e manutenção de prontuário
    (base legal: execução de contrato — art. 7º, V, LGPD)
( ) Cumprimento de obrigações legais e regulatórias, incluindo a manutenção
    de documentos exigidos pela Resolução CFMV nº 1.321/2020
    (base legal: art. 7º, II, LGPD)
( ) Comunicações sobre retornos, vacinas e exames — CONSENTIMENTO
( ) Envio de conteúdo informativo e promocional — CONSENTIMENTO
( ) Pesquisa de satisfação — CONSENTIMENTO

3. COMPARTILHAMENTO
Os dados poderão ser compartilhados com laboratórios de apoio, especialistas
para os quais o paciente seja encaminhado, operadoras de planos de saúde
animal contratadas pelo responsável, e autoridades públicas quando exigido
por lei.

4. PRAZO DE RETENÇÃO
Os prontuários e documentos clínicos serão mantidos pelo prazo mínimo de
5 (cinco) anos após o último atendimento, para atendimento a exigências
legais e regulatórias e para exercício regular de direitos.

5. DIREITOS DO TITULAR
Confirmação de tratamento, acesso, correção, anonimização, portabilidade,
eliminação dos dados tratados com base em consentimento, informação sobre
compartilhamento e revogação do consentimento, nos termos do art. 18 da LGPD.

6. CANAIS DE COMUNICAÇÃO AUTORIZADOS
( ) WhatsApp  ( ) SMS  ( ) E-mail  ( ) Ligação telefônica

[BLOCO DE ASSINATURAS]$dq$,
  '["estab.cnpj","estab.email","estab.razao_social"]'::jsonb,
  '[]'::jsonb,
  true, false, 2, now()
from public.document_templates
where codigo = 'D4'
on conflict (template_id, versao) do nothing;

-- D5 — Termo de Guarda / Hospedagem de Animal
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('D5', $dq$Termo de Guarda / Hospedagem de Animal$dq$, 'administrativo', $dq$TERMOS COMPLEMENTARES E ADMINISTRATIVOS$dq$, null, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$TERMO DE GUARDA TEMPORÁRIA DE ANIMAL (DEPÓSITO)

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

Período: de ....../....../...... a ....../....../......
Valor da diária: R$ ............

1. CONDIÇÕES DE ADMISSÃO
Vacinação em dia: ( ) Sim ( ) Não — antirrábica ....../....../......
Vermifugação: ....../....../......  Controle de ectoparasitas: ......
Exame clínico de admissão realizado: ( ) Sim ( ) Não
Alterações constatadas na admissão: ...............................
Peso na admissão: ......... kg

2. INFORMAÇÕES FORNECIDAS PELO RESPONSÁVEL
Alimentação (marca, quantidade, frequência): ......................
Medicações em uso: ................................................
Alergias: .........................................................
Comorbidades: .....................................................
Temperamento / histórico de agressividade: ........................
Itens entregues junto com o animal: ...............................

3. RESPONSABILIDADES DO ESTABELECIMENTO
Alojamento adequado, alimentação conforme orientado, higiene, observação
diária e comunicação imediata de qualquer intercorrência.

4. AUTORIZAÇÃO PARA ATENDIMENTO DE URGÊNCIA
Em caso de intercorrência clínica durante a hospedagem, AUTORIZO o atendimento
médico-veterinário de urgência, com custos a meu cargo, até o limite de
R$ ............ sem consulta prévia, e comprometo-me a manter contato disponível.

5. RISCOS ASSUMIDOS PELO RESPONSÁVEL
Estou ciente de que o ambiente coletivo envolve riscos de estresse, anorexia,
alterações comportamentais e exposição a agentes infecciosos, ainda que
observados os protocolos sanitários, e de que animais com histórico de fuga ou
agressividade exigem informação prévia, sob pena de responsabilidade exclusiva
do responsável pelos danos daí decorrentes.

6. RETIRADA E ABANDONO
Comprometo-me a retirar o animal na data acordada. O atraso implica cobrança
das diárias adicionais. O não comparecimento por mais de 15 (quinze) dias
corridos após notificação escrita poderá caracterizar abandono, com as
consequências do art. 32 da Lei nº 9.605/1998, alterado pela Lei nº 14.064/2020.

[BLOCO DE ASSINATURAS]$dq$,
  '[]'::jsonb,
  '[]'::jsonb,
  true, false, 2, now()
from public.document_templates
where codigo = 'D5'
on conflict (template_id, versao) do nothing;

-- D6 — Notificação de Suspeita de Maus-Tratos
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('D6', $dq$Notificação de Suspeita de Maus-Tratos$dq$, 'administrativo', $dq$TERMOS COMPLEMENTARES E ADMINISTRATIVOS$dq$, $dq$Res. CFMV nº 1.236/2018 (define e caracteriza crueldade, abuso e maus-tratos); Res. CFMV nº 1.138/2016 (Código de Ética — dever de comunicar); art. 32 da Lei nº 9.605/1998, alterado pela Lei nº 14.064/2020. Este documento não vai para o tutor — destina-se à autoridade policial, Ministério Público ou órgão de fiscalização.$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$COMUNICAÇÃO DE SUSPEITA DE MAUS-TRATOS A ANIMAL

Ao(À) ( ) Delegacia de Polícia  ( ) Ministério Público  ( ) Órgão municipal
de proteção animal  ( ) CRMV-{{vet.crmv_uf}}  ( ) Outro: ..............

O médico-veterinário abaixo assinado, no exercício regular de seu dever ético
e legal, COMUNICA a ocorrência de situação com indícios de maus-tratos,
crueldade ou abuso contra animal, nos termos da Resolução CFMV nº 1.236/2018 e
do art. 32 da Lei nº 9.605/1998, com a redação dada pela Lei nº 14.064/2020.

1. IDENTIFICAÇÃO DO ANIMAL
Espécie: ......... Raça: ......... Sexo: ......... Idade: .........
Pelagem: ......... Microchip: ......... Peso: ......... kg
ECC: ....../9   Sinais particulares: ..............................

2. IDENTIFICAÇÃO DE QUEM APRESENTOU O ANIMAL
Nome: ............................ CPF: ...........................
Endereço: .........................................................
Telefone: .........................................................
Relação declarada com o animal: ...................................

3. LOCAL DA OCORRÊNCIA (se conhecido)
...................................................................

4. DATA E HORA DO ATENDIMENTO
{{atend.data}} às {{atend.hora}}

5. HISTÓRICO RELATADO
...................................................................
Incompatibilidade entre o relato e os achados clínicos: ( ) Sim ( ) Não
Justificativa: ....................................................

6. ACHADOS CLÍNICOS OBJETIVOS
Estado nutricional: ...............................................
Lesões — natureza, localização, extensão, estágio de evolução:
...................................................................
Sinais de trauma: .................................................
Sinais de negligência (higiene, parasitismo, feridas crônicas):
...................................................................
Sinais de privação de água, alimento ou abrigo: ...................
Sinais de contenção inadequada: ...................................
Dor e sofrimento evidenciados: ....................................

7. EXAMES COMPLEMENTARES REALIZADOS
...................................................................

8. DOCUMENTAÇÃO ANEXA
( ) Registro fotográfico datado  ( ) Laudos de exames
( ) Radiografias  ( ) Prontuário  ( ) Laudo de necropsia

9. CONCLUSÃO TÉCNICA
Os achados descritos são compatíveis com:
( ) Maus-tratos  ( ) Crueldade  ( ) Abuso  ( ) Negligência
( ) Abandono  ( ) Não é possível concluir
Fundamentação: ....................................................

10. CONDUTA ADOTADA
...................................................................

{{doc.local}}, {{doc.data_extenso}}.

______________________________________
{{vet.nome}} — CRMV-{{vet.crmv_uf}} nº {{vet.crmv}}$dq$,
  '["atend.data","atend.hora","doc.data_extenso","doc.local","vet.crmv","vet.crmv_uf","vet.nome"]'::jsonb,
  '[]'::jsonb,
  false, false, 2, now()
from public.document_templates
where codigo = 'D6'
on conflict (template_id, versao) do nothing;

-- D7 — Termo de Ciência — Atendimento Domiciliar / Cirurgia em Ambiente Externo
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('D7', $dq$Termo de Ciência — Atendimento Domiciliar / Cirurgia em Ambiente Externo$dq$, 'administrativo', $dq$TERMOS COMPLEMENTARES E ADMINISTRATIVOS$dq$, $dq$Documento específico para o cirurgião itinerante. Delimita a responsabilidade quanto à estrutura do local, que não está sob controle do cirurgião.$dq$, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$TERMO DE CIÊNCIA E RESPONSABILIDADE
PARA ATENDIMENTO E PROCEDIMENTO EM AMBIENTE EXTERNO

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]
[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]

Local de realização: ..............................................
Estabelecimento contratante (se houver): ..........................
CNPJ: ................ CRMV-PJ nº: ................
Responsável Técnico do local: ............ CRMV nº: ...............

1. PROCEDIMENTO A SER REALIZADO
{{atend.procedimento}}

2. DELIMITAÇÃO DE RESPONSABILIDADES
Estou ciente de que o(a) médico(a)-veterinário(a) {{vet.nome}} atua neste
procedimento na condição de profissional autônomo(a) convidado(a), sendo
responsável pela execução da técnica cirúrgica e pelas decisões clínicas de
sua alçada, e de que são de responsabilidade do estabelecimento onde o
procedimento se realiza:
- a estrutura física, instrumentais, equipamentos e sua manutenção;
- a esterilização de materiais e o controle de infecção;
- os insumos, medicamentos e gases medicinais empregados;
- a equipe de apoio, anestesia e enfermagem, salvo se contratada diretamente
  pelo cirurgião;
- a internação, os cuidados pós-operatórios e a assistência 24 horas;
- o descarte de resíduos de serviços de saúde.

3. LIMITAÇÕES DO AMBIENTE
Recursos disponíveis no local: ....................................
Recursos NÃO disponíveis: .........................................
Estou ciente de que a ausência dos recursos acima pode limitar a resposta a
intercorrências e de que, se necessário, o paciente deverá ser encaminhado a
serviço com maior complexidade, às minhas expensas.

4. CONTINUIDADE DO CUIDADO
Profissional responsável pelo acompanhamento pós-operatório: .......
Local do pós-operatório: ..........................................
Serviço de emergência 24h de referência: ..........................
Estou ciente de que o cirurgião itinerante não permanece no local após o
procedimento e de que o acompanhamento é feito pela equipe local, com a qual
o cirurgião se mantém em contato para orientações.

5. DECLARAÇÃO
Declaro que compreendi integralmente a delimitação de responsabilidades acima
e que autorizo a realização do procedimento nas condições descritas.

[BLOCO DE ASSINATURAS]

Ciente — Responsável Técnico do estabelecimento:
______________________________________ CRMV nº ....................$dq$,
  '["atend.procedimento","vet.nome"]'::jsonb,
  '[]'::jsonb,
  true, false, 2, now()
from public.document_templates
where codigo = 'D7'
on conflict (template_id, versao) do nothing;

-- D8 — Termo de Ciência — Notificação de Abandono
insert into public.document_templates
  (codigo, titulo, grupo, categoria, base_legal, ativo)
values
  ('D8', $dq$Termo de Ciência — Notificação de Abandono$dq$, 'administrativo', $dq$TERMOS COMPLEMENTARES E ADMINISTRATIVOS$dq$, null, true)
on conflict (codigo) do nothing;

insert into public.document_template_versions
  (template_id, versao, corpo, variaveis_requeridas, campos_formulario, exige_assinatura_responsavel, exige_testemunhas, numero_vias, publicado_em)
select
  id, 1, $dq$NOTIFICAÇÃO EXTRAJUDICIAL — RETIRADA DE ANIMAL

Ao(À) Sr.(a) {{resp.nome}}, CPF {{resp.cpf}}
Endereço: {{resp.endereco}}

NOTIFICAMOS que o animal abaixo identificado permanece sob nossos cuidados
desde ....../....../......, tendo recebido alta médica em ....../....../......,
sem que tenha sido retirado por V.Sa., apesar das tentativas de contato
realizadas em: ....../......, ....../......, ....../...... pelos telefones e
e-mail cadastrados.

[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]

Fica V.Sa. NOTIFICADO(A) a comparecer para retirada do animal no prazo de
15 (quinze) dias corridos a contar do recebimento desta, sob pena de:

a) caracterização de ABANDONO, conduta tipificada no art. 32 da Lei nº 9.605/1998,
   com as alterações da Lei nº 14.064/2020, com comunicação à autoridade policial
   e ao Ministério Público;
b) cobrança judicial das despesas de guarda, alimentação e tratamento, no valor
   já acumulado de R$ ............, acrescido das diárias vincendas;
c) adoção das medidas cabíveis para destinação responsável do animal.

O animal encontra-se em bom estado geral e recebe os cuidados necessários.

{{doc.local}}, {{doc.data_extenso}}.

______________________________________
{{vet.nome}} — CRMV-{{vet.crmv_uf}} nº {{vet.crmv}}
{{estab.razao_social}} — CNPJ {{estab.cnpj}}

Recebido em ....../....../...... por: ..............................$dq$,
  '["doc.data_extenso","doc.local","estab.cnpj","estab.razao_social","resp.cpf","resp.endereco","resp.nome","vet.crmv","vet.crmv_uf","vet.nome"]'::jsonb,
  '[]'::jsonb,
  false, false, 2, now()
from public.document_templates
where codigo = 'D8'
on conflict (template_id, versao) do nothing;
