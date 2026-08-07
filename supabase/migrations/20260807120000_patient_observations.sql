-- Observações do prontuário: hoje é useState([]) sem persistência nenhuma —
-- toda observação some ao recarregar a página, e o alerta no topo do
-- prontuário (que depende de displayAsAlert) nunca funciona de verdade.

create table if not exists public.patient_observations (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null,
  observation text not null,
  display_as_alert boolean not null default false,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_patient_observations_animal
  on public.patient_observations (animal_id);

comment on table public.patient_observations is
  'Observações livres do prontuário do animal; display_as_alert controla o badge de alerta no topo do prontuário.';

alter table public.patient_observations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'patient_observations' and policyname = 'patient_observations_allow_all'
  ) then
    create policy patient_observations_allow_all
      on public.patient_observations for all
      using (true) with check (true);
  end if;
end $$;
