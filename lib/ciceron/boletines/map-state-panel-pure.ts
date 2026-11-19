/**
 * Pure helpers for the clickable Mexico map state detail panel.
 */

import type { MapBoardStatus, MapLegendStatus } from '@/lib/ciceron/boletines/map-progress-pure'
import { boardStatusToLegend } from '@/lib/ciceron/boletines/map-progress-pure'

export type MapStatePanelMatter = {
  id: string
  label: string
  matchKind: 'exact' | 'possible'
}

export type MapStatePanelDetail = {
  stateCode: string
  stateName: string
  statusLabel: string
  status: string
  sourceName: string
  /** HH:MM in CDMX, or null when never consulted. */
  lastConsultHm: string | null
  reviewerName: string | null
  matters: MapStatePanelMatter[]
  hitsExact: number
  hitsPossible: number
  /** True when the firm has no source / no coverage for this state today. */
  noCoverage?: boolean
}

/** Format an ISO datetime as HH:MM for the panel (24 h). */
export function formatConsultHm(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  return fmt.format(d)
}

export function findStatePanelDetail(
  details: MapStatePanelDetail[],
  stateCode: string
): MapStatePanelDetail | null {
  return details.find((d) => d.stateCode === stateCode) ?? null
}

const URGENCY: Record<MapLegendStatus, number> = {
  fallo: 0,
  revision_pendiente: 1,
  revisado: 2,
  sin_publicacion: 3,
}

/**
 * Most urgent board state: failed → pending → reviewed with matches → rest.
 * Returns null when the board is empty (caller shows a prompt).
 */
export function pickDefaultStateCode(
  board: Array<{
    stateCode: string
    status: MapBoardStatus
    hitsExact?: number
    hitsPossible?: number
  }>
): string | null {
  if (board.length === 0) return null
  const ranked = [...board].sort((a, b) => {
    const la = boardStatusToLegend(a.status)
    const lb = boardStatusToLegend(b.status)
    const ua = URGENCY[la]
    const ub = URGENCY[lb]
    if (ua !== ub) return ua - ub
    const hitsA = (a.hitsExact ?? 0) + (a.hitsPossible ?? 0)
    const hitsB = (b.hitsExact ?? 0) + (b.hitsPossible ?? 0)
    if (la === 'revisado' && lb === 'revisado' && hitsA !== hitsB) {
      return hitsB - hitsA
    }
    return a.stateCode.localeCompare(b.stateCode, 'es-MX')
  })
  return ranked[0]?.stateCode ?? null
}
