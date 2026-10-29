-- Slack Patrol: a private joke channel between Keira and Renz (nobody else can see, send or receive).
-- One of them reports the other for slacking → a full-screen alert on the other's screen.
-- The reporter can then send "shame" (word spam), "crash" (fake system crash) and, for Keira only, "general" (photo spam).
-- The photo lives in the private "pranks" bucket, readable by the two of them only (the repo is public).

create or replace function public.is_patrol() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_name() in ('Keira', 'Renz'), false);
$$;
revoke execute on function public.is_patrol() from public, anon;
grant execute on function public.is_patrol() to authenticated;

create table public.pokes (
  id bigint generated always as identity primary key,
  from_name text not null default public.my_name(),
  to_name text not null,
  kind text not null check (kind in ('slacking', 'shame', 'general', 'crash', 'reply')),
  payload jsonb not null default '{}'::jsonb check (octet_length(payload::text) <= 2000),
  created_at timestamptz not null default now(),
  seen_at timestamptz
);
create index pokes_to_idx on public.pokes (to_name, created_at desc);
create index pokes_from_idx on public.pokes (from_name, created_at desc);
alter table public.pokes enable row level security;

create policy "patrol reads own" on public.pokes for select to authenticated
  using (public.is_patrol() and public.my_name() in (from_name, to_name));
create policy "patrol sends" on public.pokes for insert to authenticated
  with check (
    public.is_patrol()
    and from_name = public.my_name()
    and to_name in ('Keira', 'Renz') and to_name <> from_name
    and (kind <> 'general' or from_name = 'Keira')
  );
create policy "patrol marks seen" on public.pokes for update to authenticated
  using (to_name = public.my_name()) with check (to_name = public.my_name());

-- only these columns can be written; from_name always comes from the login
revoke all on public.pokes from anon, authenticated;
grant select on public.pokes to authenticated;
grant insert (to_name, kind, payload) on public.pokes to authenticated;
grant update (seen_at) on public.pokes to authenticated;

-- keep it fun, not a flood: at most 40 sends per 10 seconds, and drop anything older than 30 days
create or replace function public.pokes_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.pokes where from_name = new.from_name and created_at > now() - interval '10 seconds') >= 40 then
    raise exception 'slow_down';
  end if;
  delete from public.pokes where created_at < now() - interval '30 days';
  return new;
end;
$$;
revoke execute on function public.pokes_guard() from public, anon, authenticated;
create trigger pokes_guard before insert on public.pokes for each row execute function public.pokes_guard();

alter publication supabase_realtime add table public.pokes;

-- the photo: private bucket, the two of them only
insert into storage.buckets (id, name, public) values ('pranks', 'pranks', false) on conflict (id) do nothing;
create policy "patrol reads pranks" on storage.objects for select to authenticated
  using (bucket_id = 'pranks' and public.is_patrol());
