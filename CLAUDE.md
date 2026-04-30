# CLAUDE.md — code conventions for AI agents working in this repo

A short, opinionated guide for any AI assistant (Claude, Cursor, Codex, etc.)
making changes to this codebase. Humans should read it too — it's how we
keep the platform coherent.

## Mental model

The product is **Pulse-first**.

- "**Pulse**" = a confidence-weighted, multi-outcome public consultation. It
  is the primary thing voters see and the primary thing brands buy.
- Internally, every Pulse is a row in `prediction_markets` with `is_pulse =
  true`. The table name is historical; we kept it to avoid a costly
  migration. **Don't rename it.** When new code reads/writes consultation
  data, use `prediction_markets` — that's the canonical name.
- "**Mercados**" / "Markets" / "Predictions" still exist as concepts behind
  the auth shell (`/predictions/...`) for non-Pulse rows. They're not
  surfaced on the consumer landing.

URL conventions:

- `/pulse` and `/pulse/[id]` — public consumer surface. Treat as marketing
  ground; performance, SEO, and OG metadata matter most here.
- `/para-marcas` — B2B landing. Performance + conversion matter.
- `/predictions/...` — authed shell (dashboard, fund, leaderboard, market
  detail for non-Pulse rows, admin tooling). Power-user terminology
  (e.g. "Predictions" header) is acceptable here.
- `/dashboard/sponsor/[token]` — sponsor private link.
- `/blog`, `/about`, `/locations`, `/live` — public, self-explanatory.

## Things to never break

These have explicit comments in the code; honor them:

1. **`/pulse/[id]` rendering** — the consumer Pulse page. Sponsors share
   that link in WhatsApp; if it breaks, real money breaks. The page already
   handles non-Pulse markets by redirecting back to
   `/predictions/markets/[id]`. Don't touch that branch lightly.
2. **`prediction_markets` table** — name and shape. New columns are fine;
   renames are not.
3. **Sponsor PDF** — `/api/dashboard/sponsor/[token]/report/[marketId]/pdf`
   pulls narrative from `sponsor_pulse_reports` and feeds
   `generateSponsorPulseReportPDF`. Don't change the column names that
   feeds reads (`executive_summary`, `conviction_analysis`, `next_steps`,
   `snapshot_data`).
4. **Cron schedules** — `vercel.json` is the source of truth. If you remove
   a cron, also delete its function entry under `functions:` and move the
   route file to `.deprecated/`.

## Code conventions

- **Edit existing files**, don't create new ones unless the user asks.
- **No emojis** in code or copy unless the user explicitly asks.
- **Comments only when non-obvious.** Prefer comments that explain *why*
  (constraints, trade-offs, "we did this because…") over comments that
  narrate *what* the code does.
- **Server components by default.** Only mark `'use client'` when the file
  uses hooks or browser APIs.
- **TypeScript strict.** No `any` unless tightly scoped and commented.
- **Supabase access:** prefer the user-context client (`createClient()` from
  `lib/supabase-server`) for routes that respect RLS. Use `createAdminClient()`
  only when you need to bypass RLS, and limit the scope.
- **Email:** all transactional email goes through `lib/resend.ts`. The
  newsletter has its own pipeline (`lib/crowd-newsletter-cron.ts`).
- **Agents:** every agent in `lib/agents/` must call `logAgentRun({...})`
  with status, tokens, and a structured `summary`. The agents dashboard
  reads from `agent_runs`; if you skip the call, the run is invisible.

## i18n

- Default locale is **Spanish (es)**. The cookie `preferred-language` decides
  for server components; `useLanguage()` (from `contexts/LanguageContext`)
  decides for client components. Both must agree on `'es' | 'en'`.
- Every user-facing string has both `es` and `en` variants. If you add a new
  string and it only exists in one language, that's a bug.
- Market/outcome translations are stored in `prediction_markets.translations`
  and `market_outcomes.translations`. Resolve via
  `lib/i18n/market-translations.ts` (`getMarketText`, `getOutcomeLabel`).

## Verifying changes before commit

```bash
node_modules/.bin/tsc --noEmit          # must be clean
# (no eslint config in this project — IDE language server is the lint surface)
```

After substantive edits, also call `ReadLints` on any file you touched.

## Git etiquette

- Don't commit unless the user asked you to.
- When asked, write a clear commit message — what changed and **why**, not
  just what. Heredoc syntax (so multi-line bodies render correctly):

  ```bash
  git commit -m "$(cat <<'EOF'
  feat(area): one-line summary

  Optional body paragraph explaining motivation and trade-offs.
  EOF
  )"
  ```
- Never `--amend` a commit you didn't create in this session.
- Never push to `main` without an explicit ask.

## When you're tempted to delete something

Move it to `.deprecated/<short-name>/` instead, with:
- A `README.md` documenting **why**, the **date retired**, and a one-page
  **restore** procedure.
- The original file content as `.txt` (so it's not picked up by build tooling).

The 90-day rule from `README.md` applies: only fully delete a `.deprecated/`
folder after 90 days of zero traffic *and* zero references.

## Reference reading order for a new agent

1. `README.md` — top-level orientation, IA, redirects.
2. This file (`CLAUDE.md`).
3. `docs/INDEX.md` — full doc map.
4. `lib/agents/` — current agent prompts (start with `content-creator.ts`
   for the v4 template).
5. `next.config.ts` — redirect map.
6. `vercel.json` — cron schedules.
