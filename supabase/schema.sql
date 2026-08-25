-- Run this once in Supabase SQL Editor before using /admin.
create extension if not exists "uuid-ossp";

create table if not exists public.site_settings (
  id boolean primary key default true check (id),
  church_name text not null default 'Foursquare Gospel Church',
  media_name text not null default 'Foursquare Media',
  logo_url text,
  hero_title text not null default 'Every gathering, kept close.',
  hero_description text,
  featured_video_id text,
  footer_text text,
  social_links jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.video_metadata (
  drive_file_id text primary key,
  title text,
  description_markdown text,
  category text,
  thumbnail_url text,
  playback_url text,
  featured boolean not null default false,
  published boolean not null default true,
  display_order integer,
  allow_download boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  drive_file_id text not null,
  display_name text not null check (char_length(display_name) between 2 and 80),
  body text not null check (char_length(body) between 2 and 2000),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Views: one row per meaningful watch session.
create table if not exists public.video_views (
  id uuid primary key default uuid_generate_v4(),
  drive_file_id text not null,
  viewer_key text not null,
  created_at timestamptz not null default now()
);
create index if not exists video_views_file_idx on public.video_views (drive_file_id);
create index if not exists video_views_key_idx on public.video_views (viewer_key, drive_file_id);

-- Likes: one row per device/browser key per video.
create table if not exists public.video_likes (
  drive_file_id text not null,
  liker_key text not null,
  created_at timestamptz not null default now(),
  primary key (drive_file_id, liker_key)
);

-- Shares: one row per share action (a person can share the same video more than once).
create table if not exists public.video_shares (
  id uuid primary key default uuid_generate_v4(),
  drive_file_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists video_shares_file_idx on public.video_shares (drive_file_id);

alter table public.site_settings enable row level security;
alter table public.video_metadata enable row level security;
alter table public.comments enable row level security;
alter table public.video_views enable row level security;
alter table public.video_likes enable row level security;
alter table public.video_shares enable row level security;

create policy "public settings read" on public.site_settings for select using (true);
create policy "public published video metadata read" on public.video_metadata for select using (published = true);
create policy "public approved comments read" on public.comments for select using (approved = true);
create policy "public comment submission" on public.comments for insert with check (approved = false);
create policy "public view count read" on public.video_views for select using (true);
create policy "public view insert" on public.video_views for insert with check (true);
create policy "public like count read" on public.video_likes for select using (true);
create policy "public like insert" on public.video_likes for insert with check (true);
create policy "public like delete" on public.video_likes for delete using (true);
create policy "public share count read" on public.video_shares for select using (true);
create policy "public share insert" on public.video_shares for insert with check (true);

-- Admin writes are performed only from server routes using the service role key.
