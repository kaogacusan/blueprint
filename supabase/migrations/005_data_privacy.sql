-- Data privacy pass (Data Privacy Act of 2012, RA 10173).
-- 1. Sign-ups record consent: the form can't save without it, and we keep when and which privacy notice they agreed to.
-- 2. Visitors who aren't signed in can only add a sign-up. Every other table permission they had is removed,
--    even ones the row rules already blocked.
-- 3. The People list (contacts: outside people's emails and numbers) is core team only, like sign-ups.
-- 4. Each sign-up remembers who on the team last changed it.
-- 5. The owner can erase every sign-up in one step once the program is over (see privacy.html: "How long we keep it").

-- ---------- Consent ----------
alter table public.registrations
  add column consent boolean not null default false,
  add column consented_at timestamptz not null default now(),
  add column privacy_version text not null default '' check (char_length(privacy_version) <= 20),
  add column updated_by text not null default '';
alter table public.registrations add constraint registrations_consent_check check (consent);
alter table public.registrations alter column consent drop default;

-- ---------- Visitors: insert a sign-up, nothing else ----------
do $$
declare t text;
begin
  foreach t in array array['team', 'registrations', 'decks', 'tasks', 'sessions', 'milestones', 'orgs', 'resources', 'contacts', 'guides', 'scripts', 'open_items', 'settings'] loop
    execute format('revoke all on public.%I from anon', t);
    -- signed-in people never need these; the row rules decide the rest
    execute format('revoke truncate, references, trigger on public.%I from authenticated', t);
  end loop;
end $$;
grant insert (name, email, course, year, mobile, heard_from, heard_org, consent, privacy_version) on public.registrations to anon, authenticated;
revoke usage, select on all sequences in schema public from anon;

-- ---------- People list: core team only ----------
drop policy "team reads" on public.contacts;
create policy "staff reads" on public.contacts for select to authenticated using (public.is_staff());

-- ---------- Who last changed a sign-up ----------
create or replace function public.registrations_touch() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  new.updated_by = coalesce(public.my_name(), lower(auth.jwt() ->> 'email'), '');
  return new;
end;
$$;
revoke execute on function public.registrations_touch() from public, anon, authenticated;
drop trigger registrations_touch on public.registrations;
create trigger registrations_touch before update on public.registrations
  for each row execute function public.registrations_touch();

-- ---------- Erase all sign-ups (owner only) ----------
create or replace function public.erase_registrations() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_owner() then
    raise exception 'owner_only';
  end if;
  delete from public.registrations where true;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.erase_registrations() from public, anon;
grant execute on function public.erase_registrations() to authenticated;
