-- ============================================================================
-- 011_storage_buckets
-- post-media (public), message-media (private), voice-messages (private)
-- Per proposal §... Storage architecture: no binary media in Postgres;
-- private message/voice media is participant-scoped, not uploader-scoped.
-- No size/mime limits set, matching the existing avatars/covers buckets.
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('post-media', 'post-media', true),
  ('message-media', 'message-media', false),
  ('voice-messages', 'voice-messages', false);

-- ----------------------------------------------------------------------------
-- post-media: public-readable content, matching posts/post_media table RLS.
-- Path convention `{author_id}/{filename}`, same as avatars/covers.
-- ----------------------------------------------------------------------------
create policy "Post media is publicly accessible"
  on storage.objects for select
  using (bucket_id = 'post-media');

create policy "Users can upload their own post media"
  on storage.objects for insert
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can update their own post media"
  on storage.objects for update
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete their own post media"
  on storage.objects for delete
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ----------------------------------------------------------------------------
-- message-media: private, participant-scoped (not uploader-scoped) per
-- proposal — access is keyed to conversation_participants membership so
-- non-participants can never read it, matching the messages table's own
-- access model. Path convention `{conversation_id}/{uploader_id}/{filename}`:
-- the conversation_id segment drives read access for all participants; the
-- uploader_id segment scopes who can update/delete their own upload.
-- ----------------------------------------------------------------------------
create policy "Conversation participants can view message media"
  on storage.objects for select
  using (
    bucket_id = 'message-media'
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = ((storage.foldername(name))[1])::uuid
        and cp.profile_id = (select auth.uid())
    )
  );

create policy "Conversation participants can upload message media"
  on storage.objects for insert
  with check (
    bucket_id = 'message-media'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = ((storage.foldername(name))[1])::uuid
        and cp.profile_id = (select auth.uid())
    )
  );

create policy "Uploaders can update their own message media"
  on storage.objects for update
  using (
    bucket_id = 'message-media'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

create policy "Uploaders can delete their own message media"
  on storage.objects for delete
  using (
    bucket_id = 'message-media'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

-- ----------------------------------------------------------------------------
-- voice-messages: same access model/path convention as message-media, kept
-- as its own bucket per the proposal's explicit bucket list.
-- ----------------------------------------------------------------------------
create policy "Conversation participants can view voice messages"
  on storage.objects for select
  using (
    bucket_id = 'voice-messages'
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = ((storage.foldername(name))[1])::uuid
        and cp.profile_id = (select auth.uid())
    )
  );

create policy "Conversation participants can upload voice messages"
  on storage.objects for insert
  with check (
    bucket_id = 'voice-messages'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = ((storage.foldername(name))[1])::uuid
        and cp.profile_id = (select auth.uid())
    )
  );

create policy "Uploaders can update their own voice messages"
  on storage.objects for update
  using (
    bucket_id = 'voice-messages'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

create policy "Uploaders can delete their own voice messages"
  on storage.objects for delete
  using (
    bucket_id = 'voice-messages'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );