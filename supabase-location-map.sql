-- KampüsRaf konumlu kitap haritası altyapısı
-- Supabase SQL Editor içinde bir kez çalıştır.

alter table if exists public.profiles
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision,
  add column if not exists location_accuracy_m integer,
  add column if not exists location_sharing_enabled boolean not null default false,
  add column if not exists location_updated_at timestamptz;

alter table if exists public.user_books
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision,
  add column if not exists location_source text,
  add column if not exists location_shared_at timestamptz;

create index if not exists profiles_location_enabled_idx
  on public.profiles (location_sharing_enabled)
  where location_sharing_enabled is true;

create index if not exists user_books_location_lookup_idx
  on public.user_books (is_active, status, exchange_type, location_lat, location_lng)
  where location_lat is not null and location_lng is not null;

comment on column public.profiles.location_lat is
  'Yaklaşıklaştırılmış kullanıcı konumu. Kesin adres saklanmamalı.';

comment on column public.profiles.location_lng is
  'Yaklaşıklaştırılmış kullanıcı konumu. Kesin adres saklanmamalı.';

comment on column public.user_books.location_lat is
  'Harita için yaklaşık kitap konumu. Profil konumundan türetilir.';

comment on column public.user_books.location_lng is
  'Harita için yaklaşık kitap konumu. Profil konumundan türetilir.';

create or replace function public.sync_user_book_location_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_profile record;
begin
  if new.user_id is null then
    new.location_lat := null;
    new.location_lng := null;
    new.location_source := null;
    new.location_shared_at := null;
    return new;
  end if;

  select
    location_sharing_enabled,
    location_lat,
    location_lng
  into owner_profile
  from public.profiles
  where id = new.user_id
  limit 1;

  if
    coalesce(new.is_active, true) is true
    and coalesce(new.status, 'mevcut') in ('mevcut', 'available')
    and coalesce(new.exchange_type, '') in (
      'takas',
      'odunc',
      'satis',
      'bagis',
      'lend',
      'sell',
      'donation'
    )
    and coalesce(owner_profile.location_sharing_enabled, false) is true
    and owner_profile.location_lat is not null
    and owner_profile.location_lng is not null
  then
    new.location_lat := owner_profile.location_lat;
    new.location_lng := owner_profile.location_lng;
    new.location_source := 'profile';
    new.location_shared_at := coalesce(new.location_shared_at, now());
  else
    new.location_lat := null;
    new.location_lng := null;
    new.location_source := null;
    new.location_shared_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists user_books_sync_location_before_write on public.user_books;

create trigger user_books_sync_location_before_write
before insert or update of user_id, is_active, status, exchange_type
on public.user_books
for each row
execute function public.sync_user_book_location_from_profile();

create or replace function public.propagate_profile_location_to_books()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if
    coalesce(new.location_sharing_enabled, false) is true
    and new.location_lat is not null
    and new.location_lng is not null
  then
    update public.user_books
    set
      location_lat = new.location_lat,
      location_lng = new.location_lng,
      location_source = 'profile',
      location_shared_at = now()
    where user_id = new.id
      and coalesce(is_active, true) is true
      and coalesce(status, 'mevcut') in ('mevcut', 'available')
      and coalesce(exchange_type, '') in (
        'takas',
        'odunc',
        'satis',
        'bagis',
        'lend',
        'sell',
        'donation'
      );
  else
    update public.user_books
    set
      location_lat = null,
      location_lng = null,
      location_source = null,
      location_shared_at = null
    where user_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_propagate_location_after_write on public.profiles;

create trigger profiles_propagate_location_after_write
after update of location_lat, location_lng, location_sharing_enabled
on public.profiles
for each row
execute function public.propagate_profile_location_to_books();

