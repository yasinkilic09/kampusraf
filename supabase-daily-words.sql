-- KampüsRaf Günün Kelimesi altyapısı
-- Supabase SQL Editor içinde bir kez çalıştır.

create extension if not exists pgcrypto;

create table if not exists public.daily_words (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  meaning text not null,
  example_sentence text,
  category text,
  source_note text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_words_word_length check (char_length(trim(word)) between 2 and 80),
  constraint daily_words_meaning_length check (char_length(trim(meaning)) between 3 and 700)
);

create index if not exists daily_words_active_idx
  on public.daily_words (is_active, created_at desc);

create index if not exists daily_words_category_idx
  on public.daily_words (category, is_active);

create or replace function public.touch_daily_words_updated_at()
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

drop trigger if exists daily_words_touch_updated_at on public.daily_words;

create trigger daily_words_touch_updated_at
before update on public.daily_words
for each row
execute function public.touch_daily_words_updated_at();

alter table public.daily_words enable row level security;

drop policy if exists "Active daily words are readable" on public.daily_words;
create policy "Active daily words are readable"
on public.daily_words
for select
to authenticated
using (is_active = true);

drop policy if exists "Admins can read all daily words" on public.daily_words;
create policy "Admins can read all daily words"
on public.daily_words
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can insert daily words" on public.daily_words;
create policy "Admins can insert daily words"
on public.daily_words
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can update daily words" on public.daily_words;
create policy "Admins can update daily words"
on public.daily_words
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can delete daily words" on public.daily_words;
create policy "Admins can delete daily words"
on public.daily_words
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

insert into public.daily_words (word, meaning, example_sentence, category, source_note, is_active)
values
  (
    'Mütecessis',
    'Merak eden, bir şeyi öğrenmek için içten istek duyan kişi.',
    'Mütecessis bir okur, kitabın yalnızca olayını değil arkasındaki fikri de arar.',
    'Düşünce',
    'Başlangıç kelime havuzu',
    true
  ),
  (
    'Müktesebat',
    'Kazanılmış bilgi, birikim ve deneyimlerin bütünü.',
    'Her kitap, okurun müktesebatına küçük ama kalıcı bir iz bırakır.',
    'Eğitim',
    'Başlangıç kelime havuzu',
    true
  ),
  (
    'Teveccüh',
    'Yönelme, ilgi gösterme veya yakınlık duyma.',
    'Okurların teveccühü, raflarda bekleyen kitapları yeniden dolaşıma çıkarır.',
    'Sosyal',
    'Başlangıç kelime havuzu',
    true
  ),
  (
    'Muvazene',
    'Denge, ölçü ve uyum durumu.',
    'İyi bir okuma alışkanlığı merak ile disiplin arasında muvazene kurar.',
    'Hayat',
    'Başlangıç kelime havuzu',
    true
  )
on conflict do nothing;
