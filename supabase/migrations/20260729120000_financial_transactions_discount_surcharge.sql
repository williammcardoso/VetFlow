-- Adiciona campos de desconto e acréscimo manual às transações financeiras
-- (necessários para exibir a composição do valor no comprovante/relatório de venda)

alter table public.financial_transactions
  add column if not exists discount_amount numeric not null default 0,
  add column if not exists surcharge_amount numeric not null default 0;
