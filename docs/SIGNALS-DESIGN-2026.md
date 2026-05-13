# Citizen Signals — Design (MVP) — May 2026

> Source of truth for the MVP scope. The longer strategic doc lives at
> `sql-migrations/DENUNCIAS/signal-DESIGN-2026.md` (kept verbatim from the
> original brief); this file is the **what-we-are-actually-shipping** summary
> referenced by every implementation PR.

## What

Citizen Signals (ES "Señal ciudadana", EN "Citizen Signal") is a moderated
civic reporting surface inside Crowd Conscious. Authenticated CDMX residents
file **complaints** or **suggestions** against municipalities or institutions,
attach optional evidence, and collect **co-signs** from other authenticated
citizens.

Signals are always **human-moderated before publication**. Once published, they
escalate through stages tied to co-sign thresholds:

- **Stage 0** — published; visible in feed; collecting co-signs.
- **Stage 1** — co-sign count ≥ 50 → the target is privately notified by email.
- **Stage 2** — co-sign count ≥ 200 → the Signal is promoted to a "dossier-lite"
  public exhibit on the detail page (no PDF export in MVP).
- **Stage 3+** — out of MVP scope (see Phase 2 in `signal-DESIGN-2026.md`).

## Why this is not a Pulse

Pulses are sponsor-framed, closed multi-outcome consultations resolved on a
fixed date. Signals are citizen-framed open narratives whose success is
measured in co-sign velocity and target response. Both surfaces share the dark
LandingNav shell but live in completely separate tables and admin paths.

## MVP boundary (founder decisions, locked May 12, 2026)

| Decision | Value |
|---|---|
| Canonical URL | `/signals` only |
| Pilot geography | All active `conscious_locations` where `city = 'Ciudad de México'` |
| Co-sign auth | Authenticated users only |
| Stage 1 threshold | **50** co-signs |
| Stage 2 threshold | **200** co-signs |
| Target email source | Manual entry on `citizen_targets.notification_email` |
| Moderation SLA badge | 72 hours (display only, no enforcement) |
| `SIGNALS_ENABLED` default | `true` in all environments |

## MVP is explicitly **NOT** shipping

- Recognition post type (only complaint + suggestion).
- `brand` / `public_figure` target kinds.
- Anonymous / guest co-sign.
- Conscious Fund or Pulse auto-conversion.
- Paid Stripe escalations.
- Population-normalised thresholds.
- Localized URL slugs (`/senales` vs `/signals`).
- `next-intl` (we stay on `contexts/LanguageContext` + `lib/i18n/*.ts`).
- PDF dossier export.
- Map-pin precision beyond "select a location row".

## Data model (introduced by migration `219_citizen_signals_mvp.sql`)

- `citizen_targets` — registry of municipalities + institutions a signal can
  target. Seeded by `scripts/seed-citizen-targets-cdmx.ts`.
- `citizen_signals` — the user-authored row. Public reads go through the
  `citizen_signals_public` view (strips PII, internal flags).
- `citizen_signal_evidence` — uploads in the `citizen-signals-evidence`
  private bucket; signed URLs only.
- `citizen_signal_cosigns` — unique `(signal_id, user_id)`; trigger keeps
  `citizen_signals.cosign_count` denormalised.
- `citizen_signal_comments` — only writable on published signals.
- `citizen_signal_responses` — official replies from a target.
- `citizen_signal_moderation_events` — append-only admin audit log.
- `citizen_signal_subscriptions` — per-signal email-notification opt-ins.
- `citizen_target_access_tokens` — magic-link tokens for the target
  dashboard. Stored as `token_hash` (SHA-256, hex); raw token never persisted.

RLS posture mirrors `216_sponsor_pulse_reports.sql`: admin direct access via
`profiles.user_type = 'admin'`, all other writes go through Next API routes
using the service-role client. Public reads use the `citizen_signals_public`
view.

## API surface

Public: `/api/signals` (GET list, POST create), `/api/signals/[slug]` (GET
detail), `/api/signals/[slug]/cosign` (POST/DELETE), `/api/signals/[slug]/comments`
(GET/POST), `/api/signals/upload` (POST).

Admin: `/api/admin/signals` (GET list), `/api/admin/signals/[id]` (PATCH state),
`/api/admin/signals/[id]/moderation` (POST log event).

Cron: `/api/cron/signal-threshold-check` (`*/15 * * * *`, Bearer
`CRON_SECRET`).

## UI surface

Public: `app/signals/page.tsx` (feed), `app/signals/nueva/page.tsx` (compose
wizard), `app/signals/[slug]/page.tsx` (detail), `app/signals/nueva/listo/page.tsx`
(success).

Admin: `app/admin/signals/page.tsx` (triage).

Target: `app/(public)/dashboard/target/[token]/page.tsx`.

All UI uses the dark Pulse shell (`bg-[#0f1419] text-slate-100`) wrapped by
`LandingNav` + `pt-20`, mirroring `app/pulse/layout.tsx`.

## Bilingual strategy

A single `lib/i18n/citizen-signals.ts` module exports `getCitizenSignalsCopy(locale)`
returning a typed object with ~40 nested string fields. Server components read
locale from cookies; client components from `useLanguage()`. **No `next-intl`.**

## Feature flag

`SIGNALS_ENABLED === 'true'` gates:
- The `/signals` nav link in `LandingNav`.
- `POST /api/signals` (returns 404 when disabled).
- `POST /api/signals/upload` (returns 404 when disabled).

Public GET routes stay reachable when the flag flips off so existing share
links don't 404 mid-pilot.

## References

- Strategic context: `sql-migrations/DENUNCIAS/signal-DESIGN-2026.md`.
- Implementation prompts: `sql-migrations/citizensignal.md` (F0–F15).
- Live checklist: `docs/SIGNALS-MVP-CHECKLIST.md`.
- Pattern files (mirrored):
  - `supabase/migrations/216_sponsor_pulse_reports.sql` — RLS shape.
  - `supabase/migrations/218_blog_images_bucket.sql` — storage bucket shape.
  - `app/api/inbox/nominate/route.ts` — auth + rate limit shape.
  - `app/api/cron/pulse-auto-resolve/route.ts` — cron + health-check shape.
  - `lib/agents/inbox-curator.ts` — agent shape.
  - `app/(public)/dashboard/sponsor/[token]/page.tsx` — token dashboard shape.
