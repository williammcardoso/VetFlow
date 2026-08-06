-- Negociação no orçamento: desconto, acréscimo e observações.
-- (notes já existia na tabela; aqui entram só os valores negociados,
-- que são repassados para a venda na hora da conversão.)

alter table public.budgets
  add column if not exists discount_amount numeric not null default 0,
  add column if not exists surcharge_amount numeric not null default 0;
