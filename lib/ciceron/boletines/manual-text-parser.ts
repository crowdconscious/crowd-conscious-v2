/**
 * Deterministic line parser for manually pasted / .txt court bulletins.
 * Detects court headers, expediente numbers, and party lines into ParsedBulletinEntry[].
 * No OCR / LLM — PDF and images stay needs_review upstream.
 */

import type { ParsedBulletinEntry } from '@/lib/ciceron/boletines/types'

export const MANUAL_TEXT_PARSER_VERSION = 'manual-text-1.0.0'

const COURT_HEADER =
  /^(?:juzgado|tribunal|sala|juzg\.?)\b[\s\S]{0,160}$/iu

const EXPEDIENTE =
  /(?:n[uú]m\.?\s*)?(?:exp(?:ediente)?\.?|toca)\s*[:=\-]?\s*(\d{1,6}\s*[\/\-]\s*\d{2,4})/iu

const EXPEDIENTE_BARE = /\b(\d{1,6}\s*[\/\-]\s*(?:19|20)\d{2})\b/

const PARTY_LINE =
  /^(?:actor(?:es)?|demandad[oa]s?|quejoso(?:s)?|quejos[oa]|tercero(?:s)?\s+interesad[oa]s?|promovente(?:s)?)\s*[:=\-]?\s*(.+)$/iu

function cleanLine(line: string): string {
  return line.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function normaliseExpedienteCapture(raw: string): string {
  return raw.replace(/\s+/g, '').replace('-', '/')
}

function flushEntry(
  courtName: string | null,
  expedienteNumber: string | null,
  parties: string[],
  summaries: string[]
): ParsedBulletinEntry | null {
  if (!courtName && !expedienteNumber && parties.length === 0) return null
  const partyNames = parties.length > 0 ? parties.join(' · ') : null
  const summary = summaries.length > 0 ? summaries.join(' ').slice(0, 800) : null
  return {
    courtName,
    expedienteNumber,
    partyNames,
    parties: parties.length > 0 ? parties : undefined,
    summary,
    sourceUrl: null,
  }
}

/**
 * Parse a CDMX-style (or similar) pasted bulletin into structured entries.
 */
export function parseManualBulletinText(raw: string): ParsedBulletinEntry[] {
  const text = (raw ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (!text.trim()) return []

  const lines = text.split('\n').map(cleanLine)
  const out: ParsedBulletinEntry[] = []

  let courtName: string | null = null
  let expedienteNumber: string | null = null
  let parties: string[] = []
  let summaries: string[] = []

  const pushCurrent = () => {
    const entry = flushEntry(courtName, expedienteNumber, parties, summaries)
    if (entry) out.push(entry)
    expedienteNumber = null
    parties = []
    summaries = []
  }

  for (const line of lines) {
    if (!line) continue

    if (COURT_HEADER.test(line) && /juzgado|tribunal|sala/i.test(line)) {
      // New court block — flush previous expediente under prior court first.
      pushCurrent()
      courtName = line.slice(0, 300)
      continue
    }

    const expMatch = line.match(EXPEDIENTE) ?? line.match(EXPEDIENTE_BARE)
    if (expMatch?.[1] && (EXPEDIENTE.test(line) || /exp|toca|n[uú]m/i.test(line))) {
      // New expediente under same court.
      if (expedienteNumber || parties.length || summaries.length) {
        const entry = flushEntry(courtName, expedienteNumber, parties, summaries)
        if (entry) out.push(entry)
        parties = []
        summaries = []
      }
      expedienteNumber = normaliseExpedienteCapture(expMatch[1])
      continue
    }

    const partyMatch = line.match(PARTY_LINE)
    if (partyMatch?.[1]) {
      const name = partyMatch[1].trim().slice(0, 300)
      if (name) parties.push(name)
      continue
    }

    // Soft party split on "vs." lines when no labelled actor/demandado.
    if (/\bvs\.?\b|\bcontra\b/i.test(line) && line.length < 220) {
      const parts = line
        .split(/\s+(?:vs\.?|contra)\s+/i)
        .map((p) => p.trim())
        .filter((p) => p.length > 2)
      if (parts.length >= 2) {
        parties.push(...parts.slice(0, 4))
        continue
      }
    }

    if (expedienteNumber || courtName) {
      if (line.length >= 8 && line.length <= 400 && !/^https?:/i.test(line)) {
        summaries.push(line)
      }
    }
  }

  pushCurrent()
  return out
}

export type ManualTextParseValidation = {
  ok: boolean
  entries: ParsedBulletinEntry[]
  error?: string
}

export function validateAndParseManualText(raw: string): ManualTextParseValidation {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) {
    return { ok: false, entries: [], error: 'El texto del boletín está vacío.' }
  }
  if (trimmed.length > 500_000) {
    return { ok: false, entries: [], error: 'El texto supera el límite de 500 000 caracteres.' }
  }
  const entries = parseManualBulletinText(trimmed)
  if (entries.length === 0) {
    return {
      ok: false,
      entries: [],
      error:
        'No se detectaron juzgados ni expedientes. Revise el formato o use «necesita revisión».',
    }
  }
  return { ok: true, entries }
}
