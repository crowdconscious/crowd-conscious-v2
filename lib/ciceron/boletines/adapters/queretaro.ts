/**
 * Querétaro lista de acuerdos adapter.
 * Ships DISABLED in registry (enabled=false). Live collection needs named
 * verifier + terms review (rule 9b). Fixtures mirror landing court-link
 * structure (head2.php?ciudad=&juz=&num=) and per-court HTML tables —
 * fictional parties only.
 */

import {
  defaultCountCheck,
  fetchSourceLanding,
  parseHtmlTableEntries,
  type AdapterContext,
  type BulletinAdapter,
} from '@/lib/ciceron/boletines/adapter'
import type {
  BulletinCountCheck,
  BulletinFetchResult,
  BulletinParseResult,
  ParsedBulletinEntry,
} from '@/lib/ciceron/boletines/types'

const COURT_LINK_RE =
  /href=['"](head2\.php\?ciudad=[^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi

export function parseQueretaroCourtIndex(html: string): Array<{
  href: string
  label: string
}> {
  const out: Array<{ href: string; label: string }> = []
  let m: RegExpExecArray | null
  const re = new RegExp(COURT_LINK_RE.source, 'gi')
  while ((m = re.exec(html))) {
    const href = m[1] ?? ''
    const label = (m[2] ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (href) out.push({ href, label })
  }
  return out
}

function materiaFromJuz(juz: string | null): string {
  switch ((juz ?? '').toLowerCase()) {
    case 'civ':
      return 'Civil'
    case 'fam':
      return 'Familiar'
    case 'lab':
      return 'Laboral'
    case 'pen':
      return 'Penal'
    default:
      return 'Mixto'
  }
}

export function courtLabelFromHead2(href: string, buttonLabel: string): string {
  try {
    const q = new URL(href, 'https://www.poderjudicialqro.gob.mx/acuerdos/')
    const ciudad = q.searchParams.get('ciudad') ?? 'qro'
    const juz = q.searchParams.get('juz')
    const num = q.searchParams.get('num')
    const city =
      ciudad === 'sjr'
        ? 'San Juan del Río'
        : ciudad === 'qro'
          ? 'Querétaro'
          : ciudad.toUpperCase()
    const ord = buttonLabel || (num ? String(num) : '')
    return `Juzgado ${ord} ${materiaFromJuz(juz)} de ${city}`.replace(/\s+/g, ' ').trim()
  } catch {
    return buttonLabel || href
  }
}

export const queretaroAdapter: BulletinAdapter = {
  key: 'queretaro',

  async fetch(ctx: AdapterContext): Promise<BulletinFetchResult> {
    return fetchSourceLanding(ctx)
  },

  parse(body: string, ctx: AdapterContext): BulletinParseResult {
    // Fixture path 1: already a per-court table (data-court / thead Expediente)
    if (/<table[\s\S]*expediente/i.test(body)) {
      const entries = parseHtmlTableEntries(body, {
        courtFrom: 'heading',
        sourceUrl: ctx.source.landingUrl,
      })
      return {
        ok: true,
        entries,
        bulletinNumber: `QRO-${ctx.publicationDate}`,
      }
    }

    // Fixture / landing path: court index → synthetic empty until drill-down
    // In fixture mode we expect the combined fixture HTML that embeds tables.
    const courts = parseQueretaroCourtIndex(body)
    if (courts.length > 0 && !/<table/i.test(body)) {
      // Landing-only body without embedded tables: parse succeeded structurally
      // but yielded zero entries — orchestrator count-check still ok; run may
      // be partial if live drill-down is not performed (disabled by default).
      return {
        ok: true,
        entries: [],
        bulletinNumber: `QRO-${ctx.publicationDate}`,
        error: 'Landing index only; per-court tables not embedded (use fixture or enable drill-down after 9b).',
      }
    }

    const entries: ParsedBulletinEntry[] = parseHtmlTableEntries(body, {
      sourceUrl: ctx.source.landingUrl,
    })

    if (!entries.length && !courts.length) {
      return {
        ok: false,
        entries: [],
        bulletinNumber: null,
        error: 'No court links or expediente table rows found',
      }
    }

    return {
      ok: true,
      entries,
      bulletinNumber: `QRO-${ctx.publicationDate}`,
    }
  },

  countCheck(entries, ctx): BulletinCountCheck {
    return defaultCountCheck(entries, ctx, { body: ctx.fixtureBody })
  },
}
