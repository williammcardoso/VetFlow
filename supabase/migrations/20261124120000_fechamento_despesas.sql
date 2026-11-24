-- VetFlow: despesas que entram no Fechamento 50/50 (Financeiro → Despesas).
-- Os lançamentos ficam em financial_transactions (type = 'expense',
-- category = 'Despesa 50/50', responsible = quem pagou: 'clinic' ou 'agro').
-- Aqui só o mês fechado passa a guardar o total das despesas e o reembolso de
-- cada parte, para o fechamento travado mostrar a conta inteira.
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.

alter table public.monthly_closings
  add column if not exists custo_despesas numeric(12, 2) not null default 0,
  add column if not exists reembolso_clinica numeric(12, 2) not null default 0,
  add column if not exists reembolso_agro numeric(12, 2) not null default 0;

comment on column public.monthly_closings.custo_despesas is
  'Despesas do mês que entraram no 50/50 (descontadas do lucro antes da divisão).';
comment on column public.monthly_closings.reembolso_clinica is
  'Parte das despesas paga pela clínica — devolvida a ela no fechamento.';
comment on column public.monthly_closings.reembolso_agro is
  'Parte das despesas paga pela agropecuária — devolvida a ela no fechamento.';

notify pgrst, 'reload schema';
