const FAQS: { question: string; answer: string }[] = [
  {
    question: "How do I earn points and level up?",
    answer:
      "Right now, points come from Match Predictions: +3 for calling the correct result, +5 more on top of that for the exact scoreline, and +3 for the correct first goalscorer. Your total points move you up the Fan Level ladder: Fan → Regular (25 pts) → Supporter (75 pts) → Loyal Fan (150 pts) → Superfan (300 pts) → Legend (500 pts).",
  },
  {
    question: "How does Fan of the Month / Fan of the Season work?",
    answer:
      "Any member can nominate a fellow fan (you can't nominate yourself) — a moderator reviews and approves real nominations, then the community votes. The nomination with the most votes when voting closes wins. It's decided by your fellow fans' votes, not by points or badges.",
  },
  {
    question: "What are badges?",
    answer:
      "Badges recognise real activity — Match Predictor (10 correct predictions), Top Commenter (100 comments), Content Creator (50 posts), United Loyal (1 year of membership), and a couple more. They're shown on your profile based on your real, current stats.",
  },
  {
    question: "What's the difference between blocking and muting someone?",
    answer:
      "Blocking is the stronger action — it stops mutual interaction. Muting just hides someone's content from your own view without them knowing. Manage both from Settings → Privacy.",
  },
  {
    question: "How do I report something?",
    answer:
      "Every post, comment, message, and profile has a report option. Pick the reason that fits — Spam, Harassment, Hate speech, Impersonation, or Other — and add details if you can. A moderator reviews every report.",
  },
  {
    question: "What happens if I break the community rules?",
    answer:
      "Depends on what happened and how serious it is. A moderator can remove the content, issue a warning, or suspend or ban the account — Fan Rooms can also kick or ban a member from that specific room. See the community guidelines (shown when you joined, and always available in our Terms) for the full picture.",
  },
  {
    question: "How do I change my profile picture or cover photo?",
    answer: "Go to Profile → Edit Profile — both your avatar and your cover photo can be uploaded and repositioned there.",
  },
];

/**
 * The "Help" settings tab's real content — was a permanent "Coming soon"
 * placeholder. Static FAQ (no new schema needed) grounded in this app's
 * actual, verified mechanics — not invented copy.
 *
 * Deliberately does NOT show a support email address: this project has no
 * real, monitored support inbox configured anywhere (confirmed — no email-
 * sending infrastructure exists beyond Supabase's own auth emails). A
 * fabricated address would look real and go nowhere, which is worse than
 * pointing to the one contact mechanism that's actually real and
 * moderator-reviewed today: Report a problem. If a real support address
 * gets set up later, this is the one place to add it.
 */
export function HelpPanel() {
  return (
    <div>
      <h2 className="font-display text-xl font-bold uppercase text-red-primary">Help</h2>
      <p className="mt-1 text-sm text-text-muted">Answers to the most common questions.</p>

      <div className="mt-6 flex flex-col divide-y divide-ink/10">
        {FAQS.map(({ question, answer }) => (
          <details key={question} className="group py-4 first:pt-0 last:pb-0">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-ink marker:content-none">
              {question}
              <span className="shrink-0 text-text-muted transition-transform group-open:rotate-45" aria-hidden="true">
                +
              </span>
            </summary>
            <p className="mt-2 text-sm text-text-muted">{answer}</p>
          </details>
        ))}
      </div>

      <div className="mt-6 rounded-control border border-ink/10 bg-bg-elevated p-4">
        <p className="text-sm font-medium text-ink">Still need help?</p>
        <p className="mt-1 text-xs text-text-muted">
          There&apos;s no separate support inbox yet — the fastest way to reach a moderator is
          the <strong className="font-medium text-ink">Report</strong> option on any post,
          comment, message, or profile. Every report is reviewed by a real moderator.
        </p>
      </div>
    </div>
  );
}
