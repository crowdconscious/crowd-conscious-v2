# Crowd Conscious — Dual-Repo Checkpoint

**Date:** July 1, 2026  
**Scope:** Web + Mobile (shared Supabase backend)

| Repo | Path |
|------|------|
| **Web** (Next.js, Vercel) | `/Users/franciscoblockstrand/Desktop/crowd-conscious-v2` |
| **Mobile** (Expo, EAS) | `/Users/franciscoblockstrand/Documents/crowd-conscious-mobile` |

> Point-in-time snapshot from read-only audits of both repos (git state, migrations, crons, release config). Items not verifiable from code alone are marked **VERIFY**.

---

## Executive summary

- **Pulse-first architecture is coherent on web.** Consumer surface at `/pulse` + `/pulse/[id]`; canonical data in `prediction_markets` with `is_pulse=true`. Vote aggregation on the money URL is fixed (`lib/pulse-vote-aggregates.ts`).
- **Web stack is current:** Next.js **15.5.7**, React **19.1.2**, Supabase SSR, Stripe, Resend, direct Expo HTTP push API. Ten Vercel crons active (`vercel.json`).
- **Newsletter was failing ~86% of recipients** (Resend 429 at concurrency 8). Fixed in **`c913a84`** (4 req/s pacing + retries). M/W/F cooldown bypass landed in **`addb418`**. Jun 22/24 partial sends may warrant a **manual re-send** of the Wed edition.
- **Push pipeline is working again** after a Jun 15–24 regression (`updated_at` column bug, then duplicate sends from stale tokens). **`28aba77`** caps to one notification per user per event; **`push_log`** + receipts cron (242) adds delivery visibility.
- **Schema/code drift is the top engineering risk on web:** migrations **241–245** exist in repo; **`types/database.ts` is stale** (missing `creator_certifications`, `location_offers`, `push_log`, `total_xp_spent`, blog categories `consciousness`/`science`). **245 likely pending in prod.**
- **No automated tests or CI in either repo.** Typecheck is manual (`tsc --noEmit`). `/pulse/[id]` has no E2E safety net.
- **Mobile is feature-rich on iOS** (Expo **54**, native **1.1.1** live). **26 commits** since the 1.1.1 bump (`4915309..HEAD`) — perks, F1 parity, push repairs, share sheet — are **OTA-only** until `eas update --channel production`.
- **Android is pre-production:** EAS submit **`alpha` / `draft`**, Play 12-tester / 14-day gate. No FCM config → push tokens cannot register on Android until next binary.
- **`resolveDeviceId()` is fragile** (`Device.osInternalBuildId` fallback chain in `src/lib/notifications.ts`). Re-registrations create multiple `push_tokens` rows; web dedupe mitigates but root fix is a stable device ID on mobile.
- **Product gaps vs strategy:** mobile Creators surface, F1b probability charts, notification center, founding-creator seed, pilot perks content — code ahead of ops/content in several areas.

---

## Product area status

| Product area | Web | Mobile | Notes |
|--------------|-----|--------|-------|
| **Pulse consumer** | Complete | Complete | Mobile F1 detail parity shipped; **F1b charts missing** (histogram/timeline — intentional deferral) |
| **Citizen Signals** | Complete (flagged) | Complete | Mobile comment RLS depends on Jun 3/8 SQL |
| **Conscious Locations** | Complete | Complete | Android intent filters omit `/locations` |
| **Conscious Perks** | MVP complete | Complete (OTA) | Web owner dashboard + mobile Mis canjes |
| **Conscious Creators** | Partial (Phase 2 web) | **Missing** | No `app/creators/**` on mobile |
| **Blog** | Complete | Complete | Categories synced; migration **245** for `consciousness`/`science` |
| **Fund** | Partial | Complete (link-out donate) | Fund balance historically low |
| **Share cards v2** | Complete | Partial | Thumbnails + channel sheet; signals OG on web |
| **Push notifications** | Complete (instrumented) | Complete (iOS) | Android blocked on FCM; unstable `device_id` |
| **Live events** | Complete | Missing (gated off) | `LIVE_EVENTS_ENABLED = false` |
| **Newsletter** | Complete (stabilized) | N/A | M/W/F 14:00 UTC; rate limit fixed |
| **Deep links / UL** | Partial (AASA) | Partial | **`assetlinks.json` SHA256 placeholder**; AASA missing `/locations`, `/creators` |
| **Observability** | Fragile | OK | Web Sentry stubbed; mobile PostHog + Sentry wired |
| **CI / tests** | Missing | Missing | Zero test files, no `.github/workflows` |

