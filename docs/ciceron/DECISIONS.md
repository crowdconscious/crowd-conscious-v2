# Cicerón — decisions log

Format: dated entry, context, decision, consequences.  
Pending items need Francisco before (or as) the named prompt starts.

---

## Locked (Francisco, 2026-11-10)

### 2026-11-10 — Embeddings: OpenAI `text-embedding-3-small` @ 1536
- **Context:** Anthropic has no embeddings API; no embedding vendor was configured on Vercel.
- **Decision:** `[EMBEDDING_MODEL] = OpenAI text-embedding-3-small`, dimension **1536**. Key name: `OPENAI_API_KEY` (to be provisioned later).
- **Consequences:** `chunks.embedding` / `watch_profiles.embedding` are `vector(1536)`. Gateway embedding calls must **fail gracefully** when `OPENAI_API_KEY` is absent (no crash loops; clear typed error / skip with log). Do not commit secrets.

### 2026-11-10 — Demo access: invite codes (not Crowd Conscious login)
- **Context:** Prospects must enter `/ciceron` without civic Auth chrome.
- **Decision:** Invite codes mint a demo session for «Despacho Demo, S.C.» Separate from Crowd Conscious Google/password login.
- **Consequences:** Prompt 2 gate UI + Prompt 9 hashed invites. Actors are **not** `auth.users` (see persona decision below).

### 2026-11-10 — Demo personas without auth.users (prod-safe seed)
- **Context:** Production has `on_auth_user_created` → `public.handle_new_user` inserting into `public.profiles` (cascading `user_settings`). Applying retired `301_ciceron_seed` (auth.users inserts) would create Crowd Conscious profiles for six demo emails — isolation failure. 298–300 are already on prod; 301 was **not** applied.
- **Decision:**
  1. Retire `301` to `.deprecated/ciceron-seed-auth-users/`.
  2. Seed with `302_ciceron_seed_prod_safe.sql`: table `ciceron.demo_personas` (invite_code → firm + role + display_name). Same fixed UUIDs as 301 for memberships / matter_members / audit actor columns.
  3. Drop FKs from `memberships`, `matter_members`, `audit_events`, `events`, `ai_runs` → `auth.users` so persona UUIDs can live only in Cicéron.
  4. `ciceron.current_actor_id()` = `request.jwt.claim.sub` **or** GUC `ciceron.actor_id`. Helpers/`search_chunks`/events policies rebind from `auth.uid()` to `current_actor_id()`.
  5. `ciceron.set_actor(uuid)` (SECURITY DEFINER, service_role) sets transaction-local JWT claim + GUC for verify / harness — **no** real Auth users required.
  6. App invite cookie stores the invite code; server resolves persona with **service role**, then filters by `firm_id` (and pasante `matter_members`) in loaders — RLS still authoritative for authenticated JWT paths; service-role paths must mirror the same scope.
- **Consequences:** Fresh installs use 302 (never 301). Verify is `302_ciceron.verify.sql`. Rooms read schema behind the invite gate with fixture fallback. Advisor `search_path` pins land in additive `303` (do not edit applied 298–300).

### 2026-11-10 — pgvector + schema `ciceron` approved (branch then production)
- **Context:** Extension available but not installed on `ottixfzdytnzxquzrrcf`.
- **Decision:** Approved. Apply migrations on a **Supabase test branch first**, then production. Agents do not apply to production.
- **Consequences:** Migrations are self-contained (`CREATE EXTENSION vector`, `CREATE SCHEMA ciceron`, grants). Francisco applies them.

### 2026-11-10 — Cron auth reuses `CRON_SECRET`
- **Context:** Prefer reusing `CRON_SECRET` unless isolation argues otherwise.
- **Decision:** **Reuse `CRON_SECRET`** for `/api/ciceron/cron/*` (same Bearer pattern as existing crons).
- **Why not a separate secret:** Cicéron isolation is enforced by module boundaries, schema RLS, and route handlers — not by a second shared secret. One ops secret matches every other cron in this repo and avoids a second rotation path during the hosted-demo phase. On extraction to a dedicated project, introduce `CICERON_CRON_SECRET` (or a fresh `CRON_SECRET` in that project).
- **Consequences:** Prompt 3 cron route checks `Authorization: Bearer ${CRON_SECRET}`. No `CICERON_CRON_SECRET` required for the demo.

