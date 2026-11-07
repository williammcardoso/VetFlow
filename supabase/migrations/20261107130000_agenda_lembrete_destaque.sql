-- VetFlow: o aviso do LEMBRETE (X min antes) agora é bem diferente dos avisos de
-- agendamento novo/alterado:
--   * título em maiúsculas: "LEMBRETE · IR NA CASA em 15 min" / "LEMBRETE · CLIENTE NA LOJA em 15 min";
--   * corpo na ordem de quem importa: quem, Hoje/Amanhã às HH:MM, o que vai ser feito, observação;
--   * Pushover com PRIORIDADE ALTA (fica em destaque e passa pelo "não perturbe" do app).
-- PRÉ-REQUISITO: 20261107120000. Pode rodar mais de uma vez.
--
-- Ajustes (opcionais):
--   -- prioridade normal (sem furar o "não perturbe"): 0 | alta: 1
--   update public.agenda_notify_config set pushover_priority_lembrete = 0 where id = 'default';
--   -- som:
--   update public.agenda_notify_config set pushover_sound_lembrete = 'siren' where id = 'default';

alter table public.agenda_notify_config add column if not exists pushover_priority_lembrete int not null default 1;

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
                 'priority', case when p_event = 'lembrete' then coalesce(cfg.pushover_priority_lembrete, 1) else 0 end
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
                 then '🏠 *LEMBRETE · IR NA CASA em ' || v_faltam || ' min*'
                 else '🏪 *LEMBRETE · CLIENTE NA LOJA em ' || v_faltam || ' min*'
               end
               || E'\n👤 ' || coalesce(nullif(r.client_name, ''), 'Sem nome')
               || E'\n🕘 ' || case when r.date = v_now::date then 'Hoje' else 'Amanhã' end
                            || ' às ' || split_part(public.agenda_fmt_when(r.date, r.time, r.duration_minutes), ' · ', 2)
               || E'\n💉 ' || coalesce(nullif(r.title, ''), 'Sem descrição')
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

notify pgrst, 'reload schema';
