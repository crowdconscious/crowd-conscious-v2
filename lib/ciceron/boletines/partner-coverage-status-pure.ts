/**
 * Partner-facing coverage labels for the socio home map.
 * Maps board rows + hit counts → al día / con novedades / por verificar.
 */

import type { MapBoardStatus } from './map-progress-pure'

export type PartnerCoverageStatus = 'al_dia' | 'con_novedades' | 'por_verificar'

export type PartnerCoverageRow = {
  stateCode: string
  status: MapBoardStatus | string
  hitsExact?: number
  hitsPossible?: number
}

/** Pure mapping used by the partner hero map legend and CSS classes. */
export function partnerCoverageStatus(row: PartnerCoverageRow): PartnerCoverageStatus {
  const hits = (row.hitsExact ?? 0) + (row.hitsPossible ?? 0)
  if (row.status === 'fallo' || row.status === 'manual' || row.status === 'parcial') {
    return 'por_verificar'
  }
  if (row.status === 'sin_publicacion') {
    return 'por_verificar'
  }
  if (row.status === 'revisado' && hits > 0) {
    return 'con_novedades'
  }
  if (row.status === 'revisado') {
    return 'al_dia'
  }
  return 'por_verificar'
}

export function partnerCoverageByState(
  board: PartnerCoverageRow[]
): Map<string, PartnerCoverageStatus> {
  const map = new Map<string, PartnerCoverageStatus>()
  for (const row of board) {
    map.set(row.stateCode, partnerCoverageStatus(row))
  }
  return map
}

/** Deep-link to filtered matches for a state (client-side query only). */
export function partnerStateMatchesHref(stateCode: string): string {
  const code = stateCode.trim().toUpperCase()
  return `/ciceron/boletines?estado=${encodeURIComponent(code)}`
}
