/**
 * Pure helpers for the «Su mañana» landing (metrics + ordered action list).
 * Safe for client and unit tests — no server-only imports.
 */

export type SuMananaMetricId =
  | 'asuntosConNovedad'
  | 'plazosEstaSemana'
  | 'pendientesRevision'

export type SuMananaMetric = {
  id: SuMananaMetricId
  value: number
}

export type SuMananaActionKind =
  | 'bulletin_manual'
  | 'review'
  | 'deadline'
  | 'bulletin_hit'
  | 'dof_match'

export type SuMananaAction = {
  id: string
  kind: SuMananaActionKind
  /** Priority: lower = earlier in the ordered list. */
  priority: number
  href: string
  title: string
  detail?: string
}

export type SuMananaSummaryInput = {
  /** Distinct client/matter keys with bulletin novelty today. */
  bulletinNoveltyKeys: string[]
  /** Distinct client names with DOF matches today. */
  dofNoveltyKeys: string[]
  deadlinesThisWeek: number
  reviewsPending: number
  actions: SuMananaAction[]
}

export type SuMananaSummary = {
  metrics: SuMananaMetric[]
  actions: SuMananaAction[]
}

const ACTION_KIND_ORDER: Record<SuMananaActionKind, number> = {
  bulletin_manual: 0,
  review: 1,
  deadline: 2,
  bulletin_hit: 3,
  dof_match: 4,
}

/** Unique non-empty keys (client or matter identifiers). */
export function uniqueNoveltyCount(...groups: (string | null | undefined)[][]): number {
  const set = new Set<string>()
  for (const group of groups) {
    for (const raw of group) {
      const key = (raw ?? '').trim()
      if (key) set.add(key)
    }
  }
  return set.size
}

/** Stable sort: kind priority, then explicit priority, then title. */
export function orderSuMananaActions(actions: SuMananaAction[]): SuMananaAction[] {
  return [...actions].sort((a, b) => {
    const kindDelta = ACTION_KIND_ORDER[a.kind] - ACTION_KIND_ORDER[b.kind]
    if (kindDelta !== 0) return kindDelta
    if (a.priority !== b.priority) return a.priority - b.priority
    return a.title.localeCompare(b.title, 'es-MX')
  })
}

export function buildSuMananaSummary(input: SuMananaSummaryInput): SuMananaSummary {
  const asuntosConNovedad = uniqueNoveltyCount(
    input.bulletinNoveltyKeys,
    input.dofNoveltyKeys
  )
  return {
    metrics: [
      { id: 'asuntosConNovedad', value: asuntosConNovedad },
      {
        id: 'plazosEstaSemana',
        value: Math.max(0, Math.floor(input.deadlinesThisWeek)),
      },
      {
        id: 'pendientesRevision',
        value: Math.max(0, Math.floor(input.reviewsPending)),
      },
    ],
    actions: orderSuMananaActions(input.actions),
  }
}

/** Rail groups for the collapsed/grouped sidebar. */
export const SU_MANANA_RAIL_GROUPS = [
  {
    id: 'trabajo',
    roomIds: ['hoy', 'boletines', 'revision', 'expedientes'] as const,
  },
  {
    id: 'consulta',
    roomIds: ['monitor-dof', 'investigacion', 'clientes'] as const,
  },
] as const

export type SuMananaRailGroupId = (typeof SU_MANANA_RAIL_GROUPS)[number]['id']
