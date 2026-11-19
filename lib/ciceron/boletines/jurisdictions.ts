/**
 * «Sus jurisdicciones» — coverage rows from the public survey registry
 * (demo catalogue), not the firm's real client list.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sourceTierLabel } from '@/lib/ciceron/copy/labels'

export type JurisdictionCoverageRow = {
  stateName: string
  matterCount: number
  modality: string
  /** ISO date when coverage began, or null if still por verificar. */
  coverageSince: string | null
  verified: boolean
}

/** Prospect footprint matter weights from SURVEY-SUMMARY (fictional demo scale). */
const MATTER_WEIGHTS: Record<string, number> = {
  'Estado de México': 33,
  Guanajuato: 18,
  Querétaro: 14,
  Chihuahua: 11,
  Jalisco: 10,
  'Nuevo León': 9,
  Coahuila: 6,
  'Quintana Roo': 6,
  Tabasco: 6,
  Chiapas: 5,
  Sonora: 5,
  Puebla: 5,
  Tamaulipas: 5,
  Hidalgo: 3,
  Morelos: 2,
  Michoacán: 2,
  Yucatán: 2,
  Durango: 2,
  'Baja California': 1,
  'Baja California Sur': 1,
  Guerrero: 1,
  Aguascalientes: 1,
  Oaxaca: 1,
  'Ciudad de México': 250,
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out
}

/**
 * Build coverage rows from REGISTRY.csv.
 * Modality is «Por verificar» until verified_by/verified_on are set.
 */
export function loadJurisdictionCoverageFromRegistry(
  registryPath = join(process.cwd(), 'docs/ciceron/boletines/REGISTRY.csv')
): JurisdictionCoverageRow[] {
  const raw = readFileSync(registryPath, 'utf8')
  const lines = raw.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const header = parseCsvLine(lines[0]!)
  const idxState = header.indexOf('state')
  const idxTier = header.indexOf('proposed_tier')
  const idxVerifiedBy = header.indexOf('verified_by')
  const idxVerifiedOn = header.indexOf('verified_on')

  const best = new Map<
    string,
    { tier: string; verifiedBy: string; verifiedOn: string }
  >()

  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line)
    const state = cols[idxState]?.trim()
    if (!state) continue
    const tier = (cols[idxTier] ?? 'not_verified').trim() || 'not_verified'
    const verifiedBy = (cols[idxVerifiedBy] ?? '').trim()
    const verifiedOn = (cols[idxVerifiedOn] ?? '').trim()
    const prev = best.get(state)
    if (!prev) {
      best.set(state, { tier, verifiedBy, verifiedOn })
      continue
    }
    // Prefer a verified row; otherwise keep the "easier" tier letter.
    if (verifiedBy && verifiedOn && !(prev.verifiedBy && prev.verifiedOn)) {
      best.set(state, { tier, verifiedBy, verifiedOn })
    }
  }

  const rows: JurisdictionCoverageRow[] = []
  for (const [stateName, meta] of best) {
    const verified = Boolean(meta.verifiedBy && meta.verifiedOn)
    rows.push({
      stateName,
      matterCount: MATTER_WEIGHTS[stateName] ?? 0,
      modality: verified ? sourceTierLabel(meta.tier) : sourceTierLabel('not_verified'),
      coverageSince: verified ? meta.verifiedOn : null,
      verified,
    })
  }

  return rows.sort(
    (a, b) =>
      b.matterCount - a.matterCount || a.stateName.localeCompare(b.stateName, 'es-MX')
  )
}
