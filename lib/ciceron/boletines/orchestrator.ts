/**
 * Bulletin run orchestrator (rule 9c).
 * Every run writes a receipt. Fetch/parse/count failures → FAILED (never 'no updates').
 * Tier D/E or not enabled → manual check task with source link (no fetch).
 */

import { getBulletinAdapter } from '@/lib/ciceron/boletines/adapters'
import type { AdapterContext } from '@/lib/ciceron/boletines/adapter'
import {
  matchEntries,
  type CatalogueMatter,
  type MatchHit,
} from '@/lib/ciceron/boletines/matcher'
import {
  PARSER_VERSION,
  type BulletinFailureStage,
  type BulletinRunStatus,
  type BulletinSourceRow,
  type ParsedBulletinEntry,
} from '@/lib/ciceron/boletines/types'

export type RunPersistence = {
  recordRun: (input: {
    firmId: string
    sourceId: string
    publicationDate: string
    status: BulletinRunStatus
    bulletinNumber: string | null
    failureStage: BulletinFailureStage | null
    failureMessage: string | null
    entriesParsed: number
    mattersSearched: number
    hitsExact: number
    hitsPossible: number
    durationMs: number
    parserVersion: string
    sourceUrl: string | null
    isDemo: boolean
    metadata?: Record<string, unknown>
    startedAt: string
    runId?: string
  }) => Promise<string>
  recordHit: (input: {
    firmId: string
    runId: string
    sourceId: string
    publicationDate: string
    hit: MatchHit
    retentionDays: number
    isDemo: boolean
  }) => Promise<string>
  ensureManualCheck: (input: {
    firmId: string
    sourceId: string
    checkDate: string
    sourceUrl: string
    runId: string | null
    isDemo: boolean
  }) => Promise<string>
}

export type OrchestratorOptions = {
  firmId: string
  source: BulletinSourceRow
  catalogue: CatalogueMatter[]
  publicationDate: string
  persistence: RunPersistence
  fixtureBody?: string
  dryRun?: boolean
  isDemo?: boolean
}

export type OrchestratorResult = {
  runId: string | null
  status: BulletinRunStatus
  failureStage: BulletinFailureStage | null
  failureMessage: string | null
  entriesParsed: number
  mattersSearched: number
  hits: MatchHit[]
  manualCheckId: string | null
  durationMs: number
}

function requiresManual(source: BulletinSourceRow): {
  manual: boolean
  stage: BulletinFailureStage
  message: string
} | null {
  // Automated fetch only for nominated tier A/B sources (rule 9b).
  if (source.proposedTier !== 'A' && source.proposedTier !== 'B') {
    return {
      manual: true,
      stage: 'manual_required',
      message: `Fuente tier ${source.proposedTier}: solo A/B se automatizan; revisión manual con enlace (regla 9b/9c).`,
    }
  }
  if (!source.enabled) {
    return {
      manual: true,
      stage: 'disabled',
      message:
        'Fuente no habilitada (enabled=false). Sin verificación nominada ni revisión de términos no se descarga (regla 9b).',
    }
  }
  if (!source.termsOk) {
    return {
      manual: true,
      stage: 'terms',
      message:
        'terms_ok=false — el orquestador no descarga hasta revisión de términos (regla 9b).',
    }
  }
  if (!source.verifiedBy || !source.verifiedOn || !source.termsReviewedOn) {
    return {
      manual: true,
      stage: 'terms',
      message:
        'Falta verified_by / verified_on / terms_reviewed_on — no se automatiza (regla 9b).',
    }
  }
  if (source.hasCaptcha || source.needsLogin) {
    return {
      manual: true,
      stage: 'manual_required',
      message: source.hasCaptcha
        ? 'Fuente con captcha — solo revisión manual (regla 9b).'
        : 'Fuente con inicio de sesión — no aplica en demo (regla 9e).',
    }
  }
  return null
}

