/**
 * Prompt 5 — 30-question Investigación eval.
 *
 *   npx tsx scripts/ciceron-research-eval.ts
 *   npx tsx scripts/ciceron-research-eval.ts --live   # optional: hit DB + models
 *
 * Offline (default): citation validity must be 100%; refusal correctness for
 * out-of-corpus items; source-hint recall scored against synthetic/fixture text.
 */

import {
  assertEvalSetSize,
  RESEARCH_EVAL_QUESTIONS,
} from '../lib/ciceron/research/eval-set'
import {
  parseCitedSentences,
  renderVerifiedAnswer,
  verifyCitations,
} from '../lib/ciceron/research/verifier'

assertEvalSetSize()

const live = process.argv.includes('--live')

type Row = {
  id: string
  citationValid: boolean
  refusedCorrectly: boolean | null
  sourceRecall: number | null
  notes: string
}

const rows: Row[] = []

for (const q of RESEARCH_EVAL_QUESTIONS) {
  if (q.expectRefuse) {
    const verified = verifyCitations({
      userFirmId: 'a1000000-0000-4000-8000-000000000001',
      retrieved: [],
      sentences: parseCitedSentences(q.syntheticAnswer ?? 'x'),
    })
    const rendered = renderVerifiedAnswer(verified)
    const refused = /No encontré fundamento en el corpus disponible/.test(rendered.body)
    rows.push({
      id: q.id,
      citationValid: true, // nothing cited after empty retrieval
      refusedCorrectly: refused,
      sourceRecall: null,
      notes: refused ? 'refuse_ok' : 'refuse_miss',
    })
    continue
  }

  if (!q.syntheticRetrieved || !q.syntheticAnswer) {
    // No synthetic pair: score source hints as N/A offline; citation vacuously ok
    rows.push({
      id: q.id,
      citationValid: true,
      refusedCorrectly: null,
      sourceRecall: null,
      notes: live ? 'needs_live' : 'offline_skip_no_synthetic',
    })
    continue
  }

  const sentences = parseCitedSentences(q.syntheticAnswer)
  const verified = verifyCitations({
    userFirmId: 'a1000000-0000-4000-8000-000000000001',
    retrieved: q.syntheticRetrieved.map((r) => ({
      chunkId: r.chunkId,
      text: r.text,
      firmId: r.firmId,
      canonicalCitationId: null,
      documentId: null,
    })),
    sentences,
  })
  const citationValid = verified.failed.length === 0 && !verified.nothingRetrieved
  const keptText = verified.kept.map((s) => s.text).join(' ').toLowerCase()
  const corpusText = q.syntheticRetrieved.map((r) => r.text).join(' ').toLowerCase()
  const hints = q.expectedSourceHints
  const hits = hints.filter(
    (h) => corpusText.includes(h.toLowerCase()) || keptText.includes(h.toLowerCase())
  )
  const sourceRecall = hints.length ? hits.length / hints.length : 1

  rows.push({
    id: q.id,
    citationValid,
    refusedCorrectly: null,
    sourceRecall,
    notes: citationValid ? 'ok' : verified.failed.map((f) => f.reasons.join(',')).join('|'),
  })
}

async function maybeLive() {
  if (!live) return
  console.log('--live: attempting DB retrieval for in-corpus questions (best-effort)')
  try {
    const { retrieveForResearch } = await import('../lib/ciceron/research/retrieve')
    const { CICERON_SEED } = await import('../lib/ciceron/db/seed-ids')
    for (const q of RESEARCH_EVAL_QUESTIONS.filter((x) => !x.expectRefuse)) {
      const result = await retrieveForResearch({
        question: q.question,
        actorId: CICERON_SEED.personas.socio,
        firmId: CICERON_SEED.firmDemo,
        limit: 8,
      })
      const blob = result.hits.map((h) => h.text).join(' ').toLowerCase()
      const hints = q.expectedSourceHints
      const recall = hints.length
        ? hints.filter((h) => blob.includes(h.toLowerCase())).length / hints.length
        : null
      const row = rows.find((r) => r.id === q.id)
      if (row && recall !== null) {
        row.sourceRecall = recall
        row.notes = result.degraded
          ? `live_degraded:${result.degradeReason ?? ''}`
          : `live_hits:${result.hits.length}`
      }
      if (q.expectRefuse === false && result.hits.length === 0 && row) {
        row.notes += '|no_hits'
      }
    }
    for (const q of RESEARCH_EVAL_QUESTIONS.filter((x) => x.expectRefuse)) {
      const result = await retrieveForResearch({
        question: q.question,
        actorId: CICERON_SEED.personas.socio,
        firmId: CICERON_SEED.firmDemo,
        limit: 5,
      })
      const row = rows.find((r) => r.id === q.id)
      if (row) {
        row.notes += `|live_hits:${result.hits.length}`
      }
    }
  } catch (err) {
    console.warn('live retrieval failed:', err instanceof Error ? err.message : err)
  }
}

void maybeLive().then(() => {
  const citationOk = rows.filter((r) => r.citationValid).length
  const refuseRows = rows.filter((r) => r.refusedCorrectly !== null)
  const refuseOk = refuseRows.filter((r) => r.refusedCorrectly).length
  const recallRows = rows.filter((r) => r.sourceRecall !== null)
  const avgRecall =
    recallRows.length === 0
      ? null
      : recallRows.reduce((s, r) => s + (r.sourceRecall ?? 0), 0) / recallRows.length

  console.log(JSON.stringify({ mode: live ? 'live' : 'offline', rows }, null, 2))
  console.log('---')
  console.log(
    `citation_validity: ${citationOk}/${rows.length} (${((100 * citationOk) / rows.length).toFixed(1)}%)`
  )
  console.log(
    `refusal_correctness: ${refuseOk}/${refuseRows.length} (${
      refuseRows.length ? ((100 * refuseOk) / refuseRows.length).toFixed(1) : 'n/a'
    }%)`
  )
  console.log(
    `source_recall_avg: ${avgRecall === null ? 'n/a' : (avgRecall * 100).toFixed(1) + '%'}`
  )

  if (citationOk !== rows.length) {
    console.error('FAIL: citation validity must be 100%')
    process.exit(1)
  }
  if (refuseOk !== refuseRows.length) {
    console.error('FAIL: refusal correctness must be 100% for out-of-corpus items')
    process.exit(1)
  }
  console.log('PASS: offline citation validity and refusal checks')
})
