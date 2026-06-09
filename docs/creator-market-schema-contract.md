# Creator-Market Schema Contract (Prompts 1–5)

**Status:** Schema authored, **NOT yet applied** to Supabase. The founder applies
migrations manually, once, in order. This document is the contract that the
app-code workers (Agents B and C) build against. If a name/type here disagrees
with the SQL, the SQL in `supabase/migrations/` wins — flag it.

**Apply order (founder, manual, once):** `232 → 233 → 234 → 235`.
The `OPTIONAL_backfill_pulse_fund_contributions.sql` file is **not** in that chain —
review separately. Prompt 4 adds **no** new tables beyond `influencer_payouts`
(in the 234 file).

**Migration files**

| File | Prompt | Summary |
|------|--------|---------|
| `232_creator_blog_trust.sql` | 1 | Blog `author_id`/`sources`/`pending_review`; `profiles.handle` + `creator_trust_level` + `social_links`; creator blog RLS (own drafts, self-publish gated to trust ≥ 2). |
| `233_monetization_core.sql` | 2 | **ALTERs** legacy `sponsorships` to the creator-market shape; new `revenue_split_configs` (4 labels), `conscious_fund_contributions` (inflow ledger), `conscious_fund_distributions` (outflow) + public aggregate views. |
| `234_influencer_payouts.sql` | 3 | New `influencer_payouts` ledger; creators read own, writes service-role only. |
| `235_sponsored_signals.sql` | 5 | `citizen_signals.sponsorable` (admin-only via trigger) + new `signal_sponsorships` badge join enforcing the integrity boundary. |
| `OPTIONAL_backfill_pulse_fund_contributions.sql` | 2 | **Optional, fully commented.** Backfills historical Pulse fund from `sponsorship_log.fund_allocation`. Review before running. |

---

## Locked economics

- **Conscious Fund = flat 20% of gross on everything.**
- The creator/fund/platform split is resolved by the **Stripe webhook** from
  checkout metadata and **snapshotted** onto the `sponsorships` row at creation.
  Config changes never rewrite history.
- Split labels (`revenue_split_configs`, percentages ordered **fund / creator / platform**):

  | label | fund_pct | creator_pct | platform_pct |
  |-------|---------:|------------:|-------------:|
  | `creator_sourced`  | 20 | 60 | 20 |
  | `platform_sourced` | 20 | 20 | 60 |
  | `editorial`        | 20 |  0 | 80 |
  | `pulse_signal`     | 20 |  0 | 80 |

---

## Canonical strings & conventions

- **Creator role:** canonical `profiles.user_type = 'influencer'` (added by migration
  225). We do **not** add a separate `'creator'` value. Allowed `user_type`:
  `user | brand | admin | influencer`.
- **Creator handle:** `profiles.handle` — lowercase `^[a-z0-9_]{3,30}$`, unique
  case-insensitive, **nullable** until a creator claims one. Used by
  `/app?ref=<handle>` and the `app_referral_clicks` owner-read policy (231).
- **Currency:** default `'MXN'` everywhere money is stored.
- **RLS is the contract.** Mobile uses supabase-js directly. Money **writes** =
  service role only (no write policy ⇒ denied for anon/auth; service role
  bypasses RLS). Public **reads** of money = **aggregates only** (views).

---

## Tables

### `profiles` (ALTERED, 232)

New columns:

| column | type | notes |
|--------|------|-------|
| `handle` | `text` | nullable, unique(lower), `^[a-z0-9_]{3,30}$` |
| `creator_trust_level` | `int NOT NULL DEFAULT 0` | ≥ 2 unlocks self-publish; **admin-only** to change |
| `social_links` | `jsonb NOT NULL DEFAULT '{}'` | canonical: `{instagram,tiktok,x,website}` |

`bio`, `avatar_url`, and the legacy scalar socials (`twitter,linkedin,instagram,website`)
already existed and are unchanged. **New creator code reads/writes `social_links`**,
not the legacy scalars.

RLS added: `profiles_admin_update` — admins may UPDATE any profile (e.g. set
`creator_trust_level`). Existing self-read/self-update policies untouched.

Helper: `public.my_creator_trust_level() → int` (SECURITY DEFINER) returns the
caller's own trust level; used by blog RLS.

### `blog_posts` (ALTERED, 232)

New columns:

| column | type | notes |
|--------|------|-------|
| `author_id` | `uuid → profiles(id)` ON DELETE SET NULL | owning creator; drives RLS. Distinct from legacy `edited_by`. |
| `sources` | `jsonb NOT NULL DEFAULT '[]'` | array of `{label,url}` |

`status` CHECK widened to `draft | pending_review | published | archived`
(default `draft`).

RLS (additive to existing "Anyone read published" + "Admins manage all"):
- `blog_posts_author_select_own` — creator reads own posts, any status.
- `blog_posts_author_insert` — `author_id = auth.uid()` AND status ∈ `{draft,pending_review}`.
- `blog_posts_author_update` — own non-published posts; may set `published` **only**
  when `my_creator_trust_level() ≥ 2`.
