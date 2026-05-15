Citizen Signals MVP — Sequenced Cursor prompts (copy/paste pack)
Repository root: /Users/franciscoblockstrand/Desktop/crowd-conscious-v2
Stack: Next.js 15 App Router, Supabase, Stripe (not in MVP Signals core), Resend, Anthropic agents, Tailwind.

Overview
What we are building
Citizen Signals (product naming: ES “Señal ciudadana”, EN “Citizen Signal”) is a moderated civic reporting surface: authenticated residents file Complaints or Suggestions against municipalities or institutions, attach optional evidence, earn co-signs from other signed-in citizens, cross escalation stage 1 (private notify target) then stage 2 (public visibility / dossier-lite), always human moderated before publish.

What the MVP includes
Post types: complaint | suggestion. Targets: municipality | institution only. Geography: CDMX-first (conscious_locations linkage). Auth: getCurrentUser required for create + co-sign. Escalation: stages 1–2 only. Single public URL segment /signals (Spanish UI strings say “Señales”; no bilingual path split in MVP).

What the MVP excludes
Recognition posts, brands/public figures, anonymous co-sign/guest flows, Conscious Fund conversions, Pulse auto-spawn, paid Stripe escalations, population-normalised thresholds, localized URL slugs (/senales vs /signals), next-intl (stay on LanguageContext + TS copy modules).

Dependency graph (prompt order)

F0: Founder checklist
F0b: Docs drop
F1: Migration 219 SQL file
F2: Regenerate types
F3a: Seed citizen_targets CDMX
F3b: lib/i18n/citizen-signals.ts
Parallel OK: APIs + UI scaffolding
Public UI feed + compose + detail
Admin triage UI
Target magic-link dashboard
Resend + agent + cron
Shared context block (repeated at top of every prompt below)

