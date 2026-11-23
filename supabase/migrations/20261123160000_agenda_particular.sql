-- VetFlow: AGENDA PARTICULAR (página /agenda-particular).
-- Os lembretes pessoais (migration 20261123140000) ganham uma página própria,
-- que pede usuário e senha do VetFlow logo na entrada. Tudo passa por funções
-- que conferem a senha aqui no banco; as tabelas continuam fechadas.
--   * A agenda é de UMA pessoa: o primeiro usuário que entrar vira o dono, e
--     outro usuário do VetFlow não consegue abrir (erro "not_owner").
--   * Pasta própria no Pushover: os avisos particulares podem usar o token de
--     outro aplicativo ("Particulares", criado em pushover.net/apps/build); sem
--     ele, saem pela pasta VETFLOW mesmo.
--   * Escolha de aparelho: cada pasta pode ir só para um celular (ex.: VETFLOW
--     no do trabalho, PARTICULARES no pessoal). Vazio = todos os aparelhos.
--   * Lembrete "uma vez só" (a_cada_dias nulo): depois de enviado, fica pausado.
-- PRÉ-REQUISITO: 20261123140000. Pode rodar mais de uma vez.

-- ---------------------------------------------------------------------------
-- 1) Lembretes: uma vez só, detalhes; o texto vira o título do aviso
-- ---------------------------------------------------------------------------
alter table public.lembretes_pessoais alter column a_cada_dias drop not null;
alter table public.lembretes_pessoais drop constraint if exists lembretes_pessoais_a_cada_dias_check;
alter table public.lembretes_pessoais add constraint lembretes_pessoais_a_cada_dias_check
  check (a_cada_dias is null or a_cada_dias >= 1);
alter table public.lembretes_pessoais add column if not exists detalhes text;
alter table public.lembretes_pessoais drop column if exists titulo;

-- ---------------------------------------------------------------------------
-- 2) Configurações da agenda particular (fechada, como a dos avisos)
-- ---------------------------------------------------------------------------
create table if not exists public.agenda_particular_config (
  id text primary key default 'default',
  -- Usuário do VetFlow dono da agenda (preenchido na primeira entrada).
  dono text,
  -- Token do aplicativo "Particulares" no Pushover (a pasta própria).
  pushover_token text,
  -- Aparelhos que recebem os avisos particulares (nomes do Pushover, separados
  -- por vírgula). Vazio = todos.
  aparelhos text,
  hora_padrao time not null default '08:00',
  som_padrao text,
  updated_at timestamptz not null default now()
);
alter table public.agenda_particular_config enable row level security;
revoke all on public.agenda_particular_config from anon, authenticated;
insert into public.agenda_particular_config (id) values ('default') on conflict (id) do nothing;

-- Aparelhos da pasta VETFLOW (avisos e lembretes da agenda). Vazio = todos.
alter table public.agenda_notify_config add column if not exists pushover_device text;

