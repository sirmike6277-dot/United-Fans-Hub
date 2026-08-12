import { ClubEmblem } from "@/components/media/ClubEmblem";
import { Wordmark } from "./Wordmark";

/**
 * Server-rendered nav branding: the United Fans Hub wordmark plus the
 * Manchester United emblem (kept as two distinct assets, per branding rules).
 *
 * Deliberately kept out of the client bundle — `ClubEmblem` checks the
 * filesystem for the supplied emblem asset, which only works server-side.
 * `Navbar` is a Client Component (it owns the mobile-menu toggle state), so
 * this is rendered on the server and passed in as a prop rather than
 * imported directly inside it.
 */
export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <ClubEmblem size={28} />
      <Wordmark />
    </div>
  );
}
