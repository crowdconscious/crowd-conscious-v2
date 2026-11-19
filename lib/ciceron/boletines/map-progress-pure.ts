/**
 * Pure helpers for the coordinator Mexico map progress bar.
 */

import { CICERON_BULLETIN_CLOCK } from '@/lib/ciceron/config'

export type MapBoardStatus =
  | 'revisado'
  | 'parcial'
  | 'fallo'
  | 'manual'
  | 'sin_publicacion'

export type MapLegendStatus =
  | 'revisado'
  | 'revision_pendiente'
  | 'fallo'
  | 'sin_publicacion'

export function boardStatusToLegend(status: MapBoardStatus): MapLegendStatus {
  if (status === 'revisado') return 'revisado'
  if (status === 'fallo') return 'fallo'
  if (status === 'sin_publicacion') return 'sin_publicacion'
  // manual + parcial → revisión pendiente
  return 'revision_pendiente'
}

export type MapProgressInput = {
  board: Array<{ status: string }>
  /** Wall-clock respaldo HH:MM (defaults to firm clock). */
  respaldoHm?: string
}

export type MapProgress = {
  total: number
  reviewed: number
  remaining: number
  respaldoHm: string
}

export function buildMapProgress(input: MapProgressInput): MapProgress {
  const total = input.board.length
  const reviewed = input.board.filter((b) => b.status === 'revisado').length
  const remaining = Math.max(0, total - reviewed)
  return {
    total,
    reviewed,
    remaining,
    respaldoHm: input.respaldoHm ?? CICERON_BULLETIN_CLOCK.respaldo,
  }
}

/** Assemble the progress sentence from numbered values + copy fragments. */
export function formatMapProgressLabel(
  progress: MapProgress,
  parts: {
    of: string
    reviewed: string
    missing: string
    respaldo: string
  }
): string {
  return `${progress.reviewed} ${parts.of} ${progress.total} ${parts.reviewed} · ${parts.missing} ${progress.remaining} · ${parts.respaldo} ${progress.respaldoHm}`
}

/** Status for a map state: board row if present, else sin publicación. */
export function mapStatusForState(
  boardByCode: Map<string, MapBoardStatus> | Record<string, MapBoardStatus>,
  stateCode: string
): MapLegendStatus {
  const status =
    boardByCode instanceof Map ? boardByCode.get(stateCode) : boardByCode[stateCode]
  if (!status) return 'sin_publicacion'
  return boardStatusToLegend(status)
}
