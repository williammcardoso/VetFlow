-- VetFlow: agenda com tipo de atendimento, duração e travas de horário.
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez sem problema.
--
-- 1) schedules ganha tipo (consulta/vacina/...), detalhes e duração — uma
--    consulta de 1h vira UM agendamento de 60 min, não duas linhas soltas.
-- 2) agenda_settings ganha a lista de vacinas do formulário (editável em
--    Configuração › Horários da agenda pública).
-- 3) schedule_holds: trava temporária do horário enquanto alguém preenche o
--    formulário. Some ao salvar, ao cancelar, ao fechar a aba ou depois de
--    10 minutos sem mexer.
-- 4) Funções agenda_hold / agenda_release / agenda_book: pegam a trava e
--    gravam o agendamento numa transação só, conferindo conflito no banco —
--    dois computadores nunca ficam com o mesmo horário.
-- 5) Liga o tempo real (Realtime) nas duas tabelas: a grade dos outros
--    computadores atualiza na hora.

-- ---------------------------------------------------------------------------
-- 1) Tipo, detalhes e duração
-- ---------------------------------------------------------------------------
alter table public.schedules add column if not exists kind text;
alter table public.schedules add column if not exists kind_info jsonb;
alter table public.schedules add column if not exists duration_minutes int;

comment on column public.schedules.kind is
  'Tipo do atendimento: consulta, vacina, medicacao, outro, bloqueio. Nulo = agendamento antigo (texto livre).';
comment on column public.schedules.kind_info is
  'Detalhes escolhidos no formulário (local, vacinas, medicação, observação).';
comment on column public.schedules.duration_minutes is
  'Duração em minutos. Nulo = 1 intervalo da agenda (agendamentos antigos).';

-- ---------------------------------------------------------------------------
-- 2) Lista de vacinas do formulário
-- ---------------------------------------------------------------------------
alter table public.agenda_settings add column if not exists vaccine_options jsonb;

insert into public.agenda_settings (id, interval_minutes) values ('default', 30)
  on conflict (id) do nothing;

update public.agenda_settings
   set vaccine_options = '["V10 importada","V12 nacional","Raiva importada","Raiva nacional","V4 felina","V5 felina"]'::jsonb
 where id = 'default' and vaccine_options is null;

-- ---------------------------------------------------------------------------
-- 3) Travas temporárias (uma linha por horário da grade)
-- ---------------------------------------------------------------------------
create table if not exists public.schedule_holds (
  date date not null,
  time text not null,
  session_id text not null,
  station text not null default '',
  kind text,
  expires_at timestamptz not null default now() + interval '10 minutes',
  created_at timestamptz not null default now(),
  primary key (date, time)
);

create index if not exists idx_schedule_holds_session on public.schedule_holds (session_id);

comment on table public.schedule_holds is
  'Horário segurado por um computador enquanto o agendamento é preenchido. Expira 10 min depois da última atividade.';

alter table public.schedule_holds enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'schedule_holds' and policyname = 'schedule_holds_allow_all'
  ) then
    create policy schedule_holds_allow_all on public.schedule_holds
      for all to anon, authenticated using (true) with check (true);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Funções
-- ---------------------------------------------------------------------------

-- "15:30" -> 930 (minutos do dia). Nulo se o texto não for um horário.
create or replace function public.agenda_minutes(t text)
returns int
language sql
immutable
as $$
  select case
    when t ~ '^[0-9]{1,2}:[0-9]{2}$'
      then split_part(t, ':', 1)::int * 60 + split_part(t, ':', 2)::int
  end
$$;

-- Conflitos dos horários pedidos: agendamento confirmado que encosta no
-- horário (respeitando a duração de cada um) ou trava de OUTRO computador.
create or replace function public.agenda_conflicts(
  p_session text,
  p_date date,
  p_times text[],
  p_ignore_schedule text default null
)
returns jsonb
language plpgsql
stable
as $$
declare
  v_interval int := coalesce((select interval_minutes from public.agenda_settings where id = 'default'), 30);
  v_result jsonb;
begin
  with req as (
    select t as cell, public.agenda_minutes(t) as m
      from unnest(p_times) as t
  ),
  booked as (
    select r.cell, 'booked'::text as type, coalesce(s.client_name, '') as who, s.time as at
      from req r
      join public.schedules s
        on s.date = p_date
       and coalesce(s.status, 'scheduled') <> 'cancelled'
       and (p_ignore_schedule is null or s.id <> p_ignore_schedule)
       and public.agenda_minutes(s.time) is not null
       and r.m is not null
       and public.agenda_minutes(s.time) < r.m + v_interval
       and public.agenda_minutes(s.time) + greatest(coalesce(s.duration_minutes, v_interval), 1) > r.m
  ),
  held as (
    select r.cell, 'held'::text as type, h.station as who, h.time as at
      from req r
      join public.schedule_holds h
        on h.date = p_date
       and h.time = r.cell
       and h.session_id <> coalesce(p_session, '')
       and h.expires_at > now()
  )
  select coalesce(
           jsonb_agg(jsonb_build_object('time', x.cell, 'type', x.type, 'who', x.who, 'at', x.at) order by x.cell),
           '[]'::jsonb
         )
    into v_result
    from (select * from booked union all select * from held) x;
  return v_result;
end
$$;