-- ---------------------------------------------------------------------------
-- 3) Entrada: confere usuário/senha e se é o dono (o 1º a entrar vira o dono)
-- ---------------------------------------------------------------------------
create or replace function public.agenda_particular_entrar(p_usuario text, p_senha text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user text;
  v_dono text;
begin
  select u.username into v_user
    from public.app_users u
   where lower(u.username) = lower(trim(coalesce(p_usuario, '')))
     and u.active
     and u.password_hash = crypt(coalesce(p_senha, ''), u.password_hash)
   limit 1;
  if v_user is null then
    raise exception 'unauthorized';
  end if;

  insert into public.agenda_particular_config (id) values ('default') on conflict (id) do nothing;
  select c.dono into v_dono from public.agenda_particular_config c where c.id = 'default' for update;
  if v_dono is null then
    update public.agenda_particular_config set dono = v_user, updated_at = now() where id = 'default';
  elsif lower(v_dono) <> lower(v_user) then
    raise exception 'not_owner';
  end if;
  return v_user;
end
$$;
revoke execute on function public.agenda_particular_entrar(text, text) from public, anon, authenticated;

-- "qui 26/11 às 08:00" e "a cada 3 dias" (texto do aviso)
create or replace function public.agenda_particular_fmt(p_quando timestamptz)
returns text
language sql
stable
as $$
  select (array['dom','seg','ter','qua','qui','sex','sáb'])[extract(dow from (p_quando at time zone 'America/Sao_Paulo'))::int + 1]
         || ' ' || to_char(p_quando at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI')
$$;

create or replace function public.agenda_particular_regra(p_dias int)
returns text
language sql
immutable
as $$
  select case
           when p_dias is null then 'uma vez só'
           when p_dias = 1 then 'todo dia'
           when p_dias = 7 then 'toda semana'
           else 'a cada ' || p_dias || ' dias'
         end
$$;

-- ---------------------------------------------------------------------------
-- 4) Envio pelo Pushover (pasta PARTICULARES se houver token próprio)
-- ---------------------------------------------------------------------------
create or replace function public.agenda_particular_push(p_titulo text, p_msg text, p_prio int, p_som text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.agenda_notify_config%rowtype;
  pc public.agenda_particular_config%rowtype;
  v_token text;
  v_prio int;
  v_req bigint;
begin
  select * into cfg from public.agenda_notify_config where id = 'default';
  select * into pc from public.agenda_particular_config where id = 'default';
  v_token := coalesce(nullif(trim(pc.pushover_token), ''), nullif(trim(cfg.pushover_token), ''));
  if coalesce(trim(cfg.pushover_user), '') = '' or v_token is null then
    raise exception 'sem_pushover';
  end if;
  v_prio := least(greatest(coalesce(p_prio, 1), -2), 2);

  select net.http_post(
           url := 'https://api.pushover.net/1/messages.json',
           body := jsonb_build_object(
             'token', v_token,
             'user', trim(cfg.pushover_user),
             'title', left(p_titulo, 250),
             'message', left(coalesce(nullif(p_msg, ''), p_titulo), 1024),
             'priority', v_prio
           )
           -- Emergência (2): o Pushover exige "retry" e "expire".
           || case when v_prio = 2
                   then jsonb_build_object(
                          'retry', greatest(coalesce(cfg.pushover_retry_lembrete, 60), 30),
                          'expire', least(greatest(coalesce(cfg.pushover_expire_lembrete, 3600), 30), 10800)
                        )
                   else '{}'::jsonb end
           || case when coalesce(trim(p_som), '') <> '' then jsonb_build_object('sound', trim(p_som)) else '{}'::jsonb end
           || case when coalesce(trim(pc.aparelhos), '') <> '' then jsonb_build_object('device', trim(pc.aparelhos)) else '{}'::jsonb end,
           headers := '{"Content-Type": "application/json"}'::jsonb
         )
    into v_req;
  return v_req;
end
$$;
revoke execute on function public.agenda_particular_push(text, text, int, text) from public, anon, authenticated;

-- Envio automático (pg_cron "lembretes-pessoais", a cada 5 min — já agendado).
create or replace function public.lembretes_pessoais_enviar()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.agenda_notify_config%rowtype;
  r public.lembretes_pessoais%rowtype;
  v_proximo timestamptz;
  v_som_padrao text;
  v_req bigint;
  v_msg text;
  v_sent integer := 0;
begin
  select * into cfg from public.agenda_notify_config where id = 'default';
  if not found or coalesce(trim(cfg.pushover_user), '') = '' then
    return 0;
  end if;
  select nullif(trim(som_padrao), '') into v_som_padrao from public.agenda_particular_config where id = 'default';

  for r in
    select * from public.lembretes_pessoais
     where ativo and proximo_envio <= now()
     order by proximo_envio
     for update skip locked
  loop
    begin
      -- Próximo horário depois de agora, mantendo a hora certinha; uma vez só = nenhum.
      v_proximo := case when r.a_cada_dias is null then null
                        else r.proximo_envio + make_interval(
                               days => r.a_cada_dias * (floor(extract(epoch from (now() - r.proximo_envio)) / (r.a_cada_dias * 86400))::int + 1))
                   end;
      v_msg := coalesce(nullif(trim(r.detalhes), '') || E'\n\n', '')
               || case when v_proximo is null then '📌 Lembrete único (não repete)'
                       else '🔁 Próximo: ' || public.agenda_particular_fmt(v_proximo) || ' (' || public.agenda_particular_regra(r.a_cada_dias) || ')'
                  end;
      v_req := public.agenda_particular_push(r.texto, v_msg, r.prioridade, coalesce(nullif(trim(r.som), ''), v_som_padrao));

      update public.lembretes_pessoais
         set ultimo_envio = now(),
             proximo_envio = coalesce(v_proximo, proximo_envio),
             ativo = v_proximo is not null
       where id = r.id;
      insert into public.agenda_notify_log (event, channel, message, request_id)
      values ('pessoal', 'pushover', 'Lembrete pessoal ' || r.id, v_req);
      v_sent := v_sent + 1;
    exception when others then
      -- Um lembrete com problema não pode travar os outros (o texto nunca vai para o log).
      insert into public.agenda_notify_log (event, channel, message, error)
      values ('pessoal', 'pushover', 'Lembrete pessoal ' || r.id, sqlerrm);
    end;
  end loop;
  return v_sent;
end
$$;
revoke execute on function public.lembretes_pessoais_enviar() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Funções da página (todas pedem usuário e senha)
-- ---------------------------------------------------------------------------
create or replace function public.agenda_particular_dados(p_usuario text, p_senha text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user text;
  pc public.agenda_particular_config%rowtype;
  cfg public.agenda_notify_config%rowtype;
begin
  v_user := public.agenda_particular_entrar(p_usuario, p_senha);
  select * into pc from public.agenda_particular_config where id = 'default';
  select * into cfg from public.agenda_notify_config where id = 'default';
  return jsonb_build_object(
    'dono', v_user,
    'config', jsonb_build_object(
      -- O token nunca volta inteiro para a página: só os 4 últimos caracteres.
      'token_particular', case when coalesce(trim(pc.pushover_token), '') <> '' then right(trim(pc.pushover_token), 4) else null end,
      'pushover_ok', coalesce(trim(cfg.pushover_user), '') <> '' and coalesce(trim(cfg.pushover_token), '') <> '',
      'aparelhos_particular', nullif(trim(pc.aparelhos), ''),
      'aparelhos_vetflow', nullif(trim(cfg.pushover_device), ''),
      'hora_padrao', to_char(pc.hora_padrao, 'HH24:MI'),
      'som_padrao', nullif(trim(pc.som_padrao), '')
    ),
    'lembretes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', l.id,
               'texto', l.texto,
               'detalhes', l.detalhes,
               'a_cada_dias', l.a_cada_dias,
               'hora', to_char(l.hora, 'HH24:MI'),
               'proximo', to_char(l.proximo_envio at time zone 'America/Sao_Paulo', 'YYYY-MM-DD"T"HH24:MI'),
               'ultimo', to_char(l.ultimo_envio at time zone 'America/Sao_Paulo', 'YYYY-MM-DD"T"HH24:MI'),
               'ativo', l.ativo,
               'prioridade', l.prioridade,
               'som', l.som
             ) order by l.ativo desc, l.proximo_envio)
        from public.lembretes_pessoais l
    ), '[]'::jsonb)
  );
