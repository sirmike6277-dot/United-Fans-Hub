"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

export interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  /** Defaults to the first tab. */
  defaultTab?: string;
  /**
   * Pins the tab strip just below the sticky Navbar (top-16, matching its
   * h-16) instead of scrolling away with the page — opt-in, not the
   * default, since most Tabs usages (Predictions' Overview/Leaderboard/
   * History) are short enough that it isn't needed. Match Centre turns
   * this on: its Results tab can render dozens of matches (FixtureList has
   * no cap), and without this, scrolling into that list scrolls the
   * Overview/Fixtures/Results strip itself out of view — there was no way
   * back to another tab except scrolling all the way back to the top.
   */
  sticky?: boolean;
}

/**
 * Minimal accessible tab strip (role="tablist"/"tab"/"tabpanel", each tab
 * a real focusable button with a visible focus ring, active tab marked via
 * aria-selected and an underline rather than color alone) — first new
 * interactive primitive this phase, used to give Predictions ("Overview" /
 * "Leaderboard" / "History") and the reference design's tabbed sections a
 * real, reusable mechanism instead of a one-off per page.
 *
 * Also honours a `?tab=<key>` URL search param as a deep-link into a
 * specific tab, checked both on first mount and on every subsequent
 * navigation (see the effect below) — a real bug this fixes: Match
 * Centre's "See all results" link (MatchOverviewCard) pointed at
 * `/matches`, the exact URL already showing, so clicking it did visibly
 * nothing (Tabs had no URL awareness at all, and Results lives behind a
 * tab, not a page section). Clicking a tab button itself still only
 * updates local state, not the URL — deliberately: that keeps ordinary
 * tab-switching instant and free of any server round-trip, and this app's
 * only current need for a stable, shareable tab link is the one
 * deep-link case this fixes.
 */
export function Tabs({ tabs, defaultTab, sticky = false }: TabsProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const isValidTabParam = (key: string | null): key is string =>
    key !== null && tabs.some((t) => t.key === key);

  const [active, setActive] = useState(
    isValidTabParam(tabParam) ? tabParam : (defaultTab ?? tabs[0]?.key),
  );

  // Handles arriving at an already-mounted Tabs instance via a new `?tab=`
  // value (e.g. clicking "See all results" while already on /matches) —
  // the lazy useState initializer above only ever runs once, on first
  // mount, so without this a same-page navigation would silently no-op
  // exactly like the original bug. React's own recommended "adjust state
  // during render" pattern (not a useEffect — this project's linter
  // flags setState-in-effect as an avoidable extra render): tracking the
  // last-seen tabParam means this only fires on an actual URL change, not
  // every render.
  const [lastTabParam, setLastTabParam] = useState(tabParam);
  if (tabParam !== lastTabParam) {
    setLastTabParam(tabParam);
    if (isValidTabParam(tabParam)) {
      setActive(tabParam);
    }
  }

  return (
    <div>
      <div
        role="tablist"
        className={`flex gap-1 overflow-x-auto border-b border-ink/10 ${sticky ? "sticky top-16 z-10 bg-bg-void" : ""}`}
      >
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.key}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(tab.key)}
              className={`relative shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary ${
                isActive ? "text-ink" : "text-text-muted hover:text-ink"
              }`}
            >
              {tab.label}
              {isActive ? (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-red-primary" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) =>
        active === tab.key ? (
          <div
            key={tab.key}
            role="tabpanel"
            id={`tabpanel-${tab.key}`}
            aria-labelledby={`tab-${tab.key}`}
            className="pt-5"
          >
            {tab.content}
          </div>
        ) : null,
      )}
    </div>
  );
}