### 2026-11-10 — Fonts: Spectral + Atkinson Hyperlegible
- **Context:** Prompt 2 needs a locked pairing; specimen compared four options.
- **Decision:** **Spectral** (serif — headings and legal text) + **Atkinson Hyperlegible** (UI sans). Specimen retained at `docs/ciceron/font-specimen.html` / `docs/ciceron/specimens/`.
- **Consequences:** Prompt 2 implements this pairing via `next/font`.

### 2026-11-10 — Prompt 1 gate passed (Supabase test branch)
- **Context:** Francisco applied 298, 299, 301 on a test branch; verify checks all passed (cross-tenant, seed, pasante wall, tier-2 delivery, audit append-only, RLS on 36 tables).
- **Decision:** Prompt 1 gate **passed**. Proceed to Prompt 2.
- **Note:** `300_ciceron_storage.sql` failed on `COMMENT ON TABLE storage.buckets` (`42501`); that statement was removed. Re-apply fixed 300 for the bucket/policies when convenient.

---

## Decided earlier (rules / Prompt 0)

### 2026-11-10 — Hosted demo inside Crowd Conscious at `/ciceron`
- **Decision:** Isolated module on this repo until client approval / extraction.

### 2026-11-10 — Module layout mirrors Observatorio isolation, not its datastore
- **Decision:** `app/ciceron` + `lib/ciceron`; Postgres `ciceron` schema for data.

### 2026-11-10 — One Postgres database, dedicated `ciceron` schema
- **Decision:** All Cicéron tables under `ciceron`; vectors via pgvector.

### 2026-11-10 — Tenancy and oversight enforced in SQL
- **Decision:** `firm_id` + RLS; matter membership; Tier 2 triggers; append-only audit.

### 2026-11-10 — Verified citations; no model memory answers
- **Decision:** Deterministic verifier; delimited untrusted text; refuse when empty.

### 2026-11-10 — Single AI gateway; Anthropic for chat/completions
- **Decision:** `[MODEL_PROVIDER] = Anthropic` via `lib/ciceron/gateway` + `lib/agents/config.ts`; log `ciceron.ai_runs`.

### 2026-11-10 — Court files: connector interface only
- **Decision:** No automated judiciary access (rule 9).

### 2026-11-10 — Demo honesty
- **Decision:** Real DOF later; fictional firm/clients/cases labelled «Datos de demostración».

### 2026-11-10 — No on-premise packaging
- **Decision:** Vercel + Supabase only.

### 2026-11-10 — Cron mechanism = Vercel Cron
- **Decision:** DOF via `/api/ciceron/cron/dof` in `vercel.json` (UTC → America/Mexico_City).

### 2026-11-10 — Public repository hygiene
- **Decision:** No secrets, exploit details, or real client data in the repo.

---

### 2026-11-10 — Advisor search_path pins (303)
- **Context:** Supabase advisors flagged mutable `search_path` on `ciceron.set_updated_at`, `ciceron.audit_events_immutable`, `ciceron.storage_firm_id` from 298/300 (already applied).
- **Decision:** Additive migration `303_ciceron_function_search_path.sql` recreates those three with `SET search_path = ciceron, public`. Do not edit applied migration files.
- **Consequences:** Apply 303 after 302 on production.

### 2026-11-10 — SIDOF verified; DOF ingest live path
- **Context:** Prompt 3 requires verifying the unofficial SIDOF JSON API before building the pipeline.
- **Decision:** Primary `https://sidofqa.segob.gob.mx/dof/sidof`, fallback `https://sidof.segob.gob.mx/dof/sidof`. Paths `notas/{dd-mm-yyyy}` and `notas/nota/{codNota}` work (HTTP 200). Documented in `docs/ciceron/SOURCES.md` with fixtures under `docs/ciceron/fixtures/sidof/`. **Do not crawl dof.gob.mx note pages.**
- **Consequences:** `SidofConnector` + 6-step pipeline; raw JSON in Storage bucket `ciceron` at `dof/{date}/{code}.json` (service role).

