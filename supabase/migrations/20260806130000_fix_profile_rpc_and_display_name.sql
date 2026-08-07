-- Corrige "column reference user_id is ambiguous": a migration anterior
-- (20260806120000) recriou get_my_app_user_profile/upsert_my_app_user_profile
-- a partir da versão ORIGINAL (sem alias), desfazendo sem querer o fix que já
-- tinha sido aplicado em 20260414103000/20260414104500. Usa aqui o mesmo
-- padrão corrigido (alias explícito nas tabelas), com signature_url incluído.
--
-- Também adiciona display_name em app_users: "William Moraes Cardoso" (perfil
-- próprio) e "williamcardoso" (username, usado como fallback pros DEMAIS
-- usuários) apareciam como 2 entradas diferentes no seletor de veterinário —
-- display_name deixa o admin escolher como cada usuário aparece em
-- documentos/relatórios (ex.: "Dr. William Cardoso").

alter table public.app_users
  add column if not exists display_name text not null default '';

drop function if exists public.get_my_app_user_profile(uuid);
drop function if exists public.upsert_my_app_user_profile(uuid, text, text, text, text, text, text);
drop function if exists public.list_app_users(uuid);
drop function if exists public.list_app_users_with_access_profile(uuid);

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
  p_signature_url text default ''
)
returns table (
  user_id uuid,
  full_name text,
  email text,
  crmv text,
  mapa_registration text,
  signature_text text,
  signature_url text,
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
    signature_url
  )
  values (
    p_actor_user_id,
    coalesce(p_full_name, ''),
    coalesce(p_email, ''),
    coalesce(p_crmv, ''),
    coalesce(p_mapa_registration, ''),
    coalesce(p_signature_text, ''),
    coalesce(p_signature_url, '')
  )
  on conflict on constraint app_user_profiles_pkey do update
    set
      full_name = excluded.full_name,
      email = excluded.email,
      crmv = excluded.crmv,
      mapa_registration = excluded.mapa_registration,
      signature_text = excluded.signature_text,
      signature_url = excluded.signature_url
  returning
    profile_upsert.user_id,
    profile_upsert.full_name,
    profile_upsert.email,
    profile_upsert.crmv,
    profile_upsert.mapa_registration,
    profile_upsert.signature_text,
    profile_upsert.signature_url,
    profile_upsert.updated_at
  into
    user_id,
    full_name,
    email,
    crmv,
    mapa_registration,
    signature_text,
    signature_url,
    updated_at;

  return next;
end;
$$;

create or replace function public.list_app_users(
  p_actor_user_id uuid
)
returns table (
  id uuid,
  username text,
  role text,
  active boolean,
  is_vet boolean,
  display_name text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
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

  return query
  select u.id, u.username, u.role, u.active, u.is_vet, u.display_name, u.created_at, u.updated_at
    from public.app_users u
   order by lower(u.username);
end;
$$;

create or replace function public.list_app_users_with_access_profile(
  p_actor_user_id uuid
)
returns table (
  id uuid,
  username text,
  role text,
  active boolean,
  is_vet boolean,
  display_name text,
  profile_id uuid,
  profile_name text,
  created_at timestamptz,
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

  return query
  select
    u.id,
    u.username,
    u.role,
    u.active,
    u.is_vet,
    u.display_name,
    b.profile_id,
    p.name as profile_name,
    u.created_at,
    u.updated_at
  from public.app_users u
  left join public.user_profile_bindings b on b.user_id = u.id
  left join public.access_profiles p on p.id = b.profile_id
  order by lower(u.username);
end;
$$;

create or replace function public.update_app_user_display_name(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_display_name text
)
returns table (
  id uuid,
  username text,
  role text,
  active boolean,
  is_vet boolean,
  display_name text,
  created_at timestamptz,
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

  update public.app_users u
     set display_name = coalesce(p_display_name, '')
   where u.id = p_target_user_id
  returning u.id, u.username, u.role, u.active, u.is_vet, u.display_name, u.created_at, u.updated_at
  into id, username, role, active, is_vet, display_name, created_at, updated_at;

  if id is null then
    raise exception 'user_not_found';
  end if;

  return next;
end;
$$;

grant execute on function public.get_my_app_user_profile(uuid) to anon, authenticated;
grant execute on function public.upsert_my_app_user_profile(uuid, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.list_app_users(uuid) to anon, authenticated;
grant execute on function public.list_app_users_with_access_profile(uuid) to anon, authenticated;
grant execute on function public.update_app_user_display_name(uuid, uuid, text) to anon, authenticated;
