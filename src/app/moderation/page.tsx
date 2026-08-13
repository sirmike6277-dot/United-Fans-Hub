import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { ModerationQueue } from "@/components/moderation/ModerationQueue";

export const metadata: Metadata = {
  title: "Moderation — United Fans Hub",
};

/**
 * The moderation queue — gated to `moderator` or `super_admin`, the same
 * role model every prior phase's moderation-adjacent gate used (Fan Room
 * moderation, room polls, award periods). A separate route from `/admin`
 * deliberately: `/admin` is super_admin-only role management (a different,
 * narrower concern); the moderation queue needs to be reachable by plain
 * moderators too, who have no reason to see role management.
 */
export default async function ModerationPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) redirect("/login");

  const [{ data: isModerator }, { data: isSuperAdmin }] = await Promise.all([
    supabase.rpc("has_role", { role_key: "moderator" }),
    supabase.rpc("has_role", { role_key: "super_admin" }),
  ]);

  if (!isModerator && !isSuperAdmin) redirect("/dashboard");

  return (
    <AppShell>
      <main className="flex-1 bg-bg-void">
        <div className="flex flex-col gap-4 py-6 sm:py-8">
          <PageHeader title="Moderation" subtitle="Review reports and take action." />
          <ModerationQueue currentUserId={userId} />
        </div>
      </main>
    </AppShell>
  );
}
