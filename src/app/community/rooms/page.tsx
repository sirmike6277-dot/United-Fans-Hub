import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { SectionBanner } from "@/components/layout/SectionBanner";
import { RoomsDirectory } from "@/components/community/RoomsDirectory";
import { fetchRooms } from "@/lib/community/rooms";

export const metadata: Metadata = {
  title: "Fan Rooms — United Fans Hub",
};

export default async function FanRoomsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) redirect("/login");

  const [{ rooms, error }, { data: isModerator }, { data: isSuperAdmin }] = await Promise.all([
    fetchRooms(supabase, userId),
    supabase.rpc("has_role", { role_key: "moderator" }),
    supabase.rpc("has_role", { role_key: "super_admin" }),
  ]);

  return (
    <AppShell>
      <main className="flex-1 bg-bg-void">
        <div className="mb-6 pt-6 sm:pt-8">
          <SectionBanner
            imageSrc="/images/stadium/old-trafford-exterior-sunset.jpg"
            imageAlt="Old Trafford's exterior at sunset"
            kicker="Fan Rooms"
            title="Join a shared space for United fans."
            subtitle="Matchday chat, transfer talk, and more — pick a room and jump in."
          />
        </div>
        <RoomsDirectory
          currentUserId={userId}
          rooms={rooms}
          error={error}
          canCreateRoom={Boolean(isModerator || isSuperAdmin)}
        />
      </main>
    </AppShell>
  );
}
