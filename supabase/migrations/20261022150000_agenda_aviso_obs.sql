-- VetFlow: aviso de "Agendamento alterado" também quando muda só a
-- observação ou os detalhes do tipo (kind_info: loja/domicílio, vacina...).
-- Antes, editar só a observação não avisava nada. Pode rodar mais de uma vez.
-- PRÉ-REQUISITO: 20261006130000.

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
  v_old_obs text;
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
      elsif (new.date, new.time, new.title, new.client_name, new.duration_minutes, new.kind, new.kind_info)
            is distinct from (old.date, old.time, old.title, old.client_name, old.duration_minutes, old.kind, old.kind_info) then
        v_event := 'alterado';
      else
        return null;
      end if;
    end if;

    v_obs := nullif(trim(coalesce(r.kind_info ->> 'obs', '')), '');
    if v_event = 'alterado' then
      v_old_obs := nullif(trim(coalesce(old.kind_info ->> 'obs', '')), '');
    end if;
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
             || case when v_event = 'alterado' and v_old_obs is distinct from v_obs
                     then E'\n↩️ obs. antes: ' || coalesce(v_old_obs, '(sem observação)') else '' end
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

notify pgrst, 'reload schema';
