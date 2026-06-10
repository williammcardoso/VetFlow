# VetFlow - Auditoria Tecnica Etapa 2 (Runtime)

Data: 2026-03-19  
Ambiente: Windows 10, Node v22.16.0, npm 10.9.2

## Preparacao de ambiente

- Package manager detectado: `npm` (`package-lock.json` presente).
- Dependencias: `npm install` executado com sucesso (up to date).
- Build: `npm run build` executado com sucesso (`exit_code: 0`), com alertas:
  - PostCSS: `@import must precede all other statements` em `src/globals.css`.
  - Bundle grande (`index-*.js` > 500kB).
- App local: acessivel em `http://localhost:8080/`.

## Checklist por dominio

| Dominio | Cenario testado | Resultado esperado | Resultado observado | Status | Evidencia |
|---|---|---|---|---|---|
| Clientes | Abrir listagem `/clients` | Tela de clientes renderiza com filtros e acoes | Tela abriu com campos de busca e botoes de acao | OK | Rota `http://localhost:8080/clients` |
| Clientes | Busca por responsavel inexistente | Lista vazia com estado de vazio | Acoes "Ver" desapareceram apos busca/aplicar filtro | OK | Campo `Responsavel=ZZZ_NAO_EXISTE`, clique em buscar |
| Clientes | Criacao em `/clients/add` | Salvar e navegar para detalhe do cliente novo | Form aceitou dados minimos e navegou para `/clients/5` | OK | Rota mudou para `http://localhost:8080/clients/5` |
| Clientes | Detalhe de cliente `/clients/1` | Exibir dados do cliente | Ficou em loading continuo (`Carregando...`) | Falha | GET Supabase `clients?id=eq.1&limit=1` retornando `400` |
| Clientes | Edicao de cliente novo `/clients/5/edit` | Abrir tela de edicao | Navegacao redirecionou para `/clients` (edicao nao abriu) | Falha | Navegacao para `.../clients/5/edit` terminou em `.../clients` |
| Paciente/Prontuario | Abrir prontuario `/clients/1/animals/1854/record` | Carregar dados clinicos do animal | Loading continuo (`Carregando prontuario...`) | Falha | Requests `appointments/exams/prescriptions/patient_documents` com `400` |
| Agendamentos | Abrir formulario clinico `/clients/1/animals/1854/add-appointment` | Exibir `AppointmentForm` pronto para salvar | Loading continuo (`Carregando atendimento...`) | Falha | Requisicoes de cliente/animal e historico com `400` |
| Agendamentos | Fluxo de agenda `/agenda` + modal novo agendamento | Abrir modal, selecionar cliente/animal e salvar | Modal abriu; estado vazio exibido; cliente selecionado, mas campo Animal permaneceu desabilitado | Falha | Rota `.../agenda`, modal `Novo Agendamento`, combobox `Animal` disabled |
| Documentos | Abrir `/clients/1/animals/1854/add-document` | Exibir editor/upload com paciente valido | Pagina exibiu `Paciente nao encontrado.` | Falha | Rota `.../add-document` |
| Documentos | Editor rico (componente Tiptap-like em modelos) | Permitir edicao e persistencia | Editor aceitou conteudo e salvou modelo | OK | Em `/registrations/document-model`: `POST /rest/v1/registry` status `201` |
| Cadastros auxiliares | Species `/registrations/species` (load + add) | CRUD basico funcional | Tela abriu; tentativa de add sem evidencia forte de persistencia remota capturada | Bloqueado | Rota abriu; acoes visiveis, sem confirmacao inequívoca de persistencia |
| Cadastros auxiliares | Breeds `/registrations/breeds` (load + add) | CRUD basico funcional | Tela abriu; campo limpou apos add (indicio de sucesso) | OK | Input limpo apos clicar `Adicionar` |
| Cadastros auxiliares | CoatTypes `/registrations/coat-types` (load + add) | CRUD basico funcional | Tela abriu em fallback (`Sem registros no banco...`); add nao gerou POST observado | Falha | Apenas GET `registry?key=coatTypes` `200`, sem POST na tentativa de add |
| Cadastros auxiliares | DocumentModel `/registrations/document-model` (create) | Criar modelo e refletir na lista | Criacao executada com persistencia remota | OK | `POST /rest/v1/registry?select=*` `201` |

## Falhas encontradas (severidade + reproducao)

1. **Detalhe de cliente entra em loading infinito**  
   - Severidade: **Critica**  
   - Reproducao:
     1) Acessar `/clients/1`  
     2) Aguardar carregamento  
   - Observado: tela permanece em `Carregando...` sem fallback de erro.  
   - Evidencia: GET `.../rest/v1/clients?...&id=eq.1&limit=1` retornando `400` repetidamente.

2. **Prontuario indisponivel por erro de dados remotos**  
   - Severidade: **Critica**  
   - Reproducao:
     1) Acessar `/clients/1/animals/1854/record`  
   - Observado: `Carregando prontuario...` continuo.  
   - Evidencia: `appointments`, `exams`, `prescriptions`, `patient_documents` com `400`.

3. **Formulario clinico de atendimento nao abre (loading continuo)**  
   - Severidade: **Alta**  
   - Reproducao:
     1) Acessar `/clients/1/animals/1854/add-appointment`  
   - Observado: `Carregando atendimento...` sem evolucao.  
   - Evidencia: requests de cliente/historico com `400`.

