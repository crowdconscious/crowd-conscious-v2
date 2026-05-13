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
}

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
 * Renders the official replies the target has filed against a signal.
 *
 * The visual treatment intentionally diverges from regular comments —
 * an emerald left border + a status pill — so the public can tell at a
 * glance which replies came from the actual destinatario versus a
 * neighbour weighing in. Empty state is rendered separately so the
 * detail page can hide the section entirely if it prefers.
 */
export default function OfficialResponses({ locale, responses }: Props) {
  const t = getCitizenSignalsCopy(locale)
  const dateLocale = locale === 'es' ? 'es-MX' : 'en-US'

  if (responses.length === 0) {
    return (
      <p className="mt-2 rounded-lg border border-[#2d3748] bg-[#11161f] p-4 text-sm text-slate-400">
        {t.detail.noOfficialResponse}
      </p>
    )
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
