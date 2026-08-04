# BUILD SESSION PROMPTS — Master Strategy v3.1

> Internal planning doc (English). Derived from `@CC_BUILD_CONTEXT.md`.
> Each session below is **copy-pasteable**: paste the whole block (plus
> `@CC_BUILD_CONTEXT.md`) into a fresh Cursor session. Build exactly the
> scoped step, nothing beyond. `@CC_BUILD_CONTEXT.md` remains the source of
> truth for WHAT and the never-break rules; this file sequences WHEN and
> pins the REAL paths (resolved from the codebase, replacing the doc's
> `[ASK ME]` placeholders).
>
> **Launch-critical path:** Workstream B (Pulse Simulation) for the Sep 15
> public reveal. If any session collides with B's calibration schedule,
> the other workstream slips — B wins every collision.

---

## 0. Resolved [ASK ME] answers (pin these)

These are the real values. Sessions below use them directly; do not re-ask.

| # | [ASK ME] item | Resolved answer |
|---|---|---|
| 1 | Canonical migrations folder + next number | `supabase/migrations/` (ONLY canonical). No `db/migrations/` exists. Highest sequential = **251** (`251_pulse_close_enforcement_and_confidence_resolution.sql`). **Next free = 252.** `sql-migrations/` is an ad-hoc archive of `.md`/`.sql` notes — NOT canonical, do not add there. Do NOT hardcode the sim-table numbers — verify next free at session start with `ls supabase/migrations | sort | tail`. As of Aug 2026 that is **252/253/254** (repo at 251); older doc text mentioning 246–248 is stale — those are taken (246 signals_auto_publish, 247 in_app_notifications, 248 signals_expanded_targets). Renumber if anything ships before B1 runs. |
| 2 | Blog posts table (Conversa FK) + body/sources/metadata | Table **`blog_posts`** (`supabase/migrations/168_blog_posts.sql`). Body = `content` / `content_en` (Markdown text). Metadata = `meta_title`, `meta_description`, `excerpt`, `tags[]`, `category`, `related_market_ids uuid[]`, `related_pulse_id`. **No dedicated `sources` column** — see NEEDS OWNER INPUT. FK becomes `references public.blog_posts(id)` (not `posts(id)`). |
| 3 | Real señales table + creation fn + anon rules | Table **`citizen_signals`** (`supabase/migrations/219_citizen_signals_mvp.sql`; public view `citizen_signals_public`). Creation = **`POST /api/signals`** (`app/api/signals/route.ts`) → service-role insert. **Publishing REQUIRES an account** (`getCurrentUserFromRequest` → 401 if absent; `author_user_id NOT NULL`). Anonymous users can only **support** an existing signal via `POST /api/signals/[slug]/anonymous-support` (device fingerprint, no auth). `anonymous_display_mode` is display-only. Feature flag = **`SIGNALS_ENABLED`**. |
| 4 | Web anonymous-identity / device_id module | **`lib/guest-vote-storage.ts`** → `getOrCreateGuestId()` mints/reads a UUID from `localStorage['cc_guest_id']`. Nudge counter in **`lib/anon-vote-tracker.ts`**. Server anon vote: `POST /api/votes/anonymous` → RPC **`execute_anonymous_market_vote(p_guest_id, p_market_id, p_outcome_id, p_confidence)`**, rows land in `market_votes` with `user_id` = guest UUID. ⚠️ There is NO server-side persistent `device_id` on web (unlike mobile SecureStore) — it's a localStorage UUID. New features should reuse `getOrCreateGuestId()` as the web `device_id`. |
| 5 | Photo-upload pipeline module | **`POST /api/signals/upload`** (`app/api/signals/upload/route.ts`): auth required, multipart `file`, images-only (jpeg/png/webp/heic/heif, 10 MB), writes to private Storage bucket **`citizen-signals-evidence`** via `createSignalsAdminClient()` (`lib/signals/supabase.ts`), returns `{ storage_path }`. Bucket defined in migration 219. Reuse this for Señal Express photos. |
| 6 | PDF generation module | **jsPDF is already a dependency** — do NOT add pdf-lib. Existing builders: `lib/sponsor-pulse-report-pdf.ts` (`generateSponsorPulseReportPDF`, A4 via `jspdf` + `jspdf-autotable`) and `lib/generate-professional-esg-pdf.ts`. Neither is a generic oficio builder; write a new `lib/senal-express/oficio-pdf.ts` **using jsPDF** (same stack), don't fork pricing/branding logic. |
| 7 | Share-card renderer path | Server renderers = `app/api/og/*/route.tsx` (Next `ImageResponse`/Satori): `market`, `signal`, `blog`, `location`, `creator`, `cause`. Señal card already exists: **`app/api/og/signal/[slug]/route.tsx`**. Client share/download helpers = **`lib/share-utils.ts`** (`downloadCard`, `shareStoryImage`, `shareNative`, `trackShare`). Reuse these; build no new renderer. |
| 8 | CEO Digest assembly location | **`lib/agents/ceo-digest.ts`** — single Claude call returns a structured JSON dashboard (`key_metrics[]`, `do_this_week[]`, `watch`, `sponsor_outreach`) rendered to HTML email. New sections (Confusion Signal, cost lines, calibration summaries) get APPENDED here. Shared agent utils in `lib/agents/config.ts` (`MODELS`, `logAgentRun`, `parseAgentJSON`). |
| 9 | Location on señales and votes | **Señales:** `citizen_signals.conscious_location_id` (alcaldía bucket, FK `conscious_locations`), `partner_location_id`, free-text `street_reference`, and reserved `precise_latitude`/`precise_longitude` (moderator-only, NOT in public view). Observation mode adds `country_code`/`city_slug`/`locality`. **Votes:** `market_votes` has **NO geo column** — see NEEDS OWNER INPUT (blocks Mi Colonia `weekly_voters`-per-colonia). |
| 10 | Pulse libs / patterns confirm | `lib/pulse-vote-aggregates.ts` ✅ (`aggregatePulseVotes()` + `PulseVoteAggregates` types — canonical share/confidence math). `lib/pulse-tiers.ts` ✅ (`PULSE_TIERS`, `PulseTierId`, `normalizePulseTierId`, `calculatePulseFundAllocationRounded`). ⚠️ **`lib/display/participation.ts` does NOT exist yet** — Workstream A2 creates it (doc §1.4 treats it as existing). Agent panel: `app/(predictions)/predictions/admin/agents/page.tsx` (client `AGENTS[]` array + `Runner` components; API `app/api/predictions/admin/agents/route.ts`). Cron close-hook: `app/api/cron/pulse-auto-resolve/route.ts` (RPC `resolve_pulse_market_by_plurality`). |

