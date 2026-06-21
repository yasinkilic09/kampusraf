-- KampusRaf social feed save/bookmark support
-- Run once in Supabase SQL editor to enable saved posts.

create table if not exists public.post_saves (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint post_saves_post_user_unique unique (post_id, user_id)
);

alter table public.post_saves enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'post_saves'
      and policyname = 'Authenticated users can read social saves'
  ) then
    create policy "Authenticated users can read social saves"
      on public.post_saves
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'post_saves'
      and policyname = 'Users can save posts as themselves'
  ) then
    create policy "Users can save posts as themselves"
      on public.post_saves
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'post_saves'
      and policyname = 'Users can remove their own saved posts'
  ) then
    create policy "Users can remove their own saved posts"
      on public.post_saves
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

grant select, insert, delete on table public.post_saves to authenticated;

create index if not exists post_saves_post_created_idx
  on public.post_saves (post_id, created_at desc);

create index if not exists post_saves_user_created_idx
  on public.post_saves (user_id, created_at desc);