Shared context (read first)
- Project: /Users/franciscoblockstrand/Desktop/crowd-conscious-v2 (Next 15 + Supabase + Resend + agents).
- Product name: “Citizen Signal” / “Señal ciudadana”. Public route: /signals (no /senales route in MVP).
- UI shell: dark Pulse look — page bg bg-[#0f1419], cards border border-[#2d3748] border, text slate/emerald accents; mirror app/pulse/layout.tsx (LandingNav + pt-20). On layout wrapper, force dark shell (e.g. className on html wrapper section or minimal client theme hint) so you do NOT rely on globals.css forcing light mode on root (see src/app/globals.css — avoid fighting global * light rules).
- i18n: contexts/LanguageContext (es default). Add typed copy via lib/i18n/citizen-signals.ts; do NOT introduce next-intl.
- Tables prefix: citizen_signals, citizen_signal_*, citizen_targets*. Storage bucket: citizen-signals-evidence (private; signed URLs via service role or upload route).
- API patterns: lib/rate-limit.ts tiers; Zod on bodies; mirror app/api/inbox/nominate/route.ts and app/api/notifications/route.ts auth style.
- Admin gate: match strict profiles.user_type === 'admin' for new admin APIs OR document if you additionally honor ADMIN_EMAIL like some legacy predictions routes — pick ONE strategy and apply consistently in new code.
- Types: extend types/database.ts only via Supabase codegen after migration — no new untyped (supabase as any); audit forbid adding any.
- Feature flag: process.env.SIGNALS_ENABLED === 'true' gates public nav + POST create; document in .env.example if present.
Phase 0 — Foundations
Prompt F0 — Founder decisions checklist (run in chat, no code)
Goal: Lock decisions before any migration.

You (founder) ask the model:
Answer the following in a short bullet list I will paste into “Founder decisions” in docs/SIGNALS-MVP-CHECKLIST.md:

Confirm canonical URL is /signals only (yes/no). If no, specify redirect plan.
Pilot geography: CDMX only — list allowed conscious_locations.slug values OR “all active locations where city = Ciudad de México”.
Co-sign: confirm authenticated only (yes).
Stage 1 threshold integer (default propose 50) and Stage 2 integer (default propose 200).
Target notification email source: manual entry on citizen_targets.notification_email vs domain-inferred only.
Moderation SLA target hours (e.g. 72) for display in admin UI only.
SIGNALS_ENABLED default for staging vs prod.
Acceptance criteria: One-page bullet output you can paste into docs.
Out of scope: Implementation.

What this unblocks: F0b and migration constants.

Prompt F0b — Documentation drop
Goal: Add two docs the team can point agents at.

Files to create

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/docs/SIGNALS-DESIGN-2026.md — paste the prior design summary (MVP scope, stages 1–2, tables list, RLS intent, API list).
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/docs/SIGNALS-MVP-CHECKLIST.md — checklist with “Founder decisions” section filled from F0; include links to file paths below.
Patterns to mirror: Tone of existing /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/README.md + /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/CLAUDE.md.

Acceptance criteria: Both files exist; CHECKLIST references migration 219_*, /signals routes, SIGNALS_ENABLED.
Out of scope: Code changes beyond docs.

What this unblocks: Shared institutional memory.

Phase 1 — Data layer
Prompt F1 — Supabase migration 219 (SQL file only — do not run SQL)
Goal: Ship supabase/migrations/219_citizen_signals_mvp.sql with MVP schema, RLS, storage bucket statements.

File to create

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/supabase/migrations/219_citizen_signals_mvp.sql
Schema requirements

Enums / checks (text CHECK is fine)

citizen_signals.post_type: complaint | suggestion
citizen_signals.target_kind: municipality | institution
citizen_signals.publication_status: draft | pending_review | needs_edit | published | rejected | archived | disputed
citizen_signals.threshold_stage: smallint not null default 0 — MVP only 0,1,2
citizen_signals.location_precision: neighborhood | municipality_only (exact pin deferred)
citizen_targets

id uuid pk, slug text unique not null, display_name text not null, target_kind, optional conscious_location_id uuid references conscious_locations(id), notification_email text null, metadata jsonb default '{}', created_at, updated_at
Index: (target_kind), (conscious_location_id)
citizen_signals

id uuid pk, public_slug text unique not null (stable URL slug)
post_type, category text not null (free text MVP; constrain in app layer to allowed list constant)
severity text not null check in ('low','medium','high','critical')
target_kind, citizen_target_id uuid references citizen_targets(id) not null
title text, body text, language text not null check (language in ('es','en'))
conscious_location_id uuid references conscious_locations(id) not null (CDMX tie)
author_user_id uuid references auth.users(id) on delete set null not null
anonymous_display_mode boolean default false, anonymous_display_name text null — MVP: keep real user_id always; anonymity is display-only
publication_status default 'pending_review' on submit
threshold_stage default 0
cosign_count int default 0 maintained by trigger
ai_scores jsonb default '{}'::jsonb, edited_at timestamptz
stage1_met_at timestamptz, stage2_met_at timestamptz, private_target_notify_at timestamptz — nullable timestamps for cron
canonical_duplicate_of uuid null references citizen_signals(id)
created_at, updated_at
citizen_signal_evidence — signal_id fk, kind check in ('image','pdf','link'), storage_path text, external_url text, caption, visibility check in ('public','moderators_only') default 'moderators_only' until approved, timestamps.

citizen_signal_cosigns — signal_id, user_id references auth.users, created_at, unique(signal_id,user_id). Trigger: increment/decrement citizen_signals.cosign_count.

citizen_signal_comments — signal_id, author_user_id, body, created_at; only on published signals for writes (enforce via RLS or API).

citizen_signal_responses — official target replies: signal_id, citizen_target_id, author_label text, body, official_status text check in ('acknowledged','in_progress','resolved'), created_at.

citizen_signal_moderation_events — signal_id, admin_user_id uuid references auth.users, action text, detail jsonb, created_at; no updates.

citizen_signal_subscriptions — signal_id, user_id, frequency text default 'immediate', created_at, unique(signal_id,user_id).

citizen_target_access_tokens (magic-link for target dashboard MVP)

id uuid pk, citizen_target_id fk, token_hash text not null (store hash only), expires_at, created_at, revoked_at
One active token policy documented in SQL comment.
View citizen_signals_public — exposes only rows publication_status = 'published' and columns safe for anon (no moderator fields, strip internal emails). Grant SELECT to anon, authenticated as appropriate following patterns in migrations like 216_sponsor_pulse_reports.sql.

RLS

Signals: authenticated users INSERT own draft/pending restricted — prefer writes via service role in API and RLS SELECT rules: author reads own rows; public reads via view only.
Admin bypass: replicate style from migration 216 / policy “admin” uses profiles.user_type = 'admin' if that pattern exists; else document service-role-only mutations (acceptable MVP if all writes go through Next API using createAdminClient sparingly).
Storage bucket citizen-signals-evidence: private policies; admins + uploader read — mirror /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/supabase/migrations/218_blog_images_bucket.sql structure.

Patterns to mirror: RLS verbosity of /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/supabase/migrations/216_sponsor_pulse_reports.sql and storage pattern 218_blog_images_bucket.sql.

Important: Write the migration file locally; instruct humans to supabase db push or CI apply — do not execute SQL inside the agent against production.

Acceptance criteria: File exists; all tables/indexes documented; triggers for cosign counts; comments explain stage fields. No DROP TABLE public.prediction_markets.
Out of scope: Pulse/Fund bridging, Recognition type, anon co-sign.

What this unblocks: Type generation, seeds, APIs.

Prompt F2 — Regenerate Database types
Goal: Refresh /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/types/database.ts from Supabase after F1 applies.

Files to modify

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/types/database.ts (generated output)
Commands (run locally after migration applies to the linked project)

cd /Users/franciscoblockstrand/Desktop/crowd-conscious-v2
npx supabase gen types typescript --project-id "<SUPABASE_PROJECT_REF>" --schema public > types/database.ts
(If local Supabase CLI with Docker: npx supabase gen types typescript --local --schema public > types/database.ts.)

Acceptance criteria: New tables appear under Tables:; repo tsc --noEmit clean; zero new (supabase as any) introduced in Signals code you touch next.

Out of scope: Fixing unrelated stale types beyond merge conflicts.

What this unblocks: Strictly typed APIs and UI.

Parallel OK: None until migration is applied in a real environment; sequencing is strictly after F1 apply.

Prompt F3a — Seed CDMX citizen_targets
Goal: Insert pilot municipalities + a few institutional rows.

Files to create

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/scripts/seed-citizen-targets-cdmx.ts
Patterns to mirror

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/scripts/seed-causes-v2.ts for Supabase admin client bootstrap.
Acceptance criteria: Idempotent upsert by slug; logs counts; README comment at top explains env vars (SUPABASE_SERVICE_ROLE_KEY).
Out of scope: Production data entry for real emails beyond placeholders.

What this unblocks: Target picker in compose wizard.

Phase 2 — i18n
Prompt F3b — lib/i18n/citizen-signals.ts
Goal: Typed bilingual strings for Signals surfaces.

Files to create

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/i18n/citizen-signals.ts
Patterns to mirror

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/i18n/pulse-listing.ts (simple getCitizenSignalsCopy(locale) returning ~40 nested string fields + helpers for status badges).
Starter key groups (~40 strings total across nav.feed., compose., detail., cosign., moderation., targetDash., legal., stages.)

Acceptance criteria: Export functions usable from server (cookies locale) + client (useLanguage); zero next-intl imports.
Out of scope: Translating unrelated locales JSON.

Parallel with F3a: Yes, after F2 completes.

What this unblocks: All UI prompts.

Phase 3 — API layer
Prompt F4 — Public read/list + fetch by slug
Goal: GET /api/signals (published only, pagination) and GET /api/signals/[slug] (published detail + evidence public visibility).

Files to create

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/signals/route.ts
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/signals/[slug]/route.ts
Patterns to mirror

GET style of /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/fund/causes/public/route.ts
Zod query params optional
Rate limits

GET: lenientRateLimit or standardRateLimit from /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/rate-limit.ts behind checkRateLimit if exported.
Feature flag

If SIGNALS_ENABLED !== 'true', return 404 JSON.
Acceptance criteria: Typed selects; anonymous can list published only; slug 404 handled; no any.
Out of scope: POST create (next prompt cluster).

Prompt F5 — Create signal + uploads
Goal: Authenticated POST create + upload helper.

Files to create

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/signals/create/route.ts OR POST handler inside app/api/signals/route.ts (pick one route shape; preference: separate route.ts POST same file only if cohesive). Prefer app/api/signals/route.ts with POST.

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/signals/upload/route.ts — multipart or JSON with signed path pattern; use createAdminClient or service pattern consistent with /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/sponsor/upload-logo/route.ts but without (supabase as any) — use generated types.

Patterns to mirror

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/inbox/nominate/route.ts — Zod + moderateRateLimit + getRateLimitIdentifier
Validation

Reject if target_kind not in MVP enum; conscious_location_id must belong to allowed CDMX list (env SIGNALS_ALLOWED_LOCATION_IDS comma-separated OR query against conscious_locations city field).
Acceptance criteria: Creates row pending_review; writes moderation event submitted; returns { slug }; rate limited.
Out of scope: Email send (later prompt).

Parallel with F4: After F2; can implement after F4 merged.

Prompt F6 — Co-sign + comments
Goal: Co-sign POST/DELETE and comments GET/POST for published signals only.

Files to create

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/signals/[slug]/cosign/route.ts
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/signals/[slug]/comments/route.ts
Patterns to mirror

Auth: /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/notifications/route.ts
Rate limits

Co-sign: standardRateLimit; Comments: standardRateLimit
Acceptance criteria: Unique co-sign enforced (map DB error to 409); DELETE co-sign allowed by same user; comments reject if not published.
Out of scope: Notifications on new co-sign.

Prompt F7 — Admin queue + actions
Goal: Admin-only list + transition actions + moderation log append.

Files to create

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/admin/signals/route.ts — GET list with filters status, stage, sort
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/admin/signals/[id]/route.ts — PATCH publication_status, needs_edit message, canonical_duplicate_of merge field
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/admin/signals/[id]/moderation/route.ts — POST append-only moderation event
Patterns to mirror

Admin checks in /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/predictions/admin/blog-posts/route.ts (profiles.user_type !== 'admin')
Acceptance criteria: Non-admin 403; every state change inserts citizen_signal_moderation_events; merge sets duplicate’s publication_status='archived' when instructed.
Out of scope: Full duplicate-detection UI logic (can stub).

Phase 4 — Public UI
Prompt F8 — Feed + layout + cards
Goal: Public /signals feed.

Files to create

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/signals/layout.tsx — mirror /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/pulse/layout.tsx; wrap children in bg-[#0f1419] text-slate-100 min-h-screen
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/signals/page.tsx — server-fetch published list calling internal API OR direct createClient read from citizen_signals_public view
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/components/signals/SignalsFeed.tsx
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/components/signals/SignalCard.tsx
Patterns to mirror

Card rhythm from /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/components/pulse/PulseListingView.tsx
Navigation

If SIGNALS_ENABLED, add /signals link next to Pulse in /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/components/landing/LandingNav.tsx (feature-flagged).
Acceptance criteria: Mobile stacking; keyboard-focusable cards; empty state strings from copy module.

Out of scope: Compose wizard.

Prompt F9 — Compose wizard
Goal: Multi-step authenticated flow /signals/nueva.

Files

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/signals/nueva/page.tsx
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/components/signals/ComposeWizard.tsx
Optionally /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/components/signals/TargetSelect.tsx, LocationSelect.tsx
Flows

Steps: Type → Target (from citizen_targets) → Location (conscious_locations CDMX) → Narrative (title/body/language) → Evidence (calls upload route) → Preview + Legal disclaimer checkbox → Submit POST.

A11y

aria-live on step indicator; labelled file input; modal preview focus trap optional.
Acceptance criteria: Disabled submit until legal checkbox; router.push(/signals/[slug]) uses returned slug once published is false — redirect to /signals?view=submitted&id= or success page /signals/nueva/listo (create simple success page).

Out of scope: Map pin precision beyond selecting a location row.

Prompt F10 — Detail page + engagement widgets
Goal: /signals/[slug] wired to GET API + cosign/comments client components.

Files

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/signals/[slug]/page.tsx
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/components/signals/SignalDetail.tsx
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/components/signals/CoSignButton.tsx
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/components/signals/EvidenceGallery.tsx
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/components/signals/TimelineRail.tsx
TimelineRail

Stages: Moderation pending (only author sees?), Stage 1 private notify, Stage 2 public dossier-lite — MVP show cosign progess bars toward fixed thresholds 50 / 200 from env NEXT_PUBLIC_SIGNALS_STAGE1 / NEXT_PUBLIC_SIGNALS_STAGE2.

Acceptance criteria: Hydration-safe; optimistic co-sign UX optional; graceful 404.

Out of scope: SSR OG image (unless quick reuse of app/api/og/market/[id] pattern — mark out of scope to avoid creep).

Phase 5 — Admin UI
Prompt F11 — Admin triage page
Goal: /admin/signals

Files

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/admin/signals/page.tsx
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/components/admin/SignalsTriage.tsx
Patterns to mirror

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(predictions)/predictions/inbox/InboxClient.tsx for tabs, badges, moderation actions
Gate page with same pattern as /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/admin/page.tsx (profiles.user_type === 'admin')
Features

Filter by pending_review, bulk approve, request edit textarea, moderation log accordion, merge duplicates (pick canonical slug).

Acceptance criteria: All actions hit F7 endpoints; optimistic refresh; no Tailwind clashes with admin shell.

Out of scope: Beautiful charts.

Phase 6 — Target dashboard
Prompt F12 — Magic-link target dashboard
Goal: Targets respond officially.

Files

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(public)/dashboard/target/[token]/page.tsx — mirror SSR data load style of /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(public)/dashboard/sponsor/[token]/page.tsx (lookup by token via admin client comparing hash of raw token vs stored hash — implement SHA-256 in server util /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/target-token-hash.ts)
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/components/target/TargetDashboardClient.tsx
Flows

For published signals staged ≥1 listing for that target: show title/summary threads; composer writes citizen_signal_responses with official_status transitions permitted acknowledged|in_progress|resolved.

Security

Never leak other targets’ signals; validate token binds one citizen_targets.id.

Acceptance criteria: Invalid/expired token page matches sponsor invalid link tone (Spanish-first copy).

Out of scope: Automated token email delivery wiring (combine with Prompt F13).

Phase 7 — Notifications, AI, Cron
Prompt F13 — Resend stubs
Goal: Email helpers and wire triggers from API paths.

Files to modify

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/resend.ts — add sendCitizenSignalsFilerReceived, Published, TargetNotifiedStage1, TargetReplied (use same transport patterns existing in file).
Callsites

After POST create moderation path (Pending) optionally skip email until moderator approves OR send received only — choose “filer received after submit” MVP consistent with Conscious Inbox.
Acceptance criteria: Helpers exported and called from /app/api/signals/route.ts POST behind feature flag env RESEND_ENABLED guard if codebase already does.

Out of scope: Weekly digest scheduling content.

Prompt F14 — AI moderator agent
Goal: /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/agents/signals-moderator.ts

Patterns to mirror

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/agents/inbox-curator.ts + logAgentRun per /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/CLAUDE.md.
Behaviour

Structured JSON output → save into citizen_signals.ai_scores; non-blocking invocation from POST create via waitUntil/fire-and-forget pattern used elsewhere (search async call in admin routes).

Acceptance criteria: Runs do not fail create path on agent error; typed output interface; no any.

Prompt F15 — Cron threshold stage 1 stub
Goal: /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/cron/signal-threshold-check/route.ts

Patterns to mirror

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/cron/pulse-auto-resolve/route.ts — Bearer process.env.CRON_SECRET, cronHealthCheck/cronHealthComplete from /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/cron-health.ts
Logic

Published signals where threshold_stage < 1 and cosign_count >= thresholds.stage1 → set stage 1 timestamps, enqueue Resend TargetNotifiedStage1 (if email present).

Files to modify

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/vercel.json — crons entry path /api/cron/signal-threshold-check schedule */15 * * * *; functions maxDuration similarly to other cron.
Acceptance criteria: Protected by secret; Stage 2 not implemented beyond TODO comment.

Out of scope: Stage 2 email blast redesign.

Cross-cutting checklist (tick as you ship)

 219_citizen_signals_mvp.sql applied on staging/production via Supabase pipeline

 types/database.ts regenerated via npx supabase gen types typescript ... and committed

 tsc --noEmit passes

 RLS smoke tests: anon cannot SELECT non-published fields; writer paths only Next API/service role

 Rate limits on POST create / co-sign / comments / uploads per lib/rate-limit.ts

 SIGNALS_ENABLED toggles LandingNav link + APIs

 NEXT_PUBLIC_SIGNALS_STAGE1 / NEXT_PUBLIC_SIGNALS_STAGE2 or server-only equivalents consistent with cron thresholds

 citizen_signals_public exposes no PII/evidence flagged moderators_only

 i18n keys present ES/EN in citizen-signals.ts module

 Spanish UX review scheduled for wizard + legal disclaimers

 Dark UI verified on /signals* (LandingNav contrast) despite globals.css

 No new any introduced in Signals codepaths

 citizen_signal_moderation_events written on moderation actions

 Resend templates/environment variables wired in Vercel

 CRON_SECRET set; cron route reachable only with bearer

 magic-link hashing validated (timing-safe compare recommended)
