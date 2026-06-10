-- Fix ambiguity on "id" inside update_app_user_role RPC.

create or replace function public.update_app_user_role(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_role text
)
returns table (
  id uuid,
  username text,
  role text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := lower(trim(coalesce(p_role, '')));
  v_target public.app_users%rowtype;
  v_admin_count integer := 0;
begin
  if not exists (
    select 1
    from public.app_users actor
    where actor.id = p_actor_user_id
      and actor.active
      and actor.role = 'admin'
  ) then
    raise exception 'unauthorized';
  end if;

  if v_role not in ('admin', 'user') then
    raise exception 'invalid_role';
  end if;

  select u.*
    into v_target
    from public.app_users u
   where u.id = p_target_user_id
   limit 1;

  if not found then
    raise exception 'user_not_found';
  end if;

  if p_actor_user_id = p_target_user_id then
    raise exception 'cannot_change_own_role';
  end if;

  if v_target.role = 'admin' and v_role = 'user' then
    select count(*)
      into v_admin_count
      from public.app_users u
     where u.role = 'admin'
       and u.active;

    if v_admin_count <= 1 then
      raise exception 'cannot_remove_last_admin';
    end if;
  end if;

  return query
  update public.app_users u
     set role = v_role
   where u.id = p_target_user_id
  returning
    u.id,
    u.username,
    u.role,
    u.active,
    u.created_at,
    u.updated_at;
end;
$$;
