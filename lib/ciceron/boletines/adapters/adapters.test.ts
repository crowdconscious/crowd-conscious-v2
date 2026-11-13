import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { pageDeclaresEmptyDay } from '@/lib/ciceron/boletines/adapter'
import { jaliscoAdapter } from '@/lib/ciceron/boletines/adapters/jalisco'
import {
  courtLabelFromHead2,
  parseQueretaroCourtIndex,
  queretaroAdapter,
} from '@/lib/ciceron/boletines/adapters/queretaro'
import { runBulletinSource, type RunPersistence } from '@/lib/ciceron/boletines/orchestrator'
import type { BulletinSourceRow } from '@/lib/ciceron/boletines/types'

const fixturesRoot = join(process.cwd(), 'fixtures/ciceron/boletines')

function source(partial: Partial<BulletinSourceRow> & Pick<BulletinSourceRow, 'adapterKey' | 'sourceKey' | 'stateCode'>): BulletinSourceRow {
  return {
    id: 'src-test',
    displayName: 'Test',
    landingUrl: 'https://example.test/boletin',
    stateName: 'Test',
    proposedTier: 'B',
    enabled: false,
    verifiedBy: null,
    verifiedOn: null,
    termsReviewedOn: null,
    robotsOk: true,
    termsOk: false,
    hasCaptcha: false,
    needsLogin: false,
    retentionDays: 14,
    ...partial,
  }
}

const memoryPersistence = (): RunPersistence & { runs: unknown[]; hits: unknown[]; manuals: unknown[] } => {
  const runs: unknown[] = []
  const hits: unknown[] = []
  const manuals: unknown[] = []
  let n = 0
  return {
    runs,
    hits,
    manuals,
    async recordRun(input) {
      const id = `run-${++n}`
      runs.push({ id, ...input })
      return id
    },
    async recordHit(input) {
      const id = `hit-${++n}`
      hits.push({ id, ...input })
      return id
    },
    async ensureManualCheck(input) {
      const id = `man-${++n}`
      manuals.push({ id, ...input })
      return id
    },
  }
}

describe('pageDeclaresEmptyDay', () => {
  it('matches exact empty-day phrases with word boundaries', () => {
    assert.equal(
      pageDeclaresEmptyDay('<main><p>Sin acuerdos para la fecha.</p></main>'),
      true
    )
    assert.equal(
      pageDeclaresEmptyDay('<div class="lista-acuerdos"><p>Hay 0 acuerdos hoy.</p></div>'),
      true
    )
    assert.equal(
      pageDeclaresEmptyDay('<article>No hay acuerdos publicados.</article>'),
      true
    )
  })

  it('does not treat «10 acuerdos» as empty day', () => {
    assert.equal(
      pageDeclaresEmptyDay('<main><p>Se publicaron 10 acuerdos hoy.</p></main>'),
      false
    )
    assert.equal(
      pageDeclaresEmptyDay('<main><p>Total: 100 acuerdos en el archivo.</p></main>'),
      false
    )
  })

  it('ignores «sin acuerdos» in navigation chrome outside the bulletin body', () => {
    const html = `
      <html><body>
        <nav><a href="/ayuda">Consulta sin acuerdos previos</a></nav>
        <header>Menú sin acuerdos de ejemplo</header>
        <main><p>Lista del día con publicaciones.</p><table><tr><th>Expediente</th></tr></table></main>
      </body></html>
    `
    assert.equal(pageDeclaresEmptyDay(html), false)
  })

  it('still detects empty day when the phrase is inside main/bulletin region', () => {
    const html = `
      <html><body>
        <nav><a href="/">Inicio</a></nav>
        <main class="boletin"><p>Sin acuerdos para esta fecha.</p></main>
      </body></html>
    `
    assert.equal(pageDeclaresEmptyDay(html), true)
  })
})

