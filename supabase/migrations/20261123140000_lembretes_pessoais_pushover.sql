-- VetFlow: LEMBRETES PESSOAIS pelo Pushover (tarefa particular, fora da agenda).
-- Ex.: "me lembre de X a cada 3 dias às 08:00". Roda no próprio banco (pg_cron,
-- a cada 5 min), então chega com todos os computadores desligados. Usa a mesma
-- chave do Pushover dos avisos da agenda, mas NÃO entra na agenda nem no log
-- da agenda, e ninguém lê pela internet (tabela fechada, só aqui no SQL Editor).
-- PRÉ-REQUISITO: 20261123120000. Pode rodar mais de uma vez.
--
-- Criar um lembrete (o texto fica só no banco — não vai para o código):
--   select public.lembrete_pessoal_criar('Escreva aqui a sua tarefa');
--     → a cada 3 dias às 08:00, começando hoje (se 08:00 já passou, o 1º chega
--       em até 5 min, para conferir que funciona; depois segue a cada 3 dias às 08:00).
--   select public.lembrete_pessoal_criar('Outra tarefa', 7, '19:30', '2026-12-01');
--     → a cada 7 dias às 19:30, a partir de 01/12.
--
-- Ver, pausar, mudar ou apagar:
--   select id, texto, a_cada_dias, hora, proximo_envio at time zone 'America/Sao_Paulo' as proximo, ativo
--     from public.lembretes_pessoais order by id;
--   update public.lembretes_pessoais set ativo = false where id = 1;              -- pausar
--   update public.lembretes_pessoais set prioridade = 2 where id = 1;             -- insistir até confirmar
--   update public.lembretes_pessoais set texto = 'Novo texto' where id = 1;
--   delete from public.lembretes_pessoais where id = 1;                           -- apagar

create table if not exists public.lembretes_pessoais (
  id bigserial primary key,
  texto text not null,
  titulo text not null default 'Lembrete pessoal',
  a_cada_dias int not null default 3 check (a_cada_dias >= 1),
  -- Horário de Brasília.
  hora time not null default '08:00',
  proximo_envio timestamptz not null,
  ativo boolean not null default true,
  -- 0 = normal | 1 = alta (passa pelo "não perturbe" do app) | 2 = insiste até confirmar
  prioridade int not null default 1 check (prioridade between -2 and 2),
  -- Som do Pushover (https://pushover.net/api#sounds); vazio = padrão do app.
  som text,
  ultimo_envio timestamptz,
  created_at timestamptz not null default now()
);
alter table public.lembretes_pessoais enable row level security;
revoke all on public.lembretes_pessoais from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Criar lembrete: a cada N dias, no horário escolhido, a partir de um dia.
-- ---------------------------------------------------------------------------
create or replace function public.lembrete_pessoal_criar(
  p_texto text,
  p_a_cada_dias int default 3,
  p_hora time default '08:00',
  p_comecar date default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inicio date := coalesce(p_comecar, (now() at time zone 'America/Sao_Paulo')::date);
  v_id bigint;
begin
  if coalesce(trim(p_texto), '') = '' then
    raise exception 'Escreva o texto do lembrete.';
  end if;
  if coalesce(p_a_cada_dias, 0) < 1 then
    raise exception 'O intervalo precisa ser de pelo menos 1 dia.';
  end if;
  insert into public.lembretes_pessoais (texto, a_cada_dias, hora, proximo_envio)
  values (trim(p_texto), p_a_cada_dias, p_hora, (v_inicio + p_hora) at time zone 'America/Sao_Paulo')
  returning id into v_id;
  return 'Lembrete ' || v_id || ' criado: a cada ' || p_a_cada_dias || ' dia(s) às ' || to_char(p_hora, 'HH24:MI')
         || ', a partir de ' || to_char(v_inicio, 'DD/MM/YYYY') || '.';
end
$$;

revoke execute on function public.lembrete_pessoal_criar(text, int, time, date) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Envio (pg_cron, a cada 5 min). Se ficou algum envio para trás (banco parado),
-- manda UM só e pula para o próximo horário certo — nunca uma rajada.
-- ---------------------------------------------------------------------------
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
  v_prio int;
  v_req bigint;
  v_msg text;
  v_sent integer := 0;
begin
  select * into cfg from public.agenda_notify_config where id = 'default';
  if not found or coalesce(trim(cfg.pushover_user), '') = '' or coalesce(trim(cfg.pushover_token), '') = '' then
    return 0;
  end if;

  for r in
    select * from public.lembretes_pessoais
     where ativo and proximo_envio <= now()
     order by proximo_envio
     for update skip locked
  loop
    begin
      -- Próximo horário depois de agora, mantendo a hora certinha.
      v_proximo := r.proximo_envio + make_interval(
        days => r.a_cada_dias * (floor(extract(epoch from (now() - r.proximo_envio)) / (r.a_cada_dias * 86400))::int + 1)
      );
      v_prio := least(greatest(coalesce(r.prioridade, 1), -2), 2);
      v_msg := r.texto || E'\n\n🔁 Próximo: '
               || (array['dom','seg','ter','qua','qui','sex','sáb'])[extract(dow from (v_proximo at time zone 'America/Sao_Paulo'))::int + 1]
               || ' ' || to_char(v_proximo at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI')
               || ' (a cada ' || r.a_cada_dias || ' dia' || case when r.a_cada_dias > 1 then 's' else '' end || ')';

      select net.http_post(
               url := 'https://api.pushover.net/1/messages.json',
               body := jsonb_build_object(
                 'token', trim(cfg.pushover_token),
                 'user', trim(cfg.pushover_user),
                 'title', coalesce(nullif(trim(r.titulo), ''), 'Lembrete pessoal'),
                 'message', v_msg,
                 'priority', v_prio
               )
               || case when v_prio = 2
                       then jsonb_build_object(
                              'retry', greatest(coalesce(cfg.pushover_retry_lembrete, 60), 30),
                              'expire', least(greatest(coalesce(cfg.pushover_expire_lembrete, 3600), 30), 10800)
                            )
                       else '{}'::jsonb end
               || case when coalesce(trim(r.som), '') <> '' then jsonb_build_object('sound', trim(r.som)) else '{}'::jsonb end,
               headers := '{"Content-Type": "application/json"}'::jsonb
             )
        into v_req;

      update public.lembretes_pessoais
         set ultimo_envio = now(), proximo_envio = v_proximo
       where id = r.id;
      insert into public.agenda_notify_log (event, channel, message, request_id)
      values ('pessoal', 'pushover', 'Lembrete pessoal ' || r.id, v_req);
      v_sent := v_sent + 1;
    exception when others then
      -- Um lembrete com problema não pode travar os outros.
      insert into public.agenda_notify_log (event, channel, message, error)
      values ('pessoal', 'pushover', 'Lembrete pessoal ' || r.id, sqlerrm);
    end;
  end loop;
  return v_sent;
end
$$;

revoke execute on function public.lembretes_pessoais_enviar() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'lembretes-pessoais';
  perform cron.schedule('lembretes-pessoais', '*/5 * * * *', 'select public.lembretes_pessoais_enviar()');
end $$;

notify pgrst, 'reload schema';
