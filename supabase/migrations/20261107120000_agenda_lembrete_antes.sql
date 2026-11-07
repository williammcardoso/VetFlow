-- VetFlow: LEMBRETE DE AGENDAMENTO pelo Pushover, alguns minutos ANTES do horário.
-- Por que: não esquecer de ir na casa do cliente (vacina domiciliar) nem de que
-- o cliente chega na loja para vacinar. Roda dentro do próprio banco (pg_cron,
-- uma vez por minuto), então funciona com todos os computadores desligados.
--
-- Chega pelos mesmos canais já ligados em agenda_notify_config (Pushover,
-- WhatsApp, ntfy), com som próprio no Pushover.
-- PRÉ-REQUISITO: 20261022160000. Pode rodar mais de uma vez.
--
-- Ajustes (opcionais), depois de rodar:
--   -- avisar 30 min antes em vez de 15:
--   update public.agenda_notify_config set lembrete_minutos = 30 where id = 'default';
--   -- desligar / ligar o lembrete:
--   update public.agenda_notify_config set lembrete_ativo = false where id = 'default';
--   -- trocar o som (https://pushover.net/api#sounds — ex.: bugle, siren, alien, tugboat):
--   update public.agenda_notify_config set pushover_sound_lembrete = 'siren' where id = 'default';
--
-- Conferir o que foi enviado:
--   select created_at, channel, message, error from public.agenda_notify_log where event = 'lembrete' order by id desc limit 20;

alter table public.agenda_notify_config add column if not exists lembrete_ativo boolean not null default true;
alter table public.agenda_notify_config add column if not exists lembrete_minutos int not null default 15;
alter table public.agenda_notify_config add column if not exists pushover_sound_lembrete text default 'bugle';

-- ---------------------------------------------------------------------------
-- Quais agendamentos já foram lembrados (um lembrete por agendamento e horário:
-- se o horário mudar, o novo horário é lembrado de novo)
-- ---------------------------------------------------------------------------
create table if not exists public.agenda_lembrete_enviado (
  schedule_id text not null,
  data date not null,
  hora text not null,
  enviado_em timestamptz not null default now(),
  primary key (schedule_id, data, hora)
);
alter table public.agenda_lembrete_enviado enable row level security;
revoke all on public.agenda_lembrete_enviado from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Envio para todos os canais ligados (agora com som e ícone do "lembrete")
-- ---------------------------------------------------------------------------
create or replace function public.agenda_notify_send(p_event text, p_msg text, p_schedule_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.agenda_notify_config%rowtype;
  v_req bigint;
  v_lines text[];
  v_title text;
  v_body text;
  v_tag text;
  v_headers jsonb;
begin
  select * into cfg from public.agenda_notify_config where id = 'default' and enabled;
  if not found then
    return;
  end if;

  -- 1ª linha vira o título (sem emoji e sem *negrito*), o resto o corpo
  v_lines := string_to_array(replace(p_msg, '*', ''), E'\n');
  v_title := trim(regexp_replace(v_lines[1], '^[^[:alnum:]]+', ''));
  v_body := coalesce(nullif(array_to_string(v_lines[2:array_length(v_lines, 1)], E'\n'), ''), v_title);

  -- WhatsApp (CallMeBot)
  if cfg.callmebot_enabled and coalesce(cfg.phone, '') <> '' and coalesce(cfg.apikey, '') <> '' then
    begin
      select net.http_get(
               url := 'https://api.callmebot.com/whatsapp.php',
               params := jsonb_build_object('phone', cfg.phone, 'text', p_msg, 'apikey', cfg.apikey)
             )
        into v_req;
      insert into public.agenda_notify_log (event, channel, schedule_id, message, request_id)
      values (p_event, 'whatsapp', p_schedule_id, p_msg, v_req);
    exception when others then
      insert into public.agenda_notify_log (event, channel, schedule_id, message, error)
      values (p_event, 'whatsapp', p_schedule_id, p_msg, sqlerrm);
    end;
  end if;

  -- Pushover
  if cfg.pushover_enabled and coalesce(trim(cfg.pushover_user), '') <> '' and coalesce(trim(cfg.pushover_token), '') <> '' then
    begin
      select net.http_post(
               url := 'https://api.pushover.net/1/messages.json',
               body := jsonb_build_object(
                 'token', trim(cfg.pushover_token),
                 'user', trim(cfg.pushover_user),
                 'title', v_title,
                 'message', v_body,
                 'priority', 0
               )
               -- Agendamento novo com som próprio; sem som definido = padrão do app.
               || case when p_event = 'novo' and coalesce(trim(cfg.pushover_sound_novo), '') <> ''
                       then jsonb_build_object('sound', trim(cfg.pushover_sound_novo))
                       when p_event = 'lembrete' and coalesce(trim(cfg.pushover_sound_lembrete), '') <> ''
                       then jsonb_build_object('sound', trim(cfg.pushover_sound_lembrete))
                       else '{}'::jsonb end,
               headers := '{"Content-Type": "application/json"}'::jsonb
             )
        into v_req;
      insert into public.agenda_notify_log (event, channel, schedule_id, message, request_id)
      values (p_event, 'pushover', p_schedule_id, p_msg, v_req);
    exception when others then
      insert into public.agenda_notify_log (event, channel, schedule_id, message, error)
      values (p_event, 'pushover', p_schedule_id, p_msg, sqlerrm);
    end;
  end if;

  -- ntfy
  if cfg.ntfy_enabled and coalesce(cfg.ntfy_topic, '') <> '' then
    begin
      v_tag := case p_event
                 when 'novo' then 'date'
                 when 'lembrete' then 'alarm_clock'
                 when 'alterado' then 'pencil2'
                 when 'cancelado' then 'x'
                 when 'reativado' then 'recycle'
                 when 'excluido' then 'wastebasket'
                 else 'white_check_mark'
               end;
      v_headers := jsonb_build_object('Content-Type', 'application/json');
      if coalesce(trim(cfg.ntfy_token), '') <> '' then
        v_headers := v_headers || jsonb_build_object('Authorization', 'Bearer ' || trim(cfg.ntfy_token));
      end if;
      select net.http_post(
               url := rtrim(cfg.ntfy_server, '/'),
               body := jsonb_build_object(
                 'topic', cfg.ntfy_topic,
                 'title', v_title,
                 'message', v_body,
                 'tags', jsonb_build_array(v_tag),
                 'priority', 4
               ),
               headers := v_headers
             )
        into v_req;
      insert into public.agenda_notify_log (event, channel, schedule_id, message, request_id)
      values (p_event, 'ntfy', p_schedule_id, p_msg, v_req);
    exception when others then
      insert into public.agenda_notify_log (event, channel, schedule_id, message, error)
      values (p_event, 'ntfy', p_schedule_id, p_msg, sqlerrm);
    end;
  end if;
end
$$;

revoke execute on function public.agenda_notify_send(text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Procura os agendamentos que começam nos próximos N minutos e avisa
-- ---------------------------------------------------------------------------
create or replace function public.agenda_lembrete_enviar()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.agenda_notify_config%rowtype;
  r public.schedules%rowtype;
  v_now timestamp := date_trunc('minute', now() at time zone 'America/Sao_Paulo');
  v_lead int;
  v_start int;
  v_when timestamp;
  v_faltam int;
  v_home boolean;
  v_obs text;
  v_msg text;
  v_sent integer := 0;
begin
  select * into cfg from public.agenda_notify_config where id = 'default' and enabled and lembrete_ativo;
  if not found then
    return 0;
  end if;
  v_lead := greatest(coalesce(cfg.lembrete_minutos, 15), 1);

  for r in
    select s.*
    from public.schedules s
    where s.date between v_now::date and (v_now + interval '1 day')::date
      and coalesce(s.status, 'scheduled') = 'scheduled'
      and coalesce(s.kind, '') <> 'bloqueio'
    order by s.date, s.time
  loop
    begin
      v_msg := null;
      v_start := public.agenda_minutes(r.time);
      continue when v_start is null;
      v_when := r.date::timestamp + make_interval(mins => v_start);
      continue when v_when <= v_now or v_when > v_now + make_interval(mins => v_lead);
      continue when exists (
        select 1 from public.agenda_lembrete_enviado e where e.schedule_id = r.id and e.data = r.date and e.hora = r.time
      );

      -- Marcado de última hora: o aviso de "Novo agendamento" acabou de chegar, não repete.
      if (r.created_at at time zone 'America/Sao_Paulo') >= v_when - make_interval(mins => v_lead) then
        insert into public.agenda_lembrete_enviado (schedule_id, data, hora) values (r.id, r.date, r.time) on conflict do nothing;
        continue;
      end if;

      v_faltam := greatest(round(extract(epoch from (v_when - v_now)) / 60)::int, 1);
      v_home := coalesce(r.kind_info ->> 'place', '') = 'domicilio';
      v_obs := nullif(trim(coalesce(r.kind_info ->> 'obs', '')), '');

      v_msg := case when v_home
                 then '🏠 *Em ' || v_faltam || ' min: ir na casa do cliente*'
                 else '⏰ *Em ' || v_faltam || ' min: cliente na loja*'
               end
               || E'\n🗓️ ' || public.agenda_fmt_when(r.date, r.time, r.duration_minutes)
               || E'\n' || coalesce(nullif(r.title, ''), 'Sem descrição')
               || E'\n👤 ' || coalesce(nullif(r.client_name, ''), 'Sem nome')
               || case when v_obs is not null then E'\n📝 ' || v_obs else '' end;

      perform public.agenda_notify_send('lembrete', v_msg, r.id);
      insert into public.agenda_lembrete_enviado (schedule_id, data, hora) values (r.id, r.date, r.time) on conflict do nothing;
      v_sent := v_sent + 1;
    exception when others then
      -- Um agendamento com problema não pode impedir o lembrete dos outros.
      insert into public.agenda_notify_log (event, schedule_id, message, error)
      values ('lembrete', r.id, coalesce(v_msg, ''), sqlerrm);
    end;
  end loop;

  -- Não precisa guardar o histórico de lembretes por muito tempo.
  delete from public.agenda_lembrete_enviado where data < (v_now::date - 7);
  return v_sent;
end
$$;

revoke execute on function public.agenda_lembrete_enviar() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Agenda a execução: todo minuto (pg_cron).
-- Se der erro aqui: Supabase › Database › Extensions › ligue "pg_cron" e rode este
-- arquivo de novo.
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'agenda-lembrete-antes';
  perform cron.schedule('agenda-lembrete-antes', '* * * * *', 'select public.agenda_lembrete_enviar()');
end
$$;

notify pgrst, 'reload schema';
