/**
 * Local bulletin pipeline runner (Prompt B1/B2).
 *
 * Usage:
 *   npx tsx scripts/ciceron/boletines-run.ts --dry-run --state QRO --fixture fixtures/ciceron/boletines/queretaro-lista.html
 *   npx tsx scripts/ciceron/boletines-run.ts --dry-run --state JAL --date 2026-11-12 --fixture fixtures/ciceron/boletines/jalisco-extractos.html
 *
 * Default is dry-run friendly: no DB writes. Live collection against the
 * network requires enabled+verified sources (rule 9b) and is not the demo path.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runBulletinSource, type RunPersistence } from '../../lib/ciceron/boletines/orchestrator'
import type { BulletinSourceRow } from '../../lib/ciceron/boletines/types'
import type { CatalogueMatter } from '../../lib/ciceron/boletines/matcher'

type Args = {
  dryRun: boolean
  state: string | null
  date: string
  fixture: string | null
  help: boolean
}

function todayMexico(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function parseArgs(argv: string[]): Args {
  const out: Args = {
    dryRun: false,
    state: null,
    date: todayMexico(),
    fixture: null,
    help: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--state') out.state = (argv[++i] ?? '').toUpperCase()
    else if (a === '--date') out.date = argv[++i] ?? out.date
    else if (a === '--fixture') out.fixture = argv[++i] ?? null
    else if (a === '--help' || a === '-h') out.help = true
  }
  return out
}

const REGISTRY: BulletinSourceRow[] = [
  {
    id: 'b7000000-0000-4000-8000-000000000001',
    sourceKey: 'qro_lista_primera',
    stateCode: 'QRO',
    stateName: 'Querétaro',
    displayName: 'Lista de Acuerdos Primera Instancia — Querétaro',
    landingUrl:
      'https://www.poderjudicialqro.gob.mx/acuerdos/lista-de-acuerdos-primera-instancia.php',
    proposedTier: 'B',
    enabled: false,
    verifiedBy: null,
    verifiedOn: null,
    termsReviewedOn: null,
    robotsOk: true,
    termsOk: false,
    hasCaptcha: false,
    needsLogin: false,
    adapterKey: 'queretaro',
    retentionDays: 14,
  },
  {
    id: 'b7000000-0000-4000-8000-000000000002',
    sourceKey: 'jal_extractos_cjj',
    stateCode: 'JAL',
    stateName: 'Jalisco',
    displayName: 'Extractos / Boletín CJJ — Jalisco',
    landingUrl: 'https://cjj.gob.mx/bulletin',
    proposedTier: 'A',
    enabled: false,
    verifiedBy: null,
    verifiedOn: null,
    termsReviewedOn: null,
    robotsOk: true,
    termsOk: false,
    hasCaptcha: false,
    needsLogin: false,
    adapterKey: 'jalisco',
    retentionDays: 14,
  },
]

/** Sample catalogue for local dry-runs (fictional). */
const SAMPLE_CATALOGUE: CatalogueMatter[] = [
  {
    id: 'cat-nexora-qro',
    courtName: 'Juzgado Primero Civil de Querétaro',
    expedienteNumber: '123/2026',
    partyNameVariants: ['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    matterId: 'd1000000-0000-4000-8000-000000000001',
  },
  {
    id: 'cat-rios',
    courtName: 'Juzgado Segundo Familiar',
    expedienteNumber: '88/2025',
    partyNameVariants: ['María Elena Ríos Vargas'],
  },
]

const dryPersistence: RunPersistence = {
  async recordRun() {
    return 'dry-run-id'
  },
  async recordHit() {
    return 'dry-hit-id'
  },
  async ensureManualCheck() {
    return 'dry-manual-id'
  },
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(`Usage: npx tsx scripts/ciceron/boletines-run.ts [--dry-run] [--state QRO|JAL] [--date YYYY-MM-DD] [--fixture path]`)
    process.exit(0)
  }

  const sources = REGISTRY.filter((s) =>
    args.state ? s.stateCode === args.state : Boolean(s.adapterKey)
  )
  if (!sources.length) {
    console.error(`No sources for state=${args.state}`)
    process.exit(1)
  }

  const fixtureBody = args.fixture
    ? readFileSync(resolve(args.fixture), 'utf8')
    : undefined

  // Fixture mode temporarily treats source as verified for local parse/match demos.
  // Network live mode still respects enabled=false without --fixture.
  for (const base of sources) {
    const source: BulletinSourceRow = fixtureBody
      ? {
          ...base,
          enabled: true,
          verifiedBy: 'local-fixture',
          verifiedOn: args.date,
          termsReviewedOn: args.date,
          termsOk: true,
        }
      : base

    console.log('---')
    console.log(`Source: ${source.displayName} (${source.stateCode})`)
    console.log(`Date:   ${args.date}`)
    console.log(`Mode:   ${args.dryRun || !fixtureBody ? 'dry-run / receipt-only path' : 'fixture'}`)
    if (args.fixture) console.log(`Fixture: ${args.fixture}`)

    const result = await runBulletinSource({
      firmId: 'a1000000-0000-4000-8000-000000000001',
      source,
      catalogue: SAMPLE_CATALOGUE,
      publicationDate: args.date,
      persistence: dryPersistence,
      fixtureBody,
      dryRun: true,
      isDemo: true,
    })

    console.log(`Status: ${result.status}`)
    if (result.failureStage) {
      console.log(`Failure: ${result.failureStage} — ${result.failureMessage}`)
    }
    console.log(`Entries parsed: ${result.entriesParsed}`)
    console.log(`Matters searched: ${result.mattersSearched}`)
    console.log(`Hits: ${result.hits.length}`)
    for (const h of result.hits) {
      console.log(`  - [${h.matchKind}] score=${h.score.toFixed(2)} ${h.reason}`)
    }
    console.log(`Duration: ${result.durationMs} ms`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
