Citizen Complaints & Suggestions (“Denuncia Ciudadana”) — Product & Technical Design
Repository: /Users/franciscoblockstrand/Desktop/crowd-conscious-v2
Integration anchors: Conscious Inbox (conscious_inbox + /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/inbox/nominate/route.ts), Fund causes (fund_causes, promote flow in /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/predictions/admin/inbox/[id]/promote-to-cause/route.ts), Locations (conscious_locations, /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/supabase/migrations/186_conscious_locations.sql), sponsor magic links (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(public)/dashboard/sponsor/[token]/page.tsx), i18n (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/contexts/LanguageContext.tsx, /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/i18n/*), agents (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/agents/*), rate limits (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/rate-limit.ts), notifications (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/notifications/route.ts), OG (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/og/market/[id]/route.tsx as template), pulses (prediction_markets + is_pulse, /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/pulse/[id]/page.tsx, admin market APIs under /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/predictions/admin/*).

1. Feature framing and naming
1.1 Name options (ES / EN)
Working name	ES	EN
A
Denuncias Conscientes
Conscious Complaints
B
Señales Ciudadanas
Citizen Signals
C
Voz Consciente
Conscious Voice
Recommendation: Ship under “Señales Ciudadanas” / “Citizen Signals” as the umbrella brand line, with subtypes labelled plainly: Denuncia (Complaint), Propuesta (Suggestion), Reconocimiento (Recognition).

Rationale:

“Denuncia” carries strong legal/defamation baggage in MX public discourse; using it only as a subtype keeps marketing flexible.
“Señales” aligns with Pulse language (signals of collective sentiment) without implying a courtroom filing.
English “Citizen Signals” is short for nav, OG tags, and press.
Reserve Denuncias Conscientes as an SEO-heavy secondary term on the landing subsection (Spanish-only meta), not necessarily the slug.

1.2 Versus Pulses — crisp differentiation
Dimension	Pulse (existing)	Citizen Signal (new)
Who frames the question
Sponsor / admin structures a closed multi-outcome consultation
Citizen frames an open civic issue narrative with optional evidence
Success metric
Votes + confidence distributions on predefined outcomes
Co-sign velocity, responses from targets, resolution state
Lifecycle
prediction_markets + resolution (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/cron/pulse-auto-resolve/route.ts)
Moderation thresholds, escalation letters, reply workflow
Monetisation
Sponsored pulse buy flow (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/pulse/checkout/route.ts, sponsor dashboard)
Organic traction first; optionally paid amplification later (Stripe / sponsor)
Rule of thumb: A citizen answers a Pulse when there is already a structured question tied to sponsorship or editorial strategy. They file a Signal when something is wrong or missing and collective pressure + accountability is the mechanism.

1.3 Three post types — ship all three or narrow?
Types: Complaint, Suggestion, Recognition.

Recommendation:

MVP: Complaint + Suggestion only. Same schema (post_type), different copy, moderation rules (complaints require stricter evidence for people-targets — see §4).
Phase 2: Add Recognition (positive civic reinforcement) once moderation playbooks stabilize; easier to brigade emotionally, so defer.
2. Target taxonomy, categories, severity, geography
2.1 Targets (subject of the Signal)
Enum target_kind:

Kind	Legal / safety notes
municipality
Lowest personal-defamation surface if tied to office (“Alcaldía X neglected Y”) vs named individuals
institution
Schools, utilities, transit agencies — treat like brands for reply/claim flows
brand
Use sponsor_accounts-like verification for “official reply”, not necessarily same table
public_figure
Highest risk — require escalation of evidence, optional provisional “pending verification” publishing
other
Free-text name + disclaimers
Recommendation: MVP municipality + institution only (map closely to /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/supabase/migrations/186_conscious_locations.sql and existing location admin). Phase 2: brand linkage to sponsor tooling; Phase 3: public figures under strict playbook.

2.2 Categories (initial set)
Version in code as constants + DB check constraint + lib/agents/ classifier whitelist:

environment, mobility_transport, public_space, public_health, safety_security, corruption_ethics, accessibility, animal_welfare, gender_rights, housing, education, water_sanitation, noise_pollution, consumer_protection, culture_sport, other.

Align with Conscious Inbox / fund cause categories where possible (promote-to-cause constraint note in /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/predictions/admin/inbox/[id]/promote-to-cause/route.ts).

2.3 Severity / urgency
4-level UI enum (map to moderator queue priority and AI classifier):

Code	ES label	EN label	Meaning
low
Baja urgencia
Low urgency
Chronic / quality-of-life
medium
Media urgencia
Medium urgency
Repeated failure affecting many
high
Alta urgencia
High urgency
Health/safety/environmental acute risk
critical
Crítico
Critical
Life-safety suspected (extra moderation; may withhold auto-publish pending human)
Moderators can downgrade/override; classifier suggests only.

2.4 Location — tie to Conscious Locations & Leaflet
Required on MVP: conscious_locations_id nullable FK plus latitude, longitude, location_label, geom optional (defer PostGIS extension decision to migration).
Reuse UX from /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/components/locations/LocationsMap.tsx (and related) for picker + pin.
If user picks a polygon-level issue, store both location FK + exact pin separately for privacy (pin optional / blurred for sensitive complaints).
3. Core user flows
Shared UI shell for public surfaces: mirror /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/pulse/layout.tsx pattern (LandingNav + dark section bg-[#0f1419], Footer) to avoid battling /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/src/app/globals.css global light overrides (apply html dark class consistently on these routes).

3a. Citizen — filer
Screens:

Discovery /denuncias — feed hero + CTAs (“Crear una señal” / “Raise a signal”).
Compose /denuncias/nueva — long form wizard (mobile stacked steps).
Preview & legal — modal step with ES/EN disclaimers (+ links to /terms).
Submitted /denuncias/nueva/exito?id=… — “En revisión” / “Pending review”.
Track /denuncias/[slug]#mi-señal — status chip, moderator notes (if edits requested), thresholds bar.
Key copy sketches:

Step	ES	EN
Hero
“Alza la voz sobre lo que debe cambiar.”
“Signal what needs to change — safely and collectively.”
Evidence
“En problemas graves, necesitamos evidencia verificable (fotos, documentos públicos).”
“Serious complaints need verifiable evidence (photos, public documents).”
Anonymous
“El nombre público será un alias.”
“Your public display name will be an alias.”
Disclaimer
“No podemos dar consejo legal. No hagas declaraciones falsas…”
“We cannot provide legal advice. Do not publish false factual claims…”
States:

Loading: skeleton list / step skeleton (match PulseListingView).
Empty feed: curated “primeras señales” illustration + FAQ.
Error: non-blocking toast + persisted draft in localStorage + server draft row optional.
A11y: Field aria-describedby tying to disclaimers; file upload labelled; focus trap in preview modal.

3b. Citizen — co-signer / browser
Screens:

Feed /denuncias — filters chips (location, category, target_kind, Stage 0–n).
Detail /denuncias/[slug] — narrative, timeline, counts, replies, dossier PDF link (when unlocked).
Co-sign — one-click; optional short comment (“why I co-sign”); duplicates blocked by unique (signal_id, user_id) / anon session fingerprint.
Empty / loading / errors: Pagination (cursor); “No hay señales en esta zona — amplía filtros”; 404 for rejected-only visibility.

3c. Admin / moderator
Extend mental model from /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(predictions)/predictions/inbox/ + promote-to-cause:

Screens:

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(predictions)/predictions/inbox/InboxClient.tsx pattern informs /admin/denuncias/page.tsx.
Tabs: Nueva / Riesgo legal / Lista duplicados / Respondidas por autoridad.
Actions: approve, reject, request edit, merge (pick canonical), escalate stage, spawn Pulse, spawn fund_causes draft, revoke publish.

Audit: denuncia_moderation_log (append-only from server).

3d. Sponsor / partner brand (Phase 2+)
Subscribe to Signals where target_id resolves to verified brand dashboard (reuse sponsor token pattern from /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(public)/dashboard/sponsor/[token]/page.tsx).

Screens: inbox of “signals about us”, templated acknowledgement, donate-to-cause (SuggestCauseForm pattern in /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/components/sponsor/SuggestCauseForm.tsx references inbox → causes).

3e. Target (municipality / institution — MVP focus)
Mirror magic link issuance like access_token on sponsor_accounts:

target_response_tokens (see §6): RESPONSE_SECRET hashed, TTL, revoked on abuse.
First touch: Signed email (“You have pending citizen signals — respond responsibly”) → /dashboard/target/[token].
Dashboard: threaded reply, status badges “Recibimos / En análisis / Resuelto” / “Acknowledged / In progress / Resolved”.
Citizens validate: optional post-resolution poll (thin Pulse?) or simple “¿Te parece suficiente?” — anti-brigaded via rate limits.
Copy ES/EN:

Landing: “Respuesta oficial · Official response” — require role attestation checkbox.
4. Safety, trust and legal
High-level informational only — founders must counsel with MX counsel.

4.1 Anti-defamation and abuse layers
Author attestation checkbox — factual claims truthful to best knowledge.
Evidence gates: target_kind = public_figure or accusations of illegality → min N attachments OR link to authoritative source (validated URL host allowlist partial).
AI moderation — new /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/agents/denuncias-moderator.ts analogous to /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/agents/inbox-curator.ts: outputs {category_guess, severity_guess, pii_detected[], defamation_risk, duplicate_candidates[], summary_es, summary_en} stored in moderation JSON.
PII scrub — regex + model pass; strip phone/email from body to public rendering; moderator sees originals.
Profanity — soft-mask in public preview if borderline pending review.
4.2 Anonymous-but-accountable
Auth required (getCurrentUser from /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/auth-server.ts); pseudonym stored on row; real user_id RLS-visible only moderator role.
Reuse anonymity patterns already used elsewhere (anonymous_participants flows for pulses) only if legally cleared for co-sign; MVP recommendation: authenticated co-sign required to reduce brigading — anonymous view only optionally later.
4.3 Doxxing protections
No exact home addresses in public fields — structured address goes to moderated-only column; blur pin option.

4.4 Brigading / vote manipulation
Apply /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/rate-limit.ts:

Compose: moderateRateLimit (same ethos as /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/inbox/nominate/route.ts).
Co-sign: standardRateLimit per IP/user; spike detection job flags anomalies.
Optionally weight co-sign by account age + verification milestone (defer “verified-only” thresholds to Phase 2).
4.5 Right-to-reply before “press” escalation
Stages (§5) gated: before stage that generates public dossier or mass email blast, enqueue private target notification window (e.g. 72 hours for municipalities in pilot). Admin override with logged reason.

4.6 Takedown / appeal
User appeal form → moderator queue.
Target legal report → freezes public visibility (status='disputed').
Transparency: changelog on detail page (“Contenido moderado…” / “This content was limited…”).
4.7 Mexican framing (LFPDPPP, Const. Arts. 6 y 7)
Position product as expression + petition + accountability, not a legal filing service. Honour data minimisation (LFPDPPP), lawful processing of claimant identity under internal policy docs, DPIA-lite for sensitive categories.

5. Escalation mechanics
5.1 Threshold model (starting numbers — tune per pilot)
Maintain threshold_stage int + threshold_reached_at timestamps.

Assume Metro CDMX pilot (large population → use velocity + verified share, not % of municipality population in MVP formulas).

Per target_kind multipliers (municipality easiest to scale public pressure):

Stage	Meaning	Municipality (MVP)	Brand	Public figure
1
Private notify target inbox + Resend email
50 verified co-signs or 30 co-signs with 20/week velocity
defer
defer
2
Publish “awaiting reply” dossier excerpt + OG share
200
defer
defer
3
Press/community packet (PDF dossier unlocked)
600
defer
defer
4
Eligible Conscious Fund candidate + Pulse conversion offer
2000 unique co-sign accounts + moderator approval
same gate + brand committee
gated + lawyer flag
Population-normalised thresholds are Phase 2 (conscious_locations.metadata.pop_estimate hook).

5.2 Auto-Pulse proposal
Hitting stage 4 or manual admin triggers:

Prefill Pulse (prediction_markets + is_pulse=true) draft using agent summary (lib/agents/content-creator.ts already consumes market context similar to Pulse proposals).
Reuse /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/predictions/admin/create-market/route.ts patterns (never bypass admin approval in MVP).
5.3 Conscious Fund bridge
Promotion path analogous to Conscious Inbox:

Approved Signal → provisional fund_causes inactive row (+ link column citizen_signal_id) → activates after finance review.
Reuse webhook/finance patterns from Stripe where donations attach (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/webhooks/stripe/handlers/).
5.4 Outbound channels
Resend — /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/resend.ts new template functions grouped like existing transactional helpers.
PDF dossier — jspdf + optional jspdf-autotable (already deps in package.json) server-side route app/api/denuncias/[slug]/dossier/pdf/route.ts (mirror sponsor PDF /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/dashboard/sponsor/[token]/report/[marketId]/pdf/route.ts structure).
OG — new app/api/og/denuncia/[slug]/route.tsx following /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/og/market/[id]/route.tsx.
6. Data model (Supabase)
After migrations: regenerate types (types/database.ts is known stale per audit — use Supabase codegen and commit).

6.1 Core tables
citizen_signals (user-facing slug “denuncias” in URL acceptable; DB name neutral)

Suggested columns:

IDs: id uuid pk, public_slug text unique, canonical_duplicate_of uuid null fk
Classification: post_type complaint|suggestion|recognition, category text, severity text
Targets: target_kind, target_id uuid null, target_display_name, target_metadata jsonb (free identifiers pre-registry)
Content: title, body, language text check('es','en','both') + generated EN/ES stubs optional
Location: conscious_location_id uuid fk, latitude, longitude, location_precision enum('exact','neighborhood','municipality_only')
Authorship: author_user_id uuid, anonymous_display_name, anonymous_mode bool
State: publication_status enum('draft','pending_review','needs_edit','published','rejected','archived','disputed')
Thresholds: threshold_stage smallint, threshold_state jsonb (record per stage crossing)
Conversions: converted_pulse_market_id uuid, converted_fund_cause_id uuid
Counters denormalised: cosign_count, comment_count, view_count
Moderation embedding: ai_scores jsonb, moderator_notes internal
Timestamps + edited_at
Indexes: (publication_status, created_at), (conscious_location_id, category), gin on target_display_name gin_trgm if pg_trgm enabled, slug unique.

RLS sketches:

Public SELECT: publication_status = 'published' and not disputed hard-hidden fields via view citizen_signals_public (recommended) stripping internal columns.
Author: full row on own.
Admin: bypass via existing admin client pattern /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/supabase-admin.ts.
citizen_signal_evidence

id, signal_id fk, kind enum('image','pdf','link','official_doc'), storage_path or url, caption, submitted_at, visibility enum('public','moderators_only')

Bucket: new migration like /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/supabase/migrations/218_blog_images_bucket.sql pattern for citizen-signals-evidence.

citizen_signal_cosigns

Unique (signal_id, user_id) + optional reason text; weight numeric default 1; created_at; index on (signal_id, created_at desc).

citizen_signal_comments

Threaded moderate-able; FK signal_id, parent_id.

citizen_targets (canonical registry)

slug, kind, FK optional to conscious_locations, verification_status, official_contact_email_hmac, linkage to Stripe customer optional later.

Claim flow merges duplicate free-text submissions.

citizen_signal_responses

Official replies: target_id, signal_id, author_role, body, attachments, published_at.

citizen_signal_moderation_events

id, signal_id, admin_user_id, action enum, detail jsonb, created_at — immutable.

citizen_signal_subscriptions (email + in-app tie to notifications row inserts)

Similar insert pattern elsewhere for notifications pipeline.

Optional bridge: citizen_signal_inbox_mirror copying into conscious_inbox initially for MVP speed — discouraged long-term; prefer dedicated tables except for single admin UI experiment.

7. API surface (Next.js)
Base: /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/denuncias/*.

Route	Methods	Auth	Rate limit (lib/rate-limit.ts)	Zod
/api/denuncias
GET feed (cursor), POST create
POST: user
GET lenient, POST moderate
Yes
/api/denuncias/[id]
GET detail
Mixed public fields
Lenient standard
Params
/api/denuncias/[id]/cosign
POST DELETE
POST: user
Standard
Yes
/api/denuncias/[id]/comments
GET POST
POST: user
Standard
Yes
/api/denuncias/[id]/subscription
POST DELETE
User
Moderate
Yes
/api/denuncias/upload presigned-style
POST
User
Moderate
Yes
Admin: /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/admin/denuncias/* with profiles.user_type === 'admin' or harmonised policy (mirror inconsistency flagged in audit: align with /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/predictions/admin/markets/[id]/route.ts OR email gate).

Cron-protected internals: /api/cron/denuncia-threshold-check, etc., Bearer secret like /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/cron/pulse-auto-resolve/route.ts.

8. UI / components & routes
Routes:

/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/denuncias/page.tsx
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/denuncias/[slug]/page.tsx
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/denuncias/nueva/page.tsx (+ wizard client)
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/denuncias/objetivo/[targetSlug]/page.tsx
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(public)/dashboard/target/[token]/page.tsx (parallel file tree to sponsor)
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/admin/denuncias/page.tsx
Layouts: app/denuncias/layout.tsx clone of /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/pulse/layout.tsx (LandingNav).

Reuse:

Card density: /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/components/pulse/PulseListingView.tsx, /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/components/MarketCard.tsx patterns.
Map: /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/components/locations/LocationsMap.tsx.
Sponsor shell reference: /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/components/sponsor/SponsorDashboardClient.tsx for target dashboard scaffolding.
Language: /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/components/LanguageSwitcherSimple.tsx + new /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/i18n/citizen-signals.ts.
CSS: Prefer dark layout wrapper consistent with pulses; audit globals.css forced light mode.

9. Notifications, jobs, agents
9.1 Resend (extend /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/resend.ts)
Templates:

filer-received, filer-published, filer-edit-request,
moderator daily digest,
co-sign milestones (respect frequency caps),
target-notify-private, target-stage-urgent,
target-replied, disputed/takedown,
subscriber updates.
9.2 Crons (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/vercel.json pattern)
Register alongside existing crons (pulse-auto-resolve, etc.):

Job	Cadence suggestion	Behaviour
denuncia-threshold-check
Every 15 min
evaluate stage transitions
denuncia-target-followup
Daily
nudge unresolved stage-1+ targets
denuncia-weekly-digest
Weekly Mon
curated Resend newsletter segment
Each job: cronHealthCheck from /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/cron-health.ts symmetry.

9.3 Agent module
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/agents/denuncias-signal-ingest.ts — call logAgentRun requirement from /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/CLAUDE.md.

10. Metrics, analytics, success criteria
Product metrics tables or reuse share_events-style instrumentation (supabase/migrations/197_share_events.sql precedent).

Suggested KPI dimensions:

Citizens: filings / 1k MAU; co-signs per Signal; funnel draft→publish; appeals count.

Admin: SLA hours per stage (pending→publish moderate); merges per hundred.

Targets: acknowledgement rate (<48h for stage 1); resolution time.

Flywheel: pct Signals → Pulses (converted_pulse_market_id not null); pct → fund_causes.

Launch (30 days pilot):

Publish >= 25 Signals in CDMX test geography.
= 55% moderated within 72h.

= 40% Signals reach stage 1 co-sign halfway.

0 unresolved major legal escalation (definition in ops playbook).
11. Rollout plan and risks
MVP (smallest slice)
Complaint + suggestion; municipalities + institutions only; bilingual via LanguageContext + ES-first copy parity; geography CDMX wedge; moderation human-in-loop for every publication; thresholds stages 1–2 only before national scale.

Phase 2: brands + richer thresholds + dossier/public figure rules + automated Pulse drafts.

Phase 3: Paid amplification tiers (Stripe SKU) + federation with sponsor analytics.

Top 10 risks + mitigations
Legal / defamation — layered moderation + insurance review + disclaimers
Moderation burnout — caps + SLA tooling + volunteer triage playbook
Low velocity frozen feed — seeded municipal partnerships + influencer Pulses bridging
Political capture accusations — transparency reports + multisig escalation
Brand backlash lawsuits — contractual ToS carve-outs + escrow legal review channel
Brigading — rate limiting + anomaly detection jobs
Privacy leaks — moderation-only evidence + blurred geospatial
Fake official replies — target token onboarding + SPF/DKIM posture + badge verification
Tech debt amplification — codegen types + incremental PR list (below)
Mission drift vs Pulses — copy discipline + dashboards separating metrics
12. Concrete next steps (first PR sequence)
Aligned with audit “Now”: avoid adding more any casts — types first.

Documentation PR — add this file path docs/DENUNCIAS-DESIGN-2026.md; link from /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/docs/INDEX.md if maintained.
Migration PR (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/supabase/migrations/219_citizen_signals.sql) creating tables listed in §6, RLS, storage bucket, indexes; follow style of migrations 216/218; then regenerate Database TS types (types/database.ts) using Supabase CLI.
API skeleton PR — app/api/denuncias/route.ts, ...[id]/cosign/route.ts with zod schemas + mirrors moderateRateLimit from /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/inbox/nominate/route.ts.
Public MVP UI PR — app/denuncias/layout.tsx, page.tsx, nueva/page.tsx; copy module /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/i18n/citizen-signals.ts.
Admin triage UI PR — app/admin/denuncias/page.tsx patterned after inbox client.
Agent scaffold PR — lib/agents/denuncias-moderator.ts + enqueue on POST create (async invoke).
Notification wiring — inserts into existing notifications table + helper in lib/resend.ts.
SEO & nav hook — add link in /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/components/landing/LandingNav.tsx after launch gate (similar Pulse emphasis treatment).
Cron stubs — vercel.json entries + boilerplate cron routes guarded by Bearer secret mirroring pulse-auto-resolve route.
Parallel cleanup (optional coupling) — remove dead (public)/markets page flagged in audit to keep IA clean before marketing push.