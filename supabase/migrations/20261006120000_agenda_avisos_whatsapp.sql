-- VetFlow: aviso por WhatsApp (CallMeBot) a cada mudança na agenda.
-- PRÉ-REQUISITO: rodar antes 20261005120000_agenda_tipos_travas.sql.
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.
--
-- Avisa: agendamento novo, alterado (data, horário, duração, tipo, nome),
-- cancelado, reativado e excluído — de qualquer lugar (balcão, celular,
-- agenda interna). Cada aviso fica registrado em agenda_notify_log.
-- O envio sai do banco (pg_net), então a chave do CallMeBot nunca vai para a
-- página pública.

-- ---------------------------------------------------------------------------
-- 0) Extensão que faz chamadas HTTP de dentro do banco
-- ---------------------------------------------------------------------------
do $$
begin
  create extension if not exists pg_net with schema extensions;
exception when others then
  raise notice 'pg_net não foi instalado (%). Ative em Database › Extensions › pg_net.', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- 1) Configuração: número e chave do CallMeBot. Fechada — ninguém lê pela
--    internet (sem policy), só as funções do próprio banco.
-- ---------------------------------------------------------------------------
create table if not exists public.agenda_notify_config (
  id text primary key default 'default',
  phone text not null,
  apikey text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.agenda_notify_config enable row level security;
revoke all on public.agenda_notify_config from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Registro de cada aviso enviado (ou que falhou)
-- ---------------------------------------------------------------------------
create table if not exists public.agenda_notify_log (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  event text not null,
  schedule_id text,
  message text not null,
  request_id bigint,
  error text
);
create index if not exists idx_agenda_notify_log_created on public.agenda_notify_log (created_at desc);
alter table public.agenda_notify_log enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'agenda_notify_log' and policyname = 'agenda_notify_log_read'
  ) then
    create policy agenda_notify_log_read on public.agenda_notify_log for select to anon, authenticated using (true);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Quem mexeu: a página pública manda "Balcão 1@<data-hora>" a cada
--    gravação/cancelamento. Valor repetido de uma gravação anterior não
--    conta (vira nulo = "Agenda interna").
-- ---------------------------------------------------------------------------
alter table public.schedules add column if not exists changed_by text;

create or replace function public.agenda_changed_by_oneshot()
returns trigger
language plpgsql
as $$
begin
  if new.changed_by is not distinct from old.changed_by then
    new.changed_by := null;
  end if;
  return new;
end
$$;

drop trigger if exists schedules_changed_by_oneshot on public.schedules;
create trigger schedules_changed_by_oneshot
  before update on public.schedules
  for each row execute function public.agenda_changed_by_oneshot();

-- agenda_book passa a gravar quem mexeu (mesma função da migration anterior + changed_by).
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
           changed_by = p_booking ->> 'changed_by',
           updated_at = now()
     where id = v_id;
  else
    insert into public.schedules
      (id, date, time, title, client_id, client_name, animal_id, animal_name, notes, status,
       kind, kind_info, duration_minutes, changed_by, created_at, updated_at)
    values
      (v_id, v_date, v_time, coalesce(p_booking ->> 'title', ''), null, p_booking ->> 'client_name', null, null,
       p_booking ->> 'notes', 'scheduled', p_booking ->> 'kind', p_booking -> 'kind_info', v_duration,
       p_booking ->> 'changed_by', now(), now());
  end if;

  delete from public.schedule_holds where session_id = coalesce(p_session, '');
  return jsonb_build_object('ok', true, 'id', v_id);
end
$$;

-- ---------------------------------------------------------------------------
-- 4) Texto do aviso
-- ---------------------------------------------------------------------------

-- "Ter 06/10 · 15:00–16:00" (só "15:00" quando é meia hora ou não tem duração)
create or replace function public.agenda_fmt_when(p_date date, p_time text, p_duration int)
returns text
language sql
stable
as $$
  select (array['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'])[extract(dow from p_date)::int + 1]
         || ' ' || to_char(p_date, 'DD/MM') || ' · ' || coalesce(p_time, '')
         || case
              when coalesce(p_duration, 0) > 30 and public.agenda_minutes(p_time) is not null then
                '–' || lpad(((public.agenda_minutes(p_time) + p_duration) / 60)::text, 2, '0')
                    || ':' || lpad(((public.agenda_minutes(p_time) + p_duration) % 60)::text, 2, '0')
              else ''
            end
$$;

create or replace function public.agenda_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.agenda_notify_config%rowtype;
  r public.schedules%rowtype;
  v_event text;
  v_who text;
  v_msg text;
  v_req bigint;
  v_obs text;
