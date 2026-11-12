/**
 * Validate Investigación suggested questions against the real research pipeline.
 *
 * Keeps only questions whose verified answer cites ≥2 distinct sources.
 * Writes `VALIDATED_SUGGESTED_QUESTIONS` into
 * `lib/ciceron/research/suggested-questions.ts` (unless --dry-run).
 *
 * Usage (placeholder values only — no secrets in this header):
 *   npx tsx scripts/ciceron/validate-suggested-questions.ts --dry-run
 *   npx tsx scripts/ciceron/validate-suggested-questions.ts
 *
 * Cost controls:
 *   --dry-run     estimate only (no model calls); refuses live run over $60
 *   Cap           hard stop if cumulative spend would exceed $60
 *
 * Requires for live run:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ANTHROPIC_API_KEY (or configured AI gateway)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  SUGGESTED_QUESTION_CANDIDATES,
  type SuggestedQuestion,
} from '../../lib/ciceron/research/suggested-questions'

const COST_CAP_USD = 60
/** Conservative per-question estimate for dry-run (retrieval + answer). */
const ESTIMATE_PER_QUESTION_USD = 0.35
const MIN_CITED_SOURCES = 2
const TARGET_COUNT = 4

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

function formatValidatedBlock(validated: SuggestedQuestion[]): string {
  const body = validated
    .map((q) => {
      return `  {
    id: ${JSON.stringify(q.id)},
    question:
      ${JSON.stringify(q.question)},
    demoClient: ${JSON.stringify(q.demoClient)},
    citedSources: ${q.citedSources},
    validatedAt: ${JSON.stringify(q.validatedAt)},
  }`
    })
    .join(',\n')
  return `export const VALIDATED_SUGGESTED_QUESTIONS: SuggestedQuestion[] = [\n${body},\n]`
}

function rewriteValidatedExport(filePath: string, validated: SuggestedQuestion[]) {
  const src = readFileSync(filePath, 'utf8')
  const nextBlock = formatValidatedBlock(validated)
  const rewritten = src.replace(
    /export const VALIDATED_SUGGESTED_QUESTIONS: SuggestedQuestion\[] = \[[\s\S]*?\n\]/,
    nextBlock
  )
  if (rewritten === src) {
    throw new Error('Could not locate VALIDATED_SUGGESTED_QUESTIONS block to rewrite')
  }
  writeFileSync(filePath, rewritten, 'utf8')
}

async function main() {
  const dryRun = hasFlag('dry-run')
  const estimate = SUGGESTED_QUESTION_CANDIDATES.length * ESTIMATE_PER_QUESTION_USD

  console.error(
    JSON.stringify(
      {
        mode: dryRun ? 'dry-run' : 'live',
        candidates: SUGGESTED_QUESTION_CANDIDATES.length,
        estimateUsd: Number(estimate.toFixed(2)),
        costCapUsd: COST_CAP_USD,
        minCitedSources: MIN_CITED_SOURCES,
        targetCount: TARGET_COUNT,
      },
      null,
      2
    )
  )

  if (estimate > COST_CAP_USD) {
    console.error(
      JSON.stringify({
        ok: false,
        error: 'over_cap',
        estimateUsd: estimate,
        capUsd: COST_CAP_USD,
      })
    )
    process.exit(dryRun ? 0 : 2)
  }

  if (dryRun) {
    console.error(
      `Dry-run OK. Estimated $${estimate.toFixed(2)} for ${SUGGESTED_QUESTION_CANDIDATES.length} candidates (cap $${COST_CAP_USD}).`
    )
    process.exit(0)
  }

  // Live path only — avoid pulling gateway/DB on dry-run.
  const { CICERON_SEED } = await import('../../lib/ciceron/db/seed-ids')
  const { answerResearchQuestion } = await import(
    '../../lib/ciceron/research/answer'
  )
  const { extractCitedChunkIds } = await import(
    '../../lib/ciceron/research/evidence-sources'
  )

  const firmId = CICERON_SEED.firmDemo
  const actorId = CICERON_SEED.personas.socio
  let spent = 0
  const kept: SuggestedQuestion[] = []
  const today = new Date().toISOString().slice(0, 10)

  for (const candidate of SUGGESTED_QUESTION_CANDIDATES) {
    if (kept.length >= TARGET_COUNT) break
    if (spent + ESTIMATE_PER_QUESTION_USD > COST_CAP_USD) {
      console.error(
        `Stopping before ${candidate.id}: remaining budget under $${COST_CAP_USD} cap`
      )
      break
    }

    const result = await answerResearchQuestion({
      question: candidate.question,
      actorId,
      firmId,
      matterId: null,
      scope: 'dof',
    })

    if (!result.ok) {
      console.error(`FAIL ${candidate.id}: ${result.message}`)
      continue
    }

    spent += result.costEstimateUsd
    if (spent > COST_CAP_USD) {
      console.error(`Spent $${spent.toFixed(2)} exceeded cap; discarding last result`)
      break
    }

    const citedSources = extractCitedChunkIds(result.body).length
    console.error(
      JSON.stringify({
        id: candidate.id,
        ok: result.ok,
        refused: result.refused,
        citedSources,
        costUsd: result.costEstimateUsd,
        spentUsd: Number(spent.toFixed(4)),
      })
    )

    if (result.refused || citedSources < MIN_CITED_SOURCES) continue

    kept.push({
      id: candidate.id,
      question: candidate.question,
      demoClient: candidate.demoClient,
      citedSources,
      validatedAt: today,
    })
  }

  if (kept.length < TARGET_COUNT) {
    console.error(
      `Only ${kept.length}/${TARGET_COUNT} questions passed (≥${MIN_CITED_SOURCES} cited sources). Not rewriting file.`
    )
    process.exit(1)
  }

  const outPath = join(
    process.cwd(),
    'lib/ciceron/research/suggested-questions.ts'
  )
  rewriteValidatedExport(outPath, kept.slice(0, TARGET_COUNT))
  console.error(
    JSON.stringify({
      ok: true,
      written: TARGET_COUNT,
      spentUsd: Number(spent.toFixed(4)),
      path: 'lib/ciceron/research/suggested-questions.ts',
    })
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
