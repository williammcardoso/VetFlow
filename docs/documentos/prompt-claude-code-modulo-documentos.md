# Prompt para o Claude Code — Módulo de Documentos do VetFlow

> **ANTES DE COLAR ESTE PROMPT:**
> 1. Baixe `vetflow-modelos-documentos.md`
> 2. Salve em `docs/documentos/biblioteca-documentos-vet.md` dentro do repositório
> 3. Abra o Claude Code na raiz do projeto
> 4. Cole o texto abaixo (da linha `---` em diante)

---

Você vai implementar o **módulo de Documentos** do VetFlow.

## Fonte de verdade

Leia primeiro, por completo, o arquivo `docs/documentos/biblioteca-documentos-vet.md`. Ele contém 30 modelos de documentos médico-veterinários com variáveis de mesclagem `{{ }}`, a fundamentação normativa de cada um (Resolução CFMV nº 1.321/2020, alterada pela nº 1.653/2025), a matriz de emissão e o schema de variáveis já sugerido.

**Não invente modelos nem reescreva o texto jurídico dos termos.** O conteúdo dos documentos é normativo — transcreva fielmente. Se algo no arquivo estiver ambíguo, pergunte antes de decidir.

## Etapa 0 — Reconhecimento (faça antes de escrever código)

Antes de qualquer implementação, inspecione o projeto e me apresente um plano:

1. Estrutura atual de pastas, convenções de nomenclatura e padrões de componentes.
2. Como as migrations do Supabase são versionadas hoje.
3. Tabelas existentes que o módulo vai referenciar: pacientes, tutores/responsáveis, atendimentos/consultas, veterinários, estabelecimento/clínica. Liste os nomes reais das colunas — preciso saber se o schema atual comporta todos os campos que os documentos exigem.
4. Se já existe geração de PDF no projeto (havia PDF de comprovante no PDV) — reaproveite a mesma stack, não introduza biblioteca nova.
5. Como a paleta teal / azul-petróleo está definida nos tokens.

**Pare aqui e me mostre o plano. Só siga adiante depois do meu OK.**

## Etapa 1 — Schema

Crie as migrations. Requisitos não negociáveis:

**`document_templates`** — o modelo em si (identidade estável)
- `id` uuid pk, `codigo` text unique (A1, B2, B2-C, C1…), `titulo`, `grupo` (atestados | consentimento | recusa | administrativo), `categoria`, `base_legal` text, `ativo` bool, `clinica_id` (nullable — null = template global do sistema), timestamps

**`document_template_versions`** — versionamento imutável
- `id`, `template_id` fk, `versao` int, `corpo` text (markdown com `{{ }}`), `variaveis_requeridas` jsonb, `campos_formulario` jsonb (definição dos checkboxes e campos preenchíveis), `exige_assinatura_responsavel` bool, `exige_testemunhas` bool, `numero_vias` int, `publicado_em`, `publicado_por`
- Unique em `(template_id, versao)`
- **Regra crítica:** versão publicada é imutável. Editar o texto cria uma nova versão, nunca sobrescreve.

**`documents`** — documento emitido
- `id`, `template_version_id` fk (aponta para a VERSÃO, não para o template), `numero` (sequencial por clínica), `atendimento_id`, `paciente_id`, `responsavel_id`, `vet_id`, `clinica_id`, `payload` jsonb (snapshot de TODOS os dados resolvidos no momento da emissão), `corpo_renderizado` text, `pdf_path`, `hash_sha256`, `status` enum (rascunho | emitido | assinado | cancelado), `emitido_em`, `cancelado_em`, `motivo_cancelamento`, `documento_substituto_id`

**`document_signatures`**
- `id`, `document_id` fk, `tipo` enum (responsavel | veterinario | testemunha), `nome`, `cpf`, `funcao`, `metodo` enum (fisica_digitalizada | canvas | icp_brasil), `assinatura_imagem_path`, `assinado_em`, `ip`, `user_agent`, `geolocalizacao` jsonb

### Regras de integridade

- `payload` é **snapshot congelado**. Se o tutor mudar de endereço amanhã, o documento emitido hoje continua exibindo o endereço da época. Nunca renderize um documento emitido fazendo join com as tabelas vivas.
- Documento com status `emitido` ou `assinado` é imutável. Correção só via cancelamento com motivo obrigatório + reemissão, com `documento_substituto_id` ligando os dois.
- RLS em todas as tabelas, isolando por `clinica_id`. Templates globais (`clinica_id is null`) são legíveis por todos, editáveis só por service role.
- Trilha de auditoria: quem emitiu, quem cancelou, quem assinou, quando.

