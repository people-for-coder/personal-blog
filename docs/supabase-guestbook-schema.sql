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

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 2 and 120),
  summary text not null default '' check (char_length(summary) <= 500),
  category text not null default 'Notes' check (char_length(category) <= 40),
  tags text[] not null default '{}',
  cover_image_url text,
  content_markdown text not null default '',
  is_published boolean not null default true,
  published_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_public_idx
  on public.blog_posts (is_published, published_at desc, created_at desc);

alter table public.blog_posts enable row level security;

drop policy if exists "Anyone can read published blog posts" on public.blog_posts;

create policy "Anyone can read published blog posts"
  on public.blog_posts
  for select
  using (is_published = true);

create table if not exists public.blog_writer_secrets (
  id boolean primary key default true,
  secret_hash text not null,
  updated_at timestamptz not null default now(),
  constraint blog_writer_secrets_single_row check (id = true)
);

revoke all on public.blog_writer_secrets from anon, authenticated;

-- Replace CHANGE_ME_WITH_A_LONG_PASSWORD before running this line for a new project.
insert into public.blog_writer_secrets (id, secret_hash)
values (true, extensions.crypt('CHANGE_ME_WITH_A_LONG_PASSWORD', extensions.gen_salt('bf')))
on conflict (id) do nothing;

create or replace function public.create_blog_post(
  p_writer_secret text,
  p_slug text,
  p_title text,
  p_summary text default '',
  p_category text default 'Notes',
  p_tags text[] default '{}',
  p_cover_image_url text default null,
  p_content_markdown text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_post public.blog_posts;
begin
  if not exists (
    select 1
    from public.blog_writer_secrets
    where id = true
      and secret_hash = extensions.crypt(p_writer_secret, secret_hash)
  ) then
    raise exception 'invalid writer secret' using errcode = '28000';
  end if;

  insert into public.blog_posts (
    slug,
    title,
    summary,
    category,
    tags,
    cover_image_url,
    content_markdown,
    is_published,
    published_at
  )
  values (
    p_slug,
    p_title,
    coalesce(p_summary, ''),
    coalesce(p_category, 'Notes'),
    coalesce(p_tags, '{}'),
    nullif(p_cover_image_url, ''),
    coalesce(p_content_markdown, ''),
    true,
    now()
  )
  returning * into inserted_post;

  return jsonb_build_object(
    'slug', inserted_post.slug,
    'title', inserted_post.title,
    'published_at', inserted_post.published_at
  );
end;
$$;

revoke all on function public.create_blog_post(text, text, text, text, text, text[], text, text) from public;
grant execute on function public.create_blog_post(text, text, text, text, text, text[], text, text) to anon, authenticated;

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_slug text not null references public.blog_posts(slug) on update cascade on delete cascade,
  author_name text not null check (char_length(author_name) between 2 and 40),
  content text not null check (char_length(content) between 2 and 1200),
  created_at timestamptz not null default now()
);

create index if not exists post_comments_slug_created_idx
  on public.post_comments (post_slug, created_at desc);

alter table public.post_comments enable row level security;

drop policy if exists "Anyone can read post comments" on public.post_comments;
drop policy if exists "Anyone can create post comments" on public.post_comments;

create policy "Anyone can read post comments"
  on public.post_comments
  for select
  using (true);

create policy "Anyone can create post comments"
  on public.post_comments
  for insert
  with check (
    exists (
      select 1
      from public.blog_posts
      where blog_posts.slug = post_comments.post_slug
        and blog_posts.is_published = true
    )
  );
