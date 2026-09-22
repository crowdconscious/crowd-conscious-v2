# Retired: reengagement-inactive cron

**Date retired:** 2026-09-22  
**Why:** UX overhaul Phase 2 (§3.5 / §5) — kill "you have been inactive" email/push. Memory is event-driven resolution ("something you touched moved"), not novelty/absence.

**What it did:** Monday cron emailed users with no vote in 7 days ("Te extrañamos…") and inserted `reengagement_weekly` in-app rows.

## Restore

1. Copy `route.txt` back to `app/api/cron/reengagement-inactive/route.ts`.
2. Re-add to `vercel.json`:
   - `functions["app/api/cron/reengagement-inactive/route.ts"]` maxDuration 120
   - cron `{ "path": "/api/cron/reengagement-inactive", "schedule": "0 16 * * 1" }`
3. Re-add the catalog entry in `lib/cron-catalog.ts`.
4. Set `REENGAGEMENT_EMAIL_ENABLED` default carefully — Phase 2 wants this **off**.

Do not restore without an explicit product owner decision; it fights principle 6 (memory over novelty).
