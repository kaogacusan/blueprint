-- GCash payments: each sign-up gets a personal code, types their GCash reference number on /pay,
-- and the team clicks Paid. The emails are sent by the site's server (api/), never from the browser.

alter table public.registrations
  add column code text unique check (code ~ '^BP-[A-Z0-9]{4}$'),
  add column gcash_ref text not null default '' check (char_length(gcash_ref) <= 40),
  add column ref_at timestamptz,
  add column paid_at timestamptz,
  add column paid_by text not null default '',
  add column emailed_at timestamptz;

create unique index registrations_email_unique on public.registrations (lower(email));

-- Sign-ups now go through /api/register (service key), which also sends the payment email.
-- The browser can't write to this table directly anymore.
drop policy "anyone can register" on public.registrations;
revoke insert on public.registrations from anon, authenticated;

-- "Paid" sends the confirmation email, so it goes through /api/mark-paid.
-- The team can still set registered / waitlist / cancelled from the workspace.
create or replace function public.set_registration_status(reg_id bigint, new_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'not_on_team';
  end if;
  if new_status = 'paid' then
    raise exception 'use_mark_paid';
  end if;
  update public.registrations set status = new_status where id = reg_id;
  if not found then
    raise exception 'registration % not found', reg_id;
  end if;
end;
$$;

-- What the payment emails say. The owner edits it on the Sign-ups page.
insert into public.settings (key, value) values ('payment', jsonb_build_object(
  'gcashName', '',
  'qrPath', '',
  'prework', '[]'::jsonb,
  'salesClose', '2026-11-09'
)) on conflict (key) do nothing;

-- The GCash QR lives in a private bucket. Only the server reads it, to put it in the email.
insert into storage.buckets (id, name, public) values ('payment', 'payment', false) on conflict (id) do nothing;
create policy "owner reads payment files" on storage.objects for select to authenticated using (bucket_id = 'payment' and public.is_owner());
create policy "owner uploads payment files" on storage.objects for insert to authenticated with check (bucket_id = 'payment' and public.is_owner());
create policy "owner replaces payment files" on storage.objects for update to authenticated using (bucket_id = 'payment' and public.is_owner()) with check (bucket_id = 'payment' and public.is_owner());
