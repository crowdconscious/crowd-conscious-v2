# Pricing decision · 20 April 2026

## What changed

Suscripción tier moved from **$20K MXN/mes / unlimited questions / 30% fund**
to **$25K MXN/mes / up to 5 questions per month / 40% fund**, with a new
bullet — "Reporte ejecutivo mensual" — that justifies the jump.

"Unlimited questions" now lives **only** on Enterprise.

Small polish on the other tiers (copy only, no price or fund-% changes):

- **Pulse Único** — duration label "7–30 días activos" → "7–30 días de votación".
- **Pulse Pack (3)** — duration label "60 días" → "60 días de votación · hasta 3 Pulses en paralelo".
- **Enterprise** — removed the redundant "A la medida" subtitle beneath "A medida",
  broadened "Integraciones a medida" → "SSO, API e integraciones a medida",
  added "Preguntas ilimitadas", sharpened `bestFor` to
  "Gobierno estatal/federal, grandes corporativos, medios nacionales".

A new **"Piloto Gratuito"** callout now sits below the pricing grid on `/pulse`.
It is not a paid SKU — it's the 14-day free trial that MH and Cuauhtémoc are
following. Clicking "Solicitar piloto" opens a `mailto:comunidad@crowdconscious.app`
with a prefilled subject.

## Why

1. **$20K/mes for unlimited was underpriced** relative to reference points
   (traditional research agencies $200K+ per engagement, SurveyMonkey
   enterprise ~$5K/mes but no confidence data and no Fund narrative).
2. **"Unlimited" was a negotiation liability** — prospects would compute
   per-question cost and use the cheapest path against us.
3. **40% to the Fund matches Enterprise and Mundial Pack**, so the recurring
   tier we expect revenue from also reinforces the Fund narrative at the
   same rate as the flagship tiers.
4. The $25K number reads as "real B2B product" pricing — closer to the
   number Cheesecake quoted in the MH pilot proposal — and leaves room
   to offer Enterprise discounts without hollowing out the Suscripción tier.

## Grandfathering

- **No existing `tier = 'suscripcion'` sponsor_accounts rows exist today**
  (MH is a free pilot; Club Reset was a test). The grandfathering policy
  below is defensive — the pattern matters for when rows do exist.
- Existing subscriptions (if any) keep whatever `max_pulse_markets` is
  currently written on the row — the one-time `UPDATE` from migration
  `185_sponsor_accounts_tier_limits.sql` is not re-run.
- New checkouts read `lib/pulse-tier-benefits.ts` via the `pulse-purchase`
  webhook. That map was updated from `max_pulse_markets: 999` → `5` in
  this PR, so every new Suscripción sponsor is capped at 5.
- If we ever need to migrate an existing grandfathered row down to 5,
  that's an explicit manual ops action, not automatic.

## Stripe

Conscious Pulse checkouts build a Stripe `payment` session inline via
`price_data.unit_amount` in `app/api/pulse/checkout/route.ts`, sourced from
`PULSE_TIERS[tier].priceMXN`. There are **no catalog `price_...` IDs** for
Pulse SKUs today — so there is nothing to version as `V2` and nothing to
archive in the Stripe dashboard. Updating `priceMXN` is the single point
of change.

"Suscripción" is also a product name, not a Stripe recurring subscription
(`mode: 'subscription'`). If/when recurring billing lands, this decision
doc is the place to cross-link the migration plan.

## What did NOT change

- **Pulse Único** — $5,000 MXN · 20% to Fund (copy tweak only).
- **Pulse Pack (3)** — $12,000 MXN · 25% to Fund (copy tweak only).
- **Enterprise** — "A medida" · 40% to Fund (copy sharpened, structure unchanged).
- **Pilot Pulse** — $1,500 MXN · 0% Fund (free pilots don't trigger Fund).
- **Mundial Pulse Pack** — $25K founding / $50K regular · 40% Fund,
  5 Pulses. The May 15 "$15K founding kill-switch" lives in the
  strategic plan and is managed separately from this PR.

## Files touched

- `lib/pulse-tiers.ts` — price + fund % + bullets + duration labels.
- `lib/pulse-tier-benefits.ts` — Suscripción `max_pulse_markets` 999 → 5.
- `components/pulse/PulsePricingSection.tsx` — USD hint, Piloto Gratuito
  callout, conditional duration render (so Enterprise renders without
  a dangling subtitle).
- `lib/i18n/sponsor-page-copy.ts` — mirrored Suscripción copy on `/sponsor`.
- `docs/REFINED-STRATEGY-2026-04-16.md` — single pricing bullet updated.
- `docs/PRICING-DECISION-2026-04-20.md` — this file.

## External docs not in the repo

- The Pulse Keynote deck (Cheesecake) — flag slide 7 in the PR notes.
- The MH pilot proposal doc — already references $25K / 5 questions / 40%.
- The public website `/pulse` — rendered from the code above; no CMS drift.

## Revisit date

**October 2026** — review Suscripción pricing against actual cost of
delivery, active Suscripción count, churn data, and competitive landscape.
Consider introducing `mode: 'subscription'` recurring billing by then.