4. **Criacao de documento clinico bloqueada por paciente nao encontrado**  
   - Severidade: **Alta**  
   - Reproducao:
     1) Acessar `/clients/1/animals/1854/add-document`  
   - Observado: mensagem `Paciente nao encontrado.`  
   - Evidencia: propria renderizacao da pagina.

5. **Agenda: fluxo de novo agendamento incompleto**  
   - Severidade: **Media**  
   - Reproducao:
     1) Acessar `/agenda`  
     2) Clicar `Novo Agendamento`  
     3) Selecionar cliente no combobox  
   - Observado: campo `Animal` permanece desabilitado, impedindo continuidade natural do cadastro.  
   - Evidencia: snapshot com combobox `Animal` em `states: [disabled, collapsed]`.

6. **CoatTypes sem confirmacao de persistencia em add**  
   - Severidade: **Media**  
   - Reproducao:
     1) Acessar `/registrations/coat-types`  
     2) Preencher nome e clicar `Adicionar`  
   - Observado: tela mostra fallback de continuidade operacional; nao houve POST observado para inclusao.  
   - Evidencia: rede exibiu apenas GET `registry?key=coatTypes` `200`.

## Bloqueios

- Bloqueio principal de runtime: endpoints Supabase centrais para fluxo clinico retornando `400`, impactando detalhe de cliente, prontuario, documentos e atendimento clinico.
- Interacao por sidebar no browser MCP foi limitada por viewport/scroll interno; mitigado por navegacao direta de rotas.
- Console sem crash JS bloqueante evidente; ha warnings de `React Router` (future flags) e alertas nao criticos.

## Recomendacao de prontidao

**Nao pronto** para proxima fase funcional/E2E completo.

Justificativa:
- Fluxos criticos clinicos (detalhe, prontuario, atendimento, documento por paciente) estao com falha runtime de dados (`400`).
- Parte de cadastros auxiliares esta funcional, mas com inconsistencias entre modulos (persistencia/fallback).

## Proximos passos priorizados

- **P0**
  - Corrigir raiz dos `400` nas queries Supabase dos fluxos clinicos (cliente por ID + entidades por `animal_id`).
  - Garantir fallback de erro em tela (evitar loading infinito).
  - Validar novamente: `/clients/:id`, `/record`, `/add-appointment`, `/add-document`.
- **P1**
  - Corrigir fluxo de `Novo Agendamento` em `/agenda` (habilitacao de animal apos selecionar cliente).
  - Revisar CoatTypes para persistencia real ao adicionar e feedback de sucesso/erro.
- **P2**
  - Ajustar warning PostCSS (`@import` antes de `@tailwind`) em `src/globals.css`.
  - Planejar split de bundle por warning de chunk size no build.

## Execucao P0/P1/P2 (2026-03-19 - rodada de correcao)

### Implementado
- **P0**
  - Fallback robusto em `useSupabaseClients` para IDs legados/mocks (nao-UUID), evitando quebra por `400` no Supabase.
  - `retry: false` no `useClientWithAnimals` para reduzir loading prolongado em erro.
  - Fallback local para `appointmentsApi` e `documentsApi` quando `animalId` nao for UUID (fluxo mock/local funcional).
- **P1**
  - Ajuste do fluxo em `AgendaPage` para reset seguro de animal ao trocar cliente.
  - Resiliencia de `CoatTypesPage`: fallback local quando persistencia remota falhar.
- **P2**
  - Corrigida ordem de `@import` em `src/globals.css` (remove warning PostCSS de ordem).
  - Adicionado `manualChunks` em `vite.config.ts` para reduzir acoplamento do bundle principal.

### Validacao apos correcao
- Build: **OK** (`npm run build`).
- Runtime (browser):
  - `/clients/1`: **OK** (detalhe carrega com dados).
  - `/clients/1/animals/1854/add-appointment`: **OK** (formulario abre sem loading infinito).
  - `/clients/1/animals/1854/add-document`: **OK** (editor abre com paciente/tutor).
  - `/agenda` (modal): continua com comportamento inconsistente no teste automatizado MCP para habilitacao do animal apos selecionar cliente; precisa confirmacao manual assistida em browser real.

## Vistoria visual obrigatoria (Lote 2+)

Adicionar este bloco na auditoria de cada rota revisada:

- [ ] **Cor de fundo dos cards**: conferir tom da superficie (sem "cinza sujo"), contraste com conteudo e consistencia light/dark.
- [ ] **Hover e animacao**: validar microinteracao ao passar o mouse (suave, sem exagero, sem "pulo" brusco).
- [ ] **Textos interativos**: links/botoes/textos clicaveis com cor coerente ao modulo, estados hover/active/focus legiveis.
- [ ] **Peso tipografico (negrito)**: aplicar destaque somente onde ha hierarquia real (titulos, labels-chave, valores criticos).
- [ ] **Icones fortes e visiveis**: checar contraste/tamanho/proporcao; aumentar quando necessario para leitura rapida.
- [ ] **Espacamento entre cards/paineis**: remover lacunas desnecessarias e evitar agrupamento espremido.
- [ ] **Consistencia entre blocos**: header, cards, tabelas e toolbars devem parecer do mesmo sistema visual.

