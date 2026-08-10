-- 005: unified messaging (architecture proposal §C.4, §N)
-- One engine for DMs, group DMs, and community/regional rooms — discriminated
-- by conversations.kind. community_rooms is a satellite table for the
-- public/browsable identity of room-kind conversations only.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('dm','group_dm','community_room','regional_room')),
  club_id uuid references public.clubs(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member','admin')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, profile_id)
);

create index idx_conversation_participants_profile on public.conversation_participants(profile_id);

create table public.community_rooms (
  conversation_id uuid primary key references public.conversations(id) on delete cascade,
  slug text not null unique,
  name text not null,
  description text,
  is_regional boolean not null default false,
  region text
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index idx_messages_conversation_created on public.messages(conversation_id, created_at);

create table public.message_media (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  media_type text not null check (media_type in ('image','video','file','voice')),
  storage_path text not null,
  duration_seconds int,
  created_at timestamptz not null default now()
);

create index idx_message_media_message_id on public.message_media(message_id);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.community_rooms enable row level security;
alter table public.messages enable row level security;
alter table public.message_media enable row level security;

-- conversations: participant-scoped read regardless of kind — joining a
-- room (via conversation_participants) is required to see the conversation
-- itself, even though the room's public identity (community_rooms) is
-- separately browsable below.
create policy "Participants can read their conversations"
  on public.conversations for select
  using (exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = conversations.id and cp.profile_id = (select auth.uid())
  ));

-- Any authenticated user can start a DM/group DM; creating a community or
-- regional room is moderator-gated (not specified explicitly in the
-- proposal — a documented implementation decision, same posture as clubs).
create policy "Users can create DMs; moderators can create rooms"
  on public.conversations for insert
  with check (
    (kind in ('dm','group_dm') and created_by = (select auth.uid()))
    or (kind in ('community_room','regional_room') and public.has_role('moderator'))
  );

-- conversation_participants: participant-scoped read; join-yourself, or be
-- added by the conversation's creator or an existing admin participant —
-- the minimum mechanics required for DM/group creation and room joining to
-- function, not a new business rule beyond that.
create policy "Participants can see co-participants"
  on public.conversation_participants for select
  using (exists (
    select 1 from public.conversation_participants cp2
    where cp2.conversation_id = conversation_participants.conversation_id
      and cp2.profile_id = (select auth.uid())
  ));

create policy "Join self, or be added by creator/admin"
  on public.conversation_participants for insert
  with check (
    profile_id = (select auth.uid())
    or (select auth.uid()) = (select created_by from public.conversations where id = conversation_id)
    or exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
        and cp.profile_id = (select auth.uid()) and cp.role = 'admin'
    )
  );

create policy "Users can update their own participant row"
  on public.conversation_participants for update
  using (profile_id = (select auth.uid()));

create policy "Users can leave conversations"
  on public.conversation_participants for delete
  using (profile_id = (select auth.uid()));

-- community_rooms: publicly browsable directory; moderator-managed.
create policy "Community rooms are publicly readable"
  on public.community_rooms for select
  using (true);

create policy "Moderators manage community rooms"
  on public.community_rooms for all
  using (public.has_role('moderator'))
  with check (public.has_role('moderator'));

-- messages: strictly participant-scoped, per instruction.
create policy "Participants can read messages"
  on public.messages for select
  using (exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id and cp.profile_id = (select auth.uid())
  ));

create policy "Participants can send messages"
  on public.messages for insert
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.profile_id = (select auth.uid())
    )
  );

create policy "Senders can edit or soft-delete their own messages"
  on public.messages for update
  using (sender_id = (select auth.uid()));

-- message_media: readable wherever the parent message is readable;
-- attachable only by the parent message's own sender.
create policy "Participants can read message media"
  on public.message_media for select
  using (exists (
    select 1 from public.messages m
    join public.conversation_participants cp on cp.conversation_id = m.conversation_id
    where m.id = message_media.message_id and cp.profile_id = (select auth.uid())
  ));

create policy "Senders can attach media to their own messages"
  on public.message_media for insert
  with check (exists (
    select 1 from public.messages m
    where m.id = message_media.message_id and m.sender_id = (select auth.uid())
  ));
