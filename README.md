# Crowd Conscious

Confidence-weighted public consultations ("**Conscious Pulse**") + sponsored
prediction markets. Based in Mexico City. Every sponsorship funds real causes
through the Conscious Fund; every vote feeds collective intelligence about
Mexico and — for 2026 — the FIFA World Cup hosted at Estadio Azteca.

## Quick start

```bash
npm install
npm run dev
```

Set up the `.env.local` file using the keys documented in
[`docs/archives/pre-mundial/ENV-SETUP-GUIDE.md`](docs/archives/pre-mundial/ENV-SETUP-GUIDE.md)
(archived but still accurate).

## Information architecture (Apr 2026)

The product surface is **Pulse-first**. Three top-level public namespaces:

| URL | Purpose | Audience |
|-----|---------|----------|
| `/pulse` | Consumer Pulse listing — every active and recent consultation | Public voters |
| `/pulse/[id]` | Consumer Pulse result page — vote screen + live results | Public voters |
| `/para-marcas` | B2B landing — pricing, case studies, Pulse pitch | Brands / agencies |
| `/predictions/...` | Authenticated dashboard, leaderboard, fund, market detail for non-Pulse markets, admin tools | Logged-in users |

Schema convention: the `prediction_markets` table is retained from the original
prediction-market product. Conceptually, every public-facing row now renders as
a **Pulse** (a confidence-weighted multi-outcome question). Rows where
`is_pulse = false` continue to live behind `/predictions/markets/[id]` and are
auth-shell only — they're not advertised on the consumer surface.

## Where to look

All long-form documentation lives in [`docs/`](docs/). Start with
[`docs/INDEX.md`](docs/INDEX.md) for the current source-of-truth map.

| Need | Where |
|------|-------|
| Current strategy | [`docs/REFINED-STRATEGY-2026-04-16.md`](docs/REFINED-STRATEGY-2026-04-16.md) |
| Platform audit | [`docs/PLATFORM-FULL-AUDIT-2026-04-16.md`](docs/PLATFORM-FULL-AUDIT-2026-04-16.md) |
| Cron schedules | [`vercel.json`](vercel.json) (source of truth) + [`docs/AGENTS-CRON-SETUP.md`](docs/AGENTS-CRON-SETUP.md) |
| Database schema | [`supabase/migrations/`](supabase/migrations/) |
| AI agents | [`lib/agents/`](lib/agents/) — see "Agents" section below |
| Code conventions | [`CLAUDE.md`](CLAUDE.md) |
| User-visible release notes | [`CHANGELOG.md`](CHANGELOG.md) |
| Older notes | [`docs/archives/`](docs/archives/) |

## Sponsor reports flow

When a Pulse closes (resolution_date passes) the hourly cron at
`/api/cron/pulse-auto-resolve` calls `generateSponsorReportAndMaybeEmail()`,
which runs `lib/agents/sponsor-pulse-report-agent.ts` and writes to the
`sponsor_pulse_reports` table:

- `executive_summary` — narrative TL;DR for the brand
- `conviction_analysis` — what confidence-weighted votes revealed
- `next_steps` — concrete recommendations for the sponsor
- `snapshot_data` — outcome distribution + averages

The sponsor receives a private dashboard link (`/dashboard/sponsor/[token]`)
where they can read the report inline and download a PDF that includes all
three narrative sections plus the data snapshot. Admins can re-run a report
for any Pulse from the agents dashboard.

## Agents

All agents live in [`lib/agents/`](lib/agents/). After the Pulse-first
re-prompting pass (Apr 2026), schedules and ownership look like this:

| Agent | Trigger | Output |
|-------|---------|--------|
| **News Monitor** | Manual (admin "Run Now") | 3-bucket: pulse opportunities, blog topic ideas, skip summary. Surfaces "✨ Generate v4 content" buttons in the dashboard. |
| **Content Creator v4** | Manual, per-topic or per-marketId | Single Sonnet 4.5 call → ES + EN blog draft, IG carousel ES/EN, reel script, 5 social posts, optional Pulse market proposal, image prompts. Saved as `agent_content` (`metadata.package_v4`) + draft `blog_post`. |
| **Inbox Curator** | Manual | 3-bucket triage of public submissions: respond_today / park / archive, with reasons and suggested-market hooks. |
| **CEO Digest** | Cron Mon 10:00 CDMX | JSON dashboard email: key metrics, do-this-week actions with deadlines, watch item, sponsor outreach with WhatsApp message. |
| **Newsletter** | Cron M/W/F 08:00 CDMX | Featured blog + Pulses + markets, with a Haiku polish step generating intro + rotating subject candidates. |
| **Sponsor Pulse Report** | On Pulse resolution (via `pulse-auto-resolve`) — and re-runnable per market from admin | Per-market exec summary + conviction analysis + next steps + snapshot. Drives sponsor dashboard + PDF. |
| **Case Study Draft** | Auto when a Pulse closes with ≥10 votes | Sales-focused blog post draft with quoted reasonings. |

Reference for the v4 prompt: [`lib/agents/content-creator.ts`](lib/agents/content-creator.ts) (`V4_SYSTEM`).

Retired agents: see [`.deprecated/legacy-agents/README.md`](.deprecated/legacy-agents/README.md).

## Redirect map

`next.config.ts` owns these permanent (308) redirects. Inbound query strings
(`utm_*`, `session_id`, etc.) are preserved automatically by Next.js.

| From | To | Why |
|------|----|-----|
| `/communities` and `/communities/*` | `/locations` | Renamed product surface. |
| `/predictions/markets` | `/predictions` | Dashboard is the single market listing for logged-in users. |
| `/markets` | `/pulse` | Consumer market list lives at `/pulse` now. |
| `/markets/:id` | `/pulse/:id` | Legacy share alias. Loop-safe because `/pulse/[id]` internally re-routes non-Pulse rows back to `/predictions/markets/${id}`. |
| `/pulse/welcome` | `/para-marcas/welcome` | B2B landing moved to clear the `/pulse` namespace. |
| `/pulse/pilot` | `/para-marcas/pilot` | Same. |
| `/terms-and-conditions` | `/terms` | Vercel-config redirect (older). |
| `/privacy-policy` | `/privacy` | Vercel-config redirect (older). |

**Not redirected on purpose:** `/predictions/markets/[id]`. Adding that rule
would create an infinite loop because `/pulse/[id]` redirects non-Pulse rows
back to `/predictions/markets/[id]`. Pulse share URLs are already canonical at
`/pulse/[id]`; legacy authed share URLs continue to render the in-shell market
detail page (which itself shows the Pulse view via `is_pulse` branching).

## `.deprecated/`

Code that's been removed from active routes but kept for reference lives in
[`.deprecated/`](.deprecated/). Each subfolder has a `README.md` with the
date retired, why, and a one-page "how to restore" if it ever needs to come
back.

**Retention rule:** keep an entry in `.deprecated/` for **at least 90 days**
after Vercel analytics shows zero inbound traffic to the corresponding URL or
zero references in the codebase. After 90 days of zero traffic, the folder
can be removed in a dedicated cleanup PR.

Currently archived:
- `.deprecated/legacy-agents/` — retired monthly Sponsor Report + auto-cron Content Creator (Apr 2026)
- `.deprecated/old-pulse-b2b-routes/` — old `/pulse/welcome` + `/pulse/pilot` (Apr 2026)
- `.deprecated/legacy-results-ui/` — pre-unified results card variants
- `.deprecated/MarketCard-auth-side/` — authed-side `MarketCard` superseded by the unified component

## Tech stack

- **App**: Next.js 15 (App Router), React 19, TypeScript
- **Database**: Supabase (Postgres + RLS)
- **Payments**: Stripe
- **Email**: Resend
- **AI**: Anthropic (Claude — Haiku 4.5 for batch, Sonnet 4.5 for content packages)
- **Hosting**: Vercel

## Deploy

Pushes to `main` deploy automatically to Vercel. Required environment
variables are listed in the Vercel dashboard under Project → Settings →
Environment Variables.

## License

Proprietary — all rights reserved.
