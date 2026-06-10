# Conscious Perks — Feature Strategy

**Date:** 2026-06-10
**Status:** Phase D (web MVP) — implemented in migration 244 + web surfaces
**Scope:** Web (`crowd-conscious-v2`); mobile wallet deferred to Phase D.2

---

## 1. The idea in one paragraph

Users earn XP voting and participating in Pulses. **Conscious Perks** closes the loop:
certified Conscious Locations publish XP-priced offers (discounts, free items, experiences);
users redeem at the venue with a single-use code (+ QR); staff confirm on a public verify page.
XP becomes meaningful currency, locations get foot traffic from verified conscious consumers,
and the certification funnel gains a concrete ROI story for B2B sales.

---

## 2. Data model

### `conscious_locations` (extended)

| Column | Purpose |
|--------|---------|
| `owner_profile_id` | `profiles.id` of the claimed owner; set on first successful claim |
| `contact_email` | Existing; must match claimant's profile email (claim-by-email, mirrors migration 209) |

No separate `owner_sponsor_account_id` — location B2B is venue-centric, not Pulse-sponsor-centric.
`sponsor_account_id` remains for Pulse/market linkage only.

### `location_offers`

| Column | Notes |
|--------|-------|
| `location_id` | FK → `conscious_locations` |
| `title`, `title_en`, `description`, `description_en` | ES/EN copy |
| `xp_cost` | Integer ≥ 1 |
| `min_tier` | Optional 1–5; gate uses **lifetime earned** XP (`user_xp.total_xp`), not spendable balance |
| `stock_limit` | NULL = unlimited; `redeemed_count` tracks confirmed + pending-with-stock-reserved |
| `max_redemptions_per_user` | Default 1; per-offer cap |
| `valid_from`, `valid_until` | Optional validity window |
| `status` | `draft` \| `active` \| `paused` \| `expired` |

Only locations with `status = 'active'` may publish `active` offers.

### `location_redemptions`

| Column | Notes |
|--------|-------|
| `offer_id`, `user_id` | FKs |
| `redemption_code` | Unique 8-char alphanumeric (no ambiguous chars) |
| `xp_spent` | Snapshot at redemption time |
| `status` | `pending` \| `confirmed` \| `expired` \| `cancelled` |
| `expires_at` | Pending codes expire (default 48h after creation) |
| `confirmed_at`, `confirmed_by` | Set when owner confirms at venue |

### XP accounting (`user_xp` + `xp_transactions`)

| Field | Semantics |
|-------|-----------|
| `user_xp.total_xp` | **Lifetime earned** — never decremented on spend; drives leaderboard rank and tier |
| `user_xp.total_xp_spent` | Cumulative XP redeemed; spendable = `total_xp - total_xp_spent` |
| `xp_transactions` (negative) | Ledger entry with `action_type = 'perk_redemption'` for audit/analytics |

**Why this split:** Leaderboard view (`leaderboard_view`) and tier thresholds read `total_xp`.
Subtracting spend from `total_xp` would drop rank after redemption — unacceptable per product guardrails.
A dedicated `total_xp_spent` column keeps spend atomic with minimal changes to existing vote RPCs.

Atomic spend lives in Postgres RPC `spend_xp_for_perk_redemption(p_user_id, p_offer_id)`.

---

## 3. Owner claim flow

**URL:** `/locations/[slug]/claim`

1. User must be authenticated (`/login?redirectTo=...`).
2. Page loads location; shows claim CTA if `contact_email` matches profile email (case-insensitive).
3. `POST /api/dashboard/location/[slug]/claim` sets `owner_profile_id = auth.uid()` (idempotent).
4. Admins may also set `owner_profile_id` in admin location editor (existing admin path).

Reconciliation for "claimed while logged out, signed up later with same email" happens on claim
attempt — same pattern as `sponsor_accounts` migration 209.

**Owner dashboard:** `/dashboard/location/[slug]` — list/create/edit/pause offers for owned location only.

---

## 4. Offer lifecycle

```
draft → active → paused → expired
         ↑__________|
```

- Owners create in `draft`, publish to `active` when ready.
- `paused` hides from public listing; existing pending codes remain valid until expiry.
- `expired` set manually or when `valid_until` passes (API filters by date; cron optional later).

