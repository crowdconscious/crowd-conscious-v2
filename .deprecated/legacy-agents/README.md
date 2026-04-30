# Legacy agents (retired Apr 2026)

These agents were retired as part of the **Pulse-first agent re-prompting** pass. They generated content the founder never used; the per-Pulse Sponsor Pulse Report agent supersedes the monthly cross-sponsor report, and Content Creator v4 supersedes the auto-discovery blog drafter.

## Files

- `sponsor-report.ts.txt` — the legacy monthly Sponsor Report agent (`runSponsorReport`).
  - Cron was `0 9 1 * *` (1st of month, 03:00 CDMX). Removed from `vercel.json`.
  - Dispatch case removed from `app/api/predictions/admin/run-agent/route.ts`.
  - Removed from the `AGENTS` list in `app/(predictions)/predictions/admin/agents/page.tsx`.
  - Cron route at `app/api/cron/agents/sponsor-report/route.ts` was deleted.
  - Function entry removed from `vercel.json`.

- `content-creator-cron-route.ts.txt` — the auto-running content creator cron.
  - Lived at `app/api/cron/agents/content-creator/route.ts`. Now manual-only via the admin agents dashboard, which calls Content Creator v4 with an explicit `topic` or `marketId`.
  - Function entry removed from `vercel.json`.
  - The legacy `runContentCreator()` (no-args, freelance topic discovery) was replaced by `runContentPackageV4({ topic?, marketId?, source? })` in `lib/agents/content-creator.ts`.

## Why retired

Per Prompt 7.5 §6 audit:
- Output was a 3-paragraph English celebratory summary stored in `agent_content` and never opened.
- Sponsor delivery is now handled by `lib/agents/sponsor-pulse-report-agent.ts` per Pulse, with PDF download from `/dashboard/sponsor/[token]/report/[marketId]`.
- The monthly cross-sponsor view, if ever needed, can be rendered deterministically from `sponsor_pulse_reports` + `sponsorships` without a model call.

## Restoring (if needed)

1. Move `sponsor-report.ts.txt` back to `lib/agents/sponsor-report.ts`.
2. Re-create `app/api/cron/agents/sponsor-report/route.ts` (this folder has the original at `route.ts.txt`).
3. Re-add the `'sponsor-report'` case to `app/api/predictions/admin/run-agent/route.ts`.
4. Re-add to `AGENTS` array in the admin agents page.
5. Re-add the cron + function entry in `vercel.json`.
