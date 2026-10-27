-- Registration form: mobile number and "How did you hear about Blueprint?".
-- Status now tracks payment: registered → paid (first 20) → waitlist, or cancelled.

-- ---------- New form fields ----------
alter table public.registrations
  add column mobile text not null default '' check (char_length(mobile) <= 40),
  add column heard_from text not null default ''
    check (heard_from in ('', 'Student org', 'Friend', 'Facebook', 'Instagram', 'Email', 'Other')),
  add column heard_org text not null default '' check (char_length(heard_org) <= 120);

-- the public form may only fill in these fields
revoke insert on public.registrations from anon, authenticated;
grant insert (name, email, course, year, mobile, heard_from, heard_org) on public.registrations to anon, authenticated;

-- ---------- Status ----------
alter table public.registrations drop constraint if exists registrations_status_check;
update public.registrations set status = case status
  when 'new' then 'registered'
  when 'emailed' then 'registered'
  when 'confirmed' then 'paid'
  when 'archived' then 'cancelled'
  else status end;
alter table public.registrations alter column status set default 'registered';
alter table public.registrations add constraint registrations_status_check
  check (status in ('registered', 'paid', 'waitlist', 'cancelled'));

-- Anyone on the team can set a registration's status (e.g. mark "paid").
-- Every other change to registrations stays owner-only.
create or replace function public.set_registration_status(reg_id bigint, new_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_team() then
    raise exception 'not_on_team';
  end if;
  update public.registrations set status = new_status where id = reg_id;
  if not found then
    raise exception 'registration % not found', reg_id;
  end if;
end;
$$;
revoke execute on function public.set_registration_status(bigint, text) from public, anon;
grant execute on function public.set_registration_status(bigint, text) to authenticated;
