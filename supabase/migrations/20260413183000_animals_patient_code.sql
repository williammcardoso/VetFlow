-- Global/stable patient display code for animals
create sequence if not exists public.animals_patient_code_seq as integer;

alter table public.animals
  add column if not exists patient_code integer;

alter table public.animals
  alter column patient_code set default nextval('public.animals_patient_code_seq');

-- Backfill existing rows that do not have a patient code yet.
update public.animals
set patient_code = nextval('public.animals_patient_code_seq')
where patient_code is null;

-- Keep sequence ahead of the highest existing value.
select setval(
  'public.animals_patient_code_seq',
  greatest(
    coalesce((select max(patient_code) from public.animals), 0),
    1
  ),
  true
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'animals_patient_code_unique'
      and conrelid = 'public.animals'::regclass
  ) then
    alter table public.animals
      add constraint animals_patient_code_unique unique (patient_code);
  end if;
end
$$;

alter table public.animals
  alter column patient_code set not null;
