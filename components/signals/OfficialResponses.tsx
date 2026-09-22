'use client'

import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'

export type OfficialResponseRow = {
  id: string
  author_label: string
  body: string
  official_status: string
  created_at: string
}

type Props = {
  locale: CitizenSignalsLocale
  responses: OfficialResponseRow[]
  /** Current threshold stage (0/1/2). */
  stage?: number
  /**
   * When institutional silence was stamped as a published public-record
   * result (stage1 + 30d, no reply). Until then, stage ≥1 empty state reads
   * as "notified, waiting" — not as published silence.
   */
  silencePublishedAt?: string | null
  /** stage1_met_at — used as a client-side fallback if cron has not stamped yet. */
  stage1MetAt?: string | null
}

const MS_30D = 30 * 24 * 60 * 60 * 1000

function statusClasses(status: string): string {
  switch (status) {
    case 'resolved':
      return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
    case 'in_progress':
      return 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
    default:
      return 'bg-slate-500/15 text-slate-300 border border-slate-500/30'
  }
}

/**
 * True when silence is a published result: cron stamp, or stage1 + 30d
 * elapsed with no responses (client fallback so the public record does not
 * wait on the next daily cron tick).
 */
export function isSilencePublishedResult(params: {
  silencePublishedAt?: string | null
  stage1MetAt?: string | null
  stage?: number
  hasResponses: boolean
}): boolean {
  if (params.hasResponses) return false
  if (params.silencePublishedAt) return true
  if ((params.stage ?? 0) < 1 || !params.stage1MetAt) return false
  const met = new Date(params.stage1MetAt).getTime()
  if (!Number.isFinite(met)) return false
  return Date.now() - met >= MS_30D
}

/**
 * Renders the official replies the target has filed against a signal.
 *
 * Empty state is dual-outcome (Phase 0/2):
 *   - before Stage 1: waiting (co-signs trigger notice)
 *   - Stage ≥1, <30d, no reply: notified, awaiting reply
 *   - Stage ≥1, ≥30d or silence_published_at: published institutional silence
 */
export default function OfficialResponses({
  locale,
  responses,
  stage = 0,
  silencePublishedAt = null,
  stage1MetAt = null,
}: Props) {
  const t = getCitizenSignalsCopy(locale)
  const dateLocale = locale === 'es' ? 'es-MX' : 'en-US'

  if (responses.length === 0) {
    const silence = isSilencePublishedResult({
      silencePublishedAt,
      stage1MetAt,
      stage,
      hasResponses: false,
    })
    let emptyCopy = t.detail.noOfficialResponseWaiting
    if (silence) {
      emptyCopy = t.detail.noOfficialResponseSilence
    } else if (stage >= 1) {
      emptyCopy = t.detail.noOfficialResponseAwaiting
    }
    const emptyClass = silence
      ? 'mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100/90'
      : 'mt-2 rounded-lg border border-[#2d3748] bg-[#11161f] p-4 text-sm text-slate-400'
    return <p className={emptyClass}>{emptyCopy}</p>
  }

  return (
    <ul className="mt-3 space-y-3">
      {responses.map((r) => (
        <li
          key={r.id}
          className="rounded-lg border border-[#2d3748] border-l-4 border-l-emerald-400 bg-[#11161f] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white">{r.author_label}</p>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs ${statusClasses(r.official_status)}`}
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
  )
}
