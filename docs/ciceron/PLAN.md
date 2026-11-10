# Cicerón — repository plan (Prompt 0)

Status: Prompt 0 approved with locked decisions; **Prompt 1 migrations ready (not applied by agents)**.
Date: 2026-11-10.
Branch: `feat/ciceron-demo`.
Supabase project (production): `ottixfzdytnzxquzrrcf` (Crowd Conscious App, us-east-2).
Francisco applies `298`→`301` on a Supabase **test branch** first, then production.

---

## 1. Reconnaissance (cited)

### 1.1 Next.js / App Router

| Finding | Evidence |
|---|---|
| Next.js **15.5.7**, React **19.1.2**, App Router | `package.json` |
| No `src/app` pages tree; routes live under repo-root `app/` | `app/` |
| Path alias `@/*` → repo root | `tsconfig.json` |
| Route groups: `(app)`, `(predictions)`, `(public)` | `app/(app)/`, `app/(predictions)/`, `app/(public)/` |
| Isolated demos also sit as top-level segments (no route group) | `app/observatorio-rentas/`, `app/organizaciones/` |
| Root layout: Geist fonts, `LanguageProvider`, Vercel Analytics + Speed Insights, ConversionCelebration, Crowd Conscious JSON-LD | `app/layout.tsx` |
| Global CSS | `src/app/globals.css` (imported from root layout) |
| Middleware: Signals CORS + pathname / timing headers; no auth gate for most routes; matcher is nearly all paths | `middleware.ts` |
| TypeScript strict | `tsconfig.json`, `CLAUDE.md` |

### 1.2 Observatorio de Rentas — isolation pattern (reuse for `/ciceron`)

Observatorio **lives in this repo** as a dedicated public segment, not elsewhere.

| Concern | Observatorio pattern | Proposed for Cicerón |
|---|---|---|
| Routes | `app/observatorio-rentas/**` | `app/ciceron/**` |
| Domain logic | `lib/observatorio-rentas/**` | `lib/ciceron/**` |
| Segment layout + own shell | `app/observatorio-rentas/layout.tsx` + `ObsShell` | `app/ciceron/layout.tsx` + `CiceronShell` |
| Scoped CSS / tokens | `_components/obs.css` under `.obs-root` | `_components/ciceron.css` under `.ciceron-root` |
| Demo honesty banner | sticky sim banner + watermark | persistent «Datos de demostración» |
| SEO | segment `robots: { index: false }` + `app/robots.ts` disallow | same for `/ciceron` |
| Extraction map | `app/observatorio-rentas/README.md` | this PLAN + later `EXTRACTION.md` |
| Data / DB | static JSON under `public/observatorio-rentas/` — **no Supabase** | Cicerón **does** need Postgres (`ciceron` schema) — diverge here |
| Shared imports | only generic map helpers (`lib/sim-viewer/*`) | only Supabase helpers + listed generic utils |

Also relevant: `/organizaciones` uses its own `OrgShell` and documents “no civic nav” in `app/organizaciones/layout.tsx`. Same isolation idea.

**Fit verdict:** reuse the Observatorio *route + shell + scoped styles + noindex* pattern. Do **not** copy its “static-only / no DB” stance — Cicerón’s rules require a dedicated schema, AI gateway, and crons.

### 1.3 Supabase

| Finding | Evidence |
|---|---|
| Server (cookie session / RLS) | `lib/supabase-server.ts` → `createClient()` via `@supabase/ssr` |
| Browser | `lib/supabase-client.ts` → `createBrowserClient` |
| Service role (bypass RLS) | `lib/supabase-admin.ts` → `createAdminClient()` |
| Auth UI | `app/(public)/login`, signup, Google; sessions via Supabase cookies | `app/(public)/login/page.tsx`, `lib/auth` |
| Migrations | numbered SQL under `supabase/migrations/` (latest ~297); legacy/archive under `sql-migrations/` | `README.md`, `docs/INDEX.md` |
| Hand-curated types | `types/database.ts` — **never wholesale regenerate** (`CLAUDE.md`) | |
| Exposed schema today | effectively **`public` only** in clients and typed `Database` | `types/database.ts`, client helpers have no `db.schema` option |
| pgvector (`vector`) | **available** (default 0.8.0) but **`installed_version: null`** — **not enabled** on production | Supabase `list_extensions` on `ottixfzdytnzxquzrrcf` |
| `pg_cron` / `pgmq` | available, **not installed** | same |
| Existing “queue” | app-level tables + Vercel Cron (e.g. `simulation_autorun_jobs`), not pgmq | `supabase/migrations/269_*.sql` |
| Full-text today | `tsvector` + GIN on some `public` tables; **no embeddings** | e.g. predictions search vector migrations |
| Agents explicitly skip embeddings | signals moderator comment: no pgvector yet | `lib/agents/signals-moderator.ts` |
| Supabase branches | only default `main` branch present | `list_branches` — **create a preview branch before applying `ciceron` migrations** |

**Do not run SQL against production in this or early prompts without Francisco’s go-ahead.** Plan: develop migrations as files → apply on a Supabase branch → then production.

### 1.4 Scheduled work

| Finding | Evidence |
|---|---|
| Source of truth | `vercel.json` `crons` + `functions.*.maxDuration` |
| Auth pattern | `Authorization: Bearer ${CRON_SECRET}` | e.g. `app/api/cron/pulse-auto-resolve/route.ts` |
| Health logging | `lib/cron-health.ts` → `cron_job_runs` + optional Sentry |
| Schedules are **UTC** (CDMX documented as CST/UTC−6 in ops docs) | `docs/AGENTS-CRON-SETUP.md` |
| Long jobs | up to 300s on selected routes; default API `maxDuration` 30s | `vercel.json` |

### 1.5 AI usage today

| Finding | Evidence |
|---|---|
| SDK | `@anthropic-ai/sdk` ^0.78.0 | `package.json` |
| Provider key | `ANTHROPIC_API_KEY` (present on Vercel production) | `lib/agents/config.ts`, Vercel env list |
| Model IDs (single source) | `MODELS.FAST` = Haiku 4.5; `MODELS.CREATIVE` = Sonnet 5 | `lib/agents/config.ts` |
| Client factory | `getAnthropicClient()` | same |
| Usage logging | `logAgentRun` → `public.agent_runs` | same; agents under `lib/agents/` |
| Synthetic panel / Contraste IA | Anthropic via same config + simulation stack | `lib/simulation/`, `pulse_ai_predictions` |
| No OpenAI / Voyage / AI Gateway packages or env keys on Vercel | `package.json`; Vercel env list (37 keys; AI-related: **only** `ANTHROPIC_API_KEY`) |
| Validation | `zod` already a dependency | `package.json` |

**[MODEL_PROVIDER] recommendation:** Anthropic, reused through a **new** Cicerón gateway (`lib/ciceron/gateway/`) that calls `getAnthropicClient` / `MODELS` from `lib/agents/config.ts` (shared utility — not Crowd Conscious domain). Cicerón must **not** call the Anthropic SDK outside that gateway, and must log to `ciceron.ai_runs` (not only `public.agent_runs`).

**[EMBEDDING_MODEL] (locked):** OpenAI `text-embedding-3-small` @ **1536** dims. Env: `OPENAI_API_KEY` (provision later). Gateway must fail gracefully when absent (`lib/ciceron/gateway/embeddings.ts`).

### 1.6 UI

