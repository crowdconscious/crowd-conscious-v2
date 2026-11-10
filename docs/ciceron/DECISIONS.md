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
- **Decision:** Hashed invite codes mint a demo session as a seed user of «Despacho Demo, S.C.» Separate from Crowd Conscious Google/password login.
- **Consequences:** Prompt 2 gate UI + Prompt 9 invite system; seed memberships use dedicated demo auth users.

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

## Pending

### P3 — Expose schema `ciceron` to PostgREST
- **Why:** JS `.schema('ciceron')` needs the schema on the API exposed list (branch + prod).
- **Needed by:** before app routes query as authenticated users (service role can still use `db.ciceron` via SQL if needed).

### P7 — Accept root-layout analytics/JSON-LD leakage for hosted demo
- **Needed by:** Prompt 2 acceptance wording.

### P8 — Counsel clearance for any future public case-file lookup
- **Needed by:** before enabling `PublicLookupConnector`.