---

## Cross-repo priority stack — do this week

| # | Priority | Action | Owner | Ship via |
|---|----------|--------|-------|----------|
| 1 | **P0** | Apply migration **245**; verify **241–244** in Supabase | Ops | SQL editor |
| 2 | **P0** | Regenerate **`types/database.ts`** from prod after migrations | Web | Commit |
| 3 | **P0** | **`eas update --channel production`** for runtime **1.1.1** (26 commits: perks, F1, push, share) | Mobile | OTA |
| 4 | **P0** | **Stable `device_id`** on mobile (`expo-application` install ID or SecureStore UUID) | Mobile | OTA |
| 5 | **P0** | Replace **`assetlinks.json`** placeholder with Play App Signing SHA256 | Web | Deploy |
| 6 | **P1** | Push retest: `/api/admin/push/test` → check `push_log` + receipts cron | Ops | Verify |
| 7 | **P1** | **Newsletter re-send:** if Jun 24 Wed edition missed you, use admin **Send now (ignore cooldown)** after **`c913a84`** deploy | Ops | Manual |
| 8 | **P1** | Extend **AASA** paths: `/locations/*`, `/creators/*` | Web | Deploy |
| 9 | **P1** | Play closed test: advance **alpha draft**, hit 12×14-day gate | Ops | Play Console |
| 10 | **P1** | Seed pilots: 5–10 certified creators + 2–3 active `location_offers` | Ops | Admin UI |
| 11 | **P2** | Sync **`lib/cron-catalog.ts`** + **`docs/AGENTS-CRON-SETUP.md`** with `vercel.json` | Web | Commit |
| 12 | **P2** | Minimal **CI**: `tsc --noEmit` (+ `next build` web, lint mobile) on PR | Both | GitHub Actions |

---

## Web repo

### Stack

| Layer | Version / pattern |
|-------|-------------------|
| Framework | Next.js **15.5.7**, React **19.1.2**, TypeScript **5** |
| Data | Supabase Postgres + RLS (`lib/supabase-server.ts`) |
| Email | Resend via `lib/resend.ts` |
| Push | Direct Expo HTTP API — `lib/expo-push.ts` |
| Payments | Stripe webhooks |
| AI agents | Anthropic in `lib/agents/` |
| Hosting | Vercel `iad1` |

### Crons (`vercel.json` — source of truth)

| Cron | Schedule | Health log |
|------|----------|------------|
| `newsletter` | `0 14 * * 1,3,5` | Yes |
| `agents/ceo-digest` | `0 16 * * 1` | Yes |
| `reengagement-inactive` | `0 16 * * 1` | Yes |
| `live-reminders` | `*/10 * * * *` | Yes |
| `live-auto-end` | `*/5 * * * *` | Yes |
| `pulse-auto-resolve` | `5 * * * *` | Yes |
| `monthly-impact` | `0 10 1 * *` | Yes |
| `archive` | `0 6 * * *` | **No** |
| `signal-threshold-check` | `*/15 * * * *` | Yes |
| `push-receipts` | `*/30 * * * *` | Yes |

**Manual-only agents** (no cron entry): `news-monitor`, `inbox-curator` — run from `/predictions/admin/agents`.

**Cron catalog drift:** `lib/cron-catalog.ts` still lists retired `sponsor-report`; missing `signal-threshold-check` and `push-receipts`; shows `news-monitor` as scheduled though it is manual-only.