- `blog_posts_author_delete` — own `{draft,pending_review}` only.
- Admins publish/moderate via the existing "Admins manage all posts" policy.

### `sponsorships` (ALTERED, 233) ⚠️ pre-existing legacy table

The legacy `sponsorships` (old communities model: NOT NULL `content_id`,
`sponsor_id`, `amount`) is **altered, not recreated**. Legacy NOT NULLs are
dropped so creator-market rows can insert; status CHECK is widened to a superset.

Creator-market columns (all nullable/defaulted, snapshotted by the webhook):

| column | type | notes |
|--------|------|-------|
| `sponsor_name` | `text` | required for creator-market rows (disclosure CHECK) |
| `sponsor_logo_url` | `text` | |
| `sponsor_contact` | `text` | |
| `sponsor_email` | `text` | |
| `surface_type` | `text` | CHECK ∈ `{pulse,blog,signal}` (nullable for legacy) |
| `source_id` | `uuid` | id of the pulse/blog/signal |
| `sourced_by` | `text` | CHECK ∈ `{creator,platform,editorial}` |
| `creator_id` | `uuid → profiles(id)` | nullable |
| `gross_amount` | `numeric(12,2)` | |
| `currency` | `text NOT NULL DEFAULT 'MXN'` | |
| `fund_amount` | `numeric(12,2)` | snapshot |
| `creator_amount` | `numeric(12,2)` | snapshot |
| `platform_amount` | `numeric(12,2)` | snapshot |
| `stripe_session_id` | `text` | unique (partial, where not null) |
| `stripe_payment_intent` | `text` | |
| `stripe_event_id` | `text` | |
| `flagged_self_sponsor` | `boolean NOT NULL DEFAULT false` | |
| `status` | `text DEFAULT 'active'` | CHECK superset incl. `active,refunded,disputed,ended` (+ legacy `pending,approved,rejected,paid`) |

- **Disclosure:** `sponsorships_disclosure_chk` (NOT VALID) requires non-empty
  `sponsor_name` whenever `surface_type` is set ⇒ no creator-market sponsorship
  can render without a "Patrocinado" label.
- RLS: `sponsorships_admin_select` (admins read all); `sponsorships_creator_select_own`
  (`creator_id = auth.uid()`). **No write policy** — service role only.

### `revenue_split_configs` (NEW, 233)

| column | type |
|--------|------|
| `id` | `uuid PK` |
| `label` | `text NOT NULL UNIQUE` |
| `fund_pct` / `creator_pct` / `platform_pct` | `numeric(5,2)` |
| `created_at` | `timestamptz` |

CHECK `fund_pct + creator_pct + platform_pct = 100`. Seeded with the 4 labels
above (`ON CONFLICT (label) DO NOTHING`). RLS: **public read**; admin write.

### `conscious_fund_contributions` (NEW, 233) — single inflow ledger

> Distinct from the legacy `conscious_fund` (balance) and
> `conscious_fund_transactions`. This is the new unified 20%-inflow ledger.

| column | type | notes |
|--------|------|-------|
| `id` | `uuid PK` | |
| `source_type` | `text NOT NULL` | CHECK ∈ `{pulse,blog,signal,donation}` |
| `source_id` | `uuid` | nullable (e.g. raw donation) |
| `amount` | `numeric(12,2) NOT NULL` | ≥ 0 |
| `currency` | `text NOT NULL DEFAULT 'MXN'` | |
| `fund_pillar` | `text` | CHECK ∈ `{clean_air,clean_water,safe_cities,zero_waste,fair_trade}`, nullable |
| `sponsorship_id` | `uuid → sponsorships(id)` ON DELETE SET NULL | nullable link |
| `created_at` | `timestamptz` | |

RLS: admin read of raw rows; **no write policy** (service role only). **Public
read via the aggregate view only:** `conscious_fund_contributions_totals`
(`source_type, fund_pillar, currency, contribution_count, total_amount`),
granted SELECT to anon/authenticated.

### `conscious_fund_distributions` (NEW, 233) — outflow ledger

| column | type |
|--------|------|
| `id` | `uuid PK` |
| `cause_id` | `uuid → fund_causes(id)` ON DELETE SET NULL |
| `amount` | `numeric(12,2) NOT NULL` ≥ 0 |
| `currency` | `text NOT NULL DEFAULT 'MXN'` |
| `distributed_at` | `timestamptz` |
| `note` | `text` |
| `created_at` | `timestamptz` |

RLS: admin read; **no write policy** (service role only). Public read via
aggregate view `conscious_fund_distributions_totals`
(`cause_id, currency, distribution_count, total_amount, last_distributed_at`).

### `influencer_payouts` (NEW, 234)

