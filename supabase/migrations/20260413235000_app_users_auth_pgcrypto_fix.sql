-- Fix for environments where pgcrypto functions live under `extensions` schema.
create extension if not exists pgcrypto;

-- Smoke test (safe no-op) to ensure hash functions are callable.
do $$
begin
  perform extensions.crypt('121192', extensions.gen_salt('bf'));
exception
  when undefined_function then
    -- Fallback when pgcrypto is available in search_path/public.
    perform crypt('121192', gen_salt('bf'));
end;
$$;

-- Ensure seed admin exists and has a valid bcrypt hash.
do $$
begin
  if exists (
    select 1
    from public.app_users
    where lower(username) = 'williamcardoso'
  ) then
    update public.app_users
       set
         password_hash = extensions.crypt('121192', extensions.gen_salt('bf')),
         role = 'admin',
         active = true,
         updated_at = now()
     where lower(username) = 'williamcardoso';
  else
    insert into public.app_users (username, password_hash, role, active)
    values (
      'williamcardoso',
      extensions.crypt('121192', extensions.gen_salt('bf')),
      'admin',
      true
    );
  end if;
end;
$$;

create or replace function public.authenticate_app_user(
  p_username text,
  p_password text
)
returns table (
  id uuid,
  username text,
  role text,
  active boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.app_users%rowtype;
begin
  select *
    into v_user
    from public.app_users u
   where lower(u.username) = lower(trim(p_username))
   limit 1;

  if not found or not v_user.active then
    return;
  end if;

  if v_user.password_hash = crypt(p_password, v_user.password_hash) then
    return query
    select v_user.id, v_user.username, v_user.role, v_user.active;
  end if;
end;
$$;

create or replace function public.create_app_user(
  p_actor_user_id uuid,
  p_username text,
  p_password text,
  p_role text default 'user'
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
set search_path = public, extensions
as $$
declare
  v_username text := lower(trim(p_username));
  v_role text := lower(trim(coalesce(p_role, 'user')));
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

  if v_username = '' then
    raise exception 'username_required';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'password_too_short';
  end if;
  if v_role not in ('admin', 'user') then
    raise exception 'invalid_role';
  end if;

  insert into public.app_users (username, password_hash, role, active)
  values (v_username, crypt(p_password, gen_salt('bf')), v_role, true)
  returning app_users.id, app_users.username, app_users.role, app_users.active, app_users.created_at, app_users.updated_at
  into id, username, role, active, created_at, updated_at;

  return next;
end;
$$;