### Items still NEEDS OWNER INPUT (record in Session 0; don't guess)

| Item | What's missing / why |
|---|---|
| **Blog `sources` for Conversa** | `blog_posts` has no `sources` column. Conversa's system prompt needs `{{sources_block}}`. Owner must decide: add a `sources jsonb` column (new migration) OR derive from `related_market_ids` + inline Markdown links. Also `conversa_enabled` + `suggested_questions` columns must be added to `blog_posts` (§6.1). |
| **`data/persona-targets.cdmx-v1.json`** | Owner-provided INEGI/ENIGH/AMAI target cells. `scripts/generate-personas.ts` (§5.3) cannot run without it. File does not exist in repo. |
| **Vote geo for Mi Colonia** | `market_votes` stores no colonia/lat-lng. Owner must define how a vote maps to a colonia (via voter profile? via linked location? not at all?) before `weekly_voters` per colonia is computable. (F is gated to October, so non-blocking now.) |
| **`ALCALDIA_META` real data** | Destinatario titles/addresses/emails are `TODO_FILL_FROM_OFFICIAL_SOURCE` placeholders. Agents must never invent them; owner supplies from official sources before oficios cite a destinatario address. |
| **Sim reveal automation trigger** | Auto-`revealed_at` only "after Sep 15 + 4 clean automated cycles" — a business gate the owner confirms; until then reveal is manual admin action. |

---

## 1. Recommended ordering & dependencies

```
Session 0 (Preflight)  ──►  everything else

Track B (LAUNCH-CRITICAL, weekend sessions):
  B1 migrations+view ─► B2 personas ─► B3 prompts ─► B4 pipeline+Batch ─► B5 divergence+tests
                                                          │
                                                          └─► B6 admin panel ─► B7 reveal UI (flag off)
  (B1 blocks B2/B4; B4+B5 must run clean end-to-end before Workstream C is unblocked)

Track A (weekday evenings, mostly independent):
  A2 (lib/display/participation.ts) is a prerequisite for A4/A6 copy.
  A5 close-push edits the SAME pulse-auto-resolve route as B4 step 3 → don't run A5 and B4 in the same session.

Track D (Señal Express, independent growth track):
  D0 geodata (lib/geo/cdmx.ts) ─► D1 table+draft API ─► D2 confirm API (PDF + signal create) ─► D3 /queja UI
  (D2 needs: PDF module #6, señal-creation #3, photo-upload #5 — all resolved.)

Track G (any quiet evening, independent):
  G1 news-monitor dashboard retire ─► G2 inbox-curator fold into digest ─► G3 prune orphans

Gated (do NOT start): C (after B pipeline clean), E (≥ Sep 7), F (October + density gate).
```

