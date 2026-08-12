import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-aligned contextual action (e.g. a "Mark all as read" or "Create Post" button). */
  action?: ReactNode;
}

/**
 * Consistent page-level heading used across every authenticated section
 * (Community, Members, Notifications, Match Centre, Predictions, Dashboard)
 * — replaces each page's own hand-rolled `<h1 className="font-display...">`
 * block with one shared component, so title size/weight/spacing and the
 * title+action layout never drift between sections.
 */
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-xl font-bold uppercase text-white sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
