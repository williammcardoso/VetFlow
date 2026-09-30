-- Envios ao tutor pelo WhatsApp (laudo de exame, receita, orçamento,
-- documento). Alimenta o contador "Enviado 2× · último 30/09 15:40" que
-- aparece embaixo de cada item no prontuário e na tela de orçamentos.

create table if not exists public.send_log (
  id uuid primary key default gen_random_uuid(),
  -- "exam:<id>", "prescription:<id>", "budget:<id>", "document:<id>"
  item_key text not null,
  item_type text,
  animal_id text,
  channel text not null default 'whatsapp',
  sent_by text,
  sent_at timestamptz not null default now()
);

create index if not exists idx_send_log_item_key on public.send_log (item_key);

comment on table public.send_log is
  'Envios de documentos ao tutor (WhatsApp) — contador de envios por item.';

alter table public.send_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'send_log' and policyname = 'send_log_allow_all'
  ) then
    create policy send_log_allow_all
      on public.send_log for all
      using (true) with check (true);
  end if;
end $$;
