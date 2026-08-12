-- Compra de estoque parcelada (ex.: boleto em 5x): sem isso, uma compra
-- grande entrava inteira no fechamento 50/50 do mês em que foi cadastrada,
-- em vez de ser reconhecida mês a mês conforme cada parcela vence. Cada
-- parcela vira sua própria linha em financial_transactions (categoria
-- "Estoque"), datada no vencimento; purchase_group_id agrupa as parcelas
-- da mesma compra pro histórico mostrar uma linha só.

alter table public.financial_transactions
  add column if not exists purchase_group_id text;

alter table public.financial_transactions
  add column if not exists installment_label text;

create index if not exists idx_financial_transactions_purchase_group
  on public.financial_transactions (purchase_group_id)
  where purchase_group_id is not null;