| Finding | Evidence |
|---|---|
| Tailwind 3.4 + `@tailwindcss/typography` | `tailwind.config.js`, `package.json` |
| Design tokens in CSS variables + `cc.*` / `primary` / `secondary` Tailwind colours | `src/app/globals.css`, `tailwind.config.js` |
| Icons | `lucide-react` | widespread under `components/` |
| Charts | `recharts`, `chart.js` / `react-chartjs-2` | sponsor dashboards, etc. |
| Dark mode | class-based; root layout forces light by default | `tailwind.config.js`, `app/layout.tsx` |
| No shadcn as a package; local `components/ui/*` | `components/ui/` |
| Observatorio: own font (Archivo) + scoped CSS, dark demo aesthetic | `app/observatorio-rentas/layout.tsx` |

Cicerón experience rules call for a **different** visual language (serif legal text, light paper, no gradients/emoji). Own tokens under `.ciceron-root`; do not inherit Crowd Conscious teal/purple marketing look inside the shell.

### 1.7 Email, analytics, errors, flags, i18n, tests, CI

| Area | Finding | Evidence |
|---|---|---|
| Email | Resend via `lib/resend.ts` | `lib/resend.ts`, `RESEND_*` env |
| Analytics | `@vercel/analytics`, `@vercel/speed-insights` in root layout | `app/layout.tsx` |
| Errors | `@sentry/nextjs` in `instrumentation.ts` / client; inert until DSN set (DSN **not** in current Vercel env list) | `instrumentation.ts` |
| Feature flags | ad-hoc `process.env` / `NEXT_PUBLIC_*` | e.g. `lib/sim-viewer-flag.ts` |
| i18n | cookie `preferred-language`; `LanguageProvider`; `locales/es.json` + `en.json` | `contexts/LanguageContext.tsx` |
| Cicerón i18n | **es-MX only** in one copy module (rules) — do not use Crowd Conscious locale JSON | rules file |
| Tests | `node:test` + `tsx` via `scripts/run-tests.mjs` (`*.test.ts` under `lib/`, `app/`, `scripts/geo/`) | `package.json`, `scripts/run-tests.mjs` |
| CI | template at `docs/ci/ci.yml` (typecheck + tests); **not** yet under `.github/workflows/` | `docs/ci/ci.yml` |
| Rate limit helper | Upstash Redis optional (`lib/rate-limit.ts`); **no Upstash keys** in current Vercel env list | Vercel envs |

### 1.8 Global leak surface into `/ciceron`

Anything in `app/layout.tsx` wraps **every** segment, including Observatorio and a future `/ciceron`:

1. **Geist font CSS variables** on `<body>` — tolerable if Cicerón sets its own `next/font` variables and scopes typography.
2. **`LanguageProvider`** — bilingual civic context; Cicerón must not surface the language switcher or rely on `locales/*.json`.
3. **`ConversionCelebration`** — Pulse anon-conversion banner; should no-op without cookie, but is still mounted.
4. **Vercel Analytics + Speed Insights** — will record `/ciceron` page views unless we later split layouts (Next.js cannot easily drop root providers per segment without a root refactor).
5. **Organization JSON-LD** (Crowd Conscious) in `<head>` — SEO noise for a noindex demo.
6. **`globals.css`** Crowd Conscious tokens / utilities — mitigate with a strong `.ciceron-root` reset/token layer (Observatorio pattern).
7. **`middleware.ts`** sets `x-pathname` / timing on all matched paths — fine; no civic chrome.
8. **`public/manifest.json`** — PWA name “Crowd Conscious”; not injected as UI chrome.
9. **No service worker** found in app code.
10. Civic **Header / Footer / MobileNavigation** only appear under `app/(app)/layout.tsx` and some marketing layouts — **not** under Observatorio. Mirror that: keep `/ciceron` outside `(app)`.

**Smallest shared changes** later prompts will need are listed in §3.

---

## 2. Proposed design

### 2.1 Module root and folder map

**Module root:** `lib/ciceron/` (server domain) + `app/ciceron/` (UI routes).  
API/cron surfaces that must live under `app/api` still belong to the module by path prefix and import boundary.

