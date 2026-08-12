import { Badge } from "@/components/ui/Badge";

export interface MatchStatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * Status is always shown as explicit text, never colour alone (a required
 * accessibility property here) — "LIVE" carries a pulsing dot as a visual
 * accent, but the word itself is what actually communicates the state.
 */
export function MatchStatusBadge({ status, className = "" }: MatchStatusBadgeProps) {
  switch (status) {
    case "live":
      return (
        <Badge tone="red" className={className}>
          <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
          Live
        </Badge>
      );
    case "finished":
      return (
        <Badge tone="neutral" className={className}>
          Full-time
        </Badge>
      );
    case "postponed":
      return (
        <Badge tone="outline" className={className}>
          Postponed
        </Badge>
      );
    case "cancelled":
      return (
        <Badge tone="outline" className={className}>
          Cancelled
        </Badge>
      );
    case "scheduled":
    default:
      return (
        <Badge tone="outline" className={className}>
          Upcoming
        </Badge>
      );
  }
}
