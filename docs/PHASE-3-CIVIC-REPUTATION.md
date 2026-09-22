# Phase 3 — Civic reputation (shared Supabase)

Private civic reputation (UX overhaul §3.6). Web and mobile share one Supabase project.

## Apply once — mobile migration only

**Francisco:** apply **only** the mobile migration in the Supabase SQL editor:

- Repo: `crowdconscious/crowd-conscious-mobile`
- File: `supabase/migrations/20260922_civic_reputation.sql`

**Do not** apply web `supabase/migrations/261_civic_reputation.sql` (retired to `.deprecated/261-civic-reputation-web-schema/`). That file invents a second schema (`civic_reputation_totals`, different reason enums / RPC shapes) and cannot coexist with mobile.

## Canonical objects (mobile)

| Kind | Name |
|------|------|
| Tables | `civic_reputation_events`, `civic_reputation_scores` |
| Write RPC | `award_civic_reputation` (service_role only) |
| Read RPCs | `get_my_civic_reputation`, `get_my_civic_reputation_totals` |
| Domains | `agua`, `espacio_publico`, `residuos`, `desarrollo_urbano` |
| Action types | `signal_stage_cosign`, `signal_author_cosigned`, `location_evaluation`, `neighbor_participation`, `sustained_presence` |

DB triggers in the mobile SQL already award for:

- co-sign on a published señal (author)
- señal stage 50 / 200 (all cosigners)
- Conscious Location evaluation (non-Pulse market votes)

Web app-layer awards for those paths must **not** run (would double-award). Neighbor invite and sustained presence remain reserved — web may call `award_civic_reputation` via service role only when those flows exist.

## Feature flags

| Flag | Role |
|------|------|
| `CIVIC_REPUTATION_ENABLED` | Server gates for private `/predictions/reputacion` + any service-role awards |
| `NEXT_PUBLIC_CIVIC_REPUTATION_ENABLED` | Client nav / shell visibility |
| `LEADERBOARD_ENABLED` / `NEXT_PUBLIC_LEADERBOARD_ENABLED` | Stay **false** — no public ranking of civic totals |

## Out of scope (do not touch in Phase 3 align)

Banquetas, Silence, perks shop, Feed ranking.
