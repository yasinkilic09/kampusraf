-- KampüsRaf paket bazlı harita yakınlığı eşleşme altyapısı
-- Supabase SQL Editor içinde supabase-location-map.sql sonrasında çalıştır.

alter table if exists public.profiles
  add column if not exists match_distance_preference_enabled boolean not null default true,
  add column if not exists match_distance_radius_km integer not null default 10,
  add column if not exists match_distance_updated_at timestamptz;

comment on column public.profiles.match_distance_preference_enabled is
  'Kullanıcının harita yakınlığını eşleşme puanında kullanma tercihi.';

comment on column public.profiles.match_distance_radius_km is
  'Paket limitine göre yakınlık eşleşmesi yarıçapı.';

create or replace function public.match_distance_radius_cap(p_plan_type text)
returns integer
language sql
immutable
as $$
  select case
    when p_plan_type = 'pro' then 50
    when p_plan_type = 'premium' then 50
    when p_plan_type = 'plus' then 25
    else 10
  end;
$$;

create or replace function public.match_distance_boost_cap(p_plan_type text)
returns numeric
language sql
immutable
as $$
  select case
    when p_plan_type = 'pro' then 24
    when p_plan_type = 'premium' then 20
    when p_plan_type = 'plus' then 14
    else 8
  end;
$$;

create or replace function public.clamp_profile_distance_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  radius_cap integer;
begin
  radius_cap := public.match_distance_radius_cap(coalesce(new.plan_type, 'free'));

  if new.match_distance_radius_km is null then
    new.match_distance_radius_km := least(
      case
        when coalesce(new.plan_type, 'free') = 'pro' then 35
        when coalesce(new.plan_type, 'free') = 'premium' then 25
        when coalesce(new.plan_type, 'free') = 'plus' then 15
        else 10
      end,
      radius_cap
    );
  end if;

  new.match_distance_radius_km := least(greatest(new.match_distance_radius_km, 1), radius_cap);

  if new.match_distance_preference_enabled is null then
    new.match_distance_preference_enabled := true;
  end if;

  if tg_op = 'INSERT' then
    new.match_distance_updated_at := now();
  elsif
    old.match_distance_radius_km is distinct from new.match_distance_radius_km
    or old.match_distance_preference_enabled is distinct from new.match_distance_preference_enabled
    or old.plan_type is distinct from new.plan_type
  then
    new.match_distance_updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_clamp_distance_preferences_before_write on public.profiles;

create trigger profiles_clamp_distance_preferences_before_write
before insert or update of plan_type, match_distance_radius_km, match_distance_preference_enabled
on public.profiles
for each row
execute function public.clamp_profile_distance_preferences();

update public.profiles
set
  match_distance_preference_enabled = coalesce(match_distance_preference_enabled, true),
  match_distance_radius_km = least(
    greatest(
      coalesce(
        match_distance_radius_km,
        case
          when coalesce(plan_type, 'free') = 'pro' then 35
          when coalesce(plan_type, 'free') = 'premium' then 25
          when coalesce(plan_type, 'free') = 'plus' then 15
          else 10
        end
      ),
      1
    ),
    public.match_distance_radius_cap(coalesce(plan_type, 'free'))
  ),
  match_distance_updated_at = coalesce(match_distance_updated_at, now());

create index if not exists profiles_distance_preferences_idx
  on public.profiles (plan_type, match_distance_radius_km);

create index if not exists book_matches_request_book_lookup_idx
  on public.book_matches (request_id, user_book_id);

create index if not exists book_matches_user_status_lookup_idx
  on public.book_matches (requester_id, owner_id, status, created_at desc);

create index if not exists book_requests_active_user_lookup_idx
  on public.book_requests (user_id, is_active, status, created_at desc);

create index if not exists user_books_match_candidate_lookup_idx
  on public.user_books (user_id, is_active, status, exchange_type, created_at desc);

create or replace function public.safe_text_match_points(
  requested text,
  offered text,
  exact_points numeric,
  contains_points numeric
)
returns numeric
language sql
immutable
as $$
  select case
    when nullif(trim(coalesce(requested, '')), '') is null
      or nullif(trim(coalesce(offered, '')), '') is null then 0
    when lower(trim(requested)) = lower(trim(offered)) then exact_points
    when lower(offered) like '%' || lower(trim(requested)) || '%'
      or lower(requested) like '%' || lower(trim(offered)) || '%' then contains_points
    else 0
  end;
$$;

create or replace function public.distance_km(
  p_from_lat double precision,
  p_from_lng double precision,
  p_to_lat double precision,
  p_to_lng double precision
)
returns double precision
language sql
immutable
as $$
  select (
    6371 * 2 * asin(
      sqrt(
        power(sin(radians((p_to_lat - p_from_lat) / 2)), 2)
        + cos(radians(p_from_lat))
        * cos(radians(p_to_lat))
        * power(sin(radians((p_to_lng - p_from_lng) / 2)), 2)
      )
    )
  )::double precision;
$$;

