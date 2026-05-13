'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
  type SignalCategory,
  type SignalPostType,
  type SignalSeverity,
  type SignalTargetKind,
} from '@/lib/i18n/citizen-signals'
import CoSignButton from './CoSignButton'
import EvidenceGallery, { type EvidenceItem } from './EvidenceGallery'
import TimelineRail from './TimelineRail'
import Comments from './Comments'

type SignalCore = {
  id: string
  public_slug: string
  post_type: string
  category: string
  severity: string
  target_kind: string
  title: string
  body: string
  language: string
  display_name: string | null
  anonymous_display_mode: boolean
  threshold_stage: number
  cosign_count: number
  stage1_met_at: string | null
  stage2_met_at: string | null
  created_at: string
}

type Target = {
  id: string
  slug: string
  display_name: string
  target_kind: string
} | null

type Location = {
  id: string
  slug: string
  name: string
  neighborhood: string | null
  city: string | null
} | null

type ResponseRow = {
  id: string
  author_label: string
  body: string
  official_status: string
  created_at: string
}

type Props = {
  locale: CitizenSignalsLocale
  signal: SignalCore
  target: Target
  location: Location
  evidence: EvidenceItem[]
  responses: ResponseRow[]
  viewerSignedIn: boolean
  viewerHasCosigned: boolean
}

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

function officialStatusClasses(status: string) {
  switch (status) {
    case 'resolved':
      return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
    case 'in_progress':
      return 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
    default:
      return 'bg-slate-500/15 text-slate-300 border border-slate-500/30'
  }
}

export default function SignalDetail({
  locale,
  signal,
  target,
  location,
  evidence,
  responses,
  viewerSignedIn,
  viewerHasCosigned,
}: Props) {
  const t = getCitizenSignalsCopy(locale)
  const dateLocale = locale === 'es' ? 'es-MX' : 'en-US'
  const [cosignCount, setCosignCount] = useState(signal.cosign_count)
  const [cosigned, setCosigned] = useState(viewerHasCosigned)

  return (
    <article>
      <header>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-semibold uppercase tracking-wide text-emerald-300">
            {t.postTypeLabel(signal.post_type as SignalPostType)}
          </span>
          <span className="rounded-full bg-slate-500/15 px-2.5 py-0.5 text-slate-300">
            {t.categoryLabel(signal.category as SignalCategory)}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 ${severityClasses(signal.severity)}`}>
            {t.severityLabel(signal.severity as SignalSeverity)}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
          {signal.title}
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          {signal.anonymous_display_mode
            ? (signal.display_name ?? t.detail.anonymous) + ' · '
            : ''}
          {t.detail.filedOn}{' '}
          {new Date(signal.created_at).toLocaleDateString(dateLocale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </header>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="whitespace-pre-line text-base leading-relaxed text-slate-200">
            {signal.body}
          </p>

          {evidence.length > 0 ? (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-white">
                {t.detail.evidenceTitle}
              </h2>
              <div className="mt-3">
                <EvidenceGallery locale={locale} items={evidence} />
              </div>
            </div>
          ) : null}

          <div className="mt-10">
            <h2 className="text-lg font-semibold text-white">
              {t.detail.officialResponses}
            </h2>
            {responses.length === 0 ? (
              <p className="mt-2 rounded-lg border border-[#2d3748] bg-[#11161f] p-4 text-sm text-slate-400">
                {t.detail.noOfficialResponse}
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {responses.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-[#2d3748] bg-[#11161f] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">
                        {r.author_label}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs ${officialStatusClasses(r.official_status)}`}
                      >
                        {t.targetDash.statusOptions[
                          r.official_status as
                            | 'acknowledged'
                            | 'in_progress'
                            | 'resolved'
                        ] ?? r.official_status}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-300">
                      {r.body}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {new Date(r.created_at).toLocaleString(dateLocale)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-10">
            <Comments
              locale={locale}
              slug={signal.public_slug}
              viewerSignedIn={viewerSignedIn}
            />
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-[#2d3748] bg-[#11161f] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.detail.cosignsLabel(cosignCount)}
            </p>
            <CoSignButton
              locale={locale}
              slug={signal.public_slug}
              viewerSignedIn={viewerSignedIn}
              initiallyCosigned={cosigned}
              onChange={(d) => {
                setCosigned(d.cosigned)
                if (typeof d.count === 'number') setCosignCount(d.count)
              }}
            />
          </div>

          <TimelineRail
            locale={locale}
            stage={signal.threshold_stage}
            cosignCount={cosignCount}
          />

          {target && (
            <div className="rounded-2xl border border-[#2d3748] bg-[#11161f] p-5 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t.detail.target}
              </p>
              <p className="mt-1 text-white">{target.display_name}</p>
              <p className="text-xs text-slate-500">
                {t.targetKindLabel(target.target_kind as SignalTargetKind)}
              </p>
            </div>
          )}

          {location && (
            <div className="rounded-2xl border border-[#2d3748] bg-[#11161f] p-5 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t.detail.location}
              </p>
              <p className="mt-1 text-white">{location.name}</p>
              <p className="text-xs text-slate-500">
                {[location.neighborhood, location.city].filter(Boolean).join(' · ')}
              </p>
            </div>
          )}

          <Link
            href="/signals"
            className="block text-center text-xs text-slate-400 underline hover:text-emerald-300"
          >
            ← {locale === 'es' ? 'Volver al feed' : 'Back to feed'}
          </Link>
        </aside>
      </section>
    </article>
  )
}
