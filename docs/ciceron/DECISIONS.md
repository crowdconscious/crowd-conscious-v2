# Cicerón — decisions log

Format: dated entry, context, decision, consequences.  
Pending items need Francisco before (or as) the named prompt starts.

---

## Decided (implied by rules / Prompt 0 reconnaissance)

### 2026-11-10 — Hosted demo inside Crowd Conscious at `/ciceron`
- **Context:** Extract later; need a shareable demo now.
- **Decision:** Ship as an isolated module on this repo, route `/ciceron`, until client approval.
- **Consequences:** Isolation rule is mandatory; extraction doc comes in Prompt 10.

### 2026-11-10 — Module layout mirrors Observatorio isolation, not its datastore
- **Context:** Observatorio lives at `app/observatorio-rentas` + `lib/observatorio-rentas` with its own layout/shell/CSS and noindex; data is static JSON (no Supabase).
- **Decision:** Reuse route/shell/CSS/noindex pattern (`app/ciceron` + `lib/ciceron`). Use Postgres `ciceron` schema for data (required by rules).
- **Consequences:** Shared changes limited to robots, vercel cron, Supabase schema exposure, env vars.

### 2026-11-10 — One Postgres database, dedicated `ciceron` schema
- **Context:** Rules: one DB, no Redis/graph/second store for Cicerón data; vectors via pgvector.
- **Decision:** All firm/corpus tables under schema `ciceron`; migrations beside existing `supabase/migrations/`.
- **Consequences:** Must enable `vector` (currently available but not installed on `ottixfzdytnzxquzrrcf`); test on a Supabase branch before production.

### 2026-11-10 — Tenancy and oversight enforced in SQL
- **Context:** Rules 3–4, 7.
- **Decision:** `firm_id` + RLS; matter membership; Tier 2 delivery/deadline confirmation enforced by DB triggers; append-only `audit_events`.
- **Consequences:** Prompt 1 tests must prove cross-tenant denial even via search RPCs.

### 2026-11-10 — Verified citations; no model memory answers
- **Context:** Rules 5 and 8.
- **Decision:** Deterministic verifier; untrusted text in delimited blocks; refuse when corpus empty.
- **Consequences:** Investigación UI is a research desk, not an open chatbot.

### 2026-11-10 — Single AI gateway; every call recorded
- **Context:** Rule 6; repo already uses Anthropic via `lib/agents/config.ts` for agents and the synthetic panel.
- **Decision:** `[MODEL_PROVIDER] = Anthropic`. New module `lib/ciceron/gateway` is the only call site; reuse `getAnthropicClient` + `MODELS`; log to `ciceron.ai_runs`.
- **Consequences:** No direct `@anthropic-ai/sdk` imports under Cicerón outside the gateway. Model tiers: Haiku (`MODELS.FAST`) for classify/match; Sonnet (`MODELS.CREATIVE`) for answers/drafts.

### 2026-11-10 — Court files: connector interface only
- **Context:** Rule 9; federal judiciary notice against unauthorised external access.
- **Decision:** No automated judiciary login, credential storage, captcha solving, or scheduled case-page scraping. Sample + manual capture only; public lookup stub off by default.
- **Consequences:** Prompt 6 must not be rewritten for automation without counsel review.

### 2026-11-10 — Demo honesty
- **Context:** Rule 10.
- **Decision:** Real DOF data; fictional firm/clients/cases labelled «Datos de demostración»; no real client documents.
- **Consequences:** Seed and UI copy must keep the label visible.

### 2026-11-10 — No on-premise packaging
- **Context:** Rule 11.
- **Decision:** Vercel + Supabase only; no customer Docker/self-hosted model stack.
- **Consequences:** Extraction targets another cloud project, not appliances.

### 2026-11-10 — Cron mechanism = Vercel Cron
- **Context:** Repo already secures cron routes with Bearer secret; `pg_cron` not installed; rules forbid a new queue service.
- **Decision:** DOF runs via `/api/ciceron/cron/dof` scheduled in `vercel.json` (UTC mapped to America/Mexico_City).
- **Consequences:** Batching required within function `maxDuration`.

### 2026-11-10 — Demo access = invite codes (recommended)
- **Context:** Need prospect access without civic product chrome; Observatorio passcode is client-only theatre.
- **Decision:** Recommend hashed invite codes minting a demo session as a seed user of «Despacho Demo, S.C.» (Prompt 9). Not Crowd Conscious Google login for prospects.
- **Consequences:** Pending Francisco confirmation (see Pending).

### 2026-11-10 — Public repository hygiene
- **Context:** Repo is public.
- **Decision:** Docs and code contain no secrets, security exploit details, or real client data.
- **Consequences:** Env examples use placeholders only; judiciary connectors stay stubs.

### 2026-11-10 — Migrations tested on Supabase branch before production
- **Context:** Production project `ottixfzdytnzxquzrrcf`; only default branch exists today.
- **Decision:** Create/use a Supabase preview branch for `ciceron` schema + pgvector; no production apply until branch checks pass. Prompt 0 ran **no** DB mutations.
- **Consequences:** Francisco (or ops) must create the branch when Prompt 1 starts.

---

## Pending

### P1 — Embedding model `[EMBEDDING_MODEL]`
- **Why:** Anthropic has no embeddings; Vercel/repo have no OpenAI, Voyage, or AI Gateway keys today.
- **Options:** (a) Voyage `voyage-3-lite` @ 512 — recommend; (b) OpenAI `text-embedding-3-small` @ 1536 or reduced dims; (c) Vercel AI Gateway fronting one of the above.
- **Tradeoff one-liner:** Voyage pairs with the Anthropic stack but adds a vendor; OpenAI is ubiquitous/cheap but a second cloud; Gateway unifies billing but is not set up here.
- **Needed by:** Prompt 1 (column dims) / Prompt 3 (embed pipeline).

### P2 — Enable `vector` (pgvector) on branch then production
- **Why:** Extension available (`0.8.0`) but **not installed** (`installed_version` null).
- **Needed by:** Prompt 1.

### P3 — Expose schema `ciceron` to PostgREST
- **Why:** JS clients today are `public`-only; `.schema('ciceron')` needs dashboard config (or RPC fallback).
- **Needed by:** Prompt 1.

### P4 — Cron secret strategy
- **Options:** dedicated `CICERON_CRON_SECRET` (recommended) vs reuse `CRON_SECRET`.
- **Needed by:** Prompt 3.

### P5 — Confirm invite-code demo auth
- **Options:** invite codes (recommended) vs allow-listed Crowd Conscious Auth.
- **Needed by:** Prompt 2 (gate UI) / Prompt 9 (full system).

### P6 — Font pairing for Prompt 2
- **Proposal A (implement first if approved):** Source Serif 4 (headings/legal) + IBM Plex Sans (UI), tabular figures via Plex.
- **Proposal B:** Newsreader + Source Sans 3.
- **Needed by:** Prompt 2.

### P7 — Accept root-layout analytics/JSON-LD leakage for hosted demo
- **Why:** Next root layout wraps all segments; Observatorio already accepts this.
- **Needed by:** Prompt 2 acceptance (“no civic script”) — clarify whether Vercel Analytics counts as disallowed chrome.

### P8 — Counsel clearance for any future public case-file lookup
- **Why:** Rule 9; judiciary portal notice.
- **Needed by:** before enabling `PublicLookupConnector` (defaults off forever until cleared).
