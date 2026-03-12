# Agent Cron Jobs — Setup & Troubleshooting

## Schedule (UTC)

| Agent | Schedule | UTC Time |
|-------|----------|----------|
| CEO Digest | `0 9 * * *` | 9:00 AM daily |
| Content Creator | `0 9 * * *` | 9:00 AM daily |
| News Monitor | `0 9 * * *` | 9:00 AM daily |
| Inbox Curator | `0 9 * * *` | 9:00 AM daily |
| Sponsor Report | `0 9 1 * *` | 9:00 AM on 1st of month |
| Monthly Impact | `0 9 1 * *` | 9:00 AM on 1st of month |

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

## Common Issues

- **Cron not firing**: Check CRON_SECRET, production deployment, and Vercel plan.
- **401 Unauthorized**: CRON_SECRET mismatch — ensure no trailing newlines or special characters.
- **20 errors in agent_runs**: Individual agent failures (API, parsing, etc.). Check error_message in agent_runs.
