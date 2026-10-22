-- VetFlow: som diferente no Pushover para AGENDAMENTO NOVO (os outros avisos
-- ficam com o som padrão do app). Pode rodar mais de uma vez.
-- PRÉ-REQUISITO: 20261022130000.
--
-- Trocar o som (nomes em https://pushover.net/api#sounds — ex.: cashregister,
-- magic, bugle, cosmic, incoming, tugboat, spacealarm, pianobar):
--   update public.agenda_notify_config set pushover_sound_novo = 'magic' where id = 'default';
-- Voltar ao som padrão: ... set pushover_sound_novo = null ...

alter table public.agenda_notify_config add column if not exists pushover_sound_novo text default 'cashregister';

-- ---------------------------------------------------------------------------
-- Envio para todos os canais ligados (um registro no log por canal)
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

notify pgrst, 'reload schema';
