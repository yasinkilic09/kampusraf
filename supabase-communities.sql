-- KampüsRaf topluluk altyapısı
-- Supabase SQL Editor içinde bir kez çalıştır.

create extension if not exists pgcrypto;

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  category text not null default 'okuma_grubu',
  university text,
  city text,
  visibility text not null default 'public',
  cover_url text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  member_count integer not null default 0,
  book_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communities_visibility_check check (visibility in ('public', 'private')),
  constraint communities_category_check check (
    category in (
      'okuma_grubu',
      'universite',
      'kulup',
      'ders',
      'kampus',
      'takas'
    )
  )
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id),
  constraint community_members_role_check check (role in ('owner', 'moderator', 'member')),
  constraint community_members_status_check check (status in ('active', 'pending', 'blocked'))
);

create index if not exists communities_directory_idx
  on public.communities (is_active, visibility, category, created_at desc);

create index if not exists communities_owner_idx
  on public.communities (owner_id, created_at desc);

create index if not exists community_members_user_idx
  on public.community_members (user_id, status, joined_at desc);

create index if not exists community_members_community_idx
  on public.community_members (community_id, status, joined_at desc);

create or replace function public.normalize_community_slug(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(value, 'topluluk')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.touch_communities_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists communities_touch_updated_at on public.communities;

create trigger communities_touch_updated_at
before update on public.communities
for each row
execute function public.touch_communities_updated_at();

create or replace function public.refresh_community_member_count(p_community_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer := 0;
begin
  select count(*)::integer
  into next_count
  from public.community_members
  where community_id = p_community_id
    and status = 'active';

  update public.communities
  set member_count = next_count
  where id = p_community_id;

  return next_count;
end;
$$;

create or replace function public.sync_community_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_community_member_count(old.community_id);
    return old;
  end if;

  perform public.refresh_community_member_count(new.community_id);
  return new;
end;
$$;

drop trigger if exists community_members_sync_count on public.community_members;

create trigger community_members_sync_count
after insert or update of status or delete on public.community_members
for each row
execute function public.sync_community_member_count();

create or replace function public.create_community(
  p_name text,
  p_description text default null,
  p_category text default 'okuma_grubu',
  p_university text default null,
  p_city text default null,
  p_visibility text default 'public'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  base_slug text;
  final_slug text;
  suffix integer := 1;
  community_id uuid;
  safe_category text := coalesce(nullif(p_category, ''), 'okuma_grubu');
  safe_visibility text := coalesce(nullif(p_visibility, ''), 'public');
begin
  if current_user_id is null then
    raise exception 'Oturum gerekli.';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Topluluk adı gerekli.';
  end if;

  if safe_category not in ('okuma_grubu', 'universite', 'kulup', 'ders', 'kampus', 'takas') then
    safe_category := 'okuma_grubu';
  end if;

  if safe_visibility not in ('public', 'private') then
    safe_visibility := 'public';
  end if;

  base_slug := public.normalize_community_slug(p_name);
  if base_slug = '' then
    base_slug := 'topluluk';
  end if;

  final_slug := base_slug;

  while exists(select 1 from public.communities where slug = final_slug) loop
    suffix := suffix + 1;
    final_slug := base_slug || '-' || suffix::text;
  end loop;

  insert into public.communities (
    slug,
    name,
    description,
    category,
    university,
    city,
    visibility,
    owner_id,
    member_count
  )
  values (
    final_slug,
    trim(p_name),
    nullif(trim(coalesce(p_description, '')), ''),
    safe_category,
    nullif(trim(coalesce(p_university, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    safe_visibility,
    current_user_id,
    1
  )
  returning id into community_id;

  insert into public.community_members (community_id, user_id, role, status)
  values (community_id, current_user_id, 'owner', 'active')
  on conflict (community_id, user_id)
  do update set role = 'owner', status = 'active';

  return community_id;
end;
$$;

create or replace function public.join_community(p_community_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_visibility text;
begin
  if current_user_id is null then
    raise exception 'Oturum gerekli.';
  end if;

  select visibility
  into target_visibility
  from public.communities
  where id = p_community_id
    and is_active is true;

  if target_visibility is null then
    raise exception 'Topluluk bulunamadı.';
  end if;

  insert into public.community_members (community_id, user_id, role, status)
  values (
    p_community_id,
    current_user_id,
    'member',
    case when target_visibility = 'private' then 'pending' else 'active' end
  )
  on conflict (community_id, user_id)
  do update set
    status = excluded.status,
    joined_at = now();
end;
$$;

create or replace function public.leave_community(p_community_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  owner_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Oturum gerekli.';
  end if;

  select count(*)::integer
  into owner_count
  from public.community_members
  where community_id = p_community_id
    and role = 'owner'
    and status = 'active';

  if exists(
    select 1
    from public.community_members
    where community_id = p_community_id
      and user_id = current_user_id
      and role = 'owner'
      and owner_count <= 1
  ) then
    raise exception 'Tek kurucu topluluktan ayrılamaz.';
  end if;

  delete from public.community_members
  where community_id = p_community_id
    and user_id = current_user_id;
end;
$$;

grant execute on function public.create_community(text, text, text, text, text, text) to authenticated;
grant execute on function public.join_community(uuid) to authenticated;
grant execute on function public.leave_community(uuid) to authenticated;
grant execute on function public.refresh_community_member_count(uuid) to authenticated;
