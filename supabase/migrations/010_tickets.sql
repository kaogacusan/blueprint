-- Two tickets: the Full Pass (all four sessions) and Single Session (one or more sessions picked on the site).
-- Each sign-up keeps its ticket, its sessions and the amount it owes, worked out by the server (api/register.js)
-- when they sign up. So the payment page, the emails and the team's Sign-ups page all show the same amount,
-- and a later price change never changes what someone already signed up for.
-- Seats are counted per session (api/signups.js): a Full Pass takes a seat in all four.

alter table public.registrations
  add column ticket text not null default 'full' check (ticket in ('full', 'single')),
  add column sessions smallint[] not null default '{1,2,3,4}'
    check (cardinality(sessions) between 1 and 4 and sessions <@ '{1,2,3,4}'::smallint[]),
  add column amount integer not null default 1999 check (amount > 0 and amount <= 10000);

alter table public.registrations add constraint registrations_full_pass_check
  check (ticket = 'single' or sessions = '{1,2,3,4}'::smallint[]);
