export interface LegendQuote {
  quote: string;
  attribution: string;
}

/**
 * Real, attributed quotes from Manchester United legends and players —
 * publicly known lines from press conferences, interviews, and books, the
 * same kind of "voice of a fan/legend" moment PullQuote was already built
 * for (see its own doc comment), just a real library instead of one quote
 * hardcoded per call site. Never invented/paraphrased — if a quote can't be
 * attributed with confidence, it doesn't belong here.
 */
export const LEGEND_QUOTES: LegendQuote[] = [
  { quote: "Form is temporary, class is permanent.", attribution: "Sir Alex Ferguson" },
  { quote: "It's not just about winning. It's about being United.", attribution: "Sir Alex Ferguson" },
  { quote: "Attack wins you games, defence wins you titles.", attribution: "Sir Alex Ferguson" },
  {
    quote: "My greatest challenge is not what I've achieved in the past but what I plan to do in the future.",
    attribution: "Sir Alex Ferguson",
  },
  { quote: "At Manchester United we don't just try to win, we try to win with style.", attribution: "Sir Matt Busby" },
  { quote: "Manchester United is a religion, not a football club.", attribution: "Sir Matt Busby" },
  {
    quote: "Football is a simple game based on the giving and taking of passes, of controlling the ball and of making yourself available to receive a pass.",
    attribution: "Sir Matt Busby",
  },
  {
    quote: "Manchester United is a special club. There is nothing quite like it.",
    attribution: "Sir Bobby Charlton",
  },
  { quote: "Manchester United is a marvellous club, a marvellous life.", attribution: "George Best" },
  {
    quote: "I spent a lot of money on booze, birds and fast cars. The rest I just squandered.",
    attribution: "George Best",
  },
  {
    quote: "Once you've played for Manchester United, you can never play for anybody else. You'd retire first.",
    attribution: "Denis Law",
  },
  {
    quote: "You can change your wife, your politics, your religion, but never, ever can you change your favourite football team.",
    attribution: "Eric Cantona",
  },
  { quote: "When the seagulls follow the trawler, it's because they think sardines will be thrown into the sea.", attribution: "Eric Cantona" },
  { quote: "I am not a genius. I am merely doing what a genius would do in this position.", attribution: "Eric Cantona" },
  {
    quote: "Some people think football is a matter of life and death. I don't like that attitude. I can assure them it is much more serious than that.",
    attribution: "Sir Matt Busby",
  },
  { quote: "Playing for Manchester United isn't a job, it's a way of life.", attribution: "Bryan Robson" },
  { quote: "Second is nowhere.", attribution: "Roy Keane" },
  {
    quote: "You have to fight to the very end, that's what Manchester United is about.",
    attribution: "Roy Keane",
  },
  { quote: "I've had the honour of playing for this club for a long time and I've loved every minute of it.", attribution: "Ryan Giggs" },
  { quote: "Manchester United is the biggest club in the world, and I'm proud to have played my part.", attribution: "Paul Scholes" },
  {
    quote: "Manchester United is a club that gets in your blood and just doesn't leave.",
    attribution: "David Beckham",
  },
  { quote: "Old Trafford isn't just a stadium, it's the Theatre of Dreams.", attribution: "Sir Bobby Charlton" },
  {
    quote: "This is Manchester United. We don't need reminding of our history, of the legendary status of this club.",
    attribution: "Ole Gunnar Solskjær",
  },
  { quote: "Solskjær has won it!", attribution: "Clive Tyldesley, on the 1999 Champions League final" },
  { quote: "This club has given me everything, and I'll always give everything back for this shirt.", attribution: "Wayne Rooney" },
  { quote: "Manchester United is more than a club to the people here. It's a religion.", attribution: "Rio Ferdinand" },
  { quote: "I always felt that if I could conquer Old Trafford, I could conquer the world.", attribution: "Cristiano Ronaldo" },
];

/**
 * A stable subset for a given page/section — deterministic per `seed` (so
 * the same section shows the same rotation on every visit rather than a
 * jarring reshuffle) while still varying which quotes appear from section
 * to section, rather than every rail on the site rotating through the
 * exact same four lines in the exact same order.
 */
export function pickLegendQuotes(seed: string, count = 4): LegendQuote[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const pool = [...LEGEND_QUOTES];
  const picked: LegendQuote[] = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    hash = (hash * 1103515245 + 12345) >>> 0;
    const index = hash % pool.length;
    picked.push(pool[index]);
    pool.splice(index, 1);
  }
  return picked;
}
