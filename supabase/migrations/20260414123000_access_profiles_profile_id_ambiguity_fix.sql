-- Fix ambiguity on profile_id/module_key in access profile RPCs.

create or replace function public.upsert_access_profile_permission(
  p_actor_user_id uuid,
  p_profile_id uuid,
  p_module_key text,
  p_can_view boolean,
  p_can_edit boolean,
  p_can_manage boolean
)
returns table (
  profile_id uuid,
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
  v_module text := trim(coalesce(p_module_key, ''));
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

  if not exists (select 1 from public.access_profiles where id = p_profile_id) then
    raise exception 'profile_not_found';
  end if;

  if v_module = '' then
    raise exception 'module_required';
  end if;

  return query
  insert into public.access_profile_permissions as app (
    profile_id,
    module_key,
    can_view,
    can_edit,
    can_manage
  )
  values (
    p_profile_id,
    v_module,
    coalesce(p_can_view, false),
    coalesce(p_can_edit, false),
    coalesce(p_can_manage, false)
  )
  on conflict on constraint access_profile_permissions_pkey do update
    set
      can_view = excluded.can_view,
      can_edit = excluded.can_edit,
      can_manage = excluded.can_manage
  returning
    app.profile_id,
    app.module_key,
    app.can_view,
    app.can_edit,
    app.can_manage;
end;
$$;

create or replace function public.set_user_access_profile(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_profile_id uuid
)
returns table (
  user_id uuid,
  profile_id uuid,
  profile_name text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
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

  if not exists (select 1 from public.app_users where id = p_target_user_id) then
    raise exception 'user_not_found';
  end if;

  if p_profile_id is not null and not exists (select 1 from public.access_profiles where id = p_profile_id and active) then
    raise exception 'profile_not_found';
  end if;

  return query
  with upsert_binding as (
    insert into public.user_profile_bindings as ub (user_id, profile_id)
    values (p_target_user_id, p_profile_id)
    on conflict (user_id) do update
      set profile_id = excluded.profile_id
    returning ub.user_id, ub.profile_id, ub.updated_at
  )
  select
    ub.user_id,
    ub.profile_id,
    p.name as profile_name,
    ub.updated_at
  from upsert_binding ub
  left join public.access_profiles p on p.id = ub.profile_id;
end;
$$;
