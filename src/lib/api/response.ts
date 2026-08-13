import { NextResponse } from "next/server";

/**
 * Shared response envelope for the public /api/manchester-united/* routes
 * (Production Football Data Architecture, Phase 1) — every success
 * response carries the same three fields so a consumer never has to guess
 * how fresh what it's looking at is.
 *
 * `source` is never inferred from "does Supabase happen to have data" —
 * that can be present and stale at the same time. It's derived from the
 * real, persisted sync provenance sync.ts's maybeSync* functions now
 * return (see SyncAttemptResult):
 * - "cache": this request didn't need to (or didn't win the claim to)
 *   attempt a sync — the data is whatever was already in Supabase.
 * - "api": this request's own claim won and its own provider call
 *   succeeded — the freshest possible answer.
 * - "cached-stale": this request needed to sync and attempted to, but the
 *   provider call failed — still real, previously-synced data, just
 *   known-stale rather than silently presented as current. Never a 500
 *   for a provider-side failure; the frontend can show "last updated X
 *   minutes ago" using `lastUpdated` instead of a broken page.
 */
export type ResponseSource = "cache" | "api" | "cached-stale";

export interface ApiEnvelope<T> {
  data: T;
  lastUpdated: string;
  source: ResponseSource;
}

/** A successful response. `lastUpdated` is an ISO timestamp — the caller decides what it means for this particular payload (e.g. the most recent kickoff_at, or simply "now" if nothing more specific applies). */
export function jsonData<T>(data: T, { source, lastUpdated }: { source: ResponseSource; lastUpdated: string }): NextResponse<ApiEnvelope<T>> {
  return NextResponse.json({ data, lastUpdated, source });
}

/**
 * A failure response — always `{ error: string }` with a matching HTTP
 * status, same convention already established by
 * src/app/api/matches/sync/route.ts. `message` must already be a clean,
 * user-safe string: never pass a raw caught error or its `.message`
 * straight through here, since that risks leaking internal database/
 * provider details. Callers should log the real error server-side (see
 * every route below) and pass a separate, generic message to this
 * function.
 */
export function jsonError(message: string, status: number): NextResponse<{ error: string }> {
  return NextResponse.json({ error: message }, { status });
}