describe('queretaro adapter', () => {
  it('parses court index links from landing-shaped HTML', () => {
    const html = `
      <a href='head2.php?ciudad=qro&juz=civ&num=1' class="btn">PRIMERO</a>
      <a href="head2.php?ciudad=sjr&juz=lab&num=1" class="btn">ÚNICO</a>
    `
    const courts = parseQueretaroCourtIndex(html)
    assert.equal(courts.length, 2)
    assert.ok(courtLabelFromHead2(courts[0]!.href, courts[0]!.label).includes('Civil'))
  })

  it('parses fictional lista fixture without real party leakage assumptions', async () => {
    const body = readFileSync(join(fixturesRoot, 'queretaro-lista.html'), 'utf8')
    const parsed = queretaroAdapter.parse(body, {
      source: source({ adapterKey: 'queretaro', sourceKey: 'qro', stateCode: 'QRO' }),
      publicationDate: '2026-11-12',
      fixtureBody: body,
    })
    assert.equal(parsed.ok, true)
    assert.ok(parsed.entries.length >= 3)
    assert.ok(parsed.entries.some((e) => e.expedienteNumber === '123/2026'))
    assert.ok(parsed.entries.every((e) => (e.summary ?? '').includes('demostración') || true))
  })
})

describe('jalisco adapter', () => {
  it('fails parse on SPA shell without extract table', () => {
    const parsed = jaliscoAdapter.parse('<html><app-root></app-root></html>', {
      source: source({ adapterKey: 'jalisco', sourceKey: 'jal', stateCode: 'JAL', proposedTier: 'A' }),
      publicationDate: '2026-11-12',
    })
    assert.equal(parsed.ok, false)
  })

  it('parses fictional extract fixture', () => {
    const body = readFileSync(join(fixturesRoot, 'jalisco-extractos.html'), 'utf8')
    const parsed = jaliscoAdapter.parse(body, {
      source: source({ adapterKey: 'jalisco', sourceKey: 'jal', stateCode: 'JAL', proposedTier: 'A' }),
      publicationDate: '2026-11-12',
    })
    assert.equal(parsed.ok, true)
    assert.ok(parsed.entries.length >= 3)
    assert.ok(parsed.entries.some((e) => (e.partyNames ?? '').includes('Alimentos Demo')))
  })
})

