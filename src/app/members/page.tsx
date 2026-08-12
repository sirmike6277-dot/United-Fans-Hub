import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { SectionBanner } from "@/components/layout/SectionBanner";
import { MembersDirectory } from "@/components/members/MembersDirectory";
import { fetchMembersPage, MEMBERS_PAGE_SIZE } from "@/lib/members/members";

export const metadata: Metadata = {
  title: "Members — United Fans Hub",
};

export default async function MembersPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) redirect("/login");

  const { members, error } = await fetchMembersPage(supabase, {
    from: 0,
    to: MEMBERS_PAGE_SIZE - 1,
    currentUserId: userId,
    query: "",
  });

  return (
    <AppShell>
      <main className="flex-1 bg-bg-void">
        <div className="mb-6 pt-6 sm:pt-8">
          <SectionBanner
            imageSrc="/images/stadium/old-trafford-reds-mural.jpg"
            imageAlt="The 'THE REDS GO MARCHING ON' mural on Old Trafford's forecourt wall"
            kicker="Members"
            title="Meet the Red Army"
            quote={{
              quote: "Manchester United is a special club. There is nothing quite like it.",
              attribution: "Sir Bobby Charlton",
            }}
          />
        </div>
        <MembersDirectory
          currentUserId={userId}
          initialMembers={members}
          initialError={error}
          initialHasMore={members.length === MEMBERS_PAGE_SIZE}
        />
      </main>
    </AppShell>
  );
}
