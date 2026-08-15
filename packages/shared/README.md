# @fanhub/shared

Framework-agnostic code shared between the **web app** (`src/`, Next.js) and
the **mobile app** (`apps/mobile/`, Expo/React Native), both of which talk to
the same Supabase project.

## Rules

- No `react`, `react-dom`, `react-native`, or `next/*` imports here — this
  package is pure TypeScript + `@supabase/supabase-js` types only. Anything
  UI-specific belongs in `src/` (web) or `apps/mobile/src/` (mobile), not here.
- Every function takes a `SupabaseClient<Database>` as an argument rather than
  constructing its own client — the caller (web or mobile) owns session/auth
  wiring, this package only owns queries and business rules.
- `src/types/database.types.ts` is a **copy** of `src/lib/supabase/database.types.ts`
  from the web app root, regenerated from the live Supabase schema
  (`supabase gen types typescript`). Regenerate both together when the schema
  changes — see the web app's own note on that file for the exact command.
- Ported modules under `src/lib/` mirror the web app's `src/lib/<domain>/*.ts`
  files. Port on demand as each mobile screen needs them, diffing against the
  web original rather than reimplementing business rules from scratch — the
  RLS policies and scoring/points/level rules live in Postgres and must not be
  duplicated or re-derived client-side.

## A TypeScript quirk you'll hit

This package has no `node_modules` of its own, so a bare `import type {
SupabaseClient } from "@supabase/supabase-js"` inside `src/lib/**` resolves
(via normal Node module resolution walking up parent directories) against
whichever app's `node_modules` happens to be nearest on disk — which, without
help, is ambiguous between the web app's copy (repo root) and the mobile
app's own copy (`apps/mobile/node_modules`), and TypeScript treats two
different installed copies of the same package as structurally incompatible
classes (their `protected`/`private` members don't unify). Each consuming
app's `tsconfig.json` pins this explicitly via a `paths` entry — see
`apps/mobile/tsconfig.json`'s `"@supabase/supabase-js"` mapping — so add the
same kind of pin in any new consumer rather than re-debugging this.
