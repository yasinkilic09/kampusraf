-- KampusRaf student verification and contact infrastructure
-- Run this file in Supabase SQL Editor.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists is_verified boolean default false,
  add column if not exists trust_score integer default 60,
  add column if not exists verification_status text default 'unverified',
  add column if not exists verification_method text,
  add column if not exists university_email text,
  add column if not exists verification_note text,
  add column if not exists verification_requested_at timestamptz,
  add column if not exists verification_verified_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_verification_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_verification_status_check
      check (verification_status in ('unverified', 'pending', 'verified', 'rejected'));
  end if;
end $$;

create table if not exists public.university_email_domains (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  university_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.university_email_domains (domain, university_name)
values
  ('adu.edu.tr', 'Aydin Adnan Menderes Universitesi'),
  ('ogr.adu.edu.tr', 'Aydin Adnan Menderes Universitesi'),
  ('pau.edu.tr', 'Pamukkale Universitesi'),
  ('ogr.pau.edu.tr', 'Pamukkale Universitesi'),
  ('mu.edu.tr', 'Mugla Sitki Kocman Universitesi'),
  ('ogr.mu.edu.tr', 'Mugla Sitki Kocman Universitesi'),
  ('cbu.edu.tr', 'Manisa Celal Bayar Universitesi'),
  ('ogr.cbu.edu.tr', 'Manisa Celal Bayar Universitesi')
on conflict (domain) do update
set university_name = excluded.university_name,
    is_active = true;

create table if not exists public.student_verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  university_email text not null,
  email_domain text not null,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  last_sent_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists student_verification_codes_user_active_idx
  on public.student_verification_codes (user_id, university_email, expires_at desc)
  where consumed_at is null;

alter table public.university_email_domains enable row level security;
alter table public.student_verification_codes enable row level security;

drop policy if exists "Public can read active university domains" on public.university_email_domains;
create policy "Public can read active university domains"
on public.university_email_domains
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins manage university domains" on public.university_email_domains;
create policy "Admins manage university domains"
on public.university_email_domains
for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Users can read own verification codes" on public.student_verification_codes;
create policy "Users can read own verification codes"
on public.student_verification_codes
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can create own verification codes" on public.student_verification_codes;
create policy "Users can create own verification codes"
on public.student_verification_codes
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own verification codes" on public.student_verification_codes;
create policy "Users can update own verification codes"
on public.student_verification_codes
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Admins manage verification codes" on public.student_verification_codes;
create policy "Admins manage verification codes"
on public.student_verification_codes
for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  source text not null default 'web',
  status text not null default 'new',
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_messages_status_check
    check (status in ('new', 'in_review', 'answered', 'closed', 'spam'))
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

create index if not exists contact_messages_user_id_idx
  on public.contact_messages (user_id, created_at desc);

alter table public.contact_messages enable row level security;

drop policy if exists "Anyone can create contact messages" on public.contact_messages;
create policy "Anyone can create contact messages"
on public.contact_messages
for insert
to anon, authenticated
with check (true);

drop policy if exists "Users can read own contact messages" on public.contact_messages;
create policy "Users can read own contact messages"
on public.contact_messages
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins manage contact messages" on public.contact_messages;
create policy "Admins manage contact messages"
on public.contact_messages
for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