-- Segura os horários pedidos para este computador (troca os que ele já
-- segurava). Se algum estiver ocupado ou travado por outro, não muda nada e
-- devolve os conflitos. Chamar de novo com os mesmos horários renova os
-- 10 minutos. Lista vazia = soltar tudo.
create or replace function public.agenda_hold(
  p_session text,
  p_station text,
  p_date date,
  p_times text[],
  p_kind text default null,
  p_ignore_schedule text default null
)
returns jsonb
language plpgsql
as $$
declare
  v_conflicts jsonb;
  v_expires timestamptz := now() + interval '10 minutes';
begin
  if coalesce(p_session, '') = '' then
    raise exception 'agenda_hold: sessão vazia';
  end if;

  perform pg_advisory_xact_lock(hashtext('vetflow-agenda:' || p_date::text));
  delete from public.schedule_holds where expires_at <= now();

  if coalesce(array_length(p_times, 1), 0) = 0 then
    delete from public.schedule_holds where session_id = p_session;
    return jsonb_build_object('ok', true, 'expires_at', null);
  end if;

  v_conflicts := public.agenda_conflicts(p_session, p_date, p_times, p_ignore_schedule);
  if jsonb_array_length(v_conflicts) > 0 then
    return jsonb_build_object('ok', false, 'conflicts', v_conflicts);
  end if;

  delete from public.schedule_holds
   where session_id = p_session
     and not (date = p_date and time = any (p_times));

  insert into public.schedule_holds (date, time, session_id, station, kind, expires_at)
  select p_date, t, p_session, coalesce(p_station, ''), p_kind, v_expires
    from unnest(p_times) as t
  on conflict (date, time) do update
    set session_id = excluded.session_id,
        station = excluded.station,
        kind = excluded.kind,
        expires_at = excluded.expires_at;

  return jsonb_build_object('ok', true, 'expires_at', v_expires);
end
$$;

-- Solta as travas deste computador (salvou, cancelou ou fechou a aba).
create or replace function public.agenda_release(p_session text)
returns void
language sql
as $$
  delete from public.schedule_holds where session_id = p_session;
$$;

-- Grava (ou altera) o agendamento conferindo conflito na mesma transação e
-- solta as travas deste computador. Nada é gravado se houver conflito.
create or replace function public.agenda_book(p_session text, p_booking jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_interval int := coalesce((select interval_minutes from public.agenda_settings where id = 'default'), 30);
  v_id text := nullif(p_booking ->> 'id', '');
  v_date date := (p_booking ->> 'date')::date;
  v_time text := p_booking ->> 'time';
  v_start int := public.agenda_minutes(p_booking ->> 'time');
  v_duration int;
  v_cells text[];
  v_conflicts jsonb;
begin
  if v_id is null or v_date is null or v_start is null then
    raise exception 'agenda_book: agendamento inválido';
  end if;
  v_duration := greatest(coalesce((p_booking ->> 'duration_minutes')::int, v_interval), 1);

  perform pg_advisory_xact_lock(hashtext('vetflow-agenda:' || v_date::text));
  delete from public.schedule_holds where expires_at <= now();

  select array_agg(lpad((m / 60)::text, 2, '0') || ':' || lpad((m % 60)::text, 2, '0') order by m)
    into v_cells
    from generate_series(v_start, v_start + v_duration - 1, v_interval) as m;

  v_conflicts := public.agenda_conflicts(p_session, v_date, v_cells, v_id);
  if jsonb_array_length(v_conflicts) > 0 then
    return jsonb_build_object('ok', false, 'conflicts', v_conflicts);
  end if;

  if exists (select 1 from public.schedules where id = v_id) then
    update public.schedules
       set date = v_date,
           time = v_time,
           title = coalesce(p_booking ->> 'title', title),
           client_name = coalesce(p_booking ->> 'client_name', client_name),
           kind = p_booking ->> 'kind',
           kind_info = p_booking -> 'kind_info',
           duration_minutes = v_duration,
           updated_at = now()
     where id = v_id;
  else
    insert into public.schedules
      (id, date, time, title, client_id, client_name, animal_id, animal_name, notes, status,
       kind, kind_info, duration_minutes, created_at, updated_at)
    values
      (v_id, v_date, v_time, coalesce(p_booking ->> 'title', ''), null, p_booking ->> 'client_name', null, null,
       p_booking ->> 'notes', 'scheduled', p_booking ->> 'kind', p_booking -> 'kind_info', v_duration, now(), now());
  end if;

  delete from public.schedule_holds where session_id = coalesce(p_session, '');
  return jsonb_build_object('ok', true, 'id', v_id);
end
$$;

grant execute on function public.agenda_minutes(text) to anon, authenticated;
grant execute on function public.agenda_conflicts(text, date, text[], text) to anon, authenticated;
grant execute on function public.agenda_hold(text, text, date, text[], text, text) to anon, authenticated;
grant execute on function public.agenda_release(text) to anon, authenticated;
grant execute on function public.agenda_book(text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Tempo real (se falhar, a grade continua atualizando a cada 10 s)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'schedules'
  ) then
    alter publication supabase_realtime add table public.schedules;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'schedule_holds'
  ) then
    alter publication supabase_realtime add table public.schedule_holds;
  end if;
exception when others then
  raise notice 'Realtime não foi ligado (%). A agenda segue atualizando a cada 10 s.', sqlerrm;
end $$;

notify pgrst, 'reload schema';
