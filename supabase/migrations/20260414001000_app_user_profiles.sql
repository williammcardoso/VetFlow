create table if not exists public.app_user_profiles (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  crmv text not null default '',
  mapa_registration text not null default '',
  signature_text text not null default '',
  updated_at timestamptz not null default now()
);

create or replace function public.set_app_user_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_user_profiles_updated_at on public.app_user_profiles;
create trigger trg_app_user_profiles_updated_at
before update on public.app_user_profiles
for each row
execute function public.set_app_user_profiles_updated_at();

alter table public.app_user_profiles enable row level security;

drop policy if exists app_user_profiles_block_select on public.app_user_profiles;
create policy app_user_profiles_block_select
on public.app_user_profiles
for select
using (false);

drop policy if exists app_user_profiles_block_insert on public.app_user_profiles;
create policy app_user_profiles_block_insert
on public.app_user_profiles
for insert
with check (false);

drop policy if exists app_user_profiles_block_update on public.app_user_profiles;
create policy app_user_profiles_block_update
on public.app_user_profiles
for update
using (false)
with check (false);

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

  insert into public.app_user_profiles (user_id)
  values (p_actor_user_id)
  on conflict (user_id) do nothing;

  return query
  select p.user_id, p.full_name, p.email, p.crmv, p.mapa_registration, p.signature_text, p.updated_at
    from public.app_user_profiles p
   where p.user_id = p_actor_user_id;
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

  insert into public.app_user_profiles (
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
  on conflict (user_id) do update
    set
      full_name = excluded.full_name,
      email = excluded.email,
      crmv = excluded.crmv,
      mapa_registration = excluded.mapa_registration,
      signature_text = excluded.signature_text
  returning
    app_user_profiles.user_id,
    app_user_profiles.full_name,
    app_user_profiles.email,
    app_user_profiles.crmv,
    app_user_profiles.mapa_registration,
    app_user_profiles.signature_text,
    app_user_profiles.updated_at
  into user_id, full_name, email, crmv, mapa_registration, signature_text, updated_at;

  return next;
end;
$$;

grant execute on function public.get_my_app_user_profile(uuid) to anon, authenticated;
grant execute on function public.upsert_my_app_user_profile(uuid, text, text, text, text, text) to anon, authenticated;
