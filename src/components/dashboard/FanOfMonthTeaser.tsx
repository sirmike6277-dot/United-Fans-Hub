import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CrownIcon } from "@/components/achievements/AchievementIcons";

/**
 * Honest placeholder, not a feature — the awards/voting schema
 * (award_categories/award_periods/award_nominations/award_votes/
 * award_winners) exists but has zero rows and zero UI anywhere in the app
 * (confirmed during the Phase 9 audit). Styled with the same spotlight
 * chrome the reference design gives a real winner (gold glow, crown, ring)
 * so the card reads as "not live yet" rather than "broken/empty" — but the
 * dashed ring stays an empty slot, never a fabricated winner/name/quote/
 * points total standing in for a real one.
 */
export function FanOfMonthTeaser() {
  return (
    <Card
      featured
      className="relative overflow-hidden text-center"
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 0%, rgba(242,193,78,0.16), transparent 60%)",
      }}
    >
      <div className="flex items-center justify-between gap-2 text-left">
        <h2 className="font-display text-lg font-bold uppercase text-white">Fan of the Month</h2>
        <Badge tone="outline">Coming soon</Badge>
      </div>

      <div className="relative mx-auto mt-5 flex h-20 w-20 items-center justify-center">
        <span className="absolute -top-3 text-[#f2c14e]" aria-hidden="true">
          <CrownIcon size={22} />
        </span>
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[#f2c14e]/50 text-xs text-text-muted">
          ?
        </div>
      </div>

      <p className="mt-4 text-sm text-text-muted">
        Every month, the Hub will recognise the fan who embodies the community most — nominated
        and voted for by fans themselves. Voting isn&apos;t live yet, but it&apos;s on the way.
      </p>
    </Card>
  );
}
