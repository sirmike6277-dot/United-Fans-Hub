import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminRolesManager } from "@/components/admin/AdminRolesManager";
import { AdminInviteUserPanel } from "@/components/admin/AdminInviteUserPanel";

export const metadata: Metadata = {
  title: "Admin — United Fans Hub",
};

/**
 * The product's first admin surface (Phase 12's audit flagged this gap:
 * "there is no way for anyone to grant a role to anyone today"). Deliberately
 * scoped to exactly that one capability — role management — not a general
 * admin dashboard. The server-side redirect below is a UX nicety; the real
 * boundary is `user_roles`' own RLS (migration 024) and every mutation this
 * page's component calls goes through those same policies.
 */
export default async function AdminPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) redirect("/login");

  const { data: isSuperAdmin } = await supabase.rpc("has_role", { role_key: "super_admin" });
  if (!isSuperAdmin) redirect("/dashboard");

  return (
    <AppShell>
      <main className="flex-1 bg-bg-void">
        <div className="flex flex-col gap-4 py-6 sm:py-8">
          <PageHeader title="Admin" subtitle="Grant or revoke roles — moderator, super admin, and other operational roles." />
          <AdminInviteUserPanel />
          <AdminRolesManager currentUserId={userId} />
        </div>
      </main>
    </AppShell>
  );
}
