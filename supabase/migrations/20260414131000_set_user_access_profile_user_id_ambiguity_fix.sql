-- Fix ambiguity on "user_id" in set_user_access_profile RPC.

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

  if not exists (
    select 1
    from public.app_users target_user
    where target_user.id = p_target_user_id
  ) then
    raise exception 'user_not_found';
  end if;

  if p_profile_id is not null and not exists (
    select 1
    from public.access_profiles profile_ref
    where profile_ref.id = p_profile_id
      and profile_ref.active
  ) then
    raise exception 'profile_not_found';
  end if;

  return query
  with binding_upsert as (
    insert into public.user_profile_bindings as binding (user_id, profile_id)
    values (p_target_user_id, p_profile_id)
    on conflict on constraint user_profile_bindings_pkey do update
      set profile_id = excluded.profile_id
    returning
      binding.user_id as bound_user_id,
      binding.profile_id as bound_profile_id,
      binding.updated_at as bound_updated_at
  )
  select
    bu.bound_user_id as user_id,
    bu.bound_profile_id as profile_id,
    profile_ref.name as profile_name,
    bu.bound_updated_at as updated_at
  from binding_upsert bu
  left join public.access_profiles profile_ref
    on profile_ref.id = bu.bound_profile_id;
end;
$$;