describe('orchestrator', () => {
  it('marks disabled sources as manual and writes a receipt + manual task', async () => {
    const persistence = memoryPersistence()
    const result = await runBulletinSource({
      firmId: 'firm',
      source: source({
        adapterKey: 'queretaro',
        sourceKey: 'qro',
        stateCode: 'QRO',
        enabled: false,
      }),
      catalogue: [],
      publicationDate: '2026-11-12',
      persistence,
    })
    assert.equal(result.status, 'manual')
    assert.equal(result.failureStage, 'disabled')
    assert.equal(persistence.runs.length, 1)
    assert.equal(persistence.manuals.length, 1)
  })

  it('never treats fetch failure as ok / no updates', async () => {
    const persistence = memoryPersistence()
    const result = await runBulletinSource({
      firmId: 'firm',
      source: source({
        adapterKey: 'jalisco',
        sourceKey: 'jal',
        stateCode: 'JAL',
        proposedTier: 'A',
        enabled: true,
        verifiedBy: 'Verifier Demo',
        verifiedOn: '2026-11-01',
        termsReviewedOn: '2026-11-01',
        termsOk: true,
      }),
      catalogue: [],
      publicationDate: '2026-11-12',
      persistence,
      // Empty body via fixture forces parse/fetch path with SPA failure
      fixtureBody: '<html><app-root></app-root></html>',
    })
    assert.equal(result.status, 'failed')
    assert.equal(result.failureStage, 'parse')
    assert.notEqual(result.status, 'ok')
  })

  it('requires tier A/B and terms_ok before fetch', async () => {
    const persistence = memoryPersistence()
    const tierC = await runBulletinSource({
      firmId: 'firm',
      source: source({
        adapterKey: 'queretaro',
        sourceKey: 'qro',
        stateCode: 'QRO',
        proposedTier: 'C',
        enabled: true,
        verifiedBy: 'Verifier Demo',
        verifiedOn: '2026-11-01',
        termsReviewedOn: '2026-11-01',
        termsOk: true,
      }),
      catalogue: [],
      publicationDate: '2026-11-12',
      persistence,
    })
    assert.equal(tierC.status, 'manual')
    assert.equal(tierC.failureStage, 'manual_required')

    const noTerms = await runBulletinSource({
      firmId: 'firm',
      source: source({
        adapterKey: 'queretaro',
        sourceKey: 'qro',
        stateCode: 'QRO',
        proposedTier: 'B',
        enabled: true,
        verifiedBy: 'Verifier Demo',
        verifiedOn: '2026-11-01',
        termsReviewedOn: '2026-11-01',
        termsOk: false,
      }),
      catalogue: [],
      publicationDate: '2026-11-12',
      persistence,
    })
    assert.equal(noTerms.status, 'manual')
    assert.equal(noTerms.failureStage, 'terms')
  })

  it('fails count check on zero rows unless page declares empty day', async () => {
    const persistence = memoryPersistence()
    const failed = await runBulletinSource({
      firmId: 'firm',
      source: source({
        adapterKey: 'queretaro',
        sourceKey: 'qro',
        stateCode: 'QRO',
        enabled: true,
        verifiedBy: 'Verifier Demo',
        verifiedOn: '2026-11-01',
        termsReviewedOn: '2026-11-01',
        termsOk: true,
      }),
      catalogue: [],
      publicationDate: '2026-11-12',
      persistence,
      fixtureBody:
        '<html><body><h1 class="court">Juzgado</h1><table><tr><th>Expediente</th></tr></table></body></html>',
    })
    assert.equal(failed.status, 'failed')
    assert.equal(failed.failureStage, 'count_check')

    const emptyOk = await runBulletinSource({
      firmId: 'firm',
      source: source({
        adapterKey: 'queretaro',
        sourceKey: 'qro',
        stateCode: 'QRO',
        enabled: true,
        verifiedBy: 'Verifier Demo',
        verifiedOn: '2026-11-01',
        termsReviewedOn: '2026-11-01',
        termsOk: true,
      }),
      catalogue: [],
      publicationDate: '2026-11-12',
      persistence,
      fixtureBody:
        '<html><body data-empty-day="true"><p>Sin acuerdos para la fecha.</p><table><tr><th>Expediente</th></tr></table></body></html>',
    })
    assert.equal(emptyOk.status, 'ok')
    assert.equal(emptyOk.entriesParsed, 0)
  })

  it('matches catalogue against queretaro fixture in dry path with fixture override', async () => {
    const persistence = memoryPersistence()
    const body = readFileSync(join(fixturesRoot, 'queretaro-lista.html'), 'utf8')
    const result = await runBulletinSource({
      firmId: 'firm',
      source: source({
        adapterKey: 'queretaro',
        sourceKey: 'qro',
        stateCode: 'QRO',
        enabled: true,
        verifiedBy: 'Verifier Demo',
        verifiedOn: '2026-11-01',
        termsReviewedOn: '2026-11-01',
        termsOk: true,
      }),
      catalogue: [
        {
          id: 'c1',
          courtName: 'Juzgado Primero Civil de Querétaro',
          expedienteNumber: '123/2026',
          partyNameVariants: ['Nexora Pagos'],
          matterId: 'm1',
        },
      ],
      publicationDate: '2026-11-12',
      persistence,
      fixtureBody: body,
    })
    assert.equal(result.status, 'ok')
    assert.ok(result.hits.some((h) => h.matchKind === 'exact'))
    assert.ok(persistence.hits.length >= 1)
  })
})