**Blocks-what quick list**
- B1 migrations **block** B2 (personas need tables) and B4 (pipeline writes runs/votes).
- B4 + B5 running clean end-to-end **unblock** Workstream C.
- A2 (`participation.ts`) **blocks** A4/A6/A7 threshold copy.
- A5 and B4-step-3 **both edit** `pulse-auto-resolve/route.ts` → serialize them.
- D0 geodata **blocks** D1–D3; D2 **needs** resolved PDF + señal-creation + photo-upload.
- G can run any quiet evening; nothing depends on it for launch.

**First 3 sessions to run:** `Session 0` → `B1` → `A2` (A2 is small, unblocks A copy, and doesn't touch B's schedule).

---

## 2. Definition of Done (applies to EVERY session — §10)

1. `node_modules/.bin/tsc --noEmit` clean.
2. Migrations applied on a branch DB; `types/database.ts` regenerated.
3. RLS verified: direct anon/authed queries on new tables return zero rows; `revealed_simulation_runs` returns zero rows for unrevealed runs.
4. Env flag off → feature invisible (not broken); APIs 503 (or 404 where the existing pattern uses 404, e.g. `/api/signals`).
5. Analytics events fire with exact specced snake_case names.
6. The workstream's ✅ acceptance items pass.
7. Nothing written to `prediction_markets`/real vote tables; no raw `simulation_*` reads from user-facing code; no sim data in any pre-reveal payload.

---

## 3. SESSION 0 — Preflight (run first, no code)

```
Session: S0 — Preflight / context pinning
Goal: Record resolved [ASK ME] answers and open owner questions so no later session re-asks.
Context: @CC_BUILD_CONTEXT.md §9 + this file §0.
Do:
- Confirm the resolved [ASK ME] table in docs/BUILD-SESSION-PROMPTS.md §0 still matches the codebase (spot-check lib/display existence).
- Determine the next free migration number at RUNTIME — run `ls supabase/migrations | sort | tail` and use whatever is next free. Do NOT assume 252–254; anything shipped since Aug 2026 shifts them (repo was at 251 → 252 next as of Aug 2026).
- Surface the NEEDS OWNER INPUT list to the owner and get answers for: blog sources/conversa columns, data/persona-targets.cdmx-v1.json, vote geo, ALCALDIA_META data, reveal-automation gate.

Owner-approved decisions (RESOLVED — do not re-ask in later sessions):
- Señal Express anonymous rule — APPROVED: PDF generation + download is free for anyone (including anonymous); creating/publishing the `citizen_signals` row requires an account (POST /api/signals → 401 for anon). The register CTA fires at publish time (moment of maximum motivation — the user is holding their own oficio). This is the intended funnel, not a compromise.
- Conversa rate limiting — DEFERRED (decide when C ungates): a localStorage guest id (`getOrCreateGuestId()`) is trivially resettable, so if Conversa LLM token cost matters, plan a server-side limit (IP + guest-id composite, or simply require auth for Conversa).
- Mi Colonia colonia mapping — DEFERRED (October): `market_votes` has no geo. Direction: capture colonia at vote time via a one-tap colonia picker on first vote, rather than deriving from (sparse) profiles.

Touches: docs only (this file). No feature code, no migrations.
Acceptance: owner has answered (or explicitly deferred) each NEEDS OWNER INPUT item; migration numbering determined at RUNTIME (not hardcoded).
Reminder (DoD §10 + guardrails): read-only session; nothing written to prediction_markets.
build exactly this, nothing beyond.
```

---

## 4. TRACK B — PULSE SIMULATION 🟢 (launch-critical, weekend A–D)

> Hard guardrails for ALL B sessions: **NEVER write to `prediction_markets` or real vote tables** (sim reads markets read-only); **no sim data in any pre-reveal payload** (enforce in the data/loader layer, not just UI); simulated data lives only in `simulation_*` tables and is read by user-facing code ONLY through the `revealed_simulation_runs` view; every user surface checks `SIM_REVEAL_ENABLED` (false until Sep 15). Reuse `lib/pulse-vote-aggregates.ts` math exactly.

