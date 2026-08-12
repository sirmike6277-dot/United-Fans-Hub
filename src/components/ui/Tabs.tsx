"use client";

import { useState, type ReactNode } from "react";

export interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  /** Defaults to the first tab. */
  defaultTab?: string;
}

/**
 * Minimal accessible tab strip (role="tablist"/"tab"/"tabpanel", each tab
 * a real focusable button with a visible focus ring, active tab marked via
 * aria-selected and an underline rather than color alone) — first new
 * interactive primitive this phase, used to give Predictions ("Overview" /
 * "Leaderboard" / "History") and the reference design's tabbed sections a
 * real, reusable mechanism instead of a one-off per page.
 */
export function Tabs({ tabs, defaultTab }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key);

  return (
    <div>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-white/10">
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
                isActive ? "text-white" : "text-text-muted hover:text-white"
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
