/**
 * Client matter timeline — newest first, deadlines marked for the margin.
 */

import { formatDateLongEs } from '@/lib/ciceron/copy/format-date'

export type ClientTimelineKind = 'bulletin' | 'dof' | 'deadline' | 'review'

export type ClientTimelineEvent = {
  id: string
  kind: ClientTimelineKind
  /** ISO date (YYYY-MM-DD) for sorting; display label separate. */
  sortIso: string
  dateLabel: string
  title: string
  detail: string
  /** When set, show in the deadline margin. */
  deadlineLabel: string | null
  href: string | null
}

export function sortTimelineNewestFirst(
  events: ClientTimelineEvent[]
): ClientTimelineEvent[] {
  return [...events].sort((a, b) => {
    if (a.sortIso !== b.sortIso) return a.sortIso < b.sortIso ? 1 : -1
    return a.title.localeCompare(b.title, 'es-MX')
  })
}

export function buildClientTimeline(input: {
  bulletinHits: Array<{
    id: string
    summary: string | null
    courtName: string | null
    publicationDate: string | null
    expedienteNumber: string | null
  }>
  dofNotes: Array<{
    id: string
    title: string
    date: string
    reason: string
    /** Optional ISO for sorting; falls back to lexical date label. */
    sortIso?: string
  }>
  deadlines: Array<{
    id: string
    label: string
    due: string
    dueAt: string | null
  }>
}): ClientTimelineEvent[] {
  const events: ClientTimelineEvent[] = []

  for (const h of input.bulletinHits) {
    const sortIso = (h.publicationDate ?? '1970-01-01').slice(0, 10)
    events.push({
      id: `bol-${h.id}`,
      kind: 'bulletin',
      sortIso,
      dateLabel: h.publicationDate ? formatDateLongEs(h.publicationDate) : '—',
      title: h.courtName ?? 'Boletín judicial',
      detail: [h.expedienteNumber, h.summary].filter(Boolean).join(' · ') || 'Coincidencia',
      deadlineLabel: null,
      href: '/ciceron/boletines',
    })
  }

  for (const n of input.dofNotes) {
    events.push({
      id: `dof-${n.id}`,
      kind: 'dof',
      sortIso: n.sortIso ?? '2026-11-10',
      dateLabel: n.date,
      title: n.title,
      detail: n.reason,
      deadlineLabel: null,
      href: '/ciceron/monitor-dof',
    })
  }

  for (const d of input.deadlines) {
    const sortIso = (d.dueAt ?? '1970-01-01').slice(0, 10)
    events.push({
      id: `dl-${d.id}`,
      kind: 'deadline',
      sortIso,
      dateLabel: d.due,
      title: d.label,
      detail: 'Plazo procesal (datos de demostración).',
      deadlineLabel: d.due,
      href: '/ciceron/expedientes',
    })
  }

  return sortTimelineNewestFirst(events)
}
