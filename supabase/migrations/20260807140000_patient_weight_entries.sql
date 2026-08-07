-- Aba Peso do prontuário: mapDbAnimalToAnimal sempre retornava
-- weightHistory: [] e updateAnimalDetails tinha um comentário
-- "not implemented" — nenhum peso histórico era persistido, só o campo
-- "weight" atual do animal. Cada pesagem (manual ou lançada junto de um
-- atendimento) passa a virar uma linha aqui.

create table if not exists public.patient_weight_entries (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null,
  weight numeric(8, 2) not null,
  source text,
  recorded_date date not null,
  recorded_time text,
  created_at timestamptz not null default now()
);

create index if not exists idx_patient_weight_entries_animal
  on public.patient_weight_entries (animal_id);

comment on table public.patient_weight_entries is
  'Histórico de pesagens do paciente — alimenta a aba Peso do prontuário.';

alter table public.patient_weight_entries enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'patient_weight_entries' and policyname = 'patient_weight_entries_allow_all'
  ) then
    create policy patient_weight_entries_allow_all
      on public.patient_weight_entries for all
      using (true) with check (true);
  end if;
end $$;
