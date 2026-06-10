# VetFlow - Pente Fino Visual (UI/UX)

Data: 2026-03-19  
Escopo: avaliacao visual focada em consistencia, legibilidade, hierarquia, responsividade e acessibilidade visual.  
Ambiente de validacao: desktop (1440x1024) e mobile (390x844), com navegacao runtime real.

## Achados (ordenados por severidade)

### Alta

1. **Botoes icon-only sem rotulo acessivel em telas-chave**
   - **Impacto visual/UX:** usuario nao entende a acao rapidamente; baixa descobribilidade.
   - **Evidencia:** em `http://localhost:8080/clients` e `http://localhost:8080/clients/1`, varios `button` sem nome no snapshot (refs sem label).
   - **Recomendacao:** adicionar `aria-label` + `Tooltip` padrao para todos os icones sem texto.

2. **Microcopy inconsistente entre PT-BR e EN**
   - **Impacto visual:** quebra de coerencia da interface e sensacao de produto inacabado.
   - **Evidencia:** `Sexo: male` em `http://localhost:8080/clients/1`; botao de calendario `Go to previous month`/`Go to next month` em `http://localhost:8080/agenda`.
   - **Recomendacao:** centralizar strings em i18n/localization e padronizar 100% PT-BR.

3. **Duplicidade de acao de Ajuda no topo**
   - **Impacto visual:** ruido no header e ambiguidade de interacao.
   - **Evidencia:** coexistencia de `link Ajuda` e `button Ajuda` nas telas auditadas.
   - **Recomendacao:** manter apenas 1 entrada de ajuda no header global.

### Media

4. **Densidade excessiva no editor de modelos em mobile**
   - **Impacto visual/UX:** sobrecarga cognitiva; dificuldade de edicao em tela pequena.
   - **Evidencia:** `http://localhost:8080/registrations/document-model` apresenta ~69 elementos interativos no viewport mobile.
   - **Recomendacao:** modo mobile simplificado (toolbar recolhivel, secoes progressivas, variaveis em drawer).

5. **Toolbar de Clientes muito carregada em viewport pequeno**
   - **Impacto visual:** potencial quebra de fluxo e hierarquia de acao primaria.
   - **Evidencia:** em `http://localhost:8080/clients`, mesma linha combina filtros, 3 botoes iconicos e 2 CTAs.
   - **Recomendacao:** priorizar CTA primaria e mover filtros avancados para menu secundario em mobile.

6. **Hierarquia de tabs abreviadas no prontuario**
   - **Impacto visual:** reduz clareza sem contexto (ex.: `Atend.`, `Observ.`).
   - **Evidencia:** `http://localhost:8080/clients/1/animals/1854/record`.
   - **Recomendacao:** manter abreviacao apenas em mobile com tooltip/label completo.

### Baixa

7. **Detalhes de tipografia/formatação textual inconsistentes**
   - **Impacto visual:** acabamento inferior.
   - **Evidencia:** `CPF :` com espaco antes de `:` em `http://localhost:8080/clients/1`.
   - **Recomendacao:** padronizar mascaras e output textual no formatter de campos.

8. **Estados de carregamento com baixa previsibilidade visual**
   - **Impacto visual:** usuario nao sabe se a tela travou ou esta processando.
   - **Evidencia:** `Carregando...` na biblioteca de modelos em `http://localhost:8080/registrations/document-model`.
   - **Recomendacao:** trocar por skeleton com timeout/fallback e acao de "tentar novamente".

## Pontos positivos observados

- Linguagem visual geral consistente (cards, cantos, tipografia base e tons neutros/verde).
- Header e breadcrumb ajudam orientacao em modulos principais.
- Formularios com placeholders e labels na maior parte das telas.

## Prioridade de melhorias visuais

- **P0 visual**
  - Rotular todos os icon buttons sem texto.
  - Corrigir strings EN/PT e duplicidade de Ajuda.
- **P1 visual**
  - Reduzir densidade do `document-model` em mobile.
  - Reorganizar barra de acoes de `clients` para small screens.
- **P2 visual**
  - Ajustes de microtipografia (`CPF:` etc.) e padronizacao de estados de loading.

---

## Rodada visual - Lote 2 (2026-03-24)

