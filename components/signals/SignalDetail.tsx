'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MapPin } from 'lucide-react'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
  type SignalCategory,
  type SignalPostType,
  type SignalSeverity,
  type SignalTargetKind,
} from '@/lib/i18n/citizen-signals'
import CoSignButton from './CoSignButton'
import SupportButton from './SupportButton'
import EvidenceGallery, { type EvidenceItem } from './EvidenceGallery'
import TimelineRail from './TimelineRail'
import CommentsThread from './CommentsThread'
import OfficialResponses, {
  type OfficialResponseRow,
} from './OfficialResponses'
import SignalShareBar from './SignalShareBar'

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
  anonymous_support_count: number
  stage1_met_at: string | null
  stage2_met_at: string | null
  created_at: string
  partner_location_id: string | null
  street_reference: string | null
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

/** Partner location (the optional refinement inside an alcaldía). */
type PartnerLocation = {
  id: string
  slug: string
  name: string
  neighborhood: string | null
  city: string | null
} | null

type Props = {
  locale: CitizenSignalsLocale
  signal: SignalCore
  target: Target
  /** The alcaldía (broad bucket). */
  location: Location
  /** Optional sub-location inside the alcaldía. */
  partnerLocation: PartnerLocation
  evidence: EvidenceItem[]
  responses: OfficialResponseRow[]
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

/**
 * Build the hero / aside location string from the alcaldía + optional
 * refinement. Returns null only when there's no alcaldía at all (a data
 * integrity bug, since the column is NOT NULL — but we guard anyway).
 *   alcaldía + partner -> "Álvaro Obregón · Acapulco Vintage Store"
 *   alcaldía + street  -> "Álvaro Obregón · Calle Tonalá entre Yucatán y Mérida"
 *   alcaldía alone     -> "Álvaro Obregón"
 */
function locationLabel(
  loc: Location,
  partner: PartnerLocation,
  streetReference: string | null
): string | null {
  if (!loc) return null
  if (partner) return `${loc.name} · ${partner.name}`
  if (streetReference && streetReference.trim().length > 0) {
    return `${loc.name} · ${streetReference.trim()}`
  }
  return loc.name
}

/**
 * Public detail view for a single Citizen Signal.
 *
 * Server component (`app/signals/[slug]/page.tsx`) fetches the entire
 * payload and hands it down so this client wrapper only owns the
 * engagement state (cosign count + cosign toggle echo). Comments
 * remain self-loading because they need viewer-bound writes.
 *
 * Layout strategy:
 * - Mobile: single column. The narrative renders first, the engagement
 *   widgets (co-sign + timeline + share) follow. A sticky bottom share
 *   row docks to the viewport so the share intents are always reachable.
 * - Desktop ≥ lg: two columns. Narrative on the left, engagement aside
 *   pinned with `lg:sticky` so it travels with the reader as they
 *   scroll the body.
 */
export default function SignalDetail({
  locale,
  signal,
  target,
  location,
  partnerLocation,
  evidence,
  responses,
  viewerSignedIn,
  viewerHasCosigned,
}: Props) {
  const t = getCitizenSignalsCopy(locale)
  const dateLocale = locale === 'es' ? 'es-MX' : 'en-US'
  const [cosignCount, setCosignCount] = useState(signal.cosign_count)
  const [cosigned, setCosigned] = useState(viewerHasCosigned)
  const [supportCount, setSupportCount] = useState(signal.anonymous_support_count)
  const [promoteToast, setPromoteToast] = useState<string | null>(null)

  // Post-login promotion: if we arrived back at /signals/[slug]?promote=1
  // after the auth modal flow, try to convert the visitor's anonymous
  // support into a verified cosign. We swallow non-fatal errors (the
  // user can still cosign manually) and always strip the query param.
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const promoteAttempted = useRef(false)
  useEffect(() => {
    if (!viewerSignedIn) return
    if (promoteAttempted.current) return
    if (searchParams.get('promote') !== '1') return
    promoteAttempted.current = true

    const slug = signal.public_slug
    let cancelled = false
    void (async () => {
      if (!cosigned) {
        try {
          const res = await fetch(`/api/signals/${slug}/cosign`, {
            method: 'POST',
          })
          if (res.ok) {
            const j = (await res.json()) as { cosign_count?: number }
            if (!cancelled) {
              setCosigned(true)
              if (typeof j.cosign_count === 'number') {
                setCosignCount(j.cosign_count)
              }
              setPromoteToast(t.support.promotedToast)
            }
          } else if (res.status === 409 && !cancelled) {
            setCosigned(true)
            setPromoteToast(t.support.promotedToast)
          }
        } catch {
          // best-effort — surface nothing
        }
      }
      // Drop the query param regardless so refresh doesn't re-fire.
      const params = new URLSearchParams(searchParams.toString())
      params.delete('promote')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })()

    return () => {
      cancelled = true
    }
  }, [
    viewerSignedIn,
    cosigned,
    searchParams,
    signal.public_slug,
    router,
    pathname,
    t.support.promotedToast,
  ])

  const heroByline = signal.anonymous_display_mode
    ? signal.display_name ?? t.detail.anonymous
    : signal.display_name ?? null
  const locLabel = locationLabel(
    location,
    partnerLocation,
    signal.street_reference
  )
  const showCitizenReportedNote =
    !!signal.street_reference && signal.street_reference.trim().length > 0

  return (
    <article className="pb-24 sm:pb-0">
      <header>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-semibold uppercase tracking-wide text-emerald-300">
            {t.postTypeLabel(signal.post_type as SignalPostType)}
          </span>
          <span className="rounded-full bg-slate-500/15 px-2.5 py-0.5 text-slate-300">
            {t.categoryLabel(signal.category as SignalCategory)}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 ${severityClasses(signal.severity)}`}
          >
            {t.severityLabel(signal.severity as SignalSeverity)}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
          {signal.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
          {target && (
            <span>
              <span className="text-slate-500">{t.detail.target}:</span>{' '}
              <span className="text-slate-200">{target.display_name}</span>
            </span>
          )}
          {locLabel && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-500" aria-hidden />
              <span className="text-slate-200">{locLabel}</span>
            </span>
          )}
          <span className="text-slate-500">
            {t.detail.filedOn}{' '}
            <time dateTime={signal.created_at} className="text-slate-300">
              {new Date(signal.created_at).toLocaleDateString(dateLocale, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </time>
          </span>
          {heroByline && (
            <span>
              <span className="text-slate-500">{t.detail.filedBy}:</span>{' '}
              <span className="text-slate-200">{heroByline}</span>
            </span>
          )}
        </div>
      </header>

      <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <p className="max-w-prose whitespace-pre-line text-base leading-relaxed text-slate-200">
            {signal.body}
          </p>

          {evidence.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-white">
                {t.detail.evidenceTitle}
              </h2>
              <div className="mt-3">
                <EvidenceGallery locale={locale} items={evidence} />
              </div>
            </div>
          )}

          <div className="mt-10">
            <h2 className="text-lg font-semibold text-white">
              {t.detail.officialResponses}
            </h2>
            <OfficialResponses locale={locale} responses={responses} />
          </div>

          <div className="mt-10 lg:hidden">
            <SignalShareBar
              locale={locale}
              signalId={signal.id}
              slug={signal.public_slug}
              title={signal.title}
            />
          </div>

          <div className="mt-10">
            <CommentsThread
              locale={locale}
              slug={signal.public_slug}
              viewerSignedIn={viewerSignedIn}
            />
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-[#2d3748] bg-[#11161f] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.support.combinedCount(cosignCount, supportCount)}
            </p>
            {promoteToast && (
              <p
                className="mt-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200"
                role="status"
              >
                {promoteToast}
              </p>
            )}
            <div className="mt-3 space-y-3">
              <SupportButton
                locale={locale}
                slug={signal.public_slug}
                viewerSignedIn={viewerSignedIn}
                initialCount={supportCount}
                onChange={(d) => {
                  if (typeof d.count === 'number') setSupportCount(d.count)
                }}
              />
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
              {partnerLocation && (
                <p className="mt-1 text-sm text-slate-200">
                  · {partnerLocation.name}
                </p>
              )}
              {showCitizenReportedNote && signal.street_reference && (
                <>
                  <p className="mt-1 text-sm text-slate-200">
                    · {signal.street_reference}
                  </p>
                  <p className="mt-1 text-xs italic text-slate-500">
                    {t.compose.location.stageB.citizenReportedNote}
                  </p>
                </>
              )}
              <p className="mt-2 text-xs text-slate-500">
                {[location.neighborhood, location.city]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          )}

          <div className="hidden lg:block">
            <SignalShareBar
              locale={locale}
              signalId={signal.id}
              slug={signal.public_slug}
              title={signal.title}
            />
          </div>

          <Link
            href="/signals"
            className="block text-center text-xs text-slate-400 underline hover:text-emerald-300"
          >
            ← {locale === 'es' ? 'Volver al feed' : 'Back to feed'}
          </Link>
        </aside>
      </section>

      {/* Mobile-only sticky bottom share row. Hidden ≥ sm because the
          inline gallery + aside surface already exposes the same intents. */}
      <SignalShareBar
        locale={locale}
        signalId={signal.id}
        slug={signal.public_slug}
        title={signal.title}
        sticky
      />
    </article>
  )
}
