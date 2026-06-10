-- Compatibility fix for typo in initial migration:
-- `signatuare_text` -> `signature_text`
-- Keeps existing data and redefines profile RPCs safely.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'app_user_profiles'
      and column_name = 'signatuare_text'
  ) then
    execute 'alter table public.app_user_profiles rename column signatuare_text to signature_text';
  end if;
end;
$$;

alter table public.app_user_profiles
  add column if not exists signature_text text not null default '';

create or replace function public.get_my_app_user_profile(
  p_actor_user_id uuid
)
returns table (
  user_id uuid,
  full_name text,
  email text,
  crmv text,
  mapa_registration text,
  signature_text text,
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
      and actor.active = true
  ) then
    raise exception 'unauthorized';
  end if;

  insert into public.app_user_profiles as profile_seed (user_id)
  values (p_actor_user_id)
  on conflict on constraint app_user_profiles_pkey do nothing;

  return query
  select
    profile.user_id,
    profile.full_name,
    profile.email,
    profile.crmv,
    profile.mapa_registration,
    profile.signature_text,
    profile.updated_at
  from public.app_user_profiles as profile
  where profile.user_id = p_actor_user_id;
end;
$$;

create or replace function public.upsert_my_app_user_profile(
  p_actor_user_id uuid,
  p_full_name text,
  p_email text,
  p_crmv text,
  p_mapa_registration text,
  p_signature_text text
)
returns table (
  user_id uuid,
  full_name text,
  email text,
  crmv text,
  mapa_registration text,
  signature_text text,
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
      and actor.active = true
  ) then
    raise exception 'unauthorized';
  end if;

  insert into public.app_user_profiles as profile_upsert (
    user_id,
    full_name,
    email,
    crmv,
    mapa_registration,
    signature_text
  )
  values (
    p_actor_user_id,
    coalesce(p_full_name, ''),
    coalesce(p_email, ''),
    coalesce(p_crmv, ''),
    coalesce(p_mapa_registration, ''),
    coalesce(p_signature_text, '')
  )
  on conflict on constraint app_user_profiles_pkey do update
    set
      full_name = excluded.full_name,
      email = excluded.email,
      crmv = excluded.crmv,
      mapa_registration = excluded.mapa_registration,
      signature_text = excluded.signature_text
  returning
    profile_upsert.user_id,
    profile_upsert.full_name,
    profile_upsert.email,
    profile_upsert.crmv,
    profile_upsert.mapa_registration,
    profile_upsert.signature_text,
    profile_upsert.updated_at
  into
    user_id,
    full_name,
    email,
    crmv,
    mapa_registration,
    signature_text,
    updated_at;

  return next;
end;
$$;
