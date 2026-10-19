# Ops: monitoring, alerts, rate limiting, email sender

_Added in the Week 1 "credibility floor" PR (Oct 2026). Nothing here needs code changes; it's settings for Francisco._

## 1. Sentry (error monitoring), free Developer plan
Code is ready and **inert until the DSN is set** (`instrumentation.ts`, `instrumentation-client.ts`, `lib/error-tracking.ts`, cron failures in `lib/cron-health.ts`).

1. Sign up at https://sentry.io/signup/ (free "Developer" plan, 1 user, 5k errors/month).
2. Create a project → platform **Next.js** → name `crowd-conscious-web`. Skip the wizard (code is already wired).
3. Copy the **DSN** (Settings → Projects → crowd-conscious-web → Client Keys (DSN)). It looks like `https://<key>@o<org>.ingest.us.sentry.io/<project>`. A DSN is not a secret, but keep it tidy.
4. In Vercel → Project → Settings → Environment Variables, add for **Production** and **Preview**:
   - `SENTRY_DSN` = the DSN (server + edge)
   - `NEXT_PUBLIC_SENTRY_DSN` = the same DSN (browser)
5. Redeploy (Deployments → latest → Redeploy). Then in Sentry → Alerts, create "Issue alert: a new issue is created → email me".

Optional later: source maps (`SENTRY_AUTH_TOKEN` + `withSentryConfig`) for readable stack traces.

## 2. Upstash Redis (rate limiting), free plan
Code: `lib/rate-limit.ts` reads `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Used by votes (`/api/votes/anonymous`, `/api/predictions/vote`), newsletter subscribe, checkouts, Reconocimientos, Señal Express, etc.

**Fail-safe behaviour (verified in code):** if the vars are missing, or Redis errors/times out, the limiter **allows** the request and logs a warning. So turning it on can never take the site down; a Redis outage just means "no rate limiting" for that moment.

1. Sign up at https://console.upstash.com (free: 10k commands/day; enough for today's traffic).
2. Create database → **Redis** → name `crowd-conscious-ratelimit` → region **us-east-1** (same as Vercel `iad1`) → free plan. Eviction can stay off.
3. Open the database → **REST API** section → copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (the token IS a secret).
4. Vercel env vars (Production + Preview): `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Redeploy.
5. Check: vote 25 times quickly on a test Pulse from one IP → the 21st request in a minute returns HTTP 429. The "Rate limiting disabled" warning disappears from Vercel logs.

(Alternative: Vercel Marketplace → Upstash integration sets the same two vars automatically.)

## 3. Cron-failure alerts
Every cron calls `cronHealthComplete()` (`lib/cron-health.ts`). On failure it now always:
- logs `[cron-alert] cron failed <job> <runId> <error>` (search Vercel logs for `cron-alert`),
- sends to Sentry (once the DSN is set),
- emails `CRON_ALERT_EMAIL`, else `ADMIN_EMAIL`, else **francisco@crowdconscious.app**, via Resend.

Optional env var: `CRON_ALERT_EMAIL` (prefer this over changing `ADMIN_EMAIL`, which also grants admin rights in `lib/auth/is-admin.ts`).
Limit: a cron that crashes before it reaches `cronHealthComplete` (or times out) leaves a `running` row in `cron_job_runs` and sends no email. The uptime monitor and Sentry cover most of that gap.

## 4. Uptime monitoring, free
New endpoint: `GET https://crowdconscious.app/api/health` → `200 {"ok":true,"db":true,...}` or `503` when the database doesn't answer.

1. Sign up at https://uptimerobot.com (free: 50 monitors, 5-min checks) or Better Stack (free tier).
2. Add an **HTTP(s)** monitor: `https://crowdconscious.app/api/health`, every 5 min, alert contact francisco@crowdconscious.app (and the phone app for push).
3. Add a second monitor for the homepage `https://crowdconscious.app/` (keyword monitor on "Crowd Conscious" if you want to catch blank pages).

## 5. Email sender (Resend)
- `lib/resend.ts`: `FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Crowd Conscious <comunidad@crowdconscious.app>'`. Several routes hard-code the same address (`lib/email-simple.ts`, module review/create routes).
- `RESEND_FROM_EMAIL` is not set in Vercel, so production uses the fallback today, and sending works (the domain is verified in Resend).
- Recommended value: **`Crowd Conscious <comunidad@crowdconscious.app>`** (exactly the current fallback), set for Production + Preview so it's explicit. Changing it to another address requires that address's domain to be verified in Resend first.
- Legacy `app/lib/email-sender.ts` reads `FROM_EMAIL` with a placeholder fallback (`noreply@your-domain.com`), but nothing imports it. Safe to delete later.

## 6. CI / branch protection
`docs/ci/ci.yml` (to be copied to `.github/workflows/ci.yml`; the bot token lacks the `workflow` scope) runs typecheck + unit tests on every PR and on pushes to main. To make it **required before merge**: GitHub → repo Settings → Branches → Add rule for `main` → "Require status checks to pass" → select **CI / typecheck + tests** (and "Require a pull request before merging"). That setting is Francisco's to switch on.