begin
  select * into cfg from public.agenda_notify_config where id = 'default' and enabled;
  if not found then
    return null;
  end if;

  begin
    if tg_op = 'INSERT' then
      if coalesce(new.status, 'scheduled') = 'cancelled' then
        return null;
      end if;
      r := new;
      v_event := 'novo';
      v_who := coalesce(
        nullif(split_part(coalesce(new.changed_by, ''), '@', 1), ''),
        substring(coalesce(new.notes, '') from '— computador: (.+?)\.?$'),
        'Agenda interna'
      );
    elsif tg_op = 'DELETE' then
      r := old;
      v_event := 'excluido';
      v_who := 'Agenda interna';
    else
      r := new;
      v_who := coalesce(nullif(split_part(coalesce(new.changed_by, ''), '@', 1), ''), 'Agenda interna');
      if coalesce(new.status, 'scheduled') = 'cancelled' and coalesce(old.status, 'scheduled') <> 'cancelled' then
        v_event := 'cancelado';
      elsif coalesce(old.status, 'scheduled') = 'cancelled' and coalesce(new.status, 'scheduled') <> 'cancelled' then
        v_event := 'reativado';
      elsif (new.date, new.time, new.title, new.client_name, new.duration_minutes, new.kind)
            is distinct from (old.date, old.time, old.title, old.client_name, old.duration_minutes, old.kind) then
        v_event := 'alterado';
      else
        -- só status (atendido, não atendido...) ou observação interna: sem aviso
        return null;
      end if;
    end if;

    v_obs := nullif(trim(coalesce(r.kind_info ->> 'obs', '')), '');
    v_msg := case v_event
               when 'novo' then '📅 *Novo agendamento*'
               when 'alterado' then '✏️ *Agendamento alterado*'
               when 'cancelado' then '❌ *Agendamento cancelado*'
               when 'reativado' then '♻️ *Agendamento reativado*'
               else '🗑️ *Agendamento excluído*'
             end
             || E'\n' || coalesce(nullif(r.title, ''), 'Sem descrição')
             || case when v_event = 'alterado' and new.title is distinct from old.title
                     then ' (antes: ' || coalesce(nullif(old.title, ''), '—') || ')' else '' end
             || E'\n👤 ' || coalesce(nullif(r.client_name, ''), 'Sem nome')
             || case when v_event = 'alterado' and new.client_name is distinct from old.client_name
                     then ' (antes: ' || coalesce(nullif(old.client_name, ''), '—') || ')' else '' end
             || E'\n🗓️ ' || public.agenda_fmt_when(r.date, r.time, r.duration_minutes)
             || case when v_event = 'alterado'
                       and (new.date, new.time, new.duration_minutes) is distinct from (old.date, old.time, old.duration_minutes)
                     then E'\n↩️ antes: ' || public.agenda_fmt_when(old.date, old.time, old.duration_minutes) else '' end
             || case when v_obs is not null then E'\n📝 ' || v_obs else '' end
             || E'\n💻 ' || v_who;

    select net.http_get(
             url := 'https://api.callmebot.com/whatsapp.php',
             params := jsonb_build_object('phone', cfg.phone, 'text', v_msg, 'apikey', cfg.apikey)
           )
      into v_req;

    insert into public.agenda_notify_log (event, schedule_id, message, request_id)
    values (v_event, r.id, v_msg, v_req);
  exception when others then
    -- O aviso nunca pode impedir o agendamento: registra o erro e segue.
    insert into public.agenda_notify_log (event, schedule_id, message, error)
    values (coalesce(v_event, lower(tg_op)), coalesce(r.id, new.id, old.id), coalesce(v_msg, ''), sqlerrm);
  end;
  return null;
end
$$;

drop trigger if exists schedules_notify on public.schedules;
create trigger schedules_notify
  after insert or update or delete on public.schedules
  for each row execute function public.agenda_notify();

-- Mensagem de teste: select public.agenda_notify_test();
create or replace function public.agenda_notify_test()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.agenda_notify_config%rowtype;
  v_req bigint;
  v_msg text := '✅ *VetFlow*' || E'\n' || 'Avisos da agenda ligados. A partir de agora você recebe aqui cada agendamento novo, alteração e cancelamento.';
begin
  select * into cfg from public.agenda_notify_config where id = 'default';
  if not found then
    return 'Falta cadastrar o número e a chave em agenda_notify_config.';
  end if;
  select net.http_get(
           url := 'https://api.callmebot.com/whatsapp.php',
           params := jsonb_build_object('phone', cfg.phone, 'text', v_msg, 'apikey', cfg.apikey)
         )
    into v_req;
  insert into public.agenda_notify_log (event, message, request_id) values ('teste', v_msg, v_req);
  return 'Mensagem de teste enviada (pedido ' || v_req || '). Confira o WhatsApp em alguns segundos.';
end
$$;

revoke execute on function public.agenda_notify_test() from public, anon, authenticated;

notify pgrst, 'reload schema';
