-- VetFlow: avisos da agenda pelo Pushover (app de notificações no iPhone).
-- Por que: o ntfy.sh grátis conta a cota diária pelo IP de saída, e o
-- Supabase sai por IP compartilhado com outros projetos ("basis": "ip",
-- 250 mensagens/dia já gastas por terceiros → 429). No Pushover o limite é da
-- conta (10.000/mês).
-- PRÉ-REQUISITO: 20261006130000 (e 20261022120000, se rodado). Pode rodar mais de uma vez.
--
-- Depois de rodar, cadastre as chaves (sem colar em lugar nenhum além daqui):
--   update public.agenda_notify_config
--   set pushover_user = 'SUA_USER_KEY', pushover_token = 'SEU_API_TOKEN', ntfy_enabled = false
--   where id = 'default';

alter table public.agenda_notify_config add column if not exists ntfy_token text;
alter table public.agenda_notify_config add column if not exists pushover_enabled boolean not null default true;
-- User Key (aparece no topo de pushover.net depois de entrar na conta).
alter table public.agenda_notify_config add column if not exists pushover_user text;
-- API Token do "aplicativo" VetFlow criado em pushover.net/apps/build.
alter table public.agenda_notify_config add column if not exists pushover_token text;

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
               ),
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

-- ---------------------------------------------------------------------------
-- Teste: select public.agenda_notify_test();
-- ---------------------------------------------------------------------------
create or replace function public.agenda_notify_test()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.agenda_notify_config%rowtype;
  v_msg text := '✅ *VetFlow*' || E'\n' || 'Avisos da agenda ligados. A partir de agora você recebe aqui cada agendamento novo, alteração e cancelamento.';
  v_canais text[] := '{}';
begin
  select * into cfg from public.agenda_notify_config where id = 'default';
  if not found then
    return 'Falta cadastrar a configuração em agenda_notify_config.';
  end if;
  if not cfg.enabled then
    return 'Os avisos estão pausados (enabled = false).';
  end if;
  if cfg.callmebot_enabled and coalesce(cfg.phone, '') <> '' and coalesce(cfg.apikey, '') <> '' then
    v_canais := array_append(v_canais, 'WhatsApp');
  end if;
  if cfg.pushover_enabled and coalesce(trim(cfg.pushover_user), '') <> '' and coalesce(trim(cfg.pushover_token), '') <> '' then
    v_canais := array_append(v_canais, 'Pushover');
  end if;
  if cfg.ntfy_enabled and coalesce(cfg.ntfy_topic, '') <> '' then
    v_canais := array_append(v_canais, 'ntfy (canal ' || cfg.ntfy_topic || ')');
  end if;
  if cardinality(v_canais) = 0 then
    return 'Nenhum canal ligado: cadastre o Pushover (pushover_user/pushover_token), o ntfy (ntfy_topic) ou o WhatsApp (phone/apikey).';
  end if;
  perform public.agenda_notify_send('teste', v_msg, null);
  return 'Teste enviado para: ' || array_to_string(v_canais, ', ') || '.';
end
$$;

revoke execute on function public.agenda_notify_test() from public, anon, authenticated;

notify pgrst, 'reload schema';
