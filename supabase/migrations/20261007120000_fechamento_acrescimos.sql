-- VetFlow: acréscimos do Fechamento 50/50 que ficam FORA da divisão.
-- Ex.: aplicações a domicílio cobradas no sistema da agropecuária, que são
-- 100% da clínica. Entram depois da divisão, direto para quem recebe:
--   Clínica = 50% do lucro + acréscimos da clínica
--   Agropecuária = 50% do lucro + acréscimos da agropecuária
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.

create table if not exists public.monthly_closing_extras (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  month int not null check (month between 1 and 12),
  description text not null check (length(trim(description)) > 0),
  amount numeric(12, 2) not null check (amount > 0),
  beneficiary text not null check (beneficiary in ('clinic', 'agro')),
  created_at timestamptz not null default now(),
  created_by text
);

create index if not exists idx_monthly_closing_extras_month on public.monthly_closing_extras (year, month);

comment on table public.monthly_closing_extras is
  'Valores fora do 50/50 somados à parte de quem recebe no fechamento do mês (ex.: aplicações a domicílio = clínica).';

alter table public.monthly_closing_extras enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'monthly_closing_extras' and policyname = 'monthly_closing_extras_allow_all'
  ) then
    create policy monthly_closing_extras_allow_all on public.monthly_closing_extras
      for all to anon, authenticated using (true) with check (true);
  end if;
end $$;

notify pgrst, 'reload schema';
