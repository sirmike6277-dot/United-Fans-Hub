import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Contact — United Fans Hub",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-base font-bold uppercase text-red-primary">{title}</h2>
      <div className="mt-2 flex flex-col gap-3">{children}</div>
    </section>
  );
}

/**
 * Set this once a real inbox exists — the "Everything else" section below
 * renders a graceful "coming soon" state instead of a mailto link while
 * this is empty, rather than showing a fabricated address. Nothing else on
 * this page needs to change when it's filled in.
 */
const CONTACT_EMAIL = "";

export default function ContactPage() {
  return (
    <LegalPageShell title="Contact" lastUpdated="14 August 2026">
      <p>
        United Fans Hub is run by a small, independent team. Here&apos;s the best way to reach us
        depending on what you need.
      </p>

      <Section title="Reporting a post, message, or user">
        <p>
          For anything that breaks our{" "}
          <a href="/terms" className="text-red-primary hover:underline">
            Terms of Service
          </a>{" "}
          — harassment, spam, impersonation, or anything else that needs moderator attention — use
          the <strong className="font-medium text-ink">Report</strong> option on the post,
          comment, message, or profile itself. It reaches our moderation team directly and is the
          fastest way to get something looked at.
        </p>
      </Section>

      <Section title="Everything else">
        {CONTACT_EMAIL ? (
          <p>
            For account issues, feedback, or anything not covered above, email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-red-primary hover:underline">
              {CONTACT_EMAIL}
            </a>
            . We aim to reply within a few business days.
          </p>
        ) : (
          <p className="rounded-card border border-ink/10 bg-bg-elevated p-4 text-text-muted">
            A dedicated contact email is on its way and will appear here shortly. In the meantime,
            please use the in-app Report option above for anything urgent.
          </p>
        )}
      </Section>

      <Section title="Legal requests">
        <p>
          For anything relating to our{" "}
          <a href="/terms" className="text-red-primary hover:underline">
            Terms of Service
          </a>{" "}
          or{" "}
          <a href="/privacy" className="text-red-primary hover:underline">
            Privacy Policy
          </a>
          , including data access or deletion requests, please use the same channels above and
          mention what you&apos;re reaching out about.
        </p>
      </Section>
    </LegalPageShell>
  );
}