### B1 — Simulation data model + reveal view
```
Session: B1 — Simulation migrations + RLS + revealed view
Goal: Create the three simulation tables and the public reveal view, RLS-locked.
Context: build @CC_BUILD_CONTEXT.md §5.1 + §5.2 only.
FIRST: determine the next free migration numbers at RUNTIME — run `ls supabase/migrations | sort | tail` and use whatever is next free (three consecutive numbers). Do NOT assume 252–254; anything shipped since Aug 2026 shifts them. As of Aug 2026 the repo is at 251, so the next free are 252/253/254 — verify before writing filenames.
Touches (rename to the verified next-free numbers if anything shipped since):
- supabase/migrations/<next>_simulation_personas.sql   (252 as of Aug 2026)
- supabase/migrations/<next+1>_simulation_runs.sql      (253 as of Aug 2026)
- supabase/migrations/<next+2>_simulation_votes.sql     (254 as of Aug 2026)
- (view revealed_simulation_runs can live in the runs migration or a following <next+3>_* file)
- types/database.ts (regenerate)
Use the verbatim SQL in §5.1 but with the verified next-free migration numbers. market_id references prediction_markets(id) READ-ONLY (never written back).
RLS: enable on all three, NO public policies, service-role write only. Grant SELECT to anon ONLY on revealed_simulation_runs.
Acceptance ✅: RLS verified — anon/authed direct queries on the three tables return zero rows; revealed_simulation_runs returns zero rows while revealed_at is null.
Acceptance ✅ (moat / DB-layer guarantee): Verify RLS on the three simulation_* tables AND that the `revealed_simulation_runs` view exposes ONLY runs with `revealed_at` set — synthetic votes must be unreadable by clients (anon/authed) until reveal. This ground-truth guarantee is enforced at the DATABASE layer from migration one, never by application discipline. Verification: as anon and as a normal authed user, direct selects on simulation_personas/simulation_runs/simulation_votes return zero rows; `select * from revealed_simulation_runs` returns zero rows while no run has revealed_at.
Reminder (DoD §10): tsc clean; types regenerated; nothing written to prediction_markets.
build exactly this, nothing beyond.
```

### B2 — Persona targets + generator
```
Session: B2 — Persona library generator (cdmx-v1)
Goal: Generate 150 grounded CDMX personas (100 Cuauhtémoc, 50 Miguel Hidalgo) into simulation_personas.
Context: build @CC_BUILD_CONTEXT.md §5.3 only.
Prereq: B1 applied; data/persona-targets.cdmx-v1.json provided by owner (NEEDS OWNER INPUT — do not invent).
Touches:
- scripts/generate-personas.ts (tsx)
- data/persona-targets.cdmx-v1.json (owner-provided input; do not fabricate)
Per cell call claude-sonnet-4-6 (model id from lib/agents/config MODELS / env, never hardcoded twice) → strict JSON with ALL schema fields; persona_narrative = 2–3 sentences of concrete Mexican-Spanish daily life; BANNED generic adjectives; validate vs cell constraints; one retry; output JSON + SQL inserts; print distribution report (deltas <5% per marginal); support --from-json re-emit.
Acceptance ✅: distribution report shows <5% delta per marginal; version 'cdmx-v1' never mutated.
Reminder (DoD §10): tsc clean; personas are synthetic (amber), never counted as real.
build exactly this, nothing beyond.
```

### B3 — Prompts module
```
Session: B3 — Simulation prompts module
Goal: Author the agent + synthesis prompts and strict-JSON parser.
Context: build @CC_BUILD_CONTEXT.md §5.4 only.
Touches:
- lib/simulation/prompts.ts (PROMPT_VERSION = 'sim-prompt-v1')
Include verbatim agent system prompt, per-run user prompt (ONLY what a real voter sees — no injected news/context), temperature 1.0, parseAgentVote() strict-JSON validator (option must exactly match a provided option; one retry then mark failed), and the Sonnet synthesis prompt returning {resumen_es, resumen_en, divergencias_clave[3], hipotesis_divergencia, cita_sim_representativa, angulo_contenido}. Plus brand-pretest phrasing note.
Acceptance ✅: parseAgentVote rejects non-matching options and malformed JSON; prompt module exports PROMPT_VERSION.
Reminder (DoD §10 + guardrails): the agent user prompt must contain no context beyond what a real voter sees; no sim leakage.
build exactly this, nothing beyond.
```