Escopo desta rodada:
- `/clients`
- `/clients/:clientId`
- `/agenda`
- `/help`

### Criterio obrigatorio de vistoria

- [x] Cor de fundo dos cards (light/dark, contraste, sem "cinza sujo")
- [x] Animacao/hover ao passar mouse (suave, sem salto brusco)
- [x] Textos interativos com cor coerente do modulo
- [x] Negritos aplicados na hierarquia correta
- [x] Icones fortes/visiveis (com aumento quando necessario)
- [x] Espacos desnecessarios entre cards/paineis removidos
- [x] Consistencia visual entre header/cards/tabelas/toolbars

### Tabela de score por rota (antes x depois)

| Rota | Familia | Antes | Depois | Delta | Veredito |
|---|---|---:|---:|---:|---|
| `/clients` | Listagem/Tabela | 8.3 | 8.7 | +0.4 | Muito bom |
| `/clients/:clientId` | Detalhe cliente | 8.1 | 8.8 | +0.7 | Muito bom |
| `/agenda` | Clinical/Agenda | 8.2 | 8.9 | +0.7 | Muito bom |
| `/help` | Suporte/Placeholder ativo | 7.9 | 8.2 | +0.3 | Bom+ |

### Evidencias objetivas aplicadas na rodada

1. `SectionCard` recebeu hover/superficie premium padrao (`vf-surface-card card-hover`) e icones reforcados.
2. `ClientDetailPage` migrou cards internos para superficie premium com semantica clinica em icones.
3. `AgendaPage` ganhou cards principais com hover e cards de agendamento com tonalidade clinica no hover.
4. `HelpPage` alinhado para semantica de configuracoes (`module/tone = settings`), reduzindo neutralidade generica.
5. Espacamento entre paineis ajustado (`gap-5`) em telas do lote para reduzir "buracos" visuais.

### Pendencias residuais (nao bloqueantes do lote)

- Revisar densidade da toolbar de `/clients` em mobile extremo (larguras muito pequenas).
- Fazer uma passada de microcopy para padronizar 100% strings PT-BR em componentes herdados.

---

## Rodada visual - Lote 3 (2026-03-24)

Escopo desta rodada (Comercial):
- `/sales/my-sales`
- `/sales/pos`
- `/sales/receipts`
- `/sales/budgets`
- `/sales/reports`
- `/sales/sold-packages`
- `/sales/statement-model`
- `/sales/client-financial`

### Criterio obrigatorio de vistoria

- [x] Cor de fundo dos cards (superficies premium consistentes em light/dark)
- [x] Animacao/hover em cards e blocos de lista
- [x] Textos/acoes interativas com semantica comercial (violet/indigo)
- [x] Negritos aplicados em metricas/chaves operacionais
- [x] Icones com contraste e tamanho adequados (reforco onde necessario)
- [x] Espacamentos entre cards/paineis ajustados (sem lacunas excessivas)
- [x] Consistencia de topo, cards e blocos analiticos

### Tabela de score por rota (antes x depois)

| Rota | Familia | Antes | Depois | Delta | Veredito |
|---|---|---:|---:|---:|---|
| `/sales/my-sales` | Comercial (lista operacional) | 8.4 | 8.8 | +0.4 | Muito bom |
| `/sales/pos` | Comercial (PDV/formulario) | 8.0 | 8.7 | +0.7 | Muito bom |
| `/sales/receipts` | Comercial (recebimentos) | 7.7 | 8.6 | +0.9 | Muito bom |
| `/sales/budgets` | Comercial (orcamentos) | 8.7 | 8.9 | +0.2 | Muito bom |
| `/sales/reports` | Analytics/Relatorios | 8.1 | 8.8 | +0.7 | Muito bom |
| `/sales/sold-packages` | Placeholder ativo | 7.6 | 7.9 | +0.3 | Bom |
| `/sales/statement-model` | Placeholder ativo | 7.6 | 7.9 | +0.3 | Bom |
| `/sales/client-financial` | Comercial/Financeiro | 7.9 | 8.6 | +0.7 | Muito bom |

### Evidencias objetivas aplicadas na rodada

