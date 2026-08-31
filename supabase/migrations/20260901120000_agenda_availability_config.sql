-- Horários da Agenda pública (agendar-horario) parametrizáveis pelo usuário.
-- Até aqui, os horários abertos, o almoço e o intervalo mínimo entre
-- agendamentos (MIN_GAP_MINUTES) eram fixos direto no código de
-- BookSchedulePage.tsx — toda mudança (liberar mais horário, mudar o
-- intervalo) precisava de deploy. Passa a ficar nessas 3 tabelas, editáveis
-- numa tela de admin (Configuração > Horários da agenda pública).

-- Horário-padrão: uma linha por dia da semana (0=domingo..6=sábado).
create table if not exists public.agenda_weekly_hours (
  weekday smallint primary key check (weekday between 0 and 6),
  is_open boolean not null default true,
  blocks jsonb not null default '[]'::jsonb, -- [{"start":"08:00","end":"13:00"}, ...]
  updated_at timestamptz not null default now()
);

comment on table public.agenda_weekly_hours is
  'Horário-padrão da semana da Agenda pública — 7 linhas fixas (uma por dia, 0=domingo). blocks = intervalos abertos daquele dia.';

-- Exceções pontuais: fecha um dia normalmente aberto (feriado, imprevisto)
-- ou abre com horário diferente do padrão (ex.: sábado à tarde só naquele dia).
create table if not exists public.agenda_exceptions (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  is_closed boolean not null default true,
  blocks jsonb, -- só relevante quando is_closed = false: horário diferente do padrão nesse dia
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agenda_exceptions_date on public.agenda_exceptions (date);

comment on table public.agenda_exceptions is
  'Exceções pontuais ao horário-padrão da semana da Agenda pública (fechar um dia específico ou abrir com horário diferente do padrão).';

-- Configuração geral — hoje só o intervalo mínimo entre horários (era
-- MIN_GAP_MINUTES = 60 fixo no código; usado tanto como passo da grade de
-- horários quanto como distância mínima avisada entre dois agendamentos).
create table if not exists public.agenda_settings (
  id text primary key default 'default',
  interval_minutes int not null default 60,
  updated_at timestamptz not null default now()
);

comment on table public.agenda_settings is
  'Configuração geral da Agenda pública. Linha única (id=default). interval_minutes = passo da grade de horários e distância mínima avisada entre agendamentos.';

-- Popula com o horário atual (o mesmo que já estava fixo no código), pra não
-- ficar "tudo fechado" assim que a migration rodar — seg-sex 8h-18h com
-- almoço 13h-15h, sábado 8h-12h, domingo fechado, intervalo de 60min.
insert into public.agenda_settings (id, interval_minutes) values ('default', 60)
  on conflict (id) do nothing;

insert into public.agenda_weekly_hours (weekday, is_open, blocks) values
  (0, false, '[]'::jsonb),
  (1, true, '[{"start":"08:00","end":"13:00"},{"start":"15:00","end":"18:00"}]'::jsonb),
  (2, true, '[{"start":"08:00","end":"13:00"},{"start":"15:00","end":"18:00"}]'::jsonb),
  (3, true, '[{"start":"08:00","end":"13:00"},{"start":"15:00","end":"18:00"}]'::jsonb),
  (4, true, '[{"start":"08:00","end":"13:00"},{"start":"15:00","end":"18:00"}]'::jsonb),
  (5, true, '[{"start":"08:00","end":"13:00"},{"start":"15:00","end":"18:00"}]'::jsonb),
  (6, true, '[{"start":"08:00","end":"12:00"}]'::jsonb)
  on conflict (weekday) do nothing;

alter table public.agenda_weekly_hours enable row level security;
alter table public.agenda_exceptions enable row level security;
alter table public.agenda_settings enable row level security;

-- Mesmo padrão "allow all" usado nas outras tabelas do sistema (ex.:
-- patient_weight_entries) — segurança real fica na RLS do que já protege
-- dado sensível (clientes, financeiro); horário de funcionamento não é dado
-- sensível e a página pública (anon) precisa ler as 3 tabelas.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'agenda_weekly_hours' and policyname = 'agenda_weekly_hours_allow_all'
  ) then
    create policy agenda_weekly_hours_allow_all
      on public.agenda_weekly_hours for all
      using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'agenda_exceptions' and policyname = 'agenda_exceptions_allow_all'
  ) then
    create policy agenda_exceptions_allow_all
      on public.agenda_exceptions for all
      using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'agenda_settings' and policyname = 'agenda_settings_allow_all'
  ) then
    create policy agenda_settings_allow_all
      on public.agenda_settings for all
      using (true) with check (true);
  end if;
end $$;
