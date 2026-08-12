# United Fans Hub — Web-First Implementation Plan (Revised, Step 02 Pending)

## Context

United Fans Hub's long-term vision spans web, iOS, Android, and a shared Supabase backend, but the user has directed that **only the responsive Next.js web application** is built now. Mobile (React Native/Expo) is explicitly deferred until the web product is built, tested with real users, and refined — no mobile app, screens, or tooling are to be created at this stage. This revision replaces the earlier monorepo/multi-app structure with a single web-first project, sequences work into small controlled phases (visual foundation → public UI → auth UI → later backend/feature phases), and treats the Manchester United emblem and real player photography as licensed assets that must be architecturally supported but never faked, redrawn, or approximated. Supabase is not connected yet — this and the next step remain purely visual/structural. The goal of this document is an approved, unambiguous plan for exactly what gets built in the first implementation step.

---

## A. REVISED PROJECT STRUCTURE (web-first, no monorepo)

Since mobile is deferred, a monorepo/workspaces setup is unnecessary complexity right now — a single standard Next.js project is the correct scope. The structure stays flat but organized so a future `apps/web` migration (if mobile is added later) is a simple lift, not a rewrite.

```
united-fans-hub/                      # project root (currently empty)
├── .git/
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── .eslintrc.json / eslint.config.mjs
├── public/
│   └── images/
│       ├── branding/                 # United Fans Hub wordmark/logo + Man Utd emblem (separate files)
│       │   ├── united-fans-hub-logo.svg      (placeholder until real wordmark exists)
│       │   └── manchester-united-emblem.png   (placeholder slot — real licensed asset supplied later)
│       ├── players/
│       │   ├── bruno-fernandes.webp   (placeholder slot)
│       │   ├── tielemans.webp         (placeholder slot)
│       │   └── sesko.webp             (placeholder slot)
│       ├── stadium/                   (placeholder slot for stadium/atmosphere photography)
│       └── fans/                      (placeholder slot for supporter/community photography)
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # root layout: fonts, global providers, metadata
│   │   ├── page.tsx                   # landing page ("/")
│   │   ├── globals.css                # Tailwind base + design tokens as CSS variables
│   │   ├── login/
│   │   │   └── page.tsx               # /login (UI only)
│   │   ├── signup/
│   │   │   └── page.tsx               # /signup (UI only)
│   │   └── forgot-password/
│   │       └── page.tsx               # /forgot-password (UI only)
│   ├── components/
│   │   ├── ui/                        # design-system primitives: Button, Card, Input, Badge
│   │   ├── layout/                    # Navbar, Footer, PageShell
│   │   ├── media/                     # PlayerImage, ClubEmblem, ResponsiveImage
│   │   └── landing/                   # Hero, FeatureSection, MatchdayPreview, RankingsPreview,
│   │                                   # FanOfMonthPreview, CommunityPreview, FinalCta
│   ├── lib/
│   │   └── design-tokens.ts           # single source of truth for colours/spacing/radii/type scale
│   └── types/                          # shared TS types (grows later; empty/minimal for now)
└── docs/
    └── architecture/                   # this plan + future ADRs
```

**Why not a monorepo now:** a monorepo/workspaces setup (`apps/web`, `packages/design-tokens`, etc.) only earns its cost once there's a second consumer (mobile) to share code with. Building it prematurely adds tooling overhead (Turborepo/pnpm workspace config, cross-package build wiring) with zero present benefit. The `src/lib/design-tokens.ts` + `components/ui` split inside the single app already isolates the reusable pieces cleanly, so migrating to a monorepo later (when Expo actually starts) is a mechanical move, not a redesign.

---

## B. REVISED DEVELOPMENT PHASES