create or replace function public.refresh_user_book_locations(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer := 0;
begin
  update public.user_books ub
  set
    location_lat = p.location_lat,
    location_lng = p.location_lng,
    location_source = 'profile',
    location_shared_at = coalesce(ub.location_shared_at, now())
  from public.profiles p
  where p.id = p_user_id
    and ub.user_id = p.id
    and coalesce(p.location_sharing_enabled, false) is true
    and p.location_lat is not null
    and p.location_lng is not null
    and coalesce(ub.is_active, true) is true
    and coalesce(ub.status, 'mevcut') in ('mevcut', 'available')
    and coalesce(ub.exchange_type, '') in (
      'takas',
      'odunc',
      'satis',
      'bagis',
      'lend',
      'sell',
      'donation'
    )
    and (
      ub.location_lat is distinct from p.location_lat
      or ub.location_lng is distinct from p.location_lng
      or ub.location_source is distinct from 'profile'
    );

  get diagnostics affected_count = row_count;

  update public.user_books ub
  set
    location_lat = null,
    location_lng = null,
    location_source = null,
    location_shared_at = null
  from public.profiles p
  where p.id = p_user_id
    and ub.user_id = p.id
    and (
      coalesce(p.location_sharing_enabled, false) is false
      or p.location_lat is null
      or p.location_lng is null
      or coalesce(ub.is_active, true) is false
      or coalesce(ub.status, 'mevcut') not in ('mevcut', 'available')
      or coalesce(ub.exchange_type, '') not in (
        'takas',
        'odunc',
        'satis',
        'bagis',
        'lend',
        'sell',
        'donation'
      )
    )
    and (ub.location_lat is not null or ub.location_lng is not null);

  return affected_count;
end;
$$;

create or replace function public.backfill_existing_book_locations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer := 0;
begin
  update public.user_books ub
  set
    location_lat = p.location_lat,
    location_lng = p.location_lng,
    location_source = 'profile',
    location_shared_at = coalesce(ub.location_shared_at, now())
  from public.profiles p
  where ub.user_id = p.id
    and coalesce(p.location_sharing_enabled, false) is true
    and p.location_lat is not null
    and p.location_lng is not null
    and coalesce(ub.is_active, true) is true
    and coalesce(ub.status, 'mevcut') in ('mevcut', 'available')
    and coalesce(ub.exchange_type, '') in (
      'takas',
      'odunc',
      'satis',
      'bagis',
      'lend',
      'sell',
      'donation'
    )
    and (
      ub.location_lat is null
      or ub.location_lng is null
      or ub.location_source is distinct from 'profile'
    );

  get diagnostics affected_count = row_count;

  return affected_count;
end;
$$;

select public.backfill_existing_book_locations();

create or replace function public.nearby_exchange_books(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 15,
  p_limit integer default 80
)
returns table (
  user_book_id uuid,
  book_id uuid,
  title text,
  author text,
  cover_url text,
  exchange_type text,
  condition text,
  note text,
  city text,
  university text,
  owner_id uuid,
  owner_name text,
  owner_username text,
  owner_avatar_url text,
  owner_university text,
  owner_city text,
  location_lat double precision,
  location_lng double precision,
  distance_km double precision
)
language sql
stable
security definer
set search_path = public
as $$
  with candidate_books as (
    select
      ub.id as user_book_id,
      ub.book_id,
      coalesce(nullif(ub.custom_title, ''), b.title)::text as title,
      coalesce(nullif(ub.custom_author, ''), b.author)::text as author,
      coalesce(nullif(ub.image_url, ''), b.cover_url)::text as cover_url,
      ub.exchange_type::text,
      ub.condition::text,
      ub.note::text,
      ub.city::text,
      ub.university::text,
      p.id as owner_id,
      p.full_name::text as owner_name,
      p.username::text as owner_username,
      p.avatar_url::text as owner_avatar_url,
      p.university::text as owner_university,
      p.city::text as owner_city,
      round(ub.location_lat::numeric, 3)::double precision as location_lat,
      round(ub.location_lng::numeric, 3)::double precision as location_lng,
      (
        6371 * 2 * asin(
          sqrt(
            power(sin(radians((ub.location_lat - p_lat) / 2)), 2)
            + cos(radians(p_lat))
            * cos(radians(ub.location_lat))
            * power(sin(radians((ub.location_lng - p_lng) / 2)), 2)
          )
        )
      )::double precision as distance_km
    from public.user_books ub
    join public.books b on b.id = ub.book_id
    join public.profiles p on p.id = ub.user_id
    where auth.uid() is not null
      and ub.user_id <> auth.uid()
      and coalesce(ub.is_active, true) is true
      and coalesce(ub.status, 'mevcut') in ('mevcut', 'available')
      and coalesce(ub.exchange_type, '') in (
        'takas',
        'odunc',
        'satis',
        'bagis',
        'lend',
        'sell',
        'donation'
      )
      and coalesce(p.location_sharing_enabled, false) is true
      and ub.location_lat is not null
      and ub.location_lng is not null
      and p_lat between -90 and 90
      and p_lng between -180 and 180
  )
  select
    candidate_books.user_book_id,
    candidate_books.book_id,
    candidate_books.title,
    candidate_books.author,
    candidate_books.cover_url,
    candidate_books.exchange_type,
    candidate_books.condition,
    candidate_books.note,
    candidate_books.city,
    candidate_books.university,
    candidate_books.owner_id,
    candidate_books.owner_name,
    candidate_books.owner_username,
    candidate_books.owner_avatar_url,
    candidate_books.owner_university,
    candidate_books.owner_city,
    candidate_books.location_lat,
    candidate_books.location_lng,
    round(candidate_books.distance_km::numeric, 2)::double precision as distance_km
  from candidate_books
  where candidate_books.distance_km <= least(greatest(coalesce(p_radius_km, 15), 1), 50)
  order by candidate_books.distance_km asc
  limit least(greatest(coalesce(p_limit, 80), 1), 120);
$$;

grant execute on function public.nearby_exchange_books(
  double precision,
  double precision,
  double precision,
  integer
) to authenticated;

grant execute on function public.refresh_user_book_locations(uuid) to authenticated;
