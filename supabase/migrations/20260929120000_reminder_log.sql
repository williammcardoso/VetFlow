-- Lembretes de vacina/acompanhamento enviados pelo WhatsApp (tela
-- Previsão de Acompanhamentos e Vacinas). Guarda quem já foi avisado, para
-- aparecer "Lembrete enviado em dd/mm" em qualquer computador/celular e não
-- avisar o mesmo tutor duas vezes sem querer.

create table if not exists public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  -- "vacina:<animal>:<atendimento>:<data prevista>" ou "retorno:..."
  reminder_key text not null,
  kind text not null check (kind in ('vacina', 'retorno')),
  animal_id text,
  client_id text,
  due_date date,
  channel text not null default 'whatsapp',
  sent_by text,
  sent_at timestamptz not null default now()
);

create index if not exists idx_reminder_log_key
  on public.reminder_log (reminder_key);

comment on table public.reminder_log is
  'Lembretes de vacina/acompanhamento já enviados ao tutor (WhatsApp).';

alter table public.reminder_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reminder_log' and policyname = 'reminder_log_allow_all'
  ) then
    create policy reminder_log_allow_all
      on public.reminder_log for all
      using (true) with check (true);
  end if;
end $$;