```
app/ciceron/
  layout.tsx                 # own root layout for the segment; no civic shell
  page.tsx                   # public invite gate (noindex)
  hoy/page.tsx
  monitor-dof/page.tsx
  expedientes/...
  investigacion/...
  revision/...
  clientes/...
  admin/...                  # fuentes, metricas (role-gated)
  _components/               # shell, design system, room UI
  copy/es-MX.ts              # single copy module (or lib/ciceron/copy/)

app/api/ciceron/
  cron/dof/route.ts          # Bearer secret; three business-day slots
  ...                        # later: research, review actions, etc.

lib/ciceron/
  gateway/                   # ONLY place that talks to model / embedding providers
    index.ts
    anthropic.ts             # wraps getAnthropicClient + MODELS
    embeddings.ts            # chosen [EMBEDDING_MODEL]
    ai-runs.ts               # writes ciceron.ai_runs
  db/
    client.ts                # typed helpers bound to schema `ciceron`
    types.ts                 # surgically maintained types for ciceron.*
  connectors/
    source.ts                # SourceConnector
    sidof.ts
    case-file.ts             # CaseFileConnector + Sample / Manual / PublicLookup stub
  dof/                       # ingest, normalise, chunk, classify pipeline pieces
  research/                  # retrieval + verifier
  review/                    # delivery gate helpers
  demo/                      # invite codes, seed reset, guided story
  config.ts
  events.ts

supabase/migrations/
  298_ciceron_schema.sql     # (number TBD) CREATE SCHEMA + extensions note
  299_ciceron_*.sql          # tables, RLS, functions — after branch test

docs/ciceron/
  PLAN.md                    # this file
  DECISIONS.md
  (later: SCHEMA.md, SOURCES.md, EVENTS.md, EXTRACTION.md, RUNBOOK.md, LIMITATIONS.md)

lib/ciceron/**/*.test.ts     # picked up by existing test runner
```

**Allow-listed shared imports (only):**

- `lib/supabase-server.ts`, `lib/supabase-client.ts`, `lib/supabase-admin.ts`
- `lib/agents/config.ts` — `getAnthropicClient`, `MODELS`, `CREATIVE_THINKING_OFF` (not other agents)
- `zod`, Next.js, React, Tailwind, `lucide-react` as needed
- Optionally later: `lib/resend.ts` send primitive for allow-listed demo email (Prompt 7/8) — wrap inside `lib/ciceron/` so Resend templates stay Cicerón-owned

**Forbidden:** any import from `lib/pulse`, `lib/signals`, `lib/locations`, `lib/fund`, feed/markets domain, civic `components/*` chrome, Observatorio domain (unless extracting a truly generic util — prefer none).

### 2.2 `/ciceron` layout without Crowd Conscious chrome

Follow Observatorio:

1. Place routes at `app/ciceron/**` (outside `(app)` / `(predictions)` / `(public)` shells that add Header/Footer).
2. Segment `layout.tsx`:
   - Own `next/font` pair (serif + sans) — proposals in `DECISIONS.md`.
   - Wrap children in `CiceronShell` (left rail, top bar, demo marker).
   - `metadata.robots = { index: false, follow: false, nocache: true }`.
   - `lang="es"`.
3. Scope all visual tokens under `.ciceron-root` so `globals.css` teal/purple does not win.
4. Do **not** link into Pulse / Señales / Fondo from the shell.
5. Accept residual root wrappers (Analytics, LanguageProvider, JSON-LD) for the demo; document extraction as the time to get a true standalone root layout. Optional later micro-change: short-circuit `ConversionCelebration` when `pathname` starts with `/ciceron` (needs client pathname — only if it ever fires falsely).

### 2.3 Schema `ciceron` and migrations