| column | type | notes |
|--------|------|-------|
| `id` | `uuid PK` | |
| `creator_id` | `uuid NOT NULL → profiles(id)` ON DELETE CASCADE | |
| `period` | `text NOT NULL` | e.g. `'2026-06'` |
| `total_earned` | `numeric(12,2) NOT NULL DEFAULT 0` | |
| `amount_paid` | `numeric(12,2) NOT NULL DEFAULT 0` | |
| `currency` | `text NOT NULL DEFAULT 'MXN'` | |
| `status` | `text NOT NULL DEFAULT 'pending'` | CHECK ∈ `{pending,held,released,paid}` |
| `released_at` / `paid_at` | `timestamptz` | |
| `method` | `text` | e.g. `spei`, `paypal`, `manual` |
| `invoice_rfc` | `text` | MX tax id |
| `invoice_url` | `text` | |
| `flagged_self_sponsor` | `boolean NOT NULL DEFAULT false` | |
| `note` | `text` | |
| `created_at` / `updated_at` | `timestamptz` | |

UNIQUE `(creator_id, period)`. RLS: `influencer_payouts_creator_select_own`
(`creator_id = auth.uid()`) + admin read. **No write policy** (service role only).

### `citizen_signals` (ALTERED, 235)

New column `sponsorable boolean NOT NULL DEFAULT false`. **Admin-only** to set/
change, enforced by trigger `citizen_signals_sponsorable_guard` (function
`enforce_signal_sponsorable_admin_only`, allows `is_admin()` or `service_role`).
All other `citizen_signals` columns/RLS unchanged.

### `signal_sponsorships` (NEW, 235) — badge/transparency join

| column | type | notes |
|--------|------|-------|
| `id` | `uuid PK` | |
| `signal_id` | `uuid NOT NULL → citizen_signals(id)` ON DELETE CASCADE | |
| `sponsorship_id` | `uuid NOT NULL → sponsorships(id)` ON DELETE CASCADE | |
| `fund_pillar` | `text NOT NULL` | CHECK ∈ the 5 pillars |
| `badge_message` | `text NOT NULL` | non-empty (disclosure) |
| `created_at` | `timestamptz` | |

UNIQUE `(signal_id, sponsorship_id)`. Uses the `pulse_signal` split (fund 20 /
creator 0 / platform 80). RLS: public SELECT **only for published signals** (via
`is_signal_published`, 230); admin write; service role bypasses for the money flow.

---

## Signal integrity boundary (Prompt 5) — how it holds

It is **structurally impossible** for a sponsorship to touch a Signal's content,
status, thresholds, or co-firma counts:

1. **Separate table.** `signal_sponsorships` has **no** content/status/threshold/
   `cosign_count` columns — only `signal_id` (FK), `sponsorship_id`, `fund_pillar`,
   `badge_message`. It cannot store signal content or counts.
2. **No write path into the signal.** Nothing in 235 grants writes to
   `citizen_signals` or `citizen_signal_cosigns`. Their RLS (219/227/230) is
   untouched: co-signs are citizen INSERT only, one row per user
   (UNIQUE `(signal_id,user_id)`), and `citizen_signals.cosign_count` is maintained
   **only** by the `citizen_signal_cosign_count_trigger`. A sponsorship row cannot
   add, remove, or reweight a co-firma. Co-firmas count identically whether or not
   a signal is sponsored.
3. **`sponsorable` is admin-only** via the BEFORE INSERT/UPDATE trigger (RLS can't
   express a column-level rule; the trigger is the structural guard).
4. **Public sees the badge only**, and only for published signals; badge fields are
   read-only to the public, writes are admin/service-role only.

---

## Flags for the founder

- **(a) ALTERed vs created.**
  - **ALTERed (pre-existing):** `sponsorships` (legacy communities table — NOT NULLs
    relaxed, status widened, creator-market columns added), `profiles`, `blog_posts`,
    `citizen_signals`.
  - **Created new:** `revenue_split_configs`, `conscious_fund_contributions`,
    `conscious_fund_distributions`, `influencer_payouts`, `signal_sponsorships`
    (+ two aggregate views).
  - `conscious_fund_contributions`/`_distributions` did **not** previously exist
    (only the legacy `conscious_fund` balance + `conscious_fund_transactions`).
- **(b) Optional/uncertain backfill.** `OPTIONAL_backfill_pulse_fund_contributions.sql`
  is fully commented and excluded from the apply chain. It copies historical fund
  from `sponsorship_log.fund_allocation` verbatim (does **not** assume a %; does not
  retro-apply 20%). No dedupe key — running twice double-counts. Review first.
- **(c) Flat-20% code overlap.** A separate worker owns the flat-20% change in
  `lib/pulse-tiers.ts` / pricing copy. This batch is schema-only and does not touch
  those files; the new 20% economics are encoded in `revenue_split_configs` +
  resolved by the (later) webhook code.
- **(d) Canonical creator `user_type` string = `'influencer'`** (not `'creator'`).
- **(e) Apply order = `232 → 233 → 234 → 235`.** Prompt 4 adds no tables beyond
  `influencer_payouts` (in 234). The backfill is separate/manual.
- **Leaderboards:** untouched — founder/super-admin exclusion is not regressed.
