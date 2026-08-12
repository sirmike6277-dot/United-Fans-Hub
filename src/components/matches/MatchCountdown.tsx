"use client";

import { useEffect, useState } from "react";

function computeParts(kickoffAtIso: string) {
  const diffMs = new Date(kickoffAtIso).getTime() - Date.now();
  const clamped = Math.max(0, diffMs);
  const days = Math.floor(clamped / (24 * 60 * 60 * 1000));
  const hours = Math.floor((clamped / (60 * 60 * 1000)) % 24);
  const minutes = Math.floor((clamped / (60 * 1000)) % 60);
  return { days, hours, minutes, past: diffMs <= 0 };
}

/**
 * Live countdown to a real kickoff time — ticks client-side from the same
 * `kickoff_at` every other match component already reads, never a
 * fabricated or placeholder date. Renders nothing once kickoff has passed
 * (the match card's own status badge takes over from there).
 */
export function MatchCountdown({ kickoffAtIso }: { kickoffAtIso: string }) {
  const [parts, setParts] = useState(() => computeParts(kickoffAtIso));

  useEffect(() => {
    const id = setInterval(() => setParts(computeParts(kickoffAtIso)), 60_000);
    return () => clearInterval(id);
  }, [kickoffAtIso]);

  if (parts.past) return null;

  const tiles = [
    { value: parts.days, label: "Days" },
    { value: parts.hours, label: "Hours" },
    { value: parts.minutes, label: "Mins" },
  ];

  return (
    <div className="flex items-center gap-2" role="timer" aria-label="Time until kickoff">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="flex w-16 flex-col items-center gap-0.5 rounded-control border border-white/10 bg-bg-elevated py-2"
        >
          <span className="font-display text-xl font-bold tabular-nums text-white">{tile.value}</span>
          <span className="text-[10px] uppercase tracking-wide text-text-muted">{tile.label}</span>
        </div>
      ))}
    </div>
  );
}
