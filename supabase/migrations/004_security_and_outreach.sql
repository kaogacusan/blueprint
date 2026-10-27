-- Security pass + outreach logging.
-- 1. "guest" access: sees the workspace (tasks, schedule, decks, playbook) but never sign-ups' personal data.
--    For people outside the core team, like a guest facilitator.
-- 2. Each person can log progress on the orgs assigned to them (status, dates, who replied, next step).
-- 3. Database functions can't be called by visitors who aren't signed in.
-- Accounts are made by Keira (scripts/add-login.mjs); public sign-up is switched off in Supabase Auth.

-- ---------- Access levels ----------
alter table public.team drop constraint if exists team_access_check;
alter table public.team add constraint team_access_check check (access in ('owner', 'viewer', 'guest'));

-- core team = owner + viewers (not guests)
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team where access in ('owner', 'viewer') and email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- the signed-in person's team name (core team only)
create or replace function public.my_name() returns text
language sql stable security definer set search_path = public as $$
  select name from public.team where access in ('owner', 'viewer') and email = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

drop policy "owner adds team" on public.team;
drop policy "owner removes team" on public.team;
create policy "owner adds team" on public.team for insert to authenticated with check (public.is_owner() and access in ('viewer', 'guest'));
create policy "owner removes team" on public.team for delete to authenticated using (public.is_owner() and access in ('viewer', 'guest'));

create or replace function public.protect_owner() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.access = 'owner' and (new.access <> 'owner' or new.email is distinct from old.email) then
    raise exception 'The owner''s access and email can only be changed in the database.';
  end if;
  if old.access <> 'owner' and new.access = 'owner' then
    raise exception 'Owner access can only be given in the database.';
  end if;
  return new;
end;
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

-- ---------- Sign-ups: core team only ----------
drop policy "team reads registrations" on public.registrations;
create policy "staff reads registrations" on public.registrations for select to authenticated using (public.is_staff());

create or replace function public.set_registration_status(reg_id bigint, new_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'not_on_team';
  end if;
  update public.registrations set status = new_status where id = reg_id;
  if not found then
    raise exception 'registration % not found', reg_id;
  end if;
end;
$$;

-- ---------- Outreach: log progress on your own orgs ----------
-- Only these fields, only on orgs assigned to you (the owner can do any org).
create or replace function public.update_org_progress(org_id uuid, patch jsonb) returns public.orgs
language plpgsql security definer set search_path = public as $$
declare
  o public.orgs;
  me text := public.my_name();
begin
  select * into o from public.orgs where id = org_id;
  if not found then
    raise exception 'org not found';
  end if;
  if not (public.is_owner() or (me is not null and o.owner = me)) then
    raise exception 'not_your_org';
  end if;
  if (patch - array['status', 'dm_date', 'follow_up', 'replied_by', 'agreed', 'next_step']) <> '{}'::jsonb then
    raise exception 'field not allowed';
  end if;
  update public.orgs set
    status     = case when patch ? 'status' then patch ->> 'status' else status end,
    dm_date    = case when patch ? 'dm_date' then nullif(patch ->> 'dm_date', '')::date else dm_date end,
    follow_up  = case when patch ? 'follow_up' then nullif(patch ->> 'follow_up', '')::date else follow_up end,
    replied_by = case when patch ? 'replied_by' then left(coalesce(patch ->> 'replied_by', ''), 200) else replied_by end,
    agreed     = case when patch ? 'agreed' then left(coalesce(patch ->> 'agreed', ''), 500) else agreed end,
    next_step  = case when patch ? 'next_step' then left(coalesce(patch ->> 'next_step', ''), 500) else next_step end
  where id = org_id
  returning * into o;
  return o;
end;
$$;

-- ---------- Who can call the database functions ----------
revoke execute on function public.is_team(), public.is_owner(), public.is_staff(), public.my_name() from public, anon;
grant execute on function public.is_team(), public.is_owner(), public.is_staff(), public.my_name() to authenticated;
revoke execute on function public.only_team_signups() from public, anon, authenticated;
revoke execute on function public.set_registration_status(bigint, text) from public, anon;
grant execute on function public.set_registration_status(bigint, text) to authenticated;
revoke execute on function public.update_org_progress(uuid, jsonb) from public, anon;
grant execute on function public.update_org_progress(uuid, jsonb) to authenticated;
