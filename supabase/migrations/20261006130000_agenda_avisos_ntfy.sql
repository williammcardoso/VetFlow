-- VetFlow: segundo canal de aviso da agenda — ntfy (notificação no celular,
-- grátis, chega na hora). Manda pelos canais ligados ao mesmo tempo:
-- WhatsApp (CallMeBot) e ntfy.
-- PRÉ-REQUISITO: 20261005120000 e 20261006120000. Pode rodar mais de uma vez.

-- ---------------------------------------------------------------------------
-- 1) Configuração dos canais
-- ---------------------------------------------------------------------------
alter table public.agenda_notify_config alter column phone drop not null;
alter table public.agenda_notify_config alter column apikey drop not null;
alter table public.agenda_notify_config add column if not exists callmebot_enabled boolean not null default true;
alter table public.agenda_notify_config add column if not exists ntfy_enabled boolean not null default true;
alter table public.agenda_notify_config add column if not exists ntfy_server text not null default 'https://ntfy.sh';
-- Nome do "canal" no ntfy: funciona como senha (quem souber o nome lê os avisos).
alter table public.agenda_notify_config add column if not exists ntfy_topic text;

alter table public.agenda_notify_log add column if not exists channel text;

-- ---------------------------------------------------------------------------
-- 2) Envio para todos os canais ligados (um registro no log por canal)
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
begin
  select * into cfg from public.agenda_notify_config where id = 'default' and enabled;
  if not found then
    return;
  end if;

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

  -- ntfy: 1ª linha vira o título (sem emoji e sem *negrito*), o resto o corpo
  if cfg.ntfy_enabled and coalesce(cfg.ntfy_topic, '') <> '' then
    begin
      v_lines := string_to_array(replace(p_msg, '*', ''), E'\n');
      v_title := trim(regexp_replace(v_lines[1], '^[^[:alnum:]]+', ''));
      v_body := array_to_string(v_lines[2:array_length(v_lines, 1)], E'\n');
      v_tag := case p_event
                 when 'novo' then 'date'
                 when 'alterado' then 'pencil2'
                 when 'cancelado' then 'x'
                 when 'reativado' then 'recycle'
                 when 'excluido' then 'wastebasket'
                 else 'white_check_mark'
               end;
      select net.http_post(
               url := rtrim(cfg.ntfy_server, '/'),
               body := jsonb_build_object(
                 'topic', cfg.ntfy_topic,
                 'title', v_title,
                 'message', coalesce(nullif(v_body, ''), v_title),
                 'tags', jsonb_build_array(v_tag),
                 'priority', 4
               ),
               headers := '{"Content-Type": "application/json"}'::jsonb
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
-- 3) Gatilho da agenda: mesmo texto de antes, agora pelos canais ligados
-- ---------------------------------------------------------------------------
create or replace function public.agenda_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.schedules%rowtype;
  v_event text;
  v_who text;
  v_msg text;
  v_obs text;
begin
  if not exists (select 1 from public.agenda_notify_config where id = 'default' and enabled) then
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

    perform public.agenda_notify_send(v_event, v_msg, r.id);
  exception when others then
    -- O aviso nunca pode impedir o agendamento.
    insert into public.agenda_notify_log (event, schedule_id, message, error)
    values (coalesce(v_event, lower(tg_op)), coalesce(r.id, new.id, old.id), coalesce(v_msg, ''), sqlerrm);
  end;
  return null;
end
$$;

-- ---------------------------------------------------------------------------
-- 4) Teste: select public.agenda_notify_test();
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
  if cfg.ntfy_enabled and coalesce(cfg.ntfy_topic, '') <> '' then
    v_canais := array_append(v_canais, 'ntfy (canal ' || cfg.ntfy_topic || ')');
  end if;
  if cardinality(v_canais) = 0 then
    return 'Nenhum canal ligado: cadastre o WhatsApp (phone/apikey) ou o ntfy (ntfy_topic).';
  end if;
  perform public.agenda_notify_send('teste', v_msg, null);
  return 'Teste enviado para: ' || array_to_string(v_canais, ' e ') || '.';
end
$$;

revoke execute on function public.agenda_notify_test() from public, anon, authenticated;

notify pgrst, 'reload schema';
