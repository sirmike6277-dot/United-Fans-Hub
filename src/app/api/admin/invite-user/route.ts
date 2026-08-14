import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSiteUrl } from "@/lib/site-url";

// Deliberately simple — just "looks like an email", not RFC 5322-exact.
// Supabase's own admin API is the real validation boundary (it rejects a
// genuinely malformed address); this only exists to fail fast with a clear
// message instead of a round trip for an obviously-empty/typo'd input.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Admin-only: invites someone by email to create a United Fans Hub account
 * — the server-side half of AdminInviteUserPanel.tsx. Two-part gate, the
 * exact same shape src/app/admin/page.tsx itself already uses to decide
 * whether to render the admin surface at all: a real signed-in session,
 * then has_role('super_admin') via RPC. Neither check is optional — this
 * route calls auth.admin.inviteUserByEmail via the service-role client
 * (src/lib/supabase/service.ts), which bypasses RLS entirely, so the role
 * check here is the ONLY thing standing between "signed in" and "can create
 * accounts for arbitrary emails."
 *
 * redirectTo points at /reset-password, not a dedicated "accept invite"
 * page — Supabase's invite link authenticates the recipient the same way a
 * password-recovery link does (a `code` to exchange for a session), and
 * ResetPasswordForm.tsx is already fully generic about where that code came
 * from: it exchanges whatever's in the URL, then lets them set a password.
 * Reusing it here means a newly-invited fan's very first action is setting
 * their own password, with zero new UI needed for that step.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data: isSuperAdmin } = await supabase.rpc("has_role", { role_key: "super_admin" });
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Only a super admin can invite new users." }, { status: 403 });
  }

  let email: unknown;
  try {
    ({ email } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { error } = await serviceClient.auth.admin.inviteUserByEmail(email.trim(), {
    redirectTo: `${getSiteUrl()}/reset-password`,
  });

  if (error) {
    // Supabase's own message for a duplicate is specific and safe to show
    // as-is ("A user with this email address has already been registered")
    // — surfaced directly rather than replaced with a generic string, since
    // it's actionable and doesn't leak anything beyond what the admin
    // themself just tried to do.
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
