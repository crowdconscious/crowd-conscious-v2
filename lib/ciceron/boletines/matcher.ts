/**
 * Match bulletin entries against a firm catalogue.
 * Exact: expediente + court. Possible: party-name fuzzy.
 * Every hit carries a human-readable reason (rule 9d).
 */

import {
  diceCoefficient,
  normaliseCourtName,
  normaliseExpediente,
  normalisePartyName,
  partyTokens,
  tokenJaccard,
} from '@/lib/ciceron/boletines/normalise'

export type CatalogueMatter = {
  id: string
  courtName: string
  expedienteNumber: string
  partyNameVariants: string[]
  matterId?: string | null
  caseFileId?: string | null
  stateCode?: string
}

export type BulletinEntryInput = {
  courtName?: string | null
  expedienteNumber?: string | null
  partyNames?: string | null
  /** Optional split parties when the bulletin lists actor/demandado separately. */
  parties?: string[]
  summary?: string | null
  sourceUrl?: string | null
}

export type MatchKind = 'exact' | 'possible'

export type MatchHit = {
  catalogueId: string
  matterId: string | null
  caseFileId: string | null
  matchKind: MatchKind
  score: number
  reason: string
  entry: BulletinEntryInput
}

const PARTY_JACCARD_THRESHOLD = 0.72
const PARTY_DICE_THRESHOLD = 0.82

function courtsCompatible(a: string, b: string): boolean {
  const na = normaliseCourtName(a)
  const nb = normaliseCourtName(b)
  if (!na || !nb) return false
  if (na === nb) return true
  // Containment after normalisation (e.g. "juzgado 1 civil queretaro" vs "1 civil")
  if (na.includes(nb) || nb.includes(na)) return true
  // Shared significant tokens (juzgado + number + materia)
  const ta = new Set(na.split(' ').filter((t) => t.length > 1))
  const tb = new Set(nb.split(' ').filter((t) => t.length > 1))
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter += 1
  const need = Math.min(2, Math.min(ta.size, tb.size))
  return inter >= need && inter / Math.max(ta.size, tb.size) >= 0.5
}

function entryParties(entry: BulletinEntryInput): string[] {
  if (entry.parties?.length) return entry.parties
  if (!entry.partyNames) return []
  return entry.partyNames
    .split(/\s+(?:vs\.?|v\.|contra|y\/o|\/)\s+|;\s*|,\s*(?=[A-ZÁÉÍÓÚÑ])/u)
    .map((p) => p.trim())
    .filter(Boolean)
}

function bestPartyScore(
  entryPartiesList: string[],
  variants: string[]
): { score: number; reason: string } | null {
  let best = 0
  let reason = ''
  for (const party of entryPartiesList) {
    for (const variant of variants) {
      const np = normalisePartyName(party)
      const nv = normalisePartyName(variant)
      if (!np || !nv) continue
      if (np === nv) {
        return {
          score: 1,
          reason: `Posible coincidencia por nombre de parte exacto tras normalización («${variant}»).`,
        }
      }
      const jac = tokenJaccard(partyTokens(party), partyTokens(variant))
      const dice = diceCoefficient(party, variant)
      const score = Math.max(jac, dice * 0.95)
      if (score > best) {
        best = score
        if (jac >= PARTY_JACCARD_THRESHOLD) {
          reason = `Posible coincidencia por tokens de nombre de parte (índice ${jac.toFixed(2)}; variante «${variant}»).`
        } else if (dice >= PARTY_DICE_THRESHOLD) {
          reason = `Posible coincidencia difusa por nombre de parte (similitud ${dice.toFixed(2)}; variante «${variant}»).`
        } else {
          reason = ''
        }
      }
    }
  }
  if (best >= PARTY_JACCARD_THRESHOLD || best >= PARTY_DICE_THRESHOLD * 0.95) {
    return { score: Math.min(best, 0.99), reason }
  }
  return null
}

/**
 * Match one bulletin entry against the catalogue.
 * Exact wins over possible for the same catalogue row; multiple catalogue
 * rows may hit the same entry.
 */
export function matchEntry(
  entry: BulletinEntryInput,
  catalogue: CatalogueMatter[]
): MatchHit[] {
  const hits: MatchHit[] = []
  const exp = entry.expedienteNumber
    ? normaliseExpediente(entry.expedienteNumber)
    : ''
  const parties = entryParties(entry)

  for (const row of catalogue) {
    const rowExp = normaliseExpediente(row.expedienteNumber)
    const courtOk =
      entry.courtName && row.courtName
        ? courtsCompatible(entry.courtName, row.courtName)
        : false

    if (exp && rowExp && exp === rowExp && courtOk) {
      hits.push({
        catalogueId: row.id,
        matterId: row.matterId ?? null,
        caseFileId: row.caseFileId ?? null,
        matchKind: 'exact',
        score: 1,
        reason: `Coincidencia exacta de expediente (${exp}) y juzgado («${row.courtName}»).`,
        entry,
      })
      continue
    }

    // Possible: party fuzzy (never upgrades to exact without expediente+court)
    if (parties.length && row.partyNameVariants.length) {
      const party = bestPartyScore(parties, row.partyNameVariants)
      if (party) {
        hits.push({
          catalogueId: row.id,
          matterId: row.matterId ?? null,
          caseFileId: row.caseFileId ?? null,
          matchKind: 'possible',
          score: party.score,
          reason: party.reason,
          entry,
        })
      }
    }
  }

  return hits
}

export function matchEntries(
  entries: BulletinEntryInput[],
  catalogue: CatalogueMatter[]
): MatchHit[] {
  const out: MatchHit[] = []
  for (const e of entries) out.push(...matchEntry(e, catalogue))
  return out
}
