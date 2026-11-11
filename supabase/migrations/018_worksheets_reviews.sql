-- Blueprint Online, Nov 12: the worksheets live on the site, and learners book their review call on the site.
--
-- course_sessions.worksheet   each module's worksheet: Thomas's questions (doc 02), as a list of sections and
--                             questions. Written by a private script (private/course/worksheets.mjs), never in the
--                             public repo, and only sent to learners whose module is open (api/_learn.js).
-- course_sessions.confirm_text  what they see after they submit a module (Thomas's confirmation messages).
-- course_work.answers         (migration 014) their answers, saved as they type. completed_at = first submit,
--                             which opens the next module. They can keep editing after.
-- review_slots                open times for the 15-minute résumé review on Google Meet. The team adds them on the
--                             workspace's Course page (api/course.js); a learner books one at any time after they
--                             get access (api/learn.js, book_review_slot below). One booking per learner.
-- The old Google Form links (form_url) and the single booking link (settings "course".booking) are no longer used.

alter table public.course_sessions
  add column if not exists worksheet jsonb not null default '[]'::jsonb
    check (jsonb_typeof(worksheet) = 'array' and octet_length(worksheet::text) <= 60000),
  add column if not exists confirm_text text not null default '' check (char_length(confirm_text) <= 1000);

create table if not exists public.review_slots (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  starts_at timestamptz not null,
  minutes smallint not null default 15 check (minutes between 5 and 120),
  reviewer text not null check (char_length(reviewer) between 1 and 120),
  meet_url text not null default '' check (meet_url = '' or (char_length(meet_url) <= 300 and meet_url ~* '^https://')),
  learner_id bigint references public.learners (id) on delete set null,
  booked_at timestamptz,
  added_by text not null default '' check (char_length(added_by) <= 120)
);
create unique index if not exists review_slots_one_each on public.review_slots (learner_id) where learner_id is not null;
create unique index if not exists review_slots_no_double on public.review_slots (reviewer, starts_at);
create index if not exists review_slots_when on public.review_slots (starts_at);

-- row rules: the core team reads; every write goes through the API with the service key
alter table public.review_slots enable row level security;
revoke all on public.review_slots from anon;
revoke all on public.review_slots from authenticated;
grant select on public.review_slots to authenticated;
drop policy if exists "staff reads review slots" on public.review_slots;
create policy "staff reads review slots" on public.review_slots for select to authenticated using (public.is_staff());

-- book (or move) a learner's review call in one step: their old time is only let go if the new one is free.
-- Raises 'taken' (someone else got it, or it's under 12 hours away) or 'locked' (their call is under 24 hours away).
create or replace function public.book_review_slot(p_learner bigint, p_slot bigint)
returns public.review_slots
language plpgsql security definer set search_path = public as $$
declare cur public.review_slots; nxt public.review_slots;
begin
  select * into cur from review_slots where learner_id = p_learner for update;
  if found and cur.id = p_slot then return cur; end if;
  if found and cur.starts_at < now() + interval '24 hours' then raise exception 'locked'; end if;
  if found then update review_slots set learner_id = null, booked_at = null where id = cur.id; end if;
  update review_slots set learner_id = p_learner, booked_at = now()
    where id = p_slot and learner_id is null and starts_at > now() + interval '12 hours'
    returning * into nxt;
  if not found then raise exception 'taken'; end if;
  return nxt;
end $$;
revoke all on function public.book_review_slot(bigint, bigint) from public, anon, authenticated;
grant execute on function public.book_review_slot(bigint, bigint) to service_role;