| Phase | Focus | Builds | Depends on | Outcome |
|---|---|---|---|---|
| **1 — Web foundation** | Tooling & scaffold | Next.js + TS + Tailwind + ESLint init, Git init, global CSS, font system, design tokens (colours/spacing/radius/type scale from §7), responsive breakpoints, base `Button`/`Card`/`Input`/`Badge` primitives, project structure above | Nothing (first code) | A running, empty, correctly configured app with the design system wired in and visually testable via the primitives |
| **2 — Public UI** | Landing + branding/asset architecture | Landing page (nav, hero, features, matchday preview, rankings preview, Fan of the Month preview, community preview, final CTA, footer), `PlayerImage`/`ClubEmblem` components, `/public/images/*` asset folders with placeholder slots | Phase 1 | The full marketing/landing experience, responsive 320px→1440px+, real-asset-ready but currently placeholder-safe |
| **3 — Authentication (UI only)** | Login/Signup/Forgot-password screens | `/login`, `/signup`, `/forgot-password` pages, matching landing's visual language, no Supabase wiring | Phase 1 (design system), can run parallel to/after Phase 2 | Fully designed auth flow, static/non-functional, ready for backend wiring in a later phase |
| **4 — Profiles** *(future, not now)* | Profile data model + UI | Supabase `profiles` table, RLS, profile view/edit pages | Real Supabase connection (introduced in a phase after 3) | Users have persistent identity |
| **5 — Community** *(future)* | Feed, posts, comments, reactions | `posts`/`comments`/`reactions` tables + feed UI | Phase 4 | Core social loop live |
| **6 — Chat/messaging** *(future)* | Rooms, DMs, presence | `groups`/`messages` tables, Realtime | Phase 5 | Real-time community |
| **7 — Match centre** *(future)* | Fixtures, lineups, live events | `matches`/`players`/`match_events`, external data provider integration | Phase 4 | Matchday experience |
| **8 — Predictions** *(future)* | Prediction submission + scoring | `predictions`/`prediction_answers`/`prediction_scores`/`scoring_rules`, settlement Edge Function | Phase 7 | Core prediction game live |
| **9 — Gamification** *(future)* | Points, levels, badges | `points_transactions`, `badges`, `user_badges`, leaderboard views | Phase 8 | Retention loop |
| **10 — Awards/voting** *(future)* | Nominations, votes, winners | `awards`/`award_nominations`/`award_votes` | Phase 9 | Celebration loop |
| **11 — Admin/moderation** *(future)* | Admin area, reports, moderation queue | `/admin/*`, `reports`/`moderation_actions` | All content-producing phases above | Operational control plane |
| **12 — Testing/deployment** *(future)* | QA, hardening, production deploy | E2E/accessibility/perf pass, hosting setup, monitoring | All prior phases stable | Production-ready web app |
| **13 — Mobile application (later)** | React Native/Expo app | Separate future initiative, reusing Supabase backend, business logic, and design tokens established above | A tested, deployed, refined web app (Phase 12 complete) | iOS/Android apps at feature parity |

**Discipline applied per §11 of your instructions:** each phase above has one objective, ships only what that objective needs, reuses the primitives/tokens from Phase 1 rather than redefining styles per page, and is meant to be reviewed/approved before the next phase starts — starting now with Phase 1 + the start of Phase 2 (landing page) as the very next implementation step, not the whole list at once.

---

## C. IMMEDIATE NEXT IMPLEMENTATION STEP

**Build Phase 1 (Web foundation) in full, then the landing page shell from Phase 2 — as one reviewable step, since the landing page is what makes the foundation visually verifiable.**

Concretely, Step 02 will:
1. `git init` + `.gitignore` (Node/Next).
2. Initialise Next.js (App Router) with TypeScript, Tailwind CSS, ESLint via the standard `create-next-app` scaffold, then adjust to the structure in §A.
3. Define design tokens (colours, spacing, radius, type scale) in `src/lib/design-tokens.ts` and wire them into `tailwind.config.ts` + `globals.css` as CSS variables.
4. Set up the font system (display + body typefaces — exact families to be chosen/licensed-checked at this step; system font fallback until then).
5. Build base primitives: `Button`, `Card`, `Input`, `Badge` in `src/components/ui/`.
6. Build `PlayerImage` and `ClubEmblem` components in `src/components/media/` (detailed below).
7. Create the `/public/images/{branding,players,stadium,fans}/` folders with clearly named placeholder slots (no fake/generated images dropped in — empty-safe placeholders only, per your rule).
8. Build the landing page (`src/app/page.tsx`) using `src/components/landing/*`: Navbar, cinematic Hero (headline "MORE THAN A CLUB. WE ARE A FAMILY.", supporting line "Connect. Predict. Debate. Celebrate.", primary CTA "JOIN THE COMMUNITY", secondary CTA "EXPLORE FEATURES", composed player/stadium imagery via `PlayerImage`), Feature section (Community / Match Predictions / Fan Rankings / Chat & Share), Matchday preview, Rankings/leaderboard preview, Fan of the Month preview, Community preview (example posts/comments/media), Final CTA ("YOUR UNITED. YOUR COMMUNITY." + "JOIN THE COMMUNITY"), Footer (branding, nav, social links, terms/privacy/contact).
9. Verify responsiveness at 320/375/390/430/768/1024/1280/1440px+.

**Login/Signup/Forgot-password (Phase 3) follow immediately after the landing page is reviewed and approved**, as UI-only pages matching the same visual language — no Supabase in this pass, per your instruction.

### `PlayerImage` component contract (built in Step 02, populated with real assets later)

```
<PlayerImage
  src={string}            // path under /public/images/players/*
  alt={string}            // required, real player name for a11y
  position?: "left" | "center" | "right"   // compositional placement in hero
  scale?: number           // relative size multiplier for cinematic layering
  priority?: boolean        // Next.js Image priority for above-the-fold hero use
  objectPosition?: string   // CSS object-position for cropping control
  sizes?: string            // responsive `sizes` attr for Next.js Image
/>
```

