'use client'

import Link from 'next/link'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
  type SignalCategory,
  type SignalPostType,
  type SignalSeverity,
  type SignalTargetKind,
} from '@/lib/i18n/citizen-signals'

export type SignalCardData = {
  id: string
  public_slug: string
  post_type: string
  category: string
  severity: string
  target_kind: string
  citizen_target_id: string
  title: string
  body: string
  language: string
  conscious_location_id: string
  display_name: string | null
  anonymous_display_mode: boolean
  threshold_stage: number
  cosign_count: number
  stage1_met_at: string | null
  stage2_met_at: string | null
  created_at: string
  updated_at: string
  target?: {
    id: string
    slug: string
    display_name: string
    target_kind: string
  } | null
  location?: {
    id: string
    slug: string
    name: string
    neighborhood: string | null
    city: string | null
  } | null
}

const STAGE1 = Number(process.env.NEXT_PUBLIC_SIGNALS_STAGE1 ?? '50')
const STAGE2 = Number(process.env.NEXT_PUBLIC_SIGNALS_STAGE2 ?? '200')

function severityClasses(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
    case 'high':
      return 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
    case 'medium':
      return 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
    case 'low':
    default:
      return 'bg-slate-500/15 text-slate-300 border border-slate-500/30'
  }
}

export default function SignalCard({
  locale,
  signal,
}: {
  locale: CitizenSignalsLocale
  signal: SignalCardData
}) {
  const t = getCitizenSignalsCopy(locale)
  const dateLocale = locale === 'es' ? 'es-MX' : 'en-US'
  const created = new Date(signal.created_at).toLocaleDateString(dateLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const stageThreshold = signal.threshold_stage >= 2 ? STAGE2 : STAGE1
  const progressPct = Math.min(
    100,
    Math.round((signal.cosign_count / stageThreshold) * 100)
  )

  const bodyExcerpt =
    signal.body.length > 220 ? `${signal.body.slice(0, 220).trim()}…` : signal.body

  const filer = signal.anonymous_display_mode
    ? signal.display_name ?? t.detail.anonymous
    : null

  return (
    <Link
      href={`/signals/${signal.public_slug}`}
      className="group block rounded-2xl border border-[#2d3748] bg-[#11161f] p-5 transition-colors hover:border-emerald-400/50"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-300">
          {t.postTypeLabel(signal.post_type as SignalPostType)}
        </span>
        <span className="rounded-full bg-slate-500/15 px-2.5 py-0.5 text-xs text-slate-300">
          {t.categoryLabel(signal.category as SignalCategory)}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs ${severityClasses(signal.severity)}`}
        >
          {t.severityLabel(signal.severity as SignalSeverity)}
        </span>
        {signal.threshold_stage >= 1 && (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs text-amber-200">
            {signal.threshold_stage >= 2
              ? t.stages.stage2.label
              : t.stages.stage1.label}
          </span>
        )}
      </div>

      <h2 className="mt-3 text-lg font-semibold text-white group-hover:text-emerald-200">
        {signal.title}
      </h2>
      <p className="mt-2 text-sm text-slate-400">{bodyExcerpt}</p>

      <dl className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-400 sm:grid-cols-2">
        {signal.target && (
          <div>
            <dt className="font-semibold uppercase tracking-wide text-slate-500">
              {t.detail.target}
            </dt>
            <dd className="text-slate-300">
              {signal.target.display_name}{' '}
              <span className="text-slate-500">
                ({t.targetKindLabel(signal.target.target_kind as SignalTargetKind)})
              </span>
            </dd>
          </div>
        )}
        {signal.location && (
          <div>
            <dt className="font-semibold uppercase tracking-wide text-slate-500">
              {t.detail.location}
            </dt>
            <dd className="text-slate-300">
              {[signal.location.name, signal.location.neighborhood]
                .filter(Boolean)
                .join(' · ')}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#1e2531] pt-4 text-xs">
        <span className="text-slate-500">
          {filer ? `${filer} · ` : ''}
          {t.detail.filedOn} {created}
        </span>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-emerald-300">
            {t.detail.cosignsLabel(signal.cosign_count)}
          </span>
          <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-[#1e2531]">
            <div
              className="absolute inset-y-0 left-0 bg-emerald-400"
              style={{ width: `${progressPct}%` }}
              aria-hidden
            />
          </div>
        </div>
      </div>
    </Link>
  )
}
