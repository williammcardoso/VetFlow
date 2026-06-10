create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,
  role text not null default 'user',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_users_role_check check (role in ('admin', 'user'))
);

create unique index if not exists app_users_username_unique_ci
  on public.app_users (lower(username));

create or replace function public.set_app_users_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_users_updated_at on public.app_users;
create trigger trg_app_users_updated_at
before update on public.app_users
for each row
execute function public.set_app_users_updated_at();

insert into public.app_users (username, password_hash, role, active)
values (
  'williamcardoso',
  extensions.crypt('121192', extensions.gen_salt('bf')),
  'admin',
  true
)
on conflict do nothing;

alter table public.app_users enable row level security;

drop policy if exists app_users_block_select on public.app_users;
create policy app_users_block_select
on public.app_users
for select
using (false);

drop policy if exists app_users_block_insert on public.app_users;
create policy app_users_block_insert
on public.app_users
for insert
with check (false);

drop policy if exists app_users_block_update on public.app_users;
create policy app_users_block_update
on public.app_users
for update
using (false)
with check (false);

drop policy if exists app_users_block_delete on public.app_users;
create policy app_users_block_delete
on public.app_users
for delete
using (false);

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

create or replace function public.list_app_users(
  p_actor_user_id uuid
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
  select u.id, u.username, u.role, u.active, u.created_at, u.updated_at
    from public.app_users u
   order by lower(u.username);
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

create or replace function public.set_app_user_active(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_active boolean
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

  if p_actor_user_id = p_target_user_id and p_active = false then
    raise exception 'cannot_deactivate_self';
  end if;

  update public.app_users u
     set active = p_active
   where u.id = p_target_user_id
  returning u.id, u.username, u.role, u.active, u.created_at, u.updated_at
  into id, username, role, active, created_at, updated_at;

  if id is null then
    raise exception 'user_not_found';
  end if;

  return next;
end;
$$;

grant execute on function public.authenticate_app_user(text, text) to anon, authenticated;
grant execute on function public.list_app_users(uuid) to anon, authenticated;
grant execute on function public.create_app_user(uuid, text, text, text) to anon, authenticated;
grant execute on function public.set_app_user_active(uuid, uuid, boolean) to anon, authenticated;
