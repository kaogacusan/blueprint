-- Blueprint admin: team list, registrations (inquiries), and slide decks.
-- Only people on the team list can read anything. The public site can only add a registration.

-- ---------- Team ----------
create table public.team (
  email text primary key check (email = lower(email)),
  name text not null default '',
  added_at timestamptz not null default now(),
  added_by text not null default ''
);

create or replace function public.is_team() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

alter table public.team enable row level security;
create policy "team reads team" on public.team for select to authenticated using (public.is_team());
create policy "team adds team" on public.team for insert to authenticated with check (public.is_team());
create policy "team removes others" on public.team for delete to authenticated
  using (public.is_team() and email <> lower(auth.jwt() ->> 'email'));

-- Only emails on the team list can create an admin account.
create or replace function public.only_team_signups() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.team where email = lower(new.email)) then
    raise exception 'not_on_team';
  end if;
  return new;
end;
$$;
create trigger only_team_signups before insert on auth.users
  for each row execute function public.only_team_signups();

-- ---------- Registrations (inquiries from the public form) ----------
create table public.registrations (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  course text not null check (char_length(course) between 1 and 120),
  year text not null check (year in ('3rd year', '4th year', 'Fresh grad', 'Other')),
  status text not null default 'new' check (status in ('new', 'emailed', 'confirmed', 'archived')),
  notes text not null default '' check (char_length(notes) <= 2000),
  updated_at timestamptz not null default now()
);

alter table public.registrations enable row level security;
-- the public form may only fill in these four fields
revoke insert on public.registrations from anon, authenticated;
grant insert (name, email, course, year) on public.registrations to anon, authenticated;
create policy "anyone can register" on public.registrations for insert to anon, authenticated with check (true);
create policy "team reads registrations" on public.registrations for select to authenticated using (public.is_team());
create policy "team updates registrations" on public.registrations for update to authenticated using (public.is_team()) with check (public.is_team());
create policy "team deletes registrations" on public.registrations for delete to authenticated using (public.is_team());

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger registrations_touch before update on public.registrations
  for each row execute function public.touch_updated_at();

-- ---------- Decks ----------
-- Slide content lives here (not in the public repo). Uploaded with scripts/upload-deck.mjs.
create table public.decks (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  session_no int,
  title text not null,
  subtitle text not null default '',
  slide_count int not null default 0,
  html text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.decks enable row level security;
create policy "team reads decks" on public.decks for select to authenticated using (public.is_team());

-- Deck images: private bucket, team-only
insert into storage.buckets (id, name, public) values ('decks', 'decks', false) on conflict (id) do nothing;
create policy "team reads deck files" on storage.objects for select to authenticated
  using (bucket_id = 'decks' and public.is_team());
