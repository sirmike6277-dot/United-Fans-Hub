import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Brand } from "@/components/layout/Brand";
import { Sidebar } from "@/components/layout/Sidebar";
import { MessagingShell } from "@/components/messaging/MessagingShell";
import { AppearanceEffect } from "@/components/layout/AppearanceEffect";
import { fetchConversations } from "@/lib/messaging/conversations";

/**
 * Shared shell for /messages and /messages/[conversationId] — fetches the
 * conversation list once here (server-side) so both the index route and a
 * specific thread route render the same persistent left pane on desktop,
 * without duplicating the fetch in two page components. Re-runs (and
 * therefore refreshes the list) whenever router.refresh() is called from a
 * thread page — see MessageThread's mark-as-read handling.
 *
 * No <Footer /> here, deliberately: a fixed-height, internally-scrollable
 * chat shell doesn't have the same "scroll to the bottom of the page" shape
 * as the Community/Notifications feeds, so a page footer below it would sit
 * behind the fold in a confusing way. Navbar is kept for consistent
 * identity/navigation.
 */
export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) redirect("/login");

  const { conversations, error } = await fetchConversations(supabase, userId);

  return (
    <>
      {/* AppShell normally owns this — hand-composed here too, same as
          Navbar/Sidebar below, since this route bypasses AppShell (see this
          file's own doc comment). Without it, this route silently never
          applied a signed-in fan's real theme/reduce-motion/text-size
          preferences at all — a real gap this closes, not decoration. */}
      <AppearanceEffect />
      <Navbar brand={<Brand />} />
      <main className="flex-1 bg-bg-void">
        <div className="mx-auto flex w-full max-w-[1440px] items-start px-4 sm:px-6 lg:px-8">
          <Sidebar />
          <div className="min-w-0 flex-1">
            <MessagingShell initialConversations={conversations} initialError={error} currentUserId={userId}>
              {children}
            </MessagingShell>
          </div>
        </div>
      </main>
    </>
  );
}
