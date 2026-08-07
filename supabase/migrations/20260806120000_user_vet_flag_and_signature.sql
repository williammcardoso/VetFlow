-- "É veterinário?" (para filtrar quem aparece como solicitante em pedidos de
-- exame) e assinatura digital escaneada (opcional, usada só quando o usuário
-- marcar explicitamente "usar assinatura digital" num documento).

alter table public.app_users
  add column if not exists is_vet boolean not null default true;

alter table public.app_user_profiles
  add column if not exists signature_url text not null default '';

-- Postgres não permite CREATE OR REPLACE quando o tipo de retorno muda
-- (colunas novas). Precisa dropar a versão antiga antes de recriar.
drop function if exists public.list_app_users(uuid);
drop function if exists public.list_app_users_with_access_profile(uuid);
drop function if exists public.get_my_app_user_profile(uuid);
drop function if exists public.upsert_my_app_user_profile(uuid, text, text, text, text, text);

-- list_app_users: acrescenta is_vet no retorno.
create or replace function public.list_app_users(
  p_actor_user_id uuid
)
returns table (
  id uuid,
  username text,
  role text,
  active boolean,
  is_vet boolean,
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
  select u.id, u.username, u.role, u.active, u.is_vet, u.created_at, u.updated_at
    from public.app_users u
   order by lower(u.username);
end;
$$;

-- list_app_users_with_access_profile: acrescenta is_vet no retorno.
create or replace function public.list_app_users_with_access_profile(
  p_actor_user_id uuid
)
returns table (
  id uuid,
  username text,
  role text,
  active boolean,
  is_vet boolean,
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

-- Nova RPC: admin marca/desmarca um usuário como veterinário.
create or replace function public.update_app_user_is_vet(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_is_vet boolean
)
returns table (
  id uuid,
  username text,
  role text,
  active boolean,
  is_vet boolean,
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
     set is_vet = p_is_vet
   where u.id = p_target_user_id
  returning u.id, u.username, u.role, u.active, u.is_vet, u.created_at, u.updated_at
  into id, username, role, active, is_vet, created_at, updated_at;

  if id is null then
    raise exception 'user_not_found';
  end if;

  return next;
end;
$$;

-- get_my_app_user_profile: acrescenta signature_url.
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

  insert into public.app_user_profiles (user_id)
  values (p_actor_user_id)
  on conflict (user_id) do nothing;

  return query
  select p.user_id, p.full_name, p.email, p.crmv, p.mapa_registration, p.signature_text, p.signature_url, p.updated_at
    from public.app_user_profiles p
   where p.user_id = p_actor_user_id;
end;
$$;

-- upsert_my_app_user_profile: acrescenta p_signature_url.
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

  insert into public.app_user_profiles (
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
  on conflict (user_id) do update
    set
      full_name = excluded.full_name,
      email = excluded.email,
      crmv = excluded.crmv,
      mapa_registration = excluded.mapa_registration,
      signature_text = excluded.signature_text,
      signature_url = excluded.signature_url
  returning
    app_user_profiles.user_id,
    app_user_profiles.full_name,
    app_user_profiles.email,
    app_user_profiles.crmv,
    app_user_profiles.mapa_registration,
    app_user_profiles.signature_text,
    app_user_profiles.signature_url,
    app_user_profiles.updated_at
  into user_id, full_name, email, crmv, mapa_registration, signature_text, signature_url, updated_at;

  return next;
end;
$$;

grant execute on function public.update_app_user_is_vet(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.get_my_app_user_profile(uuid) to anon, authenticated;
grant execute on function public.upsert_my_app_user_profile(uuid, text, text, text, text, text, text) to anon, authenticated;
