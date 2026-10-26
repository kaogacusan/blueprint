-- Blueprint workspace: one owner with full control, everyone else on the team can view.
-- Adds tasks, sessions, milestones, org outreach, budget, playbook and directory.

-- ---------- Team: people + access ----------
-- A person can be on the team without an email (no login yet).
-- "role_title" is only a label. Access is "owner" (edits everything) or "viewer" (reads everything).
alter table public.team drop constraint team_pkey;
alter table public.team add column id uuid not null default gen_random_uuid() primary key;
alter table public.team alter column email drop not null;
alter table public.team drop constraint if exists team_email_check;
alter table public.team add constraint team_email_lower check (email is null or email = lower(email));
alter table public.team add constraint team_email_unique unique (email);
alter table public.team add column role_title text not null default '';
alter table public.team add column access text not null default 'viewer' check (access in ('owner', 'viewer'));
alter table public.team add column sort int not null default 0;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team where access = 'owner' and email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

drop policy "team reads team" on public.team;
drop policy "team adds team" on public.team;
drop policy "team removes others" on public.team;
create policy "team reads team" on public.team for select to authenticated using (public.is_team());
create policy "owner adds team" on public.team for insert to authenticated with check (public.is_owner() and access = 'viewer');
create policy "owner edits team" on public.team for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner removes team" on public.team for delete to authenticated using (public.is_owner() and access = 'viewer');

-- The owner row can't lose its owner access or its email from the site.
create or replace function public.protect_owner() returns trigger language plpgsql as $$
begin
  if old.access = 'owner' and (new.access <> 'owner' or new.email is distinct from old.email) then
    raise exception 'The owner''s access and email can only be changed in the database.';
  end if;
  if old.access = 'viewer' and new.access = 'owner' then
    raise exception 'Owner access can only be given in the database.';
  end if;
  return new;
end;
$$;
create trigger protect_owner before update on public.team for each row execute function public.protect_owner();

-- Only the owner changes inquiries now
drop policy "team updates registrations" on public.registrations;
drop policy "team deletes registrations" on public.registrations;
create policy "owner updates registrations" on public.registrations for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner deletes registrations" on public.registrations for delete to authenticated using (public.is_owner());

-- ---------- Workspace tables ----------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  session text not null default '',
  owners text[] not null default '{}',
  priority text not null default 'Medium' check (priority in ('Critical', 'High', 'Medium', 'Low')),
  status text not null default 'Not Started' check (status in ('Not Started', 'In Progress', 'Blocked', 'Completed')),
  assigned_on date,
  due date,
  due_time time,
  notes text not null default '',
  links jsonb not null default '[]',
  outputs jsonb not null default '[]',
  source text not null default 'manual',
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sessions (
  n int primary key check (n between 1 and 4),
  title text not null,
  date date,
  start_time time,
  end_time time,
  venue text not null default '',
  venue_status text not null default 'Not requested' check (venue_status in ('Not requested', 'Requested', 'Confirmed')),
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  on_date date not null,
  at_time time,
  who text[] not null default '{}',
  done boolean not null default false,
  notes text not null default '',
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  tier int,
  cluster text not null default '',
  grp text not null default '',
  page text not null default '',
  why text not null default '',
  owner text not null default '',
  status text not null default 'Not sent' check (status in ('Not sent', 'Sent', 'Followed up', 'Yes', 'No', 'No reply')),
  dm_date date,
  follow_up date,
  replied_by text not null default '',
  agreed text not null default '',
  next_step text not null default '',
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'General',
  label text not null,
  url text not null,
  note text not null default '',
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org text not null default '',
  email text not null default '',
  phone text not null default '',
  note text not null default '',
  category text not null default 'General',
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.guides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  category text not null default 'Guide',
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.scripts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Outreach',
  body text not null default '',
  note text not null default '',
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.open_items (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  owner text not null default '',
  due_label text not null default '',
  resolved boolean not null default false,
  answer text not null default '',
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

-- one JSON document per key: "costing", "ops"
create table public.settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Same rules for every workspace table: the team reads, the owner writes.
do $$
declare t text;
begin
  foreach t in array array['tasks', 'sessions', 'milestones', 'orgs', 'resources', 'contacts', 'guides', 'scripts', 'open_items', 'settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "team reads" on public.%I for select to authenticated using (public.is_team())', t);
    execute format('create policy "owner inserts" on public.%I for insert to authenticated with check (public.is_owner())', t);
    execute format('create policy "owner updates" on public.%I for update to authenticated using (public.is_owner()) with check (public.is_owner())', t);
    execute format('create policy "owner deletes" on public.%I for delete to authenticated using (public.is_owner())', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', t || '_touch', t);
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end $$;

alter publication supabase_realtime add table public.team, public.registrations;

-- Other names a person goes by in docs (e.g. "Lorenz" for "Renz"), so imports match them.
alter table public.team add column aliases text[] not null default '{}';
