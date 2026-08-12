-- ============================================================================
-- 027_room_polls
--
-- Master Product Completion Phase G — Voting Polls. New feature, genuinely
-- new schema (no existing table could safely represent this). Room-scoped
-- (tied to conversations, same as messages/room_bans), one vote per user
-- per poll (the simplest sensible model — see the phase brief's own framing).
--
-- Visibility model: polls/options are readable by room participants only
-- (same boundary as messages — a poll is room content, not public). Vote
-- ROWS are readable only by their own voter (never "who voted for what" to
-- anyone else) — aggregate counts are exposed exclusively through
-- room_poll_results(), a SECURITY DEFINER function that itself re-checks
-- room participation before returning anything. This is the same
-- "narrow function over an otherwise-private table" pattern already used
-- for room_member_count() (migration 024).
-- ============================================================================

create table public.room_polls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  question text not null check (length(btrim(question)) > 0),
  closes_at timestamptz null,
  closed_at timestamptz null,
  created_at timestamptz not null default now()
);

create table public.room_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.room_polls(id) on delete cascade,
  label text not null check (length(btrim(label)) > 0),
  order_index int not null default 0
);

create table public.room_poll_votes (
  poll_id uuid not null references public.room_polls(id) on delete cascade,
  option_id uuid not null references public.room_poll_options(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  voted_at timestamptz not null default now(),
  primary key (poll_id, profile_id)
);

create index idx_room_polls_conversation on public.room_polls(conversation_id);
create index idx_room_poll_options_poll on public.room_poll_options(poll_id);

-- ---------------------------------------------------------------------------
-- Integrity: a vote's option must actually belong to its poll — otherwise
-- a client could satisfy the (poll_id, profile_id) primary key with an
-- option_id borrowed from a different poll entirely.
-- ---------------------------------------------------------------------------
create or replace function public.validate_poll_vote_option()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not exists (
    select 1 from public.room_poll_options o
    where o.id = new.option_id and o.poll_id = new.poll_id
  ) then
    raise exception 'option_id does not belong to poll_id';
  end if;
  return new;
end;
$$;

create trigger trg_validate_poll_vote_option
before insert or update on public.room_poll_votes
for each row execute function public.validate_poll_vote_option();

-- Immutability: the UPDATE policy below exists only so a poll's creator/
-- room admin/moderator can set closed_at — never to rewrite the question
-- or move the poll to a different room after people have started voting.
create or replace function public.protect_room_poll_identity()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.conversation_id is distinct from old.conversation_id then
    raise exception 'room_polls.conversation_id cannot be changed';
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'room_polls.created_by cannot be changed';
  end if;
  if new.question is distinct from old.question then
    raise exception 'room_polls.question cannot be changed';
  end if;
  return new;
end;
$$;

create trigger trg_protect_room_poll_identity
before update on public.room_polls
for each row execute function public.protect_room_poll_identity();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.room_polls enable row level security;
alter table public.room_poll_options enable row level security;
alter table public.room_poll_votes enable row level security;

create policy "Room participants can view polls"
  on public.room_polls for select to authenticated
  using (public.is_conversation_participant(conversation_id));

create policy "Room participants can create polls"
  on public.room_polls for insert to authenticated
  with check (created_by = (select auth.uid()) and public.is_conversation_participant(conversation_id));

create policy "Poll creator or room admin/moderator can close a poll"
  on public.room_polls for update to authenticated
  using (
    created_by = (select auth.uid())
    or public.is_conversation_admin(conversation_id)
    or public.is_conversation_creator(conversation_id)
    or public.has_role('moderator')
    or public.has_role('super_admin')
  );

create policy "Room participants can view poll options"
  on public.room_poll_options for select to authenticated
  using (exists (
    select 1 from public.room_polls p
    where p.id = room_poll_options.poll_id and public.is_conversation_participant(p.conversation_id)
  ));

create policy "Poll creator can add its options"
  on public.room_poll_options for insert to authenticated
  with check (exists (
    select 1 from public.room_polls p
    where p.id = poll_id and p.created_by = (select auth.uid())
  ));

-- Votes: readable only by the voter themselves — see file header. Insert/
-- update/delete all require the poll to still be open (closed_at is null
-- and, if set, closes_at is in the future).
create policy "Users can see their own vote"
  on public.room_poll_votes for select to authenticated
  using (profile_id = (select auth.uid()));

create policy "Room participants can vote in open polls"
  on public.room_poll_votes for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.room_polls p
      where p.id = poll_id
        and public.is_conversation_participant(p.conversation_id)
        and p.closed_at is null
        and (p.closes_at is null or p.closes_at > now())
    )
  );

create policy "Users can change their own vote while the poll is open"
  on public.room_poll_votes for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.room_polls p
      where p.id = poll_id and p.closed_at is null and (p.closes_at is null or p.closes_at > now())
    )
  );

create policy "Users can retract their own vote while the poll is open"
  on public.room_poll_votes for delete to authenticated
  using (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.room_polls p
      where p.id = poll_id and p.closed_at is null and (p.closes_at is null or p.closes_at > now())
    )
  );

-- ---------------------------------------------------------------------------
-- Aggregate results — never exposes who voted for what, only per-option
-- counts, and only to someone who is actually a participant of that poll's
-- room (re-checked here, independent of the caller's own RLS visibility
-- into room_poll_votes).
-- ---------------------------------------------------------------------------
create or replace function public.room_poll_results(p_poll_id uuid)
returns table(option_id uuid, votes bigint)
language sql
stable
security definer
set search_path to 'public'
as $$
  select o.id, count(v.profile_id)
  from public.room_poll_options o
  left join public.room_poll_votes v on v.option_id = o.id
  where o.poll_id = p_poll_id
    and exists (
      select 1 from public.room_polls p
      where p.id = p_poll_id and public.is_conversation_participant(p.conversation_id)
    )
  group by o.id;
$$;

grant execute on function public.room_poll_results(uuid) to authenticated;
