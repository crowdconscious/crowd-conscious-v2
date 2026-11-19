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

/** Extract «1001/2026» from a plazo label when present. */
export function expedienteTokenFromLabel(label: string): string | null {
  const m = label.match(/(\d+\s*\/\s*\d{4})/)
  return m?.[1]?.replace(/\s+/g, '') ?? null
}

/** Collapse «Contestar demanda — 1001/2026» duplicates to one row. */
export function dedupeDeadlineEvents(
  events: ClientTimelineEvent[],
  todayIso = '1970-01-01'
): ClientTimelineEvent[] {
  const deadlines = events.filter((e) => e.kind === 'deadline')
  const others = events.filter((e) => e.kind !== 'deadline')
  const groups = new Map<string, ClientTimelineEvent[]>()

  for (const e of deadlines) {
    const exp = expedienteTokenFromLabel(e.title) ?? e.title
    const action = e.title.replace(/\s*[—–-]\s*\d+\s*\/\s*\d{4}\s*$/, '').trim()
    const key = `${action.toLowerCase()}|${exp}`
    const list = groups.get(key) ?? []
    list.push(e)
    groups.set(key, list)
  }

  const collapsed: ClientTimelineEvent[] = []
  for (const group of groups.values()) {
    if (group.length === 1) {
      collapsed.push(group[0]!)
      continue
    }
    // Prefer the nearest upcoming (or latest past if all past).
    const sorted = [...group].sort((a, b) => a.sortIso.localeCompare(b.sortIso))
    const upcoming = sorted.filter((e) => e.sortIso >= todayIso)
    const nearest = upcoming[0] ?? sorted[sorted.length - 1]!
    const dates = sorted.map((e) => e.dateLabel)
    const uniqueDates = [...new Set(dates)]
    const dateLabel =
      uniqueDates.length === 1
        ? uniqueDates[0]!
        : uniqueDates.length === 2
          ? `${uniqueDates[0]} y ${uniqueDates[1]}`
          : `${uniqueDates.slice(0, -1).join(', ')} y ${uniqueDates[uniqueDates.length - 1]}`
    collapsed.push({
      ...nearest,
      id: nearest.id,
      dateLabel,
      deadlineLabel: nearest.deadlineLabel
        ? uniqueDates.length > 1
          ? dateLabel
          : nearest.deadlineLabel
        : null,
      detail:
        uniqueDates.length > 1
          ? `Plazo procesal (datos de demostración). Vence el ${dateLabel}.`
          : nearest.detail,
    })
  }

  return sortTimelineNewestFirst([...others, ...collapsed])
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
  /** CDMX today (YYYY-MM-DD) for nearest-plazo dedupe. */
  todayIso?: string
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

  return dedupeDeadlineEvents(events, input.todayIso ?? '1970-01-01')
}
