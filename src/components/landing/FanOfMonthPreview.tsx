import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CrownIcon } from "@/components/achievements/AchievementIcons";

/**
 * Was a fabricated winner ("DevilsRed_Kate") with an invented quote,
 * presented as a real award result — flagged in the Phase 12 audit, fixed
 * here (Phase 15). The awards schema (award_categories/periods/nominations/
 * votes/winners) has zero rows and no voting UI yet, so there is no real
 * winner to show. This now matches the exact same honest "Coming soon"
 * treatment the dashboard's FanOfMonthTeaser already uses — a signed-out
 * visitor and a signed-in fan see the same true state of the feature.
 */
export function FanOfMonthPreview() {
  return (
    <section className="bg-bg-elevated py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <Badge tone="red">Fan of the Month</Badge>
        <h2 className="mt-4 font-display text-3xl font-bold uppercase text-white sm:text-4xl">
          Celebrating the community
        </h2>
        <p className="mt-4 text-text-muted">
          Every month, the Hub will recognise the fan who embodies the family most — nominated
          and voted for by fans themselves. Voting isn&apos;t live yet, but it&apos;s on the way.
        </p>

        <Card
          featured
          className="relative mx-auto mt-10 flex max-w-sm flex-col items-center gap-2 overflow-hidden py-10"
          style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(242,193,78,0.18), transparent 60%)" }}
        >
          <div className="relative flex h-20 w-20 items-center justify-center">
            <span className="absolute -top-4 text-[#f2c14e]" aria-hidden="true">
              <CrownIcon size={24} />
            </span>
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[#f2c14e]/50 text-xs text-text-muted">
              ?
            </div>
          </div>
          <Badge tone="outline">Coming soon</Badge>
        </Card>
      </div>
    </section>
  );
}
