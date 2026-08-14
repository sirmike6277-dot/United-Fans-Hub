import { Brand } from "@/components/layout/Brand";
import { TheatreOfDreamsMark } from "@/components/ui/TheatreOfDreamsMark";

export interface AuthHeaderProps {
  heading: string;
  subtext: string;
}

/**
 * Top-of-panel branding + heading, shared by all three auth pages. Renders
 * <Brand /> (Wordmark + ClubEmblem) server-side — see Brand.tsx for why that
 * can't live inside a "use client" form component.
 */
export function AuthHeader({ heading, subtext }: AuthHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-1.5">
        <Brand />
        <TheatreOfDreamsMark className="text-sm" />
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold uppercase text-ink sm:text-3xl">
          {heading}
        </h1>
        <p className="mt-2 text-sm text-text-muted">{subtext}</p>
      </div>
    </div>
  );
}
