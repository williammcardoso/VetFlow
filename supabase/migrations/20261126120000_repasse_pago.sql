-- VetFlow: marcar repasse como PAGO antes do fechamento (ex.: anestesista e
-- raio-x que recebem na hora, um exame de lab pago à parte).
-- Só controle de pagamento: não muda o Fechamento 50/50 (o repasse continua
-- sendo custo do mês). No PDF de repasse o item aparece como pago e sai do
-- "a pagar" que vai para o escritório.
--   sale_items.repasse_pago_em             → repasse de serviço vendido (lab, especialista)
--   financial_transactions.repasse_pago_em → despesa (Financeiro → Despesas)
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.

alter table public.sale_items
  add column if not exists repasse_pago_em date;

alter table public.financial_transactions
  add column if not exists repasse_pago_em date;

comment on column public.sale_items.repasse_pago_em is
  'Data em que o repasse ao prestador foi pago (vazio = a pagar no fechamento).';
comment on column public.financial_transactions.repasse_pago_em is
  'Despesa: data em que o fornecedor foi pago (vazio = a pagar no fechamento).';

notify pgrst, 'reload schema';
