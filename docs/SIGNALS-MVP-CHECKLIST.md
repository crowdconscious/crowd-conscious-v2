# Citizen Signals — MVP Checklist

Living checklist for the Citizen Signals MVP rollout. Tick items as they ship.
Cross-reference: `docs/SIGNALS-DESIGN-2026.md` (scope), `sql-migrations/citizensignal.md` (sequenced prompts).

## Founder decisions (locked May 12, 2026)

- Canonical URL: **/signals** (no `/senales` redirect in MVP).
- Pilot geography: **All active `conscious_locations` where `city = 'Ciudad de México'`** (enforced at API layer, not DB constraint).
- Co-sign auth: **Authenticated users only**.
- Stage 1 threshold: **50** co-signs.
- Stage 2 threshold: **200** co-signs.
- Target email source: **Manual entry on `citizen_targets.notification_email`** (no automatic domain inference).
- Moderation SLA badge: **72 hours** (display only).
- `SIGNALS_ENABLED` default: **`true`** in all environments.

## Phase 0 — Foundations

- [x] F0  Founder decisions captured (see above).
- [x] F0b Drop `docs/SIGNALS-DESIGN-2026.md` and this file.

## Phase 1 — Data layer

- [ ] F1  `supabase/migrations/219_citizen_signals_mvp.sql` committed.
- [ ] F1a Migration applied to the live Supabase project by the founder (no
  agent ran SQL).
- [ ] F2  `types/database.ts` updated with all new tables (option B: hand-roll
  the new Signal tables; we'll do a full `supabase gen types` swap in a
  follow-up sweep).
- [ ] F3a `scripts/seed-citizen-targets-cdmx.ts` ships and was run against
  the pilot Supabase project at least once.

## Phase 2 — i18n

- [ ] F3b `lib/i18n/citizen-signals.ts` ships with ES + EN copy.

## Phase 3 — API layer

- [ ] F4  `GET /api/signals` + `GET /api/signals/[slug]`.
- [ ] F5  `POST /api/signals` (create) + `POST /api/signals/upload`.
- [ ] F6  `/api/signals/[slug]/cosign` (POST/DELETE) + `/api/signals/[slug]/comments` (GET/POST).
- [ ] F7  `/api/admin/signals/*` + moderation log endpoint.

## Phase 4 — Public UI

- [ ] F8  `app/signals/layout.tsx` + `app/signals/page.tsx` (feed).
- [ ] F9  `app/signals/nueva/page.tsx` (compose wizard) + success page.
- [ ] F10 `app/signals/[slug]/page.tsx` (detail) with cosign + comments
  + evidence + timeline rail.

## Phase 5 — Admin UI

- [ ] F11 `app/admin/signals/page.tsx` (triage).

## Phase 6 — Target dashboard

- [ ] F12 `app/(public)/dashboard/target/[token]/page.tsx`.
- [ ] `lib/target-token-hash.ts` (SHA-256 server util; timing-safe compare).

## Phase 7 — Notifications, AI, Cron

- [x] F13 Resend helpers + wire from POST create.
- [x] F14 `lib/agents/signals-moderator.ts` (non-blocking from POST).
- [x] F15 `app/api/cron/signal-threshold-check/route.ts` + `vercel.json` entry.

## Cross-cutting (tick as you ship)

- [ ] `tsc --noEmit` passes after every PR.
- [ ] RLS smoke tests: anon cannot SELECT non-published fields directly.
- [ ] Rate limits applied to POST create, cosign, comments, uploads
  (`lib/rate-limit.ts`).
- [ ] `SIGNALS_ENABLED` gates `LandingNav` + POST routes.
- [ ] `NEXT_PUBLIC_SIGNALS_STAGE1=50` and `NEXT_PUBLIC_SIGNALS_STAGE2=200`
  set in Vercel (used by `TimelineRail` to render progress).
- [ ] Cron-side stage thresholds read from server-only env (must match
  client values; document in the cron route header).
- [ ] `citizen_signals_public` view never exposes PII or `moderators_only`
  evidence.