### Recent fixes (Jun 2026)

| Commit | Fix |
|--------|-----|
| `c913a84` | Newsletter Resend **5 req/s** rate limit (was ~86% failure) |
| `addb418` | M/W/F cooldown bypass so Wed isn't blocked after Mon send |
| `28aba77` | One push per user per event (stale token rows) |
| `d6fe7f6` | Push query uses `last_seen_at` not missing `updated_at` |
| `4126872` | Blog publish push deferred via Next `after()` |
| `6f47023` | Location activation push + AASA paths |
| `346e966` | `/pulse/[id]` vote aggregation (privacy) |
| `544a01a` | Conscious Perks web MVP (migration 244) |
| `ac501ed` | Creators Phase 2 web (verify API, vota-por-mi) |

### Gaps

- **`types/database.ts` stale** — migrations 241–245 not reflected; compile-time drift.
- **No CI/tests** — revenue-critical `/pulse/[id]` unguarded.
- **Monitoring stubbed** — `lib/monitoring.ts`, `lib/error-tracking.ts` (Sentry TODO).
- **Admin metrics placeholder** — `app/admin/metrics/page.tsx` returns zeros.
- **Founding creators seed** — no script; directory empty without ops work.
- **Mobile parity enablers** — AASA `/creators`, `/locations`; F1b charts explicitly web-only for now.

### Web recommendations

| Priority | Item |
|----------|------|
| **P0** | Apply **245** + verify **241–244**; regenerate `types/database.ts` |
| **P0** | Add minimal CI (`tsc` + `next build`) |
| **P1** | Sync cron catalog + AGENTS-CRON-SETUP with `vercel.json` |
| **P1** | Add `cronHealthCheck` to `/api/cron/archive` |
| **P1** | Integrate Sentry in `lib/error-tracking.ts` |
| **P1** | Founding creators seed (10–15 profiles) |
| **P2** | Resend Batch API evaluation for newsletter scale |
| **P2** | Extend sitemap for locations/creators/signals slugs |
| **P2** | Replace admin metrics stub with real queries |

---

## Mobile repo

### Stack

| Layer | Version / pattern |
|-------|-------------------|
| Runtime | Expo SDK **~54.0.33**, React Native **0.81.5**, React **19.1.0** |
| Navigation | Expo Router drawer + 5 tabs |
| Data | Supabase direct + `apiFetch` → `https://www.crowdconscious.app` |
| Updates | EAS Updates, `runtimeVersion.policy = "appVersion"` |
| Observability | Sentry + PostHog (`app/_layout.tsx`) |

### Release state

| Dimension | iOS | Android |
|-----------|-----|---------|
| **Store status** | **Live** (ASC `6769620948`) | **Alpha draft** — closed testing |
| **`app.json` version** | **1.1.1** | **1.1.1** |
| **`package.json` version** | **1.0.0** (stale) | same |
| **EAS submit** | Production | `track: "alpha"`, `releaseStatus: "draft"` |
| **Push** | Working (APNs) | **No FCM** — tokens fail silently |
| **Play gate** | N/A | 12 testers × 14 days before production |

### OTA gap — 26 commits

Since native bump **`4915309`** (chore: 1.1.1), **26 commits** landed without a new native version or guaranteed production OTA:

- Perks redemption (`4d0cc7f`), OTA UX bundle (`8da1cfa`)
- Share cards M1+M2 (`ba729de`), push repair (`27f02b9`)
- Signals/Blog parity (`edc28b3`), Pulse F1 detail (`fd33afd`, `cc6edd4`)
- Blog categories sync (`03e7e18`), location deep links (`e42c48e`), reading-time fix (`59bc525`)

**Action:** `eas update --channel production` targeting runtime **1.1.1** (and **1.1.0** if devices remain — dual-runtime OTA).

### Push `device_id` issue

