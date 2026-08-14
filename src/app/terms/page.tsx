import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms of Service — United Fans Hub",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-base font-bold uppercase text-red-primary">{title}</h2>
      <div className="mt-2 flex flex-col gap-3">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service" lastUpdated="14 August 2026">
      <p>
        United Fans Hub is an independent, unofficial Manchester United supporters community. We
        are not affiliated with, endorsed by, or operated on behalf of Manchester United Football
        Club. By creating an account or using this app, you agree to these terms.
      </p>

      <Section title="1. Who can use this">
        <p>
          You must be at least 13 years old to create an account. You&apos;re responsible for the
          accuracy of the information on your account and for keeping your login details secure.
          One account per person — impersonating someone else, including another real member, is
          against our community rules (see section 3).
        </p>
      </Section>

      <Section title="2. Your content">
        <p>
          You own what you post — profile details, posts, comments, messages, and anything else
          you upload. By posting it here, you give United Fans Hub permission to display and
          distribute it within the app so the community features actually work. You&apos;re
          responsible for having the right to post whatever you upload — never post someone
          else&apos;s content without permission.
        </p>
      </Section>

      <Section title="3. Community conduct">
        <p>
          Treat other members&apos; opinions with respect, even when you disagree. The following
          are never acceptable, anywhere in the app: insults, harassment, hate speech —
          including racial slurs — impersonation, and spam.
        </p>
        <p>
          Any post, comment, message, or profile can be reported (Spam, Harassment, Hate speech,
          Impersonation, or Other). Every report is reviewed by a real moderator. Depending on
          what happened, a moderator can remove the content in question, issue a warning, or
          suspend or ban the account. Fan Rooms can additionally kick or ban a member from that
          specific room, temporarily or indefinitely, independent of any wider account action.
          Members can also block or mute each other directly at any time, without needing a
          moderator.
        </p>
      </Section>

      <Section title="4. Predictions, points, and awards">
        <p>
          Match predictions, points, Fan Levels, badges, and awards like Fan of the Month and Fan
          of the Season exist for fun within the community — they carry no monetary value and
          are not a gambling product of any kind.
        </p>
      </Section>

      <Section title="5. Manchester United trademarks">
        <p>
          The Manchester United name and crest are trademarks of Manchester United Football Club,
          used here only to identify the club this community is about, under fair use — not to
          claim any affiliation, endorsement, or official status.
        </p>
      </Section>

      <Section title="6. Match data">
        <p>
          Fixture, score, and lineup data is sourced from a third-party provider and may
          occasionally be delayed, incomplete, or wrong. This app is a fan community, not an
          official or authoritative source — for anything that matters, check Manchester United&apos;s
          own channels.
        </p>
      </Section>

      <Section title="7. Suspension and termination">
        <p>
          We can suspend or terminate an account for violating these terms or the community
          conduct rules above. You can stop using the app and request your account be deleted at
          any time.
        </p>
      </Section>

      <Section title="8. Changes to these terms">
        <p>
          We may update these terms as the app changes. We&apos;ll update the date at the top of
          this page when we do.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          The fastest way to reach a moderator about anything covered here is the Report option
          on any post, comment, message, or profile.
        </p>
      </Section>
    </LegalPageShell>
  );
}
