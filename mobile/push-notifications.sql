create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null,
  platform text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, expo_push_token)
);

create index if not exists user_push_tokens_user_id_idx
  on public.user_push_tokens (user_id);

alter table public.user_push_tokens enable row level security;

create policy "Users can read own push tokens"
  on public.user_push_tokens
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own push tokens"
  on public.user_push_tokens
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own push tokens"
  on public.user_push_tokens
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own push tokens"
  on public.user_push_tokens
  for delete
  to authenticated
  using (auth.uid() = user_id);
