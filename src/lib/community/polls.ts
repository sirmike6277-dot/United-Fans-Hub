import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type AnySupabase = SupabaseClient<Database>;

export interface PollOption {
  id: string;
  label: string;
  orderIndex: number;
  votes: number;
}

export interface RoomPoll {
  id: string;
  conversationId: string;
  createdBy: string;
  question: string;
  createdAt: string;
  closesAt: string | null;
  closedAt: string | null;
  options: PollOption[];
  totalVotes: number;
  /** null = hasn't voted. */
  myOptionId: string | null;
}

function isPollOpen(poll: { closedAt: string | null; closesAt: string | null }): boolean {
  if (poll.closedAt) return false;
  if (poll.closesAt && new Date(poll.closesAt) <= new Date()) return false;
  return true;
}

export { isPollOpen };

/**
 * One poll fully hydrated: options + real aggregate counts (via the
 * room_poll_results() SECURITY DEFINER function — see migration 027; it
 * never exposes who voted for what, only per-option totals) + the
 * caller's own vote, if any (the only vote row RLS lets them read).
 */
async function hydratePoll(
  supabase: AnySupabase,
  row: { id: string; conversation_id: string; created_by: string; question: string; created_at: string; closes_at: string | null; closed_at: string | null },
  currentUserId: string,
): Promise<RoomPoll> {
  const [{ data: options }, { data: results }, { data: myVote }] = await Promise.all([
    supabase.from("room_poll_options").select("id, label, order_index").eq("poll_id", row.id).order("order_index"),
    supabase.rpc("room_poll_results", { p_poll_id: row.id }),
    supabase.from("room_poll_votes").select("option_id").eq("poll_id", row.id).eq("profile_id", currentUserId).maybeSingle(),
  ]);

  const countByOption = new Map((results ?? []).map((r) => [r.option_id, Number(r.votes)]));
  const opts = (options ?? []).map((o) => ({
    id: o.id,
    label: o.label,
    orderIndex: o.order_index,
    votes: countByOption.get(o.id) ?? 0,
  }));

  return {
    id: row.id,
    conversationId: row.conversation_id,
    createdBy: row.created_by,
    question: row.question,
    createdAt: row.created_at,
    closesAt: row.closes_at,
    closedAt: row.closed_at,
    options: opts,
    totalVotes: opts.reduce((sum, o) => sum + o.votes, 0),
    myOptionId: myVote?.option_id ?? null,
  };
}

export async function fetchRoomPolls(
  supabase: AnySupabase,
  { conversationId, currentUserId }: { conversationId: string; currentUserId: string },
): Promise<{ polls: RoomPoll[]; error: string | null }> {
  const { data, error } = await supabase
    .from("room_polls")
    .select("id, conversation_id, created_by, question, created_at, closes_at, closed_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false });

  if (error) {
    return { polls: [], error: "Couldn't load polls." };
  }

  const polls = await Promise.all((data ?? []).map((row) => hydratePoll(supabase, row, currentUserId)));
  return { polls, error: null };
}

export async function createPoll(
  supabase: AnySupabase,
  { conversationId, createdBy, question, options }: { conversationId: string; createdBy: string; question: string; options: string[] },
): Promise<{ pollId: string | null; error: string | null }> {
  const { data: poll, error: pollError } = await supabase
    .from("room_polls")
    .insert({ conversation_id: conversationId, created_by: createdBy, question })
    .select("id")
    .single();

  if (pollError || !poll) {
    return { pollId: null, error: "Couldn't create the poll." };
  }

  const { error: optionsError } = await supabase.from("room_poll_options").insert(
    options.map((label, index) => ({ poll_id: poll.id, label, order_index: index })),
  );

  if (optionsError) {
    return { pollId: poll.id, error: "Poll created, but its options couldn't be saved." };
  }

  return { pollId: poll.id, error: null };
}

/** Voting is an upsert on the (poll_id, profile_id) primary key — casting a first vote and changing an existing one use the exact same call. */
export async function castVote(
  supabase: AnySupabase,
  { pollId, optionId, profileId }: { pollId: string; optionId: string; profileId: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("room_poll_votes")
    .upsert({ poll_id: pollId, option_id: optionId, profile_id: profileId }, { onConflict: "poll_id,profile_id" });

  return { error: error ? "Couldn't submit your vote. Please try again." : null };
}

export async function retractVote(
  supabase: AnySupabase,
  { pollId, profileId }: { pollId: string; profileId: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("room_poll_votes").delete().eq("poll_id", pollId).eq("profile_id", profileId);
  return { error: error ? "Couldn't retract your vote." : null };
}

export async function closePoll(supabase: AnySupabase, pollId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("room_polls").update({ closed_at: new Date().toISOString() }).eq("id", pollId);
  return { error: error ? "Couldn't close the poll." : null };
}
