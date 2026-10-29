# VetFlow — notas para o Claude

Stack e regras de base: ver `AI_RULES.md` (React + TypeScript, shadcn/ui, Tailwind, rotas em `src/App.tsx`).
Interface, textos e mensagens de commit em português do Brasil.

## Layout e visual (preferências do dono do projeto)

- **Sem espaço em branco grande ou desnecessário.** Campo de formulário tem a largura do que cabe nele
  (hora, data, número, RG ≈ 6–16rem; frase ≈ 20rem); nunca esticado na linha toda no computador. No celular
  o campo pode ocupar a linha. Caixa de texto grande só para texto longo de verdade.
- **Monitor grande é o uso principal no computador** (1920px com o menu lateral aberto). Tela não pode ficar
  "esticada": em vez de uma faixa larga com pouco conteúdo, use colunas (ex.: formulário + resumo/preview lado
  a lado, cartões curtos lado a lado em `xl`/`2xl`), larguras por conteúdo ou listas com colunas alinhadas.
- Ícone de ajuda/ação fica junto do que se refere, não isolado na borda oposta da tela.
- Seguir o padrão das telas já refeitas — PDV (`src/pages/sales/POSPage.tsx`), Vendas, Orçamentos e a linha do
  tempo do prontuário (`src/components/patient/PatientTimeline.tsx`): `Panel`, `IconChip`, `KpiStrip`,
  `TONES`/`CONCEPTS` de `src/components/finance`, números importantes em negrito com `tabular-nums`, cor por
  conceito (verde = recebido/convertido, vermelho = cancelado, âmbar = em aberto).
- "Faça como deve ser feito": o usuário dá ideias soltas (cores, cards); aproveitar a ideia, mas seguir o
  padrão SaaS do sistema em vez de copiar a sugestão ao pé da letra.
- Conferir sempre no celular (iPhone/Safari): nada de rolagem lateral, e o botão principal não pode ficar colado
  no rodapé da tela (a barra do Safari no iOS 26 come o toque ali).

## Fluxo de trabalho

- O usuário autorizou commit direto no `main`. Mensagem no estilo `area: o que mudou` (sem acento), com o
  porquê no corpo.
- Testes: `VITE_SUPABASE_URL=https://x.supabase.co VITE_SUPABASE_ANON_KEY=x npx vitest run` — sem essas
  variáveis vários arquivos falham com "supabaseUrl is required" (não é erro do código).
- Lint: `npx eslint <arquivos>`. Há erros antigos de `no-explicit-any` em várias telas; não somar novos.
