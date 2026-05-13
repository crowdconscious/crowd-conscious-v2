'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es as esLocale, enUS as enLocale } from 'date-fns/locale'
import { MapPin, MegaphoneIcon, Users } from 'lucide-react'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
  type SignalSeverity,
} from '@/lib/i18n/citizen-signals'
import type { SignalListItem } from '@/lib/signals/list'

type Props = {
  signal: SignalListItem
  locale: CitizenSignalsLocale
  stage1Threshold: number
}

const SEVERITY_CHIP: Record<SignalSeverity, string> = {
  low: 'bg-slate-700/40 text-slate-200 ring-1 ring-inset ring-slate-500/40',
  medium: 'bg-amber-300/10 text-amber-200 ring-1 ring-inset ring-amber-300/40',
  high: 'bg-orange-400/10 text-orange-300 ring-1 ring-inset ring-orange-400/40',
  critical: 'bg-rose-500/10 text-rose-300 ring-1 ring-inset ring-rose-500/50',
}

const SEVERITY_BAR: Record<SignalSeverity, string> = {
  low: 'bg-slate-400',
  medium: 'bg-amber-300',
  high: 'bg-orange-400',
  critical: 'bg-rose-500',
}

export default function SignalCard({ signal, locale, stage1Threshold }: Props) {
  const t = getCitizenSignalsCopy(locale)
  const dateLocale = locale === 'es' ? esLocale : enLocale

  const cosigns = Math.max(0, signal.cosignCount)
  const pct = Math.min(100, Math.round((cosigns / stage1Threshold) * 100))
  const relTime = formatDistanceToNow(new Date(signal.createdAt), {
    addSuffix: true,
    locale: dateLocale,
  })

  const targetLabel =
    signal.targetName ?? t.targetKindLabel(signal.targetKind)

  return (
    <Link
      href={`/signals/${signal.publicSlug}`}
      className="group block overflow-hidden rounded-xl border border-[#2d3748] bg-[#1a2029] p-5 transition-colors hover:border-emerald-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
          <MegaphoneIcon className="h-3 w-3" aria-hidden />
          {t.categoryLabel(signal.category)}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${SEVERITY_CHIP[signal.severity]}`}
        >
          {t.severityLabel(signal.severity)}
        </span>
        <span className="rounded-full bg-slate-800/60 px-2 py-0.5 text-[11px] font-medium text-slate-300 ring-1 ring-inset ring-slate-600/40">
          {t.targetKindLabel(signal.targetKind)}
        </span>
      </div>

      <h3 className="mt-3 text-lg font-semibold leading-snug text-white group-hover:text-emerald-200">
        {signal.title}
      </h3>

      <p className="mt-1 line-clamp-2 text-sm text-slate-400">{signal.body}</p>

      <dl className="mt-3 space-y-1 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <MegaphoneIcon className="h-3.5 w-3.5 text-slate-500" aria-hidden />
          <dt className="sr-only">{t.detail.target}</dt>
          <dd className="truncate">{targetLabel}</dd>
        </div>
        {signal.locationName && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-slate-500" aria-hidden />
            <dt className="sr-only">{t.detail.location}</dt>
            <dd className="truncate">{signal.locationName}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
            {t.detail.cosignsLabel(cosigns)}
          </span>
          <span className="text-slate-500">
            {t.feed.card.cosignProgress(cosigns, stage1Threshold)}
          </span>
        </div>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={stage1Threshold}
          aria-valuenow={cosigns}
        >
          <div
            className={`h-full rounded-full transition-all ${SEVERITY_BAR[signal.severity]}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        {t.feed.card.publishedAgo(relTime)}
      </p>
    </Link>
  )
}
