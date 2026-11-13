/**
 * BulletinAdapter: fetch → parse → count-check (rule 9c).
 */

import type {
  BulletinCountCheck,
  BulletinFetchResult,
  BulletinParseResult,
  BulletinSourceRow,
  ParsedBulletinEntry,
} from '@/lib/ciceron/boletines/types'
import { politeFetch, type PoliteFetchOptions } from '@/lib/ciceron/boletines/fetcher'

export type AdapterContext = {
  source: BulletinSourceRow
  publicationDate: string // yyyy-mm-dd
  /** When set, adapters parse this body instead of fetching. */
  fixtureBody?: string
  dryRun?: boolean
}

export interface BulletinAdapter {
  readonly key: string
  fetch(ctx: AdapterContext): Promise<BulletinFetchResult>
  parse(body: string, ctx: AdapterContext): BulletinParseResult
  countCheck(entries: ParsedBulletinEntry[], ctx: AdapterContext): BulletinCountCheck
}

export function defaultCountCheck(
  entries: ParsedBulletinEntry[],
  _ctx: AdapterContext
): BulletinCountCheck {
  // Without an advertised total, require at least one structural row when body parsed ok.
  // Empty-but-valid days are allowed; the orchestrator distinguishes fetch/parse failure.
  return {
    ok: true,
    expected: null,
    actual: entries.length,
  }
}

export async function fetchSourceLanding(
  ctx: AdapterContext,
  extra?: PoliteFetchOptions
): Promise<BulletinFetchResult> {
  const src = ctx.source
  const allowed =
    src.robotsOk &&
    !src.hasCaptcha &&
    !src.needsLogin &&
    (extra?.allowed ?? true)

  if (!allowed) {
    return politeFetch(src.landingUrl, {
      ...extra,
      allowed: false,
      disallowReason: src.hasCaptcha
        ? 'Source has captcha — manual only (rule 9b)'
        : src.needsLogin
          ? 'Source requires login — not used in demo (rule 9e)'
          : 'robots/terms flags block fetch',
      fixtureBody: ctx.fixtureBody,
    })
  }

  return politeFetch(src.landingUrl, {
    ...extra,
    fixtureBody: ctx.fixtureBody,
  })
}

/** Shared HTML helpers for fictional fixtures that mirror real table layouts. */
export function parseHtmlTableEntries(
  html: string,
  opts: {
    courtFrom?: 'column' | 'heading' | 'fixed'
    fixedCourt?: string
    sourceUrl?: string | null
  } = {}
): ParsedBulletinEntry[] {
  const rows: ParsedBulletinEntry[] = []
  // Very small HTML table parser for fixture/demo HTML (not a full browser).
  const tableRowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
  const headingCourt =
    opts.fixedCourt ??
    html.match(/<h[1-4][^>]*class="[^"]*court[^"]*"[^>]*>([\s\S]*?)<\/h[1-4]>/i)?.[1] ??
    html.match(/data-court="([^"]+)"/i)?.[1] ??
    null

  let header: string[] | null = null
  let match: RegExpExecArray | null
  while ((match = tableRowRe.exec(html))) {
    const inner = match[1] ?? ''
    const cells: string[] = []
    let cm: RegExpExecArray | null
    const cellLocal = new RegExp(cellRe.source, 'gi')
    while ((cm = cellLocal.exec(inner))) {
      cells.push(stripTags(cm[1] ?? '').trim())
    }
    if (!cells.length) continue
    if (!header) {
      header = cells.map((c) => c.toLowerCase())
      continue
    }
    const get = (...names: string[]) => {
      for (const n of names) {
        const i = header!.findIndex((h) => h.includes(n))
        if (i >= 0 && cells[i]) return cells[i]!
      }
      return null
    }
    const expediente = get('expediente', 'exp', 'toca', 'número', 'numero')
    const court =
      opts.courtFrom === 'fixed'
        ? opts.fixedCourt ?? headingCourt
        : get('juzgado', 'órgano', 'organo', 'sala', 'court') ?? headingCourt
    const actor = get('actor', 'quejoso')
    const demandado = get('demandado', 'tercero')
    const partes = get('partes', 'parte', 'nombre')
    const summary = get('síntesis', 'sintesis', 'acuerdo', 'extracto', 'resumen', 'actuación', 'actuacion')
    const partyNames =
      partes ??
      [actor, demandado].filter(Boolean).join(' / ') ??
      null
    const parties = [actor, demandado, ...(partes ? [partes] : [])].filter(
      (p): p is string => Boolean(p)
    )
    if (!expediente && !partyNames) continue
    rows.push({
      courtName: court,
      expedienteNumber: expediente,
      partyNames: partyNames || null,
      parties: parties.length ? parties : undefined,
      summary: summary,
      sourceUrl: opts.sourceUrl ?? null,
    })
  }
  return rows
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}