1. New migrations under `supabase/migrations/` with `ciceron` in the filename (rules glob).
2. First migration: `CREATE SCHEMA IF NOT EXISTS ciceron;` + `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;` (or equivalent Supabase-supported form) — **enable pgvector on a branch first**; production currently has it **uninstalled**.
3. All Prompt 1 tables, RLS helpers, triggers, `search_chunks`, storage policies live in subsequent migrations.
4. **Test path:** create a Supabase preview branch from `ottixfzdytnzxquzrrcf`, apply migrations there, run isolation tests, only then apply to production.
5. **Querying from the server:**
   - Prefer PostgREST schema exposure: add `ciceron` to the API exposed schemas in Supabase settings (branch + prod), then use `.schema('ciceron').from('...')` on the existing clients.
   - Fallback: `rpc` into `ciceron.*` security-definer functions if exposure is delayed.
6. Types: add a `ciceron` namespace to a **new** `lib/ciceron/db/types.ts` (or surgically extend `types/database.ts`). Do **not** overwrite `types/database.ts` via blind `supabase gen types`.
7. Repo is **public** — migrations must contain no secrets, no real client PII, only fictional seed names.

### 2.4 Cron for DOF (America/Mexico_City)

Use **Vercel Cron** (existing mechanism), not `pg_cron` (not installed; rules forbid a second queue service).

Proposed schedules in **UTC**, targeting CDMX wall clock (document CST/UTC−6; note DST CDMX does not observe DST since 2022, so UTC−6 year-round):

| Run | CDMX | UTC cron | Path |
|---|---|---|---|
| Morning | 08:00 | `0 14 * * 1-5` | `/api/ciceron/cron/dof` |
| Early afternoon | 13:00 | `0 19 * * 1-5` | same |
| Evening | 18:00 | `0 0 * * 2-6` | same (00:00 UTC Tue–Sat = Mon–Fri 18:00 CDMX) |
| Weekend extraordinary | 10:00 Sat/Sun | `0 16 * * 0,6` | same |

Auth: `Authorization: Bearer ${CRON_SECRET}` (**locked** — reuse existing secret; see `DECISIONS.md`).  
Handler: `maxDuration` 300; batch + re-enqueue remainder (Prompt 3).  
Also register under `vercel.json` `functions` + `crons`.

### 2.5 Gateway design

```
lib/ciceron/gateway/
  complete({ purpose, tier, promptVersion, messages, firmId, matterId, userId, retrievedChunkIds })
  embed({ texts, firmId, ... })
```

- **Provider:** Anthropic via `getAnthropicClient()` from `lib/agents/config.ts`.
- **Tiers:**
  - Small / classification & matching / deadline summaries → `MODELS.FAST` (Haiku 4.5).
  - Larger / research answers & client drafts → `MODELS.CREATIVE` (Sonnet 5) with `CREATIVE_THINKING_OFF` unless Francisco opts into thinking later.
- Every call writes **`ciceron.ai_runs`** (rule 6). Optional mirror/summary row in `public.agent_runs` is **not** required and would blur isolation — skip unless ops ask.
- Embeddings go through the same gateway module (`embed`), never direct SDK calls in pipelines.
- Structured outputs validated with **zod**.
- Untrusted DOF/doc text only inside delimited blocks; no tools attached while reading them (rule 8).

### 2.6 Demo access model

**Locked: invite codes (hashed) → demo session as a fictional member of «Despacho Demo, S.C.»** — **not** Crowd Conscious Google/password login for prospects.

Rationale:

- Keeps civic Auth users out of firm tenancy and avoids polluting `profiles` with prospect noise.
- Matches Observatorio’s passcode spirit, but stronger: hashed codes, expiry, max uses, server session (httpOnly cookie), not `sessionStorage` theatre.
- Existing Supabase Auth can still back **internal** firm seats later; for the demo, mint or map to seed users via service role after invite redemption.

Alternative (not recommended for first demo): require Crowd Conscious login + allow-list emails — couples products and leaks civic identity into a legal demo.

