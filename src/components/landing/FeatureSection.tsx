import { Card } from "@/components/ui/Card";
import { CommunityIcon, PredictionsIcon, RankingsIcon, ChatIcon } from "./FeatureIcons";

const features = [
  {
    title: "Community",
    description:
      "Post, comment, and connect with fans who bleed red. Topic rooms, regional groups, and a feed built for United talk.",
    icon: CommunityIcon,
  },
  {
    title: "Match Predictions",
    description:
      "Call the score, the first scorer, and your Man of the Match before kickoff — earn fan points every matchday.",
    icon: PredictionsIcon,
  },
  {
    title: "Fan Rankings",
    description:
      "Climb the leaderboard, earn badges, and build a reputation as one of the most engaged fans in the Hub.",
    icon: RankingsIcon,
  },
  {
    title: "Chat & Share",
    description:
      "Live matchday discussion, direct messages, and media sharing — all in one place, all in real time.",
    icon: ChatIcon,
  },
];

export function FeatureSection() {
  return (
    <section id="features" className="bg-bg-void py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold uppercase text-ink sm:text-4xl">
            Everything a United fan needs
          </h2>
          <p className="mt-4 text-text-muted">
            One home for the community, the matchday, and the debate.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ title, description, icon: Icon }) => (
            <Card key={title} className="flex flex-col gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full bg-red-primary/15 text-red-primary"
                aria-hidden="true"
              >
                <Icon />
              </span>
              <h3 className="font-display text-lg font-semibold uppercase text-ink">{title}</h3>
              <p className="text-sm text-text-muted">{description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
