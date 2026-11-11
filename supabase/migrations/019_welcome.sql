-- Blueprint Online, Nov 12: the welcome after sign-in (learn/welcome.js) asks three questions, one per screen,
-- and the home page (learn/home.js) is set up from the answers.
--   goal, stage    migration 016's columns: what they're working toward, where their résumé is (picks Module 2's path)
--   review_plan    will they take the 15-minute résumé review: 'yes' / 'later' ('' = skipped)
--   onboarded_at   when they finished or skipped the welcome, so it only shows once
alter table public.learners
  add column if not exists review_plan text not null default '' check (review_plan = any (array['', 'yes', 'later'])),
  add column if not exists onboarded_at timestamptz;
grant select (review_plan, onboarded_at) on public.learners to authenticated;
