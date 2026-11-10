-- Session 1 is free (Nov 10). Singles are for Sessions 2 to 4; the Full Pass and Barkada stay as they are.
-- A free sign-up is its own ticket: Session 1 only, ₱0, no payment. api/register.js saves it as paid
-- (seat saved) or waitlist (Session 1 full), so seats are counted the same way as before.
-- One email can now have one free sign-up and one paid sign-up, so Session 1 people can still buy Sessions 2 to 4.

alter table public.registrations drop constraint if exists registrations_ticket_check;
alter table public.registrations add constraint registrations_ticket_check
  check (ticket in ('full', 'single', 'barkada', 'free'));

-- only the free ticket costs nothing
alter table public.registrations drop constraint if exists registrations_amount_check;
alter table public.registrations add constraint registrations_amount_check
  check (amount <= 10000 and (amount > 0 or ticket = 'free'));

alter table public.registrations drop constraint if exists registrations_full_pass_check;
alter table public.registrations add constraint registrations_full_pass_check
  check (ticket in ('single', 'free') or sessions = '{1,2,3,4}'::smallint[]);
alter table public.registrations add constraint registrations_free_check
  check (ticket <> 'free' or (sessions = '{1}'::smallint[] and amount = 0));

drop index if exists public.registrations_email_unique;
create unique index registrations_email_unique on public.registrations (lower(email), (ticket = 'free'));
