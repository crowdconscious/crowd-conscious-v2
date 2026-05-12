# Agent Cron Jobs — Setup & Troubleshooting

## Schedule (UTC)

> **Source of truth:** `vercel.json` in the repo root. The tables below
> are kept in sync with `vercel.json` manually — if they disagree, trust
> `vercel.json`. CDMX times shown are CST (UTC−6); during DST add an hour.

### Scheduled crons (from `vercel.json`)

| Agent / route | Schedule | UTC | CDMX |
|-------|----------|-----|------|
| Newsletter (M/W/F) — `/api/cron/newsletter` | `0 14 * * 1,3,5` | 14:00 | 08:00 |
| CEO Digest (Mon) — `/api/cron/agents/ceo-digest` | `0 16 * * 1` | 16:00 | 10:00 |
| Re-engagement (Mon) — `/api/cron/reengagement-inactive` | `0 16 * * 1` | 16:00 | 10:00 |
| Monthly Impact (1st of month) — `/api/cron/monthly-impact` | `0 10 1 * *` | 10:00 | 04:00 |
| Daily archive — `/api/cron/archive` | `0 6 * * *` | 06:00 | 00:00 |
| Live reminders — `/api/cron/live-reminders` | `*/10 * * * *` | every 10 min | — |
| Live auto-end — `/api/cron/live-auto-end` | `*/5 * * * *` | every 5 min | — |
| Pulse auto-resolve — `/api/cron/pulse-auto-resolve` | `5 * * * *` | hourly | — |

### Manual-only agents (no cron — admins click "Run Now")

These agents have full route + agent code, but are intentionally **not
scheduled** in `vercel.json`. They are run on demand from the Agent
Dashboard (`/predictions/admin/agents`) so an editor can review output
before it goes anywhere:

- News Monitor — `/api/predictions/admin/run-agent` with `agent: news-monitor`
- Content Creator — `/api/predictions/admin/run-agent` with `agent: content-creator`
- Inbox Curator — `/api/predictions/admin/run-agent` with `agent: inbox-curator`
- Sponsor Pulse Report — auto-runs on demand when a sponsor opens / re-downloads a report; also runnable from the agent dashboard

If you want any of them on a schedule, add the route under `functions`
+ `crons` in `vercel.json` and add a row to the table above.

## Required Setup

1. **CRON_SECRET** — Must be set in Vercel Environment Variables (Production).
   - Vercel sends this as `Authorization: Bearer <CRON_SECRET>` when invoking cron jobs.
   - If missing or wrong, cron routes return 401 and agents won't run.

2. **Production deployment** — Cron jobs only run on Production deployments, not Preview.

3. **Vercel Cron** — Ensure Cron Jobs are enabled for your project (available on Pro and Enterprise plans).

4. **News Monitor — Real news** — For the News Monitor to fetch actual news articles (and produce useful briefs for AI Pulse), add one of:
   - `NEWSDATA_API_KEY` — [newsdata.io](https://newsdata.io) (free tier available)
   - `GNEWS_API_KEY` — [gnews.io](https://gnews.io) (free tier available)
   - Without these, the agent still runs and suggests markets, but briefs will summarize active markets instead of external news.

## Verify Cron is Running

1. **Vercel Dashboard** → Project → Settings → Cron Jobs — confirm schedules are listed.
2. **Vercel Logs** → Deployments → Functions → filter by cron path (e.g. `/api/cron/agents/ceo-digest`).
3. **agent_runs table** — Check `agent_runs` in Supabase for recent `success` or `error` entries.

## Manual Run (Admin)

Use **Run Now** on the Agent Dashboard (`/predictions/admin/agents`). This bypasses the cron and runs agents directly (admin auth required).

## Crowd newsletter (`/api/cron/newsletter`)

- **Schedule (see `vercel.json`)**: Monday, Wednesday, Friday at **14:00 UTC** — not daily.
- **48h cooldown (with exceptions)**: After a successful batch send, the next run is skipped until **48+ hours** since the last row in `email_digest_log` with `email_type` `newsletter` or `blog_digest` — **unless** the latest published `blog_posts` row has a different `id` than `blog_post_id` on that last log row (new blog to feature). That bypass lets the next M/W/F send include fresh posts without waiting 48h. **Manual override**: same endpoint with `?force=1` (still requires `Authorization: Bearer CRON_SECRET`) skips the cooldown entirely.
- **Subscribers**: Merges `profiles` (with `email_notifications` not false) and active `newsletter_subscribers`. If both are empty, the run skips with `no_subscribers`.
- **Content**: Needs at least one of: a **published** `blog_posts` row, a Pulse market in the trending query, or non-Pulse markets — otherwise `no_published_blog_or_markets`.
- **All sends failed**: If Resend returns errors for every recipient (missing `RESEND_API_KEY`, domain, or rate limit), `sent` stays 0, no cooldown row is written, and `cron_job_runs` for `newsletter` is marked **error** — check the Resend dashboard and Vercel function logs.
- **Manual test**: `curl -sS -H "Authorization: Bearer $CRON_SECRET" "https://YOUR_DOMAIN/api/cron/newsletter"` — JSON includes `skipped`, `reason`, and `debug` (last send time, recipient count). To send despite cooldown: add `?force=1` (use sparingly).

## Common Issues

- **Cron not firing**: Check CRON_SECRET, production deployment, and Vercel plan.
- **401 Unauthorized**: CRON_SECRET mismatch — ensure no trailing newlines or special characters.
- **20 errors in agent_runs**: Individual agent failures (API, parsing, etc.). Check error_message in agent_runs.

## News Monitor — Articles: 0

If the News Monitor runs successfully but shows "Articles: 0" and no new News Briefs:

1. **Verify NEWSDATA_API_KEY in Vercel** — Must be set for Production (and Preview if testing).
2. **NewsData.io free tier** — Uses no country/language filters to maximize results. Fallback query "Mexico" runs if market queries return 0.
3. **Check Vercel logs** — Look for `[NEWS-MONITOR]` lines. If you see "NewsData.io empty - full response: {...}", the API returned an error or no matches. Common causes:
   - Invalid/expired API key → 403 or error in response
   - Rate limit or credit exhaustion → Check NewsData.io dashboard (Account Settings → Credits)
   - Query too narrow → Fallback "Mexico" should still return results
4. **Credits** — Free tier: 200 credits. Each API request uses credits. If credits are exhausted, requests return empty.
