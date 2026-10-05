-- Slimpath — Supabase schema
-- Run once in Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Every table is protected by Row Level Security: a signed-in user can only
-- read and write their own rows, so the public anon key is safe to ship.

-- ---------- profile / programme settings ----------
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  settings   jsonb not null default '{}'::jsonb,   -- startDate, sex, startWeight, goalWeight
  updated_at timestamptz not null default now()
);

-- ---------- one row per user per day ----------
create table if not exists public.entries (
  user_id         uuid not null references auth.users (id) on delete cascade,
  date            date not null,
  data            jsonb not null,                  -- the full daily journal
  weight          numeric,
  body_fat        numeric,
  water_glasses   int,
  sleep_hours     int,
  mood            text,
  exercise_kcal   int,
  relax_mins      int,
  checklist_done  int not null default 0,
  checklist_total int not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (user_id, date)
);

-- ---------- meal photos (files live in the storage bucket) ----------
create table if not exists public.photos (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null,
  meal       text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  path       text not null,                        -- <user_id>/<date>/<file>
  created_at timestamptz not null default now()
);
create index if not exists photos_user_date on public.photos (user_id, date);

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.entries  enable row level security;
alter table public.photos   enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own entries" on public.entries;
create policy "own entries" on public.entries
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own photos" on public.photos;
create policy "own photos" on public.photos
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- private storage bucket for meal photos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', false, 12582912, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Files must sit under a folder named after the owner's user id.
drop policy if exists "own photo files read" on storage.objects;
create policy "own photo files read" on storage.objects
  for select to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own photo files write" on storage.objects;
create policy "own photo files write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own photo files delete" on storage.objects;
create policy "own photo files delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
