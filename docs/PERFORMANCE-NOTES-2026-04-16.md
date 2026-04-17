# Performance Notes — Mundial 2026 Prep (Phase 4 · Step 4.3)

Context: today ≈9 daily active predictors. Target for June 11, 2026:
150+ DAU during the Mundial, with spikes of 10-50× on match days.

This doc captures what was hardened in the Phase 4 performance pass and
what still needs operational attention before kick-off.

## What was done

### 1. Database indexes (`supabase/migrations/196_mundial_perf_indexes.sql`)

Added idempotent `CREATE INDEX IF NOT EXISTS` entries for:

| Table | Index | Why |
|-------|-------|-----|
| `market_votes` | `(created_at DESC)` | Digests / activity feeds |
| `market_votes` | `(anonymous_participant_id) WHERE NOT NULL` | Conversion-funnel analytics |
| `prediction_markets` | `(status) WHERE status IN ('active','trading')` | Public list filter |
| `prediction_markets` | `(category)` | Category filter on `/api/markets` |
| `prediction_markets` | `(created_at DESC) WHERE archived_at IS NULL` | Default list ordering |
| `conscious_locations` | `(current_market_id) WHERE NOT NULL` | Location → market joins |
| `anonymous_participants` | `(converted_to_user_id) WHERE NOT NULL` | Conversion metrics in ceo-digest |

Migration finishes with `ANALYZE` so the planner picks up the new indexes
on the next query.

> Note: `prediction_markets` has no `is_featured` column (that column only
> exists on `conscious_locations`), so the suggested
> `idx_markets_featured` was intentionally skipped.

### 2. API response caching

| Endpoint | Before | After |
|----------|--------|-------|
| `/api/markets` | No cache | `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` |
| `/api/locations` | No cache | `Cache-Control: private, max-age=30` (response includes per-user `hasVoted`, so must not be shared by the CDN) |
| `/api/fund/balance` | `s-maxage=300, swr=600` | unchanged (already good) |
| `/api/pulse/mundial-spots` | `s-maxage=60, swr=300` | unchanged (already good) |
| `/api/case-studies/club-reset` | `s-maxage=300, swr=600` | unchanged (already good) |

### 3. `vercel.json` cron hygiene

- Added `/api/cron/monthly-impact` to `crons` (`0 10 1 * *`). Previously
  the route only appeared in `functions` for `maxDuration` and never
  fired. `docs/AGENTS-CRON-SETUP.md` was rewritten to match.

## What was **not** done (and why)

### Raw `<img>` replacement

The audit flagged 19 raw `<img>` tags across `app/` and `components/`.
Inspection shows most of them are unsafe or useless to migrate to
`next/image`:

- **OG image routes** (`app/api/og/market/[id]/route.tsx`) must use
  raw `<img>` — `@vercel/og` does not run `next/image`.
- **Email templates** (`app/lib/email-templates/*.tsx`) are rendered
  by Resend; they must inline `<img>` with remote URLs for Gmail/Outlook.
- **`LandingHeroClient.tsx`**, **`CommunityCarousel.tsx`**,
  **`CompletedNeeds.tsx`** are no longer imported anywhere after the
  homepage 3-block redesign — they're dead code.
- **`VotePanel.tsx` footer logo** is `h-4` (16 px); converting a 16 px
  logo to `next/image` adds runtime cost without moving the needle.
- The remaining ones (`ProfilePictureUpload`, `LiveComments`,
  `SponsorShareClient`, etc.) render user-uploaded images from dynamic
  URLs — acceptable to leave as `<img>`.

**Follow-up**: when deleting dead landing components (see below), the
raw-img count drops to a handful of intentional cases.

### Bundle: `chart.js` + `recharts` duplication

Both libs are present:

- `chart.js` + `react-chartjs-2` — imported only in
  `app/(predictions)/predictions/intelligence/IntelligenceClient.tsx`.
- `recharts` — imported across 6 dashboard / market / sponsor files.

Recommendation (out of scope for Phase 4): migrate `IntelligenceClient`
to `recharts`, drop `chart.js` + `react-chartjs-2` from
`package.json`. Estimated bundle savings: ~120 KB gzipped on that
route.

### Sentry / error monitoring

`lib/error-tracking.ts` is console-based with Sentry TODOs. Not yet
wired. Keeping this out of Phase 4 intentionally — it's fine to ship
the Mundial without Sentry as long as Vercel logs + `agent_runs` are
monitored during match days.

## Operational checklist before June 11

- [ ] Apply migrations `195` and `196` against production Supabase.
- [ ] Confirm in Vercel dashboard → Cron Jobs that `monthly-impact`
      now appears alongside the other scheduled routes.
- [ ] Run the content-creator agent against the 10 pre-staged markets
      (`metadata.prestage_batch = '2026-04-16'`) so social posts are
      ready to schedule through May.
- [ ] Delete `LandingHeroClient.tsx`, `CommunityCarousel.tsx`,
      `CompletedNeeds.tsx` and any other unreferenced landing
      components.
- [ ] Optional — wire Sentry (`npx @sentry/wizard@latest -i nextjs`)
      before the opening match.
- [ ] Optional — migrate `IntelligenceClient` to recharts and drop
      chart.js to shave ~120 KB from that route.

## Load test targets

Before opening match:

| Endpoint | Target p95 | Today |
|----------|------------|-------|
| `/api/markets?limit=50` | < 150 ms at edge | untested post-cache |
| `/api/locations` | < 250 ms warm | untested post-cache |
| `/api/fund/balance` | < 80 ms warm | already cached |
| `/predictions` page LCP | < 2.5 s on 4G | unmeasured |

Recommend a k6 script pointing at `/api/markets` + `/api/locations`
two weeks before kick-off, tuned to 10× the highest-observed DAU.
