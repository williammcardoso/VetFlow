-- Returns effective permissions for the logged-in app user.

create or replace function public.get_my_effective_access_permissions(
  p_actor_user_id uuid
)
returns table (
  module_key text,
  can_view boolean,
  can_edit boolean,
  can_manage boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.app_users%rowtype;
  v_profile_id uuid;
begin
  select u.*
    into v_actor
    from public.app_users u
   where u.id = p_actor_user_id
     and u.active
   limit 1;

  if not found then
    raise exception 'unauthorized';
  end if;

  -- Admin always has full access.
  if v_actor.role = 'admin' then
    return query
    select
      m.module_key,
      true as can_view,
      true as can_edit,
      true as can_manage
    from public.list_access_modules(p_actor_user_id) m;
    return;
  end if;

  select b.profile_id
    into v_profile_id
    from public.user_profile_bindings b
   where b.user_id = p_actor_user_id
   limit 1;

  -- Backward-compatible fallback: without profile binding, keep legacy full access.
  if v_profile_id is null then
    return query
    select
      m.module_key,
      true as can_view,
      true as can_edit,
      true as can_manage
    from public.list_access_modules(p_actor_user_id) m;
    return;
  end if;

  -- If profile is inactive or missing, deny everything.
  if not exists (
    select 1
      from public.access_profiles p
     where p.id = v_profile_id
       and p.active
  ) then
    return query
    select
      m.module_key,
      false as can_view,
      false as can_edit,
      false as can_manage
    from public.list_access_modules(p_actor_user_id) m;
    return;
  end if;

  return query
  with modules as (
    select m.module_key
    from public.list_access_modules(p_actor_user_id) m
  )
  select
    m.module_key,
    coalesce(app.can_view, false) as can_view,
    coalesce(app.can_edit, false) as can_edit,
    coalesce(app.can_manage, false) as can_manage
  from modules m
  left join public.access_profile_permissions app
    on app.profile_id = v_profile_id
   and app.module_key = m.module_key
  order by m.module_key;
end;
$$;

grant execute on function public.get_my_effective_access_permissions(uuid) to anon, authenticated;
