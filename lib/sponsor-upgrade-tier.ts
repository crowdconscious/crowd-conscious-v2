/**
 * Sponsor upgrade tier mapping.
 *
 * `sponsor_accounts.tier` is historically polymorphic:
 *   - Pulse checkouts set Pulse tier ids:
 *       'pilot' | 'pulse_unico' | 'pulse_pack' | 'suscripcion' |
 *       'mundial_pack' | 'mundial_pack_founding'
 *   - Coupon redeems set legacy sponsor tier ids:
 *       'starter' | 'growth' | 'champion'
 *   - Market-sponsorship checkouts set:
 *       'starter' | 'growth' | 'champion' | 'anchor'
 *   - Enterprise rows (set manually) use 'enterprise'.
 *
 * `normalizePulseTierId()` from `lib/pulse-tiers.ts` is NOT safe here — it
 * coerces unknown strings to 'pulse_unico', which would silently mislabel
 * legacy `champion` accounts as Pulse Único on the upgrade page.
 *
 * This module gives the upgrade UX a first-class normalizer that preserves
 * legacy rows as a distinct bucket, plus a `upgradePathFor()` function that
 * decides which upgrade cards to show.
 */

import type { PulseTierId } from '@/lib/pulse-tiers'

/**
 * Narrower, upgrade-flow-specific bucket. `legacy_sponsor` means the row
 * predates the Pulse product line and we should treat it as "needs a Pulse
 * tier selection" — not automatically pretend it's already Pulse Único.
 */
export type SponsorUpgradeTier =
  | 'pilot'
  | 'pulse_unico'
  | 'pulse_pack'
  | 'suscripcion'
  | 'mundial_pack'
  | 'mundial_pack_founding'
  | 'enterprise'
  | 'legacy_sponsor'

const PULSE_TIER_IDS: ReadonlySet<string> = new Set([
  'pilot',
  'pulse_unico',
  'pulse_pack',
  'suscripcion',
  'mundial_pack',
  'mundial_pack_founding',
])

const LEGACY_SPONSOR_IDS: ReadonlySet<string> = new Set([
  'starter',
  'growth',
  'champion',
  'anchor',
])

export function normalizeSponsorUpgradeTier(raw: string | null | undefined): SponsorUpgradeTier {
  const k = (raw || '').toLowerCase().trim()
  if (PULSE_TIER_IDS.has(k)) return k as SponsorUpgradeTier
  if (k === 'enterprise') return 'enterprise'
  if (LEGACY_SPONSOR_IDS.has(k)) return 'legacy_sponsor'
  // Unknown value — be conservative. Treating unknown tiers as
  // 'legacy_sponsor' keeps them OUT of the Pulse-specific "renew your
  // current tier" branch and funnels them into a clean upgrade ladder.
  return 'legacy_sponsor'
}

/**
 * Role a card plays on the upgrade page.
 *
 *  - `current`   : status card for the tier the user already has. No CTA.
 *  - `renew`     : same tier, new purchase (adds another period of access).
 *  - `upgrade`   : higher tier; primary upsell.
 *  - `enterprise`: contact-sales card, mailto comunidad@.
 */
export type UpgradeCardRole = 'current' | 'renew' | 'upgrade' | 'enterprise'

export type UpgradeCard = {
  /** Pulse tier id to render ('enterprise' is handled specially). */
  target: PulseTierId
  role: UpgradeCardRole
  /** Use `popular` to style the card as the recommended action. */
  highlighted?: boolean
}

/**
 * Return the ordered list of upgrade cards to show given a normalized tier
 * and current Pulse usage.
 *
 * Design notes:
 *   - 'pilot' is never a renew target — it's a trial tier, push the user
 *     into a paid Pulse tier.
 *   - Mundial tiers (mundial_pack, mundial_pack_founding) get renew + a
 *     path toward Suscripción, since Mundial is a 3-month campaign pack.
 *   - 'legacy_sponsor' accounts see the full Pulse ladder. No 'current'
 *     card — their legacy tier is invisible here.
 *   - 'enterprise' collapses to a single contact card (handled by the
 *     page, this function returns an empty list for that case).
 */
export function upgradePathFor(tier: SponsorUpgradeTier): UpgradeCard[] {
  switch (tier) {
    case 'pilot':
      return [
        { target: 'pulse_unico', role: 'upgrade' },
        { target: 'pulse_pack', role: 'upgrade', highlighted: true },
        { target: 'suscripcion', role: 'upgrade' },
      ]
    case 'pulse_unico':
      return [
        { target: 'pulse_unico', role: 'renew' },
        { target: 'pulse_pack', role: 'upgrade', highlighted: true },
        { target: 'suscripcion', role: 'upgrade' },
      ]
    case 'pulse_pack':
      return [
        { target: 'pulse_pack', role: 'current' },
        { target: 'pulse_pack', role: 'renew' },
        { target: 'suscripcion', role: 'upgrade', highlighted: true },
      ]
    case 'suscripcion':
      return [
        { target: 'suscripcion', role: 'current' },
        { target: 'enterprise', role: 'enterprise' },
      ]
    case 'mundial_pack':
    case 'mundial_pack_founding':
      return [
        { target: tier, role: 'current' },
        { target: 'suscripcion', role: 'upgrade', highlighted: true },
        { target: 'enterprise', role: 'enterprise' },
      ]
    case 'enterprise':
      return [{ target: 'enterprise', role: 'enterprise' }]
    case 'legacy_sponsor':
      return [
        { target: 'pulse_unico', role: 'upgrade' },
        { target: 'pulse_pack', role: 'upgrade', highlighted: true },
        { target: 'suscripcion', role: 'upgrade' },
      ]
  }
}

/**
 * True when a target tier can be purchased via Stripe checkout.
 * Enterprise + pilot stay sales-led / acquisition-only from within the
 * authed upgrade surface.
 */
export function isCheckoutableTarget(target: PulseTierId): boolean {
  return target === 'pulse_unico' || target === 'pulse_pack' || target === 'suscripcion'
}
