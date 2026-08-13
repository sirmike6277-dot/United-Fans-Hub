import { Navbar } from "@/components/layout/Navbar";
import { Brand } from "@/components/layout/Brand";
import { Sidebar } from "@/components/layout/Sidebar";

/**
 * Shown while messages/layout.tsx's own fetchConversations() resolves —
 * that fetch (not this page) is what actually gates the shared shell, so
 * the skeleton mirrors MessagingShell's two-pane frame rather than this
 * segment's own (trivial, static) page content. Includes the Sidebar the
 * real layout always renders — it was previously missing here, a visible
 * layout shift once the fetch resolved (Phase 15 audit fix, same class of
 * bug as dashboard/loading.tsx).
 */
export default function MessagesLoading() {
  return (
    <>
      <Navbar brand={<Brand />} />
      <main className="flex-1 bg-bg-void">
        <div className="mx-auto flex w-full max-w-[1440px] items-start px-4 sm:px-6 lg:px-8">
          <Sidebar />
          <div className="min-w-0 flex-1">
            <div className="flex h-[calc(100dvh-4rem)] max-w-6xl">
              <div className="flex w-full shrink-0 flex-col gap-1 border-r border-white/10 p-2 lg:w-80">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-control p-2" aria-hidden="true">
                    <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-white/10" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-28 animate-pulse rounded bg-white/10" />
                      <div className="h-3 w-40 max-w-full animate-pulse rounded bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden flex-1 lg:block" />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
