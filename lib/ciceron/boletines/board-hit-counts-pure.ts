/**
 * Align board hit counts with the coincidence list shown to lawyers.
 * Schema runs can lag `hits_exact`/`hits_possible`; the hits array is the
 * source of truth for what appears under "Boletines judiciales de hoy".
 */

export type HitCountKind = 'exact' | 'possible'

export type HitCountRow = {
  stateCode: string
  matchKind: HitCountKind | string
}

export type StateHitCounts = {
  hitsExact: number
  hitsPossible: number
}

export function hitCountsByState(hits: HitCountRow[]): Map<string, StateHitCounts> {
  const map = new Map<string, StateHitCounts>()
  for (const hit of hits) {
    const code = hit.stateCode.trim().toUpperCase()
    if (!code) continue
    const cur = map.get(code) ?? { hitsExact: 0, hitsPossible: 0 }
    if (hit.matchKind === 'exact') cur.hitsExact += 1
    else if (hit.matchKind === 'possible') cur.hitsPossible += 1
    map.set(code, cur)
  }
  return map
}

/** Overlay list-derived counts onto board rows (same stateCode keys). */
export function applyHitCountsToBoard<
  T extends { stateCode: string; hitsExact: number; hitsPossible: number },
>(board: T[], hits: HitCountRow[]): T[] {
  const counts = hitCountsByState(hits)
  if (counts.size === 0) return board
  return board.map((row) => {
    const c = counts.get(row.stateCode.trim().toUpperCase())
    if (!c) return row
    return { ...row, hitsExact: c.hitsExact, hitsPossible: c.hitsPossible }
  })
}
