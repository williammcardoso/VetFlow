-- Campos para rastrear o cancelamento/estorno de uma venda

alter table public.financial_transactions
  add column if not exists cancel_reason text,
  add column if not exists cancelled_at timestamptz;
