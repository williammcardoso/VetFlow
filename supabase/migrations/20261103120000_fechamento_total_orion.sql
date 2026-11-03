-- VetFlow: total de venda do mês no Orion (sistema da Agrocentro, onde o
-- cliente paga) para conferir no Fechamento 50/50:
--   Orion "Total Venda" = vendas do mês no VetFlow + acréscimos lançados
-- Um valor por mês, digitado do rodapé do relatório completo do Orion.
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.

create table if not exists public.monthly_closing_orion (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  month int not null check (month between 1 and 12),
  total_venda numeric(12, 2) not null check (total_venda >= 0),
  updated_at timestamptz not null default now(),
  updated_by text,
  unique (year, month)
);

comment on table public.monthly_closing_orion is
  'Total de venda do mês no Orion (Agrocentro), digitado para conferir com o Fechamento 50/50.';

alter table public.monthly_closing_orion enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'monthly_closing_orion' and policyname = 'monthly_closing_orion_allow_all'
  ) then
    create policy monthly_closing_orion_allow_all on public.monthly_closing_orion
      for all to anon, authenticated using (true) with check (true);
  end if;
end $$;

notify pgrst, 'reload schema';
