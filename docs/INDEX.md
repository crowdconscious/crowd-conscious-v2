# Crowd Conscious — Documentation Index

> This index is the current source of truth for what's canonical and
> what's historical. If a doc isn't listed here, treat it as archived.

## Canonical references (source of truth)

| File | Covers |
|------|--------|
| [`../vercel.json`](../vercel.json) | Cron schedules, serverless function config, regions |
| [`../supabase/migrations/`](../supabase/migrations/) | Database schema (numbered, ordered) |
| [`PLATFORM-FULL-AUDIT-2026-04-16.md`](PLATFORM-FULL-AUDIT-2026-04-16.md) | Full platform audit (state of each module) |
| [`REFINED-STRATEGY-2026-04-16.md`](REFINED-STRATEGY-2026-04-16.md) | Current strategy — Mundial wedge, pricing, roadmap |
| [`PERFORMANCE-NOTES-2026-04-16.md`](PERFORMANCE-NOTES-2026-04-16.md) | Phase 4 performance pass — indexes, caching, pre-Mundial ops checklist |

## Operational

| File | Covers |
|------|--------|
| [`AGENTS-CRON-SETUP.md`](AGENTS-CRON-SETUP.md) | Cron troubleshooting (times verified against `vercel.json`) |
| [`../lib/agents/`](../lib/agents/) | AI agent source (ceo-digest, content-creator, news-monitor, inbox-curator, sponsor-report) |
| [`RESEND-SMTP-SETUP.md`](RESEND-SMTP-SETUP.md) | Email sending setup (Resend + Supabase Auth SMTP) |
| [`EMAIL-RATE-LIMIT-DEBUG.md`](EMAIL-RATE-LIMIT-DEBUG.md) | Email debugging playbook |
| [`SIGNUP-PROFILE-FIX.md`](SIGNUP-PROFILE-FIX.md) | Signup / profile row recovery |
| [`ACHIEVEMENTS-FIX.md`](ACHIEVEMENTS-FIX.md) | Achievements system notes |

## Product context

| File | Covers |
|------|--------|
| [`APP-CONTEXT-AND-DESCRIPTION.md`](APP-CONTEXT-AND-DESCRIPTION.md) | What the app is and who it's for |
| [`DASAHBOARD-UX-and-AI-Pulse.md`](DASAHBOARD-UX-and-AI-Pulse.md) | Dashboard UX + AI Pulse spec |
| [`CODEBASE-AUDIT-REPORT.md`](CODEBASE-AUDIT-REPORT.md) | Codebase audit snapshot |
| [`COMPREHENSIVE-AUDIT-2025.md`](COMPREHENSIVE-AUDIT-2025.md) | 2025 comprehensive audit |
| [`CLEANUP-PLAN-REVIEW.md`](CLEANUP-PLAN-REVIEW.md) | Cleanup plan review |
| [`inbox+moreadditions.md`](inbox+moreadditions.md) | Inbox + extra additions spec |

## Phase tracking (Mundial 2026 prep)

Progress is tracked in commits and in the audit / strategy docs above.
Phases 1-4 are being executed in order:

1. **Phase 1** — Foundation (done)
2. **Phase 2** — Wedge (Mundial Pulse Pack, 15 locations, Club Reset case study) — done
3. **Phase 3** — Conversion engine (anonymous → registered funnel, locations → Pulse pipeline, homepage redesign) — done
4. **Phase 4** — Mundial prep (10 pre-staged markets, docs cleanup, performance hardening) — **in progress**

## Archives

- [`archives/pre-mundial/`](archives/pre-mundial/) — All root-level notes, fix guides, and session summaries that were created before April 2026. Kept for history; treat as outdated.
- [`archives/`](archives/) — Older (pre-November 2025) notes at the top level, not yet re-filed.

## How to keep this tidy

- Don't create new `.md` files in the repo root. Put them under `docs/` and link them here.
- When a doc becomes outdated, move it under `docs/archives/pre-mundial/` (or an appropriate subfolder) and remove its entry from this index.
- Cron schedules: edit `vercel.json` first, then update `AGENTS-CRON-SETUP.md`.
