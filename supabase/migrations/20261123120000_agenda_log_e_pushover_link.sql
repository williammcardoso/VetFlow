-- VetFlow: (1) LOG DETALHADO da agenda, (2) botão "Abrir na agenda" nos avisos
-- do Pushover e (3) LEMBRETE QUE INSISTE até você confirmar.
--
-- 1) Log: todo agendamento criado, alterado, cancelado, reativado, excluído ou
--    com a situação trocada (atendido, faltou...) vira uma linha em
--    public.agenda_log, com o antes e o depois completos e quem mexeu
--    (computador da agenda pública ou "Agenda interna"). Grava sempre, mesmo
--    com os avisos desligados, e não depende do Pushover.
--    Ninguém lê a tabela pela internet: a agenda pública só mostra o log pela
--    função agenda_log_listar, que confere usuário e senha do VetFlow aqui no
--    banco. O histórico dos avisos já enviados (desde 06/10) é copiado para o
--    log como "registro do aviso".
-- 2) Pushover: todo aviso ganha o botão "Abrir na agenda" (abre a agenda
--    pública já no dia do agendamento).
-- 3) Lembrete (X min antes): prioridade de EMERGÊNCIA — toca de novo a cada
--    1 min até você tocar em "Confirmar" no app (desiste sozinho depois de 1 h).
--    Nada de apagar aviso sozinho: o histórico no app continua como está.
--
-- PRÉ-REQUISITO: 20261107130000. Pode rodar mais de uma vez.
--
-- Ajustes (opcionais), depois de rodar:
--   -- repetir a cada 2 min e desistir depois de 30 min:
--   update public.agenda_notify_config set pushover_retry_lembrete = 120, pushover_expire_lembrete = 1800 where id = 'default';
--   -- voltar ao lembrete que toca uma vez só (prioridade alta):
--   update public.agenda_notify_config set pushover_priority_lembrete = 1 where id = 'default';
--   -- endereço do site (link do aviso), se um dia mudar:
--   update public.agenda_notify_config set site_url = 'https://vetflowapp.vercel.app' where id = 'default';
--
-- Conferir o log direto aqui:
--   select created_at, evento, quem, campos, coalesce(depois, antes) ->> 'client_name' as cliente
--   from public.agenda_log order by id desc limit 20;

-- ---------------------------------------------------------------------------
-- 1) Log da agenda
-- ---------------------------------------------------------------------------
create table if not exists public.agenda_log (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  -- novo | alterado | cancelado | reativado | excluido | situacao
  evento text not null,
  schedule_id text,
  -- Computador da agenda pública ("Balcão 1") ou "Agenda interna".
  quem text,
  -- Linha inteira do agendamento antes e depois (nulo onde não se aplica).
  antes jsonb,
  depois jsonb,
  -- Colunas que mudaram (só nas alterações).
  campos text[],
  -- Só nos registros antigos, copiados do texto dos avisos já enviados.
  mensagem text
);
create index if not exists idx_agenda_log_created on public.agenda_log (created_at desc);
create index if not exists idx_agenda_log_schedule on public.agenda_log (schedule_id);
alter table public.agenda_log enable row level security;
-- Sem policy: anon/authenticated não leem nem gravam direto.
revoke all on public.agenda_log from anon, authenticated;

create or replace function public.agenda_log_registrar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_campos text[];
  v_evento text;
  v_quem text;
  v_old_status text;
  v_new_status text;
begin
  begin
    if tg_op = 'INSERT' then
      v_new := to_jsonb(new);
      v_evento := 'novo';
      v_quem := coalesce(
        nullif(split_part(coalesce(new.changed_by, ''), '@', 1), ''),
        substring(coalesce(new.notes, '') from '— computador: (.+?)\.?$'),
        'Agenda interna'
      );
    elsif tg_op = 'DELETE' then
      v_old := to_jsonb(old);
      v_evento := 'excluido';
      v_quem := 'Agenda interna';
    else
      v_old := to_jsonb(old);
      v_new := to_jsonb(new);
      select array_agg(k order by k)
        into v_campos
        from jsonb_object_keys(v_new) as k
       where k not in ('updated_at', 'changed_by', 'created_at')
         and (v_new -> k) is distinct from (v_old -> k);
      if v_campos is null then
        return null; -- só carimbo de data/quem mexeu: nada a registrar
      end if;
      v_old_status := coalesce(old.status, 'scheduled');
      v_new_status := coalesce(new.status, 'scheduled');
      v_evento := case
                    when v_new_status = 'cancelled' and v_old_status <> 'cancelled' then 'cancelado'
                    when v_old_status = 'cancelled' and v_new_status <> 'cancelled' then 'reativado'
                    when v_campos = array['status'] then 'situacao'
                    else 'alterado'
                  end;
      v_quem := coalesce(nullif(split_part(coalesce(new.changed_by, ''), '@', 1), ''), 'Agenda interna');
    end if;

    insert into public.agenda_log (evento, schedule_id, quem, antes, depois, campos)
    values (v_evento, coalesce(v_new ->> 'id', v_old ->> 'id'), v_quem, v_old, v_new, v_campos);
  exception when others then
    -- O log nunca pode impedir o agendamento.
    raise warning 'agenda_log: %', sqlerrm;
  end;
  return null;
