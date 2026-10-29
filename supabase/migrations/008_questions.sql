-- Questions from the site's "Ask us" form, answered by the team from the workspace (admin → Questions).
-- Replaces "reply to this email": the whole core team sees every question, and answers go out from the
-- Blueprint inbox signed "the Blueprint team". Plus an access log, for the Data Privacy Act's accountability rule.

-- ---------- Questions ----------
-- Saved only by /api/ask (service key). The core team (owner + viewers, never guests) reads them and can close
-- one without answering (spam). Answers go through /api/questions, which sends the email. The owner deletes.
create table public.questions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message text not null check (char_length(message) between 3 and 2000),
  privacy_version text not null default '' check (char_length(privacy_version) <= 20),
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  answer text not null default '' check (char_length(answer) <= 4000),
  answered_by text not null default '',
  answered_at timestamptz
);
create index questions_email on public.questions (lower(email));

alter table public.questions enable row level security;
revoke all on public.questions from anon;
revoke all on public.questions from authenticated;
grant select, delete on public.questions to authenticated;
grant update (status) on public.questions to authenticated;
create policy "staff reads questions" on public.questions for select to authenticated using (public.is_staff());
create policy "staff closes questions" on public.questions for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "owner deletes questions" on public.questions for delete to authenticated using (public.is_owner());
alter publication supabase_realtime add table public.questions;

-- ---------- Access log ----------
-- Written only by the site's server (api/): who viewed a receipt, marked someone paid, resent an email,
-- answered a question. Ids and actions only, no personal details. Only the owner reads it.
create table public.access_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  who text not null default '',
  action text not null,
  target text not null default ''
);
alter table public.access_log enable row level security;
revoke all on public.access_log from anon;
revoke all on public.access_log from authenticated;
grant select on public.access_log to authenticated;
create policy "owner reads access log" on public.access_log for select to authenticated using (public.is_owner());