### B4 — Pipeline + Batch API + close-hook
```
Session: B4 — Simulation pipeline (Batch API) + close-hook
Goal: startRun / checkRun over the Anthropic Batch API, aggregates via canonical math, divergence-on-close hook.
Context: build @CC_BUILD_CONTEXT.md §5.5 only.
Prereq: B1 (tables) + B3 (prompts). NOTE: this edits app/api/cron/pulse-auto-resolve/route.ts — do NOT run in the same session as A5 (both edit that route).
Touches:
- lib/simulation/run.ts (startRun, checkRun; model claude-haiku-4-5 via Batch API, custom_id = persona_id)
- app/api/cron/pulse-auto-resolve/route.ts (append: compute divergence from REAL aggregates on close, store on run — read-only on markets)
- reuse lib/pulse-vote-aggregates.ts math exactly for {option_shares, avg_confidence_by_option, confidence_weighted_shares, completion_rate}
Include backtest mode (§5.5.5) and the cost tripwire (200 agents < ~$1; 10× = stop and flag).
Acceptance ✅: end-to-end backtest against a closed Pulse → completion_rate ≥ 0.95; NOTHING written to prediction_markets.
Reminder (DoD §10 + guardrails): market_id is read-only; sim writes only to simulation_* tables.
build exactly this, nothing beyond.
```

### B5 — Divergence Index + unit tests
```
Session: B5 — Divergence Index + tests
Goal: Pure divergence math with unit tests.
Context: build @CC_BUILD_CONTEXT.md §5.6 only.
Touches:
- lib/simulation/divergence.ts  → ID = 100 × (0.6 × Δshares + 0.4 × Δconfidence); returns {id, delta_shares, delta_confidence, per_option[]}
- lib/simulation/__tests__/divergence.test.ts (or repo test convention)
Acceptance ✅: identical inputs → 0; disjoint options → high; hand-computed fixture matches.
Reminder (DoD §10): tsc clean; pure functions, no I/O.
build exactly this, nothing beyond.
```

### B6 — Admin "Simulación" panel
```
Session: B6 — Admin simulation panel
Goal: Add a "Simulación" panel to the existing agents admin, same pattern as current runners.
Context: build @CC_BUILD_CONTEXT.md §5.5.4 only.
Prereq: B4.
Touches:
- app/(predictions)/predictions/admin/agents/page.tsx (extend the AGENTS[] pattern)
- app/(predictions)/predictions/admin/agents/SimulationRunner.tsx (new, mirror SponsorPulseReportRunner.tsx / ContentCreatorRunner.tsx)
- app/api/predictions/admin/agents/route.ts (or a sibling admin route) for trigger/check/reveal actions (service-role)
Panel: trigger form (market picker OR free-text pre-test), runs table, Check button, aggregates/synthesis viewer, Reveal action (sets revealed_at — MANUAL during calibration).
Acceptance ✅: admin can trigger, check, and reveal a run; reveal sets revealed_at and nothing else public.
Reminder (DoD §10 + guardrails): reveal is manual; automation only after Sep 15 + 4 clean cycles.
build exactly this, nothing beyond.
```

### B7 — Reveal UI (behind flag, false until Sep 15)
```
Session: B7 — Reveal UI + methodology page
Goal: /pulse/[id] "IA vs. Realidad" module + pre-vote teaser + /metodologia-simulacion.
Context: build @CC_BUILD_CONTEXT.md §5.7 only.
Prereq: B4/B5 clean; SIM_REVEAL_ENABLED stays false.
Touches:
- app/pulse/[id]/page.tsx (post-close module; reads ONLY revealed_simulation_runs; AMBER palette + persistent "SIMULACIÓN IA" badge)
- the /pulse loader (ensure NO sim aggregates enter the client payload until flag on AND revealed_at set AND pulse closed AND user voted)
- app/metodologia-simulacion/page.tsx (static; INEGI/AMAI method, total-separation, stereotype-flattening note, Conversa privacy note)
- reveal push rides the A5 nullable `reveal` payload field
Acceptance ✅: with flag off, network tab shows ZERO sim fields in the payload; pre-vote teaser leaks no direction (no numbers/option names/proportions).
Reminder (DoD §10 + guardrails): enforced in the DATA layer; amber = simulated, never counted as real.
build exactly this, nothing beyond.
```

---

## 5. TRACK A — FOUNDATION & ENGAGEMENT 🟢 (weekday evenings)

### A2 — Kill negative empty states (prerequisite for A4/A6/A7)
```
Session: A2 — Centralized participation display helper
Goal: Create the "never render a zero next to a promise" helper and route raw counts through it.
Context: build @CC_BUILD_CONTEXT.md §4 A2 + §1.4 only.
Touches:
- lib/display/participation.ts (NEW — does not exist yet)
- refactor raw-count components to use it (grep for "0 votos", "$0", raw count renders)
Rules: counts<25 → "Votación abierta"; "0 votos → $0" → "Ciclo 1 en curso — la primera entrega del Fondo se anuncia en agosto."; Fund "$0 Repartido" → countdown to NEXT_PUBLIC_FUND_EVENT_DATE (default 2026-08-21); "faltan N votos" → "Score en votación". ES + EN variants.
Acceptance ✅: grep-verified no raw zero/$0 next to a promise remains.
Reminder (DoD §10): tsc clean; both es/en strings present.
build exactly this, nothing beyond.
```

