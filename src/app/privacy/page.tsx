import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy — United Fans Hub",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-base font-bold uppercase text-red-primary">{title}</h2>
      <div className="mt-2 flex flex-col gap-3">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" lastUpdated="14 August 2026">
      <p>
        This page explains what United Fans Hub collects, why, and how it&apos;s used. We collect
        only what the app&apos;s own features actually need to work — nothing is sold, and there
        are no advertising or tracking networks anywhere in this app.
      </p>

      <Section title="1. What we collect">
        <p>
          <strong className="font-medium text-ink">Account information</strong>: your email
          address and username, used to sign you in.
        </p>
        <p>
          <strong className="font-medium text-ink">Profile information you choose to add</strong>:
          display name, bio, avatar and cover photos, favourite player/era/shirt, and any other
          fan-profile fields you fill in.
        </p>
        <p>
          <strong className="font-medium text-ink">Content you create</strong>: posts, comments,
          messages, match predictions, reactions, and reports you file.
        </p>
      </Section>

      <Section title="2. How we use it">
        <p>
          To run the app&apos;s actual features — your community feed, predictions and
          leaderboards, Fan Rooms and messages, and notifications — and to keep the community
          safe, which is what your reports and our moderators&apos; review of them are for.
        </p>
      </Section>

      <Section title="3. Who we share it with">
        <p>
          <strong className="font-medium text-ink">Supabase</strong> hosts our database,
          handles sign-in, and stores uploaded images (avatars, cover photos, post media). {" "}
          <strong className="font-medium text-ink">API-Football</strong> is the source of real
          fixture, score, and lineup data shown in Match Centre — we send it match/team
          identifiers, never your personal information. We don&apos;t use any advertising,
          analytics-tracking, or data-broker service, and we never sell your data.
        </p>
      </Section>

      <Section title="4. Cookies and sessions">
        <p>
          We use a session cookie to keep you signed in — that&apos;s it. No third-party
          advertising or tracking cookies.
        </p>
      </Section>

      <Section title="5. How long we keep it">
        <p>
          Your content and profile stay while your account is active. If you&apos;re reported or
          a moderator takes action, that record is kept longer for community-safety and audit
          purposes, even if the related content is later removed or your account is deleted.
        </p>
      </Section>

      <Section title="6. Your rights">
        <p>
          You can edit or remove most of your profile information at any time from Edit Profile.
          You can request your account be deleted — reach out via the Report option on any post,
          comment, message, or profile, and a moderator will pick it up.
        </p>
      </Section>

      <Section title="7. Children">
        <p>This app isn&apos;t intended for children under 13.</p>
      </Section>

      <Section title="8. Changes to this policy">
        <p>We&apos;ll update the date at the top of this page whenever this policy changes.</p>
      </Section>
    </LegalPageShell>
  );
}