export async function runBulletinSource(
  opts: OrchestratorOptions
): Promise<OrchestratorResult> {
  const started = Date.now()
  const startedAt = new Date().toISOString()
  const isDemo = Boolean(opts.isDemo)
  const { source, firmId, catalogue, publicationDate, persistence } = opts

  const finish = async (partial: {
    status: BulletinRunStatus
    failureStage: BulletinFailureStage | null
    failureMessage: string | null
    entriesParsed?: number
    hits?: MatchHit[]
    bulletinNumber?: string | null
    sourceUrl?: string | null
    manualCheckId?: string | null
    metadata?: Record<string, unknown>
  }): Promise<OrchestratorResult> => {
    const hits = partial.hits ?? []
    const durationMs = Date.now() - started
    const entriesParsed = partial.entriesParsed ?? 0
    let runId: string | null = null
    let manualCheckId = partial.manualCheckId ?? null

    if (!opts.dryRun) {
      runId = await persistence.recordRun({
        firmId,
        sourceId: source.id,
        publicationDate,
        status: partial.status,
        bulletinNumber: partial.bulletinNumber ?? null,
        failureStage: partial.failureStage,
        failureMessage: partial.failureMessage,
        entriesParsed,
        mattersSearched: catalogue.length,
        hitsExact: hits.filter((h) => h.matchKind === 'exact').length,
        hitsPossible: hits.filter((h) => h.matchKind === 'possible').length,
        durationMs,
        parserVersion: PARSER_VERSION,
        sourceUrl: partial.sourceUrl ?? source.landingUrl,
        isDemo,
        metadata: partial.metadata,
        startedAt,
      })
      for (const hit of hits) {
        await persistence.recordHit({
          firmId,
          runId,
          sourceId: source.id,
          publicationDate,
          hit,
          retentionDays: source.retentionDays,
          isDemo,
        })
      }
      if (partial.status === 'manual' || partial.status === 'failed') {
        manualCheckId = await persistence.ensureManualCheck({
          firmId,
          sourceId: source.id,
          checkDate: publicationDate,
          sourceUrl: source.landingUrl,
          runId,
          isDemo,
        })
      }
    }

    return {
      runId,
      status: partial.status,
      failureStage: partial.failureStage,
      failureMessage: partial.failureMessage,
      entriesParsed,
      mattersSearched: catalogue.length,
      hits,
      manualCheckId,
      durationMs,
    }
  }

  // Fixture path may run even when disabled (local CLI --fixture / --dry-run).
  const manual = requiresManual(source)
  if (manual && !opts.fixtureBody) {
    return finish({
      status: 'manual',
      failureStage: manual.stage,
      failureMessage: manual.message,
      sourceUrl: source.landingUrl,
    })
  }

  const adapter = getBulletinAdapter(source.adapterKey)
  if (!adapter) {
    return finish({
      status: 'failed',
      failureStage: 'fetch',
      failureMessage: `No adapter registered for key «${source.adapterKey ?? 'null'}».`,
      sourceUrl: source.landingUrl,
    })
  }

  const ctx: AdapterContext = {
    source,
    publicationDate,
    fixtureBody: opts.fixtureBody,
    dryRun: opts.dryRun,
  }

  const fetched = await adapter.fetch(ctx)
  if (!fetched.ok || !fetched.body) {
    return finish({
      status: 'failed',
      failureStage: 'fetch',
      failureMessage: fetched.error ?? 'Fetch failed',
      sourceUrl: fetched.finalUrl ?? source.landingUrl,
    })
  }

  const parsed = adapter.parse(fetched.body, ctx)
  // Hard parse failure only when zero rows; some entries + parse error → partial (rule 9c).
  if (!parsed.ok && parsed.entries.length === 0) {
    return finish({
      status: 'failed',
      failureStage: 'parse',
      failureMessage: parsed.error ?? 'Parse failed',
      sourceUrl: fetched.finalUrl ?? source.landingUrl,
      bulletinNumber: parsed.bulletinNumber,
    })
  }

  const counted = adapter.countCheck(parsed.entries, {
    ...ctx,
    fixtureBody: fetched.body,
  })
  if (!counted.ok) {
    return finish({
      status: 'failed',
      failureStage: 'count_check',
      failureMessage: counted.message ?? 'Count check failed',
      entriesParsed: parsed.entries.length,
      sourceUrl: fetched.finalUrl ?? source.landingUrl,
      bulletinNumber: parsed.bulletinNumber,
    })
  }

  const hits = matchEntries(parsed.entries as ParsedBulletinEntry[], catalogue)
  const status: BulletinRunStatus =
    (!parsed.ok || Boolean(parsed.error)) && parsed.entries.length > 0
      ? 'partial'
      : 'ok'

  return finish({
    status,
    failureStage: status === 'partial' ? 'parse' : null,
    failureMessage: status === 'partial' ? parsed.error ?? 'Parse incomplete' : null,
    entriesParsed: parsed.entries.length,
    hits,
    bulletinNumber: parsed.bulletinNumber,
    sourceUrl: fetched.finalUrl ?? source.landingUrl,
    metadata: { adapter: adapter.key, dryRun: Boolean(opts.dryRun) },
  })
}