create or replace function public.calculate_book_match_score(
  p_request_id uuid,
  p_user_book_id uuid
)
returns table (
  match_score numeric,
  match_level text,
  match_reason text,
  score_breakdown jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  request_row record;
  user_book_row record;
  requester_profile record;
  owner_profile record;
  offered_title text;
  offered_author text;
  offered_category text;
  title_points numeric := 0;
  author_points numeric := 0;
  category_points numeric := 0;
  city_points numeric := 0;
  university_points numeric := 0;
  trust_points numeric := 0;
  verified_points numeric := 0;
  exchange_points numeric := 0;
  recency_points numeric := 0;
  gender_points numeric := 0;
  distance_points numeric := 0;
  distance_value double precision := null;
  distance_radius integer := 0;
  distance_cap integer := 0;
  distance_boost_cap numeric := 0;
  total_score numeric := 0;
  final_level text := 'normal';
  final_reason text := 'Temel kitap uyumu üzerinden oluşturuldu.';
begin
  select *
  into request_row
  from public.book_requests
  where id = p_request_id
    and coalesce(is_active, true) is true
    and coalesce(status, 'active') in ('active', 'open')
  limit 1;

  if not found then
    return;
  end if;

  select
    ub.*,
    b.title as catalog_title,
    b.author as catalog_author,
    b.category as catalog_category
  into user_book_row
  from public.user_books ub
  join public.books b on b.id = ub.book_id
  where ub.id = p_user_book_id
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
  limit 1;

  if not found or request_row.user_id = user_book_row.user_id then
    return;
  end if;

  select *
  into requester_profile
  from public.profiles
  where id = request_row.user_id
  limit 1;

  select *
  into owner_profile
  from public.profiles
  where id = user_book_row.user_id
  limit 1;

  offered_title := coalesce(nullif(user_book_row.custom_title, ''), user_book_row.catalog_title);
  offered_author := coalesce(nullif(user_book_row.custom_author, ''), user_book_row.catalog_author);
  offered_category := user_book_row.catalog_category;

  title_points := public.safe_text_match_points(request_row.title, offered_title, 30, 24);
  author_points := public.safe_text_match_points(request_row.author, offered_author, 20, 14);
  category_points := public.safe_text_match_points(request_row.category, offered_category, 10, 6);
  city_points := public.safe_text_match_points(request_row.city, user_book_row.city, 8, 6);
  university_points := public.safe_text_match_points(request_row.university, user_book_row.university, 12, 8);
  trust_points := least(coalesce(owner_profile.trust_score, 0) / 10.0, 10);
  verified_points := case
    when coalesce(owner_profile.is_verified, false) is true
      or owner_profile.verification_status = 'verified' then 8
    else 0
  end;
  exchange_points := least(coalesce(owner_profile.completed_exchange_count, 0), 5);
  recency_points := case
    when user_book_row.created_at >= now() - interval '30 days' then 5
    when user_book_row.created_at >= now() - interval '90 days' then 3
    else 1
  end;
  gender_points := case
    when requester_profile.match_gender_preference in ('male', 'female')
      and owner_profile.gender = requester_profile.match_gender_preference then 8
    else 0
  end;

  distance_cap := public.match_distance_radius_cap(coalesce(requester_profile.plan_type, 'free'));
  distance_boost_cap := public.match_distance_boost_cap(coalesce(requester_profile.plan_type, 'free'));
  distance_radius := least(
    greatest(coalesce(requester_profile.match_distance_radius_km, distance_cap), 1),
    distance_cap
  );

  if
    coalesce(requester_profile.match_distance_preference_enabled, true) is true
    and requester_profile.location_lat is not null
    and requester_profile.location_lng is not null
    and user_book_row.location_lat is not null
    and user_book_row.location_lng is not null
  then
    distance_value := public.distance_km(
      requester_profile.location_lat,
      requester_profile.location_lng,
      user_book_row.location_lat,
      user_book_row.location_lng
    );

    if distance_value <= distance_radius then
      distance_points := greatest(
        0,
        round((distance_boost_cap * (1 - (distance_value / greatest(distance_radius, 1))))::numeric, 2)
      );
    end if;
  end if;

  total_score := least(
    100,
    greatest(
      0,
      title_points
      + author_points
      + category_points
      + city_points
      + university_points
      + trust_points
      + verified_points
      + exchange_points
      + recency_points
      + gender_points
      + distance_points
    )
  );

  final_level := case
    when total_score >= 85 then 'super'
    when total_score >= 70 then 'strong'
    when total_score >= 50 then 'good'
    else 'normal'
  end;

  final_reason := case
    when distance_points > 0 and total_score >= 70 then
      'Kitap uyumu ve harita yakınlığı güçlü. Yaklaşık ' ||
      round(distance_value::numeric, 1)::text || ' km yakınında.'
    when distance_points > 0 then
      'Kitap uyumu var ve raf yaklaşık ' ||
      round(distance_value::numeric, 1)::text || ' km yakınında.'
    when university_points > 0 then
      'Kitap uyumu ve üniversite bilgisi eşleşiyor.'
    when city_points > 0 then
      'Kitap uyumu ve şehir bilgisi eşleşiyor.'
    else
      'Kitap adı, yazar, kategori ve güven sinyalleri üzerinden oluşturuldu.'
  end;

  match_score := round(total_score, 2);
  match_level := final_level;
  match_reason := final_reason;
  score_breakdown := jsonb_build_object(
    'title_points', title_points,
    'author_points', author_points,
    'category_points', category_points,
    'city_points', city_points,
    'university_points', university_points,
    'trust_points', round(trust_points, 2),
    'verified_points', verified_points,
    'exchange_points', exchange_points,
    'recency_points', recency_points,
    'gender_points', gender_points,
    'distance_points', round(distance_points, 2),
    'distance_km', case when distance_value is null then null else round(distance_value::numeric, 2) end,
    'distance_radius_km', distance_radius,
    'distance_plan_cap_km', distance_cap,
    'distance_preference_enabled', coalesce(requester_profile.match_distance_preference_enabled, true),
    'requester_plan_type', coalesce(requester_profile.plan_type, 'free')
  );

  return next;
end;
$$;

create or replace function public.upsert_book_match_score(
  p_request_id uuid,
  p_user_book_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row record;
  user_book_row record;
  score_row record;
  existing_match record;
begin
  select * into request_row from public.book_requests where id = p_request_id limit 1;

  if not found then
    return;
  end if;

  select * into user_book_row from public.user_books where id = p_user_book_id limit 1;

  if not found then
    return;
  end if;

  select id, status
  into existing_match
  from public.book_matches
  where request_id = p_request_id
    and user_book_id = p_user_book_id
  order by created_at desc
  limit 1;

  select *
  into score_row
  from public.calculate_book_match_score(p_request_id, p_user_book_id)
  limit 1;

  if score_row.match_score is null or score_row.match_score < 25 then
    if existing_match.id is not null and coalesce(existing_match.status, 'pending') = 'pending' then
      delete from public.book_matches where id = existing_match.id;
    end if;

    return;
  end if;

  if existing_match.id is not null then
    update public.book_matches
    set
      requester_id = request_row.user_id,
      owner_id = user_book_row.user_id,
      match_score = score_row.match_score,
      match_level = score_row.match_level,
      match_reason = score_row.match_reason,
      score_breakdown = score_row.score_breakdown,
      last_scored_at = now()
    where id = existing_match.id;
  else
    insert into public.book_matches (
      request_id,
      user_book_id,
      requester_id,
      owner_id,
      match_score,
      match_level,
      match_reason,
      score_breakdown,
      status,
      last_scored_at
    )
    values (
      p_request_id,
      p_user_book_id,
      request_row.user_id,
      user_book_row.user_id,
      score_row.match_score,
      score_row.match_level,
      score_row.match_reason,
      score_row.score_breakdown,
      'pending',
      now()
    );
  end if;
end;
$$;

create or replace function public.create_matches_for_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row record;
  book_row record;
begin
  select * into request_row from public.book_requests where id = p_request_id limit 1;

  if not found then
    return;
  end if;

  for book_row in
    select id
    from public.user_books
    where user_id <> request_row.user_id
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
      )
  loop
    perform public.upsert_book_match_score(p_request_id, book_row.id);
  end loop;
end;
$$;

create or replace function public.create_matches_for_user_book(p_user_book_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  user_book_row record;
  request_row record;
begin
  select * into user_book_row from public.user_books where id = p_user_book_id limit 1;

  if not found then
    return;
  end if;

  for request_row in
    select id
    from public.book_requests
    where user_id <> user_book_row.user_id
      and coalesce(is_active, true) is true
      and coalesce(status, 'active') in ('active', 'open')
  loop
    perform public.upsert_book_match_score(request_row.id, p_user_book_id);
  end loop;
end;
$$;

create or replace function public.refresh_matches_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row record;
  book_row record;
  existing_match record;
begin
  for request_row in
    select id
    from public.book_requests
    where user_id = p_user_id
      and coalesce(is_active, true) is true
      and coalesce(status, 'active') in ('active', 'open')
  loop
    perform public.create_matches_for_request(request_row.id);
  end loop;

  for book_row in
    select id
    from public.user_books
    where user_id = p_user_id
      and coalesce(is_active, true) is true
      and coalesce(status, 'mevcut') in ('mevcut', 'available')
  loop
    perform public.create_matches_for_user_book(book_row.id);
  end loop;

  for existing_match in
    select id, request_id, user_book_id
    from public.book_matches
    where requester_id = p_user_id or owner_id = p_user_id
  loop
    perform public.upsert_book_match_score(existing_match.request_id, existing_match.user_book_id);
  end loop;
end;
$$;

grant execute on function public.create_matches_for_request(uuid) to authenticated;
grant execute on function public.create_matches_for_user_book(uuid) to authenticated;
grant execute on function public.refresh_matches_for_user(uuid) to authenticated;