### A3 — Minimal CI
```
Session: A3 — Typecheck CI workflow
Goal: Add a <3 min typecheck-only GitHub Action.
Context: build @CC_BUILD_CONTEXT.md §4 A3 only.
Touches: .github/workflows/typecheck.yml (tsc --noEmit on push + PR; nothing else).
Acceptance ✅: workflow runs tsc --noEmit and nothing else; completes < 3 min.
Reminder (DoD §10): tsc clean locally first.
build exactly this, nothing beyond.
```

### A4 — Post-vote loop (web)
```
Session: A4 — Post-vote panel + share card
Goal: After voting, show crowd split + confidence line + one-tap share.
Context: build @CC_BUILD_CONTEXT.md §4 A4 only.
Prereq: A2 (uses participation helper for the <25 threshold).
Touches:
- the /pulse vote client + components/sharing/PostVoteShare.tsx
- aggregates from lib/pulse-vote-aggregates.ts; share via lib/share-utils.ts (downloadCard / shareNative on app/api/og/market/[id])
Below 25 votes: show only the user's own position. Copy: "Tu confianza: {u}/10 · Promedio: {avg}"; share line "Yo voté {option} con {conf}/10 de confianza. ¿Y tú?".
Events: postvote_panel_view, postvote_share_tap.
Acceptance ✅: panel respects the 25-vote threshold; share uses navigator.share with clipboard fallback.
Reminder (DoD §10): reuse aggregate math exactly; both locales.
build exactly this, nothing beyond.
```

### A5 — Pulse-close push
```
Session: A5 — Pulse-close push to voters
Goal: On close, push each voter their crowd-delta; add nullable reveal payload field.
Context: build @CC_BUILD_CONTEXT.md §4 A5 only.
NOTE: edits app/api/cron/pulse-auto-resolve/route.ts — do NOT run in the same session as B4.
Touches:
- app/api/cron/pulse-auto-resolve/route.ts (hook push after resolution)
- lib/expo-push.ts + push_log de-dupe per (user, market)
Copy: "El Pulse que votaste cerró — ganó {option}. Tu lectura estuvo a {delta} puntos de la multitud." (delta = |user_conf − winning_option_avg_conf|, 1 decimal). Payload carries a nullable `reveal` field (used by B7 in September).
Acceptance ✅: one push per (user, market) via push_log; reveal field present and nullable.
Reminder (DoD §10 + guardrails): read-only on markets except the existing resolution path; no sim data in payload (reveal stays null pre-Sep-15).
build exactly this, nothing beyond.
```

### A6 — Civic streak
```
Session: A6 — Leaderboard slot → civic streak
Goal: Replace the (disabled) leaderboard slot with a consecutive-weekly-Pulse streak.
Context: build @CC_BUILD_CONTEXT.md §4 A6 only.
Prereq: A2.
Touches: the leaderboard slot component + a pure streak fn (with unit test).
LEADERBOARD_ENABLED=false. Copy: "Has votado {n} Pulses seguidos" (missed week resets); anonymous: "Vota tu primer Pulse para iniciar tu racha." (identity via getOrCreateGuestId).
Acceptance ✅: streak fn unit-tested (missed week resets); anonymous fallback copy renders.
Reminder (DoD §10): both locales; flag stays false.
build exactly this, nothing beyond.
```

### A7 — Blog CTA above the fold
```
Session: A7 — Blog top participation CTA
Goal: Compact participation module below the blog title/hero.
Context: build @CC_BUILD_CONTEXT.md §4 A7 only.
Prereq: A2.
Touches: app/blog/[slug] template + a compact CTA component.
Linked Pulse → question + "Votar ahora"; else Inbox CTA. ≤96px collapsed on a 390px viewport. Keep the bottom CTA. Event: blog_top_cta_tap.
Acceptance ✅: ≤96px collapsed at 390px; event fires.
Reminder (DoD §10): both locales.
build exactly this, nothing beyond.
```

> Mobile A1 (`src/lib/device-id.ts`) lives in the MOBILE repo — schedule there, not here.

---

## 6. TRACK D — SEÑAL EXPRESS 🟢 (the only growth tool before Sep 15)

