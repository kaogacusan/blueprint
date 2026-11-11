-- Blueprint Online (Nov 11): three quick answers after sign-up tailor the course to the person
-- (what they're working toward, their field, where their résumé is at). All optional.
alter table public.learners
  add column goal text not null default '' check (goal = any (array['', 'internship', 'job', 'org', 'scholarship', 'explore'])),
  add column field text not null default '' check (field = any (array['', 'business', 'creative', 'scitech', 'policy', 'humanities', 'other'])),
  add column stage text not null default '' check (stage = any (array['', 'none', 'rough', 'applying']));
grant select (goal, field, stage) on public.learners to authenticated;
