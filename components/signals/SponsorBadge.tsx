import Image from 'next/image'
import { BadgeCheck } from 'lucide-react'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'
import { fundPillarLabel, isFundPillar, type FundPillar } from '@/lib/fund/pillars'

export type SignalSponsorInfo = {
  sponsorName: string
  sponsorLogoUrl: string | null
  fundPillar: string
  badgeMessage: string
}

/**
 * Public "Patrocinado" badge for a sponsored Citizen Signal.
 *
 * Display-only. It reads sponsorship metadata from `signal_sponsorships` +
 * `creator_sponsorships` (resolved server-side) and never touches the signal's
 * content, status, thresholds or co-firma counts. The "Patrocinado" disclosure
 * is always shown (the schema makes `sponsor_name` / `badge_message` NOT NULL,
 * so a sponsored signal can never render without it).
 */
export default function SponsorBadge({
  locale,
  sponsor,
}: {
  locale: CitizenSignalsLocale
  sponsor: SignalSponsorInfo
}) {
  const t = getCitizenSignalsCopy(locale)
  const pillar: FundPillar = isFundPillar(sponsor.fundPillar)
    ? sponsor.fundPillar
    : 'safe_cities'

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
      <div className="flex items-center gap-2">
        <BadgeCheck className="h-4 w-4 text-emerald-300" aria-hidden />
        <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
          {t.sponsor.badgeLabel}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        {sponsor.sponsorLogoUrl && (
          <Image
            src={sponsor.sponsorLogoUrl}
            alt={sponsor.sponsorName}
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg object-contain"
            unoptimized
          />
        )}
        <p className="text-sm font-semibold text-white">
          {sponsor.badgeMessage || t.sponsor.sponsoredBy(sponsor.sponsorName)}
        </p>
      </div>

      <p className="mt-3 text-xs text-emerald-200/90">
        {t.sponsor.transparency(fundPillarLabel(pillar, locale))}
      </p>
      <p className="mt-1 text-xs text-slate-400">{t.sponsor.integrityNote}</p>
    </div>
  )
}