> Guardrails for ALL D sessions: formal oficio structure; ONLY facts from sentence/location/category/photo-existence; **NEVER cite laws/reglamentos/articles**; **NEVER accuse or name individuals**; neutral non-partisan register; addresses/officials from `ALCALDIA_META` placeholders only (never invented). Every use feeds `citizen_signals`. Flag = `SENAL_EXPRESS_ENABLED` (feature off → coming-soon + 503).

### D0 — Geodata module
```
Session: D0 — CDMX geodata (lib/geo/cdmx.ts)
Goal: Build the shared geodata module (reused later by Mi Colonia).
Context: build @CC_BUILD_CONTEXT.md §2 (geodata) only.
Touches: lib/geo/cdmx.ts
Exports: resolveAlcaldia(lat,lng), resolveColonia(lat,lng) (Cuauhtémoc + Miguel Hidalgo first, list-picker fallback), ALCALDIA_META (destinatario titles; addresses/emails as TODO_FILL_FROM_OFFICIAL_SOURCE), COLONIA_ADJACENCY. Do NOT invent real addresses/emails/officials.
Acceptance ✅: resolvers return the two pilot alcaldías; placeholders clearly marked TODO_FILL_FROM_OFFICIAL_SOURCE.
Reminder (DoD §10): tsc clean; no invented civic data.
build exactly this, nothing beyond.
```

### D1 — Table + draft API
```
Session: D1 — express_oficios table + draft endpoint
Goal: Migration for express_oficios + POST /api/senal-express/draft.
Context: build @CC_BUILD_CONTEXT.md §7.1 (table + draft API + LLM rules) only.
Touches:
- supabase/migrations/255_express_oficios.sql  (use next free number after B1's 252–254; renumber if B not yet applied — verify highest = 251 + pending)
  → signal_id references citizen_signals(id) (NOT "senales"); RLS enabled, service-role writes, no public policies.
- app/api/senal-express/draft/route.ts (claude-sonnet-4-6 → strict JSON {asunto, cuerpo_parrafos[], peticion, categoria_normalizada}); rate limit 3/day per identity (getOrCreateGuestId for anon).
- types/database.ts regenerated
Acceptance ✅: coherent draft for "hay una coladera abierta en Av. Ámsterdam esquina Michoacán desde hace dos semanas"; zero legal citations + zero named individuals across 10 varied inputs.
Reminder (DoD §10 + guardrails): never cite laws or name individuals; flag off → 503.
build exactly this, nothing beyond.
```

### D2 — Confirm API (PDF + señal creation)
```
Session: D2 — Confirm endpoint (PDF + signal)
Goal: POST /api/senal-express/confirm renders the oficio PDF and creates a citizen_signal.
Context: build @CC_BUILD_CONTEXT.md §7.1 (confirm API + PDF) only.
Prereq: D1.
Touches:
- lib/senal-express/oficio-pdf.ts (NEW — use jsPDF, same stack as lib/sponsor-pulse-report-pdf.ts; do NOT add pdf-lib). Sender = the USER (typed name, or "Vecina/o de [colonia]" if anonymous); footer only "Generado con crowdconscious.app".
- app/api/senal-express/confirm/route.ts → store PDF (reuse citizen-signals-evidence bucket pattern via app/api/signals/upload or createSignalsAdminClient), then create the señal.
  ⚠️ Señal publishing REQUIRES an account (POST /api/signals → 401 if anon). For anonymous users: still return the PDF free + show a register CTA before publishing (per §7.1 "if señal publishing needs an account").
Acceptance ✅: PDF opens on iOS + Android; señal created + linked when the user is authed; anonymous gets PDF + register CTA.
Reminder (DoD §10 + guardrails): Crowd Conscious is never the complainant; nothing written to prediction_markets.
build exactly this, nothing beyond.
```

### D3 — /queja UI
```
Session: D3 — /queja SEO landing + 3-screen flow
Goal: SEO landing + photo→location→sentence flow → draft review → one confirm → share.
Context: build @CC_BUILD_CONTEXT.md §7.1 (UI) only.
Prereq: D1 + D2.
Touches:
- app/queja/page.tsx (H1 "Redacta tu queja oficial a tu alcaldía — gratis, en 60 segundos", FAQ, static-rendered, Lighthouse SEO ≥90)
- flow components (foto via POST /api/signals/upload; ubicación+pin+alcaldía via lib/geo/cdmx.ts; una frase+chips) → editable draft → ONE confirm ("Descargar PDF y publicar señal") → share sheet (PDF + señal link + WhatsApp) via lib/share-utils.ts.
Events: queja_landing_view, queja_flow_start, queja_draft_ready, queja_pdf_download, queja_senal_created.
Acceptance ✅: rate limit triggers on the 4th/day; flag off = coming-soon + 503; Lighthouse SEO ≥90 on the landing.
Reminder (DoD §10): both locales; events exact.
build exactly this, nothing beyond.
```