## Etapa 2 — Seed

Escreva um script que faça o parse do markdown da biblioteca e popule `document_templates` + `document_template_versions` na versão 1.

- Extraia `codigo`, `titulo`, `grupo`, `base_legal` (o bloco de citação `>` que precede cada modelo) e `corpo` (o bloco de código do modelo).
- Os blocos reutilizáveis — `[BLOCO DE IDENTIFICAÇÃO DO PACIENTE]`, `[BLOCO DE IDENTIFICAÇÃO DO RESPONSÁVEL]`, `[BLOCO DE ASSINATURAS]`, cabeçalho e rodapé — devem virar **partials** resolvidos no motor de template, não texto duplicado em 30 modelos.
- O script deve ser **idempotente**: rodar duas vezes não pode duplicar nem sobrescrever versão publicada.
- Popule `variaveis_requeridas` extraindo automaticamente os `{{ }}` do corpo.

## Etapa 3 — Motor de template

Função pura, com testes:

- Resolve `{{escopo.campo}}` a partir de um objeto de contexto.
- Variável ausente **não** renderiza `undefined` nem string vazia silenciosa: emite um warning coletável, e a UI destaca os campos pendentes antes de permitir emitir.
- **Filtrar entradas vazias de arrays antes de renderizar.** Requisito explícito: listas e itens numerados não podem sair com marcador em branco.
- Campos de preenchimento manual (`....`, `( )`, `______`) permanecem no PDF como campos preenchíveis ou linhas para caneta, conforme o modo de emissão.
- Escapar corretamente para não quebrar o layout do PDF.

## Etapa 4 — Geração de PDF

- Cabeçalho e rodapé padrão definidos na seção 4 da biblioteca, em todas as páginas.
- Rodapé com numeração `Página X de Y`, número do documento e hash.
- QR code de validação apontando para rota pública `/validar/:hash`.
- Marca d'água `VIA DO RESPONSÁVEL` / `VIA DA CLÍNICA` conforme a via.
- Marca d'água `CANCELADO` em documentos com esse status.
- Calcular SHA-256 do PDF final e persistir.
- Armazenar em Supabase Storage com política de acesso restrita.

## Etapa 5 — Interface

Seguindo a paleta teal / azul-petróleo e o padrão shadcn/ui já em uso:

1. **Biblioteca de modelos** — lista agrupada por Grupo A/B/C/D, busca, filtro por categoria, badge indicando se é exigido pela Res. 1.321/2020, visualização do texto e da base legal.
2. **Editor de modelo** — edição do corpo com preview lado a lado e painel das variáveis disponíveis. Salvar cria nova versão; exige confirmação explícita mostrando o diff.
3. **Emissão** — a partir do atendimento: escolher modelo → dados do paciente/tutor/vet preenchidos automaticamente → formulário só com o que falta → preview → emitir.
4. **Assinatura** — canvas responsivo (funciona em tablet e no Capacitor), captura de IP, timestamp e user-agent. Suporte a múltiplos signatários, incluindo o bloco de duas testemunhas.
5. **Documentos do paciente** — timeline no prontuário com todos os documentos emitidos, status, download das duas vias e ação de cancelar.

## Etapa 6 — Regras de negócio

- Bloquear conclusão de procedimento cirúrgico sem TCLE cirúrgico **e** anestésico assinados (ou o consolidado B2-C).
- Bloquear registro de eutanásia sem o TCLE de eutanásia assinado **e** destinação do corpo definida.
- Alta a pedido do responsável dispara automaticamente o termo B9 (retirada sem alta médica) — obrigatório em qualquer situação desde a Res. 1.653/2025, não só em risco de morte.
- Ao registrar qualquer recusa no atendimento, sugerir o termo C correspondente.
- Se o responsável recusar assinar: fluxo alternativo que exige registro em prontuário + duas testemunhas.
- Documentos com validade (atestado sanitário, orçamento) exibem alerta de vencimento.
- Atestado sanitário, prontuário e carteira de vacinação: **1 via**. Todos os demais: **2 vias**.

## Como trabalhar

- Uma etapa por vez. Ao final de cada uma, pare, mostre o que fez e aguarde meu OK.
- Migrations sempre reversíveis. Nunca rode comando destrutivo no banco sem me perguntar.
- Não faça deploy. Não altere variáveis de ambiente.
- Se precisar de decisão de produto que não está aqui, pergunte em vez de assumir.
- Testes no motor de template e nas regras de bloqueio — essas duas partes não podem falhar silenciosamente.
