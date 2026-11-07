-- Pilot pricing (Nov 7): Full Pass ₱799, Single Session ₱299 each, Barkada ₱1,999 (three Full Passes, one payer).
-- Prices live in api/_lib.js PRICE; the server still sets each sign-up's amount (api/register.js).
--
-- Barkada: the person who signs up pays for themselves and two friends. friends holds the two friends'
-- names and emails ([{ "name": ..., "email": ... }]), used for the attendance list and the slot confirmation email.
-- A Barkada takes 3 seats in every session (api/signups.js).
--
-- Upgrades: someone who paid for Single Sessions can switch to the Full Pass from their payment page and pay the
-- difference: ₱500 after one session (799 - 299), ₱201 after two (799 - 598). topup is what they still owe for it,
-- topup_at when they asked. Both clear when the team confirms the top-up and the sign-up becomes a Full Pass.

alter table public.registrations drop constraint registrations_ticket_check;
alter table public.registrations add constraint registrations_ticket_check check (ticket in ('full', 'single', 'barkada'));
alter table public.registrations alter column amount set default 799;

alter table public.registrations
  add column friends jsonb not null default '[]'::jsonb
    check (jsonb_typeof(friends) = 'array' and jsonb_array_length(friends) <= 2 and octet_length(friends::text) <= 1000),
  add column topup integer not null default 0 check (topup >= 0 and topup <= 10000),
  add column topup_at timestamptz;

alter table public.registrations add constraint registrations_barkada_check
  check ((ticket = 'barkada') = (jsonb_array_length(friends) = 2));