---

## 7. TRACK G — AGENT DASHBOARD RETIREMENT 🟢 (any quiet evening)

### G1 — News Monitor dashboard retire
```
Session: G1 — News Monitor → briefs only
Goal: Keep the news-monitor pipeline; output only into Content Creator briefs; delete/redirect its dashboard.
Context: build @CC_BUILD_CONTEXT.md §8 (News Monitor) only.
Touches: lib/agents/news-monitor.ts wiring into content-creator briefs; remove the dashboard entry from app/(predictions)/predictions/admin/agents/page.tsx AGENTS[]; redirect any orphaned route.
Acceptance ✅: tsc clean; news-monitor output flows into briefs; no standalone dashboard.
Reminder (DoD §10 + CLAUDE.md): move deleted files to .deprecated/ with README + restore note; if a cron is removed, also delete its vercel.json functions entry.
build exactly this, nothing beyond.
```

### G2 — Inbox Curator fold into digest
```
Session: G2 — Inbox Curator → CEO Digest section
Goal: Keep the inbox-curator pipeline; fold its output into the CEO Digest; delete/redirect its dashboard.
Context: build @CC_BUILD_CONTEXT.md §8 (Inbox Curator) only.
Touches: lib/agents/inbox-curator.ts + lib/agents/ceo-digest.ts (append a section); remove dashboard entry + redirect.
Acceptance ✅: CEO Digest still generates with the inbox feed folded in; no standalone inbox dashboard.
Reminder (DoD §10 + CLAUDE.md): .deprecated/ discipline; logAgentRun still called.
build exactly this, nothing beyond.
```

### G3 — Prune orphans
```
Session: G3 — Prune orphaned agent components/routes
Goal: Remove now-orphaned components/routes; keep only Simulación panel + digest status + manual triggers on the agents admin.
Context: build @CC_BUILD_CONTEXT.md §8 only.
Prereq: G1, G2 (and ideally B6 so the Simulación panel exists).
Touches: app/(predictions)/predictions/admin/agents/* + orphaned api/component files → .deprecated/.
Acceptance ✅: tsc clean; digest generates with both feeds folded in; agents admin shows only Simulación + digest status + manual triggers.
Reminder (DoD §10 + CLAUDE.md): 90-day rule; .deprecated/ README + restore steps.
build exactly this, nothing beyond.
```

---

## 8. GATED — do NOT start yet

| Workstream | Gate | When unblocked, build from |
|---|---|---|
| **C — Conversa** | 🟡 after Track B pipeline runs clean end-to-end (B4+B5) | §6. FK → `blog_posts(id)`; add `conversa_enabled` + `suggested_questions` + `sources` to `blog_posts` (resolve blog-sources owner input first). Must never touch `simulation_*`. |
| **E — Adivina el Pulso** | 🟡 earliest week of Sep 7; `ADIVINA_IA_ENABLED` false until Sep 15 | §7.2. Three-way mode reads sim ONLY via `revealed_simulation_runs`. |
| **F — Mi Colonia** | 🔴 October + runtime density gate | §7.3. Blocked on vote-geo owner input (`market_votes` has no colonia); reuses `lib/geo/cdmx.ts` from D0. |

---

## 9. Conflicts to reconcile with `CC_BUILD_CONTEXT.md`

1. **Migration numbers:** RESOLVED — CC_BUILD_CONTEXT.md §1/§5.1 now teach the runtime check (`ls supabase/migrations | sort | tail`) instead of a hardcoded constant. Sim tables take the next free numbers (252/253/254 as of Aug 2026, repo at 251); re-verify at session start and renumber if anything shipped since.
2. **`lib/display/participation.ts`:** doc §1.4 references it as an existing convention, but it **does not exist yet** — A2 creates it.
3. **Table names:** Conversa/Señal Express placeholders `posts(id)` and `senales(id)` are really **`blog_posts(id)`** and **`citizen_signals(id)`**.
4. **Blog `sources`:** no column exists; Conversa needs one (or a derivation) — owner decision.
5. **Web `device_id`:** there is no persistent server-side web device_id; it's `localStorage['cc_guest_id']` via `getOrCreateGuestId()`. Treat that as the web device_id.
6. **Señal anonymity:** publishing a señal requires an account (`POST /api/signals` 401s anon); only *support* is anonymous. Señal Express must plan the register CTA accordingly.
7. **Vote geo:** `market_votes` has no colonia/lat-lng — Mi Colonia's per-colonia `weekly_voters` is not yet computable.
```
