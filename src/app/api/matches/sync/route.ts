import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncFixtures, syncMatchEvents } from "@/lib/matches/sync";

/**
 * Privileged manual sync trigger — Route Handler, following the same
 * convention already established by src/app/auth/callback/route.ts (no
 * Server Actions, no Edge Functions are used anywhere in this app).
 *
 * This is deliberately separate from the passive lazy-revalidation that
 * already runs automatically inside the public /matches and
 * /matches/[matchId] server components (see maybeSyncFixtures /
 * maybeSyncMatchEvents in src/lib/matches/sync.ts) — those keep ordinary
 * visitors' page loads fresh without any privileged access at all. This
 * route exists only for an authorized match_manager/super_admin to force
 * an immediate resync outside the normal staleness window.
 *
 * Authorization reuses the existing has_role() SECURITY DEFINER RPC — the
 * same primitive every other role-gated feature in this app already
 * relies on. No new secret, shared token, or privileged Supabase
 * credential was required or introduced.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: isMatchManager }, { data: isSuperAdmin }] = await Promise.all([
    supabase.rpc("has_role", { role_key: "match_manager" }),
    supabase.rpc("has_role", { role_key: "super_admin" }),
  ]);

  if (!isMatchManager && !isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id")
    .eq("slug", "manchester-united")
    .single();

  if (clubError || !club) {
    return NextResponse.json({ error: "Club is not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { matchId?: unknown } | null;
  const matchId = typeof body?.matchId === "string" ? body.matchId : null;

  if (matchId) {
    const { data: match } = await supabase
      .from("matches")
      .select("id, external_ref")
      .eq("id", matchId)
      .single();

    if (!match || !match.external_ref) {
      return NextResponse.json({ error: "Match not found or has no provider reference." }, { status: 404 });
    }

    const result = await syncMatchEvents({
      matchId: match.id,
      externalRef: match.external_ref,
    });

    // Response intentionally carries only counts/booleans — never provider
    // payloads, credentials, or internals.
    return NextResponse.json({ ok: result.ok, eventsUpserted: result.matchesUpserted });
  }

  const result = await syncFixtures({ clubId: club.id });
  return NextResponse.json({ ok: result.ok, matchesUpserted: result.matchesUpserted });
}
