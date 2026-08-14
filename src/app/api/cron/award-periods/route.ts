import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { advancePeriods } from "@/lib/awards/awards";

/**
 * Vercel Cron endpoint — the scheduled half of "Run both" (see
 * vercel.json's `crons` entry, currently daily). Advances every award
 * category's current period one step at whatever stage it's due:
 * auto-nominates + opens a 3-day vote once a period's window ends, or
 * closes voting + announces a winner once that window elapses. See
 * migration 052 / advance_award_periods() for the actual state machine —
 * this route is a thin, unauthenticated-by-anyone-but-Vercel trigger for it.
 *
 * Two independent layers keep this from being a public "run arbitrary
 * privileged SQL" endpoint:
 *  - CRON_SECRET: Vercel's own documented pattern for securing Cron Jobs —
 *    it sends `Authorization: Bearer <CRON_SECRET>` on scheduled
 *    invocations when that env var is set on the project, and this route
 *    rejects anything else with 401 before touching the database at all.
 *  - Even past that check, the request only ever reaches
 *    advance_award_periods() via the service-role client
 *    (src/lib/supabase/service.ts, the same one Match Centre sync already
 *    uses) — the RPC's own coalesce(auth.role(), '') = 'service_role'
 *    check (migration 052) is the real, final authorization boundary, not
 *    this header.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured on the server." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { log, error } = await advancePeriods(supabase);

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, log });
}
