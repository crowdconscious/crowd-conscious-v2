export type BoardSortStatus =
  | 'revisado'
  | 'parcial'
  | 'fallo'
  | 'manual'
  | 'sin_publicacion'

/** C1 — failed/pending first; then CDMX / Estado de México ahead of other states. */
const STATUS_SORT: Record<BoardSortStatus, number> = {
  fallo: 0,
  manual: 1,
  parcial: 2,
  sin_publicacion: 3,
  revisado: 4,
}

const STATE_PRIORITY: Record<string, number> = {
  CDMX: 0,
  MEX: 1,
}

export function sortBoardRows<
  T extends { status: BoardSortStatus; stateCode: string; stateName: string },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const byStatus = STATUS_SORT[a.status] - STATUS_SORT[b.status]
    if (byStatus !== 0) return byStatus
    const pa = STATE_PRIORITY[a.stateCode] ?? 50
    const pb = STATE_PRIORITY[b.stateCode] ?? 50
    if (pa !== pb) return pa - pb
    return a.stateName.localeCompare(b.stateName, 'es-MX')
  })
}
