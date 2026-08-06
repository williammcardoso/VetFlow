-- Registra com qual forma de pagamento o orçamento foi convertido em venda.
-- Sem isso o campo voltava vazio ("Selecione") após a conversão e ainda podia
-- ser alterado, dando a impressão de que a venda seria afetada.

alter table public.budgets
  add column if not exists payment_method text;
