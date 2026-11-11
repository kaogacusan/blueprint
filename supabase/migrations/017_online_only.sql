-- Blueprint Online, one product (Thomas's plan, Nov 11 night): the workshops are cancelled; the site sells
-- Blueprint Online for ₱349 (four modules + a 15-minute 1:1 with Thomas). Sales close Sun Nov 15, 10 PM.
--
-- registrations
--   ticket 'online'            the one product. amount 349, set by the server (api/_lib.js ticketFor).
--   gift_name, gift_email      "Buying this for someone else?": the access email goes to that person instead.
--   status 'refunded'          "Refunded, free access": last week's workshop buyers keep their refund and get the course free.
--   gcash_ref (migration 006)  the buyer types their GCash reference number on /pay again (the screenshot is optional now).
-- course_sessions
--   page_text, credits         the module page's text (from Thomas's doc 01), kept here like the rest of the course.
--   form_url                   the module's Google Form (the worksheet). Only sent to buyers whose module is open.
--   slides_url                 the deck, shown until the video is up.
-- settings "course".booking    the 1:1 booking link, shown after Module 4 (owner sets it on the Course page).

alter table public.registrations drop constraint if exists registrations_ticket_check;
alter table public.registrations add constraint registrations_ticket_check
  check (ticket in ('full', 'single', 'barkada', 'free', 'online'));

alter table public.registrations drop constraint if exists registrations_status_check;
alter table public.registrations add constraint registrations_status_check
  check (status in ('registered', 'paid', 'waitlist', 'cancelled', 'refunded'));

alter table public.registrations
  add column if not exists gift_name text not null default '' check (char_length(gift_name) <= 120),
  add column if not exists gift_email text not null default '' check (gift_email = '' or (char_length(gift_email) <= 200 and gift_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'));
create index if not exists registrations_gift_email on public.registrations (lower(gift_email)) where gift_email <> '';

alter table public.course_sessions
  add column if not exists page_text text not null default '' check (char_length(page_text) <= 4000),
  add column if not exists credits text not null default '' check (char_length(credits) <= 1000),
  add column if not exists form_url text not null default '' check (char_length(form_url) <= 300),
  add column if not exists slides_url text not null default '' check (char_length(slides_url) <= 300);
grant update (video_url, form_url, slides_url) on public.course_sessions to authenticated;

-- most sales now happen at the bazaar booth: "Booth" is an answer to "How did you hear about Blueprint?"
alter table public.registrations drop constraint if exists registrations_heard_from_check;
alter table public.registrations add constraint registrations_heard_from_check
  check (heard_from = any (array['', 'Booth', 'Student org', 'Friend', 'Facebook', 'Instagram', 'Email', 'Other']));
