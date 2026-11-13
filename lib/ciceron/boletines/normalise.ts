/**
 * Normalisers for state-court bulletin matching (expediente, court, party).
 * Pure functions — no I/O.
 */

const CORPORATE_SUFFIXES = [
  's\\.a\\.\\s*de\\s*c\\.v\\.',
  's\\.\\s*a\\.\\s*p\\.\\s*i\\.\\s*de\\s*c\\.\\s*v\\.',
  's\\.a\\.p\\.i\\.\\s*de\\s*c\\.v\\.',
  's\\.\\s*de\\s*r\\.\\s*l\\.\\s*de\\s*c\\.\\s*v\\.',
  's\\.de\\s*r\\.l\\.\\s*de\\s*c\\.v\\.',
  's\\.c\\.',
  's\\.a\\.',
  'a\\.c\\.',
  'sociedad\\s+anonima\\s+de\\s+capital\\s+variable',
  'sociedad\\s+civil',
]

const SUFFIX_RE = new RegExp(
  `(?:\\s|,)*(?:${CORPORATE_SUFFIXES.join('|')})\\.?\\s*$`,
  'gi'
)

const ACCENT_MAP: Record<string, string> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ú: 'u',
  ü: 'u',
  ñ: 'n',
  à: 'a',
  è: 'e',
  ì: 'i',
  ò: 'o',
  ù: 'u',
}

export function stripAccents(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[áéíóúüñàèìòù]/gi, (ch) => {
      const lower = ch.toLowerCase()
      const mapped = ACCENT_MAP[lower] ?? lower
      return ch === lower ? mapped : mapped.toUpperCase()
    })
}

/** Collapse whitespace and lowercase for comparisons. */
export function foldText(input: string): string {
  return stripAccents(input)
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[;:()[\]{}"«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Fold punctuation after corporate-suffix stripping. */
function foldPunctuation(input: string): string {
  return input
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalise expediente numbers so "123/2026", "123 / 2026", "Exp. 123-2026",
 * "123-2026" compare equal when they share number+year.
 */
export function normaliseExpediente(raw: string): string {
  const s = foldText(raw)
    .replace(/\b(exp|expediente|toca|num|n[oº°]|no)\b\.?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const m = s.match(/(\d{1,6})\s*[\/\-.]\s*(\d{2,4})/)
  if (m) {
    const num = m[1]!.replace(/^0+/, '') || '0'
    let year = m[2]!
    if (year.length === 2) {
      const n = Number(year)
      year = n >= 70 ? `19${year}` : `20${year}`
    }
    return `${num}/${year}`
  }

  // Bare number — keep digits only
  const digits = s.replace(/[^\d]/g, '')
  return digits.replace(/^0+/, '') || s
}

/**
 * Court / juzgado labels: strip ordinal fluff inconsistently written,
 * fold accents, drop "de lo" noise for comparison keys.
 */
export function normaliseCourtName(raw: string): string {
  let s = foldPunctuation(foldText(raw))
  s = s
    .replace(/\bde\s+lo\b/g, ' ')
    .replace(/\ben\s+materia\b/g, ' ')
    .replace(/[º°]/g, 'o')
    .replace(/\s+/g, ' ')
    .trim()

  // Unify ordinal words ↔ digits for primero..décimo
  const ordinals: Array<[RegExp, string]> = [
    [/\bdecimo\s+primero\b/g, '11'],
    [/\bdecimo\s+segundo\b/g, '12'],
    [/\bprimero\b/g, '1'],
    [/\bsegundo\b/g, '2'],
    [/\btercero\b/g, '3'],
    [/\bcuarto\b/g, '4'],
    [/\bquinto\b/g, '5'],
    [/\bsexto\b/g, '6'],
    [/\bseptimo\b/g, '7'],
    [/\boctavo\b/g, '8'],
    [/\bnoveno\b/g, '9'],
    [/\bdecimo\b/g, '10'],
    [/\b(\d+)\s*o\b/g, '$1'],
    [/\b(\d+)(?:er|do|to|mo)\b/g, '$1'],
  ]
  for (const [re, rep] of ordinals) s = s.replace(re, rep)

  return s.replace(/\s+/g, ' ').trim()
}

/** Drop corporate suffixes and fold for party comparison. */
export function normalisePartyName(raw: string): string {
  // Keep dots long enough for S.A. de C.V. patterns, then strip.
  let s = foldText(raw)
  s = s.replace(SUFFIX_RE, '').trim()
  s = s.replace(SUFFIX_RE, '').trim()
  // Also catch undotted "sa de cv" / "sapi de cv" after punctuation fold
  s = foldPunctuation(s)
  s = s
    .replace(
      /(?:\s|,)*(?:s\s*a\s*p\s*i\s*de\s*c\s*v|s\s*a\s*de\s*c\s*v|s\s*de\s*r\s*l\s*de\s*c\s*v|s\s*c|s\s*a|a\s*c)\s*$/i,
      ''
    )
    .trim()
  return s.replace(/\s+/g, ' ').trim()
}

/** Token set for order-insensitive party comparison. */
export function partyTokens(raw: string): string[] {
  const n = normalisePartyName(raw)
  if (!n) return []
  return n
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !['de', 'del', 'la', 'las', 'los', 'y', 'e'].includes(t))
}

export function tokenJaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const sa = new Set(a)
  const sb = new Set(b)
  let inter = 0
  for (const t of sa) if (sb.has(t)) inter += 1
  const union = sa.size + sb.size - inter
  return union === 0 ? 0 : inter / union
}

/** Dice coefficient on character bigrams — fuzzy party fallback. */
export function diceCoefficient(a: string, b: string): number {
  const x = normalisePartyName(a)
  const y = normalisePartyName(b)
  if (!x || !y) return 0
  if (x === y) return 1
  if (x.length < 2 || y.length < 2) return x === y ? 1 : 0

  const bigrams = (s: string): Map<string, number> => {
    const m = new Map<string, number>()
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2)
      m.set(bg, (m.get(bg) ?? 0) + 1)
    }
    return m
  }
  const A = bigrams(x)
  const B = bigrams(y)
  let overlap = 0
  for (const [k, v] of A) {
    const w = B.get(k)
    if (w) overlap += Math.min(v, w)
  }
  return (2 * overlap) / (x.length - 1 + (y.length - 1))
}