- [ ] No new `(supabase as any)` in Signals code (use generated types).
- [ ] Every moderation action writes one row in
  `citizen_signal_moderation_events`.
- [ ] Resend templates registered in `lib/resend.ts`; `RESEND_API_KEY` set
  in Vercel.
- [ ] `CRON_SECRET` set; cron route returns 401 without it.
- [ ] Target magic-link uses hashed comparison only.
- [ ] Dark UI verified on `/signals*` (LandingNav contrast vs `globals.css`).
- [ ] Spanish UX review on the wizard + legal disclaimers before launch.

## Environment variables (add to Vercel before launch)

| Var | Notes |
|---|---|
| `SIGNALS_ENABLED` | `true` in all envs per founder decision. Server-side gate (API routes return 404 when off). |
| `NEXT_PUBLIC_SIGNALS_ENABLED` | `true` in all envs. Client-side mirror of the same flag — needed because the `LandingNav` link to `/signals` is rendered in a client component. Keep this value in sync with `SIGNALS_ENABLED`. |
| `NEXT_PUBLIC_SIGNALS_STAGE1` | `50`. |
| `NEXT_PUBLIC_SIGNALS_STAGE2` | `200`. |
| `SIGNALS_ALLOWED_LOCATION_IDS` | Optional comma-separated allow-list. If unset, F5 enforces "city = Ciudad de México" via DB query. |
| `RESEND_API_KEY` | Already set; no change. F13 helpers short-circuit (no-op) when this is missing instead of throwing. |
| `RESEND_FROM_EMAIL` | Optional override for the Resend `from` address. Defaults to `Crowd Conscious <comunidad@crowdconscious.app>` (existing verified domain). |
| `RESEND_ENABLED` | Optional. `true` by default. Set to `false` in local dev/test to hard-disable Signal emails without unsetting the API key. |
| `ADMIN_EMAIL` | Already used by sponsorship admin notifications. Reused by `sendSignalModeratorDailyDigest` when no explicit `to` is provided. Falls back to `comunidad@crowdconscious.app`. |
| `CRON_SECRET` | Already set; same secret as existing crons. Required by `/api/cron/signal-threshold-check`. |
| `NEXT_PUBLIC_SITE_URL` | Public origin used to build the magic-link URL emailed by the F15 cron (e.g. `https://crowdconscious.app`). Falls back to `NEXT_PUBLIC_APP_URL`, then to the request's `Host` header. |
| `SIGNALS_SYSTEM_ADMIN_USER_ID` | Optional `auth.users.id` to record as `admin_user_id` on cron-written `citizen_signal_moderation_events` rows. If unset, the cron picks the oldest `profiles.user_type = 'admin'` row; if neither resolves, the audit row is skipped (with a warning). |

## Cron — Signal Threshold Check (F15)

- Route: `app/api/cron/signal-threshold-check/route.ts`
- Schedule: `*/15 * * * *` (every 15 minutes; see `vercel.json` `crons`).
- Auth: `Authorization: Bearer ${CRON_SECRET}` (same shape as
  `pulse-auto-resolve`).
- Stage thresholds read from `NEXT_PUBLIC_SIGNALS_STAGE1` / `NEXT_PUBLIC_SIGNALS_STAGE2`
  (server reads the `NEXT_PUBLIC_*` envs intentionally so the client
  `TimelineRail` and the cron can never disagree).
- Stage 1 promotion: marks `threshold_stage = 1` + `stage1_met_at`,
  mints a 7-day `citizen_target_access_tokens` row, emails the target
  via `sendSignalTargetNotifiedStage1` (F13). On a successful send,
  stamps `private_target_notify_at`. Always appends a
  `citizen_signal_moderation_events` row with `action='stage1_reached'`.
- Stage 2 promotion: marks `threshold_stage = 2` + `stage2_met_at` and
  appends `action='stage2_reached'`. **No mass mail in MVP** — the
  dossier email blast is an explicit follow-up `TODO` in the route.
- Idempotent: every state flip uses a `WHERE threshold_stage < N` guard
  so a second pass within the same window is a no-op for rows already
  promoted.
