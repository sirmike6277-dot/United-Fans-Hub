-- 009: awards/voting (architecture proposal §C.8, §L)
-- One-vote-per-period, no self-voting, and voting-window enforcement are
-- all enforced at the database level, not just application code.

create table public.award_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text
);

create table public.award_periods (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.award_categories(id),
  period_label text not null,
  period_start date not null,
  period_end date not null,
  nomination_opens_at timestamptz,
  nomination_closes_at timestamptz,
  voting_opens_at timestamptz,
  voting_closes_at timestamptz,
  status text not null default 'upcoming' check (status in ('upcoming','nominations_open','voting_open','closed','announced')),
  unique (category_id, period_start, period_end)
);

create index idx_award_periods_category on public.award_periods(category_id);

create table public.award_nominations (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.award_periods(id) on delete cascade,
  nominee_profile_id uuid not null references public.profiles(id),
  nominated_by uuid references public.profiles(id),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  unique (period_id, nominee_profile_id)
);

create index idx_award_nominations_period on public.award_nominations(period_id);

create table public.award_votes (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.award_periods(id) on delete cascade,
  nomination_id uuid not null references public.award_nominations(id) on delete cascade,
  voter_profile_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (period_id, voter_profile_id)
);

create index idx_award_votes_nomination on public.award_votes(nomination_id);

create table public.award_winners (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null unique references public.award_periods(id),
  nomination_id uuid not null references public.award_nominations(id),
  vote_count int not null,
  announced_at timestamptz not null default now(),
  badge_id uuid references public.badges(id)
);

alter table public.award_categories enable row level security;
alter table public.award_periods enable row level security;
alter table public.award_nominations enable row level security;
alter table public.award_votes enable row level security;
alter table public.award_winners enable row level security;

create policy "Award categories are publicly readable"
  on public.award_categories for select using (true);
create policy "Award managers manage categories"
  on public.award_categories for all
  using (public.has_role('award_manager')) with check (public.has_role('award_manager'));

create policy "Award periods are publicly readable"
  on public.award_periods for select using (true);
create policy "Award managers manage periods"
  on public.award_periods for all
  using (public.has_role('award_manager')) with check (public.has_role('award_manager'));

-- Nominations: approved ones are public; a nominator/nominee can see their
-- own pending nomination; award managers see and moderate everything.
create policy "Approved nominations are publicly readable"
  on public.award_nominations for select
  using (
    status = 'approved'
    or nominated_by = (select auth.uid())
    or nominee_profile_id = (select auth.uid())
    or public.has_role('award_manager')
  );

create policy "Members can nominate; managers can nominate for anyone"
  on public.award_nominations for insert
  with check (
    nominated_by = (select auth.uid())
    or public.has_role('award_manager')
  );

create policy "Award managers approve or reject nominations"
  on public.award_nominations for update
  using (public.has_role('award_manager'))
  with check (public.has_role('award_manager'));

-- Votes: the unique(period_id, voter_profile_id) constraint is the
-- strongest guarantee against double-voting. RLS additionally enforces the
-- voting window and blocks self-voting; votes are immutable once cast (no
-- update/delete policy for anyone).
create policy "Voters can see their own votes; managers see all"
  on public.award_votes for select
  using (voter_profile_id = (select auth.uid()) or public.has_role('award_manager'));

create policy "Members can vote for approved nominees during voting window"
  on public.award_votes for insert
  with check (
    voter_profile_id = (select auth.uid())
    and exists (
      select 1 from public.award_periods p
      where p.id = period_id and p.status = 'voting_open'
    )
    and exists (
      select 1 from public.award_nominations n
      where n.id = nomination_id and n.period_id = award_votes.period_id and n.status = 'approved'
    )
    and (select auth.uid()) <> (select nominee_profile_id from public.award_nominations where id = nomination_id)
  );

-- Winners: public historical archive; award managers record the outcome
-- once voting closes (no automated settlement function built in this phase).
create policy "Award winners are publicly readable"
  on public.award_winners for select using (true);
create policy "Award managers record winners"
  on public.award_winners for insert
  with check (public.has_role('award_manager'));
