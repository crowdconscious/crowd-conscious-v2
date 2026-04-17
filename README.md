# Crowd Conscious

Free-to-play prediction platform based in Mexico City. Every sponsorship
funds real causes through the Conscious Fund; every vote feeds collective
intelligence about Mexico and — for 2026 — the FIFA World Cup hosted at
Estadio Azteca.

## Quick start

```bash
npm install
npm run dev
```

Set up the `.env.local` file using the keys documented in
[`docs/archives/pre-mundial/ENV-SETUP-GUIDE.md`](docs/archives/pre-mundial/ENV-SETUP-GUIDE.md)
(archived but still accurate).

## Where to look

All long-form documentation lives in [`docs/`](docs/). Start with
[`docs/INDEX.md`](docs/INDEX.md) for the current source-of-truth map.

| Need | Where |
|------|-------|
| Current strategy | [`docs/REFINED-STRATEGY-2026-04-16.md`](docs/REFINED-STRATEGY-2026-04-16.md) |
| Platform audit | [`docs/PLATFORM-FULL-AUDIT-2026-04-16.md`](docs/PLATFORM-FULL-AUDIT-2026-04-16.md) |
| Cron schedules | [`vercel.json`](vercel.json) (source of truth) + [`docs/AGENTS-CRON-SETUP.md`](docs/AGENTS-CRON-SETUP.md) |
| Database schema | [`supabase/migrations/`](supabase/migrations/) |
| AI agents | [`lib/agents/`](lib/agents/) |
| Older notes | [`docs/archives/`](docs/archives/) |

## Tech stack

- **App**: Next.js 15 (App Router), React 19, TypeScript
- **Database**: Supabase (Postgres + RLS)
- **Payments**: Stripe
- **Email**: Resend
- **AI**: Anthropic (Claude)
- **Hosting**: Vercel

## Deploy

Pushes to `main` deploy automatically to Vercel. Required environment
variables are listed in the Vercel dashboard under Project → Settings →
Environment Variables.

## License

Proprietary — all rights reserved.
