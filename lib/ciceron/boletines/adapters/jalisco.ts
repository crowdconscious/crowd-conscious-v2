/**
 * Jalisco CJJ extractos / boletín adapter.
 * Landing is an Angular SPA (curl sees shell). Fixture HTML mirrors the
 * extract table the SPA would render: Juzgado, Expediente, Partes, Extracto.
 * Ships DISABLED — live collection needs named verifier + terms (rule 9b).
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
} from '@/lib/ciceron/boletines/types'

export const jaliscoAdapter: BulletinAdapter = {
  key: 'jalisco',

  async fetch(ctx: AdapterContext): Promise<BulletinFetchResult> {
    return fetchSourceLanding(ctx)
  },

  parse(body: string, ctx: AdapterContext): BulletinParseResult {
    // SPA shell alone is a parse failure for live collection (no extract rows).
    const isSpaShell =
      /<app-root[\s>]/i.test(body) && !/<table[\s\S]*expediente/i.test(body)

    if (isSpaShell) {
      return {
        ok: false,
        entries: [],
        bulletinNumber: null,
        error:
          'SPA shell without extract table — use fixture or browser-derived HTML after rule 9b approval',
      }
    }

    // Optional JSON fixture envelope: { "bulletinNumber", "entries": [...] }
    const trimmed = body.trim()
    if (trimmed.startsWith('{')) {
      try {
        const json = JSON.parse(trimmed) as {
          bulletinNumber?: string
          entries?: Array<{
            courtName?: string
            expedienteNumber?: string
            partyNames?: string
            summary?: string
          }>
        }
        const entries = (json.entries ?? []).map((e) => ({
          courtName: e.courtName ?? null,
          expedienteNumber: e.expedienteNumber ?? null,
          partyNames: e.partyNames ?? null,
          summary: e.summary ?? null,
          sourceUrl: ctx.source.landingUrl,
        }))
        return {
          ok: true,
          entries,
          bulletinNumber: json.bulletinNumber ?? `JAL-${ctx.publicationDate}`,
        }
      } catch {
        return {
          ok: false,
          entries: [],
          bulletinNumber: null,
          error: 'Invalid JSON extract fixture',
        }
      }
    }

    const entries = parseHtmlTableEntries(body, {
      sourceUrl: ctx.source.landingUrl,
    })
    if (!entries.length) {
      return {
        ok: false,
        entries: [],
        bulletinNumber: null,
        error: 'No extract table rows found',
      }
    }
    return {
      ok: true,
      entries,
      bulletinNumber: `JAL-${ctx.publicationDate}`,
    }
  },

  countCheck(entries, ctx): BulletinCountCheck {
    const base = defaultCountCheck(entries, ctx)
    // For Jalisco extract fixtures we expect a data-expected-count when present.
    return base
  },
}
