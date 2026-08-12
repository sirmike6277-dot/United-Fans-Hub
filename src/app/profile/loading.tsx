import { AppShell } from "@/components/layout/AppShell";
import { ProfileViewSkeleton } from "@/components/profile/ProfileViewSkeleton";

// Wrapped in AppShell so the Sidebar matches the real page from the first
// paint (Phase 15 audit fix — see dashboard/loading.tsx).
export default function ProfileLoading() {
  return (
    <AppShell>
      <ProfileViewSkeleton />
    </AppShell>
  );
}