Built on top of Next.js `<Image>`. Until real Bruno Fernandes / Tielemans / Šeško photography is supplied, `PlayerImage` renders a **neutral, clearly-a-placeholder empty state** (no AI-generated stand-in, no stock crest icon standing in for a real photo) so the hero's composition/layout can be designed and reviewed now, and swapped for real files later with zero redesign.

### `ClubEmblem` component contract

```
<ClubEmblem
  src={string}   // path to the real supplied Man Utd emblem file — rendered exactly as-is
  alt={string}   // "Manchester United emblem"
  size?: number
/>
```

Renders the supplied emblem file directly (`<Image>` wrapper, no recoloring/redrawing/SVG-tracing). Until the real file is supplied, this component's slot in the nav/footer is left empty rather than filled with a generic crest icon or approximation.

---

## D. FILES/FOLDERS EXPECTED TO BE CREATED IN THE FIRST IMPLEMENTATION STEP

- `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, ESLint config, `.gitignore`, `README.md`
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- `src/lib/design-tokens.ts`
- `src/components/ui/Button.tsx`, `Card.tsx`, `Input.tsx`, `Badge.tsx`
- `src/components/media/PlayerImage.tsx`, `ClubEmblem.tsx`
- `src/components/layout/Navbar.tsx`, `Footer.tsx`
- `src/components/landing/Hero.tsx`, `FeatureSection.tsx`, `MatchdayPreview.tsx`, `RankingsPreview.tsx`, `FanOfMonthPreview.tsx`, `CommunityPreview.tsx`, `FinalCta.tsx`
- `public/images/branding/`, `public/images/players/`, `public/images/stadium/`, `public/images/fans/` (folders + a `.gitkeep`/README note, no fabricated image files)
- `docs/architecture/` (this plan, moved into the repo as a reference doc)

**Not created in this step:** `/login`, `/signup`, `/forgot-password` pages (Phase 3, immediately after landing page review), anything under `supabase/`, anything mobile-related.

---

## E. DEPENDENCIES REQUIRED FOR THE FIRST IMPLEMENTATION STEP ONLY

- `next`, `react`, `react-dom`
- `typescript`, `@types/react`, `@types/node`
- `tailwindcss`, `postcss`, `autoprefixer`
- `eslint`, `eslint-config-next`

No Supabase client, no auth libraries, no animation libraries, no state-management libraries, no UI kits — nothing beyond the standard Next.js + Tailwind + TypeScript baseline is justified for a static landing/auth-UI phase. (Nothing is installed yet — this list is for the next approved step.)

---

## FUTURE FEATURES — RETAINED IN ARCHITECTURE, NOT IMPLEMENTED NOW

Kept as documented future scope only (no schema, no pages, no logic built yet): Authentication (real), Profiles, Community feed, Posts, Comments, Reactions, Voice messages, File sharing, Video sharing, Community chat, Direct messages, Fixtures, Match centre, Predictions, Fan points, Leaderboards, Fan of the Month/Season, Voting, Badges, Achievements, Notifications, Events, Admin, Moderation. Prior planning detail on database entities (`clubs`-seamed schema), RLS posture, media architecture, and phased backend rollout from the original architecture pass still applies conceptually and will be re-surfaced when each phase above actually begins — it is not repeated in full here to keep this revision focused on what you asked to change.

## MULTI-CLUB FUTURE-PROOFING (unchanged recommendation)

Backend will still be designed later around a `clubs` table with a single Manchester United row and `club_id` foreign keys on club-scoped entities (matches, players, predictions, awards) — a schema seam only, decided once Supabase work begins, not implemented now, and not blocking anything in this web-visual phase.

---

# READY FOR STEP 02

**Summary:** Plan revised to web-first: single Next.js app (no monorepo, no mobile app, no Expo/React Native) with a clean structure that stays mobile-ready without building mobile now. First implementation step is Phase 1 (foundation: Next.js/TS/Tailwind/ESLint/Git, design tokens, base primitives, `PlayerImage`/`ClubEmblem` asset-safe components, image folder architecture) plus the landing page from Phase 2, built and reviewed before moving to Login/Signup UI (Phase 3, still no Supabase). Thirteen phases now sequence the full roadmap, with mobile explicitly last and gated on a tested, deployed web app. Supabase, database, RLS, and all product features beyond the landing/auth UI remain documented future scope only.

**Exact next implementation step:** Initialise the Next.js + TypeScript + Tailwind project per §A, wire the design tokens and base primitives, build `PlayerImage`/`ClubEmblem` with placeholder-safe asset slots, and implement the full landing page per §C — nothing else. Waiting for your approval before making any changes.