```212:218:/Users/franciscoblockstrand/Documents/crowd-conscious-mobile/src/lib/notifications.ts
export function resolveDeviceId(): string {
  return (
    Device.osInternalBuildId ??
    Device.modelId ??
    Device.modelName ??
    "unknown"
  );
}
```

`osInternalBuildId` can change across OS updates / reinstalls → multiple `push_tokens` rows per phone. Web **`28aba77`** keeps newest row per send, but **mobile should persist a stable UUID** (SecureStore or `expo-application` install ID).

### Missing / deferred features

| Feature | Status |
|---------|--------|
| **Creators screens** | No mobile surface; deep links not in intent filters |
| **F1b probability charts** | Web has histogram/timeline; mobile shows bars + avg confidence only |
| **Notification center** | Badge + push only; no in-app inbox |
| **Live events** | Screen exists, drawer entry disabled |
| **Apple Sign-In** | `APPLE_SIGNIN_ENABLED = false` |
| **Android App Links** | SHA256 placeholder on web; `/locations` missing from intent filters |

### Mobile recommendations

| Priority | Item |
|----------|------|
| **P0** | Publish production **OTA** (26 commits) |
| **P0** | **Stable `device_id`** in `src/lib/notifications.ts` |
| **P0** | Apply/verify mobile SQL (Jun 3/8 migrations) in Supabase |
| **P0** | Unblock Android: closed test + **assetlinks SHA256** |
| **P1** | **Phase E binary:** FCM, `/locations` + `/creators` intent filters, RECORD_AUDIO removal effective |
| **P1** | Align `package.json` version with `app.json` |
| **P1** | Apple Sign-In: enable or remove scaffold |
| **P2** | CI: typecheck + lint on PR |
| **P2** | Integration tests for auth deep link, vote RPC, comments |

---

## Shared infrastructure

### Migrations — apply order matters

**Web repo** (`crowd-conscious-v2/supabase/migrations/`):

| # | File | Purpose | Status |
|---|------|---------|--------|
| 241 | `241_creator_certifications.sql` | Creators certification table | **VERIFY applied** |
| 242 | `242_push_log.sql` | Push delivery log + receipts cron | **VERIFY applied** |
| 243 | `243_blog_category_expand.sql` | 11 blog categories | Comment in 245: **applied in prod** |
| 244 | `244_conscious_perks.sql` | Offers, redemptions, `total_xp_spent` | **VERIFY applied** |
| 245 | `245_blog_category_consciousness_science.sql` | Adds `consciousness`, `science` | **Likely pending** |

**Mobile repo** (same Supabase project — apply once in SQL editor):

| File | Purpose | Status |
|------|---------|--------|
| `20260603_set_vote_reasoning.sql` | Pulse "short why" RPC | Header: **PENDING** |
| `20260603_location_comments.sql` | Location comments | Header: **PENDING** |
| `20260603_citizen_signal_comments_insert.sql` | Signal comment insert | **VERIFY** |
| `20260608_signal_comments_rls_security_definer.sql` | Signal comment RLS fix | Applied manually per header |
| `20260605_leaderboard_view_exclude_superadmin.sql` | Leaderboard view | Untracked duplicate of web 229 — **apply once** |

**Verification query:**

```sql
SELECT version FROM supabase_migrations.schema_migrations
ORDER BY version DESC LIMIT 10;
```

### `assetlinks.json`

Web file still has placeholder:

```json
"sha256_cert_fingerprints": ["REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT"]
```

Copy **Play App Signing certificate SHA-256** from Play Console → Setup → App integrity into `public/.well-known/assetlinks.json`. Required for verified Android App Links.

### CI gap (both repos)

- No `.github/workflows`
- No `*.test.ts(x)` files
- Web: `tsc --noEmit` per `CLAUDE.md`; mobile: `npm run typecheck` + eslint

### Newsletter re-send note

Jun 22 and Jun 24 cron runs reported **`success`** but only **~14% delivered** (55–72 of ~389) due to Resend **429** at concurrency 8. Fix **`c913a84`** paces at 4 req/s with retries.

