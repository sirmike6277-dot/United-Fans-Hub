import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsShell } from "@/components/settings/SettingsShell";

export const metadata: Metadata = {
  title: "Settings — United Fans Hub",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio")
    .eq("id", userId)
    .single();

  if (!profile) redirect("/login");

  const email = typeof claimsData?.claims.email === "string" ? claimsData.claims.email : "";

  return (
    <AppShell>
      <main className="flex-1 bg-bg-void">
        <div className="flex flex-col gap-6 py-6 sm:py-8">
          <PageHeader title="Settings" />
          <SettingsShell
            profileId={profile.id}
            username={profile.username}
            email={email}
            initialDisplayName={profile.display_name ?? ""}
            initialBio={profile.bio ?? ""}
          />
        </div>
      </main>
    </AppShell>
  );
}
