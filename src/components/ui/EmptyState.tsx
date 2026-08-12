import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Shared shape for "nothing here yet" states — the same icon+heading+
 * description+action structure that Members/Notifications/Predictions/
 * Messages already each built independently. New sections (Dashboard's
 * teasers) use this directly instead of re-hand-rolling it a sixth time;
 * existing call sites are left as-is (behavior-identical, no regression
 * risk) rather than swept into a refactor this phase didn't ask for.
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-white/10 bg-bg-surface p-10 text-center">
      {icon}
      <p className="font-display text-lg font-semibold text-white">{title}</p>
      {description ? <p className="text-sm text-text-muted">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
