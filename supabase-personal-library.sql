-- KampusRaf personal library split
-- Run this once in Supabase SQL editor before using the unlimited Sanal Kitaplik flow.

alter table public.user_books
  add column if not exists library_scope text not null default 'exchange';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_books_library_scope_check'
  ) then
    alter table public.user_books
      add constraint user_books_library_scope_check
      check (library_scope in ('exchange', 'personal'));
  end if;
end $$;

update public.user_books
set library_scope = 'exchange'
where library_scope is null;

create index if not exists user_books_user_scope_created_idx
  on public.user_books (user_id, library_scope, created_at desc);

create index if not exists user_books_exchange_visible_idx
  on public.user_books (user_id, created_at desc)
  where library_scope = 'exchange' and is_active = true;

create index if not exists user_books_personal_idx
  on public.user_books (user_id, created_at desc)
  where library_scope = 'personal';