- Manual QA trigger:
  ```bash
  curl -i -H "Authorization: Bearer $CRON_SECRET" \
    https://crowdconscious.app/api/cron/signal-threshold-check
  ```
  Expected: `200 { ok: true, stage1_promoted, stage2_promoted, errors? }`.
  Without the bearer (or with the wrong one) the route returns `401`.

## File map (created during the MVP)

```
docs/SIGNALS-DESIGN-2026.md
docs/SIGNALS-MVP-CHECKLIST.md            ← this file

supabase/migrations/219_citizen_signals_mvp.sql

scripts/seed-citizen-targets-cdmx.ts

lib/i18n/citizen-signals.ts
lib/target-token-hash.ts
lib/agents/signals-moderator.ts

app/api/signals/route.ts
app/api/signals/[slug]/route.ts
app/api/signals/[slug]/cosign/route.ts
app/api/signals/[slug]/comments/route.ts
app/api/signals/upload/route.ts
app/api/admin/signals/route.ts
app/api/admin/signals/[id]/route.ts
app/api/admin/signals/[id]/moderation/route.ts
app/api/cron/signal-threshold-check/route.ts

app/signals/layout.tsx
app/signals/page.tsx
app/signals/nueva/page.tsx
app/signals/nueva/listo/page.tsx
app/signals/[slug]/page.tsx
app/admin/signals/page.tsx
app/(public)/dashboard/target/[token]/page.tsx

components/signals/SignalsFeed.tsx
components/signals/SignalCard.tsx
components/signals/SignalDetail.tsx
components/signals/ComposeWizard.tsx
components/signals/TargetSelect.tsx
components/signals/LocationSelect.tsx
components/signals/CoSignButton.tsx
components/signals/EvidenceGallery.tsx
components/signals/TimelineRail.tsx
components/admin/SignalsTriage.tsx
components/target/TargetDashboardClient.tsx

lib/emails/signals/SignalsEmailLayout.tsx
lib/emails/signals/FilerReceivedEmail.tsx
lib/emails/signals/FilerPublishedEmail.tsx
lib/emails/signals/FilerRejectedEmail.tsx
lib/emails/signals/FilerNeedsEditEmail.tsx
lib/emails/signals/TargetNotifiedStage1Email.tsx
lib/emails/signals/TargetRepliedEmail.tsx
lib/emails/signals/ModeratorDailyDigestEmail.tsx
```

## F13 — Resend lifecycle emails

Templates live in `lib/emails/signals/` (React Email; mirrors the existing
`app/lib/email-templates/` pattern). Helpers in `lib/resend.ts` are
additive and all return `{ ok, id?, error? }` without throwing. Calling
code uses fire-and-forget (`void (...).catch(console.error)`) so a Resend
outage never 500s a user-facing route. All helpers short-circuit when
`RESEND_ENABLED === 'false'` or when `RESEND_API_KEY` is missing.

| # | Helper | Trigger | Recipient | Locale |
|---|---|---|---|---|
| 1 | `sendSignalFilerReceived` | After successful `POST /api/signals` insert | Filer (`profiles.email`) | Signal `language` (es/en) |
| 2 | `sendSignalFilerPublished` | `PATCH /api/admin/signals/[id]` → `published` | Filer | Signal `language` |
| 3 | `sendSignalFilerRejected` | `PATCH …` → `rejected` (quotes `body.reason`) | Filer | Signal `language` |
| 4 | `sendSignalFilerNeedsEdit` | `PATCH …` → `needs_edit` (quotes `body.needs_edit_message`) | Filer | Signal `language` |
| 5 | `sendSignalTargetNotifiedStage1` | F15 cron at stage 1 threshold (helper exported now; cron will call it) | Target rep (`citizen_targets.notification_email`) | Signal `language` |
| 6 | `sendSignalTargetReplied` | After `POST /api/target/respond` insert | Filer | Signal `language` |
| 7 | `sendSignalModeratorDailyDigest` | F15 cron / ad-hoc admin task | `ADMIN_EMAIL` (or override) | Spanish only |