end
$$;

drop trigger if exists schedules_log on public.schedules;
create trigger schedules_log
  after insert or update or delete on public.schedules
  for each row execute function public.agenda_log_registrar();

-- Histórico que já existe: o texto de cada aviso enviado desde 06/10 (um por
-- evento — o mesmo aviso sai por vários canais com o mesmo horário). Só na
-- primeira vez que este arquivo roda.
insert into public.agenda_log (created_at, evento, schedule_id, quem, mensagem)
select distinct on (l.schedule_id, l.event, l.message, l.created_at)
       l.created_at,
       l.event,
       l.schedule_id,
       substring(l.message from E'💻 ([^\\n]+)'),
       l.message
  from public.agenda_notify_log l
 where l.event in ('novo', 'alterado', 'cancelado', 'reativado', 'excluido')
   and coalesce(l.message, '') <> ''
   and not exists (select 1 from public.agenda_log x where x.mensagem is not null)
 order by l.schedule_id, l.event, l.message, l.created_at, l.id;

-- O histórico dos avisos também deixa de ser lido pela internet (o log agora
-- só abre com usuário e senha; nenhuma tela lia esta tabela).
drop policy if exists agenda_notify_log_read on public.agenda_notify_log;
revoke select on public.agenda_notify_log from anon, authenticated;

-- Leitura do log pela agenda pública: só com usuário e senha do VetFlow.
-- p_dias = últimos N dias (0 ou nulo = tudo).
create or replace function public.agenda_log_listar(
  p_usuario text,
  p_senha text,
  p_dias int default 30,
  p_limite int default 1000
)
returns table (
  log_id bigint,
  ocorrido_em timestamptz,
  evento text,
  agendamento_id text,
  quem text,
  antes jsonb,
  depois jsonb,
  campos text[],
  mensagem text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1
      from public.app_users u
     where lower(u.username) = lower(trim(coalesce(p_usuario, '')))
       and u.active
       and u.password_hash = crypt(coalesce(p_senha, ''), u.password_hash)
  ) then
    raise exception 'unauthorized';
  end if;

  return query
    select l.id, l.created_at, l.evento, l.schedule_id, l.quem, l.antes, l.depois, l.campos, l.mensagem
      from public.agenda_log l
     where coalesce(p_dias, 0) <= 0
        or l.created_at >= now() - make_interval(days => p_dias)
     order by l.created_at desc, l.id desc
     limit least(greatest(coalesce(p_limite, 1000), 1), 5000);
end
$$;

revoke all on function public.agenda_log_listar(text, text, int, int) from public;
grant execute on function public.agenda_log_listar(text, text, int, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2 e 3) Pushover: link para a agenda e lembrete que insiste
-- ---------------------------------------------------------------------------
alter table public.agenda_notify_config add column if not exists site_url text not null default 'https://vetflowapp.vercel.app';

-- Lembrete passa a insistir — só na primeira vez (depois vale o que você ajustar).
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'agenda_notify_config' and column_name = 'pushover_retry_lembrete'
  ) then
    -- Repete a cada X segundos (mínimo do Pushover: 30)...
    alter table public.agenda_notify_config add column pushover_retry_lembrete int not null default 60;
    -- ...até confirmar ou até X segundos (máximo do Pushover: 10800 = 3 h).
    alter table public.agenda_notify_config add column pushover_expire_lembrete int not null default 3600;
    update public.agenda_notify_config set pushover_priority_lembrete = 2 where pushover_priority_lembrete = 1;
  end if;
end $$;

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
  v_prio int;
  v_retry int;
  v_date date;
  v_url text;
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
      v_prio := least(greatest(case when p_event = 'lembrete' then coalesce(cfg.pushover_priority_lembrete, 1) else 0 end, -2), 2);
      v_retry := greatest(coalesce(cfg.pushover_retry_lembrete, 60), 30);

      -- "Abrir na agenda": agenda pública já no dia do agendamento (excluído
      -- não tem mais o dia → abre em hoje).
      if p_schedule_id is not null then
        select s.date into v_date from public.schedules s where s.id = p_schedule_id;
      end if;
      v_url := rtrim(coalesce(nullif(trim(cfg.site_url), ''), 'https://vetflowapp.vercel.app'), '/')
               || '/agendar-horario'
               || case when v_date is not null then '?data=' || to_char(v_date, 'YYYY-MM-DD') else '' end;

      select net.http_post(
               url := 'https://api.pushover.net/1/messages.json',
               body := jsonb_build_object(
                 'token', trim(cfg.pushover_token),
                 'user', trim(cfg.pushover_user),
                 'title', v_title,
                 'message', v_body,
                 'priority', v_prio,
                 'url', v_url,
                 'url_title', 'Abrir na agenda'
               )
               -- Emergência (2): o Pushover exige "retry" e "expire".
               || case when v_prio = 2
                       then jsonb_build_object(
                              'retry', v_retry,
                              'expire', least(greatest(coalesce(cfg.pushover_expire_lembrete, 3600), v_retry), 10800)
                            )
                       else '{}'::jsonb end
               -- Agendamento novo e lembrete com som próprio; sem som definido = padrão do app.
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

notify pgrst, 'reload schema';
