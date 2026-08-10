-- ============================================================================
-- 014_harden_content_ownership_immutability
--
-- Focused follow-up review requested alongside the two critical fixes:
-- posts/comments/messages owner-update policies have the same "USING but no
-- WITH CHECK" shape as the fixed vulnerabilities. Reviewed each field
-- individually; only two are genuinely exploitable, and only those are
-- fixed here. Findings:
--
--   - posts.author_id / comments.author_id / messages.sender_id: NOT
--     exploitable. Confirmed live: attempting to change author_id/sender_id
--     fails with a genuine RLS violation (42501), because these policies
--     have no explicit WITH CHECK, so Postgres implicitly reuses the USING
--     clause as the check against the NEW row — if author_id/sender_id no
--     longer equals auth.uid(), the implicit check fails. No fix needed;
--     left as-is rather than adding redundant trigger logic for something
--     already correctly enforced.
--   - posts.club_id: technically unconstrained by RLS, but NOT exploitable
--     in practice today — the FK to clubs only has one valid row (Manchester
--     United), so there is no *other* value to reassign to; any attempt to
--     set it to a non-existent club fails on the FK constraint, not RLS.
--     Deferred to the multi-club phase, when a second valid value will
--     actually exist and this needs revisiting. Not fixed now (no exploit,
--     avoids scope creep into inactive multi-club work).
--   - posts.status / comments.status: NOT exploitable as a security/
--     ownership issue. The self-revert-a-takedown scenario was tested and
--     confirmed blocked (0 rows) — the *only* SELECT policy on posts/
--     comments is status = 'published', so a moderator-hidden/removed row
--     becomes entirely invisible, including to its own author, and UPDATE
--     requires the row to be visible first. Self-hiding one's own
--     *published* content via status also grants no new capability beyond
--     what deleted_at (the user's own, already-intentional soft-delete)
--     already provides. No cross-user impact either way. Not fixed.
--   - comments.post_id / comments.parent_comment_id: CONFIRMED EXPLOITABLE
--     — verified live that a comment's own author could UPDATE it onto a
--     completely unrelated post, or re-parent it under an arbitrary
--     comment, with no ownership relationship to the destination required.
--     Fixed below.
--   - messages.conversation_id: CONFIRMED EXPLOITABLE — verified live that
--     a message's own sender could move it into a different conversation,
--     including one unrelated to the original. Fixed below.
--   - messages.deleted_at / posts.deleted_at / comments.deleted_at: left
--     untouched — this is the intentional user-facing soft-delete/"unsend"
--     feature, must remain owner-writable.
--
-- No exceptions carved out for moderators/admins in either trigger below:
-- there is no legitimate scenario in this architecture where relocating a
-- comment to a different post, or a message to a different conversation, is
-- a real moderation action (moderation acts via status/deletion, not by
-- moving content), so this is an unconditional rule for everyone.
-- ============================================================================

create function public.protect_comment_thread_identity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.post_id is distinct from old.post_id then
    raise exception 'comments.post_id cannot be changed';
  end if;
  if new.parent_comment_id is distinct from old.parent_comment_id then
    raise exception 'comments.parent_comment_id cannot be changed';
  end if;
  return new;
end;
$$;

comment on function public.protect_comment_thread_identity is
  'BEFORE UPDATE guard: comments.post_id/parent_comment_id are immutable after creation for everyone, including moderators — moving a comment to a different post/parent is not a real moderation action in this architecture. Fixes a confirmed vulnerability found in the pre-UI audit follow-up review.';

revoke all on function public.protect_comment_thread_identity() from public, anon, authenticated;

create trigger protect_comment_thread_identity
  before update on public.comments
  for each row
  execute function public.protect_comment_thread_identity();

create function public.protect_message_conversation_identity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.conversation_id is distinct from old.conversation_id then
    raise exception 'messages.conversation_id cannot be changed';
  end if;
  return new;
end;
$$;

comment on function public.protect_message_conversation_identity is
  'BEFORE UPDATE guard: messages.conversation_id is immutable after creation for everyone — moving a message to a different conversation is not a real moderation action in this architecture. Fixes a confirmed vulnerability found in the pre-UI audit follow-up review.';

revoke all on function public.protect_message_conversation_identity() from public, anon, authenticated;

create trigger protect_message_conversation_identity
  before update on public.messages
  for each row
  execute function public.protect_message_conversation_identity();