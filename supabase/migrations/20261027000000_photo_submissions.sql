-- Acedle: community photo suggestions. Signed-in players can suggest a
-- Wikimedia Commons photo for a player-season (or for all of a player's
-- seasons); an admin reviews each one, and approved photos take their place on
-- the cards (src/lib/season-photo.ts). Only Commons files can be suggested, so
-- every photo is freely licensed and credited.
--
-- Everything is written by the server (service role) after it has checked the
-- file on Commons and who is asking.

create table public.photo_submissions (
  id uuid primary key default gen_random_uuid(),
  player_id integer not null references public.players (id) on delete cascade,
  -- The season it's for; null = any of the player's seasons without a closer photo.
  year smallint check (year between 1968 and 2100),
  -- The Commons file, as the server found it there.
  file text not null check (char_length(file) between 5 and 255),
  thumb text not null check (thumb ~ '^https://(upload|thumb)\.wikimedia\.org/'),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  author text not null check (char_length(author) <= 200),
  license text not null check (char_length(license) <= 100),
  license_url text,
  -- Year the photo was taken, when Commons says.
  photo_year smallint,
  note text check (char_length(note) <= 300),
  -- Kept (as null) when the account is deleted, so approved photos stay.
  submitted_by uuid references auth.users (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null
);

-- One suggestion per file per season (or per player, for all seasons).
create unique index photo_submissions_unique on public.photo_submissions (player_id, coalesce(year, 0), file);
create index photo_submissions_review on public.photo_submissions (status, created_at);
create index photo_submissions_approved on public.photo_submissions (player_id) where status = 'approved';
create index photo_submissions_by_user on public.photo_submissions (submitted_by, created_at desc);

alter table public.photo_submissions enable row level security;

create policy "Users can read their own photo suggestions" on public.photo_submissions
  for select to authenticated
  using (submitted_by = (select auth.uid()));

revoke all on public.photo_submissions from anon, authenticated;
grant select on public.photo_submissions to authenticated;
grant select, insert, update, delete on public.photo_submissions to service_role;

-- Who can review suggestions (/admin/photos). Add a row per admin by user id.
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.admins enable row level security;

revoke all on public.admins from anon, authenticated;
grant select, insert, update, delete on public.admins to service_role;

-- The site's owner.
insert into public.admins (user_id)
select id from auth.users where id = '63b3ec16-57e9-4204-b82d-00efcfdd4f4f';
