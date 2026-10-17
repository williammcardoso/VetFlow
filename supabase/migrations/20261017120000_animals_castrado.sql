-- VetFlow: castrado (sim/não) no cadastro do animal.
-- neutered = true (castrado), false (não castrado), nulo = ainda não
-- informado — o prontuário mostra um alerta pedindo pra completar o cadastro.
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.

alter table public.animals add column if not exists neutered boolean;

comment on column public.animals.neutered is
  'Castrado: true = sim, false = não, nulo = não informado.';

notify pgrst, 'reload schema';
