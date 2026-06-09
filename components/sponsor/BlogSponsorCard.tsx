import { ExternalLink, Heart } from 'lucide-react'
import { getCreatorCopy, type CreatorLocale } from '@/lib/i18n/creator'
import type { SponsorshipTier } from '@/lib/sponsorship-tiers'

export type BlogSponsorData = {
  sponsorName: string
  logoUrl: string | null
  /** Verified target URL the card links to (creator_sponsorships.sponsor_contact). */
  targetUrl: string | null
  /** Placement tier (creator_sponsorships.tier). NULL = legacy / non-tiered. */
  tier: SponsorshipTier | null
  /** Moderated shout-out, only rendered for the support tier (no logo). */
  supporterMessage: string | null
}

type Props = {
  sponsor: BlogSponsorData
  locale: CreatorLocale
  slot: 'inline' | 'footer'
}

/**
 * Constrained blog sponsor card — the shared "sponsor card" component, now
 * tier-aware (migrations 237–239). Placement is keyed off
 * `creator_sponsorships.tier`:
 *
 *   - support  → moderated shout-out only, NO logo (`SponsorShoutout`).
 *   - sponsor  → one constrained logo card.
 *   - featured → constrained logo card (the page renders it in two slots and
 *                adds a byline credit via `SponsorBylineCredit`).
 *   - null     → legacy / non-tiered row: the historical logo card.
 *
 * NO free-form creative: verified logo + short headline (sponsor name) +
 * verified target URL + the non-optional "Patrocinado" disclosure label (always
 * shown). Brand assets come from the active creator_sponsorships row (written by
 * the Stripe webhook). The page controls which slots render per tier.
 */
export function BlogSponsorCard({ sponsor, locale, slot }: Props) {
  const t = getCreatorCopy(locale)
  const name = sponsor.sponsorName?.trim()
  if (!name) return null // disclosure cannot render without a sponsor name

  const hasUrl = !!sponsor.targetUrl && /^https?:\/\//i.test(sponsor.targetUrl)

  const inner = (
    <div className="flex items-center gap-4">
      {sponsor.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sponsor.logoUrl}
          alt={name}
          className="h-12 w-12 shrink-0 rounded-lg border border-white/10 bg-white/5 object-contain p-1"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-emerald-500/15 text-base font-semibold text-emerald-300">
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90">
          {t.sponsoredLabel}
        </p>
        <p className="truncate text-sm font-semibold text-white">{name}</p>
      </div>
      {hasUrl && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-600/40 px-3 py-1.5 text-xs font-medium text-emerald-300">
          {t.sponsorVisit}
          <ExternalLink className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  )

  const wrapperClass =
    slot === 'inline'
      ? 'my-8 block rounded-xl border border-[#2d3748] bg-[#13181c] p-4'
      : 'mt-10 block rounded-xl border border-[#2d3748] bg-[#13181c] p-4'

  if (hasUrl) {
    return (
      <a
        href={sponsor.targetUrl as string}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className={`${wrapperClass} transition hover:border-emerald-600/40`}
        aria-label={`${t.sponsoredLabel}: ${name}`}
      >
        {inner}
      </a>
    )
  }

  return (
    <div className={wrapperClass} aria-label={`${t.sponsoredLabel}: ${name}`}>
      {inner}
    </div>
  )
}

/**
 * Support-tier placement: a moderated shout-out with the non-optional
 * "Patrocinado" disclosure label and NO logo. Renders nothing without a message.
 */
export function SponsorShoutout({
  sponsor,
  locale,
}: {
  sponsor: BlogSponsorData
  locale: CreatorLocale
}) {
  const t = getCreatorCopy(locale)
  const name = sponsor.sponsorName?.trim()
  const message = sponsor.supporterMessage?.trim()
  if (!name || !message) return null

  return (
    <div
      className="my-8 rounded-xl border border-emerald-600/30 bg-emerald-500/5 p-4"
      aria-label={`${t.sponsoredLabel}: ${name}`}
    >
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400/90">
        <Heart className="h-3 w-3" /> {t.sponsoredLabel}
      </p>
      <p className="mt-1 text-sm italic text-slate-200">“{message}”</p>
      <p className="mt-1 text-xs font-semibold text-emerald-300">— {name}</p>
    </div>
  )
}

/**
 * Featured-tier byline credit: a "Con el apoyo de [name]" line shown near the
 * article byline, in addition to the two sponsor cards.
 */
export function SponsorBylineCredit({
  sponsor,
  locale,
}: {
  sponsor: BlogSponsorData
  locale: CreatorLocale
}) {
  const t = getCreatorCopy(locale)
  const name = sponsor.sponsorName?.trim()
  if (!name) return null

  return (
    <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
      {sponsor.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sponsor.logoUrl}
          alt={name}
          className="h-5 w-5 shrink-0 rounded border border-white/10 bg-white/5 object-contain"
        />
      )}
      <span>
        {t.sponsorSupportedBy} <span className="font-semibold text-slate-200">{name}</span>
      </span>
    </p>
  )
}
