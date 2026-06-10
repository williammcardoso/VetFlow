-- Fix: non-admin users must resolve effective permissions without admin-only helper.

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

  if v_actor.role = 'admin' then
    return query
    with modules as (
      select *
      from (
        values
          ('dashboard'),
          ('agenda'),
          ('clients'),
          ('prescriptions'),
          ('financial'),
          ('sales'),
          ('stock'),
          ('registrations'),
          ('settings_company'),
          ('settings_users'),
          ('settings_access_profiles'),
          ('settings_external_access')
      ) as m(module_key)
    )
    select
      m.module_key,
      true as can_view,
      true as can_edit,
      true as can_manage
    from modules m;
    return;
  end if;

  select b.profile_id
    into v_profile_id
    from public.user_profile_bindings b
   where b.user_id = p_actor_user_id
   limit 1;

  -- Backward-compatible fallback: users without binding still keep legacy full access.
  if v_profile_id is null then
    return query
    with modules as (
      select *
      from (
        values
          ('dashboard'),
          ('agenda'),
          ('clients'),
          ('prescriptions'),
          ('financial'),
          ('sales'),
          ('stock'),
          ('registrations'),
          ('settings_company'),
          ('settings_users'),
          ('settings_access_profiles'),
          ('settings_external_access')
      ) as m(module_key)
    )
    select
      m.module_key,
      true as can_view,
      true as can_edit,
      true as can_manage
    from modules m;
    return;
  end if;

  if not exists (
    select 1
      from public.access_profiles p
     where p.id = v_profile_id
       and p.active
  ) then
    return query
    with modules as (
      select *
      from (
        values
          ('dashboard'),
          ('agenda'),
          ('clients'),
          ('prescriptions'),
          ('financial'),
          ('sales'),
          ('stock'),
          ('registrations'),
          ('settings_company'),
          ('settings_users'),
          ('settings_access_profiles'),
          ('settings_external_access')
      ) as m(module_key)
    )
    select
      m.module_key,
      false as can_view,
      false as can_edit,
      false as can_manage
    from modules m;
    return;
  end if;

  return query
  with modules as (
    select *
    from (
      values
        ('dashboard'),
        ('agenda'),
        ('clients'),
        ('prescriptions'),
        ('financial'),
        ('sales'),
        ('stock'),
        ('registrations'),
        ('settings_company'),
        ('settings_users'),
        ('settings_access_profiles'),
        ('settings_external_access')
    ) as m(module_key)
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
