import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Brand } from "./Brand";
import { Footer } from "./Footer";
import { Sidebar } from "./Sidebar";
import { ClubEmblem } from "@/components/media/ClubEmblem";

export interface AppShellProps {
  children: ReactNode;
  /** Rendered as a right rail beside `children` at the xl breakpoint (e.g. Community's trending/next-match widgets). Omit for pages that don't have secondary content. */
  rail?: ReactNode;
}

/**
 * Shared authenticated-app layout: Navbar up top, a persistent left
 * navigation rail from the `lg` breakpoint up (see Sidebar), the page's own
 * content, an optional right-hand widget rail, and the footer. Every
 * auth-gated page should render this instead of hand-assembling
 * Navbar/Footer itself — centralizes the one structural fix that actually
 * makes the app read as a web app instead of a phone screen recentered in a
 * browser tab.
 *
 * Also carries a fixed, very-low-opacity atmosphere layer behind everything
 * (a faint emblem watermark + red glow, echoing the landing Hero/AuthVisual)
 * so the signed-in app doesn't read as flat black once the novelty of any
 * one page's own imagery wears off — deliberately subtle: every card/panel
 * in the app is still fully opaque on top of it, so it never touches
 * legibility, only the void between them.
 *
 * Used by every auth-gated page and, conditionally, by the public /matches
 * page (only when the visitor is signed in — see its own doc comment) and
 * /community/rooms/[roomId] uses a hand-composed equivalent for its
 * different (footerless, fixed-height chat) shape — see that page's comment.
 */
export function AppShell({ children, rail }: AppShellProps) {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-40 -top-40 opacity-[0.035]">
          <ClubEmblem size={720} />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(218,41,28,0.08),transparent_45%)]" />
      </div>

      <div className="relative z-10 flex min-h-full flex-1 flex-col">
        <Navbar brand={<Brand />} />
        <div className="mx-auto flex w-full max-w-[1440px] flex-1 items-start px-4 sm:px-6 lg:px-8">
          <Sidebar />
          <div className="flex min-w-0 flex-1 gap-8 xl:gap-10">
            <div className="min-w-0 flex-1">{children}</div>
            {rail ? <div className="hidden w-80 shrink-0 py-6 xl:block">{rail}</div> : null}
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}
