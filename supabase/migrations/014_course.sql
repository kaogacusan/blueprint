-- Blueprint Online (Nov 11): the self-paced course at /learn.
-- Kept apart from the workshop's registrations so neither can break the other.
--   learners        one row per person (email). unlocked = the sessions they can open (1 is free).
--   course_orders   one row per purchase: GCash receipt (encrypted, like the workshop's), checked by the team.
--   course_work     their worksheet answers, one row per person per session.
--   course_sessions the lessons and steps. Lives in the database, not the public repo; paid steps are only
--                   sent to people who unlocked them (api/learn.js).
-- Everything is written by api/learn.js and api/course.js with the service key. The core team reads it in the
-- workspace (Course page). Nobody signed out can read anything.

create table public.learners (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  year text not null check (year = any (array['1st year', '2nd year', '3rd year', '4th year', 'Fresh grad', 'Other'])),
  heard_from text not null default '' check (heard_from = any (array['', 'Booth', 'Student org', 'Friend', 'Facebook', 'Instagram', 'Email', 'Other'])),
  consent boolean not null check (consent),
  privacy_version text not null default '' check (char_length(privacy_version) <= 20),
  unlocked smallint[] not null default '{1}' check (unlocked <@ '{1,2,3,4}'::smallint[]),
  via text not null default '' check (char_length(via) <= 40),          -- 'workshop' = a paid workshop ticket came with it
  last_seen timestamptz,
  -- sign-in codes: only a hash is kept, it expires, and it allows a few tries
  login_hash text not null default '',
  login_expires timestamptz,
  login_tries smallint not null default 0,
  login_sent_at timestamptz,
  token_ver int not null default 1                                       -- bump to sign someone out everywhere
);
create unique index learners_email_unique on public.learners (lower(email));

create table public.course_orders (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  learner_id bigint not null references public.learners (id) on delete cascade,
  code text not null unique check (code ~ '^BP-[A-Z0-9]{4}$'),
  item text not null check (item in ('single', 'bundle')),
  sessions smallint[] not null check (cardinality(sessions) between 1 and 3 and sessions <@ '{2,3,4}'::smallint[]),
  amount int not null check (amount > 0 and amount <= 10000),
  status text not null default 'pending' check (status in ('pending', 'paid', 'rejected')), -- pending = receipt in, not checked yet
  proof_path text not null default '' check (char_length(proof_path) <= 200),
  proof_at timestamptz,
  checked_at timestamptz,
  checked_by text not null default '' check (char_length(checked_by) <= 120),
  note text not null default '' check (char_length(note) <= 500)
);
create index course_orders_learner on public.course_orders (learner_id);

create table public.course_work (
  learner_id bigint not null references public.learners (id) on delete cascade,
  session smallint not null check (session between 1 and 4),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object' and octet_length(answers::text) <= 60000),
  done text[] not null default '{}' check (cardinality(done) <= 40),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (learner_id, session)
);

create table public.course_sessions (
  n smallint primary key check (n between 1 and 4),
  title text not null,
  tagline text not null default '',
  leave_with text not null default '',
  minutes int not null default 0,
  lesson jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  video_url text not null default '' check (char_length(video_url) <= 300),
  updated_at timestamptz not null default now()
);

-- row rules: the core team reads; nobody else gets anything (the API uses the service key)
alter table public.learners enable row level security;
alter table public.course_orders enable row level security;
alter table public.course_work enable row level security;
alter table public.course_sessions enable row level security;
revoke all on public.learners, public.course_orders, public.course_work, public.course_sessions from anon;
revoke all on public.learners, public.course_orders, public.course_work, public.course_sessions from authenticated;
-- the team never sees sign-in hashes
grant select (id, created_at, name, email, year, heard_from, unlocked, via, last_seen) on public.learners to authenticated;
grant select on public.course_orders, public.course_work, public.course_sessions to authenticated;
grant update (video_url) on public.course_sessions to authenticated;
create policy "staff reads learners" on public.learners for select to authenticated using (public.is_staff());
create policy "staff reads course orders" on public.course_orders for select to authenticated using (public.is_staff());
create policy "staff reads course work" on public.course_work for select to authenticated using (public.is_staff());
create policy "staff reads course sessions" on public.course_sessions for select to authenticated using (public.is_staff());
create policy "owner sets videos" on public.course_sessions for update to authenticated using (public.is_owner()) with check (public.is_owner());

-- prices and switches, edited by the owner in the workspace (settings key "course")
insert into public.settings (key, value) values
  ('course', '{"single": 149, "bundle": 349, "instant": true}'::jsonb)
on conflict (key) do nothing;
