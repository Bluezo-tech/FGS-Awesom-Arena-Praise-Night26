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

alter table public.site_settings enable row level security;
alter table public.video_metadata enable row level security;
alter table public.comments enable row level security;

create policy "public settings read" on public.site_settings for select using (true);
create policy "public published video metadata read" on public.video_metadata for select using (published = true);
create policy "public approved comments read" on public.comments for select using (approved = true);
create policy "public comment submission" on public.comments for insert with check (approved = false);

-- Admin writes are performed only from server routes using the service role key.
