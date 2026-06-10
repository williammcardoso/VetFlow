-- Access profiles + admin tooling for app_users.
create extension if not exists pgcrypto;

create table if not exists public.access_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists access_profiles_name_unique_ci
  on public.access_profiles (lower(name));

create table if not exists public.access_profile_permissions (
  profile_id uuid not null references public.access_profiles(id) on delete cascade,
  module_key text not null,
  can_view boolean not null default false,
  can_edit boolean not null default false,
  can_manage boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (profile_id, module_key)
);

create table if not exists public.user_profile_bindings (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  profile_id uuid references public.access_profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_access_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_access_profiles_updated_at on public.access_profiles;
create trigger trg_access_profiles_updated_at
before update on public.access_profiles
for each row
execute function public.set_access_profiles_updated_at();

create or replace function public.set_access_profile_permissions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_access_profile_permissions_updated_at on public.access_profile_permissions;
create trigger trg_access_profile_permissions_updated_at
before update on public.access_profile_permissions
for each row
execute function public.set_access_profile_permissions_updated_at();

create or replace function public.set_user_profile_bindings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_profile_bindings_updated_at on public.user_profile_bindings;
create trigger trg_user_profile_bindings_updated_at
before update on public.user_profile_bindings
for each row
execute function public.set_user_profile_bindings_updated_at();

alter table public.access_profiles enable row level security;
alter table public.access_profile_permissions enable row level security;
alter table public.user_profile_bindings enable row level security;

drop policy if exists access_profiles_block_select on public.access_profiles;
create policy access_profiles_block_select on public.access_profiles for select using (false);
drop policy if exists access_profiles_block_insert on public.access_profiles;
create policy access_profiles_block_insert on public.access_profiles for insert with check (false);
drop policy if exists access_profiles_block_update on public.access_profiles;
create policy access_profiles_block_update on public.access_profiles for update using (false) with check (false);
drop policy if exists access_profiles_block_delete on public.access_profiles;
create policy access_profiles_block_delete on public.access_profiles for delete using (false);

drop policy if exists access_profile_permissions_block_select on public.access_profile_permissions;
create policy access_profile_permissions_block_select on public.access_profile_permissions for select using (false);
drop policy if exists access_profile_permissions_block_insert on public.access_profile_permissions;
create policy access_profile_permissions_block_insert on public.access_profile_permissions for insert with check (false);
drop policy if exists access_profile_permissions_block_update on public.access_profile_permissions;
create policy access_profile_permissions_block_update on public.access_profile_permissions for update using (false) with check (false);
drop policy if exists access_profile_permissions_block_delete on public.access_profile_permissions;
create policy access_profile_permissions_block_delete on public.access_profile_permissions for delete using (false);

drop policy if exists user_profile_bindings_block_select on public.user_profile_bindings;
create policy user_profile_bindings_block_select on public.user_profile_bindings for select using (false);
drop policy if exists user_profile_bindings_block_insert on public.user_profile_bindings;
create policy user_profile_bindings_block_insert on public.user_profile_bindings for insert with check (false);
drop policy if exists user_profile_bindings_block_update on public.user_profile_bindings;
create policy user_profile_bindings_block_update on public.user_profile_bindings for update using (false) with check (false);
drop policy if exists user_profile_bindings_block_delete on public.user_profile_bindings;
create policy user_profile_bindings_block_delete on public.user_profile_bindings for delete using (false);

insert into public.access_profiles (name, description, active)
values
  ('Administrador', 'Perfil completo para gestão do sistema.', true),
  ('Operacional', 'Perfil padrão para operação diária.', true)
on conflict do nothing;

create or replace function public.list_access_modules(
  p_actor_user_id uuid
)
returns table (
  module_key text,
  module_label text
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
  select *
  from (
    values
      ('dashboard', 'Dashboard'),
      ('agenda', 'Agenda'),
      ('clients', 'Clientes e Prontuário'),
      ('prescriptions', 'Receitas e Documentos'),
      ('financial', 'Financeiro'),
      ('sales', 'Comercial / Vendas'),
      ('stock', 'Estoque'),
      ('registrations', 'Cadastros'),
      ('settings_company', 'Configurações da Empresa'),
      ('settings_users', 'Usuários do Sistema'),
      ('settings_access_profiles', 'Perfis de Acesso'),
      ('settings_external_access', 'Acesso Externo')
  ) as m(module_key, module_label);
end;
$$;

create or replace function public.list_access_profiles(
  p_actor_user_id uuid
)
returns table (
  id uuid,
  name text,
  description text,
  active boolean,
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
  select p.id, p.name, p.description, p.active, p.created_at, p.updated_at
  from public.access_profiles p
  order by lower(p.name);
end;
$$;

create or replace function public.create_access_profile(
  p_actor_user_id uuid,
  p_name text,
  p_description text default ''
)
returns table (
  id uuid,
  name text,
  description text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
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

  if v_name = '' then
    raise exception 'profile_name_required';
  end if;

  insert into public.access_profiles (name, description, active)
  values (v_name, trim(coalesce(p_description, '')), true)
  returning
    access_profiles.id,
    access_profiles.name,
    access_profiles.description,
    access_profiles.active,
    access_profiles.created_at,
    access_profiles.updated_at
  into id, name, description, active, created_at, updated_at;

  return next;
end;
$$;

create or replace function public.update_access_profile(
  p_actor_user_id uuid,
  p_profile_id uuid,
  p_name text,
  p_description text,
  p_active boolean
)
returns table (
  id uuid,
  name text,
  description text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
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

  if v_name = '' then
    raise exception 'profile_name_required';
  end if;

  update public.access_profiles p
  set
    name = v_name,
    description = trim(coalesce(p_description, '')),
    active = coalesce(p_active, p.active)
  where p.id = p_profile_id
  returning p.id, p.name, p.description, p.active, p.created_at, p.updated_at
  into id, name, description, active, created_at, updated_at;

  if id is null then
    raise exception 'profile_not_found';
  end if;

  return next;
end;
$$;

create or replace function public.list_access_profile_permissions(
  p_actor_user_id uuid,
  p_profile_id uuid
)
returns table (
  module_key text,
  module_label text,
  can_view boolean,
  can_edit boolean,
  can_manage boolean
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

  if not exists (select 1 from public.access_profiles where id = p_profile_id) then
    raise exception 'profile_not_found';
  end if;

  return query
  with modules as (
    select m.module_key, m.module_label
    from public.list_access_modules(p_actor_user_id) m
  )
  select
    m.module_key,
    m.module_label,
    coalesce(p.can_view, false) as can_view,
    coalesce(p.can_edit, false) as can_edit,
    coalesce(p.can_manage, false) as can_manage
  from modules m
  left join public.access_profile_permissions p
    on p.profile_id = p_profile_id
   and p.module_key = m.module_key
  order by m.module_label;
end;
$$;

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

  insert into public.access_profile_permissions (
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
  on conflict (profile_id, module_key) do update
    set
      can_view = excluded.can_view,
      can_edit = excluded.can_edit,
      can_manage = excluded.can_manage
  returning
    access_profile_permissions.profile_id,
    access_profile_permissions.module_key,
    access_profile_permissions.can_view,
    access_profile_permissions.can_edit,
    access_profile_permissions.can_manage
  into profile_id, module_key, can_view, can_edit, can_manage;

  return next;
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

  insert into public.user_profile_bindings (user_id, profile_id)
  values (p_target_user_id, p_profile_id)
  on conflict (user_id) do update
    set profile_id = excluded.profile_id
  returning
    user_profile_bindings.user_id,
    user_profile_bindings.profile_id,
    user_profile_bindings.updated_at
  into user_id, profile_id, updated_at;

  select p.name into profile_name
  from public.access_profiles p
  where p.id = profile_id;

  return next;
end;
$$;

create or replace function public.update_app_user_role(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_role text
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
set search_path = public
as $$
declare
  v_role text := lower(trim(coalesce(p_role, '')));
  v_target public.app_users%rowtype;
  v_admin_count integer := 0;
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

  if v_role not in ('admin', 'user') then
    raise exception 'invalid_role';
  end if;

  select * into v_target
  from public.app_users
  where id = p_target_user_id
  limit 1;

  if not found then
    raise exception 'user_not_found';
  end if;

  if p_actor_user_id = p_target_user_id then
    raise exception 'cannot_change_own_role';
  end if;

  if v_target.role = 'admin' and v_role = 'user' then
    select count(*) into v_admin_count
    from public.app_users u
    where u.role = 'admin'
      and u.active;
    if v_admin_count <= 1 then
      raise exception 'cannot_remove_last_admin';
    end if;
  end if;

  update public.app_users u
  set role = v_role
  where u.id = p_target_user_id
  returning u.id, u.username, u.role, u.active, u.created_at, u.updated_at
  into id, username, role, active, created_at, updated_at;

  return next;
end;
$$;

create or replace function public.admin_reset_app_user_password(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_new_password text
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

  if length(coalesce(p_new_password, '')) < 6 then
    raise exception 'password_too_short';
  end if;

  update public.app_users u
  set password_hash = crypt(p_new_password, gen_salt('bf'))
  where u.id = p_target_user_id
  returning u.id, u.username, u.role, u.active, u.created_at, u.updated_at
  into id, username, role, active, created_at, updated_at;

  if id is null then
    raise exception 'user_not_found';
  end if;

  return next;
end;
$$;

grant execute on function public.list_access_modules(uuid) to anon, authenticated;
grant execute on function public.list_access_profiles(uuid) to anon, authenticated;
grant execute on function public.create_access_profile(uuid, text, text) to anon, authenticated;
grant execute on function public.update_access_profile(uuid, uuid, text, text, boolean) to anon, authenticated;
grant execute on function public.list_access_profile_permissions(uuid, uuid) to anon, authenticated;
grant execute on function public.upsert_access_profile_permission(uuid, uuid, text, boolean, boolean, boolean) to anon, authenticated;
grant execute on function public.list_app_users_with_access_profile(uuid) to anon, authenticated;
grant execute on function public.set_user_access_profile(uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.update_app_user_role(uuid, uuid, text) to anon, authenticated;
grant execute on function public.admin_reset_app_user_password(uuid, uuid, text) to anon, authenticated;
