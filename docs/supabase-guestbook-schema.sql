create extension if not exists pgcrypto;

create table if not exists public.guestbook_messages (
  id uuid primary key default gen_random_uuid(),
  author_name text not null check (char_length(author_name) between 2 and 40),
  content text not null check (char_length(content) between 4 and 1200),
  image_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'deleted')),
  created_at timestamptz not null default now()
);

create index if not exists guestbook_messages_public_idx
  on public.guestbook_messages (status, created_at desc);

alter table public.guestbook_messages enable row level security;

drop policy if exists "Anyone can read approved guestbook messages" on public.guestbook_messages;
drop policy if exists "Anyone can create pending guestbook messages" on public.guestbook_messages;

create policy "Anyone can read approved guestbook messages"
  on public.guestbook_messages
  for select
  using (status = 'approved');

create policy "Anyone can create pending guestbook messages"
  on public.guestbook_messages
  for insert
  with check (status = 'pending');

insert into storage.buckets (id, name, public)
values ('guestbook', 'guestbook', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Anyone can upload guestbook images" on storage.objects;
drop policy if exists "Anyone can read guestbook images" on storage.objects;

create policy "Anyone can upload guestbook images"
  on storage.objects
  for insert
  with check (bucket_id = 'guestbook');

create policy "Anyone can read guestbook images"
  on storage.objects
  for select
  using (bucket_id = 'guestbook');