- **Next scheduled send:** Mon/Wed/Fri **08:00 CDMX** (14:00 UTC).
- **Re-send Wed Jun 24 edition now:** `/predictions/admin/agents` → **Send now (ignore cooldown)** (after deploy confirms `c913a84` live).
- **Diagnose past runs:**

```sql
SELECT status, started_at, summary, error_message
FROM cron_job_runs
WHERE job_name = 'newsletter'
ORDER BY started_at DESC LIMIT 5;
```

---

## Suggested next session focus

1. **Supabase:** run **245**; confirm **241–244** + mobile Jun 3/8 SQL; regenerate **`types/database.ts`**.
2. **Mobile OTA:** `eas update --channel production` for runtime **1.1.1** (26 commits).
3. **Push hygiene:** implement **stable `device_id`** on mobile; retest with `/api/admin/push/test`; query `push_log`.
4. **Android unblock:** paste Play SHA256 into **`assetlinks.json`**; advance alpha closed test.
5. **Ops pilots:** certify 5–10 creators + create 2–3 perks offers (manual admin).
6. **Web deploy:** AASA `/locations` + `/creators` paths; cron catalog sync.
7. **CI:** one GitHub Action running `tsc --noEmit` on both repos (or web-only first).

---

## Key file reference

| Topic | Path |
|-------|------|
| Pulse consumer page | `app/pulse/[id]/page.tsx` |
| Vote aggregation | `lib/pulse-vote-aggregates.ts` |
| Newsletter cron | `lib/crowd-newsletter-cron.ts`, `app/api/cron/newsletter/route.ts` |
| Resend rate limit fix | `lib/resend.ts` (commit `c913a84`) |
| Push pipeline | `lib/expo-push.ts`, `app/api/cron/push-receipts/route.ts` |
| Cron schedules | `vercel.json` |
| Cron health / catalog | `lib/cron-health.ts`, `lib/cron-catalog.ts` |
| DB types (stale) | `types/database.ts` |
| Blog categories | `lib/blog-categories.ts`, migrations 243/245 |
| Creators (web) | `app/creators/`, migration 241 |
| Perks (web) | `lib/perks/`, migration 244 |
| AASA | `public/.well-known/apple-app-site-association` |
| Android App Links | `public/.well-known/assetlinks.json` |
| Platform audit (Jun) | `docs/PLATFORM-AUDIT-AND-IMPROVEMENT-PLAN-2026-06-10.md` |
| Creators strategy | `docs/CONSCIOUS-CREATORS-STRATEGY-2026-06-09.md` |
| Mobile app config | `Documents/crowd-conscious-mobile/app.json` |
| Mobile EAS | `Documents/crowd-conscious-mobile/eas.json` |
| Mobile push / device_id | `Documents/crowd-conscious-mobile/src/lib/notifications.ts` |
| Mobile deep links | `Documents/crowd-conscious-mobile/app/+native-intent.ts` |
| Mobile publishing runbook | `Documents/crowd-conscious-mobile/design/publishing-playbook.md` |
| Prior mobile checkpoint | `Documents/crowd-conscious-mobile/docs/CHECKPOINT-2026-06-05.md` |

---

## Scorecard

| Dimension | Grade | One line |
|-----------|-------|----------|
| Push pipeline | B+ | Fixed + instrumented; stable `device_id` + Android FCM remain |
| Product (Creators/Perks/Share) | B | Web strong; mobile perks shipped; mobile creators absent |
| Mobile parity (Phase F) | A- | F1–F3 largely done; F1b charts intentionally web-only |
| Migrations / types | C+ | 245 likely pending; `types/database.ts` stale |
| Quality bar (CLAUDE.md) | B+ | `tsc` clean; no CI/tests; monitoring gaps |
| Go-to-market | C+ | Code ahead of ops: OTA unpublished, seeds, Play gate |

**Biggest leverage this week:** migration 245 → OTA → stable device_id → assetlinks SHA256 → push retest → seed pilots.