### 2.7 Environment variables (`CICERON_` prefix)

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | Embeddings (`text-embedding-3-small`); optional until provisioned — fail soft |
| `CICERON_DOF_USER_AGENT` | Identifying UA + contact for SIDOF requests |
| `CICERON_DOF_CONTACT_EMAIL` | Contact address embedded in UA |
| `CICERON_INVITE_PEPPER` | Server pepper for hashing invite codes |
| `CICERON_EMAIL_ALLOWLIST` | Comma-separated addresses that may receive real demo email |
| `CICERON_MONTHLY_BUDGET_USD` | Per-firm AI budget default |
| `CICERON_PUBLIC_LOOKUP_ENABLED` | Must default `false` (rule 9 / Prompt 6 stub) |

Shared (already exist): `ANTHROPIC_API_KEY`, `CRON_SECRET` (Cicéron cron auth), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`.

### 2.8 Embedding model (locked)

**OpenAI `text-embedding-3-small`, 1536 dimensions**, key `OPENAI_API_KEY` (provision later). Code path: `lib/ciceron/gateway/embeddings.ts` returns `{ ok: false, reason: 'missing_api_key' }` when unset.

### 2.9 Court files (rule 9)

No automated judiciary access in any prompt of this demo. Connectors only: `SampleConnector`, `ManualCaptureConnector`, stub `PublicLookupConnector` that throws until counsel clears. CI grep for judiciary domains under the module (Prompt 6).

---

## 3. Smallest shared changes outside the module (later prompts)

Exact touch points — not implemented in Prompt 0:

1. **`app/robots.ts`** — add `'/ciceron'` next to `'/observatorio-rentas'` in `disallow` (lines 9–18 today).
2. **`vercel.json`** — add `functions` maxDuration for `app/api/ciceron/cron/dof/route.ts` and three–four `crons` entries (UTC as in §2.4).
3. **Supabase Dashboard (branch then prod)** — enable extension `vector`; expose schema `ciceron` to PostgREST; create Storage bucket `ciceron` with firm-prefixed paths.
4. **Vercel env** — add the `CICERON_*` keys from §2.7 after Francisco picks embedding provider.
5. **Optional:** `middleware.ts` — no functional change required for chrome; only if we later add invite-session refresh headers for `/ciceron`.
6. **Do not** add Cicerón links to Crowd Conscious nav, footer, sitemap, or marketing landing.

---

## 4. Risks and open questions

| # | Risk / question | Status |
|---|---|---|
| R1 | Embedding provider | **Locked** — OpenAI `text-embedding-3-small` @ 1536 |
| R2 | pgvector + schema | **Locked** — branch then production; Francisco applies |
| R3 | Expose schema `ciceron` on PostgREST | **Pending** — needed for `.schema('ciceron')` user clients |
| R4 | Cron secret | **Locked** — reuse `CRON_SECRET` |
| R5 | Root layout Analytics / JSON-LD | Still open for Prompt 2 wording |
| R6 | Public repo | No secrets / exploit details |
| R7 | DOF SIDOF unofficial | Prompt 3 verifies |
| R8 | Court automation | Rule 9 stands |
| R9 | Font pairing | **Pending** — see `docs/ciceron/font-specimen.html` + specimens |
| R10 | CI workflow | Optional before Prompt 10 |

### Prompt 1 apply order (Francisco)

1. `supabase/migrations/298_ciceron_foundation.sql`
2. `supabase/migrations/299_ciceron_security.sql`
3. `supabase/migrations/300_ciceron_storage.sql`
4. `supabase/migrations/301_ciceron_seed.sql`
5. Verify: `supabase/migrations/298_ciceron.verify.sql`
6. Rollback (if needed): `supabase/migrations/298_ciceron.rollback.sql`

Also expose schema `ciceron` in Supabase API settings on the branch.

---

## 5. Gate

Prompt 0 decisions locked (except fonts). Prompt 1 gate: run verify SQL on the Supabase branch — cross-tenant read fails; seed firm visible.