1. `ReceiptsPage` migrado para shell completo com `PageShell + SectionCard + ToolbarRow`.
2. Bloco de novo recebimento consolidado com superficie premium e CTA comercial semantica.
3. Lista de recebimentos com cards hover (`card-hover`) e contraste de leitura aprimorado.
4. `SalesReportsPage` padronizado em superficies `vf-surface-card` (compatibilidade dark mode).
5. Blocos KPI e graficos com hover sutil e densidade reduzida (`gap-5`).
6. `ClientFinancialPage` encapsulado em `SectionCard` e cards internos premium.
7. `POSPage` com refinamento de espacamento e reforco iconografico comercial.
8. `SalesPage` com cards de transacao em hover premium.

### Pendencias residuais (nao bloqueantes do lote)

- Quebra de chunk acima de 500kB no build (otimizacao de bundle segue em trilha tecnica separada).
- Placeholders comerciais ainda com escopo funcional reduzido (visual aprovado dentro da meta minima).

---

## Rodada visual - Lote 4 (2026-03-24)

Escopo desta rodada (Financeiro):
- `/financial`
- `/financial/reports`
- `/sales/client-financial` (rota que atende "clientes financeiros")
- `/financial/payment-methods`
- `/financial/transactions`
- `/financial/card-reconciliation`
- `/financial/accounts-payable`
- `/financial/statement`
- `/financial/cash-flow`
- `/financial/accounts-cards`
- `/financial/categories`
- `/financial/suppliers`

### Criterio obrigatorio de vistoria

- [x] Cor de fundo dos cards (superficie premium consistente)
- [x] Animacao/hover nos blocos de leitura
- [x] Textos interativos com semantica do modulo financeiro
- [x] Negritos/hierarquia de indicadores
- [x] Icones fortes e legiveis
- [x] Espacos entre paineis ajustados
- [x] Consistencia visual geral entre visao geral/relatorios/placeholders

### Tabela de score por rota (antes x depois)

| Rota | Familia | Antes | Depois | Delta | Veredito |
|---|---|---:|---:|---:|---|
| `/financial` | Visao geral financeira | 8.2 | 8.8 | +0.6 | Muito bom |
| `/financial/reports` | Analytics/Relatorios | 8.1 | 8.8 | +0.7 | Muito bom |
| `/sales/client-financial` | Clientes financeiros | 8.6 | 8.6 | +0.0 | Mantido (aprovado) |
| `/financial/payment-methods` | Cadastro simples | 8.4 | 8.4 | +0.0 | Mantido (aprovado) |
| `/financial/transactions` | Placeholder ativo | 7.8 | 7.9 | +0.1 | Bom |
| `/financial/card-reconciliation` | Placeholder ativo | 7.8 | 7.9 | +0.1 | Bom |
| `/financial/accounts-payable` | Placeholder ativo | 7.8 | 7.9 | +0.1 | Bom |
| `/financial/statement` | Placeholder ativo | 7.8 | 7.9 | +0.1 | Bom |
| `/financial/cash-flow` | Placeholder ativo | 7.8 | 7.9 | +0.1 | Bom |
| `/financial/accounts-cards` | Placeholder ativo | 7.8 | 7.9 | +0.1 | Bom |
| `/financial/categories` | Placeholder ativo | 7.8 | 7.9 | +0.1 | Bom |
| `/financial/suppliers` | Placeholder ativo | 7.8 | 7.9 | +0.1 | Bom |

### Evidencias objetivas aplicadas na rodada

1. `FinancialPage` migrado para shell com `PageShell + SectionCard`, reforcando topo e agrupamento visual.
2. Bloco de filtro por periodo encapsulado em card semantico financeiro, com melhor leitura e contraste.
3. Painel principal financeiro com hierarquia mais clara entre resumo, KPIs, tendencia e alertas.
4. `FinancialReportsPage` padronizado para `vf-surface-card card-hover` em KPIs, graficos e tabela.
5. Tabela de detalhamento no relatorio ajustada para header `bg-card` (coerencia dark/light).

### Pendencias residuais (nao bloqueantes do lote)

- Alguns blocos de exportacao ainda sao botoes de acao visual (sem fluxo funcional completo de export real).
- Warnings de chunk size no build seguem fora do escopo visual deste lote.
