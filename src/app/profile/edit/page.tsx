import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { fetchSocialLinks } from "@/lib/profile/socialLinks";

export const metadata: Metadata = {
  title: "Edit Profile — United Fans Hub",
};

export default async function EditProfilePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();

  if (!profile) redirect("/login");

  const initialSocialLinks = await fetchSocialLinks(supabase, userId);

  return (
    <AppShell>
      <main className="flex-1 bg-bg-void py-12">
        <div className="max-w-3xl">
          <h1 className="font-display text-2xl font-bold uppercase text-white sm:text-3xl">
            Edit Profile
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            This is your public fan identity — how the community will see you.
          </p>

          <div className="mt-8">
            <ProfileEditForm profile={profile} initialSocialLinks={initialSocialLinks} />
          </div>
        </div>
      </main>
    </AppShell>
  );
}