### 2026-11-10 — Embeddings fail-soft until OPENAI_API_KEY
- **Context:** Key not provisioned on Vercel yet.
- **Decision:** Store chunks with `embedding` null and `dof_notes.ingest_status = embedding_pending`; `ai_runs` records skips (`purpose` suffix `:skipped_missing_api_key`). Later cron/backfill fills vectors. Model remains `text-embedding-3-small` @ 1536.
- **Consequences:** Classification (Prompt 4) should accept `ready` and treat `embedding_pending` as eligible for keyword matching only until back-filled.

### 2026-11-10 — Definer EXECUTE grants (304 already on prod)
- **Context:** Manual prod change `ciceron_revoke_anon_definer`.
- **Decision:** Repo file `304_ciceron_revoke_anon_definer.sql` mirrors prod. New SECURITY DEFINER functions must `REVOKE … FROM PUBLIC, anon` and grant only to `authenticated` / `service_role` as appropriate.

### 2026-11-10 — Matching vectors fail soft (Prompt 4)
- **Context:** Production DOF backfill stores chunks with `embedding` null until `OPENAI_API_KEY` exists.
- **Decision:** Candidate generation uses subject-area / authority / keyword / norm overlap always; cosine similarity is applied **only** when both note chunk and watch-profile embeddings exist. Otherwise `vector_used=false` and the reason string records that vectors were skipped.
- **Consequences:** Demo matching works on lexical+taxonomy alone; embedding back-fill later improves ranking without schema change.

### 2026-11-10 — Classification + match after ingest
- **Context:** Need a way to process already-ingested notes and to chain after cron ingest.
- **Decision:** `scripts/ciceron-dof-classify-match.ts` for backlog; cron `/api/ciceron/cron/dof` runs a small classify/match batch when ingest finishes (`?classify=1` for classify-only). Small model = Haiku; client alert draft = Sonnet via `lib/ciceron/gateway/complete`.

---

### 2026-11-11 — Embeddings via Vercel AI Gateway (Prompt 5)
- **Context:** No direct OpenAI key on the project; Francisco locked gateway routing.
- **Decision:** Embeddings use AI SDK `embed`/`embedMany` with model id `openai/text-embedding-3-small` @ **1536** (matches `chunks.embedding`). On Vercel, auth is the project OIDC token; locally set `AI_GATEWAY_API_KEY` when present. Fail-soft: chunks stay `embedding_pending`; Investigación shows a clear degraded message and continues with lexical retrieval.
- **Consequences:** `lib/ciceron/gateway/embeddings.ts` no longer calls OpenAI directly. Cron `?backfill=1` and ingest use the same path. Older decision mentioning `OPENAI_API_KEY` is superseded for Cicéron embeddings (Anthropic chat keys unchanged).

### 2026-11-11 — Investigación answer models (Prompt 5)
- **Context:** Need rewrite + grounded answer with cost logging.
- **Decision:** Query rewrite = `MODELS.FAST` (Haiku); research answer = `MODELS.CREATIVE` (`claude-sonnet-5`). Both only through `lib/ciceron/gateway/complete` → `ai_runs`. Verifier is deterministic (no model).
- **Consequences:** Tier-1 `ai_outputs` status `borrador` + `output_citations`. Budget via `firm_ai_budgets` / `CICERON_FIRM_AI_BUDGET_USD`.

