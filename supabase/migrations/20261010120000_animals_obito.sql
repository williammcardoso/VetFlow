-- VetFlow: óbito do paciente.
-- deceased_at = data do óbito (vazio = vivo). Marcado no cadastro do animal;
-- o pet fica cinza com uma cruz nas listas e sai dos lembretes de vacina e
-- acompanhamento. Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.

alter table public.animals add column if not exists deceased_at date;

comment on column public.animals.deceased_at is
  'Data do óbito do paciente (nulo = vivo).';

notify pgrst, 'reload schema';
