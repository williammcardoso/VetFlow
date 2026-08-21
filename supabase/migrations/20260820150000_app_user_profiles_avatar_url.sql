-- Adiciona avatar_url ao perfil do usuário (foto de avatar, separada da
-- assinatura digital que já existia). Mesmo padrão de signature_url: coluna
-- em app_user_profiles + campo nas duas RPCs (get/upsert) que o app usa.
--
-- Recria as funções a partir da versão corrigida em
-- 20260806130000_fix_profile_rpc_and_display_name.sql (alias explícito nas
-- tabelas) — só list_app_users*/update_app_user_display_name ficam
-- intocadas, não usam signature_url/avatar_url.

alter table public.app_user_profiles
  add column if not exists avatar_url text not null default '';

drop function if exists public.get_my_app_user_profile(uuid);
drop function if exists public.upsert_my_app_user_profile(uuid, text, text, text, text, text, text);

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
  signature_url text,
  avatar_url text,
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
    profile.signature_url,
    profile.avatar_url,
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
  p_signature_text text,
  p_signature_url text default '',
  p_avatar_url text default ''
)
returns table (
  user_id uuid,
  full_name text,
  email text,
  crmv text,
  mapa_registration text,
  signature_text text,
  signature_url text,
  avatar_url text,
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
    signature_text,
    signature_url,
    avatar_url
  )
  values (
    p_actor_user_id,
    coalesce(p_full_name, ''),
    coalesce(p_email, ''),
    coalesce(p_crmv, ''),
    coalesce(p_mapa_registration, ''),
    coalesce(p_signature_text, ''),
    coalesce(p_signature_url, ''),
    coalesce(p_avatar_url, '')
  )
  on conflict on constraint app_user_profiles_pkey do update
    set
      full_name = excluded.full_name,
      email = excluded.email,
      crmv = excluded.crmv,
      mapa_registration = excluded.mapa_registration,
      signature_text = excluded.signature_text,
      signature_url = excluded.signature_url,
      avatar_url = excluded.avatar_url
  returning
    profile_upsert.user_id,
    profile_upsert.full_name,
    profile_upsert.email,
    profile_upsert.crmv,
    profile_upsert.mapa_registration,
    profile_upsert.signature_text,
    profile_upsert.signature_url,
    profile_upsert.avatar_url,
    profile_upsert.updated_at
  into
    user_id,
    full_name,
    email,
    crmv,
    mapa_registration,
    signature_text,
    signature_url,
    avatar_url,
    updated_at;

  return next;
end;
$$;

grant execute on function public.get_my_app_user_profile(uuid) to anon, authenticated;
grant execute on function public.upsert_my_app_user_profile(uuid, text, text, text, text, text, text, text) to anon, authenticated;