### 2026-11-11 — Corpus coverage honesty (Prompt 5)
- **Context:** Scheduled DOF scrape remains OFF (#83).
- **Decision:** Coverage line lists the five ingested days (2026-11-04, 05, 06, 09, 10) plus fixtures; no implication of daily scrape.
- **Consequences:** `lib/ciceron/research/coverage.ts` is the single source for that string.

### 2026-11-11 — Dark-mode Cicerón.ai brand (hosted demo)
- **Context:** Brand board for Cicerón.ai (deep navy + mint/emerald) replaces the cream/brown Cicéron light theme on `/ciceron` only.
- **Decision:** Full dark theme via CSS variables on `.ciceron-root`. Product name in chrome is **Cicerón.ai**. Mark redrawn as SVG (maze «C» + center square); wordmark uses Outfit for the lockup only; Spectral + Atkinson stay for reading/UI. Favicon/apple-touch + `theme-color` scoped to Cicéron layout metadata. Accent gradient allowed on primary buttons and mark despite earlier «no gradients» experience note — board is authoritative for this surface.
- **Consequences:** No Crowd Conscious theme changes. Contrast targets: body ink ≥7:1 on navy; small green text uses mint `#6EE7B7`.

### 2026-11-11 — Investigación answer display (numbered cites, no raw markdown)
- **Context:** Verified answer body still contains model `[chunk:uuid]` markers and `**bold**` for the UI to present.
- **Decision:** Keep verifier/storage unchanged. UI layer (`format-answer` + `ResearchAnswerView`) maps unique chunks to `[1]…[n]`, renders safe bold/headings as React nodes (no HTML injection), numbers Evidencia cards to match, and formats «Copiar con citas» as clean text + Fuentes list. Past `research_queries` reopen via `loadPastResearchAnswer`.
- **Consequences:** Display-only; citation verification and `ai_outputs.body` remain uuid-marked.

### 2026-11-11 — Evidencia cards load real DOF metadata
- **Context:** Placeholder cards (`DOF · Pasaje · —`) appeared because (1) `chunks` join used nonexistent `document_id` (real FK is `version_id` → `document_versions` → `documents` → `dof_notes`) and (2) cited-id filter compared lowercased verifier ids to mixed-case retrieval ids.
- **Decision:** Shared `loadEvidenceSources` resolves authority/title/date/section/edition/excerpt/URL for cited chunks. Fresh answers and `loadPastResearchAnswer` both use it. Chip numbers stay per unique chunk id (repeated cites of one chunk correctly share `[1]`).
- **Consequences:** Sales-demo Evidencia shows real note metadata; no RLS change (service-role path still firm-filtered on private docs).

### 2026-11-12 — Demo actors use *_persona columns (keep auth.users FKs)
- **Context:** Confirming deadlines with demo persona UUIDs would violate `deadlines.confirmed_by → auth.users` if we wrote the persona into that column or dropped the FK.
- **Decision:** Keep all existing auth.users FKs. Add nullable companions (`confirmed_by_persona`, `proposed_by_persona`, `discarded_by_persona`, `assignee_persona`, `decided_by_persona`, `approved_by_persona`, …) referencing `ciceron.demo_personas`. Demo invite path writes the persona column and leaves the auth column NULL; real users write the auth column. Confirm/notify tier-2 gates accept either actor via `COALESCE`.
- **Consequences:** Migration 308 must not `DROP CONSTRAINT` on those FKs. App helpers in `lib/ciceron/demo/actor-write.ts`.

### 2026-11-12 — No judiciary automation (Prompt 6)
- **Context:** The federal judiciary portal states it does not recognise or authorise external services for consulting, monitoring or accessing electronic case files.
- **Decision:** Court-file data enters only through `CaseFileConnector`. `SampleConnector` and `ManualCaptureConnector` are enabled. `PublicLookupConnector` remains a stub that throws `not enabled: requires legal clearance` behind `CICERON_PUBLIC_LOOKUP_ENABLED` (default off). No logins, stored credentials/signatures, captcha handling, or scheduled scraping of case pages. CI test `network-guard.test.ts` fails if `lib/ciceron` / `app/ciceron` constructs requests to listed judiciary hosts.
- **Consequences:** Manual capture stores the lawyer-supplied original; deadlines stay `propuesto` until socio/asociado confirms (DB trigger + app gate). See also P8.

### 2026-11-12 — Microsoft 365 is simulated for the demo (Prompt 6)
- **Context:** Prospects live in Outlook; the demo must show value without Entra app registration or Graph access on a public repo.
- **Decision:** Ship a clearly labelled **simulation** inside `/ciceron` (consent screen is not Microsoft’s login and never asks for a password). No Microsoft Graph SDK, no OAuth app, no tokens, no network calls to Microsoft identity/Graph hosts (same CI network guard). Connection state is per-firm `firm_integrations.provider = microsoft365_sim` (+ cookie fallback before migrations). Archive docs are `is_sample` firm documents in the chunks pipeline; calendar and «Enviado» notify are simulated; tier 2 still required before simulated send.
- **Real build later needs:** Entra ID app registration; admin consent; publisher verification; Graph scopes matching the consent list (mail metadata, calendar, files, send-on-approval); LFPDPPP privacy notice and DPA with the firm; encrypted token storage outside this public repo; disable simulation flags.
- **Consequences:** Migrations `308` (schema) + `309` (seed). UI degrades to fixtures when tables are missing.

---

### 2026-11-12 — Prompt 7 review queue, delivery gate, audit for Prompt 9
- **Context:** Tier-2 client outputs need a lawyer review inbox, a single delivery write path, append-only audit shaped for future access-denial logging, and a learning-loop export.
- **Decision:**
  1. Migrations `312` (schema + RPCs) and `313` (demo seed). Additive; `deliveries_tier2_gate` made **stricter** (persona-aware `COALESCE(decided_by, decided_by_persona)` + four-eyes when `firm_settings.four_eyes_output_types` matches).
  2. Sole delivery insert path: `ciceron.create_delivery` (service_role SECURITY DEFINER, `set_actor`, explicit `p_confirm`). Email defaults to `is_simulated`; real egress only if recipient ∈ `email_allowlist` (default empty). Authenticated clients cannot INSERT/UPDATE/DELETE `deliveries` or `review_decisions` — RPC-only.
  3. Decisions via `decide_review` (returns jsonb; policy denials commit audit then `{ok:false,policy_id,policy_reason}` without RAISE) / `save_review_edit` / `reassign_review`. Authority trigger binds decider to `current_actor_id()`.
  4. Audit rows gain `outcome` (`allowed`|`denied`), `policy_id`, `policy_reason`, `snapshot_ref` so Prompt 9 can log denials. App helper: `recordAuditDenial`.
  5. Four-eyes: editor of a human draft cannot final-approve configured output types (seed: `client_alert`); gate uses `bool_or` across tasks for that output.
  6. Seed UUIDs use valid hex `f100…101+` (case_files keep `f100…001–008`).
- **Consequences:** UI under `/ciceron/revision`. Export: `scripts/ciceron-export-eval-candidates.ts`. Agents do not apply migrations. Verify for 312 is non-persistent (`BEGIN`/`ROLLBACK`).

---

### 2026-11-12 — Prompt 8 engagement loops and growth instrumentation
- **Context:** Need activation/habit/precision/turnaround/value/expansion indicators, typed product events, morning/weekly loops without DOF crons, and budget pause for research only.
- **Decision:**
  1. Migrations `314` (schema, RPC with property **allow-list**, indicator views with `security_invoker=true`, admin-only grants), `315` (demo seed `e200…`), and `316` (events INSERT/UPDATE/DELETE revoked from authenticated — RPC/service_role only). No Vercel cron; briefings are on-demand previews. Email only if `firm_settings.email_allowlist` non-empty (stays empty → simulated).
  2. One typed helper `recordCiceronEvent` + `docs/ciceron/EVENTS.md`; allow-listed keys + safe string codes enforced at types, Zod, and RPC.
  3. Gateway `assertGatewayBudget` before AI calls; DOF purposes exempt at 100%. Thresholds 50/80/100 with Spanish banners.
  4. Audit viewer maps `policy_id` → Spanish labels (append-only audit unchanged).
  5. `engagement_resume.label` stores a code; UI resolves Spanish copy at render.
  6. `/ciceron/admin/metricas` re-checks admin role and scopes rows to `persona.firmId`.
  7. No points, streaks, badges, or leaderboards.
- **Consequences:** `/ciceron/admin/metricas`, Hoy loops (briefing, onboarding, continue, feedback suggestion), `/ciceron/hoy/briefing`, `/ciceron/hoy/resumen-semanal`. Agents do not apply migrations.

---

### 2026-11-12 — Prompt 9 demo mode, guided story, RBAC/ABAC showcase
- **Context:** Partners need a three-minute path from a real DOF note to an approved client alert; Francisco asked for an explicit RBAC vs ABAC pair with Spanish policy denials audited.
- **Decision:**
  1. Two-pepper invites: `pepper_version=1` + `CICERON_INVITE_PEPPER` only for intentionally public codes `DESPACHO-DEMO` / `DESPACHO-PASANTE` (public by design). `pepper_version=2` + `CICERON_INVITE_PEPPER_V2` for every runtime mint (`scripts/ciceron/create-invite.ts`). Peppers never in repo; fail closed if the needed env is missing. Redeem tries configured pepper hashes until a row matches. Non-public invites are never seeded in SQL. Optional work email; opaque 64-hex demo session cookie (DB path); offline invite fallback never yields admin.
  2. Persona switcher (Socia / Asociado / Pasante) via `switch_demo_persona`.
  3. DB-enforced `evaluate_access` (RBAC role + ABAC matter / conflict wall / sensitivity / expiring grants) writes denials through `write_audit_event`. Document sensitivity/conflict are **RPC-enforced** (not documents RLS). Membership denials audit before `set_actor`. Simulated denials record the real caller via `simulated_by`.
  4. Guided story max 6 steps + finale; progress in `guided_story_progress` + `engagement_resume` / `record_product_event`.
  5. Demo freshness via `refresh_demo_dates` / `touch_session_freshness` — **no Vercel cron**.
  6. `reset_demo_firm` is **admin-only**; expires sessions in place (keeps sales history + emails); never deletes DOF corpus.
  7. Hardening migration `320` separate: revoke `set_actor` from authenticated; split `firm_onboarding` FOR ALL write policy.
- **Consequences:** Migrations `317–320`. Seed UUIDs `e3…`. Agents do not apply. Supporting pages `/ciceron/proteccion`, `/ciceron/fuentes-cobertura`; sales `/ciceron/admin/ventas`.

---


### 2026-11-12 — Matching quality / procurement lane (pre-demo Group C)
- **Context:** Tender notices polluted client regulatory matches; relevance over-fired on shared authority; watch-profile vectors unused; `legal_edges` empty; SIDOF REF stubs as titles.
- **Decision:**
  1. Document types `licitacion` / `fallo` / `contratacion_publica` (+ existing `convocatoria`) are procurement. Matching skips them unless `watch_profiles.include_procurement` (DEFAULT false). When on, Monitor DOF shows a separate «Contratación pública» section (never mixed with regulatory).
  2. `PROMPT_MATCH_V2` requires a concrete client↔note regulatory link in the reason; `match.ts` uses v2.
  3. `PROMPT_CLASSIFY_V2` adds `display_title`; store on `classifications` (+ payload) and replace weak `dof_notes.title`.
  4. Classification writes `legal_edges` for creates/amends/repeals (`creates` added to edge_type check).
  5. Scripts: `embed-watch-profiles.ts`, `backfill-classify-match.ts` (oldest→newest, US$60 hard stop unless `--confirm-over-cap`), `export-labelled-set.ts`, `score-labelled-set.ts`. Template `docs/ciceron/MATCH-REVIEW.md` filled after CTO backfill — do not invent live matches.
- **Consequences:** Migration `321`. Agents do not apply migrations or run backfill against production.

---

### 2026-11-12 — No Crowd Conscious analytics / JSON-LD on `/ciceron`
- **Context:** Pending P7 asked whether to accept root-layout Analytics, SpeedInsights, ConversionCelebration, and Organization JSON-LD leaking onto the hosted Cicéron demo.
- **Decision:** Reject leakage. `app/layout.tsx` reads `x-pathname` (set by `middleware.ts`) via `headers()` and skips Analytics, SpeedInsights, ConversionCelebration, and the Crowd Conscious `organizationJsonLd` script when the path starts with `/ciceron`.
- **Consequences:** Cicéron routes stay free of civic product telemetry and schema.org org markup. P7 closed.

---

## Pending

### P8 — Counsel clearance for any future public case-file lookup
- **Needed by:** before enabling `PublicLookupConnector` (still required; Prompt 6 keeps the stub).