end
$$;

-- Criar (sem id) ou alterar (com id). "data" + "hora" = próximo aviso.
create or replace function public.agenda_particular_salvar(p_usuario text, p_senha text, p_lembrete jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint := nullif(p_lembrete ->> 'id', '')::bigint;
  v_texto text := trim(coalesce(p_lembrete ->> 'texto', ''));
  v_dias int := nullif(p_lembrete ->> 'a_cada_dias', '')::int;
  v_hora time := coalesce(nullif(p_lembrete ->> 'hora', '')::time, '08:00');
  v_data date := coalesce(nullif(p_lembrete ->> 'data', '')::date, (now() at time zone 'America/Sao_Paulo')::date);
  v_prio int := least(greatest(coalesce(nullif(p_lembrete ->> 'prioridade', '')::int, 1), -2), 2);
  v_som text := nullif(trim(coalesce(p_lembrete ->> 'som', '')), '');
  v_det text := nullif(trim(coalesce(p_lembrete ->> 'detalhes', '')), '');
  v_ativo boolean := coalesce((p_lembrete ->> 'ativo')::boolean, true);
begin
  perform public.agenda_particular_entrar(p_usuario, p_senha);
  if v_texto = '' then
    raise exception 'texto_vazio';
  end if;
  if v_dias is not null and v_dias < 1 then
    raise exception 'intervalo_invalido';
  end if;
  if v_id is null then
    insert into public.lembretes_pessoais (texto, detalhes, a_cada_dias, hora, proximo_envio, ativo, prioridade, som)
    values (v_texto, v_det, v_dias, v_hora, (v_data + v_hora) at time zone 'America/Sao_Paulo', v_ativo, v_prio, v_som)
    returning id into v_id;
  else
    update public.lembretes_pessoais
       set texto = v_texto, detalhes = v_det, a_cada_dias = v_dias, hora = v_hora,
           proximo_envio = (v_data + v_hora) at time zone 'America/Sao_Paulo',
           ativo = v_ativo, prioridade = v_prio, som = v_som
     where id = v_id;
    if not found then
      raise exception 'nao_encontrado';
    end if;
  end if;
  return v_id;
end
$$;

-- Pausar / reativar. Ao reativar um que repete, pula para o próximo horário
-- futuro da série (não dispara um aviso velho na hora).
create or replace function public.agenda_particular_ativar(p_usuario text, p_senha text, p_id bigint, p_ativo boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.agenda_particular_entrar(p_usuario, p_senha);
  update public.lembretes_pessoais l
     set ativo = p_ativo,
         proximo_envio = case
           when p_ativo and l.a_cada_dias is not null and l.proximo_envio <= now()
             then l.proximo_envio + make_interval(
                    days => l.a_cada_dias * (floor(extract(epoch from (now() - l.proximo_envio)) / (l.a_cada_dias * 86400))::int + 1))
           else l.proximo_envio
         end
   where l.id = p_id;
end
$$;

create or replace function public.agenda_particular_apagar(p_usuario text, p_senha text, p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.agenda_particular_entrar(p_usuario, p_senha);
  delete from public.lembretes_pessoais where id = p_id;
end
$$;

-- Aviso de teste agora (de um lembrete ou genérico, para conferir a pasta).
create or replace function public.agenda_particular_testar(p_usuario text, p_senha text, p_id bigint default null)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.lembretes_pessoais%rowtype;
  v_som text;
begin
  perform public.agenda_particular_entrar(p_usuario, p_senha);
  select nullif(trim(som_padrao), '') into v_som from public.agenda_particular_config where id = 'default';
  if p_id is null then
    return public.agenda_particular_push('Agenda particular', '✅ Teste: os seus lembretes particulares chegam aqui.', 0, v_som);
  end if;
  select * into r from public.lembretes_pessoais where id = p_id;
  if not found then
    raise exception 'nao_encontrado';
  end if;
  return public.agenda_particular_push(
    r.texto,
    coalesce(nullif(trim(r.detalhes), '') || E'\n\n', '') || '🧪 Teste — o aviso de verdade sai ' || public.agenda_particular_fmt(r.proximo_envio) || '.',
    least(r.prioridade, 1), -- teste nunca insiste
    coalesce(nullif(trim(r.som), ''), v_som)
  );
end
$$;

-- Configurações: só as chaves enviadas são alteradas. Token vazio = apaga
-- (volta a usar a pasta VETFLOW).
create or replace function public.agenda_particular_config_salvar(p_usuario text, p_senha text, p_config jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.agenda_particular_entrar(p_usuario, p_senha);
  update public.agenda_particular_config
     set pushover_token = case when p_config ? 'pushover_token' then nullif(trim(p_config ->> 'pushover_token'), '') else pushover_token end,
         aparelhos = case when p_config ? 'aparelhos_particular' then nullif(trim(p_config ->> 'aparelhos_particular'), '') else aparelhos end,
         hora_padrao = case when p_config ? 'hora_padrao' then coalesce(nullif(p_config ->> 'hora_padrao', '')::time, hora_padrao) else hora_padrao end,
         som_padrao = case when p_config ? 'som_padrao' then nullif(trim(p_config ->> 'som_padrao'), '') else som_padrao end,
         updated_at = now()
   where id = 'default';
  if p_config ? 'aparelhos_vetflow' then
    update public.agenda_notify_config
       set pushover_device = nullif(trim(p_config ->> 'aparelhos_vetflow'), '')
     where id = 'default';
  end if;
end
$$;

-- Aparelhos da conta do Pushover: pede (devolve o nº do pedido) e depois lê a
-- resposta (o pg_net responde em segundo plano, em ~1 s).
create or replace function public.agenda_particular_aparelhos_pedir(p_usuario text, p_senha text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.agenda_notify_config%rowtype;
  v_req bigint;
begin
  perform public.agenda_particular_entrar(p_usuario, p_senha);
  select * into cfg from public.agenda_notify_config where id = 'default';
  if coalesce(trim(cfg.pushover_user), '') = '' or coalesce(trim(cfg.pushover_token), '') = '' then
    raise exception 'sem_pushover';
  end if;
  select net.http_post(
           url := 'https://api.pushover.net/1/users/validate.json',
           body := jsonb_build_object('token', trim(cfg.pushover_token), 'user', trim(cfg.pushover_user)),
           headers := '{"Content-Type": "application/json"}'::jsonb
         )
    into v_req;
  return v_req;
end
$$;

create or replace function public.agenda_particular_aparelhos_ler(p_usuario text, p_senha text, p_req bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status int;
  v_content text;
  v_timeout boolean;
  v_erro text;
begin
  perform public.agenda_particular_entrar(p_usuario, p_senha);
  select status_code, content, timed_out, error_msg
    into v_status, v_content, v_timeout, v_erro
    from net._http_response
   where id = p_req;
  if not found then
    return null; -- ainda não respondeu
  end if;
  if coalesce(v_timeout, false) or v_erro is not null or v_status is null or v_status >= 500 then
    return jsonb_build_object('erro', coalesce(v_erro, 'O Pushover não respondeu.'));
  end if;
  begin
    return v_content::jsonb - 'request';
  exception when others then
    return jsonb_build_object('erro', 'Resposta inesperada do Pushover.');
  end;
end
$$;

revoke all on function public.agenda_particular_dados(text, text) from public;
revoke all on function public.agenda_particular_salvar(text, text, jsonb) from public;
revoke all on function public.agenda_particular_ativar(text, text, bigint, boolean) from public;
revoke all on function public.agenda_particular_apagar(text, text, bigint) from public;
revoke all on function public.agenda_particular_testar(text, text, bigint) from public;
revoke all on function public.agenda_particular_config_salvar(text, text, jsonb) from public;
revoke all on function public.agenda_particular_aparelhos_pedir(text, text) from public;
revoke all on function public.agenda_particular_aparelhos_ler(text, text, bigint) from public;
grant execute on function public.agenda_particular_dados(text, text) to anon, authenticated;
grant execute on function public.agenda_particular_salvar(text, text, jsonb) to anon, authenticated;
grant execute on function public.agenda_particular_ativar(text, text, bigint, boolean) to anon, authenticated;
grant execute on function public.agenda_particular_apagar(text, text, bigint) to anon, authenticated;
grant execute on function public.agenda_particular_testar(text, text, bigint) to anon, authenticated;
grant execute on function public.agenda_particular_config_salvar(text, text, jsonb) to anon, authenticated;
grant execute on function public.agenda_particular_aparelhos_pedir(text, text) to anon, authenticated;
grant execute on function public.agenda_particular_aparelhos_ler(text, text, bigint) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) Pasta VETFLOW só nos aparelhos escolhidos (avisos e lembretes da agenda)
--    Mesma função da 20261123120000 + o "device".
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
                       else '{}'::jsonb end
               -- Só nos aparelhos escolhidos para a pasta VETFLOW (vazio = todos).
               || case when coalesce(trim(cfg.pushover_device), '') <> ''
                       then jsonb_build_object('device', trim(cfg.pushover_device))
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
