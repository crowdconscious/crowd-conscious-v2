import Link from 'next/link'
import { ArrowRight, MapPin, Megaphone } from 'lucide-react'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
  type SignalSeverity,
} from '@/lib/i18n/citizen-signals'
import type { LandingSignal } from '@/lib/signals/landing'

type Props = {
  locale: CitizenSignalsLocale
  signal: LandingSignal
}

const SEVERITY_CHIP: Record<SignalSeverity, string> = {
  low: 'bg-slate-700/40 text-slate-200 ring-1 ring-inset ring-slate-500/40',
  medium: 'bg-amber-300/10 text-amber-200 ring-1 ring-inset ring-amber-300/40',
  high: 'bg-orange-400/10 text-orange-300 ring-1 ring-inset ring-orange-400/40',
  critical: 'bg-rose-500/10 text-rose-300 ring-1 ring-inset ring-rose-500/50',
}

/**
 * Compact card variant tuned for the homepage "Señales Activas" block.
 *
 * Visually mirrors `components/signals/SignalCard.tsx` but drops the
 * progress bar (the home page never has room) and surfaces both the
 * cosign count and the anonymous support count side-by-side.
 *
 * Server component — no client state needed.
 */
export default function LandingSignalCard({ locale, signal }: Props) {
  const t = getCitizenSignalsCopy(locale)
  const showcase = t.landing.showcase

  const targetLabel =
    signal.targetName ??
    (signal.targetKind != null
      ? t.targetKindLabel(signal.targetKind)
      : locale === 'es'
        ? 'En observación'
        : 'Under observation')

  return (
    <Link
      href={`/signals/${signal.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-[#2d3748] bg-[#1a2029] p-5 transition-colors hover:border-emerald-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${SEVERITY_CHIP[signal.severity]}`}
        >
          {t.severityLabel(signal.severity)}
        </span>
        {signal.targetKind != null ? (
          <span className="rounded-full bg-slate-800/60 px-2 py-0.5 text-[11px] font-medium text-slate-300 ring-1 ring-inset ring-slate-600/40">
            {t.targetKindLabel(signal.targetKind)}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-emerald-300">
        {targetLabel}
      </p>

      <h3 className="mt-1 line-clamp-3 text-lg font-semibold leading-snug text-white group-hover:text-emerald-200">
        {signal.title}
      </h3>

      <dl className="mt-3 space-y-1 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Megaphone className="h-3.5 w-3.5 text-slate-500" aria-hidden />
          <dt className="sr-only">{t.detail.category}</dt>
          <dd className="truncate">{t.categoryLabel(signal.category)}</dd>
        </div>
        {signal.locationName && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-slate-500" aria-hidden />
            <dt className="sr-only">{t.detail.location}</dt>
            <dd className="truncate">{signal.locationName}</dd>
          </div>
        )}
      </dl>

      <p className="mt-4 text-xs font-medium text-slate-200">
        {showcase.countLabel(signal.cosignCount, signal.anonymousSupportCount)}
      </p>

      <p className="mt-auto pt-4 text-sm font-semibold text-emerald-300 group-hover:text-emerald-200">
        <span className="inline-flex items-center gap-1">
          {showcase.viewSignal}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </p>
    </Link>
  )
}