Stock: increment `redeemed_count` at redemption creation (reserves stock while pending).
Decrement only on `cancelled` before confirm (admin/owner tooling — MVP: no auto-release cron).

---

## 5. Redemption flow (web MVP)

### User path

1. On `/locations/[slug]`, **Conscious Perks** section lists active offers (XP cost, tier, stock).
2. Authenticated user taps **Canjear** → `POST /api/perks/redeem { offer_id }`.
3. RPC deducts spendable XP, creates `location_redemptions` row, returns code.
4. Redirect / modal → `/perks/redeem/[code]` with code + QR linking to verify URL.

### Staff / owner verify path

1. Staff opens `/perks/verify/[code]` (public, no auth) — shows offer title, location, status, expiry.
2. Owner (authenticated, owns location) taps **Confirmar** → `POST /api/perks/verify/[code]/confirm`.
3. Status → `confirmed`; user keeps code as receipt.

No POS integration. Pattern mirrors `/api/locations/verify` certificate lookup.

---

## 6. Guardrails

| Rule | Implementation |
|------|----------------|
| Spend must not reduce leaderboard rank | `total_xp` unchanged; only `total_xp_spent` increases |
| Active certified locations only | Offer publish + public listing require `conscious_locations.status = 'active'` |
| Per-user caps | `max_redemptions_per_user` per offer |
| Stock limits | `redeemed_count < stock_limit` at RPC time |
| Tier gates | `min_tier` vs `getTierByXP(total_xp)` |
| Code expiry | Pending redemptions expire after 48h |
| Non-transferable | Codes bound to redeeming `user_id`; terms §5 updated |

---

## 7. RLS summary

| Table | anon/authenticated read | Owner write | Admin |
|-------|-------------------------|-------------|-------|
| `location_offers` | Active offers for active locations | CRUD own location | ALL |
| `location_redemptions` | Own rows (authenticated) | Confirm own location's codes | ALL |

Verify lookup uses service role in API routes (same as location certificate verify).

---

## 8. APIs

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/locations/[slug]/offers` | Public | Active offers for location |
| POST | `/api/perks/redeem` | User | Create redemption |
| GET | `/api/perks/verify/[code]` | Public | Staff lookup |
| POST | `/api/perks/verify/[code]/confirm` | Owner | Mark confirmed |
| POST | `/api/dashboard/location/[slug]/claim` | User | Claim ownership |
| GET/POST | `/api/dashboard/location/[slug]/offers` | Owner | List/create offers |
| PATCH/DELETE | `/api/dashboard/location/[slug]/offers/[offerId]` | Owner | Update/pause/delete |

---

## 9. i18n + UX

- Default ES; every user-facing string has EN variant (cookie `preferred-language` / `useLanguage()`).
- Reuse LocationCard emerald/teal dark theme (`#0f1419`, `#1a2029`, emerald accents).
- Empty states: no offers yet; insufficient XP; tier locked; out of stock.
- Copy uses **Canjear / Redeem**, **Conscious Perks / Beneficios Conscientes** — not "market" language.

---

## 10. Analytics

Minimum: negative `xp_transactions` with `action_type = 'perk_redemption'` and descriptive `description`
(offer title + location slug). PostHog / `share_events` extension deferred.

---

## 11. Deferred to Phase D.2 (mobile)

- Native wallet tab listing pending + confirmed redemptions
- Push notification on redemption created / confirmed
- Apple/Google Wallet pass integration
- Staff PIN mode (MVP: owner-authed confirm only)
- Auto-expire cron for pending codes + stock release
- Tier-gated offer UI polish (badge on locked offers)
- Creator perks (same tables pattern, different entity — post-locations validation)

---

## 12. Legal prerequisite

Terms §5 updated 2026-06-10: XP may be redeemed for venue perks at Conscious Locations;
still no cash value, non-transferable, subject to venue availability.

---

## Related docs

- [`PLATFORM-AUDIT-AND-IMPROVEMENT-PLAN-2026-06-10.md`](PLATFORM-AUDIT-AND-IMPROVEMENT-PLAN-2026-06-10.md) §5
- [`CONSCIOUS-CREATORS-STRATEGY-2026-06-09.md`](CONSCIOUS-CREATORS-STRATEGY-2026-06-09.md) — patterns mirrored (claim, verify, i18n columns)
